# Product Requirements Document (PRD)

## ADITYA — Advanced Digital Integrated Turbine & Energy Analytics

| Atribut | Nilai |
|---|---|
| Status | Draft untuk review stakeholder |
| Versi dokumen | 1.0 |
| Tanggal | 3 November 2026 |
| Product owner | TBD |
| Business owner | TBD — PLTGU Cilegon |
| Referensi baseline | `D:\Aditya\ADITYA_Simulasi Kalkulator (1).html` |
| Target platform | Web internal, desktop-first, responsif |
| Bahasa utama | Bahasa Indonesia |

> Dokumen ini diturunkan dari analisis prototipe HTML aktual. Detail formula, retensi data, dan integrasi korporat yang belum dikonfirmasi ditandai **TBD** dan wajib disepakati sebelum production.

---

## 1. Ringkasan Eksekutif

ADITYA adalah aplikasi web internal untuk membantu perencanaan dan evaluasi operasi turbin serta energi gas PLTGU Cilegon. Prototipe saat ini telah menyediakan kalkulator gas mix, kalkulator tanki RWT/MWT, simulasi energi PHE/PGN, Rencana Operasi Harian (ROH), nominasi harian PGN, evaluasi dan historical learning, export, serta activity log.

Prototipe masih berupa satu file HTML dengan CSS dan JavaScript terpadu. Data evaluasi dan aktivitas disimpan pada browser (`localStorage`/`sessionStorage`), sehingga belum menjadi single source of truth, belum memiliki penyimpanan data terpusat, dan belum menyediakan system log yang dapat diandalkan.

Produk target akan mempertahankan fungsi dan hasil perhitungan yang telah digunakan, lalu menambahkan penyimpanan terpusat, status Draft/Archived, versioning formula, system log, export konsisten, dan pengujian otomatis. Implementasi direncanakan sebagai modular monolith: React/Vite pada frontend, NestJS/Fastify pada backend, dan PostgreSQL sebagai database. Authentication dan pembatasan akses berbasis akun tidak termasuk kebutuhan produk.

---

## 2. Latar Belakang dan Masalah

### 2.1 Kondisi saat ini

- Seluruh aplikasi berada dalam satu file HTML sekitar 6,3 MB dan ±155 fungsi JavaScript.
- Perhitungan domain bercampur dengan manipulasi DOM dan kode export.
- Terdapat implementasi fungsi yang berevolusi melalui patch/override, khususnya export PDF.
- Riwayat evaluasi dan activity log hanya tersedia pada browser/perangkat yang sama.
- Tidak ada histori dokumen dan revisi yang tersimpan secara terpusat.
- Tidak ada mekanisme formal untuk mengendalikan perubahan formula/parameter.
- Export bergantung pada kemampuan browser dan library eksternal.
- Logo disimpan sebagai Base64 besar di dalam HTML.

### 2.2 Masalah pengguna

1. Operator harus memperoleh hasil kalkulasi secara cepat dan konsisten.
2. Data perencanaan, nominasi, dan evaluasi perlu dapat diakses lintas perangkat pada jaringan internal.
3. Tim operasional perlu mengetahui kapan data dibuat, diubah, atau diarsipkan.
4. Engineer perlu mengevaluasi akurasi prediksi terhadap realisasi tanpa kehilangan histori.
5. Organisasi memerlukan satu sumber data yang dapat dicadangkan, ditelusuri, dan diekspor.

### 2.3 Peluang

Mengubah prototipe menjadi aplikasi operasional terpusat akan mengurangi input berulang, meningkatkan traceability, menjaga konsistensi formula, dan membentuk data historis untuk kalibrasi yang lebih terpercaya.

---

## 3. Visi Produk

Menjadi platform internal terpadu untuk menghitung, merencanakan, memantau, mengevaluasi, dan mengaudit pemakaian energi gas serta performa operasi PLTGU Cilegon secara cepat, konsisten, aman, dan dapat dipertanggungjawabkan.

---

## 4. Tujuan dan Indikator Keberhasilan

### 4.1 Tujuan

- Mempertahankan kesetaraan hasil kalkulasi dengan baseline yang telah divalidasi stakeholder.
- Menyediakan penyimpanan terpusat untuk ROH, nominasi, simulasi, dan evaluasi.
- Mendukung status sederhana Draft dan Archived.
- Menyediakan system log untuk perubahan data tanpa atribusi akun pengguna.
- Mempercepat pembuatan dokumen operasional dan export Excel/PDF.
- Menyediakan historical learning yang transparan dan dapat dilacak sumber datanya.

### 4.2 KPI produk

Nilai target final perlu disetujui product owner.

| KPI | Target awal |
|---|---:|
| Parity hasil formula terhadap golden dataset | 100% dalam toleransi pembulatan yang disetujui |
| Waktu respons kalkulasi interaktif | ≤ 500 ms untuk satu perubahan input pada perangkat target |
| Waktu muat halaman utama pada jaringan internal | ≤ 3 detik p95 |
| Keberhasilan penyimpanan transaksi valid | ≥ 99,9% |
| Keberhasilan export PDF/Excel | ≥ 99% |
| Ketersediaan aplikasi | 99,5% per bulan, di luar maintenance terjadwal |
| Dokumen dengan status dan waktu perubahan lengkap | 100% |
| Insiden kehilangan data setelah committed | 0 |

---

## 5. Pengguna dan Persona

| Persona | Kebutuhan utama |
|---|---|
| Operator | Mengisi input, menghitung, menyimpan draft, membuat ROH/nominasi, mengarsipkan, dan export |
| Engineer/Analyst | Mengelola evaluasi, menganalisis deviasi, meninjau learning, dan memelihara parameter melalui proses operasional di luar aplikasi |
| Management | Melihat data, grafik, laporan, dan export |
| Tim TI | Mengoperasikan deployment, database, backup, konfigurasi teknis, dan monitoring |

Seluruh persona menggunakan fungsi aplikasi yang sama tanpa login, role, atau permission. Perbedaan tanggung jawab merupakan prosedur organisasi di luar kontrol aplikasi.

---

## 6. Ruang Lingkup

### 6.1 In scope MVP

1. Gas Mix Calculator.
2. RWT & MWT Tank Calculator.
3. Simulasi Energi PHE/PGN per jam.
4. Rencana Operasi Harian per 30 menit.
5. Nominasi Per Hari PGN per jam.
6. Evaluasi prediksi vs realisasi dan historical learning.
7. Penyimpanan terpusat PostgreSQL.
8. Status Draft dan Archived untuk dokumen operasional.
9. Grafik, Excel, PDF, dan CSV.
10. System log dan activity log server-side.
11. Versioning formula/parameter dan golden parity tests.
12. Pencarian, filter, pagination, dan detail histori.

### 6.2 Out of scope MVP

- Microservices.
- Mobile app native.
- Kontrol langsung turbin, valve, atau perangkat lapangan.
- Penggantian fungsi DCS/SCADA.
- Automatic dispatch atau autonomous optimization.
- Machine learning prediktif di luar metode learning baseline saat ini.
- Integrasi real-time dengan sensor, ERP, PGN, PHE, atau sistem eksternal sampai interface disepakati.
- Self-registration pengguna publik.
- Akses internet publik.
- Authentication, login, manajemen user, role, permission, dan approval workflow.

### 6.3 Kandidat fase lanjutan

- Import data aktual otomatis dari historian/SCADA.
- Notifikasi email/Teams untuk anomali.
- Dashboard manajemen lintas periode.
- Advanced calibration dengan proses governance model.

---

## 7. Prinsip Produk dan Aturan Umum

1. **Safety advisory:** ADITYA adalah decision-support tool, bukan pengendali peralatan. UI dan export harus menampilkan disclaimer yang disetujui stakeholder.
2. **Formula parity first:** modernisasi UI tidak boleh mengubah hasil formula secara diam-diam.
3. **Server as source of truth:** data committed berada di PostgreSQL; browser cache bukan sumber utama.
4. **Traceable:** setiap perubahan data, status, formula, dan parameter harus dapat ditelusuri.
5. **Versioned calculation:** hasil menyimpan versi formula dan snapshot parameter yang digunakan.
6. **No silent correction:** input tidak valid harus ditolak atau dinormalisasi secara eksplisit dengan pesan yang terlihat.
7. **Timezone:** seluruh waktu bisnis menggunakan Asia/Jakarta; database menyimpan timestamp berzona/UTC sesuai standar implementasi.
8. **Units visible:** MW, BBTUD, meter, dan m³ harus selalu terlihat pada input/output terkait.
9. **Decimal precision:** presisi simpan dan pembulatan tampilan harus ditentukan per field dan diuji.

---

## 8. Model Akses

- Aplikasi tidak menyediakan authentication, login, logout, user account, role, atau permission.
- Seluruh pengunjung yang dapat menjangkau aplikasi pada jaringan internal memiliki kemampuan yang sama.
- Pembatasan akses dilakukan pada tingkat jaringan/infrastruktur, misalnya firewall, VPN, reverse proxy, dan allowlist host.
- Karena tidak ada identitas akun, system log hanya dapat merekam timestamp, alamat sumber yang diteruskan proxy tepercaya, user-agent, aksi, dan data terkait; log tidak dapat membuktikan identitas manusia yang melakukan aksi.
- Fitur keamanan berbasis identitas seperti ownership, maker-checker, dan non-repudiation tidak tersedia.
- Formula dan konfigurasi kritis tidak diedit melalui UI pada MVP; perubahannya dilakukan melalui deployment/migration terkontrol.

---

## 9. Workflow Dokumen

### 9.1 Status

`DRAFT ⇄ ARCHIVED`

### 9.2 Aturan

- Dokumen baru selalu dibuat dengan status `DRAFT`.
- Dokumen `DRAFT` dapat dilihat dan diedit.
- Dokumen `ARCHIVED` bersifat read-only pada UI.
- Dokumen dapat dipindahkan dari `DRAFT` ke `ARCHIVED` setelah konfirmasi.
- Dokumen `ARCHIVED` dapat dikembalikan ke `DRAFT` setelah konfirmasi.
- Tidak ada proses pengajuan maupun persetujuan dokumen.
- Setiap transisi status harus tercatat dalam system log.
- Dokumen tidak dapat dihapus permanen melalui UI.
- Konflik edit dicegah dengan optimistic locking/version number.

---

## 10. Functional Requirements

Prioritas: **P0** wajib MVP, **P1** penting setelah alur inti stabil, **P2** peningkatan.

### 10.1 Dashboard dan navigasi

| ID | Requirement | Prioritas |
|---|---|:---:|
| NAV-01 | Seluruh menu tersedia: Kalkulator, Tanki, Simulasi, ROH, Nominasi, Evaluasi, dan Log. | P0 |
| NAV-02 | Dashboard menampilkan dokumen terbaru, jumlah Draft/Archived, dan ringkasan aktivitas. | P1 |
| NAV-03 | Tabel histori mendukung filter tanggal, status, pencarian, sorting, dan pagination. | P0 |
| NAV-04 | Aplikasi mempertahankan state draft saat navigasi atau memperingatkan jika ada perubahan belum disimpan. | P0 |

### 10.2 Gas Mix Calculator

Baseline prototipe menggunakan input load turbin dan jumlah FGC, lalu menampilkan total gas mix, energi PGN/PHE, GT netto, ST netto, dan total netto.

| ID | Requirement | Prioritas |
|---|---|:---:|
| GAS-01 | Pengguna memasukkan load turbin (MW) dan jumlah FGC integer 0–4. | P0 |
| GAS-02 | Sistem menghitung hasil secara real-time dan melalui perintah Hitung. | P0 |
| GAS-03 | Sistem menampilkan total gas, PHE, PGN dalam BBTUD serta GT/ST/total netto dalam MW. | P0 |
| GAS-04 | Nilai negatif, nonnumerik, FGC pecahan, dan FGC di luar rentang ditangani dengan pesan eksplisit. | P0 |
| GAS-05 | Pengguna dapat mengirim hasil sebagai data awal Evaluasi. | P0 |
| GAS-06 | Pengguna dapat menyimpan snapshot kalkulasi beserta versi formula. | P1 |

Catatan baseline yang harus dipreservasi dan divalidasi antara lain pemetaan energi PGN untuk FGC 0–4 serta formula netto yang ada. Nilai formula tidak dianggap resmi hanya karena ada di HTML; validasi Engineer wajib.

### 10.3 RWT & MWT Tank Calculator

| ID | Requirement | Prioritas |
|---|---|:---:|
| TANK-01 | Pengguna memilih RWT atau MWT dan jenis input Level (m) atau Volume (m³). | P0 |
| TANK-02 | Sistem melakukan konversi level-volume dan menampilkan persentase kapasitas. | P0 |
| TANK-03 | Sistem menampilkan NWL, HWI, OFL, marker visual, dan status Normal/NWL/High/Warning/Critical. | P0 |
| TANK-04 | Sistem memberi peringatan jelas ketika level mencapai/melebihi OFL. | P0 |
| TANK-05 | Parameter tanki disimpan sebagai master data terversi dan diubah melalui migration/deployment terkontrol. | P0 |
| TANK-06 | Reset mengembalikan form ke nilai awal tanpa mengubah master data. | P0 |
| TANK-07 | Snapshot kalkulasi dapat disimpan jika dibutuhkan bisnis. | P1 |

Parameter baseline untuk verifikasi awal:

| Tanki | NWL (m) | HWI (m) | OFL (m) | Kapasitas NWL (m³) | Faktor/m |
|---|---:|---:|---:|---:|---:|
| RWT | 11.295 | 11.395 | 11.445 | 5500 | 486.941 |
| MWT | 14.967 | 15.067 | 15.117 | 2500 | 167.034 |

Tolerance NWL baseline adalah 0,005 m. Semua parameter memerlukan sign-off Engineer.

### 10.4 Simulasi Energi PHE/PGN

| ID | Requirement | Prioritas |
|---|---|:---:|
| SIM-01 | Pengguna memilih mode Combined Cycle atau Open Cycle. | P0 |
| SIM-02 | Pengguna memasukkan nominasi PHE/PGN dan data 24 slot per jam. | P0 |
| SIM-03 | Input per slot mencakup load/ALR, FGC, linepack awal, dan flow-in awal sesuai baseline. | P0 |
| SIM-04 | Sistem menghitung GT net, ST/ST net (sesuai mode), total net, energi PHE/PGN, total gas, linepack, dan flow. | P0 |
| SIM-05 | Open Cycle menyembunyikan output ST yang tidak relevan tanpa menghilangkan traceability mode. | P0 |
| SIM-06 | Sistem menandai nilai yang melampaui nominasi. | P0 |
| SIM-07 | Grafik dapat menampilkan/menyembunyikan seri GT Net, ST Net, PHE, dan PGN. | P0 |
| SIM-08 | Sistem menyediakan total/rata-rata dengan definisi agregasi yang terdokumentasi. | P0 |
| SIM-09 | Pengguna dapat reset input, menyimpan/mengubah Draft, mengarsipkan, mengaktifkan kembali sebagai Draft, dan membuka histori. | P0 |
| SIM-10 | Pengguna dapat export Excel dan PDF yang memuat metadata, tabel, grafik, status, versi formula, dan waktu cetak. | P0 |

### 10.5 Rencana Operasi Harian (ROH)

| ID | Requirement | Prioritas |
|---|---|:---:|
| ROH-01 | Sistem menyediakan 48 slot per 30 menit untuk satu tanggal operasi. | P0 |
| ROH-02 | Input mendukung GT1.1 OC, GT1.2 OC, GT1.1 CC, GT1.2 CC, ST1.0, dan jumlah FGC sesuai baseline. | P0 |
| ROH-03 | Pengguna memilih unit untuk pemakaian sendiri dan memasukkan nominasi PHE/PGN. | P0 |
| ROH-04 | Sistem menghitung output netto, total beban, energi PHE, PGN, dan total gas setiap slot. | P0 |
| ROH-05 | Fitur “Isi ke Kanan” mengisi nilai dari sel terpilih ke slot berikutnya setelah konfirmasi yang jelas. | P0 |
| ROH-06 | Grafik menyediakan toggle Total Beban, PHE, PGN, dan Total Gas. | P0 |
| ROH-07 | Sistem menghitung total/rata-rata sesuai definisi bisnis dan menampilkan unit. | P0 |
| ROH-08 | ROH mendukung status Draft/Archived dan versioning perubahan. | P0 |
| ROH-09 | Kombinasi tanggal operasi dan versi memiliki identitas unik; perubahan tidak menghilangkan histori sebelumnya. | P0 |
| ROH-10 | Export Excel/PDF menyertakan tabel, grafik, status, revision, formula version, dan timestamp. | P0 |

### 10.6 Nominasi Per Hari PGN

| ID | Requirement | Prioritas |
|---|---|:---:|
| PGN-01 | Pengguna memasukkan tanggal pengajuan, waktu efektif, titik penyerahan, dan receipt point. | P0 |
| PGN-02 | Pengguna memasukkan jumlah nominasi harian Swap dan Stock dalam BBTU/BBTUD sesuai definisi yang disepakati. | P0 |
| PGN-03 | Sistem menyediakan 24 forecast per jam untuk Swap dan Stock serta total per jam. | P0 |
| PGN-04 | “Isi Forecast dari Jumlah Harian” mendistribusikan nilai sesuai aturan baseline yang harus terdokumentasi. | P0 |
| PGN-05 | Sistem menampilkan total dan memvalidasi konsistensi forecast dengan jumlah harian. | P0 |
| PGN-06 | Nominasi mendukung status Draft/Archived dan mempertahankan seluruh revisi. | P0 |
| PGN-07 | Export Excel/PDF mengikuti template bisnis yang disetujui. | P0 |
| PGN-08 | Titik penyerahan dan receipt point berasal dari master data dengan opsi default. | P1 |

### 10.7 Evaluasi & Historical Learning

| ID | Requirement | Prioritas |
|---|---|:---:|
| EVAL-01 | Pengguna mencatat tanggal, mode, load, FGC, prediksi, dan realisasi untuk gas, PHE, PGN, dan netto. | P0 |
| EVAL-02 | Prediksi dapat diambil dari hasil Gas Mix/Simulasi yang tersimpan agar memiliki referensi sumber. | P0 |
| EVAL-03 | Sistem menghitung absolute error, deviation, accuracy, correction factor, dan signed bias. | P0 |
| EVAL-04 | Sistem memvalidasi prediksi dan realisasi total gas lebih dari nol untuk formula berbasis rasio. | P0 |
| EVAL-05 | Riwayat disimpan di server dan dapat difilter berdasarkan periode, mode, load, FGC, dan sumber prediksi. | P0 |
| EVAL-06 | Learning memilih sampel load serupa berdasarkan toleransi dan minimal sampel yang dikendalikan konfigurasi. | P0 |
| EVAL-07 | Rekomendasi menampilkan jumlah sampel, rata-rata deviasi, learning factor, nilai rekomendasi, dan record sumber. | P0 |
| EVAL-08 | Learning tidak boleh otomatis mengubah formula produksi tanpa review Engineer, versi baru, dan deployment terkontrol. | P0 |
| EVAL-09 | Koreksi/outlier/exclusion harus memerlukan alasan dan tercatat dalam system log. | P0 |
| EVAL-10 | Riwayat dapat diekspor CSV/Excel. | P0 |

### 10.8 Formula dan parameter management

| ID | Requirement | Prioritas |
|---|---|:---:|
| FORM-01 | Semua formula dipindah ke calculation engine yang tidak bergantung pada UI/DOM. | P0 |
| FORM-02 | Setiap formula set memiliki version, effective date, status Active/Retired, sumber perubahan, dan catatan. | P0 |
| FORM-03 | Hasil tersimpan mereferensikan formula version dan snapshot parameter. | P0 |
| FORM-04 | Aktivasi formula baru wajib lulus unit test, golden dataset, validasi Engineer, dan deployment terkontrol. | P0 |
| FORM-05 | Formula lama tetap tersedia untuk mereproduksi hasil historis. | P0 |
| FORM-06 | Perubahan formula tidak dapat dilakukan melalui edit database ad hoc dalam alur normal. | P0 |

### 10.9 Export dan laporan

| ID | Requirement | Prioritas |
|---|---|:---:|
| EXP-01 | Excel berisi angka sebagai numeric cell, bukan hanya tabel HTML berformat `.xls`. | P0 |
| EXP-02 | PDF dihasilkan konsisten pada browser target dan memuat tabel/grafik tanpa terpotong tidak wajar. | P0 |
| EXP-03 | File menggunakan nama deterministik: modul, tanggal operasi, revisi, dan waktu export. | P0 |
| EXP-04 | Export mencatat waktu, tipe file, record, revision, dan metadata request yang tersedia tanpa authentication. | P0 |
| EXP-05 | Seluruh data yang tersedia pada aplikasi dapat diekspor tanpa pembatasan berbasis akun. | P0 |
| EXP-06 | Template export memiliki version dan dapat diuji snapshot/regression. | P1 |

### 10.10 System log dan activity log

| ID | Requirement | Prioritas |
|---|---|:---:|
| LOG-01 | Server mencatat create, update, archive, restore-to-draft, export, dan perubahan konfigurasi. | P0 |
| LOG-02 | Event memuat timestamp server, action, entity, entity ID, revision, request/correlation ID, alamat sumber/proxy metadata, dan perubahan relevan. | P0 |
| LOG-03 | System log bersifat append-only bagi aplikasi dan tidak dapat dihapus melalui UI. | P0 |
| LOG-04 | Data before/after sensitif disanitasi; credential/token tidak pernah dicatat. | P0 |
| LOG-05 | IP dicatat dari request server/proxy tepercaya, bukan API publik pihak ketiga. | P0 |
| LOG-06 | Log dapat difilter dan diekspor sesuai kebijakan retensi. | P1 |
| LOG-07 | Clickstream UI non-kritis dipisahkan dari system log perubahan data. | P1 |
| LOG-08 | UI menjelaskan bahwa log tidak membuktikan identitas manusia karena aplikasi tidak menggunakan authentication. | P0 |

### 10.11 Master data dan konfigurasi

Master minimum:

- Unit pembangkit dan mode operasi.
- Tanki dan parameter kapasitas/level.
- Titik penyerahan dan receipt point.
- Formula sets dan parameter sets.
- Batas/toleransi validasi.
- Template export.

Setiap perubahan master kritis memerlukan effective date, reason, referensi perubahan, dan deployment/migration terkontrol.

---

## 11. Aturan Validasi Umum

- Field wajib ditandai dan memiliki pesan dalam Bahasa Indonesia.
- Backend mengulang seluruh validasi frontend.
- Angka negatif ditolak kecuali field secara eksplisit mengizinkannya.
- FGC hanya integer 0–4.
- Tanggal efektif tidak boleh ambigu dan harus memakai zona waktu aplikasi.
- Input kosong dibedakan dari angka nol.
- Sistem tidak boleh diam-diam mengubah angka pecahan menjadi integer tanpa informasi pengguna.
- Submit ditolak jika terdapat error; warning dapat dilanjutkan hanya jika aturan bisnis mengizinkan dan alasan disimpan.
- Rounding dilakukan pada layer tampilan sesuai aturan; calculation engine mempertahankan precision yang disepakati.

---

## 12. Model Data Konseptual

| Entitas | Isi utama |
|---|---|
| formula_sets / formula_parameters | Formula terversi, effective date, status, dan referensi perubahan |
| tank_definitions | RWT/MWT dan parameter terversi |
| calculation_snapshots | Input/output kalkulator dan formula version |
| energy_simulations | Header, tanggal, mode, nominasi, status, revision |
| energy_simulation_rows | Slot per jam dan input/output hasil kalkulasi |
| daily_operation_plans | Header ROH, tanggal operasi, status, revision |
| daily_operation_plan_rows | 48 slot input/output ROH |
| pgn_nominations | Header nominasi, metadata, status, revision |
| pgn_nomination_rows | 24 slot forecast Swap/Stock |
| evaluation_records | Prediksi, realisasi, metrik, referensi sumber |
| learning_runs | Kriteria, sample IDs, factor, recommendation, formula version |
| document_actions | Archive, restore-to-draft, dan catatan perubahan status |
| system_logs | Event perubahan append-only tanpa identitas akun |
| export_logs | Metadata file/export |

Ketentuan database:

- Primary key menggunakan UUID.
- Nilai energi/load/volume menggunakan `numeric`, bukan floating point, dengan precision/scale yang ditetapkan saat desain rinci.
- Header memiliki `created_at`, `updated_at`, `version`, dan metadata sumber yang tersedia tanpa identitas akun.
- Record operasional tidak di-hard-delete melalui UI.
- Constraint dan unique index digunakan untuk menjaga integritas, bukan mengandalkan frontend.

---

## 13. API Tingkat Tinggi

REST API terdokumentasi melalui OpenAPI. Rute indikatif:

```text
POST   /calculations/gas-mix
POST   /calculations/tank

GET    /simulations
POST   /simulations
GET    /simulations/:id
PATCH  /simulations/:id
POST   /simulations/:id/archive
POST   /simulations/:id/restore

GET/POST/PATCH /operation-plans...
GET/POST/PATCH /pgn-nominations...
GET/POST       /evaluations...
POST           /learning-runs

GET    /formula-sets
POST   /formula-sets/:id/activate

GET    /system-logs
POST   /exports
GET    /exports/:id
```

Persyaratan API:

- Error menggunakan format konsisten dengan code, message, field errors, dan correlation ID.
- Mutasi penting mendukung idempotency key jika berisiko terkirim ulang.
- Pagination dilakukan server-side.
- Tidak ada authorization atau ownership berbasis akun; pengamanan akses dilakukan pada jaringan/infrastruktur.
- Kalkulasi kritis diverifikasi server-side sebelum penyimpanan.

---

## 14. Non-Functional Requirements

### 14.1 Performance

- Kalkulasi lokal interaktif ≤500 ms pada dataset satu dokumen.
- API read umum ≤1 detik p95 dan write umum ≤2 detik p95 di jaringan internal, tidak termasuk export.
- Tabel besar menggunakan virtualization bila dibutuhkan.
- Export berjalan sebagai job terkontrol jika melebihi batas request normal.

### 14.2 Availability dan recovery

- Target availability awal 99,5% per bulan.
- Backup PostgreSQL otomatis dan terenkripsi.
- Target awal RPO ≤24 jam dan RTO ≤4 jam; wajib dikonfirmasi business owner.
- Restore drill dilakukan berkala dan hasilnya terdokumentasi.
- Migration database memiliki prosedur rollback/forward-fix.

### 14.3 Security

- HTTPS wajib pada production.
- Secret hanya melalui environment/secret manager; tidak masuk repository atau image.
- Aplikasi production tidak menggunakan superuser PostgreSQL.
- Password yang pernah dibagikan harus dirotasi sebelum penggunaan production.
- Database hanya dapat diakses dari host/network yang diizinkan.
- CSP, HSTS, X-Content-Type-Options, validasi input, sanitasi output, dan rate limiting diterapkan.
- Dependency/container scanning dijalankan pada CI.
- Least privilege diterapkan pada user aplikasi dan user database.
- Data sensitif pada log diminimalkan dan mengikuti kebijakan privasi perusahaan.

### 14.4 Accessibility dan usability

- Target WCAG 2.1 AA untuk alur utama sejauh layak bagi aplikasi internal.
- Semua form dapat digunakan dengan keyboard.
- Fokus terlihat, label terhubung ke input, dan error tidak bergantung pada warna saja.
- Grafik memiliki legenda dan tabel data alternatif.
- Desktop-first pada lebar 1366 px; alur baca tetap dapat digunakan pada tablet 768 px.

### 14.5 Compatibility

- Mendukung dua versi mayor terakhir Microsoft Edge dan Google Chrome yang disetujui TI.
- Resolusi target minimum TBD; rekomendasi 1280×720 dengan pengalaman optimal ≥1366×768.

### 14.6 Maintainability dan observability

- TypeScript strict mode.
- Calculation engine memiliki unit test terpisah.
- Structured logs dengan correlation ID.
- Health/readiness endpoints.
- Metrics minimal: request rate, error rate, latency, DB pool, dan job export.
- Alerting untuk error rate, unavailable service, backup failure, dan migration failure.

---

## 15. Arsitektur Target

```text
Browser internal
  └─ React + Vite + TypeScript
       ├─ React Hook Form + Zod
       ├─ TanStack Query/Table
       └─ Apache ECharts
              │ HTTPS / REST
              ▼
       NestJS + Fastify
       Modular Monolith
       ├─ Calculation service
       ├─ Simulation / ROH / Nomination
       ├─ Evaluation & Learning
       ├─ Export
       └─ System log
              │
              ▼
       PostgreSQL + Drizzle ORM
```

Struktur repository yang direkomendasikan:

```text
apps/web
apps/api
packages/calculation-engine
packages/database
packages/validation
packages/shared-types
packages/ui
```

Deployment awal berupa Docker containers pada infrastruktur internal. Redis/queue tidak diwajibkan untuk MVP kecuali pengujian membuktikan kebutuhan job asynchronous.

---

## 16. Database dan Environment

### 16.1 Environment

| Environment | Database | Tujuan |
|---|---|---|
| Development | PostgreSQL lokal via Docker | Pengembangan individual |
| Test/CI | PostgreSQL ephemeral | Automated tests |
| Staging/UAT | Database terpisah | UAT dan rehearsal migration |
| Production | PostgreSQL internal | Operasional resmi |

### 16.2 Provisioning production

- Database production dibuat oleh administrator/infrastruktur, bukan otomatis oleh aplikasi.
- Nama database yang direncanakan: `aditya`.
- Buat user aplikasi khusus (contoh `aditya_app`) dengan privilege minimum; jangan gunakan `postgres`.
- Schema dibuat melalui migration terversi pada pipeline deployment.
- Connection string disimpan dalam secret manager/environment, tidak dicantumkan dalam dokumen/repository.
- Production credential yang sempat terpapar harus diganti sebelum go-live.

---

## 17. Strategi Migrasi dari Prototipe

### 17.1 Prinsip

HTML lama tetap menjadi referensi perilaku, tetapi bukan spesifikasi formula final tanpa validasi stakeholder.

### 17.2 Tahapan

1. Inventarisasi seluruh fungsi, formula, parameter, input/output, pembulatan, warning, dan template export.
2. Buat golden dataset dari skenario normal, batas, invalid, Combined Cycle, Open Cycle, seluruh FGC, RWT, dan MWT.
3. Minta Engineer menandatangani formula specification dan expected results.
4. Ekstrak calculation engine sebagai pure functions dengan unit test.
5. Bangun UI baru per modul dan jalankan side-by-side comparison.
6. Migrasikan data `localStorage` evaluasi melalui fitur import opsional dengan preview, validasi, deduplication, dan audit.
7. Activity log lokal lama tidak otomatis dianggap audit resmi; import hanya jika diwajibkan dan diberi label legacy/unverified.
8. UAT menggunakan data riil yang telah disanitasi.
9. Freeze baseline, rehearsal deployment di staging, backup, dan go-live checklist.
10. Pertahankan prototipe read-only selama masa verifikasi yang disepakati.

### 17.3 Parity criteria

- Output numerik sama dalam precision/tolerance yang disepakati.
- Status/warning pada boundary sama atau perubahannya disetujui tertulis.
- Total dan rata-rata memakai denominator serta aturan missing/zero yang sama.
- Grafik menggunakan data sumber yang sama.
- Export memuat seluruh field wajib meski layout boleh dimodernisasi.

---

## 18. Testing dan Quality Gates

### 18.1 Test layers

- **Unit tests:** seluruh formula, normalisasi, validasi, agregasi, dan learning.
- **Golden/characterization tests:** membandingkan calculation engine dengan dataset baseline.
- **Integration tests:** API, PostgreSQL constraints, transactions, status Draft/Archived, dan system log.
- **Contract tests:** OpenAPI request/response.
- **Component tests:** form, tabel, warning, grafik, dan status Draft/Archived.
- **E2E tests:** create → calculate → save Draft → archive → restore → export.
- **Security tests:** injection, malformed input, rate limit, security headers, network exposure, dan secret scan.
- **Performance tests:** kalkulasi, list/filter, concurrent users, dan export.
- **Backup/restore test:** membuktikan RPO/RTO.

### 18.2 Quality gates sebelum production

- Tidak ada critical/high vulnerability yang belum diterima secara formal.
- Semua P0 acceptance tests lulus.
- Golden formula tests lulus 100%.
- UAT ditandatangani perwakilan Operator dan Engineer.
- Restore test berhasil.
- Runbook, monitoring, rollback, dan support owner tersedia.
- Production secrets sudah dirotasi dan tervalidasi.

---

## 19. Acceptance Criteria Utama

### AC-01 — Formula parity

**Given** golden dataset yang disetujui Engineer
**When** dataset dihitung dengan calculation engine production
**Then** seluruh output dan status sesuai expected result dalam toleransi yang disepakati dan formula version tercatat.

### AC-02 — Arsip ROH

**Given** ROH Draft yang valid untuk satu tanggal
**When** pengguna mengarsipkan ROH setelah konfirmasi
**Then** status menjadi Archived, ROH read-only, timestamp perubahan tersimpan, export menampilkan revision/status, dan transisi tercatat.

### AC-03 — Kembalikan ke Draft

**Given** dokumen berstatus Archived
**When** pengguna memilih Kembalikan ke Draft dan mengonfirmasi aksi
**Then** status menjadi Draft, dokumen dapat diedit, revision bertambah saat disimpan, dan histori sebelumnya tetap dapat ditelusuri.

### AC-04 — Akses tanpa authentication

**Given** aplikasi berada pada jaringan internal yang diizinkan
**When** pengunjung membuka aplikasi
**Then** seluruh fungsi tersedia tanpa login, sedangkan akses dari jaringan yang tidak diizinkan diblokir oleh infrastruktur.

### AC-05 — Evaluasi dan learning

**Given** terdapat sampel evaluasi yang memenuhi mode, load tolerance, dan minimum sample
**When** learning dihitung
**Then** sistem menampilkan sample IDs, jumlah sampel, faktor, deviasi, rekomendasi, dan formula version secara reproducible.

### AC-06 — System log

**Given** pengunjung membuat, mengubah, mengarsipkan, mengembalikan ke Draft, dan mengekspor dokumen
**When** system log dibuka
**Then** seluruh event terlihat berurutan dengan server timestamp, metadata sumber yang tersedia, entity, revision, action, dan correlation ID tanpa klaim identitas manusia.

### AC-07 — Tank warning

**Given** level tank sama dengan atau lebih besar dari OFL aktif
**When** kalkulasi dijalankan
**Then** sistem menampilkan status kritis/peringatan overflow yang tidak hanya mengandalkan warna.

### AC-08 — Export

**Given** dokumen Draft atau Archived dengan tabel dan grafik
**When** pengguna mengekspor PDF dan Excel
**Then** kedua file dapat dibuka, data numerik benar, metadata lengkap, dan event export tercatat.

---

## 20. Delivery Plan

Estimasi berikut bersifat relatif; jadwal final bergantung pada tim dan sign-off formula.

### Fase 0 — Discovery dan formula freeze

- Workshop domain dan alur penggunaan.
- Inventaris formula/parameter.
- Golden dataset dan sign-off.
- Wireframe dan finalisasi kebutuhan jaringan internal.

### Fase 1 — Foundation

- Monorepo, CI/CD, environments, database migrations.
- Layout, design system, data persistence, dan system log foundation.
- Calculation engine dan test harness.

### Fase 2 — Kalkulator

- Gas Mix Calculator.
- Tank Calculator.
- Formula/parameter versioning awal.

### Fase 3 — Operasional inti

- Simulasi PHE/PGN.
- ROH.
- Grafik, save/versioning, Draft/Archived, Excel/PDF.

### Fase 4 — Nominasi dan evaluasi

- Nominasi PGN.
- Evaluasi & Learning.
- Import legacy evaluation.

### Fase 5 — Hardening dan go-live

- Security/performance/accessibility testing.
- UAT, backup/restore, observability, runbook.
- Staging rehearsal, production provisioning, dan cutover.

---

## 21. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Formula prototipe belum menjadi spesifikasi resmi | Hasil salah/tidak dipercaya | Formula workshop, golden dataset, sign-off Engineer |
| Duplicate/overridden functions pada HTML | Perilaku baseline ambigu | Uji perilaku runtime dan dokumentasikan implementasi efektif |
| Rewrite mengubah rounding/agregasi | Selisih hasil | Decimal arithmetic, parity tests, explicit precision policy |
| System log dianggap dapat membuktikan identitas manusia | Attribution keliru | Tampilkan keterbatasan no-auth dan pisahkan system event dari clickstream |
| User aplikasi memakai superuser DB | Dampak insiden tinggi | Least-privilege service account dan network restriction |
| Credential telah dibagikan | Akses tidak sah | Rotasi sebelum database digunakan |
| Tidak ada authentication | Siapa pun di jaringan yang dapat membuka aplikasi dapat melihat/mengubah data | Batasi akses dengan firewall/VPN/reverse proxy dan terima keterbatasan attribution secara eksplisit |
| Export berbeda antar browser | Dokumen tidak konsisten | Server-side PDF dan regression tests |
| Learning dianggap otomatis benar | Keputusan operasi keliru | Human review, sample traceability, no auto-activation |
| Scope integrasi belum jelas | Delay | Pisahkan integrasi eksternal dari MVP sampai kontrak tersedia |
| Kehilangan data lokal lama | Histori hilang | Import tool dengan preview dan arsip file sumber |

---

## 22. Asumsi

- Aplikasi digunakan pada jaringan internal dan bukan sistem public-facing.
- Pengguna utama memakai Edge/Chrome pada desktop Windows.
- PostgreSQL production akan tersedia saat deployment, sedangkan development menggunakan database lokal terpisah.
- Stakeholder domain dapat menyediakan expected results dan menyetujui formula.
- ADITYA tidak mengirim perintah kontrol ke peralatan pembangkit pada MVP.
- Data aktual dimasukkan manual sampai integrasi sumber data disetujui.

---

## 23. Dependencies

- Product owner dan business owner yang berwenang mengambil keputusan.
- Engineer untuk validasi formula dan parameter.
- Tim TI untuk DNS, TLS, network, firewall/VPN, server/container platform, dan backup.
- Template resmi Excel/PDF.
- Kebijakan retensi, klasifikasi data, dan system log perusahaan.
- Akses staging ke PostgreSQL dan sistem observability.

---

## 24. Open Questions / Keputusan yang Diperlukan

### Bisnis

1. Siapa product owner dan business owner aplikasi?
2. Apakah Gas Mix dan Tank calculation perlu disimpan, atau hanya dokumen operasional?
3. Berapa lama retensi ROH, nominasi, evaluasi, export, dan system log?
4. Apa disclaimer resmi penggunaan hasil kalkulasi?

### Formula

5. Formula mana yang resmi untuk tiap mode, unit, dan boundary?
6. Berapa precision penyimpanan dan pembulatan tampilan setiap field?
7. Bagaimana perlakuan input kosong versus nol dalam total/rata-rata?
8. Apakah parameter RWT/MWT baseline sudah resmi?
9. Bagaimana prosedur organisasi untuk mengusulkan, menguji, memvalidasi, dan men-deploy formula baru?

### Workflow dan data

10. Apakah aturan Draft/Archived berlaku sama untuk Simulasi, ROH, dan Nominasi?
11. Apakah satu tanggal boleh memiliki beberapa Draft atau hanya satu dokumen aktif?
12. Bagaimana aturan distribusi “Isi Forecast dari Jumlah Harian”?
13. Data `localStorage` mana yang harus diimpor dan dari berapa perangkat?

### Teknologi dan operasi

14. Jaringan, VPN, firewall, atau reverse proxy apa yang membatasi akses ke aplikasi tanpa authentication?
15. Berapa concurrent users dan ukuran histori yang diperkirakan?
16. Di mana container production akan dijalankan?
17. Apakah server dapat mengakses internet, atau seluruh dependency harus tersedia internal?
18. Berapa target RPO/RTO resmi?
19. Metadata apa saja yang wajib ditampilkan pada PDF?

---

## 25. Definition of Done MVP

MVP dinyatakan selesai apabila:

- Seluruh requirement P0 yang disepakati telah diimplementasikan.
- Formula specification dan golden dataset ditandatangani stakeholder.
- Golden tests, integration tests, dan E2E critical path lulus.
- Status hanya terdiri dari Draft dan Archived; aturan read-only Archived konsisten pada UI dan API.
- Data utama tersimpan di PostgreSQL dengan migration terversi.
- System log, formula version, dan revision tersedia pada record terkait.
- Export Excel/PDF tervalidasi oleh pengguna bisnis.
- Security review, performance test, backup/restore test, dan UAT selesai.
- Dokumentasi pengguna, operasi sistem, deployment, rollback, serta support tersedia.
- Database/user production dibuat dengan least privilege dan seluruh credential terekspos telah dirotasi.

---

## Lampiran A — Traceability Baseline Prototipe

| Modul target | Baseline prototipe |
|---|---|
| Gas Mix | `calculateGasMixCard`, `calculateGasTotal`, `getPgnEnergy` |
| Simulasi | `calculateAll`, `createTable`, `simDrawChart` |
| ROH | `rohCalculateAll`, `rohGasFormula`, `rohPgnEnergy`, `rohDrawChart` |
| Nominasi PGN | `pgnNominationCalculate`, `pgnNominationFillForecast` |
| Evaluasi | `evalBuildRecord`, `evalRecalculateLearning` |
| Tanki | `ADITYA_TANK_DATA`, `tankCalculate`, `tankStatusForLevel` |
| Activity | `activityLog`, `activityGetLogs`, `activityFetchPublicIp` |
| Export | fungsi Excel/PDF per modul; terdapat beberapa patch/override yang harus dirasionalisasi |

## Lampiran B — Glossary Awal

| Istilah | Definisi awal |
|---|---|
| ADITYA | Advanced Digital Integrated Turbine & Energy Analytics |
| BBTUD | Billion British Thermal Units per Day; konfirmasi pemakaian unit per field |
| FGC | Istilah domain sesuai prototipe; kepanjangan resmi TBD |
| GT | Gas Turbine |
| ST | Steam Turbine |
| PHE | Sumber/kontrak energi sesuai domain; definisi resmi TBD |
| PGN | Perusahaan Gas Negara / sumber energi sesuai konteks domain |
| ROH | Rencana Operasi Harian |
| RWT | Raw Water Tank |
| MWT | Make-up Water Tank |
| NWL | Normal Water Level |
| HWI | High Water Indicator/level; definisi resmi TBD |
| OFL | Overflow Level |
| SSOT | Single Source of Truth |
