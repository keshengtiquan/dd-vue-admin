<template>
  <Form ref="formRef" v-model="model" v-bind="{ ...formProps, ...$attrs }" @change="handleChange">
    <!--
      按钮区由 BasicForm 自己提供；外部传了 #actions 就整行接管。
      插槽 props 里带上了 submit / reset（与内置按钮同一套逻辑），
      所以"加第三个按钮"只需自己拼一行，不用重写校验与清洗。
    -->
    <template #actions="slotProps">
      <slot name="actions" v-bind="{ ...slotProps, submit: handleSubmit, reset: handleReset }">
        <ElButton v-if="showReset" @click="handleReset">{{ resetText }}</ElButton>
        <ElButton v-if="showSubmit" type="primary" :disabled="disabledSubmit" @click="handleSubmit">
          {{ submitText }}
        </ElButton>
      </slot>
    </template>
    <slot />
  </Form>
</template>

<script setup lang="ts">
import Form from '../index.vue'
import { useFormExpose } from '../composables/useFormExpose'
import type { BasicFormEmits, BasicFormProps, FormInstance, FormProps } from '../types'

/**
 * 新建 / 编辑表单：核心容器 + 「确定 / 重置」。
 *
 * - v-model 绑定表单数据；点确定先 `validate()`，通过后 `submit` 抛出清洗后的 payload；
 * - 重置：`item.defaultValue` 优先，其次回到挂载时的快照（回显后重置得到的是回显数据）；
 * - 通过 ref 可拿到 `validate / resetFields / setModel / getPayload` 等方法（见 FormInstance）。
 *
 * 用法见 `@/views/test.vue` 与 `doc/json-form.md`。
 */
defineOptions({ name: 'BasicForm', inheritAttrs: false })

const props = withDefaults(defineProps<BasicFormProps>(), {
  span: 6,
  gutter: 12,
  labelPosition: 'right',
  labelWidth: '80px',
  showSubmit: true,
  showReset: true,
  disabledSubmit: false,
  submitText: '确定',
  resetText: '重置'
})
const emit = defineEmits<BasicFormEmits>()

/** 表单数据：v-model 直接透传给核心容器 */
const model = defineModel<Record<string, any>>({ default: () => ({}) })
const formRef = ref<InstanceType<typeof Form> | null>(null)

/** 只透传核心容器认识的属性：按钮相关的 props 不能作为野属性落到 ElForm 上 */
const formProps = computed<FormProps>(() => ({
  items: props.items,
  span: props.span,
  gutter: props.gutter,
  labelPosition: props.labelPosition,
  labelWidth: props.labelWidth,
  disabled: props.disabled,
  rules: props.rules,
  sanitizeOutput: props.sanitizeOutput,
  // 按钮区布局
  actionAlign: props.actionAlign,
  actionSpan: props.actionSpan,
  buttonLeftLimit: props.buttonLeftLimit
}))

const handleSubmit = async (): Promise<void> => {
  const form = formRef.value
  if (!form) return
  if (!(await form.validate())) return
  emit('submit', form.getPayload(), form.getModel())
}

const handleReset = (): void => {
  formRef.value?.resetFields()
  emit('reset')
}

const handleChange = (key: string, value: any, model: Record<string, any>): void => {
  emit('change', key, value, model)
}

defineExpose<FormInstance>(useFormExpose(formRef))
</script>
