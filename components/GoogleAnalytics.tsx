import Script from "next/script";

/* Google Analytics 4. Renders nothing until NEXT_PUBLIC_GA_MEASUREMENT_ID
   (e.g. G-XXXXXXXXXX) is set. If you serve visitors in the EU/UK, add a
   consent banner before enabling this. */
export default function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!id || !/^G-[A-Z0-9]+$/.test(id)) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`}
      </Script>
    </>
  );
}
