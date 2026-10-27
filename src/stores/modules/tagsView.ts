/**
 * 标签页（TagsView）状态
 *
 * 与路由的职责边界：
 * - 这里只维护「有哪些标签、哪些组件名需要被 keep-alive 缓存」；
 * - 关闭当前标签后跳转哪个路由，由组件层决定（store 里不碰 router）。
 */
export interface TagView {
  /** 标签唯一标识：用 path 而非 fullPath，避免同一页面带不同 query 时开出多个标签 */
  path: string
  /** 点击标签跳转时使用的完整地址（含 query） */
  fullPath: string
  title: string
  name?: string
  /** 固定标签：不显示关闭按钮，且「关闭其他/全部」时保留 */
  affix?: boolean
  /** keep-alive 缓存名，需与页面组件的 defineOptions({ name }) 一致 */
  cacheName?: string
}

export const useTagsViewStore = defineStore('tagsView', () => {
  const visitedViews = ref<TagView[]>([])
  /** 临时排除缓存的组件名（刷新标签时先踢出 keep-alive，再放回去） */
  const excludedCaches = ref<string[]>([])
  /** 强制重建 router-view 的计数器 */
  const viewKey = ref(0)

  /** 交给 <keep-alive :include> 的组件名列表 */
  const cachedViews = computed<string[]>(() =>
    Array.from(
      new Set(
        visitedViews.value
          .map((view) => view.cacheName)
          .filter((name): name is string => !!name && !excludedCaches.value.includes(name))
      )
    )
  )

  function addView(view: TagView): void {
    const existed = visitedViews.value.find((item) => item.path === view.path)
    if (existed) {
      // 同一路由带了新 query：只更新跳转地址与标题，不新增标签
      existed.fullPath = view.fullPath
      existed.title = view.title
      return
    }
    visitedViews.value.push(view)
  }

  /**
   * 关闭一个标签，返回关闭后建议跳转的目标（关闭的不是当前页时返回 undefined）。
   * 优先取右邻标签，没有则取左邻，全关光则返回 undefined 交给调用方回首页。
   */
  function delView(view: TagView): TagView | undefined {
    const index = visitedViews.value.findIndex((item) => item.path === view.path)
    if (index === -1) {
      return undefined
    }

    visitedViews.value.splice(index, 1)
    excludedCaches.value = excludedCaches.value.filter((name) => name !== view.cacheName)

    return visitedViews.value[index] ?? visitedViews.value[index - 1]
  }

  /** 关闭除「固定标签 + 指定标签」外的所有标签，返回指定标签 */
  function delOthers(view: TagView): TagView | undefined {
    visitedViews.value = visitedViews.value.filter((item) => item.affix || item.path === view.path)

    const alive = new Set(
      visitedViews.value.map((item) => item.cacheName).filter((name): name is string => !!name)
    )
    excludedCaches.value = excludedCaches.value.filter((name) => alive.has(name))

    return visitedViews.value.find((item) => item.path === view.path)
  }

  /** 关闭全部标签，只保留固定标签，返回最后一个固定标签 */
  function delAll(): TagView | undefined {
    visitedViews.value = visitedViews.value.filter((item) => item.affix)
    excludedCaches.value = []
    return visitedViews.value[visitedViews.value.length - 1]
  }

  /**
   * 刷新某个标签对应的页面：
   * 先把组件名从 keep-alive 的 include 里摘掉（销毁缓存实例），
   * 再递增 viewKey 让 router-view 重建，最后把名字放回去以恢复缓存。
   */
  async function refreshView(view: TagView): Promise<void> {
    const cacheName = view.cacheName

    if (cacheName) {
      excludedCaches.value = [...excludedCaches.value, cacheName]
    }
    viewKey.value += 1

    if (!cacheName) {
      return
    }

    await nextTick()
    excludedCaches.value = excludedCaches.value.filter((name) => name !== cacheName)
  }

  return {
    visitedViews,
    cachedViews,
    viewKey,
    addView,
    delView,
    delOthers,
    delAll,
    refreshView
  }
})
