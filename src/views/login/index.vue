<template>
  <div class="flex h-full min-h-screen overflow-hidden bg-white">
    <!-- ------------------------- 左：品牌视觉（loginBg） ------------------------- -->
    <aside class="relative hidden shrink-0 lg:block lg:w-[52%] xl:w-[56%]">
      <!--
        背景图原始尺寸 3840x2160，用 object-cover 铺满；
        fetchpriority=high 让它在首屏优先加载，避免左栏闪白。
      -->
      <img
        :src="loginBg"
        alt=""
        aria-hidden="true"
        class="absolute inset-0 size-full object-cover"
        decoding="async"
        fetchpriority="high"
      />
      <!-- 自下而上压暗，保证叠加文字在任意图片区域都够对比度 -->
      <div
        class="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.75),rgba(0,0,0,0.3)_45%,rgba(0,0,0,0.1))]"
      />

      <div class="relative flex h-full flex-col justify-between p-10 xl:p-14">
        <!-- 顶部品牌 -->
        <div class="flex items-center gap-3 text-white">
          <span
            class="flex size-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm"
          >
            <CircleCheck class="size-5" />
          </span>
          <span class="text-base font-semibold tracking-wide">{{ APP_TITLE }}</span>
        </div>

        <!-- 底部标语 -->
        <div class="max-w-110 text-white">
          <h2 class="text-3xl leading-snug font-semibold xl:text-4xl">
            让每一次管理<br />
            都清晰而高效
          </h2>
          <p class="mt-4 text-sm leading-relaxed text-white/70">
            统一的学生信息、成绩与班级事务视图，把重复劳动交给系统，把时间还给孩子。
          </p>
        </div>
      </div>
    </aside>

    <!-- ------------------------- 右：登录表单 ------------------------- -->
    <main
      class="relative flex flex-1 items-center justify-center overflow-y-auto px-6 py-12 sm:px-10"
    >
      <div
        class="w-full max-w-95 animate-[login-fade-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none"
      >
        <!-- 移动端补一个品牌头，桌面端左栏已承载 -->
        <div class="mb-8 flex items-center gap-2 lg:hidden">
          <span class="flex size-9 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <CircleCheck class="size-4.5" />
          </span>
          <span class="text-sm font-semibold text-zinc-900">{{ APP_TITLE }}</span>
        </div>

        <header class="mb-7">
          <h1 class="text-2xl font-semibold tracking-tight text-zinc-900">欢迎回来</h1>
          <p class="mt-2 text-sm text-zinc-500">请使用账号密码登录你的工作台</p>
        </header>

        <!-- el-form 系列组件由 unplugin-vue-components 的 ElementPlusResolver 自动导入 -->
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          size="large"
          label-position="top"
          @submit.prevent
        >
          <el-form-item prop="userName">
            <el-input
              v-model="form.userName"
              placeholder="请输入登录账号"
              autocomplete="username"
              clearable
              :disabled="loading"
              aria-label="登录账号"
              @keyup.enter="handleSubmit"
            >
              <template #prefix>
                <User class="size-4 text-zinc-400" />
              </template>
            </el-input>
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入登录密码"
              autocomplete="current-password"
              show-password
              :disabled="loading"
              aria-label="登录密码"
              @keyup.enter="handleSubmit"
            >
              <template #prefix>
                <Lock class="size-4 text-zinc-400" />
              </template>
            </el-input>
          </el-form-item>

          <el-form-item prop="code">
            <div class="flex w-full items-center gap-3">
              <el-input
                v-model="form.code"
                class="min-w-0 flex-1"
                placeholder="请输入右侧字符"
                autocomplete="off"
                :maxlength="6"
                :disabled="loading"
                aria-label="验证码"
                @keyup.enter="handleSubmit"
              />
              <!-- 用真 button 承载刷新，键盘可聚焦、可回车触发 -->
              <button
                type="button"
                class="flex h-10 w-27 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-zinc-50 p-0 transition-colors hover:border-zinc-400 disabled:cursor-progress"
                :disabled="captchaLoading"
                :aria-label="captchaLoading ? '验证码加载中' : '点击刷新验证码'"
                @click="refreshCaptcha"
              >
                <img
                  v-if="captchaUrl"
                  :src="captchaUrl"
                  alt="验证码图片，点击刷新"
                  class="size-full object-contain"
                />
                <span v-else class="text-xs text-zinc-400">
                  {{ captchaLoading ? '加载中' : '点击重试' }}
                </span>
              </button>
            </div>
          </el-form-item>

          <div class="pt-1">
            <el-button
              type="primary"
              size="large"
              class="w-full"
              :loading="loading"
              @click="handleSubmit"
            >
              {{ loading ? '登录中' : '登录' }}
            </el-button>
          </div>
        </el-form>

        <p class="mt-8 text-center text-xs text-zinc-400">
          © {{ year }} {{ APP_TITLE }} · 保留所有权利
        </p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
// UI 组件（el-form / el-form-item / el-input / el-button）由 ElementPlusResolver 按需自动导入；
// 这里只显式引入命令式 API 与类型，避免依赖自动导入的类型推导
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { CircleCheck, Lock, User } from '@lucide/vue'
import loginBg from '@/assets/images/login-bg.png'
import { captchaImage } from '@/api/auth'
import { useUserStore } from '@/stores/modules/user'
import { APP_TITLE } from '@/constants/app'

defineOptions({ name: 'LoginPage' })

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

/**
 * 表单模型字段与后端 LoginDTO 保持一致（userName 的 N 是大写），
 * 这样提交时不必再做一层映射，少一处出错点。
 */
const form = reactive({
  userName: '',
  password: '',
  code: '',
  uuid: ''
})

/** 校验规则：统一 blur 触发，与 el-form-item 默认行为一致 */
const rules: FormRules = {
  userName: [{ required: true, message: '请输入登录账号', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入登录密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 位', trigger: 'blur' }
  ],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
}

const loading = ref(false)
const captchaLoading = ref(false)
const captchaUrl = ref('')
const year = new Date().getFullYear()
/** 表单实例：显式调用 validate()，不依赖原生 submit 冒泡 */
const formRef = ref<FormInstance>()

/** 登录成功后的跳转目标，来自守卫写入的 ?redirect=xxx */
const redirect = computed(() => {
  const target = route.query.redirect
  return typeof target === 'string' && target ? target : '/'
})

/** 除 redirect 外的其余 query，登录后原样带回去（保持原有行为） */
const extraQuery = computed<Record<string, string | string[]>>(() => {
  return Object.keys(route.query).reduce<Record<string, string | string[]>>((acc, key) => {
    if (key === 'redirect') {
      return acc
    }
    const value = route.query[key]
    if (typeof value === 'string') {
      acc[key] = value
    } else if (Array.isArray(value)) {
      // LocationQueryValue 可能含 null，剔除后再回填
      acc[key] = value.filter((item): item is string => item !== null)
    }
    return acc
  }, {})
})

/**
 * 拉取图形验证码。
 * 后端直接返回完整 data URI，前端不需要再拼 base64 前缀。
 */
async function refreshCaptcha(): Promise<void> {
  captchaLoading.value = true
  try {
    const data = await captchaImage()
    captchaUrl.value = data?.image ?? ''
    form.uuid = data?.uuid ?? ''
    form.code = ''
  } catch (error) {
    captchaUrl.value = ''
    ElMessage.error(error instanceof Error ? error.message : '验证码加载失败，请点击重试')
  } finally {
    captchaLoading.value = false
  }
}

/**
 * 提交入口：显式跑一次表单校验，通过后才发请求。
 * 不依赖 <form> 的原生 submit 冒泡，避免按钮一换写法校验就整体失效。
 */
async function handleSubmit(): Promise<void> {
  if (loading.value) {
    return
  }

  const formInstance = formRef.value
  if (!formInstance) {
    // 正常不会发生；真发生了也不能跳过校验直接发请求
    ElMessage.error('表单尚未就绪，请刷新页面重试')
    return
  }

  // validate() 失败会 reject，catch 成 false，避免未捕获的 Promise 报错
  const valid = await formInstance.validate().catch(() => false)
  if (!valid) {
    // 校验失败时 el-form-item 已在字段下方给出提示，这里不再额外弹窗，
    // 也刻意不刷新验证码——验证码还没被消费，刷新只会让用户重新认字。
    return
  }

  loading.value = true
  try {
    await userStore.login({
      userName: form.userName.trim(),
      password: form.password,
      code: form.code.trim(),
      uuid: form.uuid
    })

    ElMessage.success('登录成功')
    await router.replace({ path: redirect.value, query: extraQuery.value })
  } catch (error) {
    // 验证码是一次性的，请求失败后必须换一张，否则用户重试仍会失败
    form.code = ''
    await refreshCaptcha()
    ElMessage.error(error instanceof Error ? error.message : '登录失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void refreshCaptcha()
})

// 离开页面时清掉可能残留的取消态，避免内存泄漏（无定时器，仅保险）
onBeforeUnmount(() => {
  loading.value = false
})
</script>

<style scoped>
/* 样式全部走 Tailwind 工具类，这里只保留唯一的 @keyframes：
   动画名被 animate-[...] 任意值引用，无法用工具类表达关键帧本身 */
@keyframes login-fade-up {
  from {
    opacity: 0;
    transform: translate3d(0, 12px, 0);
  }

  to {
    opacity: 1;
    transform: none;
  }
}
</style>
