"use client";

import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  pm: "PM",
  developer: "Developer",
  qa: "QA",
};

export function TopBar() {
  const { data: session } = useSession();

  return (
    <header className="h-14 bg-white border-b flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-3">
        {session?.user && (
          <>
            <span className="text-sm font-semibold text-slate-700">{session.user.name}</span>
            <Badge variant="secondary" className="font-semibold bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100">
              {roleLabels[(session.user as { role?: string }).role || ""] || "User"}
            </Badge>
            <Button variant="outline" size="sm" className="h-8 text-xs font-medium" onClick={() => signOut({ callbackUrl: "/login" })}>
              Logout
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
