import ResolutionReference from "@/components/ResolutionReference";

export default function ResolutionReferencePage() {
  return (
    <div className="animate-fade-in max-w-[900px] p-6">
      <a href="/calculators" className="mb-4 inline-block text-[12px] text-subtle hover:text-secondary">← Calculators</a>
      <h2 className="mb-1 text-lg font-semibold text-heading">Resolution Reference</h2>
      <p className="mb-5 text-[13px] text-subtle">Common display formats with computed aspect ratios and pixel counts.</p>
      <ResolutionReference />
    </div>
  );
}
