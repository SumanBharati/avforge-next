import MicrophonePolarPatterns from "@/components/MicrophonePolarPatterns";

export default function MicrophonePolarPatternsPage() {
  return (
    <div className="animate-fade-in max-w-[900px] p-6">
      <a href="/calculators" className="mb-4 inline-block text-[12px] text-subtle hover:text-secondary">← Calculators</a>
      <h2 className="mb-1 text-lg font-semibold text-heading">Microphone Polar Patterns</h2>
      <p className="mb-5 text-[13px] text-subtle">Pickup direction, rejection characteristics, and typical applications for common microphone patterns.</p>
      <MicrophonePolarPatterns />
      <div className="mt-4 rounded-lg border border-blue-500/25 bg-blue-500/5 px-3.5 py-2.5 text-[12px] leading-relaxed text-muted">
        <span className="font-semibold text-blue-400">Reading the diagrams: </span>
        The microphone faces 0° at the right side of each plot. Larger lobes indicate greater sensitivity; nulls indicate the strongest rejection.
      </div>
    </div>
  );
}
