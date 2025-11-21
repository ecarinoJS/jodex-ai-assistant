import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { JodexProvider } from '@/components/JodexProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Jodex AI Assistant - Demo',
  description: 'Voice-enabled AI assistant for agricultural supply chain management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <JodexProvider>
          {children}
        </JodexProvider>
      </body>
    </html>
  )
}