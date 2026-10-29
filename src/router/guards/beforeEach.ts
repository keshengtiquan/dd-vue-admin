import type { RouteLocationNormalized, Router } from 'vue-router'
import { getToken } from '@/utils/localStorage'
import { isPathMatch } from '@/utils/validate'
import { useUserStore } from '@/stores/modules/user'
import { accessMode } from '@/router/routes'

/** 免登录白名单 */
const whiteList = ['/login', '/404']

const isWhiteList = (path: string): boolean => {
  return whiteList.some((pattern: string) => isPathMatch(pattern, path))
}

export function setupBeforeEachGuard(router: Router): void {
  let initialized = false
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
    try {
      await userStore.getInfo()
      if (accessMode === 'backend') {
      }
      return { ...to, replace: true }
    } catch (error) {
      userStore.clearSession()
      return `/login?redirect=${to.fullPath}`
    }

    if (isWhiteList(to.path)) {
      return true
    }

    return true
  })
}
