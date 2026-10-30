import type { Component, Ref } from 'vue'
import type { FormItemRule } from 'element-plus'
import { ElCheckbox, ElOption, ElRadio } from 'element-plus'
import { componentMap } from '../component-map'
import { normalizeOptions } from './useFormOptions'
import type { FormDynamicValue, FormItem, FormOption, FormOptionTarget } from '../types'

/** 用子节点渲染选项的类型（select / 单选组 / 复选组） */
const CHILD_OPTION_COMPONENT: Record<string, Component> = {
  select: ElOption,
  radiogroup: ElRadio,
  checkboxgroup: ElCheckbox
}

/** 选项通过属性传入的类型：type → 属性名 */
const OPTION_PROP_KEY: Record<string, string> = {
  cascader: 'options',
  treeselect: 'data',
  selectv2: 'options'
}

/** 这些类型的控件自带 loading 属性，异步选项加载时注入 */
const LOADING_TYPES = new Set(['select', 'selectv2', 'treeselect'])

/** 同一组件被多种 type 复用时，靠这里补默认属性 */
const TYPE_DEFAULT_PROPS: Record<string, Record<string, any>> = {
  textarea: { type: 'textarea' },
  password: { type: 'password', showPassword: true },
  daterange: { type: 'daterange' },
  datetimerange: { type: 'datetimerange' },
  month: { type: 'month' },
  monthrange: { type: 'monthrange' },
  year: { type: 'year' },
  yearrange: { type: 'yearrange' },
  week: { type: 'week' },
  dates: { type: 'dates' }
}

/** 选择类类型：必填提示用"请选择"，校验触发方式用 change */
const CHOICE_TYPES = new Set<string>([
  ...Object.keys(CHILD_OPTION_COMPONENT),
  ...Object.keys(OPTION_PROP_KEY),
  'checkbox',
  'switch',
  'rate',
  'slider',
  'date',
  'daterange',
  'datetime',
  'datetimerange',
  'month',
  'monthrange',
  'year',
  'yearrange',
  'week',
  'dates',
  'timepicker',
  'timeselect'
])

/** 解析后可直接喂给模板的子选项 */
export interface ResolvedFieldChild {
  component: Component
  key: string
  label?: string | number | boolean
  value?: any
  disabled?: boolean
  props: Record<string, any>
}

/** 解析后的表单项：模板只认这份结构，JSON 里的各种写法都在这里归一 */
export interface ResolvedField {
  key: string
  item: FormItem
  type: string
  label?: FormItem['label']
  labelWidth?: string | number
  render?: FormItem['render']
  /** 缺省类型会解析不到组件，此时给出提示而不是静默空白 */
  component: Component | null
  hidden: boolean
  props: Record<string, any>
  on: Record<string, (...args: any[]) => void>
  slots: Record<string, (scope?: any) => any>
  children: ResolvedFieldChild[]
  rules: FormItemRule[]
  formItemProps: Record<string, any>
  colProps: Record<string, any>
  modelProp: string
  tooltip?: string
}

interface UseFormFieldsOptions {
  /** 表单项 getter */
  items: () => FormItem[]
  /** 表单数据（联动的函数会读它） */
  model: Ref<Record<string, any>>
  /** 异步选项结果 */
  optionMap: Ref<Record<string, FormOption[]>>
  /** 异步选项 loading */
  loadingMap: Ref<Record<string, boolean>>
  /** 默认列宽（来自 Form 的 span） */
  defaultSpan: () => number
}

/** 选项渲染位置：显式配置优先，否则按类型推断 */
const resolveOptionTarget = (type: string, item: FormItem): FormOptionTarget => {
  if (item.optionTarget) return item.optionTarget
  return type in OPTION_PROP_KEY ? 'props' : 'children'
}

/** 必填提示里用的字段名：优先取字符串 label，否则退回 key */
const labelText = (item: FormItem) => (typeof item.label === 'string' ? item.label : item.key)

/** required 快捷配置 → Element Plus 校验规则 */
const buildRules = (item: FormItem, type: string): FormItemRule[] => {
  const rules = [...(item.rules ?? [])]
  if (!item.required) return rules
  const isChoice = CHOICE_TYPES.has(type)
  rules.unshift({
    required: true,
    message: item.requiredMessage ?? `${isChoice ? '请选择' : '请输入'}${labelText(item)}`,
    trigger: isChoice ? 'change' : 'blur'
  })
  return rules
}

/**
 * 把 JSON 配置解析成模板可直接渲染的结构。
 *
 * 处理内容：组件查找、type 默认属性、placeholder、选项（静态 + 异步）、联动求值、
 * 必填规则、栅格、插槽、v-model 属性名。
 */
export function useFormFields(options: UseFormFieldsOptions) {
  /** 联动求值：函数会在读取 model 的过程中建立响应式依赖 */
  const resolveDynamic = <T>(value: FormDynamicValue<T> | undefined, fallback: T): T => {
    if (typeof value === 'function') {
      return (value as (model: Record<string, any>) => T)(options.model.value)
    }
    return value === undefined ? fallback : value
  }

  const fields = computed<ResolvedField[]>(() =>
    options.items().map((item) => {
      // type 可以是 componentMap 里的名字，也可以直接是一个组件（此时 type 名按 'custom' 处理，
      // 不走 type 默认属性 / 选项推断；配合 item.modelProp 就能接非标准 v-model 的组件）
      const isComponentType = typeof item.type === 'object' || typeof item.type === 'function'
      const type = typeof item.type === 'string' ? item.type : isComponentType ? 'custom' : 'input'
      const component = isComponentType
        ? (item.type as Component)
        : ((componentMap as Record<string, Component>)[type] ?? null)
      const span = item.span ?? options.defaultSpan()

      // 属性：type 默认值 → 用户 props → placeholder / disabled
      const props: Record<string, any> = { ...TYPE_DEFAULT_PROPS[type], ...item.props }
      if (item.placeholder !== undefined && props.placeholder === undefined) {
        props.placeholder = item.placeholder
      }
      const disabled = resolveDynamic(item.disabled, false)
      if (disabled) props.disabled = true

      // 选项：静态数组直接读（天然响应式），异步结果来自 optionMap
      const optionTarget = resolveOptionTarget(type, item)
      const optionList = Array.isArray(item.options)
        ? normalizeOptions(item.options, item.optionKeys)
        : (options.optionMap.value[item.key] ?? [])

      const loading = options.loadingMap.value[item.key] || item.loading
      if (loading && LOADING_TYPES.has(type)) props.loading = true

      const optionPropKey = OPTION_PROP_KEY[type]
      if (optionTarget === 'props' && optionPropKey) props[optionPropKey] = optionList

      // 子选项：select / 单选组 / 复选组
      const childComponent = optionTarget === 'children' ? CHILD_OPTION_COMPONENT[type] : undefined
      const children: ResolvedFieldChild[] = childComponent
        ? optionList.map((option, index) => ({
            component: childComponent,
            key: String(option.value ?? index),
            label: option.label ?? option.value ?? '',
            value: option.value,
            disabled: option.disabled,
            props: { ...item.optionProps, ...option.props }
          }))
        : []

      // 插槽：过滤掉值为 undefined 的项，避免 Vue 渲染空插槽
      const slots: Record<string, (scope?: any) => any> = {}
      Object.entries(item.slots ?? {}).forEach(([name, slotFn]) => {
        if (slotFn) slots[name] = slotFn
      })

      return {
        key: item.key,
        item,
        type,
        label: item.label,
        labelWidth: item.labelWidth,
        render: item.render,
        component,
        hidden: resolveDynamic(item.hidden, false),
        props,
        on: item.on ?? {},
        slots,
        children,
        rules: buildRules(item, type),
        formItemProps: item.formItemProps ?? {},
        colProps: { xs: 24, sm: 24, md: span, lg: span, xl: span, ...item.colProps },
        modelProp: item.modelProp ?? 'modelValue',
        tooltip: item.tooltip
      }
    })
  )

  return { fields, resolveDynamic }
}
