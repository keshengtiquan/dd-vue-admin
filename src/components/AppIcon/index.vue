<template>
  <component
    :is="icon"
    v-if="icon"
    :size="props.size"
    :style="iconStyle"
    v-bind="restAttrs"
  />
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { resolveIcon } from './icons'

defineOptions({ name: 'AppIcon', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    name?: string | null
    /**
     * 覆盖图标尺寸。
     * - number：按 px 处理（如 18）
     * - string：原样透传给 svg 的 width/height（如 '1em'、'18px'）
     * 默认 1em，跟随父级 font-size。
     */
    size?: number | string
  }>(),
  { size: '1em' }
)

const attrs = useAttrs()

/**
 * lucide 的图标是函数式组件，内部有 `delete props.class`，
 * 直接往图标上传 class 会被丢掉。这里主动剔除，避免"写了 class 却不生效"的误解；
 * 颜色请用 `stroke="currentColor"` 的继承特性，在父元素上设 color。
 */
const restAttrs = computed<Record<string, unknown>>(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

/** svg 在 flex 容器里可能被压缩，这里兜住；外部的 style 仍然优先 */
const iconStyle = computed(() => [{ flexShrink: 0 }, attrs.style])

const icon = computed(() => {
  const resolved = resolveIcon(props.name)
  if (!resolved && props.name && import.meta.env.DEV) {
    console.warn(
      `[AppIcon] 未收录的图标名：${props.name}（可在 src/components/AppIcon/icons.ts 登记）`
    )
  }
  return resolved
})
</script>
