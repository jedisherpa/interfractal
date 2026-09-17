import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { NoToneMapping } from "three";
import { CloseRail } from "@/components/instrument/close-rail.tsx";
import { FirstPage } from "@/components/instrument/first-page.tsx";
import { InstrumentHud } from "@/components/instrument/hud.tsx";
import {
  isFunnelArrival,
  isFunnelMessage,
  isWarmup,
  parseFunnelSearch,
  postFunnelEvent,
  type FunnelSearch,
} from "@/lib/instrument/funnel.ts";
import { orbit } from "@/lib/instrument/orbit.ts";
import { installQaHooks, useInstrument } from "@/lib/instrument/store.ts";

export function InstrumentApp({ search }: { search?: FunnelSearch } = {}) {
  const routeSearch = search ?? parseFunnelSearch(typeof window !== "undefined" ? window.location.search : "");
  const funnel = isFunnelArrival(routeSearch);
  const warmup = isWarmup(routeSearch);
  const [woken, setWoken] = useState(!warmup);
  const storePhase = useInstrument((s) => s.phase);
  const webglFailed = useInstrument((s) => s.webglFailed);
  const closeReadySent = useRef(false);

  const landNow = funnel && woken;
  const phase = landNow && (storePhase === "pulse" || storePhase === "gate") ? "room" : storePhase;
  const holdRenderer = warmup && !woken;

  useEffect(() => {
    installQaHooks();
  }, []);

  useEffect(() => {
    if (!warmup) return;
    postFunnelEvent("stage-warming");
    let alive = true;
    void import("@/components/instrument/room-scene")
      .then(() => {
        if (alive) postFunnelEvent("stage-ready");
      })
      .catch(() => {
        if (alive) postFunnelEvent("stage-ready");
      });
    const onMessage = (event: MessageEvent) => {
      if (isFunnelMessage(event.data, "wake")) setWoken(true);
    };
    window.addEventListener("message", onMessage);
    return () => {
      alive = false;
      window.removeEventListener("message", onMessage);
    };
  }, [warmup]);

  useEffect(() => {
    if (!landNow) return;
    const instrument = useInstrument.getState();
    if (instrument.phase === "pulse" || instrument.phase === "gate" || instrument.phase === "intro") {
      instrument.skipIntro();
    }
  }, [landNow]);

  useEffect(() => {
    if (!landNow || closeReadySent.current) return;
    closeReadySent.current = true;
    postFunnelEvent("close-ready");
  }, [landNow]);

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

  const showFirstPage = !holdRenderer && !landNow && (phase === "pulse" || phase === "gate");
  const inRoom = !holdRenderer && phase !== "pulse" && phase !== "gate";

  return (
    <div
      className="relative h-dvh min-h-dvh w-full overflow-hidden bg-void text-ink"
      data-testid="instrument-app"
      data-phase={holdRenderer ? "warmup" : phase}
      data-funnel={funnel ? "1" : "0"}
    >
      {holdRenderer ? <WarmupShell /> : null}
      {showFirstPage && <FirstPage />}
      {inRoom && !webglFailed && <Stage />}
      {inRoom && webglFailed && <Fallback />}
      {inRoom && !webglFailed && <InstrumentHud />}
      {landNow && inRoom && <CloseRail />}
    </div>
  );
}

function WarmupShell() {
  return (
    <div className="h-full w-full bg-void" data-testid="funnel-warmup" aria-hidden>
      <p className="sr-only">Warming the table. The renderer is held.</p>
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
