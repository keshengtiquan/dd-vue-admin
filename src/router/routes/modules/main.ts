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
          icon: 'user',
          // 固定标签：TagsViews 里不可关闭，且批量关闭（左侧/右侧/其它/全部）都会保留它
          affix: true,
          // keep-alive 缓存名，需与 views/test.vue 的 defineOptions({ name }) 一致
          cacheName: 'DashboardHome'
        }
      }
    ]
  }
]

export default routes
