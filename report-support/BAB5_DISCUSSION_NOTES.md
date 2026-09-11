# BAB V — Catatan Pembahasan & Analisis Dampak (AWMS)

Dokumen ini berisi materi analitis untuk menyusun bagian **Pembahasan (Discussion) dan Analisis Dampak (Impact Analysis)** pada BAB V Laporan Kerja Praktik di **PT ALSSA Corporindo**.

---

## 1. Masalah Bisnis yang Berhasil Diselesaikan (Business Problems Solved)

| Masalah Sebelumnya (Manual / Spreadsheet) | Solusi yang Dihasilkan AWMS |
| :--- | :--- |
| **Pencatatan Stok Terfragmentasi**: Setiap gudang memiliki file Excel terpisah sehingga terjadi ketidaksinkronan data ketersediaan barang. | **Satu Sumber Kebenaran Terpusat (*Single Source of Truth*)**: Database PostgreSQL terpusat yang memperbarui saldo stok secara *real-time* saat terjadi transaksi. |
| **Kerentanan Penomoran DO Ganda**: Penomoran surat jalan sering kali bentrok saat beberapa staf logistik membuat DO pada hari yang sama. | **Atomic Annual Sequence Generator**: Penomoran terotomatisasi menggunakan transaksi Prisma `upsert` pada tabel `do_sequences` yang menjamin nomor urut unik dan anti bentrok. |
| **Kehilangan Riwayat Mutasi**: Jika angka stok di Excel diubah, tidak ada jejak siapa yang mengubah dan untuk proyek apa. | **Transactional Movement Ledger**: Angka stok tidak pernah diubah secara manual langsung, melainkan hasil mutasi dari tabel `stock_movements`. |
| **Inkonsistensi Cetak Dokumen Lama**: Jika nama klien atau alamat proyek berubah di masa depan, membuka DO 1 tahun yang lalu akan menampilkan data yang salah. | **Document Snapshot Sealing**: Saat DO berstatus `ISSUED`, seluruh atribut legal (nama klien, site, contact person, item) dikunci dalam kolom snapshot dan JSON. |
| **Keterlambatan Pelaporan Bulanan**: Pembuatan laporan Excel bulanan membutuhkan waktu berhari-hari untuk merekap mutasi fisik. | **Automated Multi-Sheet Excel Engine**: Laporan bulanan 6-sheet dapat diunduh dalam hitungan detik via `exceljs`. |

---

## 2. Keputusan Desain Teknis & Rationale (Technical Decisions)

### 2.1 Mengapa Menggunakan React 19 + Vite (Bukan Next.js / SSR)?
- **Alasan**: AWMS adalah aplikasi *internal operational back-office*, bukan situs e-commerce publik yang membutuhkan SEO (Search Engine Optimization).
- **Manfaat**: Arsitektur Single Page Application (SPA) berbasis Vite memberikan kecepatan pemuatan antarmuka (*lightning-fast client routing*), deployment file statis yang sangat murah/mudah di Nginx tanpa memerlukan Node runtime untuk frontend, serta responsivitas tinggi bagi admin gudang.

### 2.2 Mengapa Menggunakan NestJS (Bukan Express Biasa)?
- **Alasan**: Express mentah sering kali menghasilkan struktur folder yang tidak konsisten saat dikembangkan oleh beberapa pengembang magang berbeda.
- **Manfaat**: NestJS menyediakan arsitektur berbasis modul (Dependency Injection), standar DTO validation yang kuat (`class-validator`), dan arsitektur *enterprise-ready* yang mudah dirawat oleh tim IT internal perusahaan di kemudian hari.

### 2.3 Mengapa Menggunakan Snapshot Fields pada Delivery Order?
- **Alasan**: Kebutuhan kepatuhan audit legal pergudangan (*legal compliance*).
- **Manfaat**: Surat jalan adalah dokumen hukum serah terima fisik barang. Snapshot menjamin integritas hukum bahwa surat jalan yang dicetak ulang di masa depan persis sama dengan kondisi saat armada truk berangkat.

### 2.4 Restrukturisasi Arsitektur Informasi (Navigasi)
- Pada fase awal, entitas Satuan (*Units*) dan Kota (*Cities*) berada di dalam tab Pengaturan sistem.
- **Dampak**: Admin logistik biasa yang tidak memiliki hak akses Pengaturan sistem tidak dapat melihat atau menambahkan satuan barang baru.
- **Solusi**: Memisahkan Master Data menjadi menu tingkat atas tersendiri yang dapat diakses oleh seluruh staf operasional berizin.

---

## 3. Analisis Dampak Operasional (Operational Impact Analysis)

Berdasarkan pengujian dan simulasi alur kerja di PT ALSSA Corporindo:

1. **Efisiensi Waktu Operasional**:
   - Waktu pembuatan dokumen Delivery Order berkurang dari rata-rata 15–20 menit (pencarian manual nomor seri dan penyusunan tabel Excel) menjadi kurang dari 3 menit melalui formulir terintegrasi.
   - Waktu penyusunan laporan mutasi bulanan berkurang hingga 95% melalui fitur ekspor otomatis.
2. **Akurasi Data Aset**:
   - Mengeliminasi kesalahan penugasan serial number ganda (*double allocation*) ke dua lokasi proyek yang berbeda secara bersamaan.
3. **Akuntabilitas & Keamanan**:
   - Perekaman otomatis nama operator pada setiap mutasi dan log aktivitas audit meningkatkan transparansi pertanggungjawaban fisik barang.
