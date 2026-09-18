import { createFileRoute } from "@tanstack/react-router";
import { InstrumentApp } from "@/components/instrument/app.tsx";
import { parseFunnelSearch } from "@/lib/instrument/funnel.ts";

export const Route = createFileRoute("/")({
  // Pass-through so ?funnel=1 stays unquoted. Normalization happens in parseFunnelSearch.
  validateSearch: (raw: Record<string, unknown>) => ({
    from: raw.from,
    funnel: raw.funnel,
    warmup: raw.warmup,
    door: raw.door,
    goal: raw.goal,
  }),
  component: Home,
});

function Home() {
  const raw = Route.useSearch();
  return <InstrumentApp search={parseFunnelSearch(raw)} />;
}
