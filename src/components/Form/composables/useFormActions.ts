import type { Ref } from 'vue'
import type { FormInstance as ElFormInstance } from 'element-plus'
import { cloneDeep } from 'lodash-es'
import { resolveSanitizeOutput, sanitizeFormData } from '@/utils/sanitize'
import type { SanitizeOutputOptions } from '@/utils/sanitize'
import type { FormItem } from '../types'

interface UseFormActionsOptions {
  /** ElForm 实例 */
  elFormRef: Ref<ElFormInstance | undefined>
  /** 表单数据（原地读写，保持父组件持有的同一个对象） */
  model: Ref<Record<string, any>>
  /** 表单项 getter */
  items: () => FormItem[]
  /** 清洗配置 getter（来自 Form 的 sanitizeOutput） */
  sanitizeOutput: () => Partial<SanitizeOutputOptions> | undefined
}

/**
 * 表单行为：校验、重置、清洗取数。
 *
 * `item.defaultValue` 的语义：既是**初始值**（挂载 / 父组件整体替换 model 时，只填空缺的键），
 * 也是**重置的落点**；没有 defaultValue 的字段重置时回到"挂载时的快照"。
 * 父组件整体替换 model（典型场景：打开编辑弹窗 `form.value = { ...record }`）时快照会同步刷新，
 * 所以「回显后重置」得到的是回显数据，而不是创建时的空表单。
 */
export function useFormActions(options: UseFormActionsOptions) {
  const sanitizeOptions = computed(() => resolveSanitizeOutput(options.sanitizeOutput()))

  /** 把 defaultValue 填进 model：只填空缺的键，不覆盖父组件传入的值 */
  const applyDefaults = (): void => {
    const current = options.model.value
    options.items().forEach((item) => {
      if (item.defaultValue === undefined) return
      if (current[item.key] === undefined) current[item.key] = cloneDeep(item.defaultValue)
    })
  }

  applyDefaults()
  /** 挂载时的数据快照（含默认值） */
  const initialModel = ref<Record<string, any>>(cloneDeep(options.model.value))
  watch(options.model, (value, oldValue) => {
    if (value !== oldValue) {
      applyDefaults()
      initialModel.value = cloneDeep(value)
    }
  })

  /** 原始 model */
  const getModel = (): Record<string, any> => options.model.value

  /** 清洗后的数据（提交 / 查询真正发出去的那份） */
  const getPayload = (): Record<string, any> =>
    sanitizeFormData(options.model.value, sanitizeOptions.value)

  /** 校验：通过 true / 失败 false（不抛异常，调用方不用 try-catch） */
  const validate = async (): Promise<boolean> => {
    const form = options.elFormRef.value
    if (!form) return true
    try {
      return await form.validate()
    } catch {
      return false
    }
  }

  const clearValidate = (props?: string | string[]): void => {
    options.elFormRef.value?.clearValidate(props)
  }

  const scrollToField = (prop: string): void => {
    options.elFormRef.value?.scrollToField(prop)
  }

  /** 重置目标数据 */
  const buildResetModel = (): Record<string, any> => {
    const next: Record<string, any> = cloneDeep(initialModel.value)
    options.items().forEach((item) => {
      if (item.defaultValue !== undefined) next[item.key] = cloneDeep(item.defaultValue)
      else if (!(item.key in next)) next[item.key] = undefined
    })
    return next
  }

  /** 原地写入 model：父组件持有的是同一个对象，v-model 无需替换引用 */
  const setModel = (values: Record<string, any>): void => {
    const current = options.model.value
    Object.keys(current).forEach((key) => {
      if (!(key in values)) delete current[key]
    })
    Object.assign(current, values)
  }

  const resetFields = (): void => {
    setModel(buildResetModel())
    clearValidate()
  }

  /** 设置"初始值"（重置时回到这份数据），不改变当前 model */
  const setInitialModel = (values: Record<string, any>): void => {
    initialModel.value = cloneDeep(values)
  }

  return {
    getModel,
    getPayload,
    validate,
    clearValidate,
    scrollToField,
    resetFields,
    setModel,
    setInitialModel
  }
}
