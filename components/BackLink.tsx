import Link from "next/link";

export default function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="mb-3 inline-flex items-center gap-2 text-[13px] text-subtle transition-colors hover:text-secondary">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {label}
    </Link>
  );
}
