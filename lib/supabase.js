import "server-only";

import { createClient } from "@supabase/supabase-js";
import { ambilKonfigurasi } from "./konfigurasi.js";

let klien = null;

// Klien Supabase khusus server. Memakai secret key, jadi melewati RLS.
// Karena itu setiap query di lib/pertanyaan.js wajib menyaring group_id.
export function db() {
  if (!klien) {
    const { supabaseUrl, supabaseKey } = ambilKonfigurasi();
    klien = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return klien;
}
