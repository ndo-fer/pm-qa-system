"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Download, FileJson, FileSpreadsheet, FileText } from "lucide-react";
import { exportToCSV, exportToJSON, exportToPDF } from "@/lib/export-utils";

interface ExportButtonProps<T> {
  data: T[] | (() => T[]);
  filename: string;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  label?: string;
}

export function ExportButton<T>({
  data,
  filename,
  className,
  variant = "outline",
  size = "sm",
  label = "Export As...",
}: ExportButtonProps<T>) {
  const handleExport = (type: "csv" | "json" | "pdf") => {
    const exportData = typeof data === "function" ? data() : data;
    const dateStr = new Date().toISOString().split("T")[0];
    const formattedFilename = `${filename}_${dateStr}`;

    if (type === "csv") {
      exportToCSV(exportData as unknown as Record<string, unknown>[], formattedFilename);
    } else if (type === "pdf") {
      exportToPDF(exportData as unknown as Record<string, unknown>[], formattedFilename);
    } else {
      exportToJSON(exportData, formattedFilename);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant, size }),
          "cursor-pointer flex items-center justify-center gap-1.5",
          className
        )}
      >
        <Download className="w-4 h-4" />
        <span>{label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 bg-white border border-slate-200 p-1 shadow-md rounded-lg z-50">
        <DropdownMenuItem
          onClick={() => handleExport("csv")}
          className="cursor-pointer hover:bg-slate-50 focus:bg-slate-50 rounded-md p-2 flex items-center gap-2 text-xs font-semibold text-slate-700 outline-none"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span>Export as CSV</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("json")}
          className="cursor-pointer hover:bg-slate-50 focus:bg-slate-50 rounded-md p-2 flex items-center gap-2 text-xs font-semibold text-slate-700 outline-none"
        >
          <FileJson className="w-3.5 h-3.5 text-blue-600" />
          <span>Export as JSON</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("pdf")}
          className="cursor-pointer hover:bg-slate-50 focus:bg-slate-50 rounded-md p-2 flex items-center gap-2 text-xs font-semibold text-slate-700 outline-none"
        >
          <FileText className="w-3.5 h-3.5 text-red-600" />
          <span>Export as PDF</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
