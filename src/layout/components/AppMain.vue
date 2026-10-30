<template>
  <!--
    这里必须是 h-full 而不是 min-h-full：
    min-h-full 的父级高度是 auto，子页面写 h-full 时百分比无处可参照（会退化成 auto），
    BasicTable / 部门树这类「撑满剩余高度、内部自己滚」的页面就算不出表格高度。
    main 本身有 overflow-y-auto，内容超高时照旧整页滚动。
  -->
  <div class="h-full">
    <router-view v-slot="{ Component, route: current }">
      <transition name="fade-slide" mode="out-in" appear>
        <keep-alive :include="tagsStore.cachedNames">
          <component :is="Component" v-if="tagsStore.contentVisible" :key="current.path" />
        </keep-alive>
      </transition>
    </router-view>
  </div>
</template>

<script setup lang="ts">
import { useTagsViewStore } from '@/stores/modules/tagsView'

defineOptions({ name: 'LayoutAppMain' })

const route = useRoute()
const tagsStore = useTagsViewStore()

// 刷新途中切到别的标签页：立刻收尾，别让新页面被空内容挡住
watch(
  () => route.path,
  () => tagsStore.cancelRefresh()
)
</script>
