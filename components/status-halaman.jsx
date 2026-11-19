// Kode pendukung Hari 04 (sudah disediakan, tidak perlu diketik).
// Tampilan sementara saat data dimuat, dan pesan umum saat data gagal dibaca.
// Detail error hanya ditulis di terminal server, tidak ditampilkan ke pengunjung.

export function Memuat() {
  return (
    <p role="status" className="py-10 text-center text-muted-foreground">
      Memuat...
    </p>
  );
}

export function Gangguan() {
  return (
    <div role="alert" className="rounded-xl border bg-card p-6 text-center">
      <p className="font-semibold">Halaman belum bisa dimuat.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Coba muat ulang halaman beberapa saat lagi.
      </p>
    </div>
  );
}
