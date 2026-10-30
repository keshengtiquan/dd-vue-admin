<template>
  <div class="flex shrink-0 items-center justify-between bg-(--el-bg-color) my-2">
    <!-- 左侧按钮区 -->
    <div class="flex min-w-0 flex-1 flex-wrap items-center">
      <slot name="left" />
    </div>

    <!-- 右侧工具 -->
    <div class="flex shrink-0 items-center gap-1">
      <ElTooltip
        v-for="tool in plainTools"
        :key="tool.name"
        :content="tool.title"
        placement="top"
        :show-after="200"
      >
        <button
          type="button"
          class="flex size-7 cursor-pointer items-center justify-center rounded-lg border border-(--el-border-color) text-(--el-text-color-primary) transition-colors hover:bg-(--el-fill-color-light) hover:text-(--el-color-primary)"
          :data-tool="tool.name"
          :aria-label="tool.title"
          @click="handlePlainTool(tool.name)"
        >
          <component :is="tool.icon" :size="16" />
        </button>
      </ElTooltip>

      <!-- 密度：宽松 / 默认 / 紧凑 -->
      <ElDropdown
        v-if="tools.density"
        trigger="click"
        placement="bottom-end"
        @command="handleDensity"
      >
        <span class="inline-flex">
          <ElTooltip content="密度" placement="top" :show-after="200">
            <button
              type="button"
              class="flex size-7 cursor-pointer items-center justify-center rounded-lg border border-(--el-border-color) text-(--el-text-color-primary) transition-colors hover:bg-(--el-fill-color-light) hover:text-(--el-color-primary)"
              data-tool="density"
              aria-label="密度"
            >
              <Rows3 :size="16" />
            </button>
          </ElTooltip>
        </span>

        <template #dropdown>
          <ElDropdownMenu>
            <ElDropdownItem v-for="item in DENSITY_ITEMS" :key="item.value" :command="item.value">
              <span class="flex items-center gap-1">
                <Check :size="14" :class="density === item.value ? 'opacity-100' : 'opacity-0'" />
                {{ item.label }}
              </span>
            </ElDropdownItem>
          </ElDropdownMenu>
        </template>
      </ElDropdown>

      <!-- 列设置：勾选列显隐（多级表头按层级缩进） -->
      <ElPopover
        v-if="tools.columnSetting"
        trigger="click"
        placement="bottom-end"
        :width="240"
        :teleported="true"
      >
        <template #reference>
          <!-- 同理：气泡的触发槽只认「一个普通元素」，tooltip 放在这个 span 里 -->
          <span class="inline-flex">
            <ElTooltip content="列设置" placement="top" :show-after="200">
              <button
                type="button"
                class="flex size-7 cursor-pointer items-center justify-center rounded-lg border border-(--el-border-color) text-(--el-text-color-primary) transition-colors hover:bg-(--el-fill-color-light) hover:text-(--el-color-primary)"
                data-tool="column-setting"
                aria-label="列设置"
              >
                <Settings :size="16" />
              </button>
            </ElTooltip>
          </span>
        </template>

        <!--
          宽度不要自己写死：ElPopover 的 width（240）是含内边距的 border-box，
          内容区只有 240 - 2 * var(--el-popover-padding, 12px) = 216px，
          这里再写个固定宽度就会超出去、右侧的「重置」被裁掉。让它自适应即可。
        -->
        <div>
          <div class="max-h-64 overflow-auto pr-1">
            <!--
              每一行都可以拖拽排序（HTML5 原生拖放，不引第三方库）：
              拖动 key 记在 draggingKey，dragover 时按指针在行的上半 / 下半算「放到前面 / 后面」，
              只有同一层（parentKey 相同）的行才会出现落点提示。
            -->
            <div
              v-for="item in columnItems"
              :key="item.key"
              class="flex cursor-grab items-center rounded py-0.5 transition-colors hover:bg-(--el-fill-color-light)"
              :class="draggingKey === item.key ? 'opacity-40' : ''"
              :style="{ paddingLeft: `${item.level * 14 + 2}px`, ...dropIndicatorStyle(item) }"
              :title="`拖动调整顺序：${item.label}`"
              draggable="true"
              @dragstart="handleDragStart(item, $event)"
              @dragover="handleDragOver(item, $event)"
              @drop="handleDrop(item, $event)"
              @dragend="handleDragEnd"
            >
              <GripVertical :size="14" class="mr-1 shrink-0 text-(--el-text-color-placeholder)" />
              <ElCheckbox
                :model-value="item.visible"
                @change="(checked: unknown) => emit('column-toggle', item.key, Boolean(checked))"
              >
                {{ item.label }}
              </ElCheckbox>
            </div>
          </div>
          <div
            class="mt-2 flex items-center justify-between gap-2 border-t border-(--el-border-color-lighter) pt-2"
          >
            <span class="truncate text-xs text-(--el-text-color-secondary)"
              >勾选显示，拖动排序</span
            >
            <ElButton
              class="shrink-0"
              link
              type="primary"
              size="small"
              @click="emit('column-reset')"
            >
              重置
            </ElButton>
          </div>
        </div>
      </ElPopover>

      <!-- 全屏 -->
      <ElTooltip
        v-if="tools.fullscreen"
        :content="isFullscreen ? '退出全屏' : '全屏'"
        placement="top"
        :show-after="200"
      >
        <button
          type="button"
          class="flex size-7 cursor-pointer items-center justify-center rounded-lg border border-(--el-border-color) text-(--el-text-color-primary) transition-colors hover:bg-(--el-fill-color-light) hover:text-(--el-color-primary)"
          data-tool="fullscreen"
          :aria-label="isFullscreen ? '退出全屏' : '全屏'"
          @click="emit('fullscreen-toggle')"
        >
          <Minimize v-if="isFullscreen" :size="16" />
          <Maximize v-else :size="16" />
        </button>
      </ElTooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Check,
  Download,
  GripVertical,
  Maximize,
  Minimize,
  Printer,
  RotateCw,
  Rows3,
  Settings
} from '@lucide/vue'
import type {
  ColumnDropPosition,
  TableColumnSettingItem,
  TableDensity,
  TableHeaderOptions
} from './types'

defineOptions({ name: 'TableHeader' })

const props = withDefaults(
  defineProps<{
    /** 各图标的开关（不传 = 全开），BasicTable 的 tableHeaderOptions 透传进来 */
    options?: TableHeaderOptions
    /** 当前密度（ElTable 的 size） */
    density?: TableDensity
    /** 是否处于全屏 */
    isFullscreen?: boolean
    /** 列设置面板里的勾选项 */
    columnItems?: TableColumnSettingItem[]
  }>(),
  {
    options: () => ({}),
    density: 'default',
    isFullscreen: false,
    columnItems: () => []
  }
)

const emit = defineEmits<{
  refresh: []
  download: []
  print: []
  'density-change': [density: TableDensity]
  'column-toggle': [key: string, visible: boolean]
  'column-reorder': [dragKey: string, dropKey: string, position: ColumnDropPosition]
  'column-reset': []
  'fullscreen-toggle': []
}>()

/** 没配的图标默认显示 */
const tools = computed(() => ({
  refresh: true,
  download: true,
  print: true,
  density: true,
  columnSetting: true,
  fullscreen: true,
  ...props.options
}))

/** 刷新 / 下载 / 打印：同一个按钮，只是图标和事件不同 */
const plainTools = computed(() =>
  [
    { name: 'refresh' as const, title: '刷新', icon: RotateCw, enabled: tools.value.refresh },
    { name: 'download' as const, title: '下载', icon: Download, enabled: tools.value.download },
    { name: 'print' as const, title: '打印', icon: Printer, enabled: tools.value.print }
  ].filter((tool) => tool.enabled)
)

const DENSITY_ITEMS: { value: TableDensity; label: string }[] = [
  { value: 'large', label: '宽松' },
  { value: 'default', label: '默认' },
  { value: 'small', label: '紧凑' }
]

/** 刷新 / 下载 / 打印 各自的语义不同（刷新真会取数，下载和打印是留好的口子），分开抛事件 */
const handlePlainTool = (name: 'refresh' | 'download' | 'print'): void => {
  if (name === 'refresh') emit('refresh')
  else if (name === 'download') emit('download')
  else emit('print')
}

const handleDensity = (command: string | number | object): void => {
  emit('density-change', command as TableDensity)
}

// ---------------------------------------------------------------------------
// 列设置的拖拽排序（HTML5 原生拖放）
// ---------------------------------------------------------------------------

/** 正在拖的列 key */
const draggingKey = ref('')
/** 当前落点：移到哪一列的前面 / 后面 */
const dropTarget = ref<{ key: string; position: ColumnDropPosition } | null>(null)

const draggingItem = computed(() =>
  props.columnItems.find((item) => item.key === draggingKey.value)
)

/** 只有同一层的列能互相排序（跨层会改变表头结构，先不支持） */
const canDrop = (item: TableColumnSettingItem): boolean =>
  !!draggingItem.value &&
  draggingItem.value.key !== item.key &&
  draggingItem.value.parentKey === item.parentKey

/** 落点提示：上边 / 下边一条主色线（用 inset 阴影，不影响行高；内联样式免得依赖 Tailwind 生成的类名） */
const dropIndicatorStyle = (item: TableColumnSettingItem): Record<string, string> | undefined => {
  const target = dropTarget.value
  if (!target || target.key !== item.key || !canDrop(item)) return undefined
  const offset = target.position === 'before' ? '2px' : '-2px'
  return { boxShadow: `inset 0 ${offset} 0 0 var(--el-color-primary)` }
}

const handleDragStart = (item: TableColumnSettingItem, event: DragEvent): void => {
  draggingKey.value = item.key
  dropTarget.value = null
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    // Firefox 必须 setData 才会真的开始拖拽
    event.dataTransfer.setData('text/plain', item.key)
  }
}

const handleDragOver = (item: TableColumnSettingItem, event: DragEvent): void => {
  if (!canDrop(item)) {
    dropTarget.value = null
    return
  }
  // preventDefault 才会允许 drop
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  dropTarget.value = {
    key: item.key,
    position: event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
  }
}

const handleDrop = (item: TableColumnSettingItem, event: DragEvent): void => {
  event.preventDefault()
  const target = dropTarget.value
  if (target && canDrop(item) && target.key === item.key) {
    emit('column-reorder', draggingKey.value, target.key, target.position)
  }
  handleDragEnd()
}

const handleDragEnd = (): void => {
  draggingKey.value = ''
  dropTarget.value = null
}
</script>

<style scoped></style>
