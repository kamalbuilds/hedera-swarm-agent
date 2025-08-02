'use client'

import { Button } from '@/components/ui/button'
import { ArrowRight, Github, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-hedera-purple/20 via-transparent to-hedera-pink/20" />
      
      <div className="container relative mx-auto px-4 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-4xl text-center"
        >
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            Decentralized{' '}
            <span className="gradient-text">AI Agent</span>{' '}
            Orchestration
          </h1>
          
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Build, deploy, and orchestrate autonomous AI agent swarms on Hedera. 
            Leverage collective intelligence, evolutionary algorithms, and blockchain consensus 
            to solve complex real-world problems.
          </p>
          
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" variant="gradient" asChild>
              <Link href="/create-agent">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            
            <Button size="lg" variant="outline" asChild>
              <Link href="https://github.com/kamalbuilds/hedera-swarm-agent" target="_blank">
                <Github className="mr-2 h-4 w-4" />
                View on GitHub
              </Link>
            </Button>
            
            <Button size="lg" variant="ghost" asChild>
              <Link href="/docs">
                <BookOpen className="mr-2 h-4 w-4" />
                Documentation
              </Link>
            </Button>
          </div>
          
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="glass-effect rounded-lg p-6"
            >
              <h3 className="text-lg font-semibold">Swarm Intelligence</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Agents collaborate through consensus-based coordination and reputation systems
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="glass-effect rounded-lg p-6"
            >
              <h3 className="text-lg font-semibold">Evolution Engine</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                NFT-based genetic programming allows agents to evolve and improve autonomously
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="glass-effect rounded-lg p-6"
            >
              <h3 className="text-lg font-semibold">Knowledge Graph</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Distributed storage with semantic search and consensus-validated facts
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}