import { TOKEN_KEY } from '@/constants/auth'
import Cookies from 'js-cookie'

export function getToken(): string | undefined {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) return token

  // 兼容升级前已登录的用户：将旧 Cookie token 迁移到 localStorage。
  const legacyToken = Cookies.get(TOKEN_KEY)
  if (legacyToken) {
    localStorage.setItem(TOKEN_KEY, legacyToken)
    Cookies.remove(TOKEN_KEY)
    return legacyToken
  }
  return undefined
}

export function setToken(token: string): string | undefined {
  localStorage.setItem(TOKEN_KEY, token)
  Cookies.remove(TOKEN_KEY)
  return token
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  Cookies.remove(TOKEN_KEY)
}

export function setCookie(name: string, value: any, options: any): void {
  Cookies.set(name, value, options)
}

export function deleteCookie(name: string): void {
  Cookies.remove(name)
}

export function getCookie(name: string): string | undefined {
  return Cookies.get(name)
}
