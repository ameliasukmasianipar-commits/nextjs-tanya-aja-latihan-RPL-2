import "server-only";

import { headers } from "next/headers";
import { ambilIp, sha256 } from "./aturan.js";
import { ambilKonfigurasi } from "./konfigurasi.js";
import { db } from "./supabase.js";

async function tambahHitungan(bucket, { maks, detik }) {
  const { data, error } = await db().rpc("tanyaaja_hit_rate_limit", {
    p_bucket: bucket,
    p_max: maks,
    p_window_seconds: detik,
  });
  if (error) throw new Error(`Gagal memeriksa batas percobaan: ${error.message}`);
  return data === true;
}

// Mengembalikan true jika permintaan masih boleh diproses.
// Dicek dua kali: per pengunjung (hash IP) dan total per kelompok.
export async function bolehLanjut(jenis, batasPerIp, batasPerKelompok) {
  const { groupId } = ambilKonfigurasi();
  const ipHash = sha256(`${groupId}:${ambilIp(await headers())}`).slice(0, 32);

  const okIp = await tambahHitungan(`${jenis}:${groupId}:${ipHash}`, batasPerIp);
  if (!okIp) return false;
  return tambahHitungan(`${jenis}:${groupId}`, batasPerKelompok);
}
