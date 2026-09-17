import { createFileRoute } from "@tanstack/react-router";
import { InstrumentApp } from "@/components/instrument/app.tsx";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <InstrumentApp />;
}
