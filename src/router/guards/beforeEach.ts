import type { RouteLocationNormalized, RouteRecordRaw, Router } from 'vue-router'
import { accessMode } from '@/router/routes'
import { usePermissionStore } from '@/stores/modules/permission'
import { useUserStore } from '@/stores/modules/user'
import { getToken } from '@/utils/localStorage'
import { isPathMatch } from '@/utils/validate'

/** 免登录白名单 */
const whiteList = ['/login', '/404']

const isWhiteList = (path: string): boolean => {
  return whiteList.some((pattern: string) => isPathMatch(pattern, path))
}

/**
 * 全局前置守卫
 *
 * @param router 路由实例
 * @param registerRoutes 注册动态路由的方法（由 router/index.ts 传入，避免与它循环依赖）
 */
export function setupBeforeEachGuard(
  router: Router,
  registerRoutes: (routes: RouteRecordRaw[]) => void
): void {
  router.beforeEach(async (to: RouteLocationNormalized) => {
    // ---------------------- 未登录 ----------------------
    if (!getToken()) {
      // 白名单直接放行，其余跳转登录页并记录来源
      if (isWhiteList(to.path)) {
        return true
      }
      return `/login?redirect=${to.fullPath}`
    }

    // ---------------------- 已登录 ----------------------
    // 已登录时访问登录页，直接回首页
    if (to.path === '/login') {
      return { path: '/' }
    }

    const userStore = useUserStore()
    const permissionStore = usePermissionStore()

    try {
      /**
       * 1. 用户信息。
       * 判空用 id 而不是 roles：roles 可能合法为空（账号没配角色），拿空数组当「未加载」
       * 会导致每次导航都重新拉取并重走导航，再次触发 Infinite redirect。
       * user store 只持久化 token（见 stores/modules/user.ts 的 pick），所以刷新后 id 必为空。
       */
      if (!userStore.id) {
        await userStore.getInfo()
        // 接口成功但没拿到有效用户标识：按会话失效处理
        if (!userStore.id) {
          throw new Error('用户信息为空')
        }
      }

      /**
       * 2. 动态路由。
       * backend 模式下业务路由全部来自 /system/menu/routes，必须先注册再放行，
       * 否则刷新页面时会先命中静态注册的 404（catch-all）。
       */
      if (accessMode === 'backend' && !permissionStore.loaded) {
        const dynamicRoutes = await permissionStore.generateRoutes()
        registerRoutes(dynamicRoutes)
        // 新路由此刻才进路由表，重走本次导航让它参与匹配。
        // 只带 path/query/hash，避免把 matched 等内部字段一起传回去。
        return { path: to.path, query: to.query, hash: to.hash, replace: true }
      }
    } catch {
      // token 失效 / 接口异常 / 菜单拉取失败：清本地态并回登录页
      userStore.clearSession()
      permissionStore.reset()
      return `/login?redirect=${to.fullPath}`
    }

    return true
  })
}
