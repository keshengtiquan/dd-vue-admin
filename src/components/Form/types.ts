import type { Component, VNode } from 'vue'
import type { FormInstance as ElFormInstance, FormItemRule, FormRules } from 'element-plus'
import type { ComponentType } from './component-map'
import type { SanitizeOutputOptions } from '@/utils/sanitize'

/** 清洗配置统一收口在 @/utils/sanitize，这里再导出一次方便 `import type { SanitizeOutputOptions } from '../types'` */
export type { SanitizeOutputOptions } from '@/utils/sanitize'

/** 选项数据项 */
export interface FormOption {
  /** 选项文本（可用 optionKeys 映射后端字段，如 dictLabel） */
  label?: string | number
  /** 选项值（可用 optionKeys 映射，如 dictValue） */
  value?: string | number | boolean | null
  /** 是否禁用 */
  disabled?: boolean
  /** 透传给子选项组件的额外属性（cascader / treeselect 的 children 直接写在选项对象里即可） */
  props?: Record<string, any>
  [key: string]: any
}

/** 原始选项对象的字段映射：后端字典常返回 { dictLabel, dictValue }，用它转成 { label, value } */
export interface FormOptionKeys {
  label?: string
  value?: string
  disabled?: string
}

/** 选项渲染位置：children = 用 ElOption / ElRadio / ElCheckbox 子节点；props = 通过 options / data 属性传入 */
export type FormOptionTarget = 'children' | 'props'

/** 联动值：既支持常量，也支持读 model 的函数（函数内读取的字段会自动成为响应式依赖） */
export type FormDynamicValue<T> = T | ((model: Record<string, any>) => T)

/** 表单项配置：JSON 描述一个字段的全部信息 */
export interface FormItem {
  /** 唯一标识，同时作为 model 的键与 ElFormItem 的 prop */
  key: string
  /** 标签文本；传组件或渲染函数时作为自定义标签渲染 */
  label?: string | (() => VNode) | Component
  /** 标签宽度，覆盖 Form 的 labelWidth */
  labelWidth?: string | number
  /** 组件类型：componentMap 里的名字（如 'input'），或直接传一个组件（配合 modelProp 接非标准 v-model 的组件）；不传按 input 渲染 */
  type?: ComponentType | string | Component
  /** 自定义渲染，优先级高于 type */
  render?: (() => VNode) | Component
  /** 是否隐藏，支持函数联动（隐藏后不渲染，也不参与校验） */
  hidden?: FormDynamicValue<boolean>
  /** 是否禁用，支持函数联动 */
  disabled?: FormDynamicValue<boolean>
  /** 栅格宽度（24 栅格），缺省用 Form 的 span */
  span?: number
  /** 追加到 ElCol 的属性，如 { xs: 24, offset: 2 } */
  colProps?: Record<string, any>
  /** 控件属性 */
  props?: Record<string, any>
  /** 控件事件，如 { change: (value) => ... } */
  on?: Record<string, (...args: any[]) => void>
  /** 控件插槽，如 { prefix: () => h(Icon) } */
  slots?: Record<string, ((scope?: any) => any) | undefined>
  /** 占位文本（等价于 props.placeholder，写这里更直观） */
  placeholder?: string
  /** 字段默认值：挂载 / 父组件整体替换 model 时只填空缺的键，同时也是「重置」的落点 */
  defaultValue?: any
  /** 选项：静态数组，或读 model 的函数（可异步，依赖变化会重新加载） */
  options?: FormOption[] | ((model: Record<string, any>) => FormOption[] | Promise<FormOption[]>)
  /** 原始选项字段映射（dictLabel / dictValue 之类） */
  optionKeys?: FormOptionKeys
  /** 选项渲染位置，缺省按 type 推断 */
  optionTarget?: FormOptionTarget
  /** 追加到每个子选项上的属性 */
  optionProps?: Record<string, any>
  /** 手动指定 loading（异步 options 会自动维护，一般不用写） */
  loading?: boolean
  /** 校验规则，会与 required 生成的规则合并 */
  rules?: FormItemRule[]
  /** 快捷必填：自动生成"请输入 / 请选择 xxx"规则 */
  required?: boolean
  /** 自定义必填提示文案 */
  requiredMessage?: string
  /** 标签后的问号提示 */
  tooltip?: string
  /** 透传给 ElFormItem 的属性，如 { validateStatus: 'error' } */
  formItemProps?: Record<string, any>
  /** v-model 的属性名，缺省 modelValue（接非标准 v-model 组件时用） */
  modelProp?: string
}

/** 三个组件共用的属性 */
export interface FormBaseProps {
  /** 表单数据，v-model 绑定 */
  items: FormItem[]
  /** 每列的宽度（基于 24 格布局） */
  span?: number
  /** 表单控件间隙 */
  gutter?: number
  /** 表单域标签的位置 */
  labelPosition?: 'left' | 'right' | 'top'
  /** 文字宽度 */
  labelWidth?: string | number
  /** 整体禁用所有控件 */
  disabled?: boolean
  /** 表单级校验规则（与表单项的 rules 叠加） */
  rules?: FormRules
  /** 提交 / 查询前清洗空值的局部覆盖 */
  sanitizeOutput?: Partial<SanitizeOutputOptions>
}

/** 重置按钮（BasicForm / SearchForm 各自的按钮区共用这段语义） */
export interface FormResetProps {
  /** 是否显示重置按钮 */
  showReset?: boolean
  /** 重置按钮文案 */
  resetText?: string
}

/** 按钮区对齐方式 */
export type FormActionAlign = 'left' | 'center' | 'right'

/** 按钮区布局（`<Form>` / `<BasicForm>` / `<SearchForm>` 共用） */
export interface FormActionLayoutProps {
  /**
   * 按钮区对齐方式：`left` / `center` / `right`。
   * 不传时按表单项数量推断：≤ `buttonLeftLimit` 个靠左紧跟表单项，否则贴行尾。
   */
  actionAlign?: FormActionAlign
  /**
   * 按钮区占的栅格宽度（1-24）。不传时：靠左占 `span` 一列，居中/靠右占满整行（24）。
   * 想让按钮独占一行且靠左，就写 `actionAlign: 'left'` + `actionSpan: 24`。
   */
  actionSpan?: number
  /** 表单项数量 ≤ 该值时，按钮区默认靠左（`actionAlign` 不传时才生效） */
  buttonLeftLimit?: number
}

/**
 * `<Form>` 核心容器：只负责"把 JSON 渲染成表单"。
 *
 * 按钮、查询、展开收起这些形态语义不在这里，由调用方通过 `#actions` 插槽提供
 * （`BasicForm` / `SearchForm` 就是两个现成的预设实现）。
 */
export interface FormProps extends FormBaseProps, FormActionLayoutProps {
  /** 只渲染前 limit 个未隐藏表单项（0 / 不传 = 全部）；展开收起由调用方控制 limit 实现 */
  limit?: number
}

/** `#actions` 插槽的插槽 props：调用方靠它判断要不要显示"展开/收起" */
export interface FormActionSlotProps {
  /** 未隐藏的表单项总数 */
  total: number
  /** 当前实际渲染的表单项数量（受 limit 影响） */
  visibleCount: number
  /** 是否还有被 limit 截断的表单项 */
  hasMore: boolean
}

/**
 * `<BasicForm>` 的 `#actions` 插槽 props：核心容器的布局信息 + 两个内置行为。
 *
 * 传了 `#actions` 就是"整行自己拼"（内置的确定/重置不再渲染），
 * 但 `submit` / `reset` 与内置按钮是**同一套逻辑**（校验、清洗、emit），
 * 所以加第三个按钮时不用自己再写一遍。
 */
export interface BasicFormActionSlotProps extends FormActionSlotProps {
  /** 等价于点内置「确定」：先校验，通过后 emit submit（payload 已清洗） */
  submit: () => void
  /** 等价于点内置「重置」：model 回到 defaultValue / 初始快照，emit reset */
  reset: () => void
}

/** `<SearchForm>` 的 `#actions` 插槽 props：核心容器的布局信息 + 内置行为 */
export interface SearchFormActionSlotProps extends FormActionSlotProps {
  /** 等价于点内置「查询」：emit search（payload 已清洗） */
  search: () => void
  /** 等价于点内置「重置」 */
  reset: () => void
  /** 当前是否处于展开态 */
  expanded: boolean
  /** 切换展开/收起（`isExpand` 由外部锁定时不生效） */
  toggleExpand: () => void
}

/** `<BasicForm>` 属性：核心容器 + 提交/重置按钮 */
export interface BasicFormProps extends FormBaseProps, FormResetProps, FormActionLayoutProps {
  /** 是否显示提交按钮 */
  showSubmit?: boolean
  /** 是否禁用提交按钮 */
  disabledSubmit?: boolean
  /** 提交按钮文案 */
  submitText?: string
}

/** `<SearchForm>` 属性：核心容器 + 查询/重置按钮 + 展开收起 */
export interface SearchFormProps extends FormBaseProps, FormResetProps, FormActionLayoutProps {
  /** 是否显示查询按钮 */
  showSearch?: boolean
  /** 是否禁用查询按钮 */
  disabledSearch?: boolean
  /** 查询按钮文案 */
  searchText?: string
  /** 由外部锁定为展开态（true 时不再显示展开/收起） */
  isExpand?: boolean
  /** 默认是否展开 */
  defaultExpanded?: boolean
  /** 是否需要展开 / 收起 */
  showExpand?: boolean
}

/** `<Form>` 核心容器事件：按钮相关事件由预设组件自己抛 */
export interface FormEmits {
  /** 任一字段变化 */
  change: [key: string, value: any, model: Record<string, any>]
}

/** `<BasicForm>` 事件 */
export interface BasicFormEmits {
  /** 校验通过后提交：payload 为清洗后的数据，model 为原始数据 */
  submit: [payload: Record<string, any>, model: Record<string, any>]
  /** 重置完成 */
  reset: []
  /** 任一字段变化 */
  change: [key: string, value: any, model: Record<string, any>]
}

/** `<SearchForm>` 事件 */
export interface SearchFormEmits {
  /** 查询：payload 为清洗后的数据，model 为原始数据 */
  search: [payload: Record<string, any>, model: Record<string, any>]
  /** 重置完成 */
  reset: []
  /** 任一字段变化 */
  change: [key: string, value: any, model: Record<string, any>]
}

/** 通过模板 ref 调用的方法（核心容器 defineExpose 出来的东西，两个预设组件原样转发） */
export interface FormInstance {
  /** Element Plus 的 ElForm 实例（defineExpose 已自动解包，直接是实例本身） */
  elFormRef?: ElFormInstance
  /** 校验：通过返回 true，失败返回 false（不会抛出） */
  validate: () => Promise<boolean>
  /** 清空校验状态 */
  clearValidate: (props?: string | string[]) => void
  /** 重置为初始值（defaultValue 优先，其次挂载时的快照）并清空校验 */
  resetFields: () => void
  /** 滚动到指定字段 */
  scrollToField: (prop: string) => void
  /** 取原始 model */
  getModel: () => Record<string, any>
  /** 取清洗后的数据（提交 / 查询用的那份） */
  getPayload: () => Record<string, any>
  /** 设置"初始值"（重置时回到这份数据），不改变当前 model */
  setInitialModel: (values: Record<string, any>) => void
  /** 直接写入 model（打开编辑弹窗时填充数据） */
  setModel: (values: Record<string, any>) => void
  /** 重新加载异步选项（不传 key 时全部重载，如字典缓存刷新后） */
  reloadOptions: (key?: string) => void
}
