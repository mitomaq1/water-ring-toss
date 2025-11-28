import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

const WaterRingToss: React.FC = () => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);

  // State for bubbles to render in React (or could be Matter bodies, but React is easier for simple visual effects overlay)
  const [bubbles, setBubbles] = useState<{ id: number, x: number, y: number, size: number }[]>([]);

  useEffect(() => {
    if (!sceneRef.current) return;

    // Module aliases
    const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Body = Matter.Body,
      Composite = Matter.Composite,
      Events = Matter.Events;

    // Create engine
    const engine = Engine.create();
    engineRef.current = engine;

    // Water physics settings
    engine.world.gravity.y = 0.25; // Low gravity for buoyancy feel

    // Dimensions
    const width = 320;
    const height = 400;

    // Create renderer
    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width,
        height,
        background: 'transparent', // We'll set background in CSS
        wireframes: false,
        showAngleIndicator: false,
      }
    });
    renderRef.current = render;

    // Boundaries (Walls)
    const wallOptions = {
      isStatic: true,
      render: { visible: false } // Invisible walls, we'll draw the container in CSS
    };
    const ground = Bodies.rectangle(width / 2, height + 25, width, 50, wallOptions);
    const leftWall = Bodies.rectangle(-25, height / 2, 50, height, wallOptions);
    const rightWall = Bodies.rectangle(width + 25, height / 2, 50, height, wallOptions);
    const ceiling = Bodies.rectangle(width / 2, -25, width, 50, wallOptions);

    // Pegs
    const pegOptions = {
      isStatic: true,
      render: { fillStyle: '#e0e0e0' }
    };
    const leftPeg = Bodies.rectangle(width * 0.3, height - 80, 10, 160, pegOptions);
    const rightPeg = Bodies.rectangle(width * 0.7, height - 80, 10, 160, pegOptions);

    // Rings
    const createRing = (x: number, y: number, color: string) => {
      const ringRadius = 15;
      const particleRadius = 3;
      const particleCount = 12;
      const parts = [];

      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const px = x + Math.cos(angle) * ringRadius;
        const py = y + Math.sin(angle) * ringRadius;
        parts.push(Bodies.circle(px, py, particleRadius, {
          render: { fillStyle: color }
        }));
      }

      return Body.create({
        parts: parts,
        frictionAir: 0.05, // High air friction for water resistance
        restitution: 0.1, // Low bounciness in water
        friction: 0.1,
        density: 0.04, // Slightly heavier than water?
      });
    };

    const rings: Matter.Body[] = [];
    const colors = ['#ff4d4d', '#4dff4d', '#ffff4d']; // Red, Green, Yellow

    for (let i = 0; i < 15; i++) {
      const x = Math.random() * (width - 60) + 30;
      const y = height - 50 - (Math.random() * 50); // Start at bottom
      const color = colors[i % colors.length];
      rings.push(createRing(x, y, color));
    }

    Composite.add(engine.world, [
      ground, leftWall, rightWall, ceiling,
      leftPeg, rightPeg,
      ...rings
    ]);

    // Run the engine
    Render.run(render);
    const runner = Runner.create();
    runnerRef.current = runner;
    Runner.run(runner, engine);

    // Cleanup
    return () => {
      Render.stop(render);
      Runner.stop(runner);
      if (render.canvas) render.canvas.remove();
      engineRef.current = null;
      renderRef.current = null;
      runnerRef.current = null;
    };
  }, []);

  const handlePump = (side: 'left' | 'right') => {
    if (!engineRef.current) return;

    const engine = engineRef.current;
    const width = 320;
    const centerX = width / 2;

    // Visual bubbles
    const newBubbles = Array.from({ length: 5 }).map((_, i) => ({
      id: Date.now() + i,
      x: side === 'left' ? 40 + Math.random() * 40 : width - 80 + Math.random() * 40,
      y: 380,
      size: Math.random() * 6 + 4
    }));
    setBubbles(prev => [...prev, ...newBubbles]);
    setTimeout(() => {
      setBubbles(prev => prev.filter(b => !newBubbles.includes(b)));
    }, 1000);

    // Physics Force
    const bodies = Matter.Composite.allBodies(engine.world);
    bodies.forEach(body => {
      if (body.isStatic) return; // Don't move pegs or walls

      // Check if body is on the correct side
      const isLeft = body.position.x < centerX;
      if ((side === 'left' && isLeft) || (side === 'right' && !isLeft)) {
        // Apply upward force with turbulence
        const forceMagnitude = 0.002 * body.mass; // Scale with mass
        const turbulence = (Math.random() - 0.5) * 0.001 * body.mass;

        Matter.Body.applyForce(body, body.position, {
          x: turbulence,
          y: -forceMagnitude
        });
      }
    });
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePump('left');
      if (e.key === 'ArrowRight') handlePump('right');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 font-sans">
      {/* Console Casing */}
      <div className="relative bg-yellow-400 p-8 rounded-[40px] shadow-2xl border-b-8 border-yellow-600 w-[420px] h-[600px] flex flex-col items-center select-none">

        {/* Top Branding/Decor */}
        <div className="w-full flex justify-between items-center mb-4 px-4 opacity-70">
          <div className="text-yellow-800 font-bold tracking-widest text-xs">WATER GAME</div>
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-800"></div>
            <div className="w-2 h-2 rounded-full bg-yellow-800"></div>
            <div className="w-2 h-2 rounded-full bg-yellow-800"></div>
          </div>
        </div>

        {/* Screen Area */}
        <div className="relative w-[320px] h-[400px] bg-gradient-to-b from-blue-300 to-blue-600 rounded-xl border-4 border-yellow-200 shadow-inner overflow-hidden">
          {/* Matter.js Canvas Container */}
          <div ref={sceneRef} className="absolute inset-0 z-10" />

          {/* Background Decor (Deep Ocean) */}
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-blue-900 to-transparent"></div>
          </div>

          {/* Bubbles Overlay */}
          {bubbles.map(b => (
            <div
              key={b.id}
              className="absolute rounded-full bg-white opacity-40 animate-bubble"
              style={{
                left: b.x,
                top: b.y,
                width: b.size,
                height: b.size,
                animation: 'floatUp 1s ease-out forwards'
              }}
            />
          ))}
        </div>

        {/* Controls Area */}
        <div className="flex justify-between w-full px-8 mt-8">
          <button
            className="w-20 h-20 rounded-full bg-blue-500 shadow-[0_6px_0_#1e40af] active:shadow-none active:translate-y-1.5 transition-all border-4 border-blue-400 flex items-center justify-center group"
            onMouseDown={() => handlePump('left')}
          >
            <span className="text-blue-200 font-bold text-xl group-active:scale-90">L</span>
          </button>

          <div className="flex flex-col items-center justify-center gap-1 opacity-50">
            <div className="w-16 h-2 bg-yellow-700 rounded-full"></div>
            <div className="w-16 h-2 bg-yellow-700 rounded-full"></div>
            <div className="w-16 h-2 bg-yellow-700 rounded-full"></div>
          </div>

          <button
            className="w-20 h-20 rounded-full bg-blue-500 shadow-[0_6px_0_#1e40af] active:shadow-none active:translate-y-1.5 transition-all border-4 border-blue-400 flex items-center justify-center group"
            onMouseDown={() => handlePump('right')}
          >
            <span className="text-blue-200 font-bold text-xl group-active:scale-90">R</span>
          </button>
        </div>

      </div>

      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 0.6; }
          100% { transform: translateY(-300px) scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default WaterRingToss;
