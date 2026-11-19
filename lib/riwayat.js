"use client";

// Mengatur tampilan pemilik lewat riwayat browser (tombol Back/Forward).
// URL tidak berubah. Kami hanya menambah penanda "tanyaaja" di history.state.
//   "kelola" = mode kelola, "publik" = tampilan pengunjung (sesi tetap aktif)

import { useSyncExternalStore } from "react";

const NAMA_EVENT = "tanyaaja:riwayat";

function bacaTampilan() {
  return window.history.state?.tanyaaja === "publik" ? "publik" : "kelola";
}

function berlangganan(callback) {
  window.addEventListener("popstate", callback);
  window.addEventListener(NAMA_EVENT, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(NAMA_EVENT, callback);
  };
}

// Tampilan untuk pemilik yang sudah login. Di server selalu "kelola".
export function useTampilanPemilik() {
  return useSyncExternalStore(berlangganan, bacaTampilan, () => "kelola");
}

// Menandai entri riwayat saat ini sebagai tampilan pengunjung,
// lalu menambah entri baru untuk mode kelola. Back akan kembali ke tampilan pengunjung.
export function bukaModeKelola() {
  const sekarang = window.history.state || {};
  if (sekarang.tanyaaja !== "publik") {
    window.history.replaceState({ ...sekarang, tanyaaja: "publik" }, "");
  }
  window.history.pushState({ ...window.history.state, tanyaaja: "kelola" }, "");
  window.dispatchEvent(new Event(NAMA_EVENT));
}
