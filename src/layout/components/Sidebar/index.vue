<template>
  <el-scrollbar class="min-h-0 flex-1">
    <el-menu
      :default-active="activeMenu"
      :collapse="collapsed"
      :collapse-transition="false"
      class="layout-menu border-r-0!"
      popper-class="layout-menu-popper"
      @select="handleSelect"
    >
      <SidebarItem v-for="item in menus" :key="item.path" :item="item" :base-path="item.path" />
    </el-menu>
  </el-scrollbar>
</template>

<script setup lang="ts">
import type { MenuNodeLike } from '@/utils/route'
import { isExternalUrl } from '@/utils/route'
import { useAppStore } from '@/stores/modules/app'
import { usePermissionStore } from '@/stores/modules/permission'
import SidebarItem from './SidebarItem.vue'

defineOptions({ name: 'LayoutSidebar' })

defineProps<{ collapsed?: boolean }>()

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const permissionStore = usePermissionStore()

/**
 * 菜单来源：permission store 里的菜单树。
 *
 * - frontend 模式：本地 src/router/routes/modules 下的路由模块；
 * - backend 模式：/system/menu/routes 下发的菜单（守卫里注册完路由后写入 store）。
 * 不直接读 router.options.routes —— addRoute 加的路由不会出现在那里。
 */
const menus = computed<MenuNodeLike[]>(() => {
  return permissionStore.menuRoutes.filter((item) => {
    // 没有 title 的是纯容器/重定向（如 '/'），不渲染
    if (!item.meta?.title || item.meta.hidden) {
      return false
    }
    return Boolean(item.children?.length) || Boolean(item.path)
  }) as unknown as MenuNodeLike[]
})

/** 当前高亮项：详情页可用 meta.activeMenu 指定高亮列表页 */
const activeMenu = computed(() => route.meta.activeMenu ?? route.path)

function handleSelect(index: string): void {
  appStore.closeMobileSidebar()

  // 外链菜单：新窗口打开，不参与路由跳转
  if (isExternalUrl(index)) {
    window.open(index, '_blank', 'noopener,noreferrer')
    return
  }

  if (index !== route.path) {
    void router.push(index)
  }
}
</script>

<style scoped>
/* el-menu 收起时元素自带 64px 宽度，和 aside 的 w-16 对齐，这里只抹掉默认边框与背景，
   颜色全部交给 element-plus 的 --el-menu-* 变量（深浅色自动适配） */
.layout-menu {
  border-right: 0;
  background-color: transparent;
}

.layout-menu :deep(.el-menu-item),
.layout-menu :deep(.el-sub-menu__title) {
  height: 44px;
  margin: 2px 8px;
  border-radius: var(--el-border-radius-base);
  line-height: 44px;
}

/**
 * 子菜单展开 / 收起时"抖一下"的根因在这里。
 *
 * element-plus 的展开动画（ElCollapseTransition）把 ul 的 max-height 设成
 * `ul.scrollHeight`，而 scrollHeight 不含子元素的垂直 margin；同时 li 的 margin
 * 会随 overflow 变化在 ul 内外来回穿透：
 * - 动画期间 ul 是 overflow: hidden（BFC），margin 被包进 ul，内容比 scrollHeight 高；
 * - 动画结束 overflow 还原，margin 又推出去，高度落回 scrollHeight。
 * 两个状态高度不一致，收尾那一帧就跳。
 *
 * 这里让 ul 恒定成 BFC：只加一行 overflow: hidden，高度基准在任何状态下都是同一个值。
 * 注意别改成 flex / 改 padding，那会连展开动画的观感一起变掉（原生是靠 max-height
 * 裁切、内容固定逐层露出）。
 */
.layout-menu :deep(.el-menu--inline) {
  overflow: hidden;
}

.layout-menu :deep(.el-menu-item.is-active) {
  background-color: var(--el-color-primary-light-9);
  font-weight: 500;
}

/* 图标容器：固定宽高，避免有无图标时文字错位 */
.layout-menu :deep(.menu-icon) {
  display: inline-flex;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
}

/* 收起态：去掉左右边距与左侧层级缩进，让图标在 64px 里居中 */
.layout-menu.el-menu--collapse :deep(.el-menu-item),
.layout-menu.el-menu--collapse :deep(.el-sub-menu__title) {
  margin: 2px 4px;
  padding-right: 0;
  padding-left: 0;
  justify-content: center;
}

.layout-menu.el-menu--collapse :deep(.menu-icon) {
  margin-right: 0;
}
</style>

<style>
/**
 * 收起态下 hover 弹出的子菜单。
 *
 * 弹层由 element-plus 传送到 body 上，scoped 的 :deep 打不到，所以这里用
 * popper-class（模板上的 layout-menu-popper）单独定位，尺寸与展开态保持一致：
 * 44px 行高、2px 间距、圆角、选中浅蓝底 + 中等字重。
 */
.layout-menu-popper .el-menu--popup {
  /* 默认 200px 对四字菜单太宽 */
  min-width: 168px;
  padding: 6px;
  border-radius: var(--el-border-radius-base);
}

.layout-menu-popper .el-menu-item,
.layout-menu-popper .el-sub-menu__title {
  height: 44px;
  margin: 2px 0;
  border-radius: var(--el-border-radius-base);
  line-height: 44px;
}

.layout-menu-popper .el-menu-item.is-active {
  background-color: var(--el-color-primary-light-9);
  font-weight: 500;
}

/* 与展开态一致：图标固定 18px 盒，有无图标都不影响文字对齐 */
.layout-menu-popper .menu-icon {
  display: inline-flex;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
}
</style>
