import type { RouteRecordRaw, Router } from 'vue-router'

/**
 * 动态路由注册 / 注销
 *
 * 独立成模块（而不是写在 router/index.ts 里）是为了让「退出登录」这类
 * 组件侧逻辑能直接调用 —— 组件 import '@/router' 会和
 * router → routes/modules → layout → components 形成环。
 */

/** addRoute 返回的移除句柄 */
const removeRouteFns: (() => void)[] = []

export function registerDynamicRoutes(router: Router, routes: RouteRecordRaw[]): void {
  for (const route of routes) {
    removeRouteFns.push(router.addRoute(route))
  }
}

/** 退出登录 / 换账号时调用，避免上一个用户的菜单残留在路由表里 */
export function clearDynamicRoutes(): void {
  while (removeRouteFns.length) {
    removeRouteFns.pop()?.()
  }
}
