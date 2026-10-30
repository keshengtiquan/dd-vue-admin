import type { RouteRecordRaw } from 'vue-router'
import Layout from '@/layout/index.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/dashboard',
    name: 'home',
    component: Layout,
    redirect: '/dashboard/home',
    meta: {
      title: '首页',
      icon: 'layout-dashboard'
    },
    children: [
      {
        path: '/dashboard/home',
        name: 'test',
        component: () => import('@/views/test.vue'),
        meta: {
          title: '首页',
          // 单页模块会被降级成一个菜单项，图标取这一级的（父级 icon 不会带下来）
          icon: 'layout-dashboard',
          // 标签页固定项，不可关闭
          affix: true,
          // keep-alive 缓存名，需与页面 defineOptions({ name }) 一致
          cacheName: 'DashboardHome'
        }
      }
    ]
  }
]

export default routes
