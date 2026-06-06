"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <h2 className="mb-4 text-xl font-semibold text-heading">Something went wrong</h2>
        <button
          onClick={reset}
          className="forge-btn-primary mx-auto"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
