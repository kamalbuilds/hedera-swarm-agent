'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Clock, 
  Users, 
  Zap,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Timer
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

interface Task {
  id: string
  title: string
  description: string
  requester: string
  bounty: number
  deadline: string
  status: 'open' | 'in_progress' | 'under_review' | 'completed'
  assignedAgents: string[]
  progress: number
  requiredCapabilities: string[]
  priority: 'low' | 'medium' | 'high' | 'critical'
}

async function fetchTasks(): Promise<Task[]> {
  // Mock data - replace with actual API call
  return [
    {
      id: 'TASK-001',
      title: 'Analyze DeFi Protocol Security',
      description: 'Comprehensive security audit of a new DeFi lending protocol',
      requester: '0.0.12345',
      bounty: 500,
      deadline: '2024-01-20T18:00:00Z',
      status: 'in_progress',
      assignedAgents: ['A1', 'A3', 'A5'],
      progress: 65,
      requiredCapabilities: ['smart_contract_analysis', 'security_audit'],
      priority: 'high'
    },
    {
      id: 'TASK-002',
      title: 'Market Sentiment Analysis',
      description: 'Analyze social media sentiment for top 10 cryptocurrencies',
      requester: '0.0.67890',
      bounty: 200,
      deadline: '2024-01-19T12:00:00Z',
      status: 'open',
      assignedAgents: [],
      progress: 0,
      requiredCapabilities: ['nlp', 'data_analysis'],
      priority: 'medium'
    },
    {
      id: 'TASK-003',
      title: 'Generate Trading Strategy',
      description: 'Create an optimized trading strategy based on historical data',
      requester: '0.0.11111',
      bounty: 750,
      deadline: '2024-01-22T00:00:00Z',
      status: 'under_review',
      assignedAgents: ['A2', 'A4'],
      progress: 90,
      requiredCapabilities: ['financial_analysis', 'machine_learning'],
      priority: 'critical'
    }
  ]
}

function TaskCard({ task }: { task: Task }) {
  const statusColors = {
    open: 'bg-blue-500',
    in_progress: 'bg-yellow-500',
    under_review: 'bg-purple-500',
    completed: 'bg-green-500'
  }

  const priorityColors = {
    low: 'default',
    medium: 'secondary',
    high: 'destructive',
    critical: 'destructive'
  } as const

  const StatusIcon = {
    open: AlertCircle,
    in_progress: Timer,
    under_review: Clock,
    completed: CheckCircle
  }[task.status]

  return (
    <Card className="task-card hover:shadow-lg transition-all">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{task.title}</CardTitle>
            <CardDescription className="line-clamp-2">
              {task.description}
            </CardDescription>
          </div>
          <Badge variant={priorityColors[task.priority]}>
            {task.priority.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <StatusIcon className="h-4 w-4" />
            <span className="capitalize">{task.status.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span>{task.bounty} HBAR</span>
          </div>
        </div>

        {task.status !== 'open' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{task.progress}%</span>
            </div>
            <Progress value={task.progress} className="h-2" />
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          {task.requiredCapabilities.map((cap) => (
            <Badge key={cap} variant="outline" className="text-xs">
              {cap}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{task.assignedAgents.length} agents</span>
          </div>
          <Button size="sm" variant="ghost">
            View Details
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function ActiveTasks() {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['active-tasks'],
    queryFn: fetchTasks,
  })

  const openTasks = tasks.filter(t => t.status === 'open')
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
  const reviewTasks = tasks.filter(t => t.status === 'under_review')

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Active Tasks</h2>
          <p className="text-muted-foreground">
            Real-time view of tasks being processed by the swarm
          </p>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Tasks</TabsTrigger>
            <TabsTrigger value="open">Open ({openTasks.length})</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress ({inProgressTasks.length})</TabsTrigger>
            <TabsTrigger value="review">Under Review ({reviewTasks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {isLoading ? (
                <p>Loading tasks...</p>
              ) : (
                tasks.map((task) => <TaskCard key={task.id} task={task} />)
              )}
            </div>
          </TabsContent>

          <TabsContent value="open" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {openTasks.map((task) => <TaskCard key={task.id} task={task} />)}
            </div>
          </TabsContent>

          <TabsContent value="in_progress" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {inProgressTasks.map((task) => <TaskCard key={task.id} task={task} />)}
            </div>
          </TabsContent>

          <TabsContent value="review" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reviewTasks.map((task) => <TaskCard key={task.id} task={task} />)}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}