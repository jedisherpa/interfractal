import { CLOUD6_HREF, isFunnelChamberCell, type FunnelSearch } from "@/lib/instrument/funnel.ts";
import { EVIDENCE_STAMP } from "@/lib/instrument/table.ts";

const exitChip =
  "inline-flex h-11 min-h-11 items-center rounded-full px-4 font-display text-xs uppercase tracking-wider";

export function CloseRail({ search = {} }: { search?: FunnelSearch }) {
  const chamber = isFunnelChamberCell(search);
  return (
    <aside
      data-testid="funnel-close-rail"
      data-chamber-cell={chamber ? "1" : "0"}
      aria-label="Later exits"
      className="pointer-events-auto absolute inset-x-0 top-12 z-20 flex items-center gap-2 border-b border-paper/15 bg-void/80 px-3 py-2 text-paper sm:inset-x-auto sm:left-3 sm:top-16 sm:w-[min(17.5rem,calc(100vw-1.5rem))] sm:flex-col sm:items-stretch sm:rounded-xl sm:border sm:border-paper/15"
    >
      <div className="hidden sm:block">
        <p className="font-display text-[0.65rem] uppercase tracking-[0.22em] text-paper/55">Close</p>
        <p className="mt-1 text-pretty text-xs leading-relaxed text-paper/80">
          Geometry is not permission. {EVIDENCE_STAMP}
        </p>
        <p className="mt-1 text-[0.65rem] leading-relaxed text-paper/50">
          Enter, Commit, and Set this goal stay on the table. They are not checkout.
        </p>
      </div>
      <p className="sr-only">
        Geometry is not permission. {EVIDENCE_STAMP} Enter, Commit, and Set this goal are not checkout.
      </p>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:flex-none">
        {chamber ? null : (
          <button
            type="button"
            disabled
            data-testid="funnel-checkout"
            aria-label="Checkout — later. Payment is not open yet."
            className={`${exitChip} cursor-not-allowed border border-paper/25 bg-void/40 text-paper/80`}
          >
            Checkout — later
          </button>
        )}
        <a
          href={CLOUD6_HREF}
          target="_blank"
          rel="noopener"
          data-testid="funnel-cloud6"
          className={
            chamber
              ? "text-xs tracking-wide text-paper/55 underline-offset-4 hover:text-paper/80 hover:underline"
              : `${exitChip} border border-paper/40 bg-paper text-void`
          }
        >
          Cloud 6 — later
        </a>
      </div>
    </aside>
  );
}
