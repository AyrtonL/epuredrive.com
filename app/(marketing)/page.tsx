// app/(marketing)/page.tsx
import type { Metadata } from 'next'
import HeroSection from './landing/HeroSection'
import IntegrationsStrip from './landing/IntegrationsStrip'
import FeaturesSection from './landing/FeaturesSection'
import ComparisonSection from './landing/ComparisonSection'
import ProductCarousel from './landing/ProductCarousel'
import PricingSection from './landing/PricingSection'
import FinalCTA from './landing/FinalCTA'
import ContactSection from '@/components/marketing/ContactSection'
import JsonLd from '@/components/JsonLd'
import {
  buildOrganizationSchema,
  buildWebSiteSchema,
  buildSoftwareApplicationSchema,
} from '@/lib/utils/jsonld'

export const metadata: Metadata = {
  title: 'éPure Drive — Premium Fleet Platform for Car Rental Businesses',
  description:
    'The premium fleet platform. Manage your fleet, accept online bookings, and launch a branded rental site — with zero transaction fees on Max. Built for independent car rental operators.',
}

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <IntegrationsStrip />
      <FeaturesSection />
      <ComparisonSection />
      <ProductCarousel />
      <PricingSection />
      <FinalCTA />
      <ContactSection />

      <JsonLd schema={buildOrganizationSchema()} />
      <JsonLd schema={buildWebSiteSchema()} />
      <JsonLd schema={buildSoftwareApplicationSchema()} />
    </>
  )
}
