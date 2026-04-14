import type { HowItWorksStep } from '@/lib/supabase/types'

export const DEFAULT_HOW_IT_WORKS: HowItWorksStep[] = [
  {
    icon: '01',
    title: 'Choose Your Vehicle',
    body: 'Browse our curated fleet and select the vehicle that fits your occasion — from weekend escapes to business travel.',
  },
  {
    icon: '02',
    title: 'Book Instantly',
    body: 'Submit your dates online. No phone tag, no waiting — your reservation is confirmed in minutes.',
  },
  {
    icon: '03',
    title: 'We Deliver',
    body: 'Your vehicle arrives clean, fueled, and ready at your location. Keys in hand, zero hassle.',
  },
]

export const HOW_IT_WORKS_TEMPLATES: { id: string; label: string; steps: HowItWorksStep[] }[] = [
  {
    id: 'default',
    label: 'Simple 3 Steps',
    steps: DEFAULT_HOW_IT_WORKS,
  },
  {
    id: 'concierge',
    label: 'Concierge Experience',
    steps: [
      {
        icon: '01',
        title: 'Tell Us Your Needs',
        body: 'Share your dates, destination, and preferences. Our team curates the perfect vehicle for your trip.',
      },
      {
        icon: '02',
        title: 'We Handle Everything',
        body: 'From insurance paperwork to custom add-ons — we take care of every detail so you can focus on the journey.',
      },
      {
        icon: '03',
        title: 'Enjoy the Drive',
        body: 'Your vehicle is delivered immaculate and ready. 24/7 support is always just a message away.',
      },
    ],
  },
  {
    id: 'corporate',
    label: 'Corporate & Events',
    steps: [
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
]
