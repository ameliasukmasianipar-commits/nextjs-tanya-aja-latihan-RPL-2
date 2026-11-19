"use client";

import { useRef, useState, useTransition } from "react";
import { loginPin } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bukaModeKelola } from "@/lib/riwayat";

// Link "Login" di footer + modal PIN 4 angka.
export function TombolLogin() {
  const [terbuka, setTerbuka] = useState(false);
  const [pin, setPin] = useState("");
  const [galat, setGalat] = useState("");
  const [sedangMasuk, startTransition] = useTransition();
  const sedangJalan = useRef(false); // penjaga klik ganda

  function gantiTerbuka(buka) {
    setTerbuka(buka);
    if (!buka) {
      setPin("");
      setGalat("");
    }
  }

  // Hanya angka, maksimal 4. Angka 0 di depan tetap aman karena PIN disimpan sebagai teks.
  // Paste "48 27" atau "PIN: 4827" juga ikut dirapikan.
  function ubahPin(event) {
    setPin(event.target.value.replace(/\D/g, "").slice(0, 4));
    setGalat("");
  }

  function masuk(event) {
    event.preventDefault();
    if (sedangJalan.current) return;
    if (pin.length !== 4) {
      setGalat("PIN harus 4 angka.");
      return;
    }

    sedangJalan.current = true;
    startTransition(async () => {
      try {
        const hasil = await loginPin(pin);
        if (hasil?.ok) {
          gantiTerbuka(false);
          // Tambah entri riwayat: Back akan kembali ke tampilan pengunjung.
          bukaModeKelola();
        } else {
          setGalat(hasil?.error || "Gagal masuk. Coba lagi.");
          setPin("");
        }
      } catch {
        setGalat("Koneksi bermasalah. Coba lagi.");
      } finally {
        sedangJalan.current = false;
      }
    });
  }

  return (
    <Dialog open={terbuka} onOpenChange={gantiTerbuka}>
      <Button
        variant="link"
        size="sm"
        className="text-muted-foreground"
        onClick={() => gantiTerbuka(true)}
      >
        Login
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Login pemilik</DialogTitle>
          <DialogDescription>Masukkan PIN 4 angka.</DialogDescription>
        </DialogHeader>
        <form onSubmit={masuk} className="flex flex-col gap-3">
          <Label htmlFor="pin">PIN</Label>
          <Input
            id="pin"
            name="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={pin}
            onChange={ubahPin}
            aria-invalid={galat ? true : undefined}
            aria-describedby="pesan-pin"
            className="h-12 text-center text-2xl tracking-[0.5em]"
            autoFocus
          />
          <p id="pesan-pin" role="alert" className="min-h-5 text-sm text-destructive">
            {galat}
          </p>
          <Button type="submit" size="lg" disabled={sedangMasuk}>
            {sedangMasuk ? "Memeriksa..." : "Masuk"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
