<template>
  <a-layout-sider
    :collapsed="collapsed"
    :width="SIDEBAR_WIDTH"
    :collapsed-width="SIDEBAR_COLLAPSED_WIDTH"
    :trigger="null"
    collapsible
    theme="light"
    class="app-sider"
  >
    <!-- Logo：高度与右侧 header 对齐，折叠时只留图标 -->
    <div class="sider-logo" :class="collapsed ? 'sider-logo--collapsed' : ''">
      <span class="sider-logo__badge">
        <AppIcon name="graduation-cap" :size="17" />
      </span>
      <span v-show="!collapsed" class="sider-logo__text">{{ APP_TITLE }}</span>
    </div>

    <!-- 菜单：单独滚动，避免菜单过长时把 logo 顶走 -->
    <div class="sider-menu">
      <a-menu
        :items="menuItems"
        :selected-keys="selectedKeys"
        :open-keys="openKeys"
        mode="inline"
        theme="light"
        :inline-collapsed="collapsed"
        @click="handleMenuClick"
        @open-change="handleOpenChange"
      />
    </div>
  </a-layout-sider>
</template>

<script setup lang="ts">
import type { MenuInfo } from 'antdv-next'
import { dynamicRoute } from '@/router/routes'
import { isExternalUrl } from '@/utils/route'
import { useAppStore } from '@/stores/modules/app'
import { findAncestorKeys, toMenuItems, toMenuTree } from '@/layout/utils/menu'
import { APP_TITLE } from '@/constants/app'

const SIDEBAR_WIDTH = 220
const SIDEBAR_COLLAPSED_WIDTH = 64

const props = defineProps<{
  /** 桌面端由 AppStore 控制；移动端抽屉里恒为 false */
  collapsed?: boolean
}>()

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const menuTree = computed(() => toMenuTree(dynamicRoute))
const menuItems = computed(() => toMenuItems(menuTree.value))

/** 当前高亮项直接用 path 匹配，菜单叶子的 index 就是完整路径 */
const selectedKeys = computed(() => [route.path])

const openKeys = ref<string[]>([])
/** 折叠前的展开状态，展开时还原 */
const cachedOpenKeys = ref<string[]>([])

function syncOpenKeys(): void {
  const keys = findAncestorKeys(menuTree.value, route.path)
  if (!keys.length) {
    return
  }
  openKeys.value = keys
  if (!props.collapsed) {
    cachedOpenKeys.value = keys
  }
}

watch(() => route.path, syncOpenKeys, { immediate: true })

watch(
  () => props.collapsed,
  (value) => {
    if (value) {
      cachedOpenKeys.value = [...openKeys.value]
      openKeys.value = []
      return
    }
    openKeys.value = [...cachedOpenKeys.value]
  }
)

function handleOpenChange(keys: string[]): void {
  // 折叠态由 antd 自己接管，此时不记录，否则展开后会残留一堆 openKeys
  if (props.collapsed) {
    return
  }
  openKeys.value = keys
  cachedOpenKeys.value = keys
}

function handleMenuClick(info: MenuInfo): void {
  const key = String(info.key)

  if (isExternalUrl(key)) {
    window.open(key, '_blank', 'noopener,noreferrer')
    // 移动端点击后应立刻收起抽屉
    appStore.closeMobileSidebar()
    return
  }

  appStore.closeMobileSidebar()

  if (key === route.path) {
    return
  }
  void router.push(key)
}
</script>

<style scoped>
.app-sider {
  border-right: 1px solid var(--color-zinc-200, #e4e4e7);
}

.sider-logo {
  display: flex;
  height: 50px;
  padding: 0 16px;
  gap: 10px;
  align-items: center;
  border-bottom: 1px solid var(--color-zinc-100, #f4f4f5);
}

.sider-logo--collapsed {
  padding: 0;
  justify-content: center;
}

.sider-logo__badge {
  display: flex;
  width: 32px;
  height: 32px;
  color: #fff;
  background-color: #18181b;
  border-radius: 10px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sider-logo__text {
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  color: #18181b;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 固定高度而非 h-full：不依赖 antd Sider 内部容器的类名与高度继承 */
.sider-menu {
  height: calc(100vh - 64px);
  padding: 8px 0;
  overflow-x: hidden;
  overflow-y: auto;
}
</style>
