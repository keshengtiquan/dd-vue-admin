<template>
  <a-layout-header class="app-header">
    <!-- 左：折叠开关 + 面包屑 -->
    <div class="flex min-w-0 items-center gap-1">
      <a-tooltip :title="toggleTip">
        <a-button type="text" class="header-btn" @click="handleToggleSidebar">
          <AppIcon :name="toggleIcon" :size="18" />
        </a-button>
      </a-tooltip>

      <a-breadcrumb
        v-if="breadcrumbItems.length"
        class="hidden min-w-0 sm:block"
        :items="breadcrumbItems"
      />
    </div>

    <!-- 右：刷新 / 全屏 / 用户 -->
    <div class="flex items-center gap-1">
      <a-tooltip title="刷新当前页">
        <a-button type="text" class="header-btn" @click="handleRefresh">
          <AppIcon name="rotate-cw" :size="17" />
        </a-button>
      </a-tooltip>

      <a-tooltip :title="isFullscreen ? '退出全屏' : '进入全屏'">
        <a-button type="text" class="header-btn" @click="handleToggleFullscreen">
          <AppIcon :name="isFullscreen ? 'minimize' : 'maximize'" :size="17" />
        </a-button>
      </a-tooltip>

      <a-dropdown
        :menu="{ items: userMenuItems, onClick: handleUserMenuClick }"
        placement="bottomRight"
      >
        <button type="button" class="user-trigger">
          <a-avatar :size="28" :src="userStore.avatar || undefined">
            {{ initial }}
          </a-avatar>
          <span class="user-trigger__name">{{ displayName }}</span>
          <AppIcon name="chevron-down" :size="14" />
        </button>
      </a-dropdown>
    </div>
  </a-layout-header>
</template>

<script setup lang="ts">
import type { MenuInfo, MenuProps } from 'antdv-next'
import type { BreadcrumbItemType } from 'antdv-next'
import { useAppStore } from '@/stores/modules/app'
import { useTagsViewStore } from '@/stores/modules/tagsView'
import { useUserStore } from '@/stores/modules/user'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const tagsStore = useTagsViewStore()
const userStore = useUserStore()

/** 992px 是 antd 的 lg 断点，与 Sider 的响应式保持一致 */
const isMobile = useMediaQuery('(max-width: 991px)')

const toggleIcon = computed(() => {
  if (isMobile.value) {
    return 'menu'
  }
  return appStore.sidebarCollapsed ? 'panel-left-open' : 'panel-left-close'
})

const toggleTip = computed(() => {
  if (isMobile.value) {
    return '打开菜单'
  }
  return appStore.sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'
})

/**
 * 面包屑来自 route.matched，但 Layout 这一层和叶子页的 title 常常相同（如都为「首页」），
 * 连续重复的直接合并，否则会显示成「首页 / 首页」。
 */
const breadcrumbItems = computed<BreadcrumbItemType[]>(() => {
  const items: BreadcrumbItemType[] = []

  for (const record of route.matched) {
    const title = record.meta?.title
    if (!title || record.meta?.hidden) {
      continue
    }
    if (items[items.length - 1]?.title === title) {
      continue
    }
    items.push({ title })
  }

  return items
})

const displayName = computed(() => userStore.nickName || userStore.name || '管理员')
const initial = computed(() => displayName.value.charAt(0).toUpperCase())

const userMenuItems: MenuProps['items'] = [
  { key: 'profile', label: '个人中心' },
  { type: 'divider' },
  { key: 'logout', label: '退出登录' }
]

const isFullscreen = ref(false)

function syncFullscreenState(): void {
  isFullscreen.value = !!document.fullscreenElement
}

async function handleToggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      await document.documentElement.requestFullscreen()
    }
  } catch {
    // 浏览器拒绝（如 iframe 未授权）时静默失败，不必打断用户
  }
}

function handleToggleSidebar(): void {
  if (isMobile.value) {
    appStore.toggleMobileSidebar()
    return
  }
  appStore.toggleSidebar()
}

/** 刷新当前页：命中标签就走标签的完整刷新流程，否则只重建 router-view */
function handleRefresh(): void {
  const current = tagsStore.visitedViews.find((tag) => tag.path === route.path)
  if (current) {
    void tagsStore.refreshView(current)
    return
  }
  tagsStore.viewKey += 1
}

async function handleUserMenuClick(info: MenuInfo): Promise<void> {
  if (info.key !== 'logout') {
    return
  }

  // 只做本地清理，不调后端 logout 接口——token 可能已过期，再请求只会多一次 401
  userStore.clearSession()
  await router.replace('/login')
}

onMounted(() => {
  document.addEventListener('fullscreenchange', syncFullscreenState)
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', syncFullscreenState)
})
</script>

<style scoped>
.app-header {
  display: flex;
  height: 50px;
  padding: 0 16px;
  background-color: #fff;
  border-bottom: 1px solid var(--color-zinc-200, #e4e4e7);
  align-items: center;
  justify-content: space-between;
  line-height: normal;
}

.header-btn {
  display: inline-flex;
  width: 34px;
  height: 34px;
  padding: 0;
  color: #52525b;
  align-items: center;
  justify-content: center;
}

.header-btn:hover {
  color: #18181b;
}

.user-trigger {
  display: flex;
  height: 40px;
  padding: 0 8px;
  gap: 8px;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 8px;
  align-items: center;
  transition: background-color 0.2s ease;
}

.user-trigger:hover {
  background-color: #f4f4f5;
}

.user-trigger__name {
  max-width: 120px;
  overflow: hidden;
  font-size: 13px;
  color: #3f3f46;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 小屏只留头像，名字确实没地方放 */
@media (max-width: 640px) {
  .user-trigger__name {
    display: none;
  }
}
</style>
