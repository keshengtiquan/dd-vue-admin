/** 图形验证码接口返回的数据体（对应后端 /auth/captcha 的 data 字段） */
export interface CaptchaResult {
  /** 验证码标识，登录时需原样回传 */
  uuid: string
  /** 验证码图片：后端已返回完整的 data URI（data:image/png;base64,...），可直接用于 img.src */
  image: string
  /** 有效期（秒） */
  expireSeconds: number
}

/** 登录入参（对应后端 LoginDTO） */
export interface LoginParams {
  /** 登录账号（注意大小写：后端字段为 userName） */
  userName: string
  /** 登录密码 */
  password: string
  /** 验证码字符，开启 captcha.enabled 时必填 */
  code?: string
  /** 验证码标识，取自 /auth/captcha */
  uuid?: string
}

/**
 * 登录成功后 data 字段的形态。
 * 后端接口文档对该字段做过泛型擦除（标记为 int64），实际返回可能是纯 token 字符串，
 * 也可能是包含 token 的对象，因此这里做兼容声明，由调用方统一归一化。
 */
export type LoginToken = string | { token: string; tokenName?: string; expiresIn?: number }
