<template>
  <!--
    折叠时图标不能动。收起态 64px 宽，左右各留 px-4(16px) 后只剩 32px，正好等于图标宽度，
    所以「居中」是 px-4 自然达成的 —— 不能靠 justify-center 切换：
    那会让图标按「剩余空间居中」瞬时重排，随侧边栏收窄一路漂移，标题淡出结束时再跳一下。
    这里始终左对齐 + px-4，图标全程钉在 16px，标题被 overflow-hidden 裁掉。
  -->
  <div class="flex h-14 shrink-0 items-center gap-2.5 overflow-hidden px-4">
    <span
      class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-(--el-color-primary) text-white"
    >
      <AppIcon name="blocks" :size="18" />
    </span>

    <Transition name="fade">
      <span v-if="!collapsed" class="min-w-0 truncate text-[15px] font-semibold tracking-wide">
        {{ APP_TITLE }}
      </span>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { APP_TITLE } from '@/constants/app'

defineOptions({ name: 'SidebarLogo' })

defineProps<{ collapsed?: boolean }>()
</script>
