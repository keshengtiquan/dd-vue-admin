/**
 * 路由路径工具
 *
 * 背景：动态路由的 path 完全来自后端菜单配置，而 vue-router 对 path 有硬性要求
 * ——顶层 path 必须以 '/' 开头，否则 tokenizePath 会直接抛
 * `Route paths should start with a "/": "xxx" should be "/xxx"`，
 * 整个动态路由生成流程都会失败。
 *
 * 菜单里可以填任意字符串（例如把「若依官网」的 path 配成 http://ruoyi.vip），
 * 所以这里统一做规范化，不信任后端下发的 path。
 */

/** 绝对 URL 判定：http:// 、https:// 、协议相对 //example.com */
const EXTERNAL_URL_RE = /^(?:https?:)?\/\//i

/** 外链菜单改写到站内后使用的路径前缀 */
export const EXTERNAL_PATH_PREFIX = '/external'

/** 是否为绝对 URL（外链/内链菜单的 path 就是完整网址） */
export function isExternalUrl(path?: string | null): boolean {
  return EXTERNAL_URL_RE.test(path ?? '')
}

/**
 * 把外部地址转成稳定的路径片段：http://ruoyi.vip → ruoyi-vip
 * 同一地址每次生成结果一致，便于刷新、收藏与菜单高亮比较。
 */
export function toRouteSlug(url: string): string {
  const slug = url
    .replace(EXTERNAL_URL_RE, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return slug || 'external'
}

/**
 * 规范化路由 path：
 * - 外链菜单（path 是完整网址）→ 顶层改写为 `/external/<slug>`、子级改写为相对片段，
 *   真实地址由调用方放进 `meta.link`；
 * - 其他顶层 path 缺 '/' 时补齐（例如菜单里误配成 'user'）；
 * - 子路由保持相对路径（vue-router 允许，会与父级 path 自动拼接）。
 *
 * path 允许为空（sys_menu.path 可为 null），此时按空字符串处理，避免直接抛 TypeError。
 */
export function normalizeRoutePath(
  rawPath: string | null | undefined,
  isTopLevel: boolean
): string {
  const path = rawPath ?? ''
  if (isExternalUrl(path)) {
    const slug = toRouteSlug(path)
    return isTopLevel ? `${EXTERNAL_PATH_PREFIX}/${slug}` : slug
  }
  if (!isTopLevel) {
    return path
  }
  return path.startsWith('/') ? path : `/${path}`
}

// ---------------------------------------------------------------------------
// keep-alive 缓存名
// ---------------------------------------------------------------------------

/** 把一个路径片段转成 PascalCase（'tree-table' → 'TreeTable'、'list' → 'List'） */
function toPascalCase(segment: string): string {
  return segment
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

/**
 * 由后端下发的 `component` 字符串派生稳定的组件名，用于 <KeepAlive> 缓存。
 *
 * - `system/user/index` → `SystemUser`
 * - `monitor/cache/list` → `MonitorCacheList`
 *
 * 末尾的 `index` 会被去掉，所以「目录 + index.vue」与「同名叶子文件」得到同一个名字。
 *
 * ⚠️ 约定：页面组件必须用 `defineOptions({ name })` 声明**同名**的 name，
 * `<KeepAlive :include>` 是按组件名匹配的；没声明只会「不被缓存」，不会报错。
 * （Vue 3 会从文件名推断出 `__name`，index.vue 推出来是 'index'，所以不能省略声明。）
 */
export function componentToName(component?: string | null): string | undefined {
  const parts = (component ?? '').split('/').filter(Boolean)
  if (parts.length > 1 && parts[parts.length - 1]?.toLowerCase() === 'index') {
    parts.pop()
  }
  const name = parts.map(toPascalCase).join('')
  return name || undefined
}

// ---------------------------------------------------------------------------
// 侧边栏菜单渲染
// ---------------------------------------------------------------------------

/**
 * 菜单渲染所需的最小结构。
 * 后端的 RouterVo 和前端的 RouteRecordRaw 都满足这个形状。
 */
export interface MenuNodeLike {
  path: string
  meta?: {
    title?: string
    icon?: string
    hidden?: boolean
    alwaysShow?: boolean
    external?: boolean
    link?: string | null
  } | null
  children?: MenuNodeLike[]
}

/** 一个菜单项最终渲染成「叶子节点」时需要的信息 */
export interface MenuLeaf {
  /** 菜单项的唯一标识（点击后跳转的目标）：站内完整路径，或外链完整网址 */
  index: string
  title?: string
  icon?: string
}

/** 拼接菜单的完整路径（父级 basePath + 子级 routePath） */
export function resolveMenuPath(basePath: string, routePath: string): string {
  // 外链地址直接使用，不再拼接
  if (isExternalUrl(routePath)) return routePath
  if (isExternalUrl(basePath)) return basePath
  if (!routePath) return basePath
  // 子路径以 / 开头说明它本身就是绝对路径（后端或本地路由都可能这么配）
  if (routePath.startsWith('/')) return routePath
  if (!basePath) return `/${routePath}`
  return `${basePath.replace(/\/+$/, '')}/${routePath}`
}

/** 可见子菜单（过滤 meta.hidden 的项） */
export function visibleChildren(item: MenuNodeLike): MenuNodeLike[] {
  return (item.children ?? []).filter((child) => !child.meta?.hidden)
}

function toMenuLeaf(node: MenuNodeLike, path: string): MenuLeaf {
  // 外链菜单：index 直接用完整网址，点击时由调用方新窗口打开
  const externalUrl = node.meta?.external ? node.meta.link : undefined
  return {
    index: externalUrl || path,
    title: node.meta?.title,
    icon: node.meta?.icon
  }
}

/**
 * 计算菜单项是否应「降级为单个菜单项」渲染（与 RuoYi 的 hasOneShowingChild 行为一致）：
 * - 无可见子菜单 → 自身作为叶子；
 * - 恰有一个可见子菜单、且该子菜单没有可见子菜单 → 用该子菜单作为叶子（省掉一层无意义的嵌套）；
 * - 其余情况（多个可见子菜单，或配置了 alwaysShow）→ 返回 undefined，即渲染为可展开的分组。
 *
 * @param item 当前菜单项
 * @param basePath 当前菜单项自身的完整路径
 */
export function resolveMenuLeaf(item: MenuNodeLike, basePath: string): MenuLeaf | undefined {
  if (item.meta?.alwaysShow) {
    return undefined
  }

  const children = visibleChildren(item)
  if (children.length === 0) {
    return toMenuLeaf(item, basePath)
  }

  if (children.length === 1 && visibleChildren(children[0]).length === 0) {
    const onlyChild = children[0]
    return toMenuLeaf(onlyChild, resolveMenuPath(basePath, onlyChild.path))
  }

  return undefined
}
