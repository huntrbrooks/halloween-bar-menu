"use client";
import { useEffect, useRef, useState } from "react";
import Matter, { Engine, Render, Runner, World, Bodies, Body, Constraint, Events, IEventCollision } from "matter-js";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { NeonButton } from "@/components/NeonButton";

type Size = { width: number; height: number };

export function PumpkinSmashGame() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [level, setLevel] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [shots, setShots] = useState<number>(0);
  const [won, setWon] = useState<boolean>(false);
  const [resetTick, setResetTick] = useState<number>(0);
  const cratesRemainingRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [bestScores, setBestScores] = useLocalStorage<Record<string, number>>("pumpkinBestScores", {});

  useEffect(() => {
    function handleResize() {
      if (!wrapperRef.current) return;
      const { clientWidth } = wrapperRef.current;
      const width = Math.min(clientWidth, 1000);
      const height = Math.round(width * 0.6);
      setSize({ width, height });
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!hostRef.current || size.width === 0 || size.height === 0) return;

    const engine: Engine = Engine.create({ gravity: { x: 0, y: 1, scale: 0.001 } as any } as any);
    const world = engine.world;

    // Renderer
    const render: Render = Render.create({
      element: hostRef.current,
      engine,
      options: {
        width: size.width,
        height: size.height,
        wireframes: false,
        background: "transparent",
        pixelRatio: window.devicePixelRatio || 1,
      },
    });

    // Ground & walls
    const floor = Bodies.rectangle(size.width / 2, size.height + 20, size.width + 100, 40, {
      isStatic: true,
      render: { fillStyle: "#1a1324" },
    });
    const leftWall = Bodies.rectangle(-20, size.height / 2, 40, size.height, { isStatic: true, render: { visible: false } });
    const rightWall = Bodies.rectangle(size.width + 20, size.height / 2, 40, size.height, { isStatic: true, render: { visible: false } });
    World.add(world, [floor, leftWall, rightWall]);

    // Targets — arrange per level, breakable by collision
    const crates: Body[] = [];
    const baseX = size.width * 0.64;
    const baseY = size.height * 0.72;
    const cols = 2 + Math.min(3, level); // 3..5
    const rows = 3 + Math.min(2, Math.floor(level / 2)); // 3..5
    const w = 36;
    const h = 28;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols - r % 2; c++) {
        const x = baseX + c * (w + 4) + (r % 2 ? (w / 2) : 0);
        const y = baseY - r * (h + 3);
        const box = Bodies.rectangle(x, y, w, h, {
          chamfer: { radius: 4 },
          render: {
            fillStyle: "#6b4f2a",
            strokeStyle: "#8a6a3e",
            lineWidth: 1,
            sprite: { texture: "/skull.svg", xScale: 0.18, yScale: 0.18 },
          } as any,
          restitution: 0.1,
          friction: 0.6,
          density: 0.002,
        });
        (box as any).health = 3; // simple hit points
        crates.push(box);
      }
    }
    World.add(world, crates);
    cratesRemainingRef.current = crates.length;
    setWon(false);

    // Slingshot pumpkin
    const slingAnchor = { x: size.width * 0.18, y: size.height * 0.72 };
    const pumpkinRadius = 20;
    const pumpkin = Bodies.circle(slingAnchor.x + 2, slingAnchor.y, pumpkinRadius, {
      restitution: 0.4,
      friction: 0.8,
      density: 0.004,
      render: {
        fillStyle: "#ff6a00",
        sprite: { texture: "/pumpkin.svg", xScale: 0.12, yScale: 0.12 },
      } as any,
    });
    const elastic = Constraint.create({
      pointA: slingAnchor,
      bodyB: pumpkin,
      stiffness: 0.04,
      damping: 0.02,
      render: { strokeStyle: "#ff6a00", lineWidth: 2 },
    });
    World.add(world, [pumpkin, elastic]);

    // Visual base for slingshot
    const base = Bodies.rectangle(slingAnchor.x - 10, slingAnchor.y + 15, 40, 20, {
      isStatic: true,
      render: { fillStyle: "#2b2036" },
    });
    World.add(world, base);

    // Mouse control for drag and release
    const canvas = render.canvas;
    const mouse = Matter.Mouse.create(canvas);
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse,
      constraint: {
        stiffness: 0.02,
        render: { visible: false },
      },
    });
    World.add(world, mouseConstraint);
    render.mouse = mouse;

    // Allow dragging pumpkin only; on release, detach after small delay
    Events.on(mouseConstraint, "enddrag", (e: any) => {
      if (e.body === pumpkin && (elastic as any).bodyB === pumpkin) {
        setTimeout(() => {
          (elastic as any).bodyB = null;
          setShots((s) => s + 1);
          playLaunch();
        }, 20);
      }
    });

    // On collision, damage crates
    Events.on(engine, "collisionStart", (ev: IEventCollision<Engine>) => {
      for (const pair of ev.pairs) {
        const bodies = [pair.bodyA, pair.bodyB];
        for (const b of bodies) {
          if ((crates as Body[]).includes(b)) {
            (b as any).health = Math.max(0, ((b as any).health ?? 3) - 1);
            if ((b as any).health === 0) {
              // remove broken crate
              World.remove(world, b);
              setScore((sc) => sc + 100);
              cratesRemainingRef.current -= 1;
              playHit();
              if (cratesRemainingRef.current <= 0 && !won) {
                setWon(true);
                playWin();
                setBestScores((prev) => {
                  const key = String(level);
                  const prior = prev[key] ?? 0;
                  if (score + 100 > prior) {
                    return { ...prev, [key]: score + 100 };
                  }
                  return prev;
                });
              }
            } else {
              // visual feedback by tinting
              const t = (b as any).health;
              (b as any).render.fillStyle = t === 2 ? "#8a6a3e" : "#aa8d63";
            }
          }
        }
      }
    });

    // Runner and render
    const runner: Runner = Runner.create();
    Render.run(render);
    Runner.run(runner, engine);

    // Reset controls: space to reload pumpkin
    function handleKey(e: KeyboardEvent) {
      if (e.code === "Space" && !(elastic as any).bodyB) {
        Body.setPosition(pumpkin, { x: slingAnchor.x + 2, y: slingAnchor.y });
        Body.setVelocity(pumpkin, { x: 0, y: 0 });
        (elastic as any).bodyB = pumpkin;
      }
    }
    window.addEventListener("keydown", handleKey);

    // Cleanup
    return () => {
      window.removeEventListener("keydown", handleKey);
      Render.stop(render);
      Runner.stop(runner);
      World.clear(world, false);
      Engine.clear(engine);
      // Remove canvas
      if (render.canvas && render.canvas.parentNode) {
        render.canvas.parentNode.removeChild(render.canvas);
      }
    };
  }, [size.width, size.height, level, resetTick]);

  // --- Sound helpers ---
  function ensureAudio() {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        // ignore
      }
    }
    return audioCtxRef.current;
  }

  function playTone(freq: number, durationMs: number, type: OscillatorType = "triangle", gain = 0.04) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gainNode.gain.value = gain;
    osc.connect(gainNode).connect(ctx.destination);
    osc.start(now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    osc.stop(now + durationMs / 1000 + 0.02);
    // Attempt to resume if suspended by browser policies
    if (ctx.state === "suspended" && (ctx as any).resume) {
      (ctx as any).resume();
    }
  }

  function playLaunch() {
    playTone(220, 110, "sawtooth", 0.05);
  }
  function playHit() {
    playTone(160, 90, "square", 0.06);
  }
  function playWin() {
    playTone(440, 120, "triangle", 0.06);
    setTimeout(() => playTone(660, 140, "triangle", 0.05), 120);
  }

  return (
    <div className="w-full" ref={wrapperRef}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-white/90 text-[16px] tracking-wide">Smashing Pumpkins</h3>
        <span className="text-white/50 text-[12px]">Drag the pumpkin, release to smash • Press Space to reload</span>
      </div>
      <div className="relative">
        <div
          ref={hostRef}
          style={{ width: size.width, height: size.height }}
          className="rounded-lg border border-white/10 bg-black/20 backdrop-blur-[2px] overflow-hidden"
        />

        {/* HUD overlay */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3">
          <div className="flex items-center justify-between text-white/90">
            <div className="rounded-md bg-black/30 px-3 py-1 text-[13px]">Level {level}</div>
            <div className="rounded-md bg-black/30 px-3 py-1 text-[13px]">Score {score}</div>
            <div className="rounded-md bg-black/30 px-3 py-1 text-[13px]">Best {(bestScores[String(level)] ?? 0)}</div>
            <div className="rounded-md bg-black/30 px-3 py-1 text-[13px]">Shots {shots}</div>
          </div>
          <div className="pointer-events-auto flex items-center justify-end gap-2">
            <button
              className="rounded-md border border-white/20 bg-black/40 px-3 py-1.5 text-[13px] text-white/90 hover:bg-black/50"
              onClick={() => {
                setShots(0);
                setScore(0);
                setWon(false);
                setResetTick((t) => t + 1);
              }}
            >
              Reset Level
            </button>
            <NeonButton
              label="Next Level"
              onClick={() => {
                setShots(0);
                setScore(0);
                setWon(false);
                setLevel((lv) => lv + 1);
              }}
            />
          </div>
        </div>

        {won && (
          <div className="pointer-events-auto absolute inset-0 flex items-center justify-center">
            <div className="rounded-xl border border-white/15 bg-black/70 p-5 text-center backdrop-blur-md">
              <div className="mb-2 text-[18px] font-semibold text-white">Level Cleared!</div>
              <div className="mb-4 text-[14px] text-white/80">Score {score} • Best {(bestScores[String(level)] ?? score)}</div>
              <div className="flex items-center justify-center gap-2">
                <button
                  className="rounded-md border border-white/20 bg-black/40 px-3 py-1.5 text-[13px] text-white/90 hover:bg-black/50"
                  onClick={() => {
                    setShots(0);
                    setScore(0);
                    setWon(false);
                    setResetTick((t) => t + 1);
                  }}
                >
                  Replay
                </button>
                <NeonButton
                  label="Next Level"
                  onClick={() => {
                    setShots(0);
                    setScore(0);
                    setWon(false);
                    setLevel((lv) => lv + 1);
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


