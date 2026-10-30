<template>
  <el-breadcrumb v-if="items.length" separator="/" class="min-w-0 text-sm">
    <el-breadcrumb-item v-for="(item, index) in items" :key="item.path">
      <span
        class="transition-colors"
        :class="
          index === items.length - 1
            ? 'font-medium text-(--el-text-color-primary)'
            : 'text-(--el-text-color-secondary)'
        "
      >
        {{ item.title }}
      </span>
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>

<script setup lang="ts">
defineOptions({ name: 'LayoutBreadcrumb' })

const route = useRoute()

/**
 * 面包屑来自 route.matched：父级带 redirect 的记录也在其中，
 * 但只有配了 title 的才展示（纯容器路由通常不配 title）。
 *
 * 相邻同名项只保留最后一个：单页模块常把父级和唯一子级都叫「首页」，
 * 不去重会渲染成「首页 / 首页」。
 */
const items = computed(() => {
  const matched = route.matched
    .filter((item) => Boolean(item.meta?.title) && !item.meta?.hidden)
    .map((item) => ({ path: item.path, title: item.meta.title as string }))

  return matched.filter((item, index) => item.title !== matched[index + 1]?.title)
})
</script>
