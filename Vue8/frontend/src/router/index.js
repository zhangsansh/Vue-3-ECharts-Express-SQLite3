import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    redirect: '/screen'
  },
  {
    path: '/screen',
    component: () => import('@/views/screen/ScreenLayout.vue'),
    children: [
      { path: '', name: 'ScreenMap', component: () => import('@/views/screen/PageMap.vue') },
      { path: 'factors', name: 'ScreenFactors', component: () => import('@/views/screen/PageFactors.vue') },
      { path: 'ml', name: 'ScreenML', component: () => import('@/views/screen/PageML.vue') },
      { path: 'charts', name: 'ScreenCharts', component: () => import('@/views/screen/PageCharts.vue') },
      {
        path: 'region/:code',
        name: 'ScreenRegion',
        component: () => import('@/views/screen/PageRegion.vue')
      }
    ]
  },
  {
    path: '/admin',
    component: () => import('@/views/admin/AdminLayout.vue'),
    meta: { requireAuth: true },
    children: [
      { path: '', redirect: '/admin/data' },
      { path: 'data', name: 'AdminData', component: () => import('@/views/admin/DataManage.vue') },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('@/views/admin/UserManage.vue'),
        meta: { role: 'admin' }
      },
      {
        path: 'db',
        name: 'AdminDb',
        component: () => import('@/views/admin/DbSettings.vue'),
        meta: { role: 'admin' }
      },
      { path: 'preprocess', name: 'AdminPreprocess', component: () => import('@/views/admin/Preprocess.vue') }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  const store = useUserStore()
  if (to.meta.public) return next()
  if (!store.isLogin) return next('/login')
  if (to.meta.role === 'admin' && !store.isAdmin) return next('/admin/data')
  next()
})

export default router
