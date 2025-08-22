import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cerebra-MD | HHA Medicine Analytics',
  description: 'Healthcare analytics dashboard for HHA Medicine revenue cycle management',
  keywords: ['healthcare', 'analytics', 'revenue cycle', 'HHA Medicine', 'medical billing'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}