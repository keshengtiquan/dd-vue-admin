import type { RouteLocationNormalized, Router } from 'vue-router'
import { getToken } from '@/utils/cookies'
import { isPathMatch } from '@/utils/validate'

/** 免登录白名单 */
const whiteList = ['/login', '/404']

const isWhiteList = (path: string): boolean => {
  return whiteList.some((pattern: string) => isPathMatch(pattern, path))
}

export function setupBeforeEachGuard(router: Router): void {
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

    // TODO: 接入 useUserStore().getInfo() 拉取用户信息与权限，落地后再补
    if (isWhiteList(to.path)) {
      return true
    }

    return true
  })
}
