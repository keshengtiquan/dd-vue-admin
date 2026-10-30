<template>
  <div class="flex min-h-[60vh] flex-col items-center justify-center px-6 py-12 text-center">
    <p class="text-[64px] leading-none font-bold tracking-widest text-(--el-color-primary)">404</p>
    <p class="mt-5 text-base font-medium text-(--el-text-color-primary)">{{ title }}</p>
    <p class="mt-2 max-w-md text-sm leading-relaxed text-(--el-text-color-secondary)">{{ desc }}</p>
    <div class="mt-7 flex flex-wrap items-center justify-center gap-3">
      <el-button type="primary" @click="goHome">返回首页</el-button>
      <el-button @click="goBack">返回上一页</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

defineOptions({ name: 'ErrorNotFound' })

const route = useRoute()
const router = useRouter()

/**
 * 两种来源共用这一个视图：
 * - 兜底路由（/:pathMatch(.*)*）：真的访问了不存在的地址；
 * - 后端菜单已配置但视图组件还没写：路由会带 meta.pageMissing。
 */
const pageMissing = computed(() => Boolean(route.meta.pageMissing))

const title = computed(() => (pageMissing.value ? '该页面还没有开发' : '页面不存在'))

const desc = computed(() => {
  if (!pageMissing.value) {
    return '你访问的地址可能已失效，或者没有访问权限。'
  }
  const name = route.meta.title
  return name
    ? `菜单「${name}」已在后台配置，但对应的视图组件还没有创建。`
    : '该菜单对应的视图组件还没有创建。'
})

function goHome(): void {
  void router.push('/')
}

function goBack(): void {
  router.back()
}
</script>
