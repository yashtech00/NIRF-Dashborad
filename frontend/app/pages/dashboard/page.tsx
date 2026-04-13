import ScrapePanel from "@/components/ScrapePanel";
import ExportPanel from "@/components/ExportPanel";

export default function Dashboard() {
  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10 space-y-6">


      {/* Step labels */}
      <StepLabel step="1" label="Scrape & Process" />
      <ScrapePanel />

      <StepLabel step="2" label="Export" />
      <ExportPanel />
      {/* Footer */}
        <footer className="mt-auto text-center text-[11px] text-[#8b949e] py-5 border-t border-[#30363d]">
          NIRF Dashboard · Gemini AI + BullMQ + Upstash Redis + MongoDB
        </footer>

    </main>
  );
}

function StepLabel({ step, label }: { step: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8b949e]">
        Step {step} — {label}
      </span>
      <div className="flex-1 h-px bg-[#30363d]" />
    </div>
  );
}
