import { Button } from "@/components/ui/button";
import {
  FORM_N_MAX,
  FORM_N_MIN,
  formActionLabel,
  formCaption,
  shapeOf,
} from "@/lib/instrument/formation.ts";
import { CUBE_CORNERS, CUBE_HINGES, EVIDENCE_STAMP, TABLE_LEVELS, yesCount } from "@/lib/instrument/table.ts";
import { useInstrument } from "@/lib/instrument/store.ts";

const field =
  "h-11 shrink-0 rounded-full border border-paper/20 bg-void/40 px-3 font-display text-xs uppercase tracking-wider text-paper";

export function FormationPanel() {
  const stage = useInstrument((s) => s.formStage);
  const n = useInstrument((s) => s.formN);
  const goal = useInstrument((s) => s.formGoal);
  const seats = useInstrument((s) => s.seats);
  const committed = useInstrument((s) => s.committed);
  const goldAttested = useInstrument((s) => s.goldAttested);
  const notFit = useInstrument((s) => s.notFit);
  const viewLevel = useInstrument((s) => s.viewLevel);
  const wellOpen = useInstrument((s) => s.wellOpen);
  const setFormGoal = useInstrument((s) => s.setFormGoal);
  const setFormN = useInstrument((s) => s.setFormN);
  const toggleSeatYes = useInstrument((s) => s.toggleSeatYes);
  const advanceForm = useInstrument((s) => s.advanceForm);
  const tableCommit = useInstrument((s) => s.tableCommit);
  const tableGold = useInstrument((s) => s.tableGold);
  const nameNotFit = useInstrument((s) => s.nameNotFit);
  const setViewLevel = useInstrument((s) => s.setViewLevel);
  const crankMood = useInstrument((s) => s.crankMood);
  if (wellOpen) return null;
  const shape = shapeOf(n);
  const held = yesCount(seats);
  const canAdvance = stage !== "idle" || goal.trim().length > 0;
  const caption = formCaption(stage, n, goal);
  const sitting = stage !== "idle" || notFit;
  const seatsLabel =
    stage === "lenses" || stage === "hold"
      ? shape.polyhedron
      : stage === "pattern"
        ? `${shape.polygon} · pattern`
        : stage === "miss"
          ? "not a fit"
          : shape.polygon;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <label className="min-w-0 flex-1 basis-28">
        <span className="sr-only">Goal</span>
        <input
          type="text"
          value={goal}
          placeholder="Name a goal"
          aria-label="Goal"
          title={caption}
          onChange={(e) => setFormGoal(e.target.value)}
          className="h-11 w-full rounded-full border border-paper/20 bg-void/40 px-4 text-sm text-paper placeholder:text-paper/40"
        />
      </label>
      {sitting ? (
      <label>
        <span className="sr-only">Preferred lodge</span>
        <select
          value={n}
          aria-label="Preferred lodge"
          title="Preference. Census does not draw the lodge."
          onChange={(e) => setFormN(Number(e.target.value))}
          className={field}
        >
          {Array.from({ length: FORM_N_MAX - FORM_N_MIN + 1 }, (_, i) => FORM_N_MIN + i).map((count) => (
            <option key={count} value={count}>
              {shapeOf(count).polygon}
            </option>
          ))}
        </select>
      </label>
      ) : null}
      {sitting
        ? seats.map((seat, i) => (
            <button
              key={seat.name}
              type="button"
              data-testid={`seat-yes-${seat.name}`}
              title={`${seat.name}. Individual Yes on the goal. Not Table Commit.`}
              onClick={() => toggleSeatYes(i)}
              className={
                seat.yesOnGoal
                  ? "h-11 shrink-0 rounded-full border border-paper bg-paper px-3 text-[0.65rem] uppercase tracking-wider text-void"
                  : "h-11 shrink-0 rounded-full border border-paper/20 bg-void/40 px-3 text-[0.65rem] uppercase tracking-wider text-paper/75"
              }
            >
              {seat.name}
            </button>
          ))
        : null}
      <Button
        variant="primary"
        className="shrink-0 bg-paper text-void"
        disabled={!canAdvance}
        onClick={advanceForm}
        data-testid="advance-form"
        title={caption}
      >
        <span className="sm:hidden">{stage === "idle" ? "Set" : formActionLabel(stage)}</span>
        <span className="hidden sm:inline">{formActionLabel(stage)}</span>
      </Button>
      <Button
        data-testid="table-commit"
        className="shrink-0 border-paper/40 bg-void/40 text-paper"
        onClick={tableCommit}
        title="Commit is a human button. Conflict does not grey it. This picture is evidence. It is not a Yes."
      >
        Commit
      </Button>
      {sitting || committed ? (
      <Button
        data-testid="table-gold"
        data-gold={goldAttested ? "true" : "false"}
        className="shrink-0 border-paper/40 bg-void/40 text-paper data-[gold=true]:border-[#f8d8a8] data-[gold=true]:bg-[#f8d8a8] data-[gold=true]:text-void"
        onClick={tableGold}
        title="Gold is a third human act. It does not claim the vows commute."
      >
        Gold
      </Button>
      ) : null}
      {sitting ? (
      <Button
        data-testid="not-a-fit"
        className="shrink-0 border-paper/20 bg-void/40 text-paper"
        onClick={nameNotFit}
        title="The table named a miss, not a failure."
      >
        Not a fit
      </Button>
      ) : null}
      {sitting ? (
      <Button
        data-testid="weather"
        className="shrink-0 border-paper/20 bg-void/40 text-paper"
        onClick={() => crankMood(1)}
        title="Fiber weather. Weather is moving; the plan is not."
      >
        Weather
      </Button>
      ) : null}
      {stage !== "idle" ? (
        <label>
          <span className="sr-only">View level</span>
          <select
            value={viewLevel}
            aria-label="View level"
            onChange={(e) => setViewLevel(e.target.value as typeof viewLevel)}
            className={field}
          >
            {TABLE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <p className="hidden shrink-0 font-mono text-[0.65rem] uppercase tracking-wider text-paper/55 xl:block">
        {held}/{n} Yes · {seatsLabel}
        {committed ? " · committed" : ""}
        {notFit ? " · miss" : ""}
      </p>
      <p className="hidden max-w-[14rem] truncate font-mono text-[0.6rem] tracking-wide text-paper/40 2xl:block" title={`${CUBE_HINGES[viewLevel].map((h) => `${h.plus}|${h.minus}`).join(" · ")} · ${CUBE_CORNERS[viewLevel].join(" · ")}`}>
        {CUBE_CORNERS[viewLevel].join(" · ")}
      </p>
      <span className="sr-only">{EVIDENCE_STAMP}</span>
    </div>
  );
}
