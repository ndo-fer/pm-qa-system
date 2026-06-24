"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error]", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <CardTitle className="text-xl">Terjadi Kesalahan</CardTitle>
          <CardDescription>
            Aplikasi mengalami error yang tidak terduga. Silakan coba lagi atau hubungi admin jika masalah berlanjut.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {process.env.NODE_ENV === "development" && (
            <pre className="text-xs bg-red-50 text-red-800 p-3 rounded-md overflow-auto max-h-32">
              {error.message}
            </pre>
          )}
          <Button onClick={reset} className="w-full">
            Coba Lagi
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => (window.location.href = "/")}
          >
            Kembali ke Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
