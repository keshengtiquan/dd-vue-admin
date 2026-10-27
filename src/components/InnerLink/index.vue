<template>
  <div class="inner-link">
    <iframe :src="src" class="inner-link__frame" frameborder="0" />
  </div>
</template>

<script setup lang="ts">
// 内链页面：后端把「外链菜单」的组件标记为 InnerLink，这里用 iframe 嵌入目标地址
defineOptions({ name: 'InnerLink' })

const route = useRoute()

/** 目标地址优先取路由 meta.link，未配置时回退到当前路由 path */
const src = computed(() => route.meta.link || route.path)
</script>

<style scoped>
.inner-link {
  height: 100%;
}

.inner-link__frame {
  width: 100%;
  height: 100%;
  border: 0;
}
</style>
