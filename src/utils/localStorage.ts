import { TOKEN_KEY } from '@/constants/auth'

/**
 * 登录凭证的本地读写。
 *
 * 迁移到 Element Plus 之后不再依赖 js-cookie：token 统一放 localStorage，
 * 请求拦截器（utils/http.ts）和路由守卫（guards/beforeEach.ts）都从这里取。
 */
export function getToken(): string | undefined {
  return localStorage.getItem(TOKEN_KEY) ?? undefined
}

export function setToken(token: string): string {
  localStorage.setItem(TOKEN_KEY, token)
  return token
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}
