import { Canvas } from "@react-three/fiber";
import { useEffect, useState, type ComponentType } from "react";
import { NoToneMapping } from "three";
import { FirstPage } from "@/components/instrument/first-page.tsx";
import { InstrumentHud } from "@/components/instrument/hud.tsx";
import { orbit } from "@/lib/instrument/orbit.ts";
import { installQaHooks, useInstrument } from "@/lib/instrument/store.ts";

export function InstrumentApp() {
  const phase = useInstrument((s) => s.phase);
  const webglFailed = useInstrument((s) => s.webglFailed);

  useEffect(() => {
    installQaHooks();
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const s = useInstrument.getState();
      if (s.phase === "pulse" || s.phase === "gate") {
        if (e.code === "Enter" || e.code === "Space") {
          e.preventDefault();
          s.pressEnter();
        }
        return;
      }
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === "Escape" && s.wellOpen) {
        s.closeWell();
        return;
      }
      if (e.code === "KeyJ") {
        s.stepCycle(-1);
        return;
      }
      if (e.code === "KeyK") {
        s.stepCycle(1);
        return;
      }
      if (e.code === "KeyF" && s.phase === "room") {
        e.preventDefault();
        if (s.wellOpen) s.closeWell();
        else s.openWell();
        return;
      }
      if (e.code === "Space" && s.phase === "room" && !orbit.keys.has("Space")) {
        if (e.shiftKey) {
          e.preventDefault();
          if (s.cyclePlaying) s.pauseCycle();
          else s.playCycle();
          return;
        }
      }
      if (s.phase === "intro" && e.code === "Escape") {
        s.skipIntro();
        return;
      }
      orbit.add(e.code);
    };
    const up = (e: KeyboardEvent) => orbit.delete(e.code);
    const blur = () => orbit.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    window.addEventListener("visibilitychange", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      window.removeEventListener("visibilitychange", blur);
    };
  }, []);

  return (
    <div className="relative h-dvh min-h-dvh w-full overflow-hidden bg-void text-ink">
      {(phase === "pulse" || phase === "gate") && <FirstPage />}
      {phase !== "pulse" && phase !== "gate" && !webglFailed && <Stage />}
      {phase !== "pulse" && phase !== "gate" && webglFailed && <Fallback />}
      {phase !== "pulse" && phase !== "gate" && !webglFailed && <InstrumentHud />}
    </div>
  );
}

function Stage() {
  const [Scene, setScene] = useState<ComponentType | null>(null);
  const setFailed = useInstrument((s) => s.setWebglFailed);
  useEffect(() => {
    let alive = true;
    void import("@/components/instrument/room-scene")
      .then((m) => {
        if (alive) setScene(() => m.InstrumentScene);
      })
      .catch(() => setFailed(true));
    return () => {
      alive = false;
    };
  }, [setFailed]);
  if (!Scene) return <div className="h-full w-full bg-void" aria-hidden />;
  return (
    <Canvas
      className="h-full w-full touch-none"
      dpr={[1, 1.6]}
      camera={{ fov: 58, near: 0.2, far: 220, position: [0, 3, 16] }}
      gl={{ antialias: true, powerPreference: "high-performance", toneMapping: NoToneMapping }}
      onCreated={({ gl }) => {
        gl.setClearColor("#16345c");
        gl.localClippingEnabled = true;
      }}
      onPointerMove={(e) => {
        if (useInstrument.getState().wellOpen) return;
        if (e.buttons === 1) {
          orbit.lookDX += e.movementX;
          orbit.lookDY += e.movementY;
        }
      }}
    >
      <Scene />
    </Canvas>
  );
}

function Fallback() {
  const world = useInstrument((s) => s.world);
  const setWorld = useInstrument((s) => s.setWorld);
  const openWell = useInstrument((s) => s.openWell);
  const wellOpen = useInstrument((s) => s.wellOpen);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-void px-6 text-center text-paper">
      <p className="font-display text-lg">Instrument room (2D)</p>
      <p className="max-w-md text-pretty text-sm text-paper/75">
        WebGL is unavailable. The same facts remain: Ready is not Yes. Press was Enter, not Explore.
        Current world {world}.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {(["C9", "W1", "W2", "W3", "W4"] as const).map((id) => (
          <button
            key={id}
            type="button"
            className="h-11 rounded-full border border-paper/30 px-4 text-sm"
            onClick={() => setWorld(id)}
          >
            {id}
          </button>
        ))}
      </div>
      {world !== "C9" && !wellOpen ? (
        <button type="button" className="h-11 rounded-full bg-paper px-4 text-sm text-void" onClick={openWell}>
          Open well
        </button>
      ) : null}
    </div>
  );
}
