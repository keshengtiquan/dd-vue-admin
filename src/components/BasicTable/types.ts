import type { VNode } from 'vue'
import type { TableColumnCtx, TableInstance as ElTableInstance, TableProps } from 'element-plus'

/**
 * 表格组件的类型定义。
 *
 * 两条约定：
 * 1. 组件只做 UI：数据与分页状态都由页面持有（分页走 `v-model:pagination`，
 *    交互通过 `page-change` 抛出），组件不请求接口、也不在内部改分页数据；
 * 2. 页面上能写在 `<el-table-column>` 上的属性，都能原样写在 ColumnOption 里（`[key: string]: any`）。
 */

/** 分页状态：当前页码 / 每页条数 / 总条数 */
export interface PaginationConfig {
  /** 当前页码 */
  current: number
  /** 每页显示条目个数 */
  size: number
  /** 总条目数 */
  total: number
}

/** 分页器配置选项：字段与 ElPagination 的属性对齐，`align` 是本组件扩展的（分页器在容器里的位置） */
export interface PaginationOptions {
  /** 每页显示个数选择器的选项列表 */
  pageSizes?: number[]
  /** 分页器的对齐方式 */
  align?: 'left' | 'center' | 'right'
  /** 分页器的布局 */
  layout?: string
  /** 是否显示分页器背景 */
  background?: boolean
  /** 只有一页时是否隐藏分页器 */
  hideOnSinglePage?: boolean
  /** 分页器的大小 */
  size?: 'small' | 'default' | 'large'
  /** 分页器的页码数量 */
  pagerCount?: number
}

/** 单元格插槽作用域（= ElTableColumn `#default` 的 scope） */
export interface TableCellScope<T = any> {
  /** 当前行数据 */
  row: T
  /** 当前列配置（Element Plus 的 TableColumnCtx 泛型要求行类型带索引签名，这里用它自己的默认值） */
  column: TableColumnCtx
  /** 行索引（当前页内的索引） */
  $index: number
}

/** 表头插槽作用域（= ElTableColumn `#header` 的 scope） */
export interface TableHeaderScope {
  /** 当前列配置 */
  column: TableColumnCtx
  /** 列索引 */
  $index: number
}

/** 展开图标插槽作用域（= ElTableColumn `#expand` 的 scope） */
export interface TableExpandScope {
  /** 当前行是否已展开 */
  expanded: boolean
  /** 当前行是否允许展开 */
  expandable: boolean
}

/** 筛选触发器插槽作用域（= ElTableColumn `#filter-icon` 的 scope） */
export interface TableFilterIconScope {
  /**
   * 内置筛选面板是否展开。
   * 只有 Element Plus 自带的面板会改它 —— 自己画面板时要自己维护展开状态。
   */
  filterOpened: boolean
}

/**
 * 列插槽的两种写法（二选一）：
 * - 函数：自己用 `h` 渲染，返回 vnode / vnode 数组 / 字符串；
 * - 字符串：页面上模板插槽的名字，用页面里的 `<template #xxx>` 渲染
 *   （BasicTable 会把页面插槽透传给列组件）。
 */
export type ColumnSlot<Scope> = ((scope: Scope) => any) | string

/** 表格列配置 */
export interface ColumnOption<T = any> {
  /** 列的稳定标识：多列共用同一个 prop（或都没有 prop）时显式指定，避免 Vue key 冲突 */
  id?: string
  /** 列类型：选择列 / 展开列 / 序号列 */
  type?: 'selection' | 'expand' | 'index'
  /** 列属性名 */
  prop?: string
  /** 列标题 */
  label?: string
  /** 列宽度 */
  width?: string | number
  /** 最小列宽度 */
  minWidth?: string | number
  /** 固定列 */
  fixed?: boolean | 'left' | 'right'
  /** 是否可排序 */
  sortable?: boolean | 'custom'
  /** 过滤器选项 */
  filters?: any[]
  /** 过滤方法 */
  filterMethod?: (value: any, row: any) => boolean
  /** 过滤器位置 */
  filterPlacement?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 是否渲染这一列（`false` = 直接不生成这一列） */
  visible?: boolean
  /** 列显隐里的勾选状态（预留：列设置 UI 后续迭代） */
  checked?: boolean
  /** 子列：配了它这一列就是分组表头 */
  children?: ColumnOption<T>[]
  /** 单元格格式化（返回字符串或 VNode；提供了 default 插槽时以插槽为准） */
  formatter?: (row: T, column: TableColumnCtx, cellValue: any, index: number) => VNode | string
  /**
   * 列插槽，两种写法（二选一）：
   * 1. 函数式：`slots: { default: (scope) => h('span', scope.row.status) }`，直接返回 vnode / 数组 / 字符串；
   * 2. 插槽名：`slots: { default: 'status' }`，用页面上的模板插槽 `#status`；
   * 不写 `slots` 时按约定自动匹配模板插槽：单元格 `#prop`、表头 `#prop-header`、
   * 展开图标 `#prop-expand`、筛选触发器 `#prop-filter-icon`。
   * 优先级：显式写的插槽名 > 约定模板插槽 > `slots` 里的函数 > ElTableColumn 默认渲染（prop / formatter）。
   */
  slots?: {
    /**
     * 表头，等价于模板 `<template #prop-header>`。
     * 注意：多个列共用同一个 prop 时模板插槽会撞名，这种场景用函数式写法（或用 `id` 区分）。
     */
    header?: ColumnSlot<TableHeaderScope>
    /**
     * 单元格，等价于模板 `<template #prop>`。
     * `type: 'expand'` 的列用它渲染展开行内容，scope 与普通列一致（`{ row, $index, ... }`）。
     */
    default?: ColumnSlot<TableCellScope<T>>
    /** 展开列的箭头图标，scope 是 `{ expanded, expandable }`；不传用 Element Plus 自带的箭头 */
    expand?: ColumnSlot<TableExpandScope>
    /**
     * 筛选漏斗的触发器内容，scope 是 `{ filterOpened }`；不传用 Element Plus 自带的箭头。
     *
     * 只有列上配了 `filters` / `filterMethod`（Element Plus 才认为该列可筛选）时这个插槽才存在。
     * 注意它**拿不到 `column` / `store`** —— 想自己接管弹出内容并沿用 Element Plus 的筛选逻辑
     * （`filter-change` / 表头高亮 / `clearFilter()`），提交时得自己去 ElTable 实例上取：
     * `tableRef.value?.elTableRef` 带 `columns` 与 `store`。
     */
    'filter-icon'?: ColumnSlot<TableFilterIconScope>
    /** 预留：行内编辑态的单元格（本次不渲染，后续迭代） */
    edit?: ColumnSlot<TableCellScope<T>>
  }
  /** ElTableColumn 的其余属性（selectable / reserveSelection / showOverflowTooltip / align …） */
  [key: string]: any
}

/** 表格属性：ElTable 的全部属性 + 本组件扩展的属性 */
export interface BasicTableProps extends TableProps<Record<string, any>> {
  /** 加载状态（走 v-loading，不会作为属性落到 ElTable 上） */
  loading?: boolean
  /** 列渲染配置 */
  columns?: ColumnOption[]
  /** 分页状态（配合 `v-model:pagination` 使用） */
  pagination?: PaginationConfig
  /** 分页器配置 */
  paginationOptions?: PaginationOptions
  /** 空数据占位的最小高度，默认撑满表格区域 */
  emptyHeight?: string
  /** 空数据时显示的文本 */
  emptyText?: string
  /**
   * 高度自适应：容器撑满父级，表格占满剩余高度，分页吸底。
   * 需要父容器有确定高度（例如页面根节点带 `h-full`），否则表格高度会算不出来。
   */
  autoHeight?: boolean
  /** 顶部工具条开关：左侧是 `#header-left` 插槽（页面放按钮），右侧是工具图标，默认开 */
  showTableHeader?: boolean
  /** 顶部工具条的图标按钮开关（不传 = 全部显示） */
  tableHeaderOptions?: TableHeaderOptions
}

/** 表格密度（对应 ElTable 的 size） */
export type TableDensity = 'large' | 'default' | 'small'

/** 顶部工具条的图标按钮开关（右侧那一排），不传 = 全部显示 */
export interface TableHeaderOptions {
  /** 刷新：只抛 `refresh` 事件，取数由页面负责（组件不请求接口） */
  refresh?: boolean
  /** 下载：占位按钮，抛 `download` 事件，具体实现留给页面 */
  download?: boolean
  /** 打印：占位按钮，抛 `print` 事件，具体实现留给页面 */
  print?: boolean
  /** 密度：切换表格疏密（large / default / small） */
  density?: boolean
  /** 列设置：勾选列显隐（支持多级表头，勾父列会连子列一起切） */
  columnSetting?: boolean
  /** 全屏：整块表格（工具条 + 表格 + 分页）全屏 */
  fullscreen?: boolean
}

/** 列设置面板里的一项 */
export interface TableColumnSettingItem {
  /** 列的唯一标识：`id` → `prop` → 原始下标路径 */
  key: string
  /** 面板里展示的名称（label 优先，没有 label 用 prop） */
  label: string
  /** 层级（多级表头用缩进展示） */
  level: number
  /** 当前是否显示（父列隐藏时子列算隐藏） */
  visible: boolean
  /** 所在层级的父列 key（顶层为 `''`）：只有同一层的列能互相拖拽排序 */
  parentKey: string
}

/** 拖拽排序的落点：放到目标列前面还是后面 */
export type ColumnDropPosition = 'before' | 'after'

/** 组件事件：其余 ElTable 事件（selection-change / row-click / sort-change …）由 $attrs 原样转发 */
export interface TableEmits {
  /** `v-model:pagination` 的更新事件 */
  'update:pagination': [pagination: PaginationConfig]
  /** 页码或每页条数变化：payload 是合并后的完整分页状态，页面据此重新请求 */
  'page-change': [pagination: PaginationConfig]
  /** 点了工具条的刷新：页面重新取数 */
  refresh: []
  /** 点了工具条的下载：占位事件，等了再实现 */
  download: []
  /** 点了工具条的打印：占位事件，等了再实现 */
  print: []
}

/** 通过模板 ref 调用的方法（ElTable 常用能力的转发；实例还没挂载时安全降级，不抛错） */
export interface TableInstance {
  /** Element Plus 的 ElTable 实例（需要它没被转发的冷门能力时直接拿这个） */
  elTableRef?: ElTableInstance
  /** 清空选择 */
  clearSelection: () => void
  /** 获取当前选中的行 */
  getSelectionRows: () => any[]
  /** 切换某行的选中状态 */
  toggleRowSelection: (row: any, selected?: boolean) => void
  /** 全选 / 取消全选 */
  toggleAllSelection: () => void
  /** 展开 / 收起某行 */
  toggleRowExpansion: (row: any, expanded?: boolean) => void
  /** 设置当前高亮行 */
  setCurrentRow: (row?: any) => void
  /** 清空排序状态 */
  clearSort: () => void
  /** 清空筛选状态（不传则清空全部列） */
  clearFilter: (columnKeys?: string[]) => void
  /** 重新计算表格布局（容器尺寸变化后手动调用） */
  doLayout: () => void
  /** 手动排序（本地排序时使用） */
  sort: (prop: string, order: 'ascending' | 'descending' | null) => void
}
