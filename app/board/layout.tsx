"use client";

import PMStoreProvider from "@/components/PMStoreProvider";

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return <PMStoreProvider>{children}</PMStoreProvider>;
}
