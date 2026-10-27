<template>
  <div class="flex h-full flex-col gap-4">
    <div class="rounded-xl border border-zinc-200 bg-white p-6">
      <h1 class="text-lg font-semibold text-zinc-900">首页</h1>
      <p class="mt-2 text-sm text-zinc-500">
        这是布局的占位内容，用于验证侧边栏、Header、标签页与主内容区的组合效果。
      </p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="index in 6" :key="index" class="rounded-xl border border-zinc-200 bg-white p-5">
        <div class="h-3 w-24 rounded bg-zinc-100" />
        <div class="mt-3 h-7 w-16 rounded bg-zinc-100" />
        <div class="mt-3 h-2 w-full rounded bg-zinc-50" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 与 route.meta.cacheName 保持一致，否则 <keep-alive :include> 匹配不到、页面不会被缓存
defineOptions({ name: 'DashboardHome' })
</script>
