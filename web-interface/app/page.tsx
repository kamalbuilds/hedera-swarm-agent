'use client'

import { Hero } from '@/components/sections/Hero'
import { SwarmVisualization } from '@/components/sections/SwarmVisualization'
import { ActiveTasks } from '@/components/sections/ActiveTasks'
import { AgentGallery } from '@/components/sections/AgentGallery'
import { Stats } from '@/components/sections/Stats'

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Hero />
      <Stats />
      <SwarmVisualization />
      <ActiveTasks />
      <AgentGallery />
    </div>
  )
}