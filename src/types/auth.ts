export interface CompanyOption {
  id_company?: number
  company_id?: number
  id?: number
  company_code?: string
  company_name?: string
  code?: string
  name?: string
}

export interface AccessOption {
  id: number
  code?: string
  name: string
  label?: string
  company_id?: number
  company_code?: string
  company_name?: string
}

export interface UserProfile {
  user_id?: string
  id?: string
  email?: string
  full_name?: string
  name?: string
  roles?: string[]
  permissions?: string[]
  company_id?: number
  company_name?: string
  location_id?: number
  location_name?: string
  category_group_id?: number
  category_group_name?: string
  location_type_code?: string
  is_central_location?: boolean
  is_global_super_admin?: boolean
  has_context?: boolean
}

export interface ContextSwitchRequest {
  location_id: number
  category_group_id: number
  current_refresh_token?: string
}

export interface InitialLoginResponse extends UserProfile {
  access_token: string
  token_type?: string
  expires_in?: number
  need_context?: boolean
  locations?: AccessOption[]
  category_groups?: AccessOption[]
}

export interface SessionResponse extends UserProfile {
  access_token: string
  refresh_token: string
  token_type?: string
  expires_in?: number
}
