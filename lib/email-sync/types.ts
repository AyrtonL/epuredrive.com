export interface EmailSync {
  id: string
  tenant_id: string
  gmail_address: string
  access_token: string
  refresh_token: string
  app_specific_password?: string
  provider?: string
  last_checked?: string
}

export interface ParsedEmail {
  type: 'confirm' | 'modify' | 'cancel' | 'return'
  messageId: string
  reservationId: string | null
  customer_name: string | null
  vehicle_name?: string
  pickup_date: string | null
  return_date: string | null
  pickup_time?: string | null // NEW — 24h "HH:MM", Turo leaves undefined
  return_time?: string | null // NEW
  customer_phone?: string | null // NEW
  customer_dob?: string | null // NEW — "YYYY-MM-01"
  total_amount?: number | null
  source?: 'turo' | 'upcar'
  status?: string
}

export interface ExistingReservation {
  id: string
  status: string | null
}

export interface PollConfig {
  fromAddress: string
  parse: (body: string, subject: string, messageId: string) => ParsedEmail | null
}
