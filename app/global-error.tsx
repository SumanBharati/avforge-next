"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-[#0c1220] font-sans text-body">
        <div className="text-center">
          <h2 className="mb-4 text-xl font-semibold">Something went wrong</h2>
          <button
            onClick={reset}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
