export interface Tenant {
  id: string
  name: string
  slug: string
  plan: string | null
  logo_url: string | null
  primary_color: string | null
  accent_color: string | null
  brand_name: string | null
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
  category: string | null
  amount: number | null
  description: string | null
  car_id: number | null
  tenant_id: string | null
}

export interface CarService {
  id: number
  car_id: number | null
  service_date: string | null
  service_type: string | null
  description: string | null
  amount: number | null
  provider: string | null
  next_service_date: string | null
  next_service_mileage: number | null
  tenant_id: string | null
}


export interface Profile {
  id: string
  full_name: string | null
  role: string | null
  tenant_id: string | null
  created_at?: string
}
