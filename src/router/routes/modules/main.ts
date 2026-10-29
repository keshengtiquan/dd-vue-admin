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
        }
      }
    ]
  }
]

export default routes
