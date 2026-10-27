<template>
  <a-layout has-sider class="layout-root">
    <!-- 桌面端：固定侧边栏 -->
    <AppSidebar v-if="!isMobile" :collapsed="appStore.sidebarCollapsed" />

    <!-- 移动端：同一个侧边栏塞进抽屉，避免两套菜单实现 -->
    <a-drawer
      v-else
      :open="appStore.mobileSidebarOpen"
      placement="left"
      :size="220"
      :closable="false"
      :styles="{ body: { padding: 0 } }"
      @close="appStore.closeMobileSidebar"
    >
      <AppSidebar :collapsed="false" />
    </a-drawer>

    <a-layout class="layout-body">
      <AppHeader />
      <TagsView />
      <AppMain />
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import AppSidebar from './components/AppSidebar/index.vue'
import AppHeader from './components/AppHeader/index.vue'
import TagsView from './components/TagsView/index.vue'
import AppMain from './components/AppMain/index.vue'
import { useAppStore } from '@/stores/modules/app'

defineOptions({ name: 'AppLayout' })

const appStore = useAppStore()

/** 992px 与 antd lg 断点一致 */
const isMobile = useMediaQuery('(max-width: 991px)')

// 从移动端切回桌面端时抽屉可能还开着，顺手关掉
watch(isMobile, (mobile) => {
  if (!mobile) {
    appStore.closeMobileSidebar()
  }
})
</script>

<style scoped>
.layout-root {
  height: 100vh;
  overflow: hidden;
}

/* 必须给 0：否则内部超宽内容（表格、长文本）会把整列撑出视口 */
.layout-body {
  min-width: 0;
}
</style>
