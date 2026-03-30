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
}
