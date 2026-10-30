import type { RouteLocationNormalizedLoaded, RouteRecordRaw } from 'vue-router'
import { joinRoutePath } from '@/utils/route'

/**
 * 一个标签页
 *
 * path 是唯一标识（同一路由带不同 query 也算同一个标签，避免标签爆炸）；
 * 需要区分 query 时把 path 换成 fullPath 即可，其余逻辑不用动。
 */
export interface TagView {
  /** 完整路径，作为标签唯一标识 */
  path: string
  name?: string
  title: string
  /** 固定标签：不可关闭，如首页 */
  affix: boolean
  /** keep-alive 缓存名（缺省回退路由 name） */
  cacheName?: string
}

/** 路由 → 标签；没有 title 或标记 hidden 的路由不产生标签 */
function toTagView(route: {
  path: string
  name?: unknown
  meta?: { title?: string; hidden?: boolean; affix?: boolean; cacheName?: string }
}): TagView | undefined {
  const title = route.meta?.title
  if (!title || route.meta?.hidden) {
    return undefined
  }

  const name = typeof route.name === 'string' ? route.name : undefined
  return {
    path: route.path,
    name,
    title,
    affix: Boolean(route.meta?.affix),
    cacheName: route.meta?.cacheName ?? name
  }
}

export const useTagsViewStore = defineStore(
  'tagsView',
  () => {
    const visitedViews = ref<TagView[]>([])

    /** 内容是否可见；刷新期间置 false，让 router-view 里的组件真正卸载 */
    const contentVisible = ref(true)
    /** 正在刷新：只用来防止连点重入，不参与渲染 */
    let refreshing = false
    /** 刷新期间挂起缓存：include 置空后 keep-alive 会丢掉缓存，重新挂载才是新实例 */
    const cacheSuspended = ref(false)
    let refreshTimer: ReturnType<typeof setTimeout> | undefined

    /** keep-alive 的 include 列表：只包含访问过的、能拿到组件名的标签 */
    const cachedNames = computed(() => {
      if (cacheSuspended.value) {
        return []
      }

      return Array.from(
        new Set(
          visitedViews.value
            .map((view) => view.cacheName)
            .filter((name): name is string => Boolean(name))
        )
      )
    })

    /** 加入标签（已存在时只同步标题，不重复入栈） */
    function addView(route: RouteLocationNormalizedLoaded): void {
      const tag = toTagView(route)
      if (!tag) {
        return
      }

      const exist = visitedViews.value.find((view) => view.path === tag.path)
      if (exist) {
        exist.title = tag.title
        return
      }

      if (tag.affix) {
        visitedViews.value.unshift(tag)
      } else {
        visitedViews.value.push(tag)
      }
    }

    /**
     * 初始化固定标签。
     * 直接扫静态路由表，刷新页面后（哪怕本地缓存被清）固定标签也一定在。
     */
    function initAffixViews(routes: readonly RouteRecordRaw[]): void {
      const walk = (list: readonly RouteRecordRaw[], parentPath: string): void => {
        for (const item of list) {
          const fullPath = joinRoutePath(parentPath, item.path)
          const tag = toTagView({ path: fullPath, name: item.name, meta: item.meta })
          if (tag?.affix && !visitedViews.value.some((view) => view.path === tag.path)) {
            visitedViews.value.unshift(tag)
          }
          if (item.children?.length) {
            walk(item.children, fullPath)
          }
        }
      }

      walk(routes, '')
    }

    /**
     * 关闭一个标签。
     * @returns 应该跳转到的下一个标签（关闭当前标签时由调用方负责导航）
     */
    function delView(path: string): TagView | undefined {
      const index = visitedViews.value.findIndex((view) => view.path === path)
      if (index === -1 || visitedViews.value[index].affix) {
        return undefined
      }

      visitedViews.value.splice(index, 1)
      // 优先右邻，其次左邻
      return visitedViews.value[index] ?? visitedViews.value[index - 1]
    }

    /** 关闭除固定标签与 path 之外的标签 */
    function delOthers(path: string): void {
      visitedViews.value = visitedViews.value.filter((view) => view.affix || view.path === path)
    }

    /** 关闭全部（固定标签保留） */
    function delAll(): void {
      visitedViews.value = visitedViews.value.filter((view) => view.affix)
    }

    /**
     * 刷新当前页：清缓存 → 卸载 → 停留一会儿 → 重新挂载。
     *
     * 不能只切 v-if 不换 include：keep-alive 会把旧实例原样还回来，setup 不会重跑，
     * 数据和滚动位置都还在，看着跟没刷新一样。先把 include 清空，缓存被丢掉，
     * 重新挂载才会走一遍完整的创建流程。
     *
     * @param delay 内容隐藏的时长，太短看不出「重新加载」，太长像卡死
     */
    function refreshView(delay = 320): void {
      if (refreshing) {
        return
      }

      refreshing = true
      contentVisible.value = false
      cacheSuspended.value = true

      if (refreshTimer) {
        clearTimeout(refreshTimer)
      }

      refreshTimer = setTimeout(() => {
        refreshTimer = undefined
        contentVisible.value = true
        cacheSuspended.value = false
        refreshing = false
      }, delay)
    }

    /** 刷新途中切到了别的标签页：立刻收尾，别让新页面停在空内容上 */
    function cancelRefresh(): void {
      if (!refreshing) {
        return
      }

      if (refreshTimer) {
        clearTimeout(refreshTimer)
        refreshTimer = undefined
      }

      contentVisible.value = true
      cacheSuspended.value = false
      refreshing = false
    }

    return {
      visitedViews,
      cachedNames,
      contentVisible,
      addView,
      initAffixViews,
      delView,
      delOthers,
      delAll,
      refreshView,
      cancelRefresh
    }
  },
  {
    persist: {
      key: 'tagsView',
      storage: localStorage,
      pick: ['visitedViews']
    }
  }
)
