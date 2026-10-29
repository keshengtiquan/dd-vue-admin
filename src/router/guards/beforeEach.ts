import type { RouteLocationNormalized, Router } from 'vue-router'
import { getToken } from '@/utils/localStorage'
import { isPathMatch } from '@/utils/validate'
import { useUserStore } from '@/stores/modules/user'

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

    const userStore = useUserStore()

    /**
     * 已有用户信息就放行。
     *
     * 这里用 id 而不是 roles：roles 可能合法为空（账号没配角色），拿空数组当「未加载」
     * 会导致每次导航都重新拉取并重走导航，再次触发 Infinite redirect。
     * 另外 user store 只持久化 token（见 stores/modules/user.ts 的 pick），
     * 所以刷新页面后 id 一定是空的，会重新拉取最新的信息与权限。
     */
    if (userStore.id) {
      return true
    }

    try {
      await userStore.getInfo()
    } catch {
      // token 失效或接口异常：清本地态并回登录页
      userStore.clearSession()
      return `/login?redirect=${to.fullPath}`
    }

    // 接口成功但没拿到有效用户标识：按会话失效处理。
    // 不加这道判断的话，紧接着的重走导航会再次命中 id 为空的分支，形成死循环。
    if (!userStore.id) {
      userStore.clearSession()
      return `/login?redirect=${to.fullPath}`
    }

    // 首次拉取完成后重走本次导航，让依赖用户信息注册的路由参与匹配。
    // 只带 path/query/hash，避免把 matched 等内部字段一起传回去。
    return { path: to.path, query: to.query, hash: to.hash, replace: true }
  })
}
