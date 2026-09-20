import type { ReactNode } from "react";
import JsonLd from "@/components/JsonLd";
import { calculatorJsonLd, calculatorMetadata } from "@/lib/seo";

const SLUG = "conduit-fill";

export const metadata = calculatorMetadata(SLUG);

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <JsonLd data={calculatorJsonLd(SLUG)} />
      {children}
    </>
  );
}
