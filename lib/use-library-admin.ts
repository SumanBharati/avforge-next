"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Whether the signed-in user may change the shared AVGenix Library
// (047_library_admins.sql). The database enforces this on every write; this
// only decides which controls to show. False until the check returns.
export function useLibraryAdmin(): { isLibraryAdmin: boolean; checked: boolean } {
  const [state, setState] = useState({ isLibraryAdmin: false, checked: false });

  useEffect(() => {
    let cancelled = false;
    supabase.rpc("is_library_admin").then(({ data }) => {
      if (!cancelled) setState({ isLibraryAdmin: data === true, checked: true });
    });
    return () => { cancelled = true; };
  }, []);

  return state;
}
