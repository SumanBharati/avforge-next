"use client";

const COLOR_CLASSES: Record<string, { border: string; bg: string; text: string }> = {
  violet: { border: "border-violet-500/30", bg: "bg-violet-500/10", text: "text-violet-400" },
  amber: { border: "border-amber-500/30", bg: "bg-amber-500/10", text: "text-amber-400" },
};

export default function ComingSoon({ icon, description, color = "violet" }: { icon: React.ReactNode; description: string; color?: "violet" | "amber" }) {
  const c = COLOR_CLASSES[color] ?? COLOR_CLASSES.violet;
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ minHeight: "calc(100vh - 124px - 85px)" }}>
      <div className={`flex h-14 w-14 items-center justify-center rounded-full border ${c.border} ${c.bg} ${c.text}`}>
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-bold text-heading">Coming Soon</h2>
        <p className="mt-1.5 max-w-sm text-sm text-subtle">{description}</p>
      </div>
    </div>
  );
}
