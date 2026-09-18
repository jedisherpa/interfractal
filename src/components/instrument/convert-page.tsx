import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { submitConvertLead } from "@/lib/instrument/convert-submit.ts";
import {
  CONVERT_FINE_PRINT,
  CONVERT_SUCCESS,
  CONVERT_TITLE,
  parseConvertInput,
} from "@/lib/instrument/convert.ts";
import {
  FUNNEL_SOURCE,
  isMatterDoor,
  parseFunnelSearch,
  readCarriedGoal,
  writeCarriedGoal,
  type FunnelDoor,
  type FunnelSearch,
} from "@/lib/instrument/funnel.ts";
import { EVIDENCE_STAMP } from "@/lib/instrument/table.ts";

const field =
  "h-11 w-full rounded-full border border-paper/20 bg-void/40 px-4 text-sm text-paper placeholder:text-paper/40";

export function ConvertPage({ search }: { search?: FunnelSearch } = {}) {
  const routeSearch = search ?? parseFunnelSearch(typeof window !== "undefined" ? window.location.search : "");
  const storage = typeof sessionStorage === "undefined" ? null : sessionStorage;
  const initialGoal = readCarriedGoal(storage, routeSearch.goal);
  const door: FunnelDoor = routeSearch.door === "chamber" ? "chamber" : "matter";

  const [goal, setGoal] = useState(initialGoal);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const carried = readCarriedGoal(storage, routeSearch.goal);
    if (carried) setGoal((current) => current.trim() || carried);
  }, [routeSearch.goal, storage]);

  async function submitLead() {
    if (pending || done) return;
    setError("");
    const form = formRef.current;
    const posted = form ? Object.fromEntries(new FormData(form).entries()) : {};
    let payload;
    try {
      payload = parseConvertInput({
        email: String(posted.email ?? email),
        name: String(posted.name ?? name),
        goal: String(posted.goal ?? goal),
        door,
        source: FUNNEL_SOURCE,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Name a goal and leave an email.");
      return;
    }
    writeCarriedGoal(payload.goal, storage);
    setPending(true);
    try {
      await submitConvertLead({ data: payload });
    } catch {
      console.info("[convert] local log (server unavailable)", payload);
    }
    setPending(false);
    setDone(true);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitLead();
  }

  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center bg-void px-4 py-16 text-paper"
      data-testid="convert-page"
      data-door={door}
      data-from={routeSearch.from ?? ""}
      data-matter={isMatterDoor(routeSearch) ? "1" : "0"}
    >
      <div className="w-full max-w-md">
        <p className="font-display text-[0.65rem] uppercase tracking-[0.28em] text-paper/50">Place</p>
        <h1 className="mt-2 font-display text-3xl tracking-tight text-paper" data-testid="convert-title">
          {CONVERT_TITLE}
        </h1>
        <p className="mt-3 max-w-sm text-pretty text-sm leading-relaxed text-paper/70">
          Name it. Leave a way to reach you. This is not checkout.
        </p>

        {done ? (
          <div className="mt-10" data-testid="convert-success">
            <p className="font-display text-2xl text-paper">{CONVERT_SUCCESS}</p>
            <p className="mt-3 text-sm text-paper/60">{CONVERT_FINE_PRINT}</p>
          </div>
        ) : (
          <form
            ref={formRef}
            className="mt-8 flex flex-col gap-4"
            method="post"
            action="#"
            onSubmit={onSubmit}
            data-testid="convert-form"
          >
            <label className="block">
              <span className="mb-1.5 block font-display text-[0.65rem] uppercase tracking-[0.22em] text-paper/55">
                Goal
              </span>
              <input
                type="text"
                name="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Name a goal"
                aria-label="Goal"
                data-testid="convert-goal"
                autoComplete="off"
                className={field}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-display text-[0.65rem] uppercase tracking-[0.22em] text-paper/55">
                Name
              </span>
              <input
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                aria-label="Name"
                data-testid="convert-name"
                autoComplete="name"
                className={field}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-display text-[0.65rem] uppercase tracking-[0.22em] text-paper/55">
                Email
              </span>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-label="Email"
                data-testid="convert-email"
                autoComplete="email"
                className={field}
              />
            </label>
            <input type="hidden" name="door" value={door} data-testid="convert-door" />
            <input type="hidden" name="source" value={FUNNEL_SOURCE} data-testid="convert-source" />

            {error ? (
              <p className="text-sm text-warn" data-testid="convert-error">
                {error}
              </p>
            ) : null}

            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={pending}
              data-testid="convert-submit"
              className="mt-2 w-full bg-paper text-void"
              onClick={() => void submitLead()}
            >
              {pending ? "Holding your place…" : CONVERT_TITLE}
            </Button>
            <p className="text-pretty text-xs leading-relaxed text-paper/55" data-testid="convert-fine-print">
              {CONVERT_FINE_PRINT}
            </p>
          </form>
        )}

        <p className="mt-10 font-mono text-[0.65rem] tracking-wide text-paper/40">{EVIDENCE_STAMP}</p>
      </div>
    </main>
  );
}
