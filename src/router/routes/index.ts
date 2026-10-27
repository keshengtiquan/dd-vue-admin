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

export const routes = [...coreRoute, ...dynamicRoute]
