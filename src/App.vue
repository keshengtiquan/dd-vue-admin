<script setup lang="ts">
// ConfigProvider 由 AntdvNextResolver 自动导入，theme 是对象、不是组件，需要显式引入
import { theme } from 'antdv-next'

const configProps = {
  theme: {
    algorithm: theme.defaultAlgorithm,
    components: {
      Layout: {
        bodyBg: '#f5f8ff',
        footerBg: '#f5f8ff',
        headerBg: '#ffffff',
        headerColor: 'rgba(0, 0, 0, 0.88)',
        siderBg: '#ffffff',
        triggerBg: '#f0f5ff',
        triggerColor: 'rgba(0, 0, 0, 0.88)'
      },
      Menu: {
        activeBarBorderWidth: 0,
        itemBg: 'transparent',
        subMenuItemBg: 'transparent'
      },
      Button: {},
      Alert: {},
      Modal: {},
      Card: {},
      Tooltip: {},
      Checkbox: {},
      Radio: {},
      Select: {},
      Input: {},
      Switch: {},
      Progress: {
        circleTextColor: 'rgba(0, 0, 0, 0.88)',
        defaultColor: '#1677FF',
        remainingColor: 'rgba(0, 0, 0, 0.06)'
      },
      Steps: {},
      Slider: {},
      ColorPicker: {},
      Notification: {}
    }
  }
}
</script>

<template>
  <a-config-provider v-bind="configProps">
    <RouterView />
  </a-config-provider>
</template>
