<template>
  <div
    ref="rootRef"
    :class="[rootClass, isFullscreen ? 'bg-(--el-bg-color) p-3' : '']"
    class="box-border bg-(--el-bg-color)"
  >
    <!-- 顶部工具条：左侧 #header-left 插槽，右侧工具图标（刷新 / 下载 / 打印 / 密度 / 列设置 / 全屏） -->
    <TableHeader
      v-if="showTableHeader"
      :options="tableHeaderOptions"
      :density="activeDensity"
      :is-fullscreen="isFullscreen"
      :column-items="columnSettingItems"
      @refresh="emit('refresh')"
      @download="emit('download')"
      @print="emit('print')"
      @density-change="setDensity"
      @column-toggle="setColumnVisible"
      @column-reorder="moveColumn"
      @column-reset="resetColumns"
      @fullscreen-toggle="toggleFullscreen"
    >
      <template #left>
        <slot name="header-left" />
      </template>
    </TableHeader>

    <div :class="bodyClass" class="rounded-(--el-border-radius-base)">
      <ElTable ref="elTableRef" v-loading="loading" v-bind="mergedTableProps">
        <TableColumns :columns="renderColumns">
          <template v-for="(_, slotName) in columnsSlots" :key="slotName" #[slotName]="slotProps">
            <slot :name="slotName" v-bind="slotProps || {}" />
          </template>
        </TableColumns>

        <!-- 空数据：页面传了 #empty 就整块接管，否则用 ElEmpty 占位 -->
        <template #empty>
          <div class="flex w-full items-center justify-center" :style="{ minHeight: emptyHeight }">
            <slot name="empty">
              <ElEmpty :description="emptyText" />
            </slot>
          </div>
        </template>
      </ElTable>
    </div>

    <div v-if="showPagination" class="mt-4 flex" :class="paginationAlignClass">
      <ElPagination
        v-bind="mergedPaginationOptions"
        :total="pagination?.total"
        :page-size="pagination?.size"
        :current-page="pagination?.current"
        :disabled="loading"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TableInstance as ElTableInstance } from 'element-plus'
import { useTablePagination } from './composables/useTablePagination'
import { useTableExpose } from './composables/useTableExpose'
import { useTableHeader } from './composables/useTableHeader'
import type { BasicTableProps, PaginationConfig, TableEmits, TableInstance } from './types'
import TableColumns from './columns.vue'
import TableHeader from './TableHeader.vue'

/**
 * 表格封装（全局可用名为 `Tables`）。
 *
 * - `columns` 是唯一的列描述入口：选择列 / 展开列 / 序号列 / 分组表头 / formatter / 插槽都在里面配；
 * - 列内容既能写在 `columns[].slots` 里，也能用模板插槽 `#prop`（模板插槽优先）；
 * - 顶部工具条 `showTableHeader`：左侧 `#header-left` 插槽放页面按钮，右侧是刷新 / 下载 / 打印 /
 *   密度 / 列设置 / 全屏；刷新只抛事件，取数仍然由页面负责；
 * - 分页只负责「显示 + 把操作换算成新状态」，取数由页面在 `page-change` 里完成；
 * - `class` / `style` 以及 ElTable 的事件（selection-change / sort-change …）都透传给 ElTable。
 */
defineOptions({ name: 'BasicTable', inheritAttrs: false })

const props = withDefaults(defineProps<BasicTableProps>(), {
  columns: () => [],
  fit: true,
  showHeader: true,
  stripe: undefined,
  border: undefined,
  size: undefined,
  emptyHeight: '100%',
  emptyText: '暂无数据',
  autoHeight: false,
  showTableHeader: true
})
const emit = defineEmits<TableEmits>()

const elTableRef = useTemplateRef<ElTableInstance>('elTableRef')
const rootRef = useTemplateRef<HTMLElement>('rootRef')
const attrs = useAttrs()
const slots = useSlots()

/**
 * 顶部工具条的状态：列显隐（在副本上盖 visible）、密度、全屏。
 * 刷新 / 下载 / 打印 不在这里实现，只把事件抛给页面。
 */
const {
  renderColumns,
  columnSettingItems,
  setColumnVisible,
  moveColumn,
  resetColumns,
  activeDensity,
  setDensity,
  isFullscreen,
  toggleFullscreen
} = useTableHeader({
  columns: () => props.columns,
  size: () => props.size,
  fullscreenTarget: () => rootRef.value
})

/** 透传给列组件的插槽：工具条自己的 `#header-left` 不再往列里传 */
const columnsSlots = computed(() => {
  const result: Record<string, unknown> = {}
  for (const [name, slot] of Object.entries(slots)) {
    if (name !== 'header-left') result[name] = slot
  }
  return result
})

/** 序号列：分页时接着上一页数，从 (current - 1) * size + 1 开始 */
// const getGlobalIndex = (index: number): number => {
//   const page = props.pagination
//   return page ? (page.current - 1) * page.size + index + 1 : index + 1
// }

const { showPagination, mergedPaginationOptions, paginationAlignClass, nextPagination } =
  useTablePagination({
    pagination: () => props.pagination,
    paginationOptions: () => props.paginationOptions,
    isEmpty: () => props.data?.length === 0
  })

/** 分页交互的统一入口：同步 v-model:pagination，并让页面感知到要重新取数 */
const changePage = (patch: Partial<PaginationConfig>): void => {
  const next = nextPagination(patch)
  if (!next) return
  emit('update:pagination', next)
  emit('page-change', next)
}
/** 改每页条数后回到第 1 页（列表页的习惯做法） */
const handleSizeChange = (size: number): void => changePage({ size, current: 1 })
const handleCurrentChange = (current: number): void => changePage({ current })

// ---------------------------------------------------------------------------
// 透传给 ElTable 的属性
// ---------------------------------------------------------------------------

/** 本组件自己的属性：不能透传给 ElTable，否则会变成野属性落到 DOM 上 */
const OWN_TABLE_PROPS = new Set([
  'columns',
  'pagination',
  'paginationOptions',
  'loading',
  'emptyHeight',
  'emptyText',
  'autoHeight',
  'showTableHeader',
  'tableHeaderOptions'
])

/** autoHeight 时把高度交给 flex 容器；页面显式传了 height 就尊重页面的高度 */
const resolvedHeight = computed(() => (props.autoHeight ? (props.height ?? '100%') : props.height))

/** ElTable 的属性 = $attrs（含事件）+ 非本组件的 props；没传的属性让 Element Plus 用自己的默认值 */
const mergedTableProps = computed(() => {
  const tableProps: Record<string, any> = { ...attrs }
  for (const [key, value] of Object.entries(props)) {
    if (!OWN_TABLE_PROPS.has(key) && value !== undefined) tableProps[key] = value
  }
  tableProps.height = resolvedHeight.value
  // 密度：工具条上选过的优先，没选过就用页面传的 size
  tableProps.size = activeDensity.value
  return tableProps
})

/** autoHeight：容器撑满父级，表格占剩余空间，分页自然吸底 */
const rootClass = computed(() => (props.autoHeight ? 'flex h-full min-h-0 flex-col' : ''))
const bodyClass = computed(() => (props.autoHeight ? 'min-h-0 flex-1 ' : ''))

defineExpose<TableInstance>(useTableExpose(elTableRef))
</script>

<style scoped></style>
