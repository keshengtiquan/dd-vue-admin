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
/**
 * 首页固定项：不随后端菜单走。
 * backend 模式下它是唯一静态注册的业务路由，其余由 /system/menu/routes 生成。
 */
export const homeRoute = dynamicRoute.filter((route) => route.name === 'home')
export const routes =
  accessMode === 'backend' ? [...coreRoute, ...homeRoute] : [...coreRoute, ...dynamicRoute]
