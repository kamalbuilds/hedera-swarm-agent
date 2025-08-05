'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Brain, 
  Trophy, 
  Zap, 
  TrendingUp,
  Star,
  GitBranch
} from 'lucide-react'
import { motion } from 'framer-motion'

interface AgentDNA {
  generation: number
  parentIds: string[]
  fitness: number
  traits: string[]
}

interface Agent {
  id: string
  name: string
  owner: string
  reputation: number
  tasksCompleted: number
  successRate: number
  capabilities: string[]
  dna?: AgentDNA
  avatar?: string
  isElite: boolean
}

const mockAgents: Agent[] = [
  {
    id: '0.0.123456',
    name: 'QuantumAnalyst',
    owner: '0.0.111111',
    reputation: 185,
    tasksCompleted: 342,
    successRate: 0.94,
    capabilities: ['financial_analysis', 'market_prediction', 'risk_assessment'],
    dna: {
      generation: 5,
      parentIds: ['0.0.123455', '0.0.123454'],
      fitness: 92,
      traits: ['analytical_precision', 'speed_optimization']
    },
    isElite: true
  },
  {
    id: '0.0.234567',
    name: 'SecurityGuardian',
    owner: '0.0.222222',
    reputation: 172,
    tasksCompleted: 289,
    successRate: 0.96,
    capabilities: ['smart_contract_analysis', 'security_audit', 'vulnerability_detection'],
    dna: {
      generation: 4,
      parentIds: ['0.0.234566'],
      fitness: 88,
      traits: ['pattern_recognition', 'threat_detection']
    },
    isElite: true
  },
  {
    id: '0.0.345678',
    name: 'DataMiner',
    owner: '0.0.333333',
    reputation: 156,
    tasksCompleted: 198,
    successRate: 0.89,
    capabilities: ['data_analysis', 'pattern_recognition', 'statistical_modeling'],
    dna: {
      generation: 3,
      parentIds: ['0.0.345677', '0.0.345676'],
      fitness: 85,
      traits: ['deep_learning', 'parallel_processing']
    },
    isElite: false
  }
]

function AgentCard({ agent, index }: { agent: Agent; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
    >
      <Card className="agent-card relative overflow-hidden">
        {agent.isElite && (
          <div className="absolute top-2 right-2">
            <Badge variant="default" className="bg-gradient-to-r from-yellow-500 to-orange-500">
              <Star className="mr-1 h-3 w-3" />
              Elite
            </Badge>
          </div>
        )}
        
        <CardHeader>
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={agent.avatar} />
              <AvatarFallback>
                <Brain className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <CardTitle className="text-lg">{agent.name}</CardTitle>
              <CardDescription>
                Owned by {agent.owner.slice(0, 8)}...
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <span>Rep: {agent.reputation}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span>{agent.tasksCompleted} tasks</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span>{(agent.successRate * 100).toFixed(0)}% success</span>
            </div>
            {agent.dna && (
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <span>Gen {agent.dna.generation}</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-1">
            {agent.capabilities.slice(0, 3).map((cap) => (
              <Badge key={cap} variant="secondary" className="text-xs">
                {cap}
              </Badge>
            ))}
            {agent.capabilities.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{agent.capabilities.length - 3}
              </Badge>
            )}
          </div>
          
          {agent.dna && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                DNA Fitness: {agent.dna.fitness}% • Traits: {agent.dna.traits.join(', ')}
              </p>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1">
              View Profile
            </Button>
            <Button size="sm" variant="default" className="flex-1">
              Deploy Agent
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function AgentGallery() {
  return (
    <section className="container mx-auto px-4 py-12">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Elite Agents</h2>
          <p className="text-muted-foreground">
            Top-performing agents with proven track records and evolved capabilities
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {mockAgents.map((agent, index) => (
            <AgentCard key={agent.id} agent={agent} index={index} />
          ))}
        </div>
        
        <div className="text-center">
          <Button variant="outline" size="lg">
            Browse All Agents
          </Button>
        </div>
      </div>
    </section>
  )
}