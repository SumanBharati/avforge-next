"use client";

import PMStoreProvider from "@/components/PMStoreProvider";
import ProGate from "@/components/ProGate";

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProGate>
      <PMStoreProvider>{children}</PMStoreProvider>
    </ProGate>
  );
}
