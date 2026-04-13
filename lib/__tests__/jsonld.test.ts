import {
  buildOrganizationSchema,
  buildWebSiteSchema,
  buildSoftwareApplicationSchema,
  buildFAQPageSchema,
} from '../utils/jsonld'

describe('buildOrganizationSchema', () => {
  it('returns correct @type and required fields', () => {
    const schema = buildOrganizationSchema()
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('Organization')
    expect(schema.name).toBe('éPure Drive')
    expect(schema.url).toBe('https://epuredrive.com')
    expect(schema.logo).toBe('https://epuredrive.com/favicon.svg')
    expect(schema.contactPoint).toMatchObject({
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@epuredrive.com',
    })
  })
})

describe('buildWebSiteSchema', () => {
  it('returns correct @type and potentialAction', () => {
    const schema = buildWebSiteSchema()
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('WebSite')
    expect(schema.name).toBe('éPure Drive')
    expect(schema.url).toBe('https://epuredrive.com')
    expect(schema.potentialAction).toMatchObject({
      '@type': 'SearchAction',
      target: expect.stringContaining('epuredrive.com'),
    })
  })
})

describe('buildSoftwareApplicationSchema', () => {
  it('returns correct @type, category, and free offer', () => {
    const schema = buildSoftwareApplicationSchema()
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('SoftwareApplication')
    expect(schema.applicationCategory).toBe('BusinessApplication')
    expect(schema.operatingSystem).toBe('Web')
    expect(schema.offers).toMatchObject({
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    })
    expect(schema.description).toContain('car rental')
  })
})

describe('buildFAQPageSchema', () => {
  it('returns FAQPage with mainEntity array', () => {
    const faqs = [
      { q: 'What is it?', a: 'A SaaS platform.' },
      { q: 'Is it free?', a: 'Yes, up to 5 vehicles.' },
    ]
    const schema = buildFAQPageSchema(faqs)
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('FAQPage')
    expect(schema.mainEntity).toHaveLength(2)
    expect(schema.mainEntity[0]).toMatchObject({
      '@type': 'Question',
      name: 'What is it?',
      acceptedAnswer: { '@type': 'Answer', text: 'A SaaS platform.' },
    })
  })

  it('returns empty mainEntity for empty input', () => {
    const schema = buildFAQPageSchema([])
    expect(schema.mainEntity).toHaveLength(0)
  })
})
