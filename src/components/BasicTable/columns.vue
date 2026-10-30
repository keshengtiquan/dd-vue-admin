<template>
  <ColumnsNode :columns="props.columns" />
</template>

<script setup lang="ts">
import { ElTableColumn } from 'element-plus'
import {
  createTextVNode,
  h,
  isVNode,
  useSlots,
  type FunctionalComponent,
  type PropType,
  type VNode,
  type VNodeChild
} from 'vue'
import type { ColumnOption } from './types'

defineOptions({ name: 'TableColumns' })

const props = withDefaults(defineProps<{ columns?: ColumnOption[] }>(), { columns: () => [] })

/**
 * 页面上的模板插槽（BasicTable 会把页面插槽原样透传过来）。
 * `slots: { default: 'status' }` 这种「写插槽名」的用法就是从它里面取。
 */
const slots = useSlots()

/** 插槽种类：单元格 / 表头 / 展开图标 / 筛选触发器（types 里的 edit 是预留字段，暂不渲染） */
type ColumnSlotKind = 'default' | 'header' | 'expand' | 'filter-icon'

/** 插槽渲染函数：入参是 Element Plus 传来的 scope，出参是 vnode（或 vnode 数组 / 字符串） */
type SlotRender = (scope: any) => VNodeChild

/** 本组件自己的字段：不能透传给 ElTableColumn，否则会变成野属性落到列的隐藏 DOM 上 */
const OWN_COLUMN_KEYS = new Set(['id', 'slots', 'children', 'visible', 'disabled', 'checked'])

// ---------------------------------------------------------------------------
// 属性 / 插槽解析
// ---------------------------------------------------------------------------

/** ElTableColumn 的属性 = 列配置去掉本组件自己的字段；undefined 交给 Element Plus 的默认值 */
const cleanColumnProps = (column: ColumnOption): Record<string, any> => {
  const columnProps: Record<string, any> = {}
  for (const [key, value] of Object.entries(column)) {
    if (!OWN_COLUMN_KEYS.has(key) && value !== undefined) columnProps[key] = value
  }
  return columnProps
}

/** 约定插槽名：单元格 `#prop`、表头 `#prop-header`、展开图标 `#prop-expand`（没有 prop 时退回 id） */
const conventionSlotName = (column: ColumnOption, kind: ColumnSlotKind): string | undefined => {
  const key = column.prop ?? column.id
  if (!key) return undefined
  return kind === 'default' ? key : `${key}-${kind}`
}

/**
 * 统一成 vnode 数组。
 * Element Plus 把插槽返回值直接当数组用（`isArray(...)` / `vnodes.some(...)` / `ensureValidVNode`），
 * 返回单个 vnode 或字符串都会报错，所以这里统一拍平。
 */
const toVNodeArray = (rendered: any): VNode[] => {
  if (rendered === null || rendered === undefined || typeof rendered === 'boolean') return []
  if (isVNode(rendered)) return [rendered]
  if (Array.isArray(rendered)) {
    const vnodes: VNode[] = []
    for (const item of rendered) vnodes.push(...toVNodeArray(item))
    return vnodes
  }
  return [createTextVNode(String(rendered))]
}

/** 包装成「一定返回数组」的插槽函数；拿到的不是函数（插槽不存在）就返回 undefined */
const wrapSlot = (render?: unknown): SlotRender | undefined => {
  if (typeof render !== 'function') return undefined
  return (scope: any): VNode[] => toVNodeArray((render as SlotRender)(scope))
}

/**
 * 解析一列上的某个插槽，两种写法二选一：
 * 1. 函数式：`slots: { default: (scope) => h('span', scope.row.status) }` —— 自己用 h 渲染；
 * 2. 插槽名：`slots: { default: 'status' }` —— 用页面上的同名模板插槽 `#status`。
 * 不写 slots 时按约定自动匹配模板插槽（`#prop` / `#prop-header` / `#prop-expand`）。
 * 优先级：显式插槽名 > 约定模板插槽 > `slots` 里的函数；
 * 都没命中返回 undefined，交给 ElTableColumn 默认渲染（prop / formatter），不会白屏。
 */
const resolveColumnSlot = (column: ColumnOption, kind: ColumnSlotKind): SlotRender | undefined => {
  const configured = column.slots?.[kind]
  if (typeof configured === 'string') return wrapSlot(slots[configured])
  const name = conventionSlotName(column, kind)
  if (name && slots[name]) return wrapSlot(slots[name])
  return wrapSlot(configured)
}

/** 一列要挂到 ElTableColumn 上的插槽集合 */
const buildColumnSlots = (column: ColumnOption): Record<string, SlotRender> => {
  const columnSlots: Record<string, SlotRender> = {}
  const cell = resolveColumnSlot(column, 'default')
  const header = resolveColumnSlot(column, 'header')
  const expandIcon = resolveColumnSlot(column, 'expand')
  const filterIcon = resolveColumnSlot(column, 'filter-icon')
  if (cell) columnSlots.default = cell
  if (header) columnSlots.header = header
  if (expandIcon) columnSlots.expand = expandIcon
  if (filterIcon) columnSlots['filter-icon'] = filterIcon
  return columnSlots
}

// ---------------------------------------------------------------------------
// 递归渲染
// ---------------------------------------------------------------------------

/**
 * 分组列的子列签名（只算显示出来的列，含递归）。
 *
 * 为什么要它：ElTableColumn 的分组子列是「挂载时收集一次」的 ——
 * 它内部渲染子列的那个组件（element-plus 的 TableColumnRenderer）没有 props、也没有响应式依赖，
 * 父组件再渲染时它不会重新执行，`default` 插槽里那批子列 vnode 就被冻住了。
 * 所以子列集合一变（比如列设置里勾掉一个子列），必须让分组列换一个 key 重新挂载，
 * Element Plus 才会重新登记子列；把整棵子树的签名拼进 key，嵌套分组也能一起重挂载。
 */
const childrenSignature = (columns: ColumnOption[]): string =>
  columns
    .filter((column) => column.visible !== false)
    .map((column, index) => {
      const key = column.id ?? column.prop ?? column.label ?? ''
      const body = column.children?.length ? `${key}[${childrenSignature(column.children)}]` : key
      // 下标一起进签名：顺序变化（拖拽排序）也要能触发重挂载
      return `${index}:${body}`
    })
    .join(',')

/**
 * 渲染一列。
 * - 带 children 的列 = 分组表头：子列必须渲染在它的默认插槽里，Element Plus 才会登记成子列；
 * - 其余列 = 普通列：插槽交给 ElTableColumn，没有插槽时它自己按 prop / formatter 渲染。
 */
const renderColumn = (column: ColumnOption, index: number): VNode => {
  const baseKey = column.id ?? column.prop ?? index
  const children = column.children
  if (children && children.length > 0) {
    const columnProps = {
      ...cleanColumnProps(column),
      key: `${baseKey}#${childrenSignature(children)}`
    }
    return h(ElTableColumn, columnProps, { default: () => [h(ColumnsNode, { columns: children })] })
  }
  return h(ElTableColumn, { ...cleanColumnProps(column), key: baseKey }, buildColumnSlots(column))
}

/** 渲染一组列：visible: false 的列直接不生成（多级表头的子列同样生效） */
const renderColumns = (columns?: ColumnOption[]): VNode[] => {
  const vnodes: VNode[] = []
  const list = columns ?? []
  for (let index = 0; index < list.length; index++) {
    const column = list[index]
    if (column.visible === false) continue
    vnodes.push(renderColumn(column, index))
  }
  return vnodes
}

/**
 * 递归组件：多级表头靠它一层层往下渲染（每个分组列的子列都由它再渲染一遍）。
 *
 * 必须是「函数式组件」，不能换成普通组件：
 * ElTableColumn 用 `slots.default()` 的返回值收集子列（element-plus 的 table-column/index.vue），
 * 只认 `vnode.type?.name === 'ElTableColumn'` 或 `vnode.shapeFlag & ShapeFlags.FUNCTIONAL_COMPONENT`，
 * 普通状态组件（shapeFlag = STATEFUL_COMPONENT）会被直接丢掉，分组表头就会变成空的。
 */
const ColumnsNode: FunctionalComponent<{ columns?: ColumnOption[] }> = (nodeProps) =>
  renderColumns(nodeProps.columns)

ColumnsNode.props = {
  columns: { type: Array as PropType<ColumnOption[]>, default: () => [] }
}
</script>

<style scoped></style>
