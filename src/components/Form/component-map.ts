import {
  ElCascader,
  ElCheckbox,
  ElCheckboxGroup,
  ElDatePicker,
  ElInput,
  ElInputNumber,
  ElInputTag,
  ElRadioGroup,
  ElRate,
  ElSelect,
  ElSelectV2,
  ElSlider,
  ElSwitch,
  ElTimePicker,
  ElTimeSelect,
  ElTreeSelect
} from 'element-plus'

/**
 * JSON 里的 `type` 到 Element Plus 组件的映射。
 *
 * 说明：
 * - 同一个组件被多种 type 复用（如 ElDatePicker 对应 date / daterange / datetime…），
 *   各自的默认属性在 `composables/useFormFields.ts` 的 TYPE_DEFAULT_PROPS 里补齐；
 * - 单独放在这个文件里而不是 index.ts，是为了避免 index.ts（导出 SFC）与 SFC 之间的循环依赖。
 */
export const componentMap = {
  input: ElInput, // 输入框
  password: ElInput, // 密码框
  textarea: ElInput, // 多行文本
  inputTag: ElInputTag, // 标签输入框
  number: ElInputNumber, // 数字输入框
  select: ElSelect, // 选择器
  selectv2: ElSelectV2, // 虚拟滚动选择器
  switch: ElSwitch, // 开关
  checkbox: ElCheckbox, // 复选框
  checkboxgroup: ElCheckboxGroup, // 复选框组
  radiogroup: ElRadioGroup, // 单选框组
  date: ElDatePicker, // 日期选择器
  daterange: ElDatePicker, // 日期范围选择器
  datetime: ElDatePicker, // 日期时间选择器
  datetimerange: ElDatePicker, // 日期时间范围选择器
  month: ElDatePicker, // 月份选择器
  monthrange: ElDatePicker, // 月份范围选择器
  year: ElDatePicker, // 年份选择器
  yearrange: ElDatePicker, // 年份范围选择器
  week: ElDatePicker, // 周选择器
  dates: ElDatePicker, // 多日期选择器
  rate: ElRate, // 评分
  slider: ElSlider, // 滑块
  cascader: ElCascader, // 级联选择器
  timepicker: ElTimePicker, // 时间选择器
  timeselect: ElTimeSelect, // 时间选择
  treeselect: ElTreeSelect // 树选择器
}

/** 可用的组件类型（由 componentMap 推导，JSON 里的 type 写错时编辑器会直接报错） */
export type ComponentType = keyof typeof componentMap

/** 组件类型列表，运行时校验 / 遍历用 */
export const componentTypes = Object.keys(componentMap) as ComponentType[]
