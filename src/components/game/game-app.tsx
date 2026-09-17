import { Canvas } from "@react-three/fiber";
import { useEffect, useState, type ComponentType } from "react";
import { GameHud } from "@/components/game/hud";
import { InspectPanel } from "@/components/game/inspect-panel";
import { Button } from "@/components/ui/button";
import { flight } from "@/lib/game/runtime.ts";
import { installQaHooks, useGame } from "@/lib/game/store.ts";

export function GameApp() {
  const phase = useGame((s) => s.phase);
  const wellOpen = useGame((s) => s.wellOpen);
  const webglFailed = useGame((s) => s.webglFailed);
  const reducedMotion = useGame((s) => s.reducedMotion);

  useEffect(() => {
    installQaHooks();
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat && e.code === "KeyF") return;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === "KeyF") {
        e.preventDefault();
        useGame.getState().interact();
        return;
      }
      if (e.code === "Escape" && useGame.getState().wellOpen) {
        useGame.getState().closeWell();
        return;
      }
      if (e.code === "KeyM") {
        const s = useGame.getState();
        s.setMathLens(!s.mathLens);
        return;
      }
      if (e.code === "KeyR" && e.shiftKey) {
        flight.recover();
        return;
      }
      flight.keys.add(e.code);
    };
    const up = (e: KeyboardEvent) => {
      flight.keys.delete(e.code);
    };
    const blur = () => flight.keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  return (
    <div className="relative h-dvh min-h-dvh w-full overflow-hidden bg-void text-ink">
      {phase === "playing" && !webglFailed && <GameStage />}
      {phase === "playing" && webglFailed && <FallbackStage />}
      {phase === "playing" && <GameHud />}
      {phase === "playing" && wellOpen && (
        <div className="absolute inset-x-0 top-0 z-20 flex justify-end p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
          <InspectPanel />
        </div>
      )}
      {phase === "title" && <TitleScreen reducedMotion={reducedMotion} />}
    </div>
  );
}

function GameStage() {
  const [World, setWorld] = useState<ComponentType | null>(null);
  const setFailed = useGame((s) => s.setWebglFailed);
  useEffect(() => {
    let alive = true;
    void import("@/components/game/world-scene")
      .then((m) => {
        if (alive) setWorld(() => m.WorldScene);
      })
      .catch(() => setFailed(true));
    return () => {
      alive = false;
    };
  }, [setFailed]);
  if (!World) {
    return <div className="h-full w-full bg-void" aria-hidden />;
  }
  return (
    <Canvas
      className="h-full w-full touch-none"
      dpr={[1, 1.75]}
      camera={{ fov: 62, near: 0.15, far: 180, position: [0, 8, 28] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor("#c9dceb");
      }}
      onPointerDown={() => {
        if (!useGame.getState().wellOpen) {
          /* look is keyboard-first; mouse optional */
        }
      }}
      onPointerMove={(e) => {
        if (useGame.getState().wellOpen) return;
        if (e.buttons === 1) {
          flight.lookDX += e.movementX;
          flight.lookDY += e.movementY;
        }
      }}
    >
      <World />
    </Canvas>
  );
}

function FallbackStage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-void px-6 text-center text-paper">
      <p className="font-display text-xl">Inspect HUD remains available</p>
      <p className="max-w-md text-pretty text-sm text-muted">
        The 3D well rig failed to start. Practice commands still run through Hopf Workshop. Open
        the well from the button below.
      </p>
      <Button variant="primary" onClick={() => useGame.getState().openWell()}>
        Open Garden well
      </Button>
    </div>
  );
}

function TitleScreen({ reducedMotion }: { reducedMotion: boolean }) {
  const start = useGame((s) => s.start);
  const setReduced = useGame((s) => s.setReducedMotion);
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-void px-5 text-paper">
      <div className="w-full max-w-xl rounded-xl border border-line bg-surface p-6 text-ink shadow-panel sm:p-8">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted">
          Inner Fractal · teaching instrument
        </p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-balance sm:text-4xl">
          Decision Wells
        </h1>
        <p className="mt-3 text-pretty text-sm leading-relaxed text-muted sm:text-base">
          Four nested worlds. One Hopf Workshop at each vertex. Fly to the cyan plinth — not the
          gold cube gate — and practice. Ready is not Yes. Geometry cannot sign a name.
        </p>
        <ul className="mt-4 space-y-1.5 text-sm text-muted">
          <li>W / S fly · A turn left · D turn right · Space rise</li>
          <li>F opens the well or uses a scale gate</li>
          <li>Maya / Finn / Bea are fictional practice seats</li>
        </ul>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={start}>
            Begin flight
          </Button>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReduced(e.target.checked)}
            />
            Reduced motion
          </label>
        </div>
      </div>
    </div>
  );
}
