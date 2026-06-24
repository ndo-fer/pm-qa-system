"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <span className="text-2xl font-bold text-gray-400">404</span>
          </div>
          <CardTitle className="text-xl">Halaman Tidak Ditemukan</CardTitle>
          <CardDescription>
            Halaman yang Anda cari tidak ada atau telah dipindahkan.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button className="w-full" onClick={() => window.location.href = "/"}>
            Kembali ke Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
