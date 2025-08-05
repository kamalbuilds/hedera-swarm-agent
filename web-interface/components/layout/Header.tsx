'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Brain, 
  Menu, 
  Wallet, 
  Settings, 
  LogOut,
  Plus,
  Activity
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export function Header() {
  const [isConnected, setIsConnected] = useState(false)
  const [accountId, setAccountId] = useState<string>('')

  const connectWallet = async () => {
    // In production, integrate with HashPack or MetaMask
    setIsConnected(true)
    setAccountId('0.0.12345')
  }

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
          {isConnected ? (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href="/create-agent">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Agent
                </Link>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Wallet className="mr-2 h-4 w-4" />
                    {accountId.slice(0, 8)}...
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Activity className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsConnected(false)}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button onClick={connectWallet} variant="gradient">
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}