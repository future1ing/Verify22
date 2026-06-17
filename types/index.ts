export type Plan     = 'free' | 'starter' | 'pro' | 'business'
export type Severity = 'critical' | 'warning' | 'info'
export type Role     = 'client' | 'admin'
export type Channel  = 'email' | 'whatsapp' | 'sms'

export const PLAN_PRICES: Record<Plan, number> = {
  free: 0, starter: 39, pro: 99, business: 249,
}

export const PLAN_LIMITS: Record<Plan, { countries: number; severities: Severity[]; channels: Channel[] }> = {
  free:     { countries: 1,  severities: ['critical'],                    channels: ['email'] },
  starter:  { countries: 2,  severities: ['critical', 'warning'],         channels: ['email', 'whatsapp'] },
  pro:      { countries: 4,  severities: ['critical', 'warning', 'info'], channels: ['email', 'whatsapp', 'sms'] },
  business: { countries: 99, severities: ['critical', 'warning', 'info'], channels: ['email', 'whatsapp', 'sms'] },
}

export interface Profile {
  id: string
  email: string
  name: string
  phone?: string
  country: string
  language: string
  role: Role
  plan: Plan
  is_active: boolean
  crops: string              // comma-separated: "tomate,poivron"
  countries_watched: string  // comma-separated: "EU,MA"
  notify_channels: string    // comma-separated: "email,whatsapp"
  min_severity: Severity
  stripe_customer_id?: string
  stripe_subscription_id?: string
  plan_expires_at?: string
  created_at: string
  updated_at: string
}

export interface Alert {
  id: number
  user_id: string
  event_type: string
  severity: Severity
  substance_name: string
  substance_id?: string
  product_code?: string
  product_name?: string
  old_mrl?: string
  new_mrl?: string
  regulation?: string
  description: string
  country: string
  source: string
  detected_at?: string
  is_read: boolean
  created_at: string
}

export interface AlertStats {
  total: number
  unread: number
  critical: number
  warning: number
  info: number
}

export interface Snapshot {
  id: number
  snapshot_id: string
  country: string
  source: string
  db_creation_date?: string
  extracted_at: string
  total_substances: number
  total_records: number
  is_current: boolean
}
