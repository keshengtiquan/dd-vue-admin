import { TOKEN_KEY } from '@/constants/auth'
import Cookies from 'js-cookie'

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY)
}

export function setToken(token: string): string | undefined {
  return Cookies.set(TOKEN_KEY, token)
}

export function removeToken(): void {
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
