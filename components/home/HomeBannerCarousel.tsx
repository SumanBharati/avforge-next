"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { HomeBanner } from "@/lib/home-banners";
import { useTheme } from "@/components/ThemeProvider";

const AUTOPLAY_MS = 5000;

export default function HomeBannerCarousel({ banners }: { banners: HomeBanner[] }) {
  const { theme } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const carouselRef = useRef<HTMLElement>(null);

  const showBanner = useCallback((index: number) => {
    if (!banners.length) return;
    setActiveIndex((index + banners.length) % banners.length);
  }, [banners.length]);

  const showPrevious = useCallback(() => showBanner(activeIndex - 1), [activeIndex, showBanner]);
  const showNext = useCallback(() => showBanner(activeIndex + 1), [activeIndex, showBanner]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || banners.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % banners.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [activeIndex, banners.length, paused, reducedMotion]);

  useEffect(() => {
    function syncToHash() {
      const index = banners.findIndex((banner) => `#${banner.id}` === window.location.hash);
      if (index >= 0) setActiveIndex(index);
    }
    syncToHash();
    window.addEventListener("hashchange", syncToHash);
    return () => window.removeEventListener("hashchange", syncToHash);
  }, [banners]);

  if (!banners.length) return null;

  return (
    <section
      ref={carouselRef}
      className="relative h-[66.667vh] w-full overflow-hidden bg-forge-panel"
      aria-roledescription="carousel"
      aria-label="Featured AVGenix capabilities"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!carouselRef.current?.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div
        className={`flex h-full ${reducedMotion ? "" : "transition-transform duration-700 ease-in-out"}`}
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {banners.map((banner, index) => {
          const detailsFirst = index % 2 === 0;
          const purpleDetails = banner.detailsTheme === "purple";
          const seamlessPurple = banner.seamlessBackground === true;
          const shineEffect = banner.shineEffect === true;
          const imageSrc = theme === "light" && banner.imageSrcLight ? banner.imageSrcLight : banner.imageSrc;
          const secondaryImageSrc = theme === "light" && banner.secondaryImageSrcLight ? banner.secondaryImageSrcLight : banner.secondaryImageSrc;
          const details = (
            <div className={`relative flex h-1/2 w-full items-center overflow-hidden px-8 py-10 sm:px-12 lg:h-full lg:w-1/2 lg:px-[7vw] ${seamlessPurple ? "bg-transparent" : purpleDetails ? "bg-gradient-to-br from-violet-700 via-blue-600 to-indigo-950" : "bg-forge-bg"} ${shineEffect ? "banner-shine" : ""}`}>
              <div className="relative z-10 mx-auto max-w-xl lg:mx-0">
                <p className={`mb-4 text-xs font-bold uppercase tracking-[0.22em] ${purpleDetails ? "text-white/70" : "text-blue-500"}`}>{banner.eyebrow}</p>
                <h1 className={`font-display text-3xl font-bold leading-tight sm:text-4xl xl:text-5xl ${purpleDetails ? "text-white" : "text-heading"}`}>{banner.title}</h1>
                <p className={`mt-5 max-w-lg text-base leading-7 sm:text-lg ${purpleDetails ? "text-white/80" : "text-muted"}`}>{banner.description}</p>
                {banner.ctaHref ? (
                  <Link href={banner.ctaHref} className={`mt-7 inline-flex rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${purpleDetails ? "border border-white/30 bg-white/10 text-white hover:bg-white/20" : "border border-blue-500/30 text-blue-500 hover:bg-blue-500/10"}`}>{banner.ctaLabel}</Link>
                ) : (
                  <span className={`mt-7 inline-flex rounded-lg px-4 py-2 text-sm font-semibold ${purpleDetails ? "border border-white/30 bg-white/10 text-white" : "border border-blue-500/30 text-blue-500"}`}>Content coming soon</span>
                )}
              </div>
            </div>
          );
          const image = imageSrc && banner.imagePresentation === "framed" ? (
            <div className={`relative flex h-1/2 w-full items-center justify-center overflow-hidden lg:h-full lg:w-1/2 ${seamlessPurple ? "bg-transparent" : "bg-gradient-to-br from-violet-700 via-blue-600 to-indigo-950"} ${shineEffect ? "banner-shine" : ""}`}>
              <div className="absolute -left-16 -top-16 h-72 w-72 rounded-full border border-white/15" />
              <div className="absolute -bottom-28 -right-20 h-96 w-96 rounded-full border border-white/10" />
              {secondaryImageSrc ? (
                <div className="relative flex h-[82%] w-[82%] items-center justify-center">
                  <img src={imageSrc} alt={banner.imageAlt || banner.imageLabel} className="h-full w-full rounded-2xl object-fill shadow-2xl shadow-black/30" />
                  <img
                    src={secondaryImageSrc}
                    alt={banner.secondaryImageAlt || "Related feature view"}
                    className="absolute bottom-[4%] right-[3%] z-10 h-auto max-h-[52%] w-[31%] rounded-xl border border-white/35 object-contain shadow-2xl shadow-black/40"
                  />
                </div>
              ) : (
                <img src={imageSrc} alt={banner.imageAlt || banner.imageLabel} className="relative h-[78%] w-[78%] rounded-2xl object-fill shadow-2xl shadow-black/30" />
              )}
            </div>
          ) : imageSrc ? (
            <div className="flex h-1/2 w-full items-center justify-center overflow-hidden bg-white lg:h-full lg:w-1/2">
              <img src={imageSrc} alt={banner.imageAlt || banner.imageLabel} className="h-full w-full object-fill" />
            </div>
          ) : (
            <div className={`relative flex h-1/2 w-full items-center justify-center overflow-hidden bg-gradient-to-br from-violet-700 via-blue-600 to-indigo-950 lg:h-full lg:w-1/2 ${shineEffect ? "banner-shine" : ""}`}>
              <div className="absolute -left-16 -top-16 h-72 w-72 rounded-full border border-white/15" />
              <div className="absolute -bottom-28 -right-20 h-96 w-96 rounded-full border border-white/10" />
              <div className="absolute h-52 w-52 rotate-12 rounded-[2.5rem] bg-white/10 shadow-2xl backdrop-blur-sm sm:h-64 sm:w-64" />
              <div className="relative text-center text-white"><div className="text-xs font-bold uppercase tracking-[0.28em] text-white/65">Placeholder</div><div className="mt-3 text-2xl font-bold sm:text-3xl">{banner.imageLabel}</div></div>
            </div>
          );

          return (
            <article key={banner.id} id={banner.id} className={`flex h-full min-w-full flex-col lg:flex-row ${seamlessPurple ? "bg-gradient-to-br from-violet-700 via-blue-600 to-indigo-950" : ""}`} aria-hidden={index !== activeIndex}>
              {detailsFirst ? <>{details}{image}</> : <>{image}{details}</>}
            </article>
          );
        })}
      </div>

      <button type="button" onClick={showPrevious} className="absolute left-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/55 focus:outline-none focus:ring-2 focus:ring-white" aria-label="Show previous banner">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <button type="button" onClick={showNext} className="absolute right-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/55 focus:outline-none focus:ring-2 focus:ring-white" aria-label="Show next banner">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
      </button>

      <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2 rounded-full bg-black/30 px-3 py-2 backdrop-blur-sm" aria-label="Choose banner">
        {banners.map((banner, index) => (
          <button key={banner.id} type="button" onClick={() => showBanner(index)} className={`h-2.5 rounded-full transition-all ${index === activeIndex ? "w-7 bg-white" : "w-2.5 bg-white/45 hover:bg-white/75"}`} aria-label={`Show ${banner.navLabel}`} aria-current={index === activeIndex ? "true" : undefined} />
        ))}
      </div>
      <p className="sr-only" aria-live="polite">Showing {banners[activeIndex].navLabel} of {banners.length}</p>
    </section>
  );
}
