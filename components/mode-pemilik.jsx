"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/app/actions";
import { PanelPemilik } from "@/components/panel-pemilik";
import { TampilanPengunjung } from "@/components/tampilan-pengunjung";
import { Button } from "@/components/ui/button";
import { bukaModeKelola, useTampilanPemilik } from "@/lib/riwayat";

// Hanya dirender jika sesi pemilik valid.
// Tombol Back dari mode kelola kembali ke tampilan pengunjung (masih login).
export function ModePemilik({ pertanyaan }) {
  const tampilan = useTampilanPemilik();
  const [sedangKeluar, startTransition] = useTransition();
  const router = useRouter();
  const tampilanSebelumnya = useRef(tampilan);

  // Setiap pindah tampilan (Kelola, Back, Forward), ambil data terbaru dari server.
  useEffect(() => {
    if (tampilanSebelumnya.current !== tampilan) {
      tampilanSebelumnya.current = tampilan;
      router.refresh();
    }
  }, [tampilan, router]);

  if (tampilan === "kelola") {
    return <PanelPemilik pertanyaan={pertanyaan} />;
  }

  // Tampilan pengunjung untuk pemilik: hanya jawaban yang sudah publik.
  const publik = pertanyaan
    .filter((item) => item.is_published)
    .sort((a, b) => b.published_at.localeCompare(a.published_at));

  return (
    <TampilanPengunjung
      pertanyaan={publik}
      footer={
        <>
          <Button
            variant="link"
            size="sm"
            className="text-muted-foreground"
            onClick={bukaModeKelola}
          >
            Kelola
          </Button>
          <Button
            variant="link"
            size="sm"
            className="text-muted-foreground"
            disabled={sedangKeluar}
            onClick={() =>
              startTransition(async () => {
                try {
                  await logout();
                } catch {
                  // Gagal jaringan: tetap di halaman, pemilik bisa mencoba lagi.
                }
              })
            }
          >
            {sedangKeluar ? "Keluar..." : "Keluar"}
          </Button>
        </>
      }
    />
  );
}
