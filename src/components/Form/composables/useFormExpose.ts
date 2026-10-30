import type { Ref } from 'vue'
import type { FormInstance } from '../types'

/**
 * 预设组件（BasicForm / SearchForm）把核心容器 defineExpose 的方法原样转发出去。
 * 这样父组件拿到的 ref 无论是哪一种形态，方法名和行为都一致。
 */
export function useFormExpose(formRef: Ref<FormInstance | null>): FormInstance {
  return {
    get elFormRef() {
      return formRef.value?.elFormRef
    },
    validate: () => formRef.value?.validate() ?? Promise.resolve(true),
    clearValidate: (props) => formRef.value?.clearValidate(props),
    resetFields: () => formRef.value?.resetFields(),
    scrollToField: (prop) => formRef.value?.scrollToField(prop),
    getModel: () => formRef.value?.getModel() ?? {},
    getPayload: () => formRef.value?.getPayload() ?? {},
    setInitialModel: (values) => formRef.value?.setInitialModel(values),
    setModel: (values) => formRef.value?.setModel(values),
    reloadOptions: (key) => formRef.value?.reloadOptions(key)
  }
}
