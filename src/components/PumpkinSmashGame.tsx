"use client";
import { useEffect, useRef, useState } from "react";
import Matter, { Engine, Render, Runner, World, Bodies, Body, Events, IEventCollision, Composite } from "matter-js";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { NeonButton } from "@/components/NeonButton";

type Size = { width: number; height: number };

export function PumpkinSmashGame() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [level, setLevel] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [won, setWon] = useState<boolean>(false);
  const [resetTick, setResetTick] = useState<number>(0);
  const cratesRemainingRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [bestScores, setBestScores] = useLocalStorage<Record<string, number>>("pumpkinBestScores", {});
  const keysRef = useRef<{ left: boolean; right: boolean; up: boolean }>({ left: false, right: false, up: false });
  const facingRef = useRef<number>(1);
  const bulletsRef = useRef<Body[]>([]);
  const lastShotAtRef = useRef<number>(0);
  const canJumpFramesRef = useRef<number>(0);

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

  // Ensure the game has focus so Space does not trigger page scroll/clicks
  useEffect(() => {
    if (wrapperRef.current) {
      wrapperRef.current.focus();
    }
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

    // Player pumpkin
    const pumpkinRadius = 20;
    const pumpkin = Bodies.circle(size.width * 0.15, size.height * 0.65, pumpkinRadius, {
      restitution: 0.4,
      friction: 0.2,
      frictionAir: 0.02,
      density: 0.004,
      render: {
        fillStyle: "#ff6a00",
        sprite: { texture: "/pumpkin.svg", xScale: 0.12, yScale: 0.12 },
      } as any,
    });
    World.add(world, pumpkin);

    // Bullet vs skull crates collision
    Events.on(engine, "collisionStart", (ev: IEventCollision<Engine>) => {
      for (const pair of ev.pairs) {
        const a = pair.bodyA;
        const b = pair.bodyB;
        const aIsBullet = (a as any).label === "bullet";
        const bIsBullet = (b as any).label === "bullet";
        if (!(aIsBullet || bIsBullet)) continue;
        const bullet = aIsBullet ? a : b;
        const other = aIsBullet ? b : a;
        if ((crates as Body[]).includes(other)) {
          World.remove(world, other);
          cratesRemainingRef.current -= 1;
          setScore((sc) => {
            const next = sc + 5;
            if (cratesRemainingRef.current <= 0 && !won) {
              setWon(true);
              playWin();
              setBestScores((prev) => {
                const key = String(level);
                const prior = prev[key] ?? 0;
                if (next > prior) return { ...prev, [key]: next };
                return prev;
              });
            }
            return next;
          });
          spawnExplosion(other.position.x, other.position.y, world);
          World.remove(world, bullet);
          bulletsRef.current = bulletsRef.current.filter((bb) => bb !== bullet);
        }
      }
    });

    // Runner and render
    const runner: Runner = Runner.create();
    Render.run(render);
    Runner.run(runner, engine);

    // Keyboard controls
    function shouldCapture(e: KeyboardEvent) {
      // Only capture when the game wrapper is focused or the target lies within it
      const target = e.target as Node | null;
      const wrapper = wrapperRef.current;
      if (!wrapper) return false;
      return document.activeElement === wrapper || (target ? wrapper.contains(target) : false) || document.activeElement === document.body;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (!shouldCapture(e)) return;
      if (e.code === "ArrowLeft" || e.code === "ArrowRight" || e.code === "ArrowUp" || e.code === "Space") {
        e.preventDefault();
      }
      if (e.code === "ArrowLeft") { keysRef.current.left = true; facingRef.current = -1; }
      if (e.code === "ArrowRight") { keysRef.current.right = true; facingRef.current = 1; }
      if (e.code === "ArrowUp") {
        if (canJumpFramesRef.current > 0) {
          Body.setVelocity(pumpkin, { x: pumpkin.velocity.x, y: -6 });
          canJumpFramesRef.current = 0;
        }
      }
      if (e.code === "Space") {
        const now = Date.now();
        const cooldownMs = 220;
        if (now - lastShotAtRef.current > cooldownMs) {
          lastShotAtRef.current = now;
          const pos = { x: pumpkin.position.x + facingRef.current * (pumpkinRadius + 12), y: pumpkin.position.y - 4 };
          const bullet = Bodies.circle(pos.x, pos.y, 6, {
            frictionAir: 0.01,
            restitution: 0,
            density: 0.0005,
            label: "bullet",
            render: { fillStyle: "#2ea8ff" },
          } as any);
          Body.setVelocity(bullet, { x: facingRef.current * 12, y: 0 });
          (bullet as any).birth = now;
          World.add(world, bullet);
          bulletsRef.current.push(bullet);
          playShoot();
        }
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (!shouldCapture(e)) return;
      if (e.code === "Space") {
        e.preventDefault();
      }
      if (e.code === "ArrowLeft") { keysRef.current.left = false; }
      if (e.code === "ArrowRight") { keysRef.current.right = false; }
    }
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp, { passive: false });

    // Movement & housekeeping loop
    Events.on(engine, "afterUpdate", () => {
      // horizontal move
      const moveSpeed = 4;
      let desiredVx = 0;
      if (keysRef.current.left) desiredVx -= moveSpeed;
      if (keysRef.current.right) desiredVx += moveSpeed;
      const clamped = Math.max(-moveSpeed, Math.min(moveSpeed, desiredVx));
      Body.setVelocity(pumpkin, { x: clamped, y: pumpkin.velocity.y });

      // ground check (coyote time)
      const bodies = Composite.allBodies(world);
      const region = {
        min: { x: pumpkin.position.x - 12, y: pumpkin.position.y + pumpkinRadius - 1 },
        max: { x: pumpkin.position.x + 12, y: pumpkin.position.y + pumpkinRadius + 6 },
      };
      const hits = Matter.Query.region(bodies, region).filter((b) => b !== pumpkin && (b.isStatic || b !== bulletsRef.current.find((bb) => bb === b)));
      if (hits.length > 0) {
        canJumpFramesRef.current = 8;
      } else if (canJumpFramesRef.current > 0) {
        canJumpFramesRef.current -= 1;
      }

      // cleanup bullets
      const now = Date.now();
      for (const bullet of [...bulletsRef.current]) {
        const tooOld = now - ((bullet as any).birth ?? now) > 3000;
        const offscreen = bullet.position.x < -80 || bullet.position.x > size.width + 80 || bullet.position.y < -80 || bullet.position.y > size.height + 80;
        if (tooOld || offscreen) {
          World.remove(world, bullet);
          bulletsRef.current = bulletsRef.current.filter((bb) => bb !== bullet);
        }
      }
    });

    // Cleanup
    return () => {
      window.removeEventListener("keydown", onKeyDown as any);
      window.removeEventListener("keyup", onKeyUp as any);
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

  function playShoot() { playTone(520, 90, "square", 0.05); }
  function playHit() {
    playTone(160, 90, "square", 0.06);
  }
  function playWin() {
    playTone(440, 120, "triangle", 0.06);
    setTimeout(() => playTone(660, 140, "triangle", 0.05), 120);
  }

  function spawnExplosion(x: number, y: number, world: World) {
    const parts: Body[] = [];
    for (let i = 0; i < 6; i++) {
      const p = Bodies.circle(x, y, 3, { isSensor: true, frictionAir: 0.06, render: { fillStyle: "#57b7ff" } } as any);
      Body.setVelocity(p, { x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6 });
      parts.push(p);
    }
    World.add(world, parts);
    setTimeout(() => { for (const p of parts) World.remove(world, p); }, 400);
  }

  return (
    <div className="w-full" ref={wrapperRef} tabIndex={0} onMouseDown={() => wrapperRef.current?.focus()} onTouchStart={() => wrapperRef.current?.focus()} role="application">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-white/90 text-[16px] tracking-wide">Smashing Pumpkins</h3>
        <span className="text-white/50 text-[12px]">Arrows: move/jump • Space: shoot</span>
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
          </div>
          <div className="pointer-events-auto flex items-center justify-end gap-2">
            <button
              className="rounded-md border border-white/20 bg-black/40 px-3 py-1.5 text-[13px] text-white/90 hover:bg-black/50"
              onClick={() => {
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


