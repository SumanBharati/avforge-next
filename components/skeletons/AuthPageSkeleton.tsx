import Shimmer from "@/components/Shimmer";

export default function AuthPageSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden" style={{
      background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(59,130,246,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 20% 80%, rgba(139,92,246,0.05) 0%, transparent 50%), linear-gradient(180deg, #ffffff 0%, #f8fafc 40%, #f1f5f9 100%)",
    }}>
      {/* Header */}
      <header className="relative z-10 flex h-[72px] shrink-0 items-center px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600">
            <span className="text-lg font-extrabold text-white">▲</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            AV<span className="text-blue-500">Forge</span>
          </span>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-start px-16 lg:px-32 py-6">

        {/* Title shimmer */}
        <div className="mb-8 w-full max-w-[1400px] mx-auto flex flex-col items-center gap-3">
          <Shimmer light className="h-12 w-[520px] rounded-lg" />
          <Shimmer light className="h-12 w-[380px] rounded-lg" />
          <Shimmer light className="mt-2 h-5 w-[480px] rounded" />
        </div>

        {/* Form column */}
        <div className="flex w-full max-w-[1400px] mx-auto">
          <div className="flex w-[420px] shrink-0 flex-col gap-4 p-2">
            <Shimmer light className="h-8 w-44 rounded" />
            <Shimmer light className="h-4 w-64 rounded" />

            <div className="flex flex-col gap-3 pt-2">
              {Array.from({ length: fields }).map((_, i) => (
                <div key={i}>
                  <Shimmer light className="mb-1.5 h-3 w-16 rounded" />
                  <Shimmer light className="h-11 rounded-full" />
                </div>
              ))}
              <Shimmer light className="mt-2 h-11 rounded-full" />
            </div>

            <Shimmer light className="mx-auto h-4 w-48 rounded" />
          </div>
        </div>

      </div>
    </div>
  );
}
