// Tes isolasi kelompok terhadap database Supabase sungguhan.
// Butuh .env.local yang sudah diisi dan setup.sql yang sudah dijalankan.
// Jalankan: npm run test:supabase
// Tes ini membuat lalu menghapus data uji di kelompok "uji-a-<acak>" dan "uji-b-<acak>".
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

const siap = process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY;
const akhiran = Math.random().toString(36).slice(2, 8);
const A = `uji-a-${akhiran}`;
const B = `uji-b-${akhiran}`;

let p;
let klien;
const pakaiKelompok = (g) => (process.env.GROUP_ID = g);

before(async () => {
  if (!siap) return;
  process.env.OWNER_PIN ||= "0000";
  pakaiKelompok(A);
  p = await import("../lib/pertanyaan.js");
  klien = (await import("../lib/supabase.js")).db();
});

after(async () => {
  if (!siap) return;
  await klien.from("questions").delete().in("group_id", [A, B]);
  await klien.from("rate_limits").delete().like("bucket", `%uji-%-${akhiran}%`);
});

async function idTerbaru(g) {
  pakaiKelompok(g);
  const daftar = await p.daftarPemilik();
  return daftar[0].id;
}

test("isolasi dua kelompok", { skip: !siap && "SUPABASE_URL/SUPABASE_SECRET_KEY belum diisi" }, async (t) => {
  pakaiKelompok(A);
  await p.simpanPertanyaanBaru("Pertanyaan kelompok A");
  pakaiKelompok(B);
  await p.simpanPertanyaanBaru("Pertanyaan kelompok B");
  const idA = await idTerbaru(A);

  await t.test("pertanyaan baru privat", async () => {
    pakaiKelompok(A);
    assert.equal((await p.daftarPublik()).length, 0);
  });

  await t.test("kelompok B tidak melihat data A", async () => {
    pakaiKelompok(B);
    const semua = await p.daftarPemilik();
    assert.equal(semua.length, 1);
    assert.equal(semua[0].question, "Pertanyaan kelompok B");
  });

  await t.test("kelompok B tidak bisa mengubah/menghapus id milik A", async () => {
    pakaiKelompok(B);
    assert.equal(await p.simpanJawaban(idA, "dibajak"), false);
    assert.equal(await p.publikasikan(idA, "dibajak"), false);
    assert.equal(await p.batalkanPublikasi(idA), false);
    assert.equal(await p.hapus(idA), false);
    pakaiKelompok(A);
    const [a] = await p.daftarPemilik();
    assert.equal(a.answer, "");
    assert.equal(a.is_published, false);
  });

  await t.test("draf tidak publik, publikasi tampil, batal publikasi hilang", async () => {
    pakaiKelompok(A);
    assert.equal(await p.simpanJawaban(idA, "Ini draf"), true);
    assert.equal((await p.daftarPublik()).length, 0);
    assert.equal(await p.publikasikan(idA, "Jawaban final"), true);
    const publik = await p.daftarPublik();
    assert.equal(publik.length, 1);
    assert.equal(publik[0].answer, "Jawaban final");
    pakaiKelompok(B);
    assert.equal((await p.daftarPublik()).length, 0);
    pakaiKelompok(A);
    assert.deepEqual(await p.simpanJawaban(idA, ""), {
      error: "Jawaban yang sudah publik tidak boleh kosong.",
    });
    assert.equal(await p.batalkanPublikasi(idA), true);
    assert.equal((await p.daftarPublik()).length, 0);
  });

  await t.test("hapus hanya di kelompok sendiri", async () => {
    pakaiKelompok(A);
    assert.equal(await p.hapus(idA), true);
    assert.equal((await p.daftarPemilik()).length, 0);
  });

  await t.test("rate limit tersimpan di database", async () => {
    const hasil = [];
    for (let i = 0; i < 4; i++) {
      const { data } = await klien.rpc("tanyaaja_hit_rate_limit", {
        p_bucket: `tes:uji-a-${akhiran}`,
        p_max: 2,
        p_window_seconds: 600,
      });
      hasil.push(data);
    }
    assert.deepEqual(hasil, [true, true, false, false]);
  });
});
