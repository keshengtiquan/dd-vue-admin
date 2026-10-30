<template>
  <ElForm
    ref="elFormRef"
    :model="model"
    :rules="rules"
    :label-position="labelPosition"
    :label-width="labelWidth"
    :disabled="disabled"
    @submit.prevent
  >
    <ElRow :gutter="gutter">
      <ElCol v-for="field in renderedFields" :key="field.key" v-bind="field.colProps">
        <ElFormItem
          :prop="field.key"
          :label-width="field.labelWidth"
          :rules="field.rules"
          v-bind="field.formItemProps"
        >
          <template v-if="hasLabel(field)" #label>
            <component v-if="isCustomLabel(field.label)" :is="field.label" />
            <span v-else>{{ field.label }}</span>
            <ElTooltip v-if="field.tooltip" :content="field.tooltip" placement="top">
              <CircleHelp
                class="ml-1 inline-block align-middle text-(--el-text-color-placeholder)"
                :size="14"
              />
            </ElTooltip>
          </template>

          <!-- 自定义渲染优先级最高，内部可以完全接管控件 -->
          <component v-if="field.render" :is="field.render" />

          <!--
            控件：交给 FieldControl 渲染，由它决定"要不要挂 default 插槽"。
            默认插槽在很多控件里另有含义（ElCascader 拿它当节点文字渲染函数），
            空插槽会把控件自己的默认渲染顶掉，所以没内容时一个插槽都不传。
          -->
          <component v-else-if="field.component" :is="FieldControl" :field="field" />

          <span v-else class="text-(--el-color-danger)"> 未知控件类型：{{ field.type }} </span>
        </ElFormItem>
      </ElCol>

      <!--
        按钮区：核心容器不内置任何按钮，有 #actions 插槽才渲染这一列。
        查询/重置/展开收起这类形态语义由调用方决定（见 BasicForm / SearchForm）。
      -->
      <ElCol
        v-if="hasActionColumn"
        :xs="24"
        :sm="24"
        :md="resolvedActionSpan"
        :lg="resolvedActionSpan"
        :xl="resolvedActionSpan"
      >
        <div class="flex items-center" :class="actionJustifyClass">
          <slot name="actions" v-bind="actionSlotProps" />
        </div>
      </ElCol>
    </ElRow>

    <!-- 表单底部自定义内容（如提示文案等） -->
    <slot />
  </ElForm>
</template>

<script setup lang="ts">
import { CircleHelp } from '@lucide/vue'
import type { Component } from 'vue'
import type { FormInstance as ElFormInstance } from 'element-plus'
import { useFormActions } from './composables/useFormActions'
import { useFormFields, type ResolvedField } from './composables/useFormFields'
import { useFormOptions } from './composables/useFormOptions'
import type { FormActionSlotProps, FormEmits, FormInstance, FormProps } from './types'

/**
 * JSON 驱动表单的核心容器（全局可用名为 Form）：**只负责渲染**。
 *
 * - `items`（JSON）→ 控件 / 布局 / 校验 / 联动 / 选项 / 清洗；
 * - `limit` 控制只渲染前 N 个未隐藏项，展开收起由调用方改 limit 实现；
 * - 按钮区完全交给 `#actions` 插槽（插槽 props 见 FormActionSlotProps），
 *   查询栏与提交表单的语义分别在 `SearchForm` / `BasicForm` 里，核心容器不认识它们。
 */
defineOptions({ name: 'FormContainer' })

const props = withDefaults(defineProps<FormProps>(), {
  items: () => [],
  span: 6,
  gutter: 12,
  labelPosition: 'right',
  labelWidth: '80px',
  disabled: false,
  limit: 0,
  buttonLeftLimit: 2
})

const emit = defineEmits<FormEmits>()

const model = defineModel<Record<string, any>>({ default: () => ({}) })
const elFormRef = ref<ElFormInstance>()
const slots = useSlots()

const items = () => props.items
/** 异步选项 + 字段依赖加载 */
const { optionMap, loadingMap, reload } = useFormOptions(items, model)
/** JSON → 模板可渲染结构 */
const { fields } = useFormFields({
  items,
  model,
  optionMap,
  loadingMap,
  defaultSpan: () => props.span
})
/** 校验 / 重置 / 取清洗后数据 */
const {
  getModel,
  getPayload,
  validate,
  clearValidate,
  scrollToField,
  resetFields,
  setModel,
  setInitialModel
} = useFormActions({
  elFormRef,
  model,
  items,
  sanitizeOutput: () => props.sanitizeOutput
})

// ---------------------------------------------------------------------------
// 渲染范围与按钮区布局
// ---------------------------------------------------------------------------

/** 未隐藏的表单项 */
const visibleItems = computed(() => fields.value.filter((field) => !field.hidden))
/** 实际渲染的表单项：limit > 0 时只渲染前 limit 个（截断的部分不渲染，也就不会参与校验） */
const renderedFields = computed(() =>
  props.limit > 0 ? visibleItems.value.slice(0, props.limit) : visibleItems.value
)

/** 给 #actions 插槽的信息：调用方靠 hasMore 决定要不要显示"展开/收起" */
const actionSlotProps = computed<FormActionSlotProps>(() => ({
  total: visibleItems.value.length,
  visibleCount: renderedFields.value.length,
  hasMore: props.limit > 0 && visibleItems.value.length > renderedFields.value.length
}))

const hasActionColumn = computed(() => !!slots.actions)
/** 表单项很少时按钮紧跟表单项，多了才贴到行尾（`actionAlign` 不传时的默认推断） */
const actionAlignLeft = computed(() => renderedFields.value.length <= props.buttonLeftLimit)
/** 最终对齐方式：显式配置优先 */
const resolvedActionAlign = computed(
  () => props.actionAlign ?? (actionAlignLeft.value ? 'left' : 'right')
)
const actionJustifyClass = computed(
  () =>
    ({
      left: 'justify-start',
      center: 'justify-center',
      right: 'justify-end'
    })[resolvedActionAlign.value]
)
/**
 * 按钮区宽度：
 * - 显式传 `actionSpan` 时用它；
 * - 靠左 → 占一列紧跟表单项（想独占一行靠左就自己传 `actionSpan: 24`）；
 * - 居中 / 靠右 → 独占一行才有意义。
 */
const resolvedActionSpan = computed(() =>
  props.actionSpan !== undefined
    ? props.actionSpan
    : resolvedActionAlign.value === 'left'
      ? props.span
      : 24
)

// ---------------------------------------------------------------------------
// 控件绑定与标签
// ---------------------------------------------------------------------------

/** 写入字段并抛出 change */
const setFieldValue = (key: string, value: any): void => {
  model.value[key] = value
  emit('change', key, value, model.value)
}

/**
 * 控件渲染器：按 item.modelProp 动态绑定 v-model，并且**只在真的有内容时**才传插槽。
 *
 * 为什么不用模板直接写 `<component :is="field.component">` 的子节点：
 * 只要写了子节点，Vue 就会给控件注册一个 default 插槽；而空插槽会被某些控件当成
 * "用户要自定义渲染"（ElCascader 的 default 插槽即 render-label，节点文字就没了）。
 */
const FieldControl = defineComponent({
  name: 'FormFieldControl',
  props: { field: { type: Object, required: true } },
  setup(controlProps) {
    return () => {
      const field = controlProps.field as ResolvedField
      const fieldSlots: Record<string, (scope?: any) => any> = { ...field.slots }
      // select / 单选组 / 复选组的选项子节点才需要 default 插槽
      if (field.children.length) {
        fieldSlots.default = () =>
          field.children.map((child) =>
            h(child.component, {
              key: child.key,
              label: child.label,
              value: child.value,
              disabled: child.disabled,
              ...child.props
            })
          )
      }
      return h(
        field.component as Component,
        {
          ...field.props,
          [field.modelProp]: model.value[field.key],
          [`onUpdate:${field.modelProp}`]: (value: any) => setFieldValue(field.key, value),
          ...field.on
        },
        // 没有任何插槽时传 undefined：不能给控件挂一个空的 default 插槽
        Object.keys(fieldSlots).length ? fieldSlots : undefined
      )
    }
  }
})

const hasLabel = (field: ResolvedField): boolean =>
  field.label !== undefined && field.label !== null && field.label !== ''
const isCustomLabel = (label: ResolvedField['label']): boolean => typeof label !== 'string'

const exposed: FormInstance = {
  get elFormRef() {
    return elFormRef.value
  },
  validate,
  clearValidate,
  resetFields,
  scrollToField,
  getModel,
  getPayload,
  setInitialModel,
  setModel,
  reloadOptions: reload
}

defineExpose<FormInstance>(exposed)
</script>
