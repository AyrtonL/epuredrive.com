// app/layout.tsx
// Root layout — each route group defines its own <html> and <body>
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
