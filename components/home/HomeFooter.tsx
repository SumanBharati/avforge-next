import Link from "next/link";
import { HOME_FOOTER_CONTACT } from "@/lib/home-footer";
import BrandLogo from "@/components/BrandLogo";

const productLinks = [
  { href: "/", label: "Home" },
  { href: "/#walkthroughs", label: "Product Walkthroughs" },
  { href: "/#plans", label: "Plans" },
  { href: "/calculators", label: "AV Calculators" },
  { href: "/references", label: "AV Reference Library" },
];

export default function HomeFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 px-4 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl py-14 sm:py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:gap-16">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex transition-opacity hover:opacity-85" aria-label="AVGenix home"><BrandLogo variant="dark" /></Link>
            <p className="mt-5 text-sm leading-6 text-slate-400">An integrated engineering and project-delivery workspace built for audiovisual professionals.</p>
          </div>

          <nav aria-label="Footer product navigation">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-white">Product</h2>
            <ul className="mt-5 space-y-3">
              {productLinks.map((link) => <li key={link.href}><Link href={link.href} className="text-sm text-slate-400 transition-colors hover:text-white">{link.label}</Link></li>)}
            </ul>
          </nav>

          <nav aria-label="Footer account navigation">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-white">Account</h2>
            <ul className="mt-5 space-y-3">
              <li><Link href="/register" className="text-sm text-slate-400 transition-colors hover:text-white">Sign Up</Link></li>
              <li><Link href="/login" className="text-sm text-slate-400 transition-colors hover:text-white">Log In</Link></li>
            </ul>
          </nav>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-white">Contact</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div><dt className="text-slate-500">Support</dt><dd className="mt-1"><a href={`mailto:${HOME_FOOTER_CONTACT.supportEmail}`} className="text-slate-300 transition-colors hover:text-white">{HOME_FOOTER_CONTACT.supportEmail}</a></dd></div>
              <div><dt className="text-slate-500">Sales</dt><dd className="mt-1"><a href={`mailto:${HOME_FOOTER_CONTACT.salesEmail}`} className="text-slate-300 transition-colors hover:text-white">{HOME_FOOTER_CONTACT.salesEmail}</a></dd></div>
            </dl>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {currentYear} AVGenix. All rights reserved.</p>
          <p>Designed for AV professionals.</p>
        </div>
      </div>
    </footer>
  );
}
