import { Sidebar } from "./sidebar";
import { TopBar } from "./topbar";
import { cn } from "@/lib/utils";

export function AppLayout({
  children,
  className = "p-4",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className={cn("flex-1 bg-gray-50 overflow-auto", className)}>
          {children}
        </main>
      </div>
    </div>
  );
}
