// Aturan dan validasi sederhana yang dipakai server.
// File ini tidak memakai database, jadi mudah diuji (lihat tests/aturan.test.mjs).

import { createHash, timingSafeEqual } from "node:crypto";
import { BATAS } from "./batas.js";

export { BATAS };

// Batas percobaan. Ubah angka di sini jika perlu.
export const RATE_LIMIT = {
  // Login PIN: per IP per kelompok, lalu total per kelompok
  pinPerIp: { maks: 5, detik: 15 * 60 },
  pinPerKelompok: { maks: 20, detik: 15 * 60 },
  // Kirim pertanyaan: per IP per kelompok, lalu total per kelompok
  tanyaPerIp: { maks: 20, detik: 10 * 60 },
  tanyaPerKelompok: { maks: 300, detik: 60 * 60 },
};

export const SESI_DETIK = 8 * 60 * 60; // 8 jam

export function rapikanPertanyaan(nilai) {
  if (typeof nilai !== "string") {
    return { error: "Pertanyaan tidak boleh kosong." };
  }
  const teks = nilai.trim();
  if (teks.length === 0) {
    return { error: "Pertanyaan tidak boleh kosong." };
  }
  if (teks.length < BATAS.pertanyaanMin) {
    return { error: `Pertanyaan minimal ${BATAS.pertanyaanMin} karakter.` };
  }
  if (teks.length > BATAS.pertanyaanMaks) {
    return { error: `Pertanyaan maksimal ${BATAS.pertanyaanMaks} karakter.` };
  }
  return { teks };
}

export function rapikanJawaban(nilai, { wajibIsi = false } = {}) {
  const teks = typeof nilai === "string" ? nilai.trim() : "";
  if (wajibIsi && teks.length === 0) {
    return { error: "Tulis jawaban dulu sebelum dipublikasikan." };
  }
  if (teks.length > BATAS.jawabanMaks) {
    return { error: `Jawaban maksimal ${BATAS.jawabanMaks} karakter.` };
  }
  return { teks };
}

const POLA_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function idValid(id) {
  return typeof id === "string" && POLA_UUID.test(id);
}

export function formatPinValid(pin) {
  return typeof pin === "string" && /^\d{4}$/.test(pin);
}

export function formatGroupIdValid(groupId) {
  return typeof groupId === "string" && /^[a-z0-9][a-z0-9-]{0,39}$/.test(groupId);
}

export function sha256(teks) {
  return createHash("sha256").update(teks).digest("hex");
}

// Membandingkan PIN tanpa membocorkan informasi lewat lama waktu proses.
export function pinCocok(pinDikirim, pinAsli) {
  if (!formatPinValid(pinDikirim) || !formatPinValid(pinAsli)) return false;
  const a = Buffer.from(sha256(pinDikirim));
  const b = Buffer.from(sha256(pinAsli));
  return timingSafeEqual(a, b);
}

// Ambil alamat IP pengunjung dari header proxy (Vercel mengisi x-forwarded-for).
export function ambilIp(daftarHeader) {
  const diteruskan = daftarHeader.get("x-forwarded-for");
  if (diteruskan) return diteruskan.split(",")[0].trim();
  return daftarHeader.get("x-real-ip") || "lokal";
}
