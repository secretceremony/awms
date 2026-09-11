# BAB V — Catatan Hasil Implementasi Sistem (AWMS)

Dokumen ini berisi rangkuman **Hasil Implementasi (BAB V Bagian 1)** sistem AWMS yang dapat langsung dikutip dan disesuaikan saat menyusun naskah laporan kerja praktik.

---

## 1. Fitur-Fitur yang Berhasil Diimplementasikan

Sistem AWMS yang selesai dibangun mencakup fitur-fitur operasional inti berikut:

### 1.1 Modul Operasional (Operations)
1. **Daftar Stok (Stock List)**:
   - Menampilkan total kuantitas stok per gudang dengan pemisahan tracking: Serialized (perangkat bernomor seri unik) dan Bulk (material habis pakai/non-serial).
   - Filter pencarian cepat berdasarkan nama barang, merk, model, dan gudang lokasi.
   - Akses cepat menuju form ekspor laporan bulanan.
2. **Penerimaan Barang (Incoming)**:
   - Registrasi penerimaan barang dari vendor / pusat pengadaan.
   - Perekaman nomor referensi, tanggal mutasi, dan verifikasi kondisi barang masuk.
   - Pembuatan otomatis data serial dengan status awal `STANDBY_GOOD`.
3. **Pengeluaran Barang (Outgoing)**:
   - Alokasi pengiriman barang dari gudang sumber menuju lokasi proyek mitra/klien.
   - Pemilihan unit serial spesifik dengan status valid (hanya unit dalam kondisi `STANDBY_GOOD` yang dapat dialokasikan).
   - Pengurangan otomatis saldo stok gudang dan pencatatan saldo barang pada proyek target.
4. **Riwayat Mutasi (Movement History)**:
   - Ledger terpusat yang mencatat semua transaksi mutasi fisik (`INCOMING`, `OUTGOING`, `RETURN`, `ADJUSTMENT`).
   - Informasi detail mengenai operator pelaksana, tanggal pencatatan, dan referensi proyek.

### 1.2 Modul Pengiriman (Deliveries)
1. **Surat Jalan / Delivery Order (DO)**:
   - Pengelolaan alur dokumen: status `DRAFT` dapat diedit, sedangkan status `ISSUED` bersifat *sealed* (terkunci secara legal).
   - Penomoran otomatis berurutan tahunan yang aman terhadap konkurensi (`XXX/ALS-[CITY]/DO-[CLIENT]/[MONTH]/[YEAR]`).
   - Tampilan cetak resmi (A4) berbasis standar dokumen PT ALSSA Corporindo lengkap dengan snapshot penerima, pihak perhatian (*Attn*), nama proyek, nomor PTS, dan rincian barang.
2. **Label Pengiriman (Shipping Labels)**:
   - Pembuatan label termal ukuran standar `100mm x 150mm` untuk penempelan pada paket pengiriman fisik.
   - Mendukung label yang terhubung langsung dengan nomor DO maupun label mandiri (*standalone*).
   - Penanda peringatan barang rapuh (*FRAGILE*) otomatis.

### 1.3 Master Data
- Manajemen mandiri untuk entitas utama: **Klien & Kontak Person**, **Proyek & Lokasi Site**, **Gudang & Kode Kota**, **Kota Referensi**, serta **Satuan Unit (UoM)**.
- Arsitektur terpisah dari menu pengaturan sistem, memberikan akses transparan bagi peran Admin dan Read-Only.

### 1.4 Laporan & Ekspor (Reports & Exports)
- **Laporan Mutasi Bulanan (.xlsx)**: Menghasilkan buku kerja Excel 6-sheet (Ringkasan, Barang Masuk, Pengembalian, Barang Keluar, Penyesuaian, dan Posisi Stok Terkini).
- Pilihan tahun dinamis secara otomatis (tahun berjalan hingga 5 tahun ke belakang secara descending).
- **Master Data Workbook Export**: Cadangan penuh seluruh tabel sistem dalam satu file Excel multi-lembar.

### 1.5 Keamanan & Sistem
- Otentikasi berbasis token JWT tersimpan aman pada cookie `HttpOnly`.
- Kontrol akses berbasis peran (RBAC) dengan 3 tingkatan hak akses (`SUPER_ADMIN`, `ADMIN`, `READ_ONLY`).
- Pencatatan log aktivitas audit (*Audit Logs*) yang membersihkan data kredensial sensitif.

---

## 2. Output Nyata Sistem (System Outputs)

Saat menulis laporan, jelaskan keluaran konkret yang dihasilkan sistem:

1. **Output Layar Interaktif (Web UI Dashboard)**:
   - Antarmuka web responsif dengan indikator metrik KPI (Total Nilai/Kuantitas Aset, Peringatan Stok Kritis, Ringkasan DO).
2. **Output Dokumen Cetak (Printable PDF / Paper Output)**:
   - Lembar resmi Delivery Order format portrait A4 dengan logo ALSSA, nomor legal, detail kontak mitra, dan tanda tangan PIC.
   - Label thermal dispatch ukuran `100x150 mm` berorientasi vertikal.
3. **Output File Excel Spreadsheet (.xlsx)**:
   - Format standar `AWMS_Monthly_Report_YYYY-MM.xlsx` dengan header tabel bergaya korporat ALSSA (biru navy `#2250A1`).
   - Format cadangan `AWMS_Data_Export_YYYY-MM-DD_HHmm.xlsx`.

---

## 3. Saran Tangkapan Layar untuk Bab V (Screenshot Suggestions)

Gunakan tangkapan layar berikut sebagai gambar dokumentasi pada Bab V:

| No | Nama Gambar yang Disarankan | Halaman / Elemen Sumber | Keterangan untuk Laporan |
| :---: | :--- | :--- | :--- |
| 1 | `Gambar 5.1 Tampilan Antarmuka Login AWMS` | `/login` | Menampilkan formulir autentikasi pengguna dengan cookie aman. |
| 2 | `Gambar 5.2 Dashboard Utama dan Ringkasan KPI Stok` | `/` | Menampilkan metrik total stok, status aset, dan aktivitas logistik terkini. |
| 3 | `Gambar 5.3 Halaman Daftar Stok Multi-Gudang` | `/inventory` | Menampilkan data stok per gudang dengan filter pencarian barang. |
| 4 | `Gambar 5.4 Formulir Alokasi Barang Keluar (Outgoing)` | `/inventory/outgoing` | Menampilkan pemilihan gudang sumber, proyek tujuan, dan unit serial. |
| 5 | `Gambar 5.5 Daftar dan Status Dokumen Delivery Order` | `/delivery-orders` | Menampilkan status dokumen (DRAFT, ISSUED) dan nomor urut resmi. |
| 6 | `Gambar 5.6 Tampilan Pracetak Dokumen Delivery Order (A4)` | `/delivery-orders/:id/print` | Menampilkan pratinjau cetak surat jalan resmi PT ALSSA Corporindo. |
| 7 | `Gambar 5.7 Tampilan Label Pengiriman Paket (Thermal)` | `/shipping-labels` | Menampilkan label pengiriman standar dengan barcode dan penanda Fragile. |
| 8 | `Gambar 5.8 Halaman Laporan Bulanan dan Seleksi Tahun Dinamis` | `/reports` | Menampilkan opsi generasi workbook Excel bulanan. |
| 9 | `Gambar 5.9 Lembar Kerja Excel Hasil Ekspor Laporan Bulanan` | Excel Viewer | Menampilkan struktur 6 sheet laporan mutasi logistik pergudangan. |
| 10 | `Gambar 5.10 Halaman Manajemen Pengguna dan Peran Hak Akses` | `/users` | Menampilkan pembagian hak akses SUPER_ADMIN, ADMIN, dan READ_ONLY. |
