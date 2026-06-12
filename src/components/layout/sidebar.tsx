"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  TestTube,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();

  const projectCode = params?.projectCode as string;
  const currentProjectCode = projectCode || session?.user?.projectCode || "ERP-PM";

  const userRole = session?.user?.role;
  const canAccessQA = userRole === "admin" || userRole === "pm" || userRole === "qa";

  const navItems = [
    { href: `/${currentProjectCode}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
    { href: `/${currentProjectCode}/projects`, label: "Projects", icon: FolderKanban },
    { href: `/${currentProjectCode}/tasks`, label: "Tasks", icon: CheckSquare },
    ...(canAccessQA ? [{ href: `/${currentProjectCode}/qa`, label: "QA Testing", icon: TestTube }] : []),
  ];

  if (userRole === "admin" || userRole === "pm") {
    navItems.push({ href: `/${currentProjectCode}/users`, label: "Users", icon: Users });
  }


  return (
    <aside
      className={cn(
        "bg-gray-900 text-white min-h-screen flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex items-center border-b border-gray-800",
          collapsed ? "flex-col gap-3 py-4 px-2 justify-center" : "py-6 pl-6 pr-4 justify-between"
        )}
      >
        {!collapsed ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <Image
              src="/logo.png"
              alt="PDJ Logo"
              width={32}
              height={32}
              className="rounded-md object-contain bg-white p-0.5 shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <h1 className="text-sm font-bold tracking-tight truncate">PDJ Management</h1>
              {currentProjectCode && (
                <span className="text-[10px] text-blue-400 font-medium truncate mt-0.5">
                  Proyek: {currentProjectCode}
                </span>
              )}
            </div>
          </div>
        ) : (
          <Image
            src="/logo.png"
            alt="PDJ Logo"
            width={28}
            height={28}
            className="rounded-md object-contain bg-white p-0.5 shrink-0"
          />
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "text-gray-400 hover:text-white transition-colors cursor-pointer",
            collapsed ? "mt-1" : "ml-2"
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-md text-sm transition-colors",
                collapsed
                  ? "justify-center p-2"
                  : "gap-3 px-3 py-2",
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-800 p-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "flex items-center rounded-md text-sm transition-colors text-gray-400 hover:bg-gray-850 hover:text-red-400 w-full cursor-pointer",
            collapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
          )}
          title="Sign Out"
        >
          <LogOut className="w-5 h-5 shrink-0 text-red-500" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}

