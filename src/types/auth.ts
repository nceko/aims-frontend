export interface CompanyOption {
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
  company_id?: number
}

export interface UserProfile {
  user_id?: string
  id?: string
  email: string
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
}

export interface InitialLoginResponse {
  access_token: string
  token_type?: string
  expires_in?: number
  user?: UserProfile
  locations?: AccessOption[]
  category_groups?: AccessOption[]
}

export interface SessionResponse extends InitialLoginResponse {
  refresh_token: string
}
