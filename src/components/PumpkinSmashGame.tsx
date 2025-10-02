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
  const [shotsTaken, setShotsTaken] = useState<number>(0);
  const [lost, setLost] = useState<boolean>(false);
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
    setLost(false);

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
          setShotsTaken((s) => s + 1);
          playLaunch();
        }, 20);
      }
    });

    // On collision, damage crates - only when hit by pumpkin with sufficient speed
    const DAMAGE_SPEED_THRESHOLD = 2.6;
    Events.on(engine, "collisionStart", (ev: IEventCollision<Engine>) => {
      for (const pair of ev.pairs) {
        const a = pair.bodyA;
        const b = pair.bodyB;
        const involvesPumpkin = a === pumpkin || b === pumpkin;
        if (!involvesPumpkin) continue;
        const other = a === pumpkin ? b : a;
        if (!(crates as Body[]).includes(other)) continue;

        const relativeVx = (pumpkin.velocity?.x ?? 0) - (other.velocity?.x ?? 0);
        const relativeVy = (pumpkin.velocity?.y ?? 0) - (other.velocity?.y ?? 0);
        const relativeSpeed = Math.hypot(relativeVx, relativeVy);
        if (relativeSpeed < DAMAGE_SPEED_THRESHOLD) continue;

        const currentHealth = (other as any).health ?? 3;
        const newHealth = Math.max(0, currentHealth - 1);
        (other as any).health = newHealth;
        if (newHealth === 0) {
          World.remove(world, other);
          cratesRemainingRef.current -= 1;
          playHit();
          setScore((sc) => {
            const nextScore = sc + 100;
            if (cratesRemainingRef.current <= 0 && !won) {
              setWon(true);
              playWin();
              setBestScores((prev) => {
                const key = String(level);
                const prior = prev[key] ?? 0;
                if (nextScore > prior) {
                  return { ...prev, [key]: nextScore };
                }
                return prev;
              });
            }
            return nextScore;
          });
        } else {
          const t = (other as any).health;
          (other as any).render.fillStyle = t === 2 ? "#8a6a3e" : "#aa8d63";
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

    // Auto-reload logic and loss detection
    const REST_SPEED_THRESHOLD = 0.15;
    let restFrames = 0;
    Events.on(engine, "afterUpdate", () => {
      const elasticHasProjectile = Boolean((elastic as any).bodyB);
      if (elasticHasProjectile || won || lost) {
        restFrames = 0;
        return;
      }
      const offscreen = pumpkin.position.x < -60 || pumpkin.position.x > size.width + 60 || pumpkin.position.y < -60 || pumpkin.position.y > size.height + 60;
      const slow = (pumpkin as any).speed !== undefined ? (pumpkin as any).speed < REST_SPEED_THRESHOLD : Math.hypot(pumpkin.velocity.x, pumpkin.velocity.y) < REST_SPEED_THRESHOLD;
      if (offscreen) {
        // Attempt reload if shots remain, otherwise mark loss
        const shotsPerLevel = Math.min(5, 3 + Math.floor((level - 1) / 2));
        const shotsLeft = shotsPerLevel - shotsTaken;
        if (shotsLeft > 0) {
          Body.setPosition(pumpkin, { x: slingAnchor.x + 2, y: slingAnchor.y });
          Body.setVelocity(pumpkin, { x: 0, y: 0 });
          (elastic as any).bodyB = pumpkin;
        } else if (cratesRemainingRef.current > 0) {
          setLost(true);
        }
        restFrames = 0;
        return;
      }
      if (slow) {
        restFrames += 1;
      } else {
        restFrames = 0;
      }
      if (restFrames > 30) {
        const shotsPerLevel = Math.min(5, 3 + Math.floor((level - 1) / 2));
        const shotsLeft = shotsPerLevel - shotsTaken;
        if (shotsLeft > 0) {
          Body.setPosition(pumpkin, { x: slingAnchor.x + 2, y: slingAnchor.y });
          Body.setVelocity(pumpkin, { x: 0, y: 0 });
          (elastic as any).bodyB = pumpkin;
        } else if (cratesRemainingRef.current > 0) {
          setLost(true);
        }
        restFrames = 0;
      }
    });

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
            <div className="rounded-md bg-black/30 px-3 py-1 text-[13px]">
              Shots {shotsTaken}/{Math.min(5, 3 + Math.floor((level - 1) / 2))}
            </div>
          </div>
          <div className="pointer-events-auto flex items-center justify-end gap-2">
            <button
              className="rounded-md border border-white/20 bg-black/40 px-3 py-1.5 text-[13px] text-white/90 hover:bg-black/50"
              onClick={() => {
                setShotsTaken(0);
                setScore(0);
                setWon(false);
                setLost(false);
                setResetTick((t) => t + 1);
              }}
            >
              Reset Level
            </button>
            <NeonButton
              label="Next Level"
              onClick={() => {
                setShotsTaken(0);
                setScore(0);
                setWon(false);
                setLost(false);
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
                    setShotsTaken(0);
                    setScore(0);
                    setWon(false);
                    setLost(false);
                    setResetTick((t) => t + 1);
                  }}
                >
                  Replay
                </button>
                <NeonButton
                  label="Next Level"
                  onClick={() => {
                    setShotsTaken(0);
                    setScore(0);
                    setWon(false);
                    setLost(false);
                    setLevel((lv) => lv + 1);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {lost && !won && (
          <div className="pointer-events-auto absolute inset-0 flex items-center justify-center">
            <div className="rounded-xl border border-white/15 bg-black/70 p-5 text-center backdrop-blur-md">
              <div className="mb-2 text-[18px] font-semibold text-white">Level Failed</div>
              <div className="mb-4 text-[14px] text-white/80">Out of pumpkins. Try again?</div>
              <div className="flex items-center justify-center gap-2">
                <button
                  className="rounded-md border border-white/20 bg-black/40 px-3 py-1.5 text-[13px] text-white/90 hover:bg-black/50"
                  onClick={() => {
                    setShotsTaken(0);
                    setScore(0);
                    setWon(false);
                    setLost(false);
                    setResetTick((t) => t + 1);
                  }}
                >
                  Retry Level
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


