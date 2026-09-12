"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { LottieHandle } from "lottie-react";

// lottie-react renders to canvas/SVG via the DOM — load it client-only.
const Lottie = dynamic(() => import("lottie-react").then((m) => m.Lottie), { ssr: false });

interface AnimatedIconProps {
  /** Path to a Lottie JSON export (e.g. an IconScout "Animated" icon download) — public/animated-icons/*.json */
  src: string;
  /** Static image shown until `src` is confirmed to exist, and permanently if it never does — keeps the page looking right before the real animation file is dropped in. */
  fallbackSrc?: string;
  className?: string;
  style?: React.CSSProperties;
  loop?: boolean;
  /** false (default): autoplay and loop continuously, like ambient motion. true: sits on its first frame until the pointer enters, then plays once. */
  playOnHover?: boolean;
}

// Wraps lottie-react for the small decorative animated icons on this app's
// cards (Projects/Calculators/AV News today) — checks the Lottie file
// actually exists before switching off the static fallback, so a missing or
// not-yet-downloaded IconScout export never breaks the layout.
export default function AnimatedIcon({ src, fallbackSrc, className, style, loop = true, playOnHover = false }: AnimatedIconProps) {
  const lottieRef = useRef<LottieHandle>(null);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(src, { method: "HEAD" })
      .then((res) => { if (!cancelled) setAvailable(res.ok); })
      .catch(() => { if (!cancelled) setAvailable(false); });
    return () => { cancelled = true; };
  }, [src]);

  if (!available) {
    return fallbackSrc ? <img src={fallbackSrc} alt="" className={className} style={style} draggable={false} /> : null;
  }

  return (
    <div
      className={className}
      style={style}
      onMouseEnter={() => playOnHover && lottieRef.current?.play()}
      onMouseLeave={() => playOnHover && lottieRef.current?.pause()}
    >
      <Lottie
        src={src}
        lottieRef={lottieRef}
        loop={loop}
        autoplay={!playOnHover}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
