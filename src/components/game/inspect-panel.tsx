import { Button } from "@/components/ui/button";
import {
  currentFrame,
  currentOverlay,
  currentVertex,
  director,
  useGame,
} from "@/lib/game/store.ts";
import { inspect } from "@/workshop/view.ts";
import { CHEEGER_CAPTION, FIELD_K, integerIdentity, protocolBase } from "@/workshop/geometry.ts";
import { VERTEX_IDS, VERTEX_META } from "@/workshop/types.ts";
import { hopf, state } from "@/workshop/hopf.ts";

export function InspectPanel() {
  const tick = useGame((s) => s.tick);
  const selection = useGame((s) => s.selection);
  const mathLens = useGame((s) => s.mathLens);
  const command = useGame((s) => s.command);
  const setSelection = useGame((s) => s.setSelection);
  const setMathLens = useGame((s) => s.setMathLens);
  const closeWell = useGame((s) => s.closeWell);
  const overlayCloud = currentOverlay().cloudNine;
  void tick;

  const vertex = currentVertex();
  const frame = currentFrame();
  const overlay = currentOverlay();
  const slot = director.at(vertex);
  const body = inspect(frame, selection);
  const proto = protocolBase(slot.workshop.z);
  const disp = hopf(state(slot.display.theta, slot.display.phi, slot.display.gamma));
  const zMatch = director.displayMatchesProtocol(vertex);

  return (
    <aside className="pointer-events-auto flex max-h-[min(92dvh,840px)] w-full flex-col gap-3 overflow-auto rounded-xl border border-line bg-surface/95 p-4 text-ink shadow-panel lg:w-[380px]">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted">
            {VERTEX_META[vertex].prism} · {VERTEX_META[vertex].mode}
          </p>
          <h2 className="font-display text-lg font-medium tracking-tight text-balance">
            Decision Well
          </h2>
          <p className="mt-1 text-pretty text-sm text-muted">
            Teaching model. Maya, Finn, and Bea are labeled fictional practice seats. Selecting a
            seat does not sign in as that person.
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

      <div className="grid gap-2">
        <label className="text-xs text-muted">
          Display θ
          <input
            className="mt-1 w-full accent-accent"
            type="range"
            min={0.15}
            max={2.95}
            step={0.01}
            value={slot.display.theta}
            onChange={(e) =>
              command(() => director.setDisplay(vertex, { theta: Number(e.target.value) }))
            }
          />
        </label>
        <label className="text-xs text-muted">
          Display φ
          <input
            className="mt-1 w-full accent-accent"
            type="range"
            min={0}
            max={6.28}
            step={0.01}
            value={slot.display.phi}
            onChange={(e) =>
              command(() => director.setDisplay(vertex, { phi: Number(e.target.value) }))
            }
          />
        </label>
        <p className="font-mono text-[0.7rem] text-muted">
          Display z {zMatch ? "matches" : "is not"} protocol z
          {slot.explored ? " (Explore copied it)." : " until Explore copies it."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          onClick={() => command(() => director.explore(vertex), "[CMD] Explore copied display z. Permissions unchanged.")}
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
        <Button
          onClick={() =>
            command(
              () => director.propose(vertex, "Carry the dragon through the checked orchard route"),
              "[CMD] New draft. Old Yes marks do not move.",
            )
          }
        >
          New draft
        </Button>
        <Button onClick={() => command(() => director.review(vertex), "[CMD] Reviews recorded. Reviews are not consent.")}>
          Record reviews
        </Button>
        <Button
          variant="primary"
          disabled={!frame.actionAvailability.find((a) => a.id === "commit")?.available}
          onClick={() => {
            command(() => {
              const ok = director.commit(vertex);
              return ok;
            }, "[CMD] Make this agreement");
          }}
        >
          Make this agreement
        </Button>
        <Button
          disabled={!frame.actionAvailability.find((a) => a.id === "act")?.available}
          onClick={() => command(() => director.act(vertex), "[CMD] Simulated action")}
        >
          Try the agreed action
        </Button>
        <Button
          disabled={!frame.actionAvailability.find((a) => a.id === "repair")?.available}
          onClick={() =>
            command(
              () => director.repair(vertex, "Others accept a smaller dragon; unused materials returned."),
              "[CMD] Repair recorded. Consent not restored.",
            )
          }
        >
          Record repair
        </Button>
        <Button
          disabled={!frame.actionAvailability.find((a) => a.id === "release")?.available}
          onClick={() => command(() => director.release(vertex, "Old arrangement responsibly retired"), "[CMD] Released")}
        >
          Release / retire
        </Button>
        <Button
          onClick={() =>
            command(() => director.holonomy(vertex), "[CMD] Holonomy. You can return without pretending the journey never happened.")
          }
        >
          Holonomy loop
        </Button>
      </div>

      <ul className="grid gap-2">
        {frame.participants.map((p) => (
          <li key={p.id} className="rounded-md border border-line px-3 py-2">
            <div className="flex items-center justify-between gap-2">
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
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Button
                size="sm"
                onClick={() => command(() => director.setReady(vertex, p.name, !p.ready), `[CMD] ${p.name} ready toggled. Readiness is not consent.`)}
              >
                {p.ready ? "Unready" : "Ready"}
              </Button>
              <Button size="sm" onClick={() => command(() => director.consent(vertex, p.name, true), `[CMD] ${p.name} Yes on this version`)}>
                Yes
              </Button>
              <Button size="sm" onClick={() => command(() => director.consent(vertex, p.name, false), `[CMD] ${p.name} No`)}>
                No
              </Button>
              <Button
                size="sm"
                disabled={frame.agreement?.status !== "active"}
                onClick={() => command(() => director.withdraw(vertex, p.name), `[CMD] ${p.name} withdrew. Action paused.`)}
              >
                Withdraw
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div>
        <p className="mb-1 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted">
          Copy-preview
        </p>
        <div className="flex flex-wrap gap-1.5">
          {VERTEX_IDS.filter((id) => id !== vertex).map((id) => (
            <Button
              key={id}
              size="sm"
              onClick={() =>
                command(() => director.copyPreview(vertex, id), `[CMD] Copy-preview → ${id}. Destination consents unset.`)
              }
            >
              {id} {VERTEX_META[id].world}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-line bg-wash px-3 py-2 font-mono text-[0.7rem] leading-relaxed text-muted">
        <p>Pose {overlay.wellPose} · local {overlay.localAlignment ? "aligned" : "open"} · Cloud Nine {overlay.cloudNine ? "yes" : "no"}</p>
        <p>
          Protocol π(z) [{proto.n[0].toFixed(3)}, {proto.n[1].toFixed(3)}, {proto.n[2].toFixed(3)}]
        </p>
        <p>
          Display π(z) [{disp[0].toFixed(3)}, {disp[1].toFixed(3)}, {disp[2].toFixed(3)}]
        </p>
        <button type="button" className="mt-2 underline" onClick={() => setMathLens(!mathLens)}>
          {mathLens ? "Hide math lens" : "Open math lens"}
        </button>
        {mathLens && (
          <div className="mt-2 space-y-1 text-ink">
            <p>{FIELD_K} — shared constant field for lengths, not a vacuum.</p>
            <p>{integerIdentity()} — labeled numerical check. Field-discriminant claim UNKNOWN.</p>
            {overlayCloud && <p>{CHEEGER_CAPTION}</p>}
            <p>A person is not a fibre. Geometry is not permission.</p>
          </div>
        )}
      </div>
    </aside>
  );
}
