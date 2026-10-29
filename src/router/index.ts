import type { App } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { routes, dynamicRoute, accessMode } from './routes'
import { setupBeforeEachGuard } from './guards/beforeEach'
import { setupAfterEachGuard } from './guards/afterEach'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: routes
})

export function initRouter(app: App<Element>): void {
  if (accessMode === 'frontend') dynamicRoute.forEach((route) => router.addRoute(route))
  setupBeforeEachGuard(router)
  setupAfterEachGuard(router)
  app.use(router)
}
