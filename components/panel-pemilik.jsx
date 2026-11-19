"use client";

import { useState, useTransition } from "react";
import { LogOut } from "lucide-react";
import { logout } from "@/app/actions";
import { KartuPemilik } from "@/components/kartu-pemilik";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mode kelola. Komponen ini hanya dikirim ke browser jika sesi pemilik valid.
export function PanelPemilik({ pertanyaan }) {
  const [sedangKeluar, startTransition] = useTransition();
  const [galat, setGalat] = useState("");

  const masuk = pertanyaan.filter((item) => !item.is_published);
  const publik = pertanyaan.filter((item) => item.is_published);

  function keluar() {
    setGalat("");
    startTransition(async () => {
      try {
        await logout();
      } catch {
        setGalat("Koneksi bermasalah. Coba keluar lagi.");
      }
    });
  }

  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
        <div>
          <h1 className="text-lg font-semibold">Mode pemilik</h1>
          <p className="text-sm text-muted-foreground">
            Pertanyaan di tab Masuk hanya terlihat olehmu.
          </p>
        </div>
        <Button variant="outline" onClick={keluar} disabled={sedangKeluar}>
          <LogOut aria-hidden="true" />
          {sedangKeluar ? "Keluar..." : "Keluar"}
        </Button>
      </div>
      {galat && (
        <p role="alert" className="text-sm text-destructive">
          {galat}
        </p>
      )}

      <Tabs defaultValue="masuk">
        <TabsList className="w-full">
          <TabsTrigger value="masuk">Masuk ({masuk.length})</TabsTrigger>
          <TabsTrigger value="publik">Publik ({publik.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="masuk">
          <DaftarKartu daftar={masuk} kosong="Belum ada pertanyaan baru." />
        </TabsContent>
        <TabsContent value="publik">
          <DaftarKartu daftar={publik} kosong="Belum ada jawaban yang dipublikasikan." />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function DaftarKartu({ daftar, kosong }) {
  if (daftar.length === 0) {
    return (
      <p className="rounded-xl border border-dashed bg-card px-6 py-10 text-center text-muted-foreground">
        {kosong}
      </p>
    );
  }
  return (
    <ul className="mt-2 flex flex-col gap-4">
      {daftar.map((item) => (
        <li key={item.id}>
          <KartuPemilik item={item} />
        </li>
      ))}
    </ul>
  );
}
