import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Header } from '@/components/layout/Header'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HederaSwarm - Decentralized AI Agent Orchestration',
  description: 'Build, deploy, and orchestrate autonomous AI agent swarms on Hedera',
  keywords: ['Hedera', 'AI', 'Agents', 'Blockchain', 'Swarm Intelligence'],
  authors: [{ name: 'HederaSwarm Team' }],
  openGraph: {
    title: 'HederaSwarm',
    description: 'Decentralized AI Agent Orchestration Platform',
    type: 'website',
    locale: 'en_US',
    siteName: 'HederaSwarm',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="relative min-h-screen bg-background">
            <Header />
            <main className="relative">
              {children}
            </main>
            <Toaster />
          </div>
        </Providers>
      </body>
    </html>
  )
}