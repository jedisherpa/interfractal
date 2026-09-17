import { useEffect, useState } from "react";
import { GATE_STAGES, OWNER_LINE, PULSE_MS } from "@/lib/instrument/cosmology.ts";
import { useInstrument } from "@/lib/instrument/store.ts";

export function FirstPage() {
  const phase = useInstrument((s) => s.phase);
  const pulse = useInstrument((s) => s.pulse);
  const reduced = useInstrument((s) => s.reducedMotion);
  const pressEnter = useInstrument((s) => s.pressEnter);
  const skipIntro = useInstrument((s) => s.skipIntro);
  const tickPulse = useInstrument((s) => s.tickPulse);
  const setReducedMotion = useInstrument((s) => s.setReducedMotion);
  const gate = phase === "gate";

  useEffect(() => {
    if (reduced || gate) return;
    const id = window.setInterval(tickPulse, PULSE_MS);
    const onVis = () => {
      if (document.hidden) window.clearInterval(id);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reduced, gate, tickPulse]);

  const hole = reduced || pulse === "hole";

  return (
    <div
      className={
        reduced && !gate
          ? "relative flex h-dvh min-h-dvh w-full flex-col bg-hole-field text-hole-dot"
          : hole
            ? "pulse-field relative flex h-dvh min-h-dvh w-full flex-col items-center justify-center bg-hole-field text-hole-dot"
            : "pulse-field relative flex h-dvh min-h-dvh w-full flex-col items-center justify-center bg-light-field text-light-dot"
      }
    >
      <p className="sr-only">
        {gate
          ? "Four points around Whole. South, Tribe, World, Transcendent. Press a point to enter at that stage. Press Whole for the full intro cycle. Pressing is not a Yes."
          : "Light above the dot. Whole below. Press the dot to enter. Pressing does not sign a Yes. Skip is at the bottom."}
      </p>

      {gate ? (
        <WholeGate hole={hole} reduced={reduced} />
      ) : reduced ? (
        <div className="grid min-h-0 flex-1 grid-cols-2">
          <ReadingStack hole compact onPress={pressEnter} />
          <ReadingStack hole={false} compact onPress={pressEnter} />
        </div>
      ) : (
        <ReadingStack hole={hole} onPress={pressEnter} />
      )}

      {reduced && !gate ? (
        <p className="px-6 pt-4 text-center text-xs text-hole-dot/70">
          Reduced motion. Both readings sit at once. Press a dot, or skip.
        </p>
      ) : null}

      <p className="pointer-events-none absolute bottom-24 left-0 right-0 z-10 px-6 text-center text-xs tracking-wide opacity-60">
        {OWNER_LINE}
      </p>

      <div className="absolute bottom-6 left-0 right-0 z-20 flex flex-wrap items-center justify-center gap-3 px-4">
        <button
          type="button"
          data-testid="skip-intro"
          className="h-11 min-h-11 rounded-full border px-4 text-xs font-medium"
          style={{ borderColor: "currentColor", opacity: 0.78 }}
          onClick={(e) => {
            e.stopPropagation();
            skipIntro();
          }}
        >
          Skip intro
        </button>
        <button
          type="button"
          data-testid="reduce-motion"
          className="h-11 min-h-11 rounded-full border px-4 text-xs font-medium"
          style={{ borderColor: "currentColor", opacity: 0.78 }}
          onClick={(e) => {
            e.stopPropagation();
            setReducedMotion(!reduced);
          }}
        >
          {reduced ? "Motion on" : "Reduce motion"}
        </button>
      </div>
    </div>
  );
}

function WholeGate({ hole, reduced }: { hole: boolean; reduced: boolean }) {
  const enterWhole = useInstrument((s) => s.enterWhole);
  const enterStage = useInstrument((s) => s.enterStage);
  const [on, setOn] = useState(reduced);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setOn(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const stroke = hole ? "var(--color-hole-dot)" : "var(--color-light-dot)";
  const fill = hole ? "var(--color-hole-field)" : "var(--color-light-field)";
  const cx = 50;
  const cy = 50;
  const ray = 28;

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center px-4 pb-28 pt-6">
      <div className="relative aspect-square w-full max-w-md">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
          {GATE_STAGES.map((stage) => {
            const rad = (stage.angle * Math.PI) / 180;
            const x = cx + Math.cos(rad) * ray;
            const y = cy + Math.sin(rad) * ray;
            return (
              <line
                key={stage.world}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke={stroke}
                strokeWidth="0.7"
                strokeLinecap="round"
                opacity={on ? 0.45 : 0}
                style={{ transition: reduced ? undefined : "opacity 400ms var(--ease-out)" }}
              />
            );
          })}
        </svg>

        <button
          type="button"
          data-testid="gate-whole"
          aria-label="Whole. Full intro cycle. Press is not a Yes."
          onClick={enterWhole}
          className="absolute left-1/2 top-1/2 z-10 grid size-[min(28vw,7.5rem)] min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 active:scale-[0.96]"
          style={{ background: stroke, color: fill }}
        >
          <span className="font-display text-[0.7rem] font-medium uppercase tracking-[0.28em] sm:text-xs">
            Whole
          </span>
        </button>

        {GATE_STAGES.map((stage, i) => {
          const rad = (stage.angle * Math.PI) / 180;
          const left = 50 + Math.cos(rad) * ray;
          const top = 50 + Math.sin(rad) * ray;
          const labelLeft = 50 + Math.cos(rad) * (ray + 12);
          const labelTop = 50 + Math.sin(rad) * (ray + 12);
          return (
            <div key={stage.world}>
              <button
                type="button"
                data-testid={`gate-${stage.world}`}
                aria-label={`${stage.label}. Enter at this stage. Press is not a Yes.`}
                onClick={() => enterStage(stage.world)}
                className="absolute z-10 grid size-[min(16vw,4.25rem)] min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 active:scale-[0.96]"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  background: stroke,
                  color: fill,
                  opacity: on ? 1 : 0,
                  transform: `translate(-50%, -50%) scale(${on ? 1 : 0.25})`,
                  transition: reduced
                    ? undefined
                    : `opacity 350ms var(--ease-out) ${i * 80}ms, transform 350ms var(--ease-out) ${i * 80}ms`,
                }}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-[18%] rounded-full border opacity-40"
                  style={{ borderColor: "currentColor" }}
                />
                <span className="sr-only">{stage.label}</span>
              </button>
              <p
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 font-display text-[0.65rem] font-medium uppercase tracking-[0.28em] sm:text-xs"
                style={{
                  left: `${labelLeft}%`,
                  top: `${labelTop}%`,
                  opacity: on ? 0.92 : 0,
                  transition: reduced ? undefined : `opacity 400ms var(--ease-out) ${120 + i * 80}ms`,
                }}
              >
                {stage.label}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-6 max-w-sm px-4 text-center text-xs tracking-wide opacity-70">
        A point is a stage. Whole is the cycle. Neither is a Yes.
      </p>
    </div>
  );
}

function ReadingStack({
  hole,
  onPress,
  compact = false,
}: {
  hole: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  const label = compact
    ? "font-display text-xs font-medium tracking-[0.42em] uppercase"
    : "font-display text-sm font-medium tracking-[0.42em] uppercase";
  const field = hole
    ? "flex flex-col items-center justify-center bg-hole-field text-hole-dot"
    : "flex flex-col items-center justify-center bg-light-field text-light-dot";

  return (
    <div className={compact ? field : "flex flex-col items-center justify-center"}>
      <p className={label + " mb-8"}>Light</p>
      <EnterDot hole={hole} onPress={onPress} compact={compact} />
      <p className={label + " mt-8"}>Whole</p>
    </div>
  );
}

function EnterDot({
  hole,
  onPress,
  compact = false,
}: {
  hole: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={hole ? "Enter. Whole." : "Enter. Light."}
      onClick={onPress}
      onKeyDown={(e) => {
        if (e.code === "Enter" || e.code === "Space") {
          e.preventDefault();
          onPress();
        }
      }}
      className={
        compact
          ? "relative z-10 grid size-[min(28vw,140px)] min-h-11 min-w-11 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4"
          : "relative z-10 grid size-[min(38vw,200px)] min-h-11 min-w-11 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4"
      }
      style={{
        background: hole ? "var(--color-hole-dot)" : "var(--color-light-dot)",
        color: hole ? "var(--color-hole-field)" : "var(--color-light-field)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[14%] rounded-full border opacity-40"
        style={{ borderColor: "currentColor" }}
      />
      <span className="sr-only">Enter</span>
    </button>
  );
}
