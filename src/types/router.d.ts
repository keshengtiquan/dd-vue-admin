import 'vue-router'

/**
 * 扩展 vue-router 的 RouteMeta，声明本项目用到的路由元信息字段。
 * 来源：后端 RouterVo.meta（对应 Java 的 MetaVo），
 * 以及前端转换时从 RouterVo 补充的 hidden / alwaysShow / cacheName。
 */
declare module 'vue-router' {
  interface RouteMeta {
    /** 菜单标题，用于侧边栏与面包屑 */
    title?: string
    /** 菜单图标 */
    icon?: string
    /** 是否不被 <keep-alive> 缓存 */
    noCache?: boolean
    /** 外链/内链地址（http(s):// 开头），配合 InnerLink 组件使用 */
    link?: string | null
    /** 是否为外链菜单（后端 path 就是完整网址，已改写到 /external/<slug>） */
    external?: boolean
    /** 是否在侧边栏隐藏该菜单（来自 RouterVo.hidden） */
    hidden?: boolean
    /** 只有一个子路由时是否仍显示父级菜单（来自 RouterVo.alwaysShow） */
    alwaysShow?: boolean
    /** 是否固定为标签页（TagsViews 里不可关闭的标签，如首页） */
    affix?: boolean
    /**
     * <KeepAlive> 缓存用的组件名。
     * 由后端下发的 component 字符串派生（见 utils/route.ts 的 componentToName），
     * 页面组件需用 defineOptions({ name }) 声明同名 name 才会真正被缓存。
     */
    cacheName?: string
  }
}
