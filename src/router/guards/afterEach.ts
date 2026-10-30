import type { Router } from 'vue-router'
import { APP_TITLE } from '@/constants/app'

export function setupAfterEachGuard(router: Router): void {
  router.afterEach((to) => {
    // 浏览器标题跟随当前路由；没有 title 的路由（404、登录）直接用系统名
    document.title = to.meta.title ? `${to.meta.title} - ${APP_TITLE}` : APP_TITLE
  })

  router.onError(() => {})
}
