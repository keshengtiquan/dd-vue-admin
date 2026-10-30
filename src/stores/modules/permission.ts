import type { RouteRecordRaw } from 'vue-router'
import { getRoutesApi } from '@/api/system/menu'
import { buildRoutes } from '@/router/helpers/buildRoutes'
import { homeRoute } from '@/router/routes'

/**
 * 动态路由 / 菜单状态
 *
 * 两个列表分工：
 * - `dynamicRoutes`：还没注册进 router 的顶层路由，由路由守卫 addRoute；
 * - `menuRoutes`：侧边栏渲染用的完整菜单树（含本地固定的首页），注册完也不变。
 *
 * 为什么侧边栏不直接读 `router.options.routes`：addRoute 加的路由不会进 options，
 * 后端模式下那里永远是初始的那几条。
 */
export const usePermissionStore = defineStore(
  'permission',
  () => {
    const menuRoutes = ref<RouteRecordRaw[]>([])
    const dynamicRoutes = ref<RouteRecordRaw[]>([])
    /** 是否已按后端菜单生成过路由，守卫用它判断要不要重复拉取 */
    const loaded = ref(false)

    /**
     * 后端模式：拉取当前用户菜单并转成路由树。
     * 视图组件缺失的菜单会保留下来、路由回退到 404 视图，开发环境给一条汇总日志。
     */
    async function generateRoutes(): Promise<RouteRecordRaw[]> {
      const menus = (await getRoutesApi()) ?? []
      const { routes, missing } = buildRoutes(menus)

      if (import.meta.env.DEV && missing.length) {
        console.warn(`[routes] 以下菜单有配置但缺少页面组件，已回退到 404：${missing.join('、')}`)
      }

      dynamicRoutes.value = routes
      // 首页是本地固定路由，不随后端菜单走
      menuRoutes.value = [...homeRoute, ...routes]
      loaded.value = true
      return routes
    }

    /** 前端模式：直接用本地路由模块当菜单，不请求接口 */
    function initLocalRoutes(routes: RouteRecordRaw[]): void {
      dynamicRoutes.value = []
      menuRoutes.value = routes
      loaded.value = true
    }

    /** 退出登录 / 会话失效时清空，换账号后能重新生成 */
    function reset(): void {
      dynamicRoutes.value = []
      menuRoutes.value = []
      loaded.value = false
    }

    return { menuRoutes, dynamicRoutes, loaded, generateRoutes, initLocalRoutes, reset }
  },
  {
    persist: false
  }
)
