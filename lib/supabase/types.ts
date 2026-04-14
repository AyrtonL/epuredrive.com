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
  experience_pillars: ExperiencePillar[] | null
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
}

export interface Reservation {
  id: number
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
}
