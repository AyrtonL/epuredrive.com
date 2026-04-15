import type { HowItWorksStep } from '@/lib/supabase/types'

export const DEFAULT_HOW_IT_WORKS: HowItWorksStep[] = [
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
  {
    id: 'pickup',
    label: 'Pickup & Go',
    steps: [
      {
        icon: '01',
        title: 'Pick Your Car',
        body: 'Browse the fleet and reserve the vehicle you want in a few clicks — no back-and-forth, no phone calls.',
      },
      {
        icon: '02',
        title: 'Sign & Pay',
        body: 'Review the rental agreement online, sign digitally, and handle the deposit before you arrive.',
      },
      {
        icon: '03',
        title: 'Pick Up at Our Office',
        body: 'Swing by our location at the agreed time. Quick walk-around, keys in hand, and you are on your way.',
      },
    ],
  },
]
