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
            <Badge variant="secondary">{roleLabels[(session.user as any).role] || "User"}</Badge>
            <span className="text-sm font-medium">{session.user.name}</span>
            <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
              Logout
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
