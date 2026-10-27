export interface ApiResult<T = unknown> {
  /** 业务状态码，200 表示成功 */
  code: number

  message?: string
  /** 数据载荷（注意：后端 data 为 null 时此字段可能不存在） */
  data?: T
}

/**
 * 请求方法类型
 */
export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch'
