import type { Ref } from 'vue'
import type { FormItem, FormOption, FormOptionKeys } from '../types'

/** 原始选项对象 → { label, value, disabled }（不传 keys 时原样返回） */
export function normalizeOptions(
  raw: FormOption[] | null | undefined,
  keys?: FormOptionKeys
): FormOption[] {
  if (!Array.isArray(raw)) return []
  if (!keys) return raw
  const { label = 'label', value = 'value', disabled } = keys
  return raw.map((option) => ({
    ...option,
    label: option[label],
    value: option[value],
    disabled: disabled ? option[disabled] : option.disabled
  }))
}

/**
 * 异步选项加载。
 *
 * - 只负责 `options` 为函数的字段（静态数组由 useFormFields 直接读，天然响应式）；
 * - 每个字段一个独立的 watchEffect：函数内读取的 model 字段会被自动登记为依赖，字段变化后重新加载；
 * - 同一字段的并发请求用序号守卫，慢请求不会覆盖新结果；
 * - 注意：依赖需要在 `await` 之前读取才能被追踪（异步函数里 await 之后再读 model 不会触发重载）。
 *
 * @param items 表单项 getter（建议返回常量数组，避免每次渲染都重建）
 * @param model 表单数据
 */
export function useFormOptions(items: () => FormItem[], model: Ref<Record<string, any>>) {
  /** key → 异步加载出来的选项 */
  const optionMap = ref<Record<string, FormOption[]>>({})
  /** key → 是否加载中（会注入控件为 loading） */
  const loadingMap = ref<Record<string, boolean>>({})
  /** key → 每个字段自己的请求序号 */
  const seqMap = new Map<string, number>()
  /** key → 已建立的响应式效应（函数引用不变时复用，避免数组重建导致重复请求） */
  const effects = new Map<string, { fn: unknown; stop: () => void }>()

  const load = async (item: FormItem) => {
    if (typeof item.options !== 'function') return
    const seq = (seqMap.get(item.key) ?? 0) + 1
    seqMap.set(item.key, seq)
    loadingMap.value[item.key] = true
    try {
      const raw = await item.options(model.value)
      if (seqMap.get(item.key) !== seq) return
      optionMap.value[item.key] = normalizeOptions(raw, item.optionKeys)
    } catch (error) {
      if (seqMap.get(item.key) === seq) optionMap.value[item.key] = []
      console.error(`[Form] 字段 ${item.key} 的 options 加载失败`, error)
    } finally {
      if (seqMap.get(item.key) === seq) loadingMap.value[item.key] = false
    }
  }

  /** 按当前 items 建立 / 复用 / 清理异步加载效应 */
  const rebuild = () => {
    const functional = items().filter((item) => typeof item.options === 'function')
    const nextKeys = new Set(functional.map((item) => item.key))

    // 已被移除或不再是异步函数的字段：停掉效应并清空缓存
    effects.forEach((entry, key) => {
      if (nextKeys.has(key)) return
      entry.stop()
      effects.delete(key)
      delete optionMap.value[key]
      delete loadingMap.value[key]
      seqMap.delete(key)
    })

    functional.forEach((item) => {
      const fn = item.options
      const entry = effects.get(item.key)
      if (entry && entry.fn === fn) return
      entry?.stop()
      const scope = effectScope(true)
      scope.run(() => {
        watchEffect(() => {
          void load(item)
        })
      })
      effects.set(item.key, { fn, stop: () => scope.stop() })
    })
  }

  watch(items, rebuild, { immediate: true })
  onScopeDispose(() => {
    effects.forEach((entry) => entry.stop())
    effects.clear()
  })

  /** 手动重新加载：不传 key 时重载全部异步选项（如字典缓存刷新后） */
  const reload = (key?: string) => {
    items()
      .filter((item) => typeof item.options === 'function' && (!key || item.key === key))
      .forEach((item) => void load(item))
  }

  return { optionMap, loadingMap, reload }
}
