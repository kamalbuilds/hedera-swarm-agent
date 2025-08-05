'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { 
  Users, 
  Activity, 
  Zap, 
  TrendingUp,
  Brain,
  Award
} from 'lucide-react'

interface SwarmStats {
  activeAgents: number
  activeTasks: number
  totalTransactions: number
  averageConsensusTime: number
  totalKnowledgeEntries: number
  topReputation: number
}

async function fetchSwarmStats(): Promise<SwarmStats> {
  // In production, fetch from your API
  return {
    activeAgents: 127,
    activeTasks: 34,
    totalTransactions: 15420,
    averageConsensusTime: 8.3,
    totalKnowledgeEntries: 892,
    topReputation: 185
  }
}

export function Stats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['swarm-stats'],
    queryFn: fetchSwarmStats,
    refetchInterval: 10000, // Refresh every 10 seconds
  })

  const statCards = [
    {
      title: 'Active Agents',
      value: stats?.activeAgents || 0,
      icon: Users,
      change: '+12%',
      trend: 'up'
    },
    {
      title: 'Active Tasks',
      value: stats?.activeTasks || 0,
      icon: Activity,
      change: '+8%',
      trend: 'up'
    },
    {
      title: 'Total Transactions',
      value: stats?.totalTransactions || 0,
      icon: Zap,
      change: '+23%',
      trend: 'up'
    },
    {
      title: 'Avg Consensus Time',
      value: `${stats?.averageConsensusTime || 0}s`,
      icon: TrendingUp,
      change: '-15%',
      trend: 'down'
    },
    {
      title: 'Knowledge Entries',
      value: stats?.totalKnowledgeEntries || 0,
      icon: Brain,
      change: '+18%',
      trend: 'up'
    },
    {
      title: 'Top Reputation',
      value: stats?.topReputation || 0,
      icon: Award,
      change: '+5%',
      trend: 'up'
    }
  ]

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : stat.value.toLocaleString()}
              </div>
              <p className={`text-xs ${
                stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
              }`}>
                {stat.change} from last week
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}