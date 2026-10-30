import { get, post } from '@/utils/http'

/**
 * 系统用户接口（对应后端 com.dadaz.admin.module.system.user）
 *
 * 后端现有能力有限，这里只封能用的：
 * | 接口                             | 用途                      |
 * | -------------------------------- | ------------------------- |
 * | GET  /system/user/pageList       | 分页查询（账号/昵称/状态） |
 * | GET  /system/user/{userId}       | 按 ID 查详情              |
 * | POST /system/user/create         | 新增                      |
 * | GET  /system/user/delete/{userId}| 删除单个                  |
 *
 * 尚未提供：修改（update 是空实现，且 UserUpdateDTO 没有 userId）、状态切换、
 * 批量删除、导入导出、重置密码、分配角色、部门树、角色列表。
 * 页面上对应入口一律没做，等后端补齐后再接，避免写一堆调不通的代码。
 */

/** 用户行数据（后端 UserVO） */
export interface UserRow {
  userId: number
  /** 所属部门 ID（后端只给 ID，没有部门名称） */
  deptId?: number
  userName: string
  nickName: string
  userType: string
  email?: string
  /** 注意后端字段名是 phoneNumber，不是 RuoYi 的 phonenumber */
  phoneNumber?: string
  /** 性别：0 男 / 1 女 / 2 未知 */
  sex?: string
  avatar?: string
  /** 账号状态：0 正常 / 1 停用 */
  status: string
  loginIp?: string
  loginDate?: string
  createTime?: string
  remark?: string
}

/** 分页查询参数（后端 UserQueryDTO，pageNum / pageSize 必传） */
export interface UserPageQuery {
  pageNum: number
  pageSize: number
  /** 登录账号，模糊匹配 */
  userName?: string
  /** 用户昵称，模糊匹配 */
  nickName?: string
  /** 账号状态：0 正常 / 1 停用 */
  status?: string
}

/** 分页结果（后端 PageResult） */
export interface UserPageResult {
  total: number
  list: UserRow[]
}

/** 新增用户入参（后端 UserCreateDTO） */
export interface UserCreatePayload {
  userName: string
  nickName: string
  password: string
  deptId?: number
  email?: string
  phoneNumber?: string
  sex?: string
  status?: string
  remark?: string
  roleIds?: number[]
}

export const getUserPageApi = (params: UserPageQuery) =>
  get<UserPageResult>('/system/user/pageList', params)

export const getUserDetailApi = (userId: number) => get<UserRow>(`/system/user/${userId}`)

export const createUserApi = (data: UserCreatePayload) => post<number>('/system/user/create', data)

/** 删除单个用户（后端用的是 GET，不是 DELETE） */
export const deleteUserApi = (userId: number) => get<number>(`/system/user/delete/${userId}`)
