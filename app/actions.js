"use server";

// Server Actions: semua perubahan data lewat sini dan dijalankan di server.
// Next.js hanya menerima Server Action lewat POST dan menolak Origin yang
// berbeda dari Host, sehingga request lintas situs ditolak.

import { refresh } from "next/cache";
import {
  RATE_LIMIT,
  idValid,
  pinCocok,
  rapikanJawaban,
  rapikanPertanyaan,
} from "@/lib/aturan";
import { ambilKonfigurasi } from "@/lib/konfigurasi";
import * as pertanyaan from "@/lib/pertanyaan";
import { bolehLanjut } from "@/lib/rate-limit";
import {
  akhiriSesiPemilik,
  buatSesiPemilik,
  cekSesiPemilik,
} from "@/lib/sesi";

const PESAN_GAGAL = "Terjadi gangguan. Coba lagi sebentar lagi.";
const PESAN_SESI_HABIS = "Sesi sudah berakhir. Silakan login lagi.";
const PESAN_TIDAK_DITEMUKAN = "Pertanyaan tidak ditemukan.";

// ---------- Pengunjung ----------

export async function kirimPertanyaan(teksMentah) {
  const hasil = rapikanPertanyaan(teksMentah);
  if (hasil.error) return { error: hasil.error };

  try {
    const boleh = await bolehLanjut(
      "tanya",
      RATE_LIMIT.tanyaPerIp,
      RATE_LIMIT.tanyaPerKelompok
    );
    if (!boleh) {
      return { error: "Terlalu banyak pertanyaan. Tunggu beberapa menit." };
    }
    await pertanyaan.simpanPertanyaanBaru(hasil.teks);
    return { ok: true };
  } catch (e) {
    console.error(e.message);
    return { error: PESAN_GAGAL };
  }
}

// ---------- Login dan logout ----------

export async function loginPin(pin) {
  if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
    return { error: "PIN harus 4 angka." };
  }

  try {
    const boleh = await bolehLanjut(
      "pin",
      RATE_LIMIT.pinPerIp,
      RATE_LIMIT.pinPerKelompok
    );
    if (!boleh) {
      return { error: "Terlalu banyak percobaan. Tunggu 15 menit." };
    }

    const { ownerPin } = ambilKonfigurasi();
    if (!pinCocok(pin, ownerPin)) {
      return { error: "PIN salah." };
    }

    await buatSesiPemilik();
    refresh();
    return { ok: true };
  } catch (e) {
    console.error(e.message);
    return { error: PESAN_GAGAL };
  }
}

export async function logout() {
  try {
    await akhiriSesiPemilik();
  } catch (e) {
    console.error(e.message);
  }
  refresh();
  return { ok: true };
}

// ---------- Pemilik ----------

// Menjalankan aksi pemilik hanya jika sesi valid dan id berformat benar.
async function aksiPemilik(id, jalankan) {
  if (!idValid(id)) return { error: PESAN_TIDAK_DITEMUKAN };

  try {
    if (!(await cekSesiPemilik())) {
      refresh();
      return { error: PESAN_SESI_HABIS, sesiHabis: true };
    }
    const hasil = await jalankan();
    if (hasil?.error) return hasil;
    if (hasil !== true) return { error: PESAN_TIDAK_DITEMUKAN };
    refresh();
    return { ok: true };
  } catch (e) {
    console.error(e.message);
    return { error: PESAN_GAGAL };
  }
}

export async function simpanDraf(id, jawabanMentah) {
  const hasil = rapikanJawaban(jawabanMentah);
  if (hasil.error) return { error: hasil.error };
  return aksiPemilik(id, () => pertanyaan.simpanJawaban(id, hasil.teks));
}

export async function publikasikan(id, jawabanMentah) {
  const hasil = rapikanJawaban(jawabanMentah, { wajibIsi: true });
  if (hasil.error) return { error: hasil.error };
  return aksiPemilik(id, () => pertanyaan.publikasikan(id, hasil.teks));
}

export async function batalkanPublikasi(id) {
  return aksiPemilik(id, () => pertanyaan.batalkanPublikasi(id));
}

export async function hapusPertanyaan(id) {
  return aksiPemilik(id, () => pertanyaan.hapus(id));
}
