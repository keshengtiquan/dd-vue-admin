<template>
  <!-- 叶子节点：直接可点 -->
  <el-menu-item v-if="leaf" :index="leaf.index">
    <!--
      图标用 <i> 而不是 <span> 包裹：element-plus 在收起态会用
      `.el-menu--collapse > .el-menu-item > span { width:0;height:0;visibility:hidden }`
      把直接子级 span 全部藏掉（本意是藏菜单文字），用 span 包图标会连图标一起消失。
    -->
    <i v-if="leaf.icon" class="menu-icon mr-2">
      <AppIcon :name="leaf.icon" :size="18" />
    </i>
    <template #title>{{ leaf.title }}</template>
  </el-menu-item>

  <!-- 分组节点：递归渲染子菜单 -->
  <el-sub-menu v-else :index="basePath">
    <template #title>
      <i v-if="item.meta?.icon" class="menu-icon mr-2">
        <AppIcon :name="item.meta.icon" :size="18" />
      </i>
      <span class="truncate">{{ item.meta?.title }}</span>
    </template>

    <SidebarItem
      v-for="child in children"
      :key="child.path"
      :item="child"
      :base-path="resolveMenuPath(basePath, child.path)"
    />
  </el-sub-menu>
</template>

<script setup lang="ts">
import type { MenuNodeLike } from '@/utils/route'
import { resolveMenuLeaf, resolveMenuPath, visibleChildren } from '@/utils/route'

defineOptions({ name: 'SidebarItem' })

const props = defineProps<{
  item: MenuNodeLike
  /** 当前菜单项的完整路径（父级路径已拼好） */
  basePath: string
}>()

const children = computed(() => visibleChildren(props.item))

/**
 * 是否「降级成单个菜单项」渲染：
 * 只有一个可见子菜单时省掉一层无意义的折叠层级（与 RuoYi 的 hasOneShowingChild 一致）。
 */
const leaf = computed(() => resolveMenuLeaf(props.item, props.basePath))
</script>
