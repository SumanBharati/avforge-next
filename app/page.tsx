"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RootPage() {
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (redirected.current) return;
      if (event === "INITIAL_SESSION" || event === "SIGNED_OUT") {
        redirected.current = true;
        router.replace(session ? "/home" : "/login");
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
