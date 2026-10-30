import { get, post } from '@/utils/http'
import type { CaptchaResult, CurrentUserInfo, LoginParams, LoginToken } from './types'

/**
 * 图形验证码接口。
 * 后端返回体为 { code, message, data: { uuid, image, expireSeconds } }，
 * 这里用 get 取出 data；image 已是完整 data URI，前端无需再拼前缀。
 */
export const captchaImage = () => {
  return get<CaptchaResult>('/auth/captcha')
}

/**
 * 账号密码登录。
 * 后端 LoginDTO 字段为 userName / password / code / uuid，响应 R.data 携带 token。
 */
export const loginApi = (data: LoginParams) => {
  return post<LoginToken>('/auth/login', data)
}

export const getCurrentUserApi = () => get<CurrentUserInfo>('/auth/getUserInfo')
