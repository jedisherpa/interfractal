import { createFileRoute } from "@tanstack/react-router";
import { InstrumentApp } from "@/components/instrument/app.tsx";
import { parseFunnelSearch } from "@/lib/instrument/funnel.ts";

export const Route = createFileRoute("/")({
  validateSearch: (raw) => parseFunnelSearch(raw),
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  return <InstrumentApp search={search} />;
}
