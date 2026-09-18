import { Button } from "@/components/ui/button";
import { FormationPanel } from "@/components/instrument/formation-panel.tsx";
import { InstrumentInspect } from "@/components/instrument/inspect.tsx";
import {
  endingCaption,
  ROOM_CAPTION,
  WELLNESS,
  WELLNESS_IDS,
  WORLD_ORDER,
  WORLDS,
  type WorldId,
} from "@/lib/instrument/cosmology.ts";
import { formCaption } from "@/lib/instrument/formation.ts";
import { remainderOpen } from "@/lib/instrument/remainder.ts";
import {
  TABLE_LEVELS,
  confirmedCount,
  findContradictions,
  revealCaption,
  yesCount,
} from "@/lib/instrument/table.ts";
import { orbit } from "@/lib/instrument/orbit.ts";
import {
  currentCarry,
  currentEnding,
  currentFrame,
  selfHeld,
  useInstrument,
} from "@/lib/instrument/store.ts";

const chip =
  "h-11 shrink-0 rounded-full border border-paper/20 bg-void/40 px-3 font-display text-xs uppercase tracking-wider text-paper";

export function InstrumentHud() {
  const phase = useInstrument((s) => s.phase);
  const beat = useInstrument((s) => s.beat);
  const world = useInstrument((s) => s.world);
  const wellOpen = useInstrument((s) => s.wellOpen);
  const cyclePlaying = useInstrument((s) => s.cyclePlaying);
  const aligned = useInstrument((s) => s.aligned);
  const log = useInstrument((s) => s.log);
  const tick = useInstrument((s) => s.tick);
  const setWorld = useInstrument((s) => s.setWorld);
  const openWell = useInstrument((s) => s.openWell);
  const playCycle = useInstrument((s) => s.playCycle);
  const pauseCycle = useInstrument((s) => s.pauseCycle);
  const stepCycle = useInstrument((s) => s.stepCycle);
  const reduced = useInstrument((s) => s.reducedMotion);
  const setReducedMotion = useInstrument((s) => s.setReducedMotion);
  const skipIntro = useInstrument((s) => s.skipIntro);
  const formStage = useInstrument((s) => s.formStage);
  const formN = useInstrument((s) => s.formN);
  const formGoal = useInstrument((s) => s.formGoal);
  const seats = useInstrument((s) => s.seats);
  const ringing = useInstrument((s) => s.ringing);
  const weatherMoving = useInstrument((s) => s.weatherMoving);
  const committed = useInstrument((s) => s.committed);
  const goldAttested = useInstrument((s) => s.goldAttested);
  void tick;

  const ending = currentEnding();
  const carry = currentCarry();
  const frame = currentFrame();
  const held = selfHeld();
  const marks = findContradictions(seats);
  const reveal = revealCaption({
    ringing,
    weather: weatherMoving,
    contradiction: marks[0] ?? null,
    confirmedCount: confirmedCount(seats),
    commute: marks.length === 0,
    committed,
    goldAttested,
  });
  const remainderInput = {
    phase,
    formStage,
    wellOpen,
    cyclePlaying,
    reducedMotion: reduced,
  };
  const lampOpen = remainderOpen(remainderInput);
  const showYourTurn =
    lampOpen && (formStage === "hold" || phase === "intro" || phase === "room");

  if (phase === "intro") {
    return (
      <div className="absolute inset-x-0 bottom-6 z-10 flex flex-col items-center gap-3 px-4">
        <p className="pointer-events-none rounded-full border border-paper/20 bg-void/75 px-4 py-2 font-display text-sm tracking-[0.18em] text-paper uppercase">
          {ROOM_CAPTION[beat]}
        </p>
        <div className="flex items-center gap-1.5">
          <span
            data-testid="remainder-lamp"
            data-open={lampOpen ? "true" : "false"}
            className={`${chip} pointer-events-none ${lampOpen ? "border-paper/45" : "opacity-40"}`}
          >
            {showYourTurn ? "Your turn" : ""}
          </span>
          <button
            type="button"
            data-testid="skip-intro"
            className="pointer-events-auto h-11 rounded-full border border-paper/35 bg-void/70 px-4 text-xs font-medium text-paper"
            onClick={skipIntro}
          >
            Skip intro
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="pointer-events-auto absolute inset-x-0 top-0 z-20 border-b border-paper/15 bg-void/80 pt-[env(safe-area-inset-top)] text-paper">
        <div className="flex h-12 min-h-11 items-center gap-1.5 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <label className="shrink-0">
            <span className="sr-only">World</span>
            <select
              value={world}
              aria-label="World"
              title={`${WORLDS[world].altitude}. ${WORLDS[world].caption}`}
              onChange={(e) => setWorld(e.target.value as typeof world)}
              className={chip}
            >
              {WORLD_ORDER.map((id) => (
                <option key={id} value={id}>
                  {id === "C9" ? "Cloud Nine" : WORLDS[id].label}
                </option>
              ))}
            </select>
          </label>
          <span
            data-testid="remainder-lamp"
            data-open={lampOpen ? "true" : "false"}
            className={`${chip} ${lampOpen ? "border-paper/45" : "opacity-40"}`}
          >
            {showYourTurn ? "Your turn" : ""}
          </span>
          <p className="hidden shrink-0 font-mono text-[0.6rem] tracking-wide text-paper/40 lg:block">
            loops = weather · dots = people · geometry ≠ permission
          </p>
          <p className="hidden shrink-0 font-mono text-[0.65rem] uppercase tracking-wider text-paper/55 xl:block">
            {endingCaption(ending, world)}
            {held ? " · Self revealed" : ""}
          </p>

          {!wellOpen ? <FormationPanel /> : <div className="min-w-0 flex-1" />}

          <details className="relative shrink-0 sm:hidden">
            <summary className={`${chip} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
              More
            </summary>
            <div className="absolute right-0 top-[calc(100%+6px)] z-30 flex w-52 flex-col gap-1 rounded-xl border border-paper/15 bg-void/95 p-2">
              <MoreActions
                log={log}
                cyclePlaying={cyclePlaying}
                reduced={reduced}
                world={world}
                wellOpen={wellOpen}
                playCycle={playCycle}
                pauseCycle={pauseCycle}
                openWell={openWell}
                setReducedMotion={setReducedMotion}
              />
            </div>
          </details>

          <div className="hidden items-center gap-1.5 sm:flex">
            <details className="relative shrink-0">
              <summary className={`${chip} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
                Log
              </summary>
              <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-paper/15 bg-void/95 p-3 font-mono text-[0.65rem] leading-relaxed text-paper/75">
                {log.slice(-5).map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </details>
            <Button
              className="shrink-0 bg-void/40 text-paper border-paper/20"
              title="Tour of weather. Not a Yes."
              onClick={() => (cyclePlaying ? pauseCycle() : playCycle())}
            >
              {cyclePlaying ? "Pause" : "Cycle"}
            </Button>
            <Button
              className="hidden shrink-0 bg-void/40 text-paper border-paper/20 md:inline-flex"
              onClick={() => stepCycle(-1)}
            >
              Up
            </Button>
            <Button
              className="hidden shrink-0 bg-void/40 text-paper border-paper/20 md:inline-flex"
              onClick={() => stepCycle(1)}
            >
              Down
            </Button>
            {world !== "C9" && !wellOpen ? (
              <Button variant="primary" className="shrink-0 bg-paper text-void" onClick={openWell}>
                Well
              </Button>
            ) : null}
            <Button
              className="shrink-0 bg-void/40 text-paper border-paper/20"
              onClick={() => setReducedMotion(!reduced)}
            >
              {reduced ? "Motion" : "Still"}
            </Button>
          </div>
        </div>

        {formStage !== "idle" ? (
          <p className="truncate px-3 py-1 font-mono text-[0.65rem] tracking-wide text-paper/55">
            {formStage === "miss" ? formCaption(formStage, formN, formGoal) : (reveal ?? formCaption(formStage, formN, formGoal))}
          </p>
        ) : null}

        {formStage !== "idle" && !wellOpen ? (
          <div className="flex items-center gap-3 overflow-x-auto border-t border-paper/10 px-3 py-1 font-mono text-[0.6rem] uppercase tracking-wider text-paper/55 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {seats.map((seat) => (
              <span key={seat.name} className={seat.yesOnGoal ? "text-paper/80" : "text-paper/35"}>
                {seat.name}{" "}
                {TABLE_LEVELS.map((level) => {
                  const fight = marks.some(
                    (m) => m.seatA === seat.name && (m.levelA === level || m.levelB === level),
                  );
                  const lean = seat.levels[level].corners.some((c) => Math.abs(c.lean) > 0.25);
                  const mark = fight ? "/" : lean ? "*" : "-";
                  return (
                    <span key={level} title={`${seat.name} ${level}`}>
                      {level[0]}
                      {mark}{" "}
                    </span>
                  );
                })}
              </span>
            ))}
            <span className="text-paper/70">
              group{" "}
              {TABLE_LEVELS.map((level) => {
                const fight = marks.some((m) => m.levelA === level || m.levelB === level);
                const lean = seats.some((seat) => seat.levels[level].corners.some((c) => Math.abs(c.lean) > 0.25));
                return (
                  <span key={`g-${level}`} title={`group ${level} — never an average`}>
                    {level[0]}
                    {fight ? "/" : lean ? "*" : "-"}{" "}
                  </span>
                );
              })}
            </span>
            <span className="text-paper/40">
              {yesCount(seats)} Yes · {confirmedCount(seats)} records
            </span>
          </div>
        ) : null}

        {world === "W1" && !wellOpen ? (
          <div className="flex items-center gap-1.5 overflow-x-auto border-t border-paper/10 px-3 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {WELLNESS_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => useInstrument.getState().toggleWellness(id)}
                className={
                  aligned[id]
                    ? "h-11 shrink-0 rounded-full border border-paper/50 bg-paper/15 px-3 text-[0.65rem] uppercase tracking-wider text-paper"
                    : "h-11 shrink-0 rounded-full border border-paper/20 bg-transparent px-3 text-[0.65rem] uppercase tracking-wider text-paper/70"
                }
              >
                {WELLNESS[id].name}
              </button>
            ))}
          </div>
        ) : null}

        {carry.length ? (
          <p className="truncate px-3 py-1 font-mono text-[0.65rem] text-paper/60">
            {carry[0]?.direction === "down" ? "Down" : "Up"} · {carry[0]?.label}
          </p>
        ) : null}
      </header>

      {wellOpen ? (
        <div className="absolute right-3 top-16 z-20 max-h-[min(80dvh,calc(100dvh-5rem))] overflow-auto sm:right-4">
          <InstrumentInspect />
        </div>
      ) : null}

      <p className="sr-only">{frame.nextStep}</p>
      <TouchOrbit />
    </>
  );
}

function MoreActions({
  log,
  cyclePlaying,
  reduced,
  world,
  wellOpen,
  playCycle,
  pauseCycle,
  openWell,
  setReducedMotion,
}: {
  log: string[];
  cyclePlaying: boolean;
  reduced: boolean;
  world: WorldId;
  wellOpen: boolean;
  playCycle: () => void;
  pauseCycle: () => void;
  openWell: () => void;
  setReducedMotion: (v: boolean) => void;
}) {
  return (
    <>
      <div className="max-h-28 overflow-auto font-mono text-[0.65rem] leading-relaxed text-paper/75">
        {log.slice(-4).map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      <Button
        className="w-full bg-void/40 text-paper border-paper/20"
        title="Tour of weather. Not a Yes."
        onClick={() => (cyclePlaying ? pauseCycle() : playCycle())}
      >
        {cyclePlaying ? "Pause cycle" : "View whole cycle"}
      </Button>
      {world !== "C9" && !wellOpen ? (
        <Button variant="primary" className="w-full bg-paper text-void" onClick={openWell}>
          Open well
        </Button>
      ) : null}
      <Button
        className="w-full bg-void/40 text-paper border-paper/20"
        onClick={() => setReducedMotion(!reduced)}
      >
        {reduced ? "Motion on" : "Reduce motion"}
      </Button>
    </>
  );
}

function TouchOrbit() {
  const wellOpen = useInstrument((s) => s.wellOpen);
  if (wellOpen) return null;
  return (
    <div className="pointer-events-auto absolute bottom-4 right-3 z-10 hidden grid-cols-3 gap-1.5 max-md:grid">
      {(["KeyQ", "KeyW", "KeyE", "KeyA", "KeyS", "KeyD"] as const).map((code) => (
        <button
          key={code}
          type="button"
          className="h-11 w-11 rounded-md border border-paper/20 bg-void/80 text-[0.65rem] text-paper"
          onPointerDown={(e) => {
            e.preventDefault();
            orbit.add(code);
          }}
          onPointerUp={() => orbit.delete(code)}
          onPointerCancel={() => orbit.delete(code)}
        >
          {code.replace("Key", "")}
        </button>
      ))}
    </div>
  );
}
