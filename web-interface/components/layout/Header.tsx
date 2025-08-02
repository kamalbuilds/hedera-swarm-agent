'use client'

import { Button } from '@/components/ui/button'
import { WalletConnectButton } from '@/components/wallet/WalletConnectButton'
import { useWallet } from '@/hooks/useWallet'
import { 
  Brain, 
  Plus,
  Activity
} from 'lucide-react'
import Link from 'next/link'

export function Header() {
  const { isConnected } = useWallet()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Brain className="h-6 w-6 text-hedera-purple" />
            <span className="hidden font-bold sm:inline-block gradient-text">
              HederaSwarm
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/swarm"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Swarm
            </Link>
            <Link
              href="/agents"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Agents
            </Link>
            <Link
              href="/tasks"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Tasks
            </Link>
            <Link
              href="/knowledge"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Knowledge
            </Link>
          </nav>
        </div>
        
        <div className="ml-auto flex items-center space-x-4">
          {isConnected && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href="/create-agent">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Agent
                </Link>
              </Button>
              
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard">
                  <Activity className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
            </>
          )}
          
          <WalletConnectButton />
        </div>
      </div>
    </header>
  )
}