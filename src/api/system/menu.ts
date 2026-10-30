import { get } from '@/utils/http'

/**
 * 当前登录用户可访问的路由菜单（对应后端 GET /system/menu/routes）
 *
 * 后端返回的是**平铺列表**（不含 children 树），层级关系靠 parentId 组织；
 * 转成 vue-router 路由树的工作在 src/router/helpers/buildRoutes.ts 里做。
 */
export interface BackendMenuRoute {
  menuId: number | string
  menuName: string
  /** 路由标题 */
  title: string
  /** 父菜单 ID，0 / null 表示顶级 */
  parentId: number | string
  orderNum: number
  /** 路由地址；isFrame 为 true 时是完整 URL */
  path: string
  /** 前端组件路径，形如 /system/user/index；目录为空 */
  component?: string | null
  /** 路由参数（JSON 字符串），当前未使用 */
  query?: string | null
  /** 是否外链 */
  isFrame?: boolean
  /** 是否 keep-alive 缓存 */
  isCache?: boolean
  /** 是否固定标签页 */
  isAffix?: boolean
  /** M 目录、C 菜单（F 按钮后端已过滤，不会下发） */
  menuType: 'M' | 'C'
  /** 显示状态：0 显示、1 隐藏 */
  visible?: string
  /** 权限标识 */
  perms?: string
  /** 菜单图标 */
  icon?: string
}

export const getRoutesApi = () => get<BackendMenuRoute[]>('/system/menu/routes')
