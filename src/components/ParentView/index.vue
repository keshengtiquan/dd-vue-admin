<template>
  <router-view />
</template>

<script setup lang="ts">
// 用于承载「只有一个子路由时被拍平的中间层」路由，自身不渲染任何 UI，仅提供子路由出口
defineOptions({ name: 'ParentView' })
</script>
