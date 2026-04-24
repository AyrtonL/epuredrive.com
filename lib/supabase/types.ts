export interface PickupLocation {
  label: string
  address: string
  note: string
  fee: number
  maps_query: string
}

export interface ExperiencePillar {
  title: string
  body: string
}

export interface HowItWorksStep {
  icon: string  // emoji or short label
  title: string
  body: string
}

export interface Tenant {
  id: string
  name: string
  slug: string
  plan: string | null
  logo_url: string | null
  primary_color: string | null
  accent_color: string | null
  brand_name: string | null
  tagline: string | null
  description: string | null
  hero_image_url: string | null
  whatsapp_phone: string | null
  business_hours: string | null
  pickup_locations: PickupLocation[]
  company_address: string | null
  company_phone: string | null
  agreement_clauses: string | null
  agreement_template_url: string | null
  fuel_charge_per_level: number | null
  experience_pillars: ExperiencePillar[] | null
  how_it_works: HowItWorksStep[] | null
  plan_limit_warning_last_count: number | null
  square_merchant_id: string | null
  square_location_id: string | null
  payment_processor: string | null  // 'stripe' | 'square'
  site_theme: 'dark' | 'light'
}

export interface Car {
  id: number
  make: string
  model: string
  model_full: string | null
  year: number | null
  daily_rate: number | null
  image_url: string | null
  gallery: string[] | null
  category: string | null
  badge: string | null
  seats: number | null
  transmission: string | null
  hp: string | null
  features: string[] | null
  description: string | null
  tenant_id: string | null
  status: string | null
  turo_vehicle_id: string | null
  mileage: number | null
  vin: string | null
  color: string | null
  plate: string | null
  // Telematics (Bouncie) — present when car is linked to a device
  telematics_device_id: string | null
  last_seen_at: string | null
  last_lat: number | null
  last_lon: number | null
}

export interface Reservation {
  id: number
  booking_code: string
  car_id: number | null
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  pickup_date: string | null
  pickup_time: string | null
  return_date: string | null
  return_time: string | null
  pickup_location: string | null
  total_amount: number | null
  status: string | null
  source: string | null
  notes: string | null
  tenant_id: string | null
  created_at?: string
  license_number: string | null
  license_state: string | null
  license_country: string | null
  insurance_provider: string | null
  insurance_policy_number: string | null
  agreement_token: string | null
  agreement_sent_at: string | null
  agreement_signed_at: string | null
  agreement_signed_ip: string | null
  agreement_pdf_url: string | null
  agreement_signature_url: string | null
  // renter extras
  customer_dob: string | null
  customer_address: string | null
  // charges
  security_deposit: number | null
  surcharge: number | null
  amount_outstanding: number | null
  // vehicle state
  odometer_out: number | null
  odometer_in: number | null
  fuel_out: string | null
  fuel_in: string | null
  // locations
  return_location: string | null
  // damage report
  damage_checkin: string | null
  damage_checkout: string | null
  // rental extras / add-ons
  extras: ReservationExtra[] | null
  // review request email tracking
  review_email_sent_at: string | null
  // payment IDs
  stripe_payment_id: string | null
  stripe_session_id: string | null
  square_payment_id: string | null
  // tenant counter-signature (close-out)
  tenant_signed_at: string | null
  tenant_signature_url: string | null
  tenant_signed_by: string | null
}

export interface Customer {
  id: number
  name: string
  email: string | null
  phone: string | null
  tenant_id: string | null
  created_at?: string
}

export interface Consignment {
  id: number
  car_id: number | null
  owner_name: string | null
  owner_email: string | null
  owner_phone: string | null
  owner_percentage: number | null
  contract_start: string | null
  contract_end: string | null
  notes: string | null
  tenant_id: string | null
}

export interface Transaction {
  id: number
  transaction_date: string | null
  type: string | null
  category: string | null
  amount: number | null
  description: string | null
  payment_method: string | null
  car_id: number | null
  tenant_id: string | null
}

export interface CarService {
  id: number
  car_id: number | null
  service_date: string | null
  service_type: string | null
  description: string | null
  cost: number | null
  mileage: number | null
  mileage_interval: number | null
  provider: string | null
  next_service_date: string | null
  next_service_mileage: number | null
  notes: string | null
  tenant_id: string | null
}


export interface BlockedDate {
  id: number
  start_date: string
  end_date: string
  car_id: number | null
  reason: string | null
  tenant_id: string | null
}

export interface Profile {
  id: string
  full_name: string | null
  role: string | null
  tenant_id: string | null
  created_at?: string
  invited_by_user_id: string | null
  invite_accepted_notified_at: string | null
}

export interface RentalExtra {
  id: string
  tenant_id: string
  name: string
  description: string | null
  pricing_type: 'per_day' | 'flat'
  price: number
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ReservationExtra {
  extra_id: string
  name: string
  pricing_type: 'per_day' | 'flat'
  unit_price: number
  quantity: number  // days for per_day, 1 for flat
  subtotal: number
}

export interface TaxSetting {
  id: string
  tenant_id: string
  name: string
  rate: number        // decimal, e.g. 0.07 = 7%
  applies_to: string  // 'all' | 'rental' | 'service' | 'addon'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WebhookEndpoint {
  id: number
  tenant_id: string
  url: string
  description: string | null
  secret: string
  events: string[]
  active: boolean
  created_at: string
  updated_at: string
}

export interface WebhookDelivery {
  id: number
  endpoint_id: number
  tenant_id: string
  event_type: string
  payload: Record<string, unknown>
  status_code: number | null
  response_body: string | null
  error_message: string | null
  attempt: number
  delivered_at: string
}

// ── Telematics (Bouncie) ───────────────────────────────────────────────

export type TelematicsConnectionStatus = 'active' | 'expired' | 'disconnected' | 'error'

export interface TelematicsConnection {
  id: string
  tenant_id: string
  provider: 'bouncie'
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  scope: string | null
  account_email: string | null
  connected_at: string
  last_sync_at: string | null
  status: TelematicsConnectionStatus
  error_message: string | null
}

export interface TelematicsDevice {
  id: string
  tenant_id: string
  connection_id: string
  imei: string
  vin: string | null
  nickname: string | null
  car_id: number | null
  last_seen_at: string | null
  battery_voltage: number | null
  online: boolean
  created_at: string
}

export interface TelematicsPosition {
  id: number
  tenant_id: string
  device_id: string
  car_id: number | null
  recorded_at: string
  lat: number
  lon: number
  speed_mph: number | null
  heading: number | null
  odometer_mi: number | null
  ignition: boolean | null
}

export interface TelematicsTrip {
  id: string
  tenant_id: string
  device_id: string
  car_id: number | null
  // reservations.id is uuid in this schema, so reservation_id is a string
  reservation_id: string | null
  started_at: string
  ended_at: string | null
  start_lat: number | null
  start_lon: number | null
  end_lat: number | null
  end_lon: number | null
  distance_mi: number | null
  duration_s: number | null
  max_speed_mph: number | null
  hard_braking_count: number
  hard_accel_count: number
  fuel_consumed_gal: number | null
  bouncie_trip_id: string | null
}

export type TelematicsEventType =
  | 'ignition_on' | 'ignition_off'
  | 'trip_start' | 'trip_end'
  | 'geofence_enter' | 'geofence_exit'
  | 'speed_exceeded'
  | 'hard_braking' | 'hard_accel'
  | 'dtc_new' | 'dtc_cleared'
  | 'battery_low'
  | 'offline' | 'online'
  | 'connection_expired'

export type TelematicsSeverity = 'info' | 'warning' | 'critical'

export interface TelematicsEvent {
  id: string
  tenant_id: string
  device_id: string | null
  car_id: number | null
  event_type: TelematicsEventType
  severity: TelematicsSeverity
  occurred_at: string
  payload: Record<string, unknown>
  acknowledged_at: string | null
  acknowledged_by: string | null
}

export interface GeoJsonPolygon {
  type: 'Polygon'
  coordinates: number[][][]  // array of rings; each ring is [lon, lat] pairs, first == last
}

export interface TelematicsGeofence {
  id: string
  tenant_id: string
  name: string
  kind: 'allowed' | 'forbidden'
  polygon: GeoJsonPolygon
  applies_to: 'all' | 'specific'
  car_ids: number[]
  speed_limit_mph: number | null
  active: boolean
  created_at: string
}
