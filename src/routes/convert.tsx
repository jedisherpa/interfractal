import { createFileRoute } from "@tanstack/react-router";
import { ConvertPage } from "@/components/instrument/convert-page.tsx";
import { CONVERT_TITLE } from "@/lib/instrument/convert.ts";
import { parseFunnelSearch } from "@/lib/instrument/funnel.ts";

export const Route = createFileRoute("/convert")({
  head: () => ({
    meta: [{ title: CONVERT_TITLE }],
  }),
  validateSearch: (raw: Record<string, unknown>) => ({
    from: raw.from,
    funnel: raw.funnel,
    door: raw.door,
    goal: raw.goal,
  }),
  component: ConvertRoute,
});

function ConvertRoute() {
  const raw = Route.useSearch();
  return <ConvertPage search={parseFunnelSearch(raw)} />;
}
