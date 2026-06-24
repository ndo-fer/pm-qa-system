"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import Image from "next/image";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  TestTube,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart2,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();

  const projectCode = params?.projectCode as string;
  const currentProjectCode = projectCode || session?.user?.projectCode || "PDJ-PM";

  const userRole = (session?.user as { role?: string })?.role;
  const canAccessQA = userRole === "admin" || userRole === "pm" || userRole === "qa";

  const navItems = [
    { href: `/${currentProjectCode}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
    { href: `/${currentProjectCode}/projects`, label: "Projects", icon: FolderKanban },
    { href: `/${currentProjectCode}/tasks`, label: "Tasks", icon: CheckSquare },
    { href: `/${currentProjectCode}/report`, label: "Report", icon: BarChart2 },
    ...(canAccessQA ? [{ href: `/${currentProjectCode}/qa`, label: "QA Testing", icon: TestTube }] : []),
  ];

  if (userRole === "admin" || userRole === "pm") {
    navItems.push({ href: `/${currentProjectCode}/users`, label: "Users", icon: Users });
  }

  const userInitial = (session?.user?.name || "U").charAt(0).toUpperCase();

  return (
    <aside
      className={cn(
        "flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
        "bg-[#111827] text-white",
        collapsed ? "w-[64px]" : "w-[220px]"
      )}
    >
      {/* Logo Header */}
      <div
        className={cn(
          "flex items-center border-b border-white/[0.07] flex-shrink-0",
          collapsed ? "justify-center py-4 px-3" : "justify-between py-4 px-4"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-[32px] h-[32px] rounded-lg bg-white border border-blue-400/10 flex items-center justify-center overflow-hidden">
            <Image src="/logo.png" alt="PDJ" width={32} height={32} className="object-contain" />
          </div>
          {!collapsed && (
            <div className="leading-none min-w-0">
              <h1 className="text-[13px] font-bold tracking-tight text-white">PDJ PM</h1>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="text-slate-500 hover:text-slate-300 rounded-md p-1 transition-colors flex-shrink-0"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="absolute left-4 top-4 text-slate-500 hover:text-slate-300 rounded-md p-1 transition-colors"
            title="Expand sidebar"
          >
          </button>
        )}
      </div>

      {/* Collapse toggle when collapsed */}
      {collapsed && (
        <div className="flex justify-center py-2 border-b border-white/[0.07]">
          <button
            onClick={() => setCollapsed(false)}
            className="text-slate-500 hover:text-slate-300 rounded-md p-1.5 transition-colors"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active Project */}
      {!collapsed && (
        <div className="px-4 py-2.5 border-b border-white/[0.07] flex-shrink-0">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-600 mb-1.5">
            Active Project
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 shadow-sm shadow-emerald-500/50" />
            <span className="text-[11px] font-semibold text-slate-300 truncate">
              {currentProjectCode}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className={cn("flex-1 py-3 overflow-y-auto", collapsed ? "px-2" : "px-3")}>
        {!collapsed && (
          <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-600 px-2 mb-1.5">
            Menu
          </p>
        )}
        <ul className="space-y-[2px]">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-lg transition-all duration-150 group relative",
                    collapsed ? "justify-center p-2.5 mx-auto" : "gap-2.5 px-2.5 py-2",
                    isActive
                      ? "bg-blue-600/20 text-white"
                      : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.05]"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-500 rounded-r-full" />
                  )}
                  <item.icon
                    className={cn(
                      "flex-shrink-0 transition-colors",
                      "w-[17px] h-[17px]",
                      isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                    )}
                  />
                  {!collapsed && (
                    <span
                      className={cn(
                        "text-[13px] truncate",
                        isActive ? "font-semibold text-white" : "font-medium"
                      )}
                    >
                      {item.label}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Footer */}
      <div className={cn("border-t border-white/[0.07] flex-shrink-0", collapsed ? "px-2 py-3" : "px-3 py-3")}>
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-slate-200 truncate leading-snug">
                {session?.user?.name}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-[11px] font-bold">
              {userInitial}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
