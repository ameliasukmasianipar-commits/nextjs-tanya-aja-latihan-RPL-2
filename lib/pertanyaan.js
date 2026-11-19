import "server-only";

import { ambilKonfigurasi } from "./konfigurasi.js";
import { db } from "./supabase.js";

// Semua akses tabel questions ada di file ini.
// Setiap query SELALU memakai group_id dari environment server,
// bukan dari form, URL, atau body request.

function kelompok() {
  return ambilKonfigurasi().groupId;
}

function gagal(langkah, error) {
  return new Error(`${langkah}: ${error.message}`);
}

// Untuk pengunjung: hanya yang sudah dipublikasikan.
export async function daftarPublik() {
  const { data, error } = await db()
    .from("questions")
    .select("id, question, answer, published_at")
    .eq("group_id", kelompok())
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(100);
  if (error) throw gagal("Gagal membaca daftar publik", error);
  return data;
}

// Untuk pemilik: semua pertanyaan kelompok ini. Panggil hanya setelah cek sesi.
export async function daftarPemilik() {
  const { data, error } = await db()
    .from("questions")
    .select("id, question, answer, is_published, published_at, created_at, updated_at")
    .eq("group_id", kelompok())
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw gagal("Gagal membaca daftar pemilik", error);
  return data;
}

export async function simpanPertanyaanBaru(teks) {
  const { error } = await db()
    .from("questions")
    .insert({ group_id: kelompok(), question: teks });
  if (error) throw gagal("Gagal menyimpan pertanyaan", error);
}

// Mengubah satu pertanyaan milik kelompok ini.
// Mengembalikan false jika id tidak ditemukan di kelompok ini.
async function ubah(id, perubahan) {
  const { data, error } = await db()
    .from("questions")
    .update(perubahan)
    .eq("id", id)
    .eq("group_id", kelompok())
    .select("id");
  // 23514 = melanggar CHECK constraint, mis. jawaban publik dikosongkan.
  if (error?.code === "23514") {
    return { error: "Jawaban yang sudah publik tidak boleh kosong." };
  }
  if (error) throw gagal("Gagal mengubah pertanyaan", error);
  return data.length === 1;
}

// Simpan jawaban tanpa mengubah status publikasi.
export function simpanJawaban(id, jawaban) {
  return ubah(id, { answer: jawaban });
}

export function publikasikan(id, jawaban) {
  return ubah(id, {
    answer: jawaban,
    is_published: true,
    published_at: new Date().toISOString(),
  });
}

export function batalkanPublikasi(id) {
  return ubah(id, { is_published: false, published_at: null });
}

export async function hapus(id) {
  const { data, error } = await db()
    .from("questions")
    .delete()
    .eq("id", id)
    .eq("group_id", kelompok())
    .select("id");
  if (error) throw gagal("Gagal menghapus pertanyaan", error);
  return data.length === 1;
}
