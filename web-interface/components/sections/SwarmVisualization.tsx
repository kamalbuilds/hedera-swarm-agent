'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sphere, Line, Text } from '@react-three/drei'
import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { motion } from 'framer-motion'

interface Agent {
  id: string
  position: [number, number, number]
  reputation: number
  active: boolean
  connections: string[]
}

function SwarmNetwork({ agents }: { agents: Agent[] }) {
  const groupRef = useRef<THREE.Group>(null)

  // Create connections between agents
  const connections = useMemo(() => {
    const lines: JSX.Element[] = []
    agents.forEach((agent, i) => {
      agent.connections.forEach((targetId) => {
        const target = agents.find(a => a.id === targetId)
        if (target) {
          const points = [
            new THREE.Vector3(...agent.position),
            new THREE.Vector3(...target.position)
          ]
          lines.push(
            <Line
              key={`${agent.id}-${targetId}`}
              points={points}
              color="#7E3FE8"
              lineWidth={1}
              opacity={0.3}
            />
          )
        }
      })
    })
    return lines
  }, [agents])

  return (
    <group ref={groupRef}>
      {/* Render agents as spheres */}
      {agents.map((agent) => (
        <group key={agent.id} position={agent.position}>
          <Sphere args={[0.5, 16, 16]}>
            <meshStandardMaterial
              color={agent.active ? '#7E3FE8' : '#666666'}
              emissive={agent.active ? '#7E3FE8' : '#000000'}
              emissiveIntensity={agent.active ? 0.5 : 0}
            />
          </Sphere>
          <Text
            position={[0, 0.8, 0]}
            fontSize={0.3}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {agent.id}
          </Text>
        </group>
      ))}
      
      {/* Render connections */}
      {connections}
    </group>
  )
}

export function SwarmVisualization() {
  // Mock data - in production, fetch from API
  const agents: Agent[] = useMemo(() => [
    { id: 'A1', position: [0, 0, 0], reputation: 100, active: true, connections: ['A2', 'A3'] },
    { id: 'A2', position: [3, 1, -2], reputation: 85, active: true, connections: ['A1', 'A4'] },
    { id: 'A3', position: [-2, -1, 2], reputation: 92, active: true, connections: ['A1', 'A5'] },
    { id: 'A4', position: [1, 3, 1], reputation: 78, active: false, connections: ['A2', 'A5'] },
    { id: 'A5', position: [-3, 2, -1], reputation: 95, active: true, connections: ['A3', 'A4'] },
  ], [])

  return (
    <section className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Live Swarm Network</CardTitle>
            <CardDescription>
              Real-time visualization of agent interactions and collaborations
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[500px] w-full">
              <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                <SwarmNetwork agents={agents} />
                <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
                <gridHelper args={[20, 20]} />
              </Canvas>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  )
}