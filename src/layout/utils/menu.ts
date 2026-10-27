import { h, type VNode } from 'vue'
import type { MenuProps } from 'antdv-next'
import type { RouteRecordRaw } from 'vue-router'
import type { MenuNodeLike } from '@/utils/route'
import { resolveMenuLeaf, resolveMenuPath, visibleChildren } from '@/utils/route'
import AppIcon from '@/components/AppIcon/index.vue'

/** a-menu 的单项类型（ItemType 未对外导出，从 items 反推） */
type MenuItem = NonNullable<MenuProps['items']>[number]

/**
 * 把路由表转成菜单渲染所需的最小结构。
 *
 * 只保留 path / meta / children 三个字段，目的是让菜单组件不再直接依赖
 * RouteRecordRaw 这种联合类型，后面换成后端下发的 RouterVo 时也只需替换这里。
 */
function toMenuNode(route: RouteRecordRaw): MenuNodeLike {
  const children = 'children' in route ? route.children : undefined

  return {
    path: route.path,
    meta: route.meta
      ? {
          title: route.meta.title,
          icon: route.meta.icon,
          hidden: route.meta.hidden,
          alwaysShow: route.meta.alwaysShow,
          external: route.meta.external,
          link: route.meta.link
        }
      : undefined,
    children: children?.map(toMenuNode)
  }
}

/** 路由表 → 菜单树（已过滤 meta.hidden） */
export function toMenuTree(routes: readonly RouteRecordRaw[]): MenuNodeLike[] {
  return routes.filter((route) => !route.meta?.hidden).map(toMenuNode)
}

/**
 * 找出目标路径所有祖先 sub-menu 的 key，用于刷新后自动展开当前菜单。
 *
 * 注意：只有「会真正渲染成 a-sub-menu」的节点才算祖先——
 * 被 resolveMenuLeaf 判定为叶子（单子路由降级）的节点不产生 sub-menu，不能进 openKeys。
 */
export function findAncestorKeys(
  nodes: MenuNodeLike[],
  targetPath: string,
  basePath = ''
): string[] {
  const stack: string[] = []

  const walk = (list: MenuNodeLike[], parentPath: string): boolean => {
    for (const node of list) {
      const currentPath = resolveMenuPath(parentPath, node.path)

      const leaf = resolveMenuLeaf(node, currentPath)
      if (leaf) {
        // 叶子节点：命中即说明这一层是最终目标，祖先栈就是答案
        if (leaf.index === targetPath) {
          return true
        }
        continue
      }

      stack.push(currentPath)
      if (walk(visibleChildren(node), currentPath)) {
        return true
      }
      stack.pop()
    }
    return false
  }

  walk(nodes, basePath)
  return [...stack]
}

// ---------------------------------------------------------------------------
// 菜单树 → a-menu 的 items
// ---------------------------------------------------------------------------

/**
 * 折叠态下 antd 只渲染 icon 槽，没有图标的菜单项会缩进错位，这里给个中性兜底。
 */
const FALLBACK_ICON = 'circle-dot'

function renderIcon(name?: string | null): () => VNode {
  return () => h(AppIcon, { name: name || FALLBACK_ICON, size: 16 })
}

/**
 * 菜单树 → `<a-menu :items>`。
 *
 * ⚠️ 必须用 items 而不是 `<a-menu-item>` 子组件：
 * menu-item 的 key 由 Menu 遍历直接子节点时注入（内部 eventKey），
 * 一旦用递归组件包一层，Menu 只能看到组件 vnode、看不到内层的 a-menu-item，
 * key 会变成 undefined，导致高亮与点击事件全部失效。
 */
export function toMenuItems(nodes: MenuNodeLike[], basePath = ''): MenuItem[] {
  const items: MenuItem[] = []

  for (const node of nodes) {
    const currentPath = resolveMenuPath(basePath, node.path)
    const leaf = resolveMenuLeaf(node, currentPath)

    if (leaf) {
      items.push({
        key: leaf.index,
        label: leaf.title,
        icon: renderIcon(leaf.icon)
      })
      continue
    }

    items.push({
      key: currentPath,
      label: node.meta?.title,
      icon: renderIcon(node.meta?.icon),
      children: toMenuItems(visibleChildren(node), currentPath)
    })
  }

  return items
}
