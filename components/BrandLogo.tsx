type BrandLogoProps = { className?: string; variant?: "theme" | "dark" };

export default function BrandLogo({ className = "", variant = "theme" }: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      {variant === "theme" && <img src="/avgenix-logo-white-shine-only.gif" alt="AVGenix" width={1634} height={327} className="brand-logo-light h-8 w-auto max-w-[170px] object-contain" />}
      <img src="/avgenix-logo-dark-transparent-shine-only.webp" alt={variant === "dark" ? "AVGenix" : ""} aria-hidden={variant === "theme" ? true : undefined} width={2172} height={724} className={`${variant === "theme" ? "brand-logo-dark" : ""} h-auto w-[160px] max-w-[160px] object-contain`} />
    </span>
  );
}
