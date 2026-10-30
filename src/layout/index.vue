<template>
  <div
    class="flex h-full w-full overflow-hidden bg-(--el-bg-color-page) text-(--el-text-color-primary)"
  >
    <!-- ------------------------- 桌面端：固定侧边栏 ------------------------- -->
    <aside
      class="hidden shrink-0 flex-col border-r border-(--el-border-color-light) bg-(--el-bg-color) transition-[width] duration-200 ease-out lg:flex"
      :class="collapsed ? 'w-16' : 'w-60'"
    >
      <SidebarLogo :collapsed="collapsed" />
      <Sidebar :collapsed="collapsed" />
    </aside>

    <!-- ------------------------- 移动端：抽屉式侧边栏 ------------------------- -->
    <el-drawer
      v-model="mobileOpen"
      class="layout-mobile-drawer"
      direction="ltr"
      size="264px"
      :with-header="false"
    >
      <div class="flex h-full flex-col bg-(--el-bg-color)">
        <SidebarLogo />
        <Sidebar />
      </div>
    </el-drawer>

    <!-- ------------------------- 右侧：Header / TagsView / 主内容 ------------------------- -->
    <div class="flex min-w-0 flex-1 flex-col">
      <Header />
      <TagsView />

      <main class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4">
        <AppMain />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/modules/app'
import AppMain from './components/AppMain.vue'
import Header from './components/Header/index.vue'
import Sidebar from './components/Sidebar/index.vue'
import SidebarLogo from './components/Sidebar/SidebarLogo.vue'
import TagsView from './components/TagsView/index.vue'

defineOptions({ name: 'LayoutMain' })

const route = useRoute()
const appStore = useAppStore()
const isMobile = useMediaQuery('(max-width: 1023px)')

/** 桌面端折叠状态；移动端侧边栏走抽屉，不受折叠影响 */
const collapsed = computed(() => !isMobile.value && appStore.sidebarCollapsed)

const mobileOpen = computed({
  get: () => appStore.mobileSidebarOpen,
  set: (value: boolean) => appStore.setMobileSidebarOpen(value)
})

// 移动端点击菜单跳转后收起抽屉
watch(
  () => route.path,
  () => appStore.closeMobileSidebar()
)
</script>

<style>
/* el-drawer 挂在 body 上，scoped 选择器打不到，这里用类名前缀限定作用范围 */
.layout-mobile-drawer .el-drawer__body {
  padding: 0 !important;
}
</style>
