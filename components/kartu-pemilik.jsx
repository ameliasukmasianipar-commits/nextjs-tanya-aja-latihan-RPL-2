"use client";

import { useRef, useState, useTransition } from "react";
import {
  batalkanPublikasi,
  hapusPertanyaan,
  publikasikan,
  simpanDraf,
} from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BATAS } from "@/lib/batas";
import { formatTanggal } from "@/lib/tanggal";

// Satu pertanyaan di mode pemilik: tulis jawaban, simpan, publikasikan, hapus.
export function KartuPemilik({ item }) {
  const [jawaban, setJawaban] = useState(item.answer);
  const [pesan, setPesan] = useState(null);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false);
  const [sedangProses, startTransition] = useTransition();
  const sedangJalan = useRef(false); // penjaga klik ganda

  const idJawaban = `jawaban-${item.id}`;
  const adaDraf = !item.is_published && item.answer.trim().length > 0;

  function jalankan(aksi, pesanSukses) {
    if (sedangJalan.current) return;
    sedangJalan.current = true;
    setPesan(null);
    startTransition(async () => {
      try {
        const hasil = await aksi();
        if (hasil?.ok) {
          setPesan({ jenis: "sukses", teks: pesanSukses });
        } else {
          setPesan({ jenis: "gagal", teks: hasil?.error || "Gagal. Coba lagi." });
        }
      } catch {
        setPesan({ jenis: "gagal", teks: "Koneksi bermasalah. Perubahan belum tersimpan." });
      } finally {
        sedangJalan.current = false;
      }
    });
  }

  function klikPublikasikan() {
    if (jawaban.trim().length === 0) {
      setPesan({ jenis: "gagal", teks: "Tulis jawaban dulu sebelum dipublikasikan." });
      return;
    }
    jalankan(() => publikasikan(item.id, jawaban), "Jawaban dipublikasikan.");
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {item.is_published ? (
            <Badge>Publik</Badge>
          ) : adaDraf ? (
            <Badge variant="secondary">Draf</Badge>
          ) : (
            <Badge variant="outline">Baru</Badge>
          )}
          <span>Dikirim {formatTanggal(item.created_at)}</span>
        </div>

        <p className="whitespace-pre-wrap break-words text-base font-semibold">
          {item.question}
        </p>

        <Label htmlFor={idJawaban}>Jawaban</Label>
        <Textarea
          id={idJawaban}
          value={jawaban}
          onChange={(e) => setJawaban(e.target.value)}
          placeholder="Tulis jawabanmu..."
          maxLength={BATAS.jawabanMaks}
          rows={3}
          className="text-base"
          disabled={sedangProses}
        />

        <div className="flex flex-wrap gap-2">
          {item.is_published ? (
            <>
              <Button
                onClick={() => jalankan(() => simpanDraf(item.id, jawaban), "Perubahan disimpan.")}
                disabled={sedangProses}
              >
                Simpan perubahan
              </Button>
              <Button
                variant="outline"
                onClick={() => jalankan(() => batalkanPublikasi(item.id), "Publikasi dibatalkan.")}
                disabled={sedangProses}
              >
                Batalkan publikasi
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => jalankan(() => simpanDraf(item.id, jawaban), "Draf disimpan.")}
                disabled={sedangProses}
              >
                Simpan draf
              </Button>
              <Button onClick={klikPublikasikan} disabled={sedangProses}>
                Publikasikan
              </Button>
            </>
          )}
          <Button
            variant="destructive"
            className="ml-auto"
            onClick={() => setKonfirmasiHapus(true)}
            disabled={sedangProses}
          >
            Hapus
          </Button>
        </div>

        <p
          role="status"
          aria-live="polite"
          className={
            pesan?.jenis === "gagal"
              ? "text-sm text-destructive"
              : pesan
                ? "text-sm text-green-800"
                : "sr-only"
          }
        >
          {sedangProses ? "Menyimpan..." : pesan?.teks}
        </p>
      </CardContent>

      <AlertDialog open={konfirmasiHapus} onOpenChange={setKonfirmasiHapus}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pertanyaan ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Pertanyaan dan jawabannya akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setKonfirmasiHapus(false);
                jalankan(() => hapusPertanyaan(item.id), "Pertanyaan dihapus.");
              }}
            >
              Ya, hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
