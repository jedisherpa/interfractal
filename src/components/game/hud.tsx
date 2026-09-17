import { Button } from "@/components/ui/button";
import { flight } from "@/lib/game/runtime.ts";
import { currentFrame, currentOverlay, currentVertex, useGame } from "@/lib/game/store.ts";
import { LAYER_PALETTES } from "@/workshop/geometry.ts";
import { VERTEX_META } from "@/workshop/types.ts";

export function GameHud() {
  const layer = useGame((s) => s.layer);
  const wellOpen = useGame((s) => s.wellOpen);
  const unlocked = useGame((s) => s.unlocked);
  const interact = useGame((s) => s.interact);
  const tick = useGame((s) => s.tick);
  const log = useGame((s) => s.log);
  void tick;
  const vertex = currentVertex();
  const frame = currentFrame();
  const overlay = currentOverlay();
  const near = flight.nearby;
  const pal = LAYER_PALETTES[layer];

  return (
    <>
      <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[min(420px,86%)] rounded-md border border-paper/15 bg-void/80 px-3 py-2 text-paper">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-paper/70">
          {pal.name}
        </p>
        <p className="font-display text-base font-medium tracking-tight">{VERTEX_META[vertex].prism}</p>
        <p className="mt-1 text-pretty text-xs text-paper/75">
          {frame.proposal ? `v${frame.proposal.version} · ${frame.proposal.description}` : "No proposal"}
        </p>
        <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-wider text-paper/70">
          {overlay.cloudNine
            ? "Cloud Nine presentation"
            : overlay.localAlignment
              ? "Local agreement active"
              : "No agreement"}
          {unlocked.includes(3) ? " · Core unlocked" : ""}
        </p>
      </div>

      <div className="pointer-events-none absolute right-3 top-3 z-10 hidden max-w-[280px] rounded-md border border-paper/15 bg-void/80 px-3 py-2 font-mono text-[0.65rem] leading-relaxed text-paper/75 md:block">
        {log.slice(-6).map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
        <span className="size-1.5 rounded-full bg-paper/80" aria-hidden />
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-end justify-between gap-2">
        <p className="rounded-md border border-paper/15 bg-void/80 px-3 py-2 text-xs text-paper">
          {wellOpen
            ? "Esc or F closes the well. Ready is not Yes."
            : near
              ? `F · ${near.label}`
              : "WASD fly · A left · D right · Space rise · F interact"}
        </p>
        {near && !wellOpen && (
          <div className="pointer-events-auto">
            <Button variant="primary" onClick={interact}>
              {near.kind === "decision_well" ? "Open well" : near.label}
            </Button>
          </div>
        )}
      </div>

      <TouchControls />
    </>
  );
}

function TouchControls() {
  const interact = useGame((s) => s.interact);
  const wellOpen = useGame((s) => s.wellOpen);
  if (wellOpen) return null;
  return (
    <div className="pointer-events-auto absolute bottom-16 left-3 right-3 z-10 flex items-end justify-between gap-3 md:hidden">
      <div className="grid grid-cols-3 gap-1.5">
        {(["KeyQ", "KeyW", "KeyE", "KeyA", "KeyS", "KeyD"] as const).map((code) => (
          <button
            key={code}
            type="button"
            className="size-11 rounded-md border border-line bg-surface/90 text-xs text-ink"
            onPointerDown={(e) => {
              e.preventDefault();
              flight.keys.add(code);
            }}
            onPointerUp={() => flight.keys.delete(code)}
            onPointerCancel={() => flight.keys.delete(code)}
          >
            {code.replace("Key", "")}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          className="h-11 min-w-11 rounded-md border border-line bg-surface/90 px-3 text-xs text-ink"
          onPointerDown={() => flight.keys.add("Space")}
          onPointerUp={() => flight.keys.delete("Space")}
        >
          Rise
        </button>
        <button
          type="button"
          className="h-11 min-w-11 rounded-md border border-line bg-surface/90 px-3 text-xs text-ink"
          onClick={interact}
        >
          F
        </button>
      </div>
    </div>
  );
}
