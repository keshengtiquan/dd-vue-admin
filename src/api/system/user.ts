import { get } from '@/utils/http'

export interface UserRow {
  userId: number
  userName: string
  nickName: string
  userType: string
  email?: string
  phoneNumber?: string
  status: string
  loginIp?: string
  loginDate?: string
  createTime?: string
  remark?: string
}

export interface UserPageQuery {
  pageNum: number
  pageSize: number
  userName?: string
  nickName?: string
  status?: string
}

export interface UserPageResult {
  total: number
  list: UserRow[]
}

export const getUserPageApi = (params: UserPageQuery) =>
  get<UserPageResult>('/system/user/pageList', params)
