# BAB VI — Catatan Kesimpulan & Saran Pengembangan (AWMS)

Dokumen ini berisi poin-poin acuan untuk menyusun **BAB VI (Kesimpulan dan Saran)** pada Laporan Kerja Praktik di **PT ALSSA Corporindo**.

---

## 1. Poin-Poin Kesimpulan (Conclusion Points)

Berdasarkan pelaksanaan kerja praktik dan implementasi sistem AWMS:

1. **Digitalisasi Pengelolaan Pergudangan Berhasil Diterapkan**:
   Sistem AWMS berhasil menggantikan sistem pencatatan inventaris berbasis spreadsheet manual menjadi sistem terintegrasi berbasis web yang memusatkan kendali mutasi barang di beberapa gudang regional PT ALSSA Corporindo.

2. **Integritas dan Akuntabilitas Data Logistik Meningkat**:
   Dengan adanya buku besar mutasi stok (`stock_movements`) yang immutable, pelacakan unit serial berstatus unik, serta penomoran surat jalan otomatis tahunan, risiko duplikasi nomor dokumen dan selisih stok fisik dapat dicegah secara sistemik.

3. **Perlindungan Legalitas Dokumen Pengiriman Terjamin**:
   Penerapan mekanisme *document snapshot sealing* pada Delivery Order berstatus `ISSUED` memastikan dokumen pengiriman barang memiliki kepastian hukum dan data historis yang permanen meskipun data master mengalami perubahan di kemudian hari.

4. **Efisiensi Administrasi dan Pelaporan**:
   Generasi laporan mutasi bulanan Excel 6-sheet yang terotomatisasi secara signifikan memangkas waktu kerja staf logistik dalam rekapitulasi data periodik.

---

## 2. Saran Pengembangan Lanjutan (Future Improvement Suggestions)

Untuk pengembangan sistem di masa mendatang oleh tim IT PT ALSSA Corporindo:

1. **Integrasi Barcode / QR Code Scanner Fisik**:
   Menambahkan fitur pemindaian barcode langsung menggunakan kamera perangkat mobile atau barcode scanner USB guna mempercepat proses input serial number pada saat *receiving* (barang masuk) dan *dispatching* (barang keluar).

2. **Sistem Notifikasi Pengingat Stok Minimum Otomatis**:
   Mengintegrasikan modul notifikasi terjadwal (melalui Email SMTP atau WhatsApp Bot API) kepada bagian pengadaan (*procurement*) ketika persediaan material habis pakai (*consumables*) berada di bawah batas minimum (*low stock threshold*).

3. **Pelacakan Lokasi Pengiriman Real-Time (Shipment Tracking)**:
   Menghubungkan nomor Delivery Order dengan API ekspedisi pihak ketiga atau GPS tracking armada kendaraan untuk memantau status estimasi kedatangan barang di lokasi rig/site secara *real-time*.

4. **Kustomisasi Izin Pengguna Granular**:
   Mengembangkan sistem permission builder dinamis pada antarmuka admin sehingga manajer operasional dapat menentukan izin spesifik per modul di luar 3 profil peran baku (`SUPER_ADMIN`, `ADMIN`, `READ_ONLY`).
