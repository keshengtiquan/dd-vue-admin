<template>
  <a-layout-content class="app-main">
    <div ref="scrollRef" class="app-main__scroll">
      <router-view v-slot="{ Component, route: current }">
        <transition name="fade-slide" mode="out-in">
          <keep-alive :include="cachedViews">
            <component :is="Component" :key="`${current.path}-${viewKey}`" />
          </keep-alive>
        </transition>
      </router-view>
    </div>
  </a-layout-content>
</template>

<script setup lang="ts">
import { useTagsViewStore } from '@/stores/modules/tagsView'

const route = useRoute()
const tagsStore = useTagsViewStore()

const scrollRef = ref<HTMLElement>()

/**
 * include 按「组件名」匹配，名字来自 tag.cacheName。
 * 页面组件必须用 defineOptions({ name }) 声明同名，否则只会不缓存、不会报错。
 */
const cachedViews = computed(() => tagsStore.cachedViews)
const viewKey = computed(() => tagsStore.viewKey)

/** 切页回到顶部，避免上一页的滚动位置带过来 */
watch(
  () => route.path,
  () => {
    scrollRef.value?.scrollTo({ top: 0 })
  }
)
</script>

<style scoped>
.app-main {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.app-main__scroll {
  flex: 1;
  min-height: 0;
  padding: 16px;
  overflow-y: auto;
}
</style>
