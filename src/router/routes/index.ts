import type { RouteRecordRaw } from 'vue-router'
import { coreRoute } from './coreRoutes'

interface RouteModuleType {
  default: RouteRecordRaw[]
}

const dynamicRouteFiles = import.meta.glob('./modules/**/*.ts', {
  eager: true
})

const mergeRouteMoudles = (routerModules: Record<string, unknown>) => {
  const mergedRoutes = []

  for (const routeModule of Object.values(routerModules)) {
    const module = (routeModule as RouteModuleType)?.default ?? []
    mergedRoutes.push(...module)
  }
  return mergedRoutes
}

export const dynamicRoute = mergeRouteMoudles(dynamicRouteFiles)

export const accessMode = import.meta.env.VITE_ACCESS_MODE || 'frontend'
// 首页作为固定入口保留；backend 模式下其余业务路由由菜单接口生成。
export const routes = accessMode === 'backend' ? [...coreRoute] : [...coreRoute, ...dynamicRoute]
