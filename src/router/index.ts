import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/modules/auth/auth.store'
import { tokenStorage } from '@/services/token-storage'

const resourceRoutes: RouteRecordRaw[] = [
  ...[
    'companies',
    'locations',
    'warehouses',
    'category-groups',
    'categories',
    'uoms',
    'brands',
    'items',
    'suppliers',
    'divisions',
    'employees',
    'vehicles',
  ].map((key) => ({
    path: `/master/${key}`,
    component: () => import('@/components/common/ResourceListView.vue'),
    props: { resourceKey: key },
  })),
  ...['purchase-orders', 'goods-receipts', 'complaints'].map((key) => ({
    path: `/procurement/${key}`,
    component: () => import('@/components/common/ResourceListView.vue'),
    props: { resourceKey: key },
  })),
  ...[
    'stocks',
    'item-units',
    'item-requests',
    'delivery-orders',
    'item-usages',
    'stock-adjustments',
    'stock-opnames',
    'low-stock',
  ].map((key) => ({
    path: `/inventory/${key}`,
    component: () => import('@/components/common/ResourceListView.vue'),
    props: { resourceKey: key },
  })),
  {
    path: '/assets/register',
    component: () => import('@/components/common/ResourceListView.vue'),
    props: { resourceKey: 'asset-register' },
  },
  {
    path: '/assets/maintenances',
    component: () => import('@/components/common/ResourceListView.vue'),
    props: { resourceKey: 'asset-maintenances' },
  },
  {
    path: '/assets/loss-cases',
    component: () => import('@/components/common/ResourceListView.vue'),
    props: { resourceKey: 'asset-loss-cases' },
  },
  {
    path: '/assets/disposals',
    component: () => import('@/components/common/ResourceListView.vue'),
    props: { resourceKey: 'asset-disposals' },
  },
  ...['users', 'roles', 'permissions', 'audit-logs', 'login-history', 'sessions'].map((key) => ({
    path: `/administration/${key}`,
    component: () => import('@/components/common/ResourceListView.vue'),
    props: { resourceKey: key },
  })),
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/modules/auth/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/modules/dashboard/DashboardView.vue'),
        },
        ...resourceRoutes,
        { path: 'approvals', component: () => import('@/modules/approvals/ApprovalsView.vue') },
        { path: 'reports', component: () => import('@/modules/reports/ReportsView.vue') },
        {
          path: 'notifications',
          component: () => import('@/views/StaticView.vue'),
          props: {
            title: 'Notifications',
            description: 'Notifikasi low stock, approval, warranty, dan aktivitas penting.',
          },
        },
        {
          path: 'profile',
          component: () => import('@/views/StaticView.vue'),
          props: { title: 'Profil', description: 'Informasi akun dan context kerja aktif.' },
        },
        {
          path: 'system/recycle-bin',
          component: () => import('@/views/StaticView.vue'),
          props: {
            title: 'Recycle Bin',
            description: 'Pemulihan data master yang dihapus secara soft delete.',
          },
        },
        {
          path: 'system/settings',
          component: () => import('@/views/StaticView.vue'),
          props: {
            title: 'System Settings',
            description: 'Konfigurasi aplikasi dan integrasi AIMS.',
          },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', component: () => import('@/views/NotFoundView.vue') },
  ],
})

let sessionChecked = false
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    if (to.path === '/login' && tokenStorage.accessToken()) return '/'
    return true
  }
  if (!tokenStorage.accessToken()) return { path: '/login', query: { redirect: to.fullPath } }
  if (!sessionChecked && !auth.user) {
    sessionChecked = true
    const valid = await auth.restoreSession()
    if (!valid) return { path: '/login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
