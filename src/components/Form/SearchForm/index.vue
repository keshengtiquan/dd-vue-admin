<template>
  <Form
    ref="formRef"
    v-model="model"
    v-bind="{ ...formProps, ...$attrs }"
    :limit="limit"
    :action-span="resolvedActionSpan"
    @change="handleChange"
  >
    <!--
      按钮区由 SearchForm 自己提供；外部传了 #actions 就整行接管。
      插槽 props 里带上了 search / reset / expanded / toggleExpand，
      所以"加第三个按钮"或重排按钮都不用重写逻辑。
    -->
    <template #actions="slotProps">
      <slot
        name="actions"
        v-bind="{
          ...slotProps,
          search: handleSearch,
          reset: handleReset,
          expanded: isExpanded,
          toggleExpand
        }"
      >
        <ElButton v-if="showSearch" type="primary" :disabled="disabledSearch" @click="handleSearch">
          <AppIcon name="Search" class="mr-1"></AppIcon>
          {{ searchText }}
        </ElButton>
        <ElButton v-if="showReset" @click="handleReset">
          <AppIcon name="RefreshCcw" class="mr-1"></AppIcon>
          {{ resetText }}
        </ElButton>

        <button
          v-if="showExpandButton(slotProps)"
          type="button"
          class="flex cursor-pointer items-center gap-1 ml-2 border-0 bg-transparent p-0 text-(--el-color-primary)"
          @click="toggleExpand"
        >
          <span class="text-sm">{{ isExpanded ? '收起' : '展开' }}</span>
          <ChevronUp v-if="isExpanded" :size="14" />
          <ChevronDown v-else :size="14" />
        </button>
      </slot>
    </template>
    <slot />
  </Form>
</template>

<script setup lang="ts">
import { ChevronDown, ChevronUp } from '@lucide/vue'
import Form from '../index.vue'
import { useFormExpose } from '../composables/useFormExpose'
import type {
  FormActionSlotProps,
  FormInstance,
  FormProps,
  SearchFormEmits,
  SearchFormProps
} from '../types'

/**
 * 查询栏：核心容器 + 「查询 / 重置 / 展开收起」。
 *
 * - 收起态只渲染一行（`limit = floor(24 / span) - 1`，留一列给按钮），
 *   插槽 props 的 `hasMore` 为真时才出现「展开」；
 * - 查询时把清洗后的参数通过 `search` 抛出（空字符串 / 空数组 / 空对象 / 空富文本默认剔除，
 *   0 和 false 保留），可用 `sanitizeOutput` 局部覆盖；
 * - 收起时按钮区补满剩余那一列，展开后独占一行靠右。
 */
defineOptions({ name: 'SearchForm', inheritAttrs: false })

const props = withDefaults(defineProps<SearchFormProps>(), {
  span: 6,
  gutter: 12,
  labelPosition: 'right',
  labelWidth: '80px',
  showSearch: true,
  showReset: true,
  disabledSearch: false,
  searchText: '查询',
  resetText: '重置',
  isExpand: false,
  defaultExpanded: false,
  showExpand: true,
  buttonLeftLimit: 3
})
const emit = defineEmits<SearchFormEmits>()

/** 查询参数：v-model 直接透传给核心容器 */
const model = defineModel<Record<string, any>>({ default: () => ({}) })
const formRef = ref<InstanceType<typeof Form> | null>(null)

/** 收起时一行放得下的表单项数量（留一列给按钮） */
const maxItemsPerRow = computed(() => Math.max(1, Math.floor(24 / props.span) - 1))
const isExpanded = ref(props.defaultExpanded)
/** 收起态：limit > 0，核心容器只渲染前面这些项 */
const collapsed = computed(() => !props.isExpand && !isExpanded.value)
const limit = computed(() => (collapsed.value ? maxItemsPerRow.value : 0))
/** 收起时按钮补满剩余一列（3 项 + 1 列 = 24），展开后独占一行 */
const resolvedActionSpan = computed(() => {
  // 显式指定对齐 / 宽度时交给核心容器算，别覆盖用户的意图
  if (props.actionAlign !== undefined || props.actionSpan !== undefined) return undefined
  return collapsed.value ? props.span : 24
})

/** 只透传核心容器认识的属性：按钮 / 展开相关的 props 不能作为野属性落到 ElForm 上 */
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

/** 还有被截断的项，或当前处于展开态（需要给收起入口） */
const showExpandButton = (slotProps: FormActionSlotProps): boolean =>
  props.showExpand && (slotProps.hasMore || isExpanded.value)

const toggleExpand = (): void => {
  isExpanded.value = !isExpanded.value
}

const handleSearch = (): void => {
  const form = formRef.value
  emit('search', form?.getPayload() ?? {}, form?.getModel() ?? {})
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
