import type { PaginationConfig, PaginationOptions } from '../types'

/** 默认分页器配置：布局按 RuoYi 的列表页习惯（总数 + 翻页 + 每页条数 + 跳页） */
export const DEFAULT_PAGINATION_OPTIONS: PaginationOptions = {
  pageSizes: [10, 20, 30, 50, 100],
  align: 'center',
  background: false,
  layout: 'total, prev, pager, next, sizes, jumper',
  hideOnSinglePage: false,
  size: 'small',
  pagerCount: 7
}

/** 分页器对齐方式 → flex 类名（align 是本组件的配置，不能透传给 ElPagination） */
const ALIGN_CLASS: Record<NonNullable<PaginationOptions['align']>, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end'
}

/**
 * 分页状态：组件只负责「显示分页器 + 把用户操作换算成新状态」，
 * 数据加载与状态落库（`v-model:pagination` / `page-change`）由 index.vue 和页面完成。
 */
export function useTablePagination(options: {
  /** 分页状态 */
  pagination: () => PaginationConfig | undefined
  /** 分页器配置 */
  paginationOptions: () => PaginationOptions | undefined
  /** 当前是否没有数据 */
  isEmpty: () => boolean
}) {
  const { pagination, paginationOptions, isEmpty } = options

  /** 空数据时不显示分页器（沿用原实现的行为） */
  const showPagination = computed(() => !!pagination() && !isEmpty())

  /** 分页器属性：合掉默认值，并摘掉 align */
  const mergedPaginationOptions = computed<Omit<PaginationOptions, 'align'>>(() => {
    const merged = { ...DEFAULT_PAGINATION_OPTIONS, ...paginationOptions() }
    delete merged.align
    return merged
  })

  const paginationAlignClass = computed(
    () => ALIGN_CLASS[paginationOptions()?.align ?? DEFAULT_PAGINATION_OPTIONS.align ?? 'center']
  )

  /** 生成新的分页状态；没有分页配置时返回 undefined（调用方直接忽略） */
  const nextPagination = (patch: Partial<PaginationConfig>): PaginationConfig | undefined => {
    const current = pagination()
    return current ? { ...current, ...patch } : undefined
  }

  return { showPagination, mergedPaginationOptions, paginationAlignClass, nextPagination }
}
