<template>
  <div
    class="flex h-9 shrink-0 items-center gap-1 border-b border-(--el-border-color-light) bg-(--el-bg-color) px-2"
  >
    <!-- 标签列表：横向滚动，滚动条已在 reset.scss 里隐藏 -->
    <div ref="scrollRef" class="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
      <div
        v-for="tag in tagsStore.visitedViews"
        :key="tag.path"
        class="flex h-7 shrink-0 items-center rounded-md border pr-0.5 pl-2.5 text-xs transition-colors"
        :class="
          isActive(tag)
            ? 'border-(--el-color-primary) bg-(--el-color-primary-light-9) text-(--el-color-primary)'
            : 'border-(--el-border-color-light) text-(--el-text-color-regular) hover:border-(--el-color-primary-light-5) hover:text-(--el-color-primary)'
        "
        :data-active="isActive(tag)"
      >
        <button
          type="button"
          class="h-full cursor-pointer pr-1.5"
          :disabled="isActive(tag)"
          @click="handleClick(tag)"
        >
          {{ tag.title }}
        </button>

        <button
          v-if="!tag.affix"
          type="button"
          class="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-sm transition-colors hover:bg-(--el-fill-color-darker)"
          :aria-label="`关闭 ${tag.title}`"
          @click="handleClose(tag)"
        >
          <AppIcon name="x" :size="12" />
        </button>
      </div>
    </div>

    <!-- 批量操作 -->
    <el-dropdown trigger="click" @command="handleCommand">
      <button
        type="button"
        class="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-(--el-text-color-secondary) transition-colors hover:bg-(--el-fill-color-light) hover:text-(--el-text-color-primary)"
        aria-label="标签页操作"
        title="标签页操作"
      >
        <AppIcon name="chevrons-up-down" :size="16" />
      </button>

      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="refresh">
            <span class="flex items-center gap-2">
              <AppIcon name="rotate-cw" :size="14" />
              刷新当前页
            </span>
          </el-dropdown-item>
          <el-dropdown-item command="closeOthers">
            <span class="flex items-center gap-2">
              <AppIcon name="x" :size="14" />
              关闭其他
            </span>
          </el-dropdown-item>
          <el-dropdown-item command="closeAll">
            <span class="flex items-center gap-2">
              <AppIcon name="trash" :size="14" />
              关闭全部
            </span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { usePermissionStore } from '@/stores/modules/permission'
import { useTagsViewStore, type TagView } from '@/stores/modules/tagsView'

defineOptions({ name: 'LayoutTagsView' })

const route = useRoute()
const router = useRouter()
const tagsStore = useTagsViewStore()
const permissionStore = usePermissionStore()
const scrollRef = ref<HTMLElement>()

/** 兜底首页：没有固定标签时关闭全部后用它落地 */
const fallbackPath = computed(() => tagsStore.visitedViews.find((view) => view.affix)?.path ?? '/')

function isActive(tag: TagView): boolean {
  return tag.path === route.path
}

/** 当前标签滚动到可视区，标签多了以后也能看到高亮项 */
function scrollActiveIntoView(): void {
  const target = scrollRef.value?.querySelector<HTMLElement>('[data-active="true"]')
  target?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

function handleClick(tag: TagView): void {
  if (!isActive(tag)) {
    void router.push(tag.path)
  }
}

function handleClose(tag: TagView): void {
  const active = isActive(tag)
  const next = tagsStore.delView(tag.path)

  if (active) {
    void router.push(next?.path ?? fallbackPath.value)
  }
}

async function handleCommand(command: string): Promise<void> {
  if (command === 'refresh') {
    tagsStore.refreshView()
    return
  }

  if (command === 'closeOthers') {
    tagsStore.delOthers(route.path)
    return
  }

  if (command === 'closeAll') {
    tagsStore.delAll()
    if (route.path !== fallbackPath.value) {
      await router.push(fallbackPath.value)
    }
  }
}

// 路由变化即入栈；fixed 标签在 onMounted 里补齐
watch(
  () => route.path,
  () => {
    tagsStore.addView(route)
    void nextTick(scrollActiveIntoView)
  },
  { immediate: true }
)

onMounted(() => {
  // 固定标签来自菜单树（backend 模式下是接口下发的 affix 菜单）
  tagsStore.initAffixViews(permissionStore.menuRoutes)
  void nextTick(scrollActiveIntoView)
})
</script>
