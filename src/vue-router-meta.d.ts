import 'vue-router'
export {}
declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    permission?: string
    permissionAny?: string[]
    superAdminOnly?: boolean
  }
}
