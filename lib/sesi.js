import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { SESI_DETIK, sha256 } from "./aturan.js";
import { ambilKonfigurasi } from "./konfigurasi.js";
import { db } from "./supabase.js";

const NAMA_COOKIE = "tanyaaja_sesi";

// Membuat sesi baru setelah PIN benar.
// Cookie hanya berisi token acak; database menyimpan hash token + group_id.
export async function buatSesiPemilik() {
  const { groupId } = ambilKonfigurasi();
  const token = randomBytes(32).toString("base64url");
  const kedaluwarsa = new Date(Date.now() + SESI_DETIK * 1000);

  const { error } = await db().from("owner_sessions").insert({
    token_hash: sha256(token),
    group_id: groupId,
    expires_at: kedaluwarsa.toISOString(),
  });
  if (error) throw new Error(`Gagal membuat sesi: ${error.message}`);

  const toples = await cookies();
  toples.set(NAMA_COOKIE, token, {
    httpOnly: true,
    // "lax": cookie tetap terkirim saat pemilik membuka link dari situs lain
    // atau menekan Back/Forward, tetapi tidak pada POST lintas situs.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESI_DETIK,
  });
}

// Mengembalikan true hanya jika cookie berisi sesi yang masih berlaku
// dan milik GROUP_ID deployment ini.
export async function cekSesiPemilik() {
  const toples = await cookies();
  const token = toples.get(NAMA_COOKIE)?.value;
  if (!token || token.length > 100) return false;

  const { groupId } = ambilKonfigurasi();
  const { data, error } = await db()
    .from("owner_sessions")
    .select("token_hash")
    .eq("token_hash", sha256(token))
    .eq("group_id", groupId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) throw new Error(`Gagal memeriksa sesi: ${error.message}`);
  return Boolean(data);
}

// Logout: hapus sesi di database dan cookie di browser.
export async function akhiriSesiPemilik() {
  const toples = await cookies();
  const token = toples.get(NAMA_COOKIE)?.value;
  if (token && token.length <= 100) {
    const { groupId } = ambilKonfigurasi();
    await db()
      .from("owner_sessions")
      .delete()
      .eq("token_hash", sha256(token))
      .eq("group_id", groupId);
  }
  toples.delete(NAMA_COOKIE);
}
