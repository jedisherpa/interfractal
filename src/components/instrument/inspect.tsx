import { Button } from "@/components/ui/button";
import {
  currentFrame,
  currentOverlay,
  currentVertex,
  director,
  useInstrument,
} from "@/lib/instrument/store.ts";
import { inspect } from "@/workshop/view.ts";
import { hopf, state } from "@/workshop/hopf.ts";
import { VERTEX_IDS, VERTEX_META } from "@/workshop/types.ts";

export function InstrumentInspect() {
  const tick = useInstrument((s) => s.tick);
  const selection = useInstrument((s) => s.selection);
  const mathLens = useInstrument((s) => s.mathLens);
  const command = useInstrument((s) => s.command);
  const setSelection = useInstrument((s) => s.setSelection);
  const setMathLens = useInstrument((s) => s.setMathLens);
  const closeWell = useInstrument((s) => s.closeWell);
  void tick;

  const vertex = currentVertex();
  const frame = currentFrame();
  const overlay = currentOverlay();
  const slot = director.at(vertex);
  const body = inspect(frame, selection);
  const proto = hopf(slot.workshop.z);
  const disp = hopf(state(slot.display.theta, slot.display.phi, slot.display.gamma));
  const zMatch = director.displayMatchesProtocol(vertex);

  return (
    <aside className="pointer-events-auto flex max-h-[min(92dvh,840px)] w-full flex-col gap-3 overflow-auto rounded-xl border border-line bg-surface/95 p-4 text-ink shadow-panel lg:w-[380px]">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted">
            {VERTEX_META[vertex].prism} · {VERTEX_META[vertex].mode}
          </p>
          <h2 className="font-display text-lg font-medium tracking-tight text-balance">Decision Well</h2>
          <p className="mt-1 text-pretty text-sm text-muted">
            Maya, Finn, and Bea are labeled practice seats. Ready is not Yes. Explore copies display z.
          </p>
        </div>
        <Button size="sm" onClick={closeWell}>
          Close
        </Button>
      </header>

      <p className="rounded-md border border-line bg-wash px-3 py-2 font-mono text-xs leading-relaxed text-ink">
        {frame.nextStep}
      </p>
      <p className="text-pretty text-sm">
        {body.title}. {body.body}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          onClick={() =>
            command(() => director.explore(vertex), "[CMD] Explore copied display z. Permissions unchanged.")
          }
        >
          Explore
        </Button>
        <Button
          disabled={!slot.explored}
          onClick={() =>
            command(() => director.proposeSuggestion(vertex), "[CMD] Suggestion proposed. Suggestion is not a grant.")
          }
        >
          Propose suggestion
        </Button>
        <Button onClick={() => command(() => director.review(vertex), "[CMD] Reviews recorded. Reviews are not consent.")}>
          Record reviews
        </Button>
        <Button
          variant="primary"
          disabled={!frame.actionAvailability.find((a) => a.id === "commit")?.available}
          onClick={() => command(() => director.commit(vertex), "[CMD] Make this agreement")}
        >
          Make this agreement
        </Button>
        <Button
          disabled={!frame.actionAvailability.find((a) => a.id === "act")?.available}
          onClick={() => command(() => director.act(vertex), "[CMD] Simulated action. Rain is presentation of Act.")}
        >
          Try the agreed action
        </Button>
        <Button
          disabled={!frame.actionAvailability.find((a) => a.id === "repair")?.available}
          onClick={() =>
            command(
              () => director.repair(vertex, "Others accept a smaller form; unused materials returned."),
              "[CMD] Repair recorded. Consent not restored.",
            )
          }
        >
          Record repair
        </Button>
      </div>

      <ul className="grid gap-2">
        {frame.participants.map((p) => (
          <li key={p.id} className="rounded-md border border-line px-3 py-2">
            <button
              type="button"
              className="text-left text-sm font-medium"
              onClick={() => setSelection({ type: "person", id: p.id, name: p.name })}
            >
              {p.name}
              <span className="ml-2 font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                {p.response}
                {p.ready ? " · ready" : ""}
              </span>
            </button>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Button
                size="sm"
                onClick={() =>
                  command(
                    () => director.setReady(vertex, p.name, !p.ready),
                    `[CMD] ${p.name} ready toggled. Readiness is not consent.`,
                  )
                }
              >
                {p.ready ? "Unready" : "Ready"}
              </Button>
              <Button
                size="sm"
                onClick={() => command(() => director.consent(vertex, p.name, true), `[CMD] ${p.name} Yes on this version`)}
              >
                Yes
              </Button>
              <Button
                size="sm"
                onClick={() => command(() => director.consent(vertex, p.name, false), `[CMD] ${p.name} No`)}
              >
                No
              </Button>
              <Button
                size="sm"
                disabled={frame.agreement?.status !== "active"}
                onClick={() => command(() => director.withdraw(vertex, p.name), `[CMD] ${p.name} withdrew.`)}
              >
                Withdraw
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div>
        <p className="mb-1 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted">Copy-preview</p>
        <div className="flex flex-wrap gap-1.5">
          {VERTEX_IDS.filter((id) => id !== vertex).map((id) => (
            <Button
              key={id}
              size="sm"
              onClick={() =>
                command(() => director.copyPreview(vertex, id), `[CMD] Copy-preview → ${id}. Destination consents unset.`)
              }
            >
              {VERTEX_META[id].prism}
            </Button>
          ))}
        </div>
      </div>

      <p className="font-mono text-[0.7rem] text-muted">
        Display z {zMatch ? "matches" : "is not"} protocol z
        {slot.explored ? " (Explore copied it)." : " until Explore copies it."}
      </p>
      <p className="font-mono text-[0.7rem] text-muted">
        Pose {overlay.wellPose} · π(z) [{proto[0].toFixed(2)}, {disp[0].toFixed(2)}]
      </p>
      <button type="button" className="text-left text-xs underline" onClick={() => setMathLens(!mathLens)}>
        {mathLens ? "Hide math lens" : "Open math lens"}
      </button>
      {mathLens ? (
        <p className="font-mono text-[0.7rem] text-muted">
          A person is not a fibre. Geometry is not permission. Carry is constraint, not inherited Yes.
        </p>
      ) : null}
    </aside>
  );
}
