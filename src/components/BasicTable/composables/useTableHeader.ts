import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type {
  ColumnDropPosition,
  ColumnOption,
  TableColumnSettingItem,
  TableDensity
} from '../types'

/** 顶层列所在层级的标识（顺序覆盖用它当 key） */
const ROOT_LEVEL = ''

/**
 * 顶部工具条的状态与交互：列显隐、拖拽排序、密度、全屏。
 *
 * 三条约定：
 * 1. 组件只做 UI，不改页面传进来的 columns（显隐和顺序都是在副本上算出来的），页面配置不被污染；
 * 2. 刷新 / 下载 / 打印 不在这里实现，由页面监听事件后自己处理；
 * 3. 对外只暴露「结果」（renderColumns / columnSettingItems / activeDensity / isFullscreen）和几个动作。
 */
export function useTableHeader(options: {
  /** 页面传进来的列配置 */
  columns: () => ColumnOption[]
  /** 页面传进来的表格密度（ElTable 的 size，可能没传或为空串） */
  size: () => TableDensity | '' | undefined
  /** 全屏目标元素（一般传表格根节点，未挂载时为 null） */
  fullscreenTarget: () => HTMLElement | null | undefined
}) {
  // ---------------------------------------------------------------------------
  // 列树（显隐 / 顺序都挂在它的 key 上）
  // ---------------------------------------------------------------------------

  /** 拍平前的列节点：key 只在原始结构上生成一次，所以拖拽排序后 key 依然稳定 */
  interface ColumnNode {
    column: ColumnOption
    /** 列的唯一标识：id → prop → 原始下标路径 */
    key: string
    /** 层级，从 0 开始 */
    level: number
    parent: ColumnNode | null
    children: ColumnNode[]
  }

  const buildTree = (
    columns: ColumnOption[],
    parent: ColumnNode | null,
    parentPath: string
  ): ColumnNode[] =>
    columns.map((column, index) => {
      const path = parentPath ? `${parentPath}.${index}` : String(index)
      const node: ColumnNode = {
        column,
        // 没配 id / prop 的列（序号列、没写 prop 的分组列）用「原始下标路径」兜底，
        // 路径来自页面的 columns，不随拖拽排序变化，所以 key 始终稳定
        key: column.id ?? column.prop ?? path,
        level: parent ? parent.level + 1 : 0,
        parent,
        children: []
      }
      node.children = buildTree(column.children ?? [], node, path)
      return node
    })

  const columnTree = computed(() => buildTree(options.columns(), null, ''))

  const findNode = (key: string): ColumnNode | undefined => {
    if (!key) return undefined
    const stack = [...columnTree.value]
    while (stack.length) {
      const node = stack.pop() as ColumnNode
      if (node.key === key) return node
      stack.push(...node.children)
    }
    return undefined
  }

  // ---------------------------------------------------------------------------
  // 列显隐 + 拖拽排序
  // ---------------------------------------------------------------------------

  /** 列设置里被用户改过的列：key → 是否显示；没改过的列沿用配置里的 visible */
  const columnVisible = ref<Record<string, boolean>>({})

  /** 拖拽排序的结果：层级 key（顶层为 ''）→ 该层列的 key 顺序 */
  const columnOrder = ref<Record<string, string[]>>({})

  /** 按拖拽结果排好序的某一层子列（覆盖里没有的新列按原顺序接在后面） */
  const orderChildren = (parent: ColumnNode | null, children: ColumnNode[]): ColumnNode[] => {
    const override = columnOrder.value[parent?.key ?? ROOT_LEVEL]
    if (!override || !override.length) return children
    const rest = new Map(children.map((child) => [child.key, child]))
    const ordered: ColumnNode[] = []
    override.forEach((key) => {
      const child = rest.get(key)
      if (child) {
        ordered.push(child)
        rest.delete(key)
      }
    })
    children.forEach((child) => {
      if (rest.has(child.key)) ordered.push(child)
    })
    return ordered
  }

  /** 这一列实际是否显示：自己和所有祖先都没被隐藏才算显示 */
  const isVisible = (node: ColumnNode): boolean => {
    let current: ColumnNode | null = node
    while (current) {
      if (!(columnVisible.value[current.key] ?? current.column.visible !== false)) return false
      current = current.parent
    }
    return true
  }

  /** 列设置面板里的勾选项（按实际显示顺序、多级缩进；拖拽只允许同层） */
  const columnSettingItems = computed<TableColumnSettingItem[]>(() => {
    const items: TableColumnSettingItem[] = []
    const walk = (parent: ColumnNode | null, children: ColumnNode[]): void => {
      orderChildren(parent, children).forEach((node) => {
        if (node.column.label || node.column.prop) {
          items.push({
            key: node.key,
            label: node.column.label || node.column.prop || '',
            level: node.level,
            visible: isVisible(node),
            parentKey: node.parent?.key ?? ROOT_LEVEL
          })
        }
        if (node.children.length) walk(node, node.children)
      })
    }
    walk(null, columnTree.value)
    return items
  })

  /** 交给列渲染组件的列：在副本上应用顺序 + 显隐，不动页面的 columns */
  const renderColumns = computed<ColumnOption[]>(() => {
    const toOptions = (parent: ColumnNode | null, children: ColumnNode[]): ColumnOption[] =>
      orderChildren(parent, children).map((node) => {
        const next: ColumnOption = {
          ...node.column,
          visible: columnVisible.value[node.key] ?? node.column.visible !== false
        }
        if (node.children.length) next.children = toOptions(node, node.children)
        return next
      })
    return toOptions(null, columnTree.value)
  })

  /**
   * 切换列显隐。
   * - 取消勾选：整棵子树一起取消（父列不渲染，子列留着也没意义）；
   * - 勾选：连祖先一起勾上（否则勾了子列还是被隐藏的父列挡着，看着像没反应）。
   */
  const setColumnVisible = (key: string, visible: boolean): void => {
    const target = findNode(key)
    if (!target) return
    const next = { ...columnVisible.value }
    if (visible) {
      let ancestor = target.parent
      while (ancestor) {
        next[ancestor.key] = true
        ancestor = ancestor.parent
      }
    }
    const stack: ColumnNode[] = [target]
    while (stack.length) {
      const node = stack.pop() as ColumnNode
      next[node.key] = visible
      stack.push(...node.children)
    }
    columnVisible.value = next
  }

  /**
   * 拖拽排序：把 dragKey 移到同一层的 dropKey 前面 / 后面。
   * 只支持同层排序 —— 跨层会把叶子塞进别的分组、改变表头结构（还能拖出环），交互上得再设计，先不做。
   */
  const moveColumn = (dragKey: string, dropKey: string, position: ColumnDropPosition): void => {
    if (!dragKey || dragKey === dropKey) return
    const dragNode = findNode(dragKey)
    const dropNode = findNode(dropKey)
    if (!dragNode || !dropNode) return
    const parent = dropNode.parent
    if ((dragNode.parent?.key ?? ROOT_LEVEL) !== (parent?.key ?? ROOT_LEVEL)) return
    const siblings = parent ? parent.children : columnTree.value
    const keys = siblings.map((node) => node.key).filter((key) => key !== dragKey)
    const index = keys.indexOf(dropKey)
    if (index < 0) return
    keys.splice(position === 'before' ? index : index + 1, 0, dragKey)
    columnOrder.value = { ...columnOrder.value, [parent?.key ?? ROOT_LEVEL]: keys }
  }

  /** 列设置恢复成页面配置的样子（显隐 + 顺序） */
  const resetColumns = (): void => {
    columnVisible.value = {}
    columnOrder.value = {}
  }

  // ---------------------------------------------------------------------------
  // 密度
  // ---------------------------------------------------------------------------

  const density = ref<TableDensity | undefined>(undefined)
  /** 当前生效的密度：工具条上选过的优先，其次是页面传的 size，最后是 ElTable 默认值 */
  const activeDensity = computed<TableDensity>(() => density.value ?? (options.size() || 'default'))
  const setDensity = (value: TableDensity): void => {
    density.value = value
  }

  // ---------------------------------------------------------------------------
  // 全屏
  // ---------------------------------------------------------------------------

  const isFullscreen = ref(false)

  const syncFullscreen = (): void => {
    const target = options.fullscreenTarget()
    isFullscreen.value = !!target && document.fullscreenElement === target
  }

  /** 整块表格全屏；浏览器拒绝（iframe 无权限 / 没有用户手势）时静默保持原状 */
  const toggleFullscreen = async (): Promise<void> => {
    const target = options.fullscreenTarget()
    if (!target || typeof target.requestFullscreen !== 'function') return
    try {
      if (document.fullscreenElement === target) await document.exitFullscreen()
      else await target.requestFullscreen()
    } catch {
      // 全屏失败不抛给页面：按钮状态以 fullscreenchange 为准
    }
    syncFullscreen()
  }

  onMounted(() => document.addEventListener('fullscreenchange', syncFullscreen))
  onBeforeUnmount(() => document.removeEventListener('fullscreenchange', syncFullscreen))

  return {
    renderColumns,
    columnSettingItems,
    setColumnVisible,
    moveColumn,
    resetColumns,
    activeDensity,
    setDensity,
    isFullscreen,
    toggleFullscreen
  }
}
