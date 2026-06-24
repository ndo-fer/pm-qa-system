"use client";

import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationDropdown } from "./notification-dropdown";
import { WhatsAppStatusButton } from "./whatsapp-status-button";
import { LogOut, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname } from "next/navigation";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  pm: "Project Manager",
  developer: "Developer",
  qa: "QA Engineer",
};

const roleColors: Record<string, string> = {
  admin: "bg-violet-50 text-violet-700 border-violet-200",
  pm: "bg-blue-50 text-blue-700 border-blue-200",
  developer: "bg-emerald-50 text-emerald-700 border-emerald-200",
  qa: "bg-amber-50 text-amber-700 border-amber-200",
};

const roleBadgeColors: Record<string, string> = {
  admin: "bg-violet-100 text-violet-700 border-violet-200",
  pm: "bg-blue-100 text-blue-700 border-blue-200",
  developer: "bg-emerald-100 text-emerald-700 border-emerald-200",
  qa: "bg-amber-100 text-amber-700 border-amber-200",
};

function getBreadcrumb(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) return "Dashboard";
  const page = segments[segments.length - 1];
  const labels: Record<string, string> = {
    dashboard: "Dashboard",
    projects: "Projects",
    tasks: "Tasks",
    qa: "QA Testing",
    users: "Users",
  };
  return labels[page] || page.charAt(0).toUpperCase() + page.slice(1);
}

export function TopBar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = (session?.user as { role?: string })?.role || "";
  const pageName = getBreadcrumb(pathname);
  const userInitial = (session?.user?.name || "U").charAt(0).toUpperCase();

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 z-10 outline-none">
      {/* Left: Page title */}
      <div className="flex items-center gap-2">
        <h2 className="text-[15px] font-semibold text-slate-800">{pageName}</h2>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {session?.user && (
          <>
            <WhatsAppStatusButton />
            <NotificationDropdown />

            <div className="h-5 w-px bg-slate-200 mx-1" />

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer outline-none">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold ring-1 ring-slate-200">
                  {userInitial}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-[13px] font-semibold text-slate-700 leading-tight">
                    {session.user.name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {roleLabels[role] || "User"}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 shadow-lg border-slate-200">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal pb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {userInitial}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800 truncate">{session.user.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{session.user.email}</p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold uppercase tracking-wider ${roleBadgeColors[role] || "bg-slate-100 text-slate-600 border-slate-200"}`}
                  >
                    {roleLabels[role] || "User"}
                  </Badge>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer gap-2"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </header>
  );
}
