import type { RouteRecordRaw } from 'vue-router'
import Layout from '@/layout/index.vue'
import type { BackendMenuRoute } from '@/api/auth/types'
import { getCurrentUserRoutesApi } from '@/api/auth'
import { normalizeRoutePath, componentToName, isExternalUrl } from '@/utils/route'

let registeredBackendRoutes: RouteRecordRaw[] = []

export function getBackendRoutes(): RouteRecordRaw[] {
  return registeredBackendRoutes
}

const viewModules = import.meta.glob('../views/**/*.vue')

function resolveView(component?: string | null) {
  if (!component) return undefined
  const key = `../views${component}.vue`
  // 菜单项必须保留，即使对应业务页面尚未创建；未实现页面时落到 404 视图。
  return viewModules[key] ?? (() => import('@/views/error/404.vue'))
}

/** 后端返回平铺列表；按 parentId 组装目录层级，再转换成 Vue Router 路由。 */
export async function loadBackendRoutes(): Promise<RouteRecordRaw[]> {
  const rows = await getCurrentUserRoutesApi()
  type MenuNode = BackendMenuRoute & { children: MenuNode[] }
  const byId = new Map<string, MenuNode>()
  rows.forEach((row) => byId.set(String(row.menuId), Object.assign({}, row, { children: [] })))
  const roots: MenuNode[] = []
  byId.forEach((row) => {
    const parent = byId.get(String(row.parentId))
    if (parent) parent.children.push(row)
    else roots.push(row)
  })

  const makeRoute = (row: MenuNode, top = false): RouteRecordRaw | null => {
    const external = isExternalUrl(row.path) || row.isFrame === true
    const children = row.children.map((child) => makeRoute(child)).filter(Boolean) as RouteRecordRaw[]
    const component = row.menuType === 'M' ? Layout : resolveView(row.component)
    if (!component && !children.length) return null
    return {
      path: normalizeRoutePath(row.path, top),
      name: row.menuName,
      component: (component ?? (() => import('@/views/error/404.vue'))) as RouteRecordRaw['component'],
      children,
      meta: {
        title: row.title,
        icon: row.icon,
        hidden: row.visible === '1',
        external,
        link: external ? row.path : undefined,
        affix: row.isAffix,
        cacheName: row.menuName ? componentToName(row.component) : undefined
      }
    }
  }
  registeredBackendRoutes = roots.map((row) => makeRoute(row, true)).filter(Boolean) as RouteRecordRaw[]
  return registeredBackendRoutes
}
