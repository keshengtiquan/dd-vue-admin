import type { RouteRecordRaw } from 'vue-router'
import type { BackendMenuRoute } from '@/api/system/menu'
import InnerLink from '@/components/InnerLink/index.vue'
import ParentView from '@/components/ParentView/index.vue'
import Layout from '@/layout/index.vue'
import { componentToName, joinRoutePath, normalizeRoutePath } from '@/utils/route'

/**
 * 后端菜单（平铺列表）→ vue-router 路由树
 *
 * 字段映射（后端 sys_menu → 前端 RouteMeta）：
 * | 后端                                   | 前端                                    |
 * | -------------------------------------- | --------------------------------------- |
 * | title / menuName                       | meta.title                              |
 * | icon（'#' 视为没配）                    | meta.icon                               |
 * | visible = '1'                          | meta.hidden（下发路由但不进侧边栏）      |
 * | isCache = true                         | meta.cacheName = 组件名（keep-alive 用） |
 * | isAffix = true                         | meta.affix（标签页固定）                 |
 * | isFrame = true                         | meta.external + meta.link，组件用 iframe |
 * | menuType = 'M'                         | 顶层挂 Layout，嵌套挂 ParentView         |
 * | menuType = 'C' + component             | src/views 下的页面组件                   |
 *
 * 组件解析不到时不做剪枝：菜单照常下发、挂 404 视图并标记 meta.pageMissing。
 * 原因是剪掉子项会让「只有一个可见子项」的目录被降级成一级菜单（系统管理 就是这种情况），
 * 整个父级分组会从侧边栏消失；保留菜单则页面补齐后无需改动任何代码。
 */

/** 全部页面组件：后端下发 'system/user/index'，这里换成真正的异步组件 */
const viewModules = import.meta.glob('/src/views/**/*.vue')

/** 页面组件缺失时的兜底视图 */
const NotFoundView = () => import('@/views/error/404.vue')

interface MenuNode extends BackendMenuRoute {
  children: MenuNode[]
}

export interface BuildRoutesResult {
  /** 顶层路由，交给 router.addRoute 逐个注册 */
  routes: RouteRecordRaw[]
  /** 视图组件缺失、已回退到 404 视图的菜单名，仅用于开发期提示 */
  missing: string[]
}

/** 按 parentId 组树并排序（orderNum → menuId），保证侧边栏顺序与后端配置一致 */
function toTree(list: BackendMenuRoute[]): MenuNode[] {
  const nodes = new Map<string, MenuNode>()
  for (const item of list) {
    nodes.set(String(item.menuId), { ...item, children: [] })
  }

  const roots: MenuNode[] = []
  for (const node of nodes.values()) {
    const parentId = node.parentId == null ? '0' : String(node.parentId)
    const parent = parentId === '0' ? undefined : nodes.get(parentId)
    // 父节点没下发（比如父目录未授权）时按顶级处理，避免整棵子树丢失
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  const sort = (list: MenuNode[]): void => {
    list.sort(
      (a, b) => (a.orderNum ?? 0) - (b.orderNum ?? 0) || Number(a.menuId) - Number(b.menuId)
    )
    list.forEach((node) => sort(node.children))
  }
  sort(roots)

  return roots
}

/** 组件路径 → 懒加载组件；解析不到返回 undefined（由调用方回退到 404 视图） */
function resolveView(component?: string | null): (() => Promise<unknown>) | undefined {
  const raw = (component ?? '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\.vue$/i, '')
  if (!raw) {
    return undefined
  }

  return viewModules[`/src/views/${raw}.vue`]
}

export function buildRoutes(menus: BackendMenuRoute[]): BuildRoutesResult {
  const missing: string[] = []
  const usedNames = new Set<string>()

  /** 路由名必须唯一：同组件被配到多个菜单时加后缀 */
  const uniqueName = (base: string): string => {
    let name = base
    let index = 2
    while (usedNames.has(name)) {
      name = `${base}-${index}`
      index += 1
    }
    usedNames.add(name)
    return name
  }

  const buildMeta = (node: MenuNode): RouteRecordRaw['meta'] => {
    const external = Boolean(node.isFrame)
    const cacheName = node.isCache ? componentToName(node.component) : undefined

    return {
      title: node.title || node.menuName,
      icon: node.icon && node.icon !== '#' ? node.icon : undefined,
      hidden: node.visible === '1',
      affix: Boolean(node.isAffix),
      cacheName,
      ...(external ? { external: true, link: node.path } : {})
    }
  }

  const buildChildren = (nodes: MenuNode[], parentPath: string): RouteRecordRaw[] => {
    return nodes.map((node) => buildRoute(node, parentPath, false))
  }

  function buildRoute(node: MenuNode, parentPath: string, isTopLevel: boolean): RouteRecordRaw {
    const external = Boolean(node.isFrame)
    const fullPath = isTopLevel
      ? normalizeRoutePath(node.path, true)
      : joinRoutePath(parentPath, normalizeRoutePath(node.path, false))

    // 外链：用 iframe 承载，真实地址放 meta.link（侧边栏点击时直接新窗口打开）
    if (external) {
      return {
        path: fullPath,
        name: uniqueName(`menu-${node.menuId}`),
        component: InnerLink,
        meta: buildMeta(node)
      }
    }

    const isDirectory = node.menuType === 'M'

    if (isDirectory) {
      // 目录本身没有页面，redirect 到首个子项；没有子项时挂一个默认 404 子路由
      const children = buildChildren(node.children, fullPath)

      if (children.length === 0) {
        missing.push(node.title || node.menuName)
        const baseMeta = buildMeta(node)
        const fallback: RouteRecordRaw = {
          path: '',
          name: uniqueName(`menu-${node.menuId}-missing`),
          component: NotFoundView,
          // hidden：别让这个兜底子路由变成菜单项（否则目录会被当成"有一个可见子项"而少一层）
          meta: { ...baseMeta, hidden: true, pageMissing: true }
        }
        return {
          path: fullPath,
          name: uniqueName(`menu-${node.menuId}`),
          component: isTopLevel ? Layout : ParentView,
          // 不能 redirect 到 fullPath 自身（默认子路由 path 为 ''，会无限重定向）
          meta: baseMeta,
          children: [fallback]
        } as RouteRecordRaw
      }

      return {
        path: fullPath,
        name: uniqueName(`menu-${node.menuId}`),
        component: isTopLevel ? Layout : ParentView,
        redirect: children[0].path,
        meta: buildMeta(node),
        children
      }
    }

    const view = resolveView(node.component)
    if (!view) {
      // 页面还没写：菜单保留，进去是 404 提示页
      missing.push(node.title || node.menuName)
    }

    const base = {
      path: fullPath,
      name: uniqueName(componentToName(node.component) ?? `menu-${node.menuId}`),
      component: view ?? NotFoundView,
      meta: { ...buildMeta(node), ...(view ? {} : { pageMissing: true }) }
    }

    // 菜单下再挂菜单属于少见配置，仍然支持（父级用自身页面，子级需自己提供出口）
    const children = buildChildren(node.children, fullPath)
    return (children.length ? { ...base, children } : base) as RouteRecordRaw
  }

  const routes = toTree(menus).map((node) => buildRoute(node, '', true))

  return { routes, missing }
}
