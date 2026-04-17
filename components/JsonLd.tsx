interface JsonLdProps {
  schema: Record<string, unknown>
}

export default function JsonLd({ schema }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // Content is always a static schema object built server-side — never user input.
      // eslint-disable-next-line react/no-danger
      {...{ dangerouslySetInnerHTML: { __html: JSON.stringify(schema).replace(/</g, '\\u003c').replace(/>/g, '\\u003e') } }}
    />
  )
}
