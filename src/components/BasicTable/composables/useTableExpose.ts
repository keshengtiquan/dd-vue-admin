import type { Ref } from 'vue'
import type { TableInstance as ElTableInstance } from 'element-plus'
import type { TableInstance } from '../types'

/**
 * 模板 ref 能力：把 ElTable 的常用方法转发出去，父组件拿到的 ref 不用再关心内部结构。
 *
 * 两种写法等价：
 * - `<Tables ref="tableRef" />` → `tableRef.value.clearSelection()`
 * - `<Tables ref="tableRef" />` → `tableRef.value.elTableRef?.clearSelection()`（冷门能力走原实例）
 */
export function useTableExpose(tableRef: Ref<ElTableInstance | null | undefined>): TableInstance {
  return {
    get elTableRef() {
      return tableRef.value ?? undefined
    },
    // 实例未挂载（或已经被卸载）时安全降级：不抛错，也不产生半截状态
    clearSelection: () => tableRef.value?.clearSelection(),
    getSelectionRows: () => tableRef.value?.getSelectionRows() ?? [],
    toggleRowSelection: (row, selected) => tableRef.value?.toggleRowSelection(row, selected),
    toggleAllSelection: () => tableRef.value?.toggleAllSelection(),
    toggleRowExpansion: (row, expanded) => tableRef.value?.toggleRowExpansion(row, expanded),
    setCurrentRow: (row) => tableRef.value?.setCurrentRow(row),
    clearSort: () => tableRef.value?.clearSort(),
    clearFilter: (columnKeys) => tableRef.value?.clearFilter(columnKeys),
    doLayout: () => tableRef.value?.doLayout(),
    // Element Plus 把 order 的类型写成 string，运行时接受 null（清空排序），这里按语义收窄、内部断言回去
    sort: (prop, order) => tableRef.value?.sort(prop, order as string)
  }
}
