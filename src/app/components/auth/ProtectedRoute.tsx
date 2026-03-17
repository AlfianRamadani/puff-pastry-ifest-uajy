"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, user } = useAuth();

  useEffect(() => {
    const verifySession = async () => {
      if (loading) return;
      const { data } = await supabase.auth.getSession();
      const hasSession = Boolean(data.session);
      if (!user && !hasSession) {
        router.replace("/login");
      }
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void verifySession();
  }, [loading, router, user, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFF9F0]">
        <div className="border-[3px] border-black bg-[#FFC107] px-6 py-3 font-black text-sm uppercase tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          Loading...
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
