import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <h2 className="mb-2 text-xl font-semibold text-heading">Page Not Found</h2>
        <p className="mb-6 text-sm text-subtle">The page you're looking for doesn't exist.</p>
        <Link href="/home" className="forge-btn-primary mx-auto inline-flex">
          Go Home
        </Link>
      </div>
    </div>
  );
}
