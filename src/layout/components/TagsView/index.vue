<template>
  <div class="tags-view">
    <div ref="scrollRef" class="tags-scroll" role="tablist" aria-label="已打开的页面">
      <a-dropdown
        v-for="tag in visitedViews"
        :key="tag.path"
        :trigger="['contextmenu']"
        :menu="{ items: contextMenuItems(tag), onClick: (info: MenuInfo) => handleContextMenu(info, tag) }"
      >
        <div
          class="tag"
          :class="{ 'tag--active': isActive(tag) }"
          :data-active="isActive(tag)"
          role="tab"
          tabindex="0"
          :aria-selected="isActive(tag)"
          @click="activate(tag)"
          @keydown.enter.prevent="activate(tag)"
        >
          <span class="tag__title">{{ tag.title }}</span>
          <button
            v-if="!tag.affix"
            type="button"
            class="tag__close"
            aria-label="关闭标签"
            @click.stop="closeTag(tag)"
          >
            <AppIcon name="x" :size="12" />
          </button>
        </div>
      </a-dropdown>
    </div>

    <div class="tags-actions">
      <a-dropdown :menu="{ items: actionItems, onClick: handleActionClick }" placement="bottomRight">
        <button type="button" class="action-btn" aria-label="标签操作">
          <AppIcon name="more-horizontal" :size="16" />
        </button>
      </a-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MenuInfo, MenuProps } from 'antdv-next'
import type { TagView } from '@/stores/modules/tagsView'
import { useTagsViewStore } from '@/stores/modules/tagsView'
import { HOME_ROUTE_PATH } from '@/constants/app'

const route = useRoute()
const router = useRouter()
const tagsStore = useTagsViewStore()

const scrollRef = ref<HTMLElement>()

const visitedViews = computed(() => tagsStore.visitedViews)
const currentTag = computed(() => visitedViews.value.find((tag) => tag.path === route.path))

const isActive = (tag: TagView): boolean => tag.path === route.path

/**
 * 把当前路由写进标签列表。
 * 没有 title 或标了 hidden 的路由（如 404 之外的内部页）不进标签栏。
 */
function syncCurrentTag(): void {
  const title = route.meta.title
  if (!title || route.meta.hidden) {
    return
  }

  tagsStore.addView({
    path: route.path,
    fullPath: route.fullPath,
    title,
    name: typeof route.name === 'string' ? route.name : undefined,
    affix: route.meta.affix,
    cacheName: route.meta.cacheName
  })
}

/**
 * 固定标签需要在首屏就存在，否则直接访问二级页时「首页」标签会缺席。
 * 必须早于 syncCurrentTag 执行，保证固定标签排在列表最前面。
 */
function initAffixTags(): void {
  for (const record of router.getRoutes()) {
    if (!record.meta.affix || !record.meta.title) {
      continue
    }
    tagsStore.addView({
      path: record.path,
      fullPath: record.path,
      title: record.meta.title,
      name: typeof record.name === 'string' ? record.name : undefined,
      affix: true,
      cacheName: record.meta.cacheName
    })
  }
}

initAffixTags()
watch(() => route.fullPath, syncCurrentTag, { immediate: true })

/** 切换标签后把活动标签滚进可视区，标签多到溢出时能自动跟随 */
watch(
  () => route.path,
  async () => {
    await nextTick()
    scrollRef.value
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }
)

async function activate(tag: TagView): Promise<void> {
  if (isActive(tag)) {
    return
  }
  await router.push(tag.fullPath)
}

async function closeTag(tag: TagView): Promise<void> {
  if (tag.affix) {
    return
  }

  const wasActive = isActive(tag)
  const next = tagsStore.delView(tag)

  if (!wasActive) {
    return
  }
  // 关掉的是当前页：右邻 → 左邻 → 首页
  await router.push(next?.fullPath || HOME_ROUTE_PATH)
}

async function closeOthers(tag: TagView): Promise<void> {
  tagsStore.delOthers(tag)
  if (!isActive(tag)) {
    await router.push(tag.fullPath)
  }
}

async function closeAll(): Promise<void> {
  const last = tagsStore.delAll()
  const stillAlive = tagsStore.visitedViews.some((tag) => tag.path === route.path)
  if (!stillAlive) {
    await router.push(last?.fullPath || HOME_ROUTE_PATH)
  }
}

async function refreshTag(tag: TagView): Promise<void> {
  if (!isActive(tag)) {
    await router.push(tag.fullPath)
  }
  await tagsStore.refreshView(tag)
}

function contextMenuItems(tag: TagView): MenuProps['items'] {
  return [
    { key: 'refresh', label: '刷新', disabled: !isActive(tag) },
    { key: 'close', label: '关闭', disabled: !!tag.affix },
    { type: 'divider' },
    { key: 'closeOthers', label: '关闭其他' },
    { key: 'closeAll', label: '关闭全部' }
  ]
}

function runAction(key: string, tag: TagView): void {
  switch (key) {
    case 'refresh':
      void refreshTag(tag)
      break
    case 'close':
      void closeTag(tag)
      break
    case 'closeOthers':
      void closeOthers(tag)
      break
    case 'closeAll':
      void closeAll()
      break
  }
}

function handleContextMenu(info: MenuInfo, tag: TagView): void {
  runAction(String(info.key), tag)
}

/** 右上角「更多」：没有右键习惯的用户也能用，目标始终是当前标签 */
const actionItems: MenuProps['items'] = [
  { key: 'refresh', label: '刷新当前' },
  { key: 'closeOthers', label: '关闭其他' },
  { key: 'closeAll', label: '关闭全部' }
]

function handleActionClick(info: MenuInfo): void {
  const tag = currentTag.value
  if (!tag) {
    return
  }
  runAction(String(info.key), tag)
}
</script>

<style scoped>
.tags-view {
  display: flex;
  height: 40px;
  background-color: #fff;
  border-bottom: 1px solid var(--color-zinc-200, #e4e4e7);
  align-items: center;
}

.tags-scroll {
  display: flex;
  flex: 1;
  padding: 0 8px;
  gap: 6px;
  overflow-x: auto;
  overflow-y: hidden;
  align-items: center;
  scrollbar-width: none;
}

.tags-scroll::-webkit-scrollbar {
  height: 0;
}

.tag {
  display: inline-flex;
  height: 26px;
  padding: 0 10px;
  gap: 6px;
  font-size: 12px;
  color: #52525b;
  white-space: nowrap;
  cursor: pointer;
  background-color: #fff;
  border: 1px solid var(--color-zinc-200, #e4e4e7);
  border-radius: 6px;
  align-items: center;
  transition:
    color 0.15s ease,
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.tag:hover {
  color: #18181b;
  border-color: var(--color-zinc-300, #d4d4d8);
}

.tag:focus-visible {
  outline: 2px solid #91caff;
  outline-offset: 1px;
}

.tag--active {
  color: #1677ff;
  background-color: #f0f7ff;
  border-color: #91caff;
}

.tag__close {
  display: inline-flex;
  padding: 0;
  color: inherit;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 3px;
  align-items: center;
  opacity: 0.55;
  transition: opacity 0.15s ease;
}

.tag__close:hover {
  opacity: 1;
}

.tag__close:focus-visible {
  outline: 2px solid #91caff;
}

.tags-actions {
  display: flex;
  padding-right: 8px;
  border-left: 1px solid var(--color-zinc-100, #f4f4f5);
  align-items: center;
}

.action-btn {
  display: inline-flex;
  width: 28px;
  height: 28px;
  padding: 0;
  color: #71717a;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  color: #18181b;
  background-color: #f4f4f5;
}
</style>
