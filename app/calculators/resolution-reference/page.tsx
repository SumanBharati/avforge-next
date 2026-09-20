import BackLink from "@/components/BackLink";
import ResolutionReference from "@/components/ResolutionReference";

export default function ResolutionReferencePage() {
  return (
    <div className="animate-fade-in mx-auto max-w-[900px] p-6">
      <BackLink href="/references" label="Back to References" />
      <h1 className="mb-1 text-xl font-semibold text-heading">Resolution Reference</h1>
      <p className="mb-5 text-[13px] text-subtle">Common display formats with computed aspect ratios and pixel counts.</p>
      <ResolutionReference />
    </div>
  );
}
