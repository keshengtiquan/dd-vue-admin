/**
 * 布局状态
 *
 * 只放「纯 UI」状态：侧边栏折叠、移动端抽屉开合。
 * 业务数据不进这里，避免 layout 与业务模块互相牵连。
 */
export const useAppStore = defineStore(
  'app',
  () => {
    /** 桌面端侧边栏是否收起（持久化，刷新后保持用户习惯） */
    const sidebarCollapsed = ref(false)
    /** 移动端侧边栏抽屉是否打开（不持久化） */
    const mobileSidebarOpen = ref(false)

    function toggleSidebar(): void {
      sidebarCollapsed.value = !sidebarCollapsed.value
    }

    function setSidebarCollapsed(value: boolean): void {
      sidebarCollapsed.value = value
    }

    function toggleMobileSidebar(): void {
      mobileSidebarOpen.value = !mobileSidebarOpen.value
    }

    function setMobileSidebarOpen(value: boolean): void {
      mobileSidebarOpen.value = value
    }

    function closeMobileSidebar(): void {
      mobileSidebarOpen.value = false
    }

    return {
      sidebarCollapsed,
      mobileSidebarOpen,
      toggleSidebar,
      setSidebarCollapsed,
      toggleMobileSidebar,
      setMobileSidebarOpen,
      closeMobileSidebar
    }
  },
  {
    persist: {
      key: 'app',
      storage: localStorage,
      // 只持久化折叠状态，抽屉开合属于临时状态
      pick: ['sidebarCollapsed']
    }
  }
)
