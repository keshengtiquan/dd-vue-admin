/**
 * 路由 meta 类型增强
 *
 * 布局（侧边栏 / 面包屑 / 标签页 / keep-alive）都按 meta 上的约定字段渲染，
 * 这里把它们声明出来，避免每处都写 `route.meta.xxx as string`。
 *
 * 约定：
 * - title     菜单与标签页显示的文字；没有 title 的路由不进菜单、不进标签页
 * - icon      图标名，走 AppIcon（见 src/components/AppIcon/icons.ts）
 * - hidden    不在侧边栏显示
 * - affix     标签页固定，不可关闭（如首页）
 * - cacheName keep-alive 的组件名；缺省回退到路由 name
 * - activeMenu 详情页等需要高亮「列表页」菜单时，指定要高亮的路径
 * - link/external 外链菜单（后端菜单下发）时的目标地址与标记
 * - pageMissing 后端菜单已配置但视图组件不存在，路由回退到 404 视图
 */
import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    icon?: string
    hidden?: boolean
    alwaysShow?: boolean
    affix?: boolean
    cacheName?: string
    activeMenu?: string
    external?: boolean
    link?: string | null
    pageMissing?: boolean
  }
}
