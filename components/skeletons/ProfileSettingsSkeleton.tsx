import Shimmer from "@/components/Shimmer";

const cardCls = "rounded-2xl border border-border bg-forge-surface/40 p-6";

export default function ProfileSettingsSkeleton() {
  return (
    <div className="animate-fade-in px-4 py-6 sm:px-6 lg:px-8">
      {/* Page title */}
      <div className="mb-6">
        <Shimmer className="mb-2 h-6 w-36" />
        <Shimmer className="h-3.5 w-72" />
      </div>

      <div className="grid grid-cols-2 gap-5">

        {/* Personal Information card */}
        <div className={cardCls}>
          <div className="mb-5 flex items-center gap-4">
            <Shimmer className="h-12 w-12 rounded-2xl" />
            <div>
              <Shimmer className="mb-1.5 h-4 w-40" />
              <Shimmer className="h-3 w-56" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <Shimmer className="mb-1.5 h-3 w-20" />
                <Shimmer className="h-10 rounded-lg" />
              </div>
            ))}
          </div>
          <div className="mt-5">
            <Shimmer className="h-9 w-20 rounded-lg" />
          </div>
        </div>

        {/* Profile Photo card */}
        <div className={cardCls}>
          <div className="mb-5 flex items-center gap-4">
            <Shimmer className="h-12 w-12 rounded-2xl" />
            <div>
              <Shimmer className="mb-1.5 h-4 w-32" />
              <Shimmer className="h-3 w-60" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Shimmer className="h-20 w-20 shrink-0 rounded-full" />
            <div>
              <Shimmer className="mb-2 h-9 w-32 rounded-lg" />
              <Shimmer className="h-3 w-48" />
            </div>
          </div>
        </div>

        {/* Change Password card */}
        <div className={cardCls}>
          <div className="mb-5 flex items-center gap-4">
            <Shimmer className="h-12 w-12 rounded-2xl" />
            <div>
              <Shimmer className="mb-1.5 h-4 w-36" />
              <Shimmer className="h-3 w-52" />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <Shimmer className="mb-1.5 h-3 w-24" />
                <Shimmer className="h-10 rounded-lg" />
              </div>
            ))}
          </div>
          <div className="mt-5">
            <Shimmer className="h-9 w-36 rounded-lg" />
          </div>
        </div>

        {/* Security / Preferences card */}
        <div className={cardCls}>
          <div className="mb-5 flex items-center gap-4">
            <Shimmer className="h-12 w-12 rounded-2xl" />
            <div>
              <Shimmer className="mb-1.5 h-4 w-28" />
              <Shimmer className="h-3 w-56" />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <Shimmer className="mb-1 h-3.5 w-40" />
                  <Shimmer className="h-3 w-56" />
                </div>
                <Shimmer className="h-6 w-11 shrink-0 rounded-full" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
