type BrandLogoProps = { className?: string; variant?: "theme" | "dark" };

/* The logos are animated. They are served as 480px-wide WebP files (3x the 160px display size), a fraction of the
   original 9 MB GIF and 4.6 MB WebP. The footer copy sits below the fold, so it loads lazily. */
export default function BrandLogo({ className = "", variant = "theme" }: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      {variant === "theme" && <img src="/avgenix-logo-white-shine-only-sm.webp" alt="AVGenix" width={480} height={96} decoding="async" className="brand-logo-light h-8 w-auto max-w-[170px] object-contain" />}
      <img src="/avgenix-logo-dark-transparent-shine-only-sm.webp" alt={variant === "dark" ? "AVGenix" : ""} aria-hidden={variant === "theme" ? true : undefined} width={480} height={160} loading={variant === "dark" ? "lazy" : undefined} decoding="async" className={`${variant === "theme" ? "brand-logo-dark" : ""} h-auto w-[160px] max-w-[160px] object-contain`} />
    </span>
  );
}
