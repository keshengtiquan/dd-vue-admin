import type { App } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { routes } from './routes'
import { setupBeforeEachGuard } from './guards/beforeEach'
import { setupAfterEachGuard } from './guards/afterEach'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: routes
})

export function initRouter(app: App<Element>): void {
  // 进度条的配置与开关收口在 @/utils/progress，这里只负责注册守卫。
  // beforeEach 开始进度条 → afterEach / onError 收尾，成对注册，缺一不可。
  setupBeforeEachGuard(router)
  setupAfterEachGuard(router)
  app.use(router)
}
