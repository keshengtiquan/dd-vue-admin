import { getCurrentUserApi, loginApi } from '@/api/auth'
import type { LoginParams } from '@/api/auth/types'
import { getToken, removeToken, setToken } from '@/utils/localStorage'

export const useUserStore = defineStore(
  'user',
  () => {
    const token = ref<string | undefined>(getToken())
    const id = ref<string | undefined>('')
    const name = ref<string | undefined>('')
    const nickName = ref<string | undefined>('')
    const avatar = ref<string | undefined>('')
    const roles = ref<string[]>([])
    const permissions = ref<string[]>([])

    /**
     * 账号密码登录。
     * 成功后把 token 写入 store 与 localStorage，后续请求由 http 拦截器统一带上。
     * 失败时抛出 Error，文案由接口层统一处理，页面直接展示 error.message 即可。
     */
    const login = async (userInfo: LoginParams): Promise<void> => {
      const payload = await loginApi(userInfo)
      const accessToken = payload.token

      if (!accessToken) {
        throw new Error('登录失败：接口未返回有效 token')
      }

      token.value = accessToken
      setToken(accessToken)
    }

    const getInfo = async (): Promise<void> => {
      const info = await getCurrentUserApi()
      // 缺字段时留空串而不是 "undefined"，守卫用 id 判空才不会误判成已加载
      id.value = info.user?.userId != null ? String(info.user.userId) : ''
      name.value = info.user.userName
      nickName.value = info.user.nickName || info.user.userName
      avatar.value = info.user.avatar || ''
      roles.value = info.roles || []
      permissions.value = info.permissions || []
    }

    /**
     * 清空本地登录态，**不发任何请求**。
     *
     * 退出登录与「登录已失效（401）」共用这条路径：后者手上拿的就是过期 token，
     * 再去调 logoutApi 只会又拿一个 401，所以必须有一条纯本地的清理方式。
     */
    const clearSession = (): void => {
      token.value = ''
      roles.value = []
      permissions.value = []
      id.value = ''
      name.value = ''
      nickName.value = ''
      avatar.value = ''
      removeToken()
    }

    const logOut = () => {}

    return {
      token,
      id,
      name,
      nickName,
      avatar,
      roles,
      permissions,
      login,
      getInfo,
      clearSession,
      logOut
    }
  },
  {
    persist: {
      key: 'user',
      storage: localStorage,
      /**
       * 只持久化 token。
       * id / roles / permissions 属于会话内数据，必须每次进入应用重新拉取：
       * 若一起缓存，刷新后守卫会认为「已有用户信息」而跳过 getInfo，
       * 权限调整后前端仍会拿着旧权限继续用。
       */
      pick: ['token']
    }
  }
)
