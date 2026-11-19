import "server-only";

import { formatGroupIdValid, formatPinValid } from "./aturan.js";

// Membaca konfigurasi dari environment server.
// Nilai ini tidak pernah dikirim ke browser.
export function ambilKonfigurasi() {
  const groupId = process.env.GROUP_ID;
  const ownerPin = process.env.OWNER_PIN;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  const masalah = [];
  if (!formatGroupIdValid(groupId)) masalah.push("GROUP_ID");
  if (!formatPinValid(ownerPin)) masalah.push("OWNER_PIN");
  if (!supabaseUrl) masalah.push("SUPABASE_URL");
  if (!supabaseKey) masalah.push("SUPABASE_SECRET_KEY");

  if (masalah.length > 0) {
    // Hanya nama variabel yang dicatat, bukan isinya.
    throw new Error(
      `Konfigurasi .env.local belum lengkap atau salah format: ${masalah.join(", ")}`
    );
  }

  return { groupId, ownerPin, supabaseUrl, supabaseKey };
}
