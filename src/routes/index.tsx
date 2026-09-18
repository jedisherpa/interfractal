import { createFileRoute, Navigate } from "@tanstack/react-router";
import { InstrumentApp } from "@/components/instrument/app.tsx";
import { convertSearchFromFunnel } from "@/lib/instrument/convert.ts";
import { isMatterDoor, parseFunnelSearch } from "@/lib/instrument/funnel.ts";

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
  const search = parseFunnelSearch(raw);
  if (isMatterDoor(search)) {
    return <Navigate to="/convert" search={convertSearchFromFunnel(search)} replace />;
  }
  return <InstrumentApp search={search} />;
}
