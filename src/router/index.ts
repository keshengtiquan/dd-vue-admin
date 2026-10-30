import type { App } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { usePermissionStore } from '@/stores/modules/permission'
import { registerDynamicRoutes } from './dynamic'
import { routes, dynamicRoute, accessMode } from './routes'
import { setupBeforeEachGuard } from './guards/beforeEach'
import { setupAfterEachGuard } from './guards/afterEach'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: routes
})

export function initRouter(app: App<Element>): void {
  // frontend 模式：本地路由模块直接当菜单，不请求接口
  // backend 模式：静态只留核心路由 + 首页，业务路由由守卫拉菜单后 addRoute
  if (accessMode === 'frontend') {
    usePermissionStore().initLocalRoutes(dynamicRoute)
  }

  setupBeforeEachGuard(router, (dynamicRoutes) => registerDynamicRoutes(router, dynamicRoutes))
  setupAfterEachGuard(router)
  app.use(router)
}
