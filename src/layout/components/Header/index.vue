<template>
  <header
    class="flex h-14 shrink-0 items-center gap-2 border-b border-(--el-border-color-light) bg-(--el-bg-color) px-2.5 sm:px-4"
  >
    <!-- 折叠 / 移动端抽屉 -->
    <button
      type="button"
      class="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-(--el-text-color-regular) transition-colors hover:bg-(--el-fill-color-light) hover:text-(--el-text-color-primary)"
      :aria-label="toggleLabel"
      :title="toggleLabel"
      @click="handleToggleSidebar"
    >
      <AppIcon :name="toggleIcon" :size="18" />
    </button>

    <!-- 刷新当前页：与标签页「刷新当前页」同一套逻辑 -->
    <button
      type="button"
      class="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-(--el-text-color-regular) transition-colors hover:bg-(--el-fill-color-light) hover:text-(--el-text-color-primary)"
      aria-label="刷新当前页"
      title="刷新当前页"
      @click="handleRefresh"
    >
      <!-- AppIcon 会剔除 class（lucide 内部 delete props.class），动画挂在包裹层上 -->
      <span class="flex items-center justify-center" :class="rotating ? 'animate-spin' : ''">
        <AppIcon name="rotate-cw" :size="18" />
      </span>
    </button>

    <Breadcrumb class="hidden md:block" />

    <div class="ml-auto flex items-center gap-1">
      <!-- 全屏 -->
      <button
        type="button"
        class="hidden size-9 cursor-pointer items-center justify-center rounded-lg text-(--el-text-color-regular) transition-colors hover:bg-(--el-fill-color-light) hover:text-(--el-text-color-primary) sm:flex"
        :aria-label="isFullscreen ? '退出全屏' : '全屏显示'"
        :title="isFullscreen ? '退出全屏' : '全屏显示'"
        @click="toggleFullscreen()"
      >
        <AppIcon :name="isFullscreen ? 'minimize-2' : 'maximize'" :size="18" />
      </button>

      <!-- 用户 -->
      <el-dropdown trigger="click" @command="handleCommand">
        <div
          class="flex cursor-pointer items-center gap-2 rounded-lg py-1 pr-1.5 pl-1 transition-colors hover:bg-(--el-fill-color-light)"
        >
          <el-avatar :size="28" :src="userStore.avatar || undefined">
            {{ initial }}
          </el-avatar>
          <span class="hidden max-w-28 truncate text-sm sm:inline">{{ displayName }}</span>
          <AppIcon name="chevron-down" :size="14" />
        </div>

        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="logout">
              <span class="flex items-center gap-2">
                <AppIcon name="log-out" :size="14" />
                退出登录
              </span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ElMessageBox } from 'element-plus'
import { clearDynamicRoutes } from '@/router/dynamic'
import { useAppStore } from '@/stores/modules/app'
import { usePermissionStore } from '@/stores/modules/permission'
import { useTagsViewStore } from '@/stores/modules/tagsView'
import { useUserStore } from '@/stores/modules/user'
import Breadcrumb from './Breadcrumb.vue'

defineOptions({ name: 'LayoutHeader' })

const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()
const permissionStore = usePermissionStore()
const tagsStore = useTagsViewStore()

const isMobile = useMediaQuery('(max-width: 1023px)')
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()

const displayName = computed(() => userStore.nickName || userStore.name || '未登录')
const initial = computed(() => displayName.value.slice(0, 1).toUpperCase())

const toggleLabel = computed(() => {
  if (isMobile.value) {
    return appStore.mobileSidebarOpen ? '关闭菜单' : '打开菜单'
  }
  return appStore.sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'
})

const toggleIcon = computed(() => {
  if (isMobile.value) {
    return 'menu'
  }
  return appStore.sidebarCollapsed ? 'panel-left-open' : 'panel-left-close'
})

function handleToggleSidebar(): void {
  if (isMobile.value) {
    appStore.toggleMobileSidebar()
    return
  }
  appStore.toggleSidebar()
}

/**
 * 刷新按钮的转圈反馈。
 *
 * 跟着 store 的 contentVisible 走：隐藏时转、重新挂载后再停，
 * 不用把 refreshView 的延时在这里再抄一份（抄了早晚会不一致）。
 */
const rotating = ref(false)

watch(
  () => tagsStore.contentVisible,
  (visible) => {
    if (visible) {
      rotating.value = false
    }
  }
)

function handleRefresh(): void {
  rotating.value = true
  tagsStore.refreshView()
}

async function handleCommand(command: string): Promise<void> {
  if (command !== 'logout') {
    return
  }

  const confirmed = await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    type: 'warning',
    confirmButtonText: '退出',
    cancelButtonText: '取消'
  }).catch(() => false)

  if (!confirmed) {
    return
  }

  // 纯本地清态：手上可能就是过期 token，不再调登出接口
  userStore.clearSession()
  // 清掉上一个账号的动态路由，换账号登录后会按新菜单重新生成
  permissionStore.reset()
  clearDynamicRoutes()
  await router.replace('/login')
}
</script>
