/**
 * Form 目录统一出口。
 *
 * - 组件：`Form`（核心容器，纯渲染 + `#actions` 插槽）、`BasicForm`（提交/重置）、`SearchForm`（查询/重置）
 * - 配置：`componentMap`（type → Element Plus 组件）、`componentTypes`
 * - 类型：FormItem / FormProps / BasicFormProps / SearchFormProps / FormInstance / SanitizeOutputOptions …
 * - 工具：sanitizeFormData 等空值清洗方法（也单独放在 @/utils/sanitize，页面可直接引）
 */
export { componentMap, componentTypes, type ComponentType } from './component-map'
export { default as Form } from './index.vue'
export { default as BasicForm } from './BasicForm/index.vue'
export { default as SearchForm } from './SearchForm/index.vue'
export * from './types'
export {
  defaultSanitizeOutput,
  isBlankValue,
  isEmptyRichText,
  resolveSanitizeOutput,
  sanitizeFormData
} from '@/utils/sanitize'
