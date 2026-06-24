import { Sidebar } from "./sidebar";
import { TopBar } from "./topbar";
import { cn } from "@/lib/utils";

export function AppLayout({
  children,
  className = "p-5",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f5f7]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />
        <main className={cn("flex-1 overflow-y-auto overflow-x-hidden", className)}>
          {children}
        </main>
      </div>
    </div>
  );
}
