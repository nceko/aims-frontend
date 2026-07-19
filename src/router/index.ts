import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/modules/auth/auth.store'
import { tokenStorage } from '@/services/token-storage'
import { resourceModuleList } from '@/config/modules'

const resourceRoutes: RouteRecordRaw[] = resourceModuleList.map((module) => ({
  path: module.route.replace(/^\//, ''),
  name: `resource-${module.key}`,
  component: () => import('@/modules/resource/ResourceWorkbenchView.vue'),
  props: { moduleKey: module.key },
  meta: { permission: module.readPermission, superAdminOnly: module.superAdminOnly },
}))

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
          meta: { permission: 'dashboard.read' },
        },
        ...resourceRoutes,
        {
          path: 'approvals',
          name: 'approvals',
          component: () => import('@/modules/approvals/ApprovalsView.vue'),
          meta: {
            permissionAny: [
              'dashboard.read',
              'transaction.purchase_orders.update',
              'transaction.item_requests.approve',
              'inventory.stock_adjustments.approve',
              'inventory.stock_opnames.approve',
              'inventory.asset_disposals.approve',
              'inventory.asset_losses.approve',
              'transaction.landed_costs.approve',
            ],
          },
        },
        {
          path: 'reports',
          name: 'reports',
          component: () => import('@/modules/reports/ReportsView.vue'),
          meta: {
            permissionAny: [
              'reports.inventory.read',
              'reports.inventory_valuation.read',
              'reports.assets.read',
              'reports.asset_valuation.read',
              'reports.responsibilities.read',
              'reports.asset_maintenances.read',
              'inventory.asset_depreciation.read',
            ],
          },
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/modules/profile/ProfileView.vue'),
        },
        {
          path: 'maintenance/recycle-bin',
          name: 'recycle-bin',
          component: () => import('@/modules/maintenance/RecycleBinView.vue'),
          meta: { superAdminOnly: true },
        },
        {
          path: 'forbidden',
          name: 'forbidden',
          component: () => import('@/views/ForbiddenView.vue'),
        },
        // Compatibility redirects from the first AIMS prototype.
        { path: 'master/:key', redirect: (to) => `/catalog/${String(to.params.key)}` },
        { path: 'notifications', redirect: '/operations/notifications' },
      ],
    },
    { path: '/:pathMatch(.*)*', component: () => import('@/views/NotFoundView.vue') },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    if (to.path === '/login' && tokenStorage.accessToken()) return '/'
    return true
  }
  if (!tokenStorage.accessToken()) return { path: '/login', query: { redirect: to.fullPath } }
  if (!auth.user) {
    const valid = await auth.restoreSession()
    if (!valid) return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'forbidden') return true
  if (to.meta.superAdminOnly && !auth.isSuperAdmin) return { name: 'forbidden' }
  const permission = to.meta.permission as string | undefined
  if (permission && !auth.can(permission)) return { name: 'forbidden' }
  const any = to.meta.permissionAny as string[] | undefined
  if (any?.length && !any.some((item) => auth.can(item))) return { name: 'forbidden' }
  return true
})

export default router
