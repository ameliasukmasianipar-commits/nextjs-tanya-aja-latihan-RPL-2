// Tes aturan validasi (tanpa database). Jalankan: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ambilIp,
  formatGroupIdValid,
  formatPinValid,
  idValid,
  pinCocok,
  rapikanJawaban,
  rapikanPertanyaan,
} from "../lib/aturan.js";

test("pertanyaan kosong atau hanya spasi ditolak", () => {
  assert.ok(rapikanPertanyaan("").error);
  assert.ok(rapikanPertanyaan("   \n\t ").error);
  assert.ok(rapikanPertanyaan(undefined).error);
  assert.ok(rapikanPertanyaan({ teks: "objek" }).error);
});

test("pertanyaan dirapikan dan dibatasi panjangnya", () => {
  assert.equal(rapikanPertanyaan("  Halo kak?  ").teks, "Halo kak?");
  assert.ok(rapikanPertanyaan("ab").error);
  assert.ok(rapikanPertanyaan("a".repeat(501)).error);
  assert.equal(rapikanPertanyaan("a".repeat(500)).teks.length, 500);
});

test("jawaban wajib diisi saat dipublikasikan", () => {
  assert.ok(rapikanJawaban("   ", { wajibIsi: true }).error);
  assert.equal(rapikanJawaban("   ").teks, "");
  assert.ok(rapikanJawaban("a".repeat(2001)).error);
  assert.equal(rapikanJawaban(" Oke ", { wajibIsi: true }).teks, "Oke");
});

test("PIN: 4 angka, nol di depan tetap berlaku", () => {
  assert.ok(formatPinValid("0123"));
  assert.ok(!formatPinValid("123"));
  assert.ok(!formatPinValid("12345"));
  assert.ok(!formatPinValid("12a4"));
  assert.ok(!formatPinValid(1234));
  assert.ok(pinCocok("0123", "0123"));
  assert.ok(!pinCocok("123", "0123"));
  assert.ok(!pinCocok("0124", "0123"));
  assert.ok(!pinCocok("0123", undefined));
});

test("format GROUP_ID dan ID pertanyaan", () => {
  assert.ok(formatGroupIdValid("kelompok-01"));
  assert.ok(!formatGroupIdValid("Kelompok 01"));
  assert.ok(!formatGroupIdValid(""));
  assert.ok(!formatGroupIdValid("-awal"));
  assert.ok(idValid("4315514b-3476-40f2-80ca-17815f335601"));
  assert.ok(!idValid("1 or 1=1"));
  assert.ok(!idValid(42));
});

test("IP diambil dari header proxy pertama", () => {
  const h = (o) => new Headers(o);
  assert.equal(ambilIp(h({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" })), "1.2.3.4");
  assert.equal(ambilIp(h({ "x-real-ip": "5.6.7.8" })), "5.6.7.8");
  assert.equal(ambilIp(h({})), "lokal");
});
