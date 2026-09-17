import { RotateCcw } from "lucide-react";
import { FACE_META, holonomy, PI } from "@/lib/hopf";
import { actionBlockers, commitBlockers, useProtocol } from "@/lib/store";
import { Button } from "@/components/ui/button";

function statusCopy(args: {
  agreement: ReturnType<typeof useProtocol.getState>["agreement"];
  reviews: boolean;
  version: number;
  people: ReturnType<typeof useProtocol.getState>["people"];
}) {
  const allYes = args.people.every((p) => p.response === "yes" && p.responseVersion === args.version);
  if (args.agreement === "active") return { label: "Agreement sealed", tone: "ok" as const };
  if (args.agreement === "paused") return { label: "Paused · withdrawal", tone: "warn" as const };
  if (allYes && args.reviews) return { label: "Ready to commit", tone: "ok" as const };
  return { label: "No agreement yet", tone: "muted" as const };
}

export function Inspector() {
  const version = useProtocol((s) => s.version);
  const proposal = useProtocol((s) => s.proposal);
  const agreement = useProtocol((s) => s.agreement);
  const reviews = useProtocol((s) => s.reviews);
  const spinning = useProtocol((s) => s.spinning);
  const solid = useProtocol((s) => s.solid);
  const selectedFacet = useProtocol((s) => s.selectedFacet);
  const people = useProtocol((s) => s.people);
  const repairOpen = useProtocol((s) => s.repairOpen);
  const answer = useProtocol((s) => s.answer);
  const recordReviews = useProtocol((s) => s.recordReviews);
  const propose = useProtocol((s) => s.propose);
  const commit = useProtocol((s) => s.commit);
  const act = useProtocol((s) => s.act);
  const reset = useProtocol((s) => s.reset);
  const toggleSpin = useProtocol((s) => s.toggleSpin);
  const cycleSolid = useProtocol((s) => s.cycleSolid);
  const selectPerson = useProtocol((s) => s.selectPerson);
  const selectedPerson = useProtocol((s) => s.selectedPerson);

  const snapshot = { version, proposal, agreement, reviews, repairOpen, people };
  const blocked =
    agreement === "active" ? actionBlockers(snapshot) : commitBlockers(snapshot);
  const facet = FACE_META[selectedFacet] ?? FACE_META[1];
  const commitDisabled = commitBlockers(snapshot).length > 0;
  const actDisabled = actionBlockers(snapshot).length > 0;
  const status = statusCopy({ agreement, reviews, version, people });

  return (
    <aside className="flex h-full min-h-0 flex-col gap-4 overflow-auto rounded-xl border border-line bg-surface p-4 text-ink shadow-panel">
      <div>
        <h2 className="font-display text-lg font-medium tracking-tight text-balance">Shared moment</h2>
        <p className="mt-1 text-pretty text-sm leading-normal text-muted">
          v{version} · {proposal}
        </p>
        <p
          className={`mt-2 font-mono text-xs uppercase tracking-[0.08em] ${
            status.tone === "ok" ? "text-ok" : status.tone === "warn" ? "text-warn" : "text-muted"
          }`}
        >
          {status.label}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={propose}>
          New draft
        </Button>
        <Button onClick={recordReviews}>Record reviews</Button>
        <Button onClick={commit} disabled={commitDisabled}>
          Commit
        </Button>
        <Button onClick={act} disabled={actDisabled}>
          Act
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={reset}>
          <RotateCcw className="mr-1.5 size-3.5" aria-hidden />
          Fresh attempt
        </Button>
        <Button onClick={toggleSpin}>{spinning ? "Stop spinning" : "Spin slowly"}</Button>
        <Button onClick={cycleSolid}>Solid: {solid}</Button>
      </div>

      <section>
        <h3 className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.08em] text-muted">
          People · intentions
        </h3>
        <ul className="mt-2 divide-y divide-line">
          {people.map((p) => {
            const currentYes = p.response === "yes" && p.responseVersion === version;
            const currentNo = p.response === "no" && p.responseVersion === version;
            return (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <button
                  type="button"
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => selectPerson(p.id)}
                >
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ background: p.color }}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{p.id}</span>
                    <span className="block text-xs text-muted">
                      {p.response === "unset"
                        ? "has not answered"
                        : `${p.response} · v${p.responseVersion ?? "—"}`}
                      {selectedPerson === p.id ? " · selected" : ""}
                    </span>
                  </span>
                </button>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    variant={currentYes ? "primary" : "outline"}
                    onClick={() => answer(p.id, "yes")}
                  >
                    Yes
                  </Button>
                  <Button
                    size="sm"
                    variant={currentNo ? "primary" : "outline"}
                    onClick={() => answer(p.id, "no")}
                  >
                    No
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => answer(p.id, "withdraw")}
                    disabled={agreement !== "active"}
                  >
                    Stop
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h3 className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.08em] text-muted">
          Calculator
        </h3>
        <div className="mt-2 rounded-md bg-wash px-3 py-2.5 font-mono text-xs leading-relaxed tabular-nums">
          <p>agreement · {agreement ?? "none"}</p>
          <p>reviews · {reviews ? `recorded for v${version}` : "missing"}</p>
          <p>holonomy at 60° · {((holonomy(PI / 3) * 180) / PI).toFixed(0)}°</p>
          <p>featured pairwise links · 6</p>
          <p>Chern check · −1</p>
          <p className={blocked.length ? "text-warn" : "text-ok"}>
            {blocked.length
              ? `blocked · ${blocked[0]}`
              : "path open for the next explicit command"}
          </p>
        </div>
      </section>

      <section>
        <h3 className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.08em] text-muted">
          Lit facet
        </h3>
        <p className="mt-2 text-sm font-medium">{facet.title}</p>
        <p className="mt-1 text-pretty text-sm leading-normal text-muted">{facet.body}</p>
      </section>

      <section className="mt-auto border-t border-line pt-4">
        <h3 className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.08em] text-muted">
          What this is / isn’t
        </h3>
        <p className="mt-2 text-pretty text-sm leading-normal text-muted">
          The hoops are intention-spaces. The solid structures the kind of agreement. Clustering is
          a picture, not permission. A loop is not a person. Topology does not authorize. Drag to
          orbit; click a facet or a bead.
        </p>
      </section>
    </aside>
  );
}
