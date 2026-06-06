import { CSSProperties } from "react";

export default function Shimmer({
  className = "",
  light = false,
  style,
}: {
  className?: string;
  light?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`${light ? "shimmer-light" : "shimmer"} rounded ${className}`}
      style={style}
    />
  );
}
