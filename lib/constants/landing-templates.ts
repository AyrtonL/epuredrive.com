import type { ExperiencePillar, HowItWorksStep } from '@/lib/supabase/types'

export interface LandingTemplate {
  id: string
  label: string
  description: string
  tagline: string
  siteDescription: string
  pillars: ExperiencePillar[]
  howItWorks: HowItWorksStep[]
}

export const LANDING_TEMPLATES: LandingTemplate[] = [
  {
    id: 'luxury',
    label: 'Luxury',
    description: 'Premium tone, white-glove delivery, exclusivity.',
    tagline: 'Curated for the Extraordinary.',
    siteDescription:
      'Experience a fleet handpicked for discerning drivers. Every vehicle is detailed, delivered, and supported by a dedicated concierge — because the journey should feel as remarkable as the destination.',
    pillars: [
      {
        title: 'White-Glove Delivery',
        body: 'Your vehicle arrives spotless, fueled, and ready. No rental counters, no hidden queues — just a seamless handoff at your location.',
      },
      {
        title: 'Curated Selection',
        body: 'Every vehicle in our fleet is chosen for its presence, performance, and condition. We don\u2019t do ordinary.',
      },
      {
        title: 'Transparent Pricing',
        body: 'What you see is what you pay. No platform markups, no last-minute surprise fees — direct pricing saves you up to 25%.',
      },
    ],
    howItWorks: [
      {
        icon: '01',
        title: 'Choose Your Vehicle',
        body: 'Browse our curated fleet and select the vehicle that fits your occasion — from weekend escapes to business travel.',
      },
      {
        icon: '02',
        title: 'Book Online',
        body: 'Submit your dates in a few clicks. We confirm your reservation quickly and send you everything you need.',
      },
      {
        icon: '03',
        title: 'Pick Up & Go',
        body: 'Meet us at the pickup point or request delivery. Your vehicle is clean, fueled, and ready when you are.',
      },
    ],
  },
  {
    id: 'corporate',
    label: 'Corporate',
    description: 'Professional, reliable, fleet-ready.',
    tagline: 'Your Fleet, On Demand.',
    siteDescription:
      'Dependable vehicles for teams, executives, and events. Streamlined booking, flexible terms, and a fleet that scales with your business — no long-term commitments required.',
    pillars: [
      {
        title: 'Fleet Flexibility',
        body: 'Scale up or down as your schedule demands. One vehicle or twenty — we adapt to your timeline, not the other way around.',
      },
      {
        title: 'Simplified Billing',
        body: 'Consolidated invoices, transparent rates, and dedicated account support. Finance will thank you.',
      },
      {
        title: 'Reliable & On Time',
        body: 'Vehicles arrive inspected, insured, and on schedule. Downtime is not in our vocabulary.',
      },
    ],
    howItWorks: [
      {
        icon: '01',
        title: 'Request a Quote',
        body: 'Tell us your event, headcount, and schedule. We design a fleet solution tailored to your business.',
      },
      {
        icon: '02',
        title: 'Confirm & Sign',
        body: 'Review your agreement online and sign in seconds. No paperwork, no back-and-forth.',
      },
      {
        icon: '03',
        title: 'Fleet on Demand',
        body: 'Vehicles arrive on time, every time. Trusted by corporate teams and event coordinators.',
      },
    ],
  },
  {
    id: 'budget',
    label: 'Budget',
    description: 'Affordable, transparent, no-frills.',
    tagline: 'Drive More, Spend Less.',
    siteDescription:
      'Quality vehicles at honest prices — no hidden fees, no platform markups. Just straightforward rentals that let you hit the road without breaking the bank.',
    pillars: [
      {
        title: 'No Hidden Fees',
        body: 'The price you see is the price you pay. No surprise charges at pickup, no inflated insurance add-ons.',
      },
      {
        title: 'Well-Maintained Fleet',
        body: 'Every vehicle is serviced regularly, cleaned before each trip, and backed by roadside assistance.',
      },
      {
        title: 'Simple Booking',
        body: 'Pick your car, choose your dates, and you\u2019re set. No accounts, no loyalty programs, no friction.',
      },
    ],
    howItWorks: [
      {
        icon: '01',
        title: 'Pick Your Car',
        body: 'Browse our fleet and find the right vehicle for your trip. Filter by price, size, or availability.',
      },
      {
        icon: '02',
        title: 'Book & Pay',
        body: 'Reserve in minutes with transparent pricing. You\u2019ll know exactly what you owe before you confirm.',
      },
      {
        icon: '03',
        title: 'Hit the Road',
        body: 'Pick up at our location or request delivery. Quick walkthrough, keys in hand, and you\u2019re off.',
      },
    ],
  },
  {
    id: 'dealership',
    label: 'Dealership',
    description: 'Inventory-focused, variety, selection.',
    tagline: 'Find Your Perfect Ride.',
    siteDescription:
      'From sedans to SUVs, our lot has the vehicle you need. Rent by the day, weekend, or month — browse the full inventory online and reserve in minutes.',
    pillars: [
      {
        title: 'Wide Selection',
        body: 'Sedans, trucks, SUVs, and more — all under one roof. Whatever you need, we\u2019ve got it ready to go.',
      },
      {
        title: 'Flexible Terms',
        body: 'Daily, weekly, or monthly rentals with no long-term lock-in. Extend or return early with no penalties.',
      },
      {
        title: 'Local & Trusted',
        body: 'A family-run operation that treats every customer by name. Real people, real service, real accountability.',
      },
    ],
    howItWorks: [
      {
        icon: '01',
        title: 'Browse the Lot',
        body: 'View our full inventory online with real photos, specs, and daily rates. No guesswork.',
      },
      {
        icon: '02',
        title: 'Reserve Online',
        body: 'Pick your dates and submit a reservation. We\u2019ll confirm availability and send your agreement.',
      },
      {
        icon: '03',
        title: 'Pick Up at Our Office',
        body: 'Swing by at the agreed time. Quick walk-around, sign the paperwork, and drive off the lot.',
      },
    ],
  },
]
