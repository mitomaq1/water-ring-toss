import { useEffect, useRef, useState } from 'react'
import Matter from 'matter-js'

interface Bubble {
  id: number
  x: number
  y: number
  size: number
  opacity: number
}

const App = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<Matter.Engine | null>(null)
  const renderRef = useRef<Matter.Render | null>(null)
  const runnerRef = useRef<Matter.Runner | null>(null)
  const [leftButtonPressed, setLeftButtonPressed] = useState(false)
  const [rightButtonPressed, setRightButtonPressed] = useState(false)
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const bubbleIdRef = useRef(0)

  // Ring colors
  const ringColors = ['#ef4444', '#22c55e', '#eab308'] // red, green, yellow

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return

    const container = containerRef.current
    const canvas = canvasRef.current
    const width = 600
    const height = 400

    canvas.width = width
    canvas.height = height

    // Create engine
    const engine = Matter.Engine.create()
    engine.world.gravity.y = 0.3 // Lower gravity for water effect
    engine.world.gravity.scale = 0.001
    engineRef.current = engine

    // Create renderer
    const render = Matter.Render.create({
      canvas: canvas,
      engine: engine,
      options: {
        width: width,
        height: height,
        wireframes: false,
        background: 'transparent',
        pixelRatio: window.devicePixelRatio || 1,
      },
    })
    renderRef.current = render
    Matter.Render.run(render)

    // Create runner
    const runner = Matter.Runner.create()
    runnerRef.current = runner
    Matter.Runner.run(runner, engine)

    // Create walls (boundaries)
    const wallThickness = 20
    const walls = [
      // Bottom
      Matter.Bodies.rectangle(width / 2, height - wallThickness / 2, width, wallThickness, {
        isStatic: true,
        render: { fillStyle: '#1e40af' },
      }),
      // Left
      Matter.Bodies.rectangle(wallThickness / 2, height / 2, wallThickness, height, {
        isStatic: true,
        render: { fillStyle: '#1e40af' },
      }),
      // Right
      Matter.Bodies.rectangle(width - wallThickness / 2, height / 2, wallThickness, height, {
        isStatic: true,
        render: { fillStyle: '#1e40af' },
      }),
      // Top
      Matter.Bodies.rectangle(width / 2, wallThickness / 2, width, wallThickness, {
        isStatic: true,
        render: { fillStyle: '#1e40af' },
      }),
    ]

    // Create pegs (targets)
    const pegWidth = 8
    const pegHeight = 60
    const pegs = [
      Matter.Bodies.rectangle(width * 0.35, height - wallThickness - pegHeight / 2, pegWidth, pegHeight, {
        isStatic: true,
        render: { fillStyle: '#fbbf24' },
        label: 'peg1',
      }),
      Matter.Bodies.rectangle(width * 0.65, height - wallThickness - pegHeight / 2, pegWidth, pegHeight, {
        isStatic: true,
        render: { fillStyle: '#fbbf24' },
        label: 'peg2',
      }),
    ]

    // Create rings as compound bodies
    const createRing = (x: number, y: number, radius: number, color: string) => {
      const segments = 24 // More segments for smoother ring appearance
      const segmentRadius = 5
      const bodies: Matter.Body[] = []

      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2
        const segmentX = x + Math.cos(angle) * radius
        const segmentY = y + Math.sin(angle) * radius

        const segment = Matter.Bodies.circle(segmentX, segmentY, segmentRadius, {
          frictionAir: 0.85, // High air friction for water resistance
          friction: 0.95,
          restitution: 0.4, // Some bounciness
          density: 0.0008,
          render: {
            fillStyle: color,
            strokeStyle: '#000',
            lineWidth: 2,
          },
        })

        bodies.push(segment)
      }

      // Create constraints to connect segments
      const constraints: Matter.Constraint[] = []
      const segmentLength = (radius * 2 * Math.PI) / segments
      for (let i = 0; i < segments; i++) {
        const nextIndex = (i + 1) % segments
        const constraint = Matter.Constraint.create({
          bodyA: bodies[i],
          bodyB: bodies[nextIndex],
          length: segmentLength,
          stiffness: 0.95, // Higher stiffness for more rigid ring
          render: {
            visible: false,
          },
        })
        constraints.push(constraint)
      }

      return { bodies, constraints }
    }

    // Create initial rings
    const rings: { bodies: Matter.Body[]; constraints: Matter.Constraint[] }[] = []
    for (let i = 0; i < 3; i++) {
      const ring = createRing(
        width * (0.25 + i * 0.25),
        60 + i * 35,
        28,
        ringColors[i]
      )
      rings.push(ring)
    }

    // Add all bodies to world
    Matter.World.add(engine.world, [
      ...walls,
      ...pegs,
      ...rings.flatMap((r) => r.bodies),
      ...rings.flatMap((r) => r.constraints),
    ])

    // Handle window resize
    const handleResize = () => {
      // Engine and render handle their own dimensions
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      Matter.Render.stop(render)
      Matter.Runner.stop(runner)
      Matter.Engine.clear(engine)
      render.canvas.remove()
      render.textures = {}
    }
  }, [])

  // Handle water jet physics
  useEffect(() => {
    if (!engineRef.current) return

    const engine = engineRef.current
    const width = 600
    const height = 400

    const applyWaterJet = (side: 'left' | 'right', isPressed: boolean) => {
      if (!isPressed) return

      const xPosition = side === 'left' ? width * 0.25 : width * 0.75
      const forceX = side === 'left' ? 0.02 : -0.02

      // Apply force to rings near the jet
      Matter.World.bodies(engine.world).forEach((body) => {
        if (body.isStatic) return

        const distance = Math.abs(body.position.x - xPosition)
        const verticalDistance = Math.abs(body.position.y - (height - 100))
        
        // Only apply force to bodies near the jet and near the bottom
        if (distance < 180 && verticalDistance < 200) {
          // Add upward force with turbulence
          const turbulenceX = (Math.random() - 0.5) * 0.015
          const forceStrength = Math.max(0, 1 - distance / 180) // Stronger closer to jet
          Matter.Body.applyForce(body, body.position, {
            x: (forceX + turbulenceX) * forceStrength,
            y: -0.18 * forceStrength, // Upward force
          })
        }
      })

      // Create bubble particles
      const bubbleCount = 3
      const newBubbles: Bubble[] = []
      for (let i = 0; i < bubbleCount; i++) {
        newBubbles.push({
          id: bubbleIdRef.current++,
          x: xPosition + (Math.random() - 0.5) * 40,
          y: height - 50 - Math.random() * 20,
          size: 4 + Math.random() * 6,
          opacity: 0.6 + Math.random() * 0.4,
        })
      }
      setBubbles((prev) => [...prev, ...newBubbles])
    }

    const interval = setInterval(() => {
      applyWaterJet('left', leftButtonPressed)
      applyWaterJet('right', rightButtonPressed)
    }, 50) // Apply force every 50ms

    return () => clearInterval(interval)
  }, [leftButtonPressed, rightButtonPressed])

  // Update and remove bubbles
  useEffect(() => {
    const interval = setInterval(() => {
      setBubbles((prev) =>
        prev
          .map((bubble) => ({
            ...bubble,
            y: bubble.y - 2 - Math.random() * 2, // Float upward
            x: bubble.x + (Math.random() - 0.5) * 0.5, // Slight horizontal drift
            opacity: Math.max(0, bubble.opacity - 0.02),
          }))
          .filter((bubble) => bubble.y > -20 && bubble.opacity > 0)
      )
    }, 16) // ~60fps

    return () => clearInterval(interval)
  }, [])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setLeftButtonPressed(true)
      } else if (e.key === 'ArrowRight') {
        setRightButtonPressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setLeftButtonPressed(false)
      } else if (e.key === 'ArrowRight') {
        setRightButtonPressed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      {/* Retro Console Casing */}
      <div className="relative">
        {/* Main Console Body */}
        <div
          className="relative bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600 rounded-3xl p-6 shadow-2xl"
          style={{
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 2px 10px rgba(255,255,255,0.3)',
          }}
        >
          {/* Screen Area */}
          <div
            ref={containerRef}
            className="relative rounded-xl overflow-hidden"
            style={{
              width: '600px',
              height: '400px',
              background: 'linear-gradient(to bottom, #3b82f6 0%, #1e40af 50%, #1e3a8a 100%)',
              boxShadow: 'inset 0 0 30px rgba(0,0,0,0.5)',
            }}
          >
            {/* Canvas for Matter.js rendering */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0"
              style={{ imageRendering: 'pixelated' }}
            />

            {/* Bubble particles overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {bubbles.map((bubble) => (
                <div
                  key={bubble.id}
                  className="absolute rounded-full bg-white"
                  style={{
                    left: `${bubble.x}px`,
                    top: `${bubble.y}px`,
                    width: `${bubble.size}px`,
                    height: `${bubble.size}px`,
                    opacity: bubble.opacity,
                    boxShadow: '0 0 4px rgba(255,255,255,0.8)',
                  }}
                />
              ))}
            </div>

            {/* Water effect overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at 50% 50%, transparent 0%, rgba(59, 130, 246, 0.3) 100%)',
                animation: 'ripple 3s ease-in-out infinite',
              }}
            />
          </div>

          {/* Left Button */}
          <button
            onMouseDown={() => setLeftButtonPressed(true)}
            onMouseUp={() => setLeftButtonPressed(false)}
            onMouseLeave={() => setLeftButtonPressed(false)}
            onTouchStart={() => setLeftButtonPressed(true)}
            onTouchEnd={() => setLeftButtonPressed(false)}
            className={`absolute left-4 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full transition-all duration-100 ${
              leftButtonPressed
                ? 'bg-blue-600 shadow-inner scale-95'
                : 'bg-blue-500 shadow-lg hover:bg-blue-600'
            }`}
            style={{
              boxShadow: leftButtonPressed
                ? 'inset 0 4px 8px rgba(0,0,0,0.4)'
                : '0 6px 12px rgba(0,0,0,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)',
            }}
            aria-label="Left Water Jet"
          >
            <span className="text-white font-bold text-xs">L</span>
          </button>

          {/* Right Button */}
          <button
            onMouseDown={() => setRightButtonPressed(true)}
            onMouseUp={() => setRightButtonPressed(false)}
            onMouseLeave={() => setRightButtonPressed(false)}
            onTouchStart={() => setRightButtonPressed(true)}
            onTouchEnd={() => setRightButtonPressed(false)}
            className={`absolute right-4 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full transition-all duration-100 ${
              rightButtonPressed
                ? 'bg-blue-600 shadow-inner scale-95'
                : 'bg-blue-500 shadow-lg hover:bg-blue-600'
            }`}
            style={{
              boxShadow: rightButtonPressed
                ? 'inset 0 4px 8px rgba(0,0,0,0.4)'
                : '0 6px 12px rgba(0,0,0,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)',
            }}
            aria-label="Right Water Jet"
          >
            <span className="text-white font-bold text-xs">R</span>
          </button>

          {/* Instructions */}
          <div className="mt-4 text-center text-yellow-900 text-sm font-semibold">
            <p>Sol/Sağ Butonlar veya ← → Tuşları ile Su Jeti Kullan</p>
            <p className="text-xs mt-1 opacity-75">Halkaları Peglere Tak!</p>
          </div>
        </div>
      </div>

      {/* CSS Animation for water ripple */}
      <style>{`
        @keyframes ripple {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  )
}

export default App

