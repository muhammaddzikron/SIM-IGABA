/**
 * GOOGLE APPS SCRIPT DATABASE API
 * 
 * Skenario Penggunaan:
 * 1. Buka Google Sheets (https://docs.google.com/spreadsheets/d/1Bqgss06C6au6HfrLfF-6ywDftB7tOpN986b6QNh7ncI)
 * 2. Klik "Ekstensi" > "Apps Script" (Extensions > Apps Script)
 * 3. Hapus seluruh kode bawaan, lalu paste-kan seluruh kode di bawah ini.
 * 4. Klik tombol simpan.
 * 5. Klik "Terapkan" > "Terapkan Baru" (Deploy > New Deployment).
 * 6. Pilih Jenis "Aplikasi Web" (Web App).
 *    - Jalankan sebagai: "Saya" (Me)
 *    - Siapa yang memiliki akses: "Siapa saja" (Anyone)
 * 7. Klik "Terapkan" (Deploy) dan berikan izin akses yang diminta.
 * 8. Salin URL Aplikasi Web yang dihasilkan (e.g., https://script.google.com/macros/s/.../exec)
 * 9. Tempel URL tersebut ke halaman Pengaturan (Settings) di aplikasi web ini.
 * 
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Konfigurasi ID Spreadsheet (opsional, jika kosong akan otomatis menggunakan spreadsheet aktif tempat script ini ditempelkan)
var SPREADSHEET_ID = "";

function getSpreadsheet() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

// Helper untuk format JSON response
function jsonResponse(data, status) {
  var output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// Get headers for specific sheet
function getSheetHeaders(sheetName) {
  var headersMap = {
    "Schools": ["id", "name", "npsn", "nsm", "status", "jenjang", "alamat", "kelurahan", "kecamatan", "kabupaten", "provinsi", "kode_pos", "telepon", "email", "website", "kepala_sekolah", "nip_kepala", "akreditasi", "status_tanah", "status_gedung", "luas_tanah", "luas_bangunan", "jumlah_ruang", "jumlah_toilet", "tahun_berdiri", "tahun_operasional", "latitude", "longitude", "foto_url", "logo_url", "status_aktif", "password_petugas", "username_petugas", "ranting_aisyiyah", "ketua_ranting", "ketua_pda", "ketua_pca", "created_at", "updated_at"],
    "Teachers": ["id", "school_id", "nama", "nik", "nip", "tempat_lahir", "tanggal_lahir", "jenis_kelamin", "alamat", "no_hp", "email", "pendidikan", "jurusan", "tmt", "status_guru", "jabatan", "golongan", "honor", "gty", "gtt", "pns", "pppk", "foto_url", "tahun_pelajaran", "semester", "created_at", "updated_at"],
    "Students": ["id", "school_id", "nama", "nik", "nisn", "tempat_lahir", "tanggal_lahir", "jenis_kelamin", "nama_ayah", "nama_ibu", "alamat", "rt", "rw", "kelurahan", "kecamatan", "kabupaten", "provinsi", "agama", "anak_ke", "jumlah_saudara", "status_aktif", "tahun_masuk", "tahun_pelajaran", "semester", "created_at", "updated_at"],
    "Reports": ["id", "school_id", "bulan", "tahun", "tahun_pelajaran", "semester", "hari_belajar", "status_gedung", "jumlah_ruangan", "status", "notes", "jumlah_guru", "jumlah_siswa", "persentase_kehadiran_guru", "persentase_kehadiran_siswa", "status_laporan", "catatan", "created_at", "updated_at"],
    "AttendanceTeachers": ["id", "school_id", "tanggal", "jumlah_hadir", "jumlah_izin", "jumlah_sakit", "jumlah_alfa", "created_at", "updated_at"],
    "AttendanceStudents": ["id", "school_id", "tanggal", "jumlah_hadir", "jumlah_izin", "jumlah_sakit", "jumlah_alfa", "created_at", "updated_at"],
    "Inventories": ["id", "school_id", "nama_barang", "jumlah", "kondisi_baik", "kondisi_rusak_ringan", "kondisi_rusak_berat", "sumber_dana", "created_at", "updated_at"],
    "Districts": ["id", "name", "created_at", "updated_at"],
    "Villages": ["id", "district_id", "name", "created_at", "updated_at"],
    "Logs": ["id", "user_id", "username", "action", "details", "timestamp"],
    "Settings": ["id", "google_sheets_url", "google_apps_script_url", "backup_interval", "allow_petugas_edit_after_submit", "app_title", "app_subtitle", "super_admin_password", "admin_password", "petugas_password", "created_at", "updated_at"]
  };
  return headersMap[sheetName] || ["id", "created_at", "updated_at"];
}

// Seed baseline data on initial sheet creation
function seedInitialData(sheetName, sheet) {
  var initialRecords = [];
  
  if (sheetName === "Schools") {
    initialRecords = [
      {
        id: "school-1",
        name: "TK ABA Gergunung",
        npsn: "20363248",
        nsm: "111233050012",
        status: "Swasta",
        jenjang: "TK",
        alamat: "Jl. Ki Hajar Dewantara, Gergunung",
        kelurahan: "Gergunung",
        kecamatan: "Klaten Utara",
        kabupaten: "Klaten",
        provinsi: "Jawa Tengah",
        kode_pos: "57438",
        telepon: "-",
        email: "aba.gergunung@gmail.com",
        website: "",
        kepala_sekolah: "Wahyuningsih, S.Pd",
        nip_kepala: "-",
        akreditasi: "A",
        status_tanah: "Milik Sendiri",
        status_gedung: "Milik Sendiri",
        luas_tanah: 400,
        luas_bangunan: 250,
        jumlah_ruang: 5,
        jumlah_toilet: 2,
        tahun_berdiri: "1980",
        tahun_operasional: "1982",
        latitude: "-7.6912",
        longitude: "110.6124",
        foto_url: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&auto=format&fit=crop&q=60",
        logo_url: "",
        status_aktif: "Aktif"
      },
      {
        id: "school-2",
        name: "TK ABA Bareng Lor",
        npsn: "20338779",
        nsm: "111233050013",
        status: "Swasta",
        jenjang: "TK",
        alamat: "Bareng Lor, Klaten Utara",
        kelurahan: "Bareng Lor",
        kecamatan: "Klaten Utara",
        kabupaten: "Klaten",
        provinsi: "Jawa Tengah",
        kode_pos: "57438",
        telepon: "-",
        email: "aba.barenglor@gmail.com",
        website: "",
        kepala_sekolah: "Sri Setyowati, S.Pd",
        nip_kepala: "-",
        akreditasi: "A",
        status_tanah: "Wakaf",
        status_gedung: "Milik Sendiri",
        luas_tanah: 350,
        luas_bangunan: 200,
        jumlah_ruang: 4,
        jumlah_toilet: 2,
        tahun_berdiri: "1975",
        tahun_operasional: "1977",
        latitude: "-7.6950",
        longitude: "110.6080",
        foto_url: "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=60",
        logo_url: "",
        status_aktif: "Aktif"
      },
      {
        id: "school-3",
        name: "TK ABA Jonggrangan",
        npsn: "20338781",
        nsm: "111233050014",
        status: "Swasta",
        jenjang: "TK",
        alamat: "Jonggrangan, Klaten Utara",
        kelurahan: "Jonggrangan",
        kecamatan: "Klaten Utara",
        kabupaten: "Klaten",
        provinsi: "Jawa Tengah",
        kode_pos: "57435",
        telepon: "-",
        email: "aba.jonggrangan@gmail.com",
        website: "",
        kepala_sekolah: "Mulyani, S.Pd",
        nip_kepala: "-",
        akreditasi: "B",
        status_tanah: "Wakaf",
        status_gedung: "Milik Sendiri",
        luas_tanah: 300,
        luas_bangunan: 180,
        jumlah_ruang: 3,
        jumlah_toilet: 1,
        tahun_berdiri: "1985",
        tahun_operasional: "1987",
        latitude: "-7.6850",
        longitude: "110.6150",
        foto_url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=60",
        logo_url: "",
        status_aktif: "Aktif"
      }
    ];
  } else if (sheetName === "Districts") {
    initialRecords = [
      { id: "dist-1", name: "Klaten Utara" }
    ];
  } else if (sheetName === "Villages") {
    initialRecords = [
      { id: "vil-1", district_id: "dist-1", name: "Bareng Lor" },
      { id: "vil-2", district_id: "dist-1", name: "Karanganom" },
      { id: "vil-3", district_id: "dist-1", name: "Gergunung" },
      { id: "vil-4", district_id: "dist-1", name: "Jati" },
      { id: "vil-5", district_id: "dist-1", name: "Belang Wetan" },
      { id: "vil-6", district_id: "dist-1", name: "Jonggrangan" },
      { id: "vil-7", district_id: "dist-1", name: "Ketandan" },
      { id: "vil-8", district_id: "dist-1", name: "Mayungan" }
    ];
  } else if (sheetName === "Settings") {
    initialRecords = [
      {
        id: "settings-1",
        google_sheets_url: "https://docs.google.com/spreadsheets/d/1Bqgss06C6au6HfrLfF-6ywDftB7tOpN986b6QNh7ncI/edit",
        google_apps_script_url: "https://script.google.com/macros/s/AKfycbz4C2cHkY4u6Ige3Ru595DhyhOUn9Fv-t9aI6m1seek-NJjNKXOloY9mLyoh7BT4pJV/exec",
        backup_interval: "Bulanan",
        allow_petugas_edit_after_submit: false,
        app_title: "SIM IGABA",
        app_subtitle: "Klaten Utara",
        super_admin_password: "adminn",
        admin_password: "admin",
        petugas_password: "petugas"
      }
    ];
  } else if (sheetName === "Teachers") {
    initialRecords = [
      {
        id: "teacher-1",
        school_id: "school-1",
        nama: "Wahyuningsih, S.Pd",
        nik: "3310014512800003",
        nip: "-",
        tempat_lahir: "Klaten",
        tanggal_lahir: "1980-05-12",
        jenis_kelamin: "P",
        alamat: "Gergunung, Klaten Utara",
        no_hp: "081234567890",
        email: "wahyuningsih@gmail.com",
        pendidikan: "S1",
        jurusan: "PG-PAUD",
        tmt: "2005-01-02",
        status_guru: "GTY",
        jabatan: "Kepala Sekolah",
        golongan: "-",
        honor: 3000000,
        gty: true,
        gtt: false,
        pns: false,
        pppk: false,
        foto_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=60"
      },
      {
        id: "teacher-2",
        school_id: "school-1",
        nama: "Khadijah, S.Pd",
        nik: "3310014811850002",
        nip: "-",
        tempat_lahir: "Klaten",
        tanggal_lahir: "1985-11-18",
        jenis_kelamin: "P",
        alamat: "Karanganom, Klaten Utara",
        no_hp: "081398765432",
        email: "khadijah.aba@gmail.com",
        pendidikan: "S1",
        jurusan: "Pendidikan Anak Usia Dini",
        tmt: "2012-07-15",
        status_guru: "GTY",
        jabatan: "Guru Kelas A",
        golongan: "-",
        honor: 2200000,
        gty: true,
        gtt: false,
        pns: false,
        pppk: false,
        foto_url: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=60"
      },
      {
        id: "teacher-3",
        school_id: "school-1",
        nama: "Aisyah Humaira, S.Pd",
        nik: "3310015409920001",
        nip: "-",
        tempat_lahir: "Klaten",
        tanggal_lahir: "1992-09-14",
        jenis_kelamin: "P",
        alamat: "Gergunung, Klaten Utara",
        no_hp: "085612345678",
        email: "aisyah.humaira@gmail.com",
        pendidikan: "S1",
        jurusan: "PG-PAUD",
        tmt: "2016-01-10",
        status_guru: "GTY",
        jabatan: "Guru Kelas B",
        golongan: "-",
        honor: 2000000,
        gty: true,
        gtt: false,
        pns: false,
        pppk: false,
        foto_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=60"
      },
      {
        id: "teacher-4",
        school_id: "school-1",
        nama: "Rahmat Hidayat, S.Or",
        nik: "3310011202880004",
        nip: "-",
        tempat_lahir: "Klaten",
        tanggal_lahir: "1988-02-12",
        jenis_kelamin: "L",
        alamat: "Bareng Lor, Klaten Utara",
        no_hp: "089876543210",
        email: "rahmat.hidayat@gmail.com",
        pendidikan: "S1",
        jurusan: "Pendidikan Olahraga",
        tmt: "2018-07-20",
        status_guru: "GTT",
        jabatan: "Guru Olahraga",
        golongan: "-",
        honor: 1500000,
        gty: false,
        gtt: true,
        pns: false,
        pppk: false,
        foto_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=60"
      },
      {
        id: "teacher-5",
        school_id: "school-2",
        nama: "Sri Setyowati, S.Pd",
        nik: "3310014804780001",
        nip: "-",
        tempat_lahir: "Klaten",
        tanggal_lahir: "1978-04-08",
        jenis_kelamin: "P",
        alamat: "Bareng Lor, Klaten Utara",
        no_hp: "081223344556",
        email: "sri.setyowati@gmail.com",
        pendidikan: "S1",
        jurusan: "PG-PAUD",
        tmt: "2008-07-01",
        status_guru: "GTY",
        jabatan: "Kepala Sekolah",
        golongan: "-",
        honor: 3200000,
        gty: true,
        gtt: false,
        pns: false,
        pppk: false,
        foto_url: "https://images.unsplash.com/photo-1554151228-14d9def656e4?w=150&auto=format&fit=crop&q=60"
      }
    ];
  } else if (sheetName === "Students") {
    initialRecords = [
      {
        id: "student-1",
        school_id: "school-1",
        nama: "Muhammad Al-Fatih",
        nik: "3310010508200001",
        nisn: "3201452140",
        tempat_lahir: "Klaten",
        tanggal_lahir: "2020-08-05",
        jenis_kelamin: "L",
        nama_ayah: "Suryaman",
        nama_ibu: "Nurlaila",
        alamat: "Gergunung RT 02/05",
        rt: "02",
        rw: "05",
        kelurahan: "Gergunung",
        kecamatan: "Klaten Utara",
        kabupaten: "Klaten",
        provinsi: "Jawa Tengah",
        agama: "Islam",
        anak_ke: 1,
        jumlah_saudara: 2,
        status_aktif: "Aktif",
        tahun_masuk: "2024",
        tahun_pelajaran: "2025/2026",
        semester: "Ganjil"
      },
      {
        id: "student-2",
        school_id: "school-1",
        nama: "Fatimah Az-Zahra",
        nik: "3310014812200002",
        nisn: "3201452141",
        tempat_lahir: "Klaten",
        tanggal_lahir: "2020-12-08",
        jenis_kelamin: "P",
        nama_ayah: "Andi Wijaya",
        nama_ibu: "Siti Rohmah",
        alamat: "Bareng Lor RT 04/01",
        rt: "04",
        rw: "01",
        kelurahan: "Bareng Lor",
        kecamatan: "Klaten Utara",
        kabupaten: "Klaten",
        provinsi: "Jawa Tengah",
        agama: "Islam",
        anak_ke: 2,
        jumlah_saudara: 1,
        status_aktif: "Aktif",
        tahun_masuk: "2024",
        tahun_pelajaran: "2025/2026",
        semester: "Ganjil"
      },
      {
        id: "student-3",
        school_id: "school-2",
        nama: "Ahmad Dahlan",
        nik: "3310011504200003",
        nisn: "3201452145",
        tempat_lahir: "Klaten",
        tanggal_lahir: "2020-04-15",
        jenis_kelamin: "L",
        nama_ayah: "Hasanudin",
        nama_ibu: "Siti Kalsum",
        alamat: "Bareng Lor RT 01/02",
        rt: "01",
        rw: "02",
        kelurahan: "Bareng Lor",
        kecamatan: "Klaten Utara",
        kabupaten: "Klaten",
        provinsi: "Jawa Tengah",
        agama: "Islam",
        anak_ke: 1,
        jumlah_saudara: 3,
        status_aktif: "Aktif",
        tahun_masuk: "2024",
        tahun_pelajaran: "2025/2026",
        semester: "Ganjil"
      }
    ];
  } else if (sheetName === "Reports") {
    initialRecords = [
      {
        id: "report-1",
        school_id: "school-1",
        bulan: "Mei",
        tahun: 2026,
        jumlah_guru: 4,
        jumlah_siswa: 2,
        persentase_kehadiran_guru: 98.5,
        persentase_kehadiran_siswa: 96.0,
        status_laporan: "APPROVED",
        catatan: "Laporan bulan Mei telah diperiksa dan disetujui.",
        created_at: "2026-05-31T00:00:00Z",
        updated_at: "2026-06-02T08:30:00Z"
      },
      {
        id: "report-2",
        school_id: "school-1",
        bulan: "Juni",
        tahun: 2026,
        jumlah_guru: 4,
        jumlah_siswa: 2,
        persentase_kehadiran_guru: 95.0,
        persentase_kehadiran_siswa: 94.5,
        status_laporan: "SUBMITTED",
        catatan: "Laporan Juni siap direview.",
        created_at: "2026-06-30T00:00:00Z",
        updated_at: "2026-06-30T16:45:00Z"
      }
    ];
  } else if (sheetName === "AttendanceTeachers") {
    initialRecords = [
      { id: "att-t-1", report_id: "report-1", teacher_id: "teacher-1", nama_guru: "Wahyuningsih, S.Pd", jenis_kelamin: "P", hadir: 22, izin: 0, sakit: 0, alpha: 0 },
      { id: "att-t-2", report_id: "report-1", teacher_id: "teacher-2", nama_guru: "Khadijah, S.Pd", jenis_kelamin: "P", hadir: 21, izin: 1, sakit: 0, alpha: 0 },
      { id: "att-t-3", report_id: "report-1", teacher_id: "teacher-3", nama_guru: "Aisyah Humaira, S.Pd", jenis_kelamin: "P", hadir: 22, izin: 0, sakit: 0, alpha: 0 },
      { id: "att-t-4", report_id: "report-1", teacher_id: "teacher-4", nama_guru: "Rahmat Hidayat, S.Or", jenis_kelamin: "L", hadir: 20, izin: 0, sakit: 2, alpha: 0 },
      { id: "att-t-5", report_id: "report-2", teacher_id: "teacher-1", nama_guru: "Wahyuningsih, S.Pd", jenis_kelamin: "P", hadir: 20, izin: 0, sakit: 0, alpha: 0 },
      { id: "att-t-6", report_id: "report-2", teacher_id: "teacher-2", nama_guru: "Khadijah, S.Pd", jenis_kelamin: "P", hadir: 19, izin: 0, sakit: 1, alpha: 0 }
    ];
  } else if (sheetName === "AttendanceStudents") {
    initialRecords = [
      { id: "att-s-1", report_id: "report-1", jenis_kelamin: "L", hadir: 44, izin: 0, sakit: 0, alpha: 0 },
      { id: "att-s-2", report_id: "report-1", jenis_kelamin: "P", hadir: 42, izin: 1, sakit: 1, alpha: 0 },
      { id: "att-s-3", report_id: "report-2", jenis_kelamin: "L", hadir: 40, izin: 0, sakit: 0, alpha: 0 },
      { id: "att-s-4", report_id: "report-2", jenis_kelamin: "P", hadir: 38, izin: 1, sakit: 1, alpha: 0 }
    ];
  } else if (sheetName === "Inventories") {
    initialRecords = [
      { id: "inv-1", report_id: "report-1", item_name: "Alat Bermain Luar (Prosotan/Ayunan)", quantity: 2, status_baik: 2, status_rusak: 0 },
      { id: "inv-2", report_id: "report-1", item_name: "Alat Bermain Dalam (APE)", quantity: 15, status_baik: 14, status_rusak: 1 },
      { id: "inv-3", report_id: "report-1", item_name: "Kursi Anak", quantity: 30, status_baik: 28, status_rusak: 2 },
      { id: "inv-4", report_id: "report-1", item_name: "Meja Anak", quantity: 15, status_baik: 15, status_rusak: 0 },
      { id: "inv-5", report_id: "report-1", item_name: "Kursi Guru", quantity: 6, status_baik: 6, status_rusak: 0 },
      { id: "inv-6", report_id: "report-1", item_name: "Meja Guru", quantity: 4, status_baik: 4, status_rusak: 0 },
      { id: "inv-7", report_id: "report-1", item_name: "Papan Tulis", quantity: 3, status_baik: 3, status_rusak: 0 },
      { id: "inv-8", report_id: "report-2", item_name: "Alat Bermain Luar (Prosotan/Ayunan)", quantity: 2, status_baik: 1, status_rusak: 1 },
      { id: "inv-9", report_id: "report-2", item_name: "Alat Bermain Dalam (APE)", quantity: 15, status_baik: 13, status_rusak: 2 }
    ];
  } else if (sheetName === "Logs") {
    initialRecords = [
      { id: "log-1", user_id: "user-petugas", username: "petugas", action: "SUBMIT_REPORT", details: "Submit laporan bulanan Juni 2026 untuk TK ABA Gergunung", timestamp: "2026-06-30T16:45:00Z" },
      { id: "log-2", user_id: "user-super-admin", username: "admin", action: "APPROVE_REPORT", details: "Approve laporan bulanan Mei 2026 untuk TK ABA Gergunung", timestamp: "2026-06-02T08:30:00Z" }
    ];
  }

  for (var i = 0; i < initialRecords.length; i++) {
    createRecord(sheet, initialRecords[i]);
  }
}

// Get or auto-create sheet with headers and seed initial data
function getOrCreateSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var headers = getSheetHeaders(sheetName);
    sheet.appendRow(headers);
    seedInitialData(sheetName, sheet);
  }
  return sheet;
}

/**
 * Handle GET Requests
 * Parameter:
 * - action: list, get, test
 * - sheet: nama sheet (contoh: Schools, Teachers, Students, Reports)
 * - id: ID data spesifik (jika get)
 */
function doGet(e) {
  try {
    var params = e.parameter;
    var action = params.action;
    var sheetName = params.sheet;
    
    if (!action) {
      return jsonResponse({
        success: false,
        message: "Parameter 'action' diperlukan (list, get, test)."
      });
    }
    
    if (action === "test") {
      return jsonResponse({
        success: true,
        message: "Koneksi Google Apps Script API Berhasil!",
        timestamp: new Date().toISOString()
      });
    }
    
    if (!sheetName) {
      return jsonResponse({
        success: false,
        message: "Parameter 'sheet' diperlukan."
      });
    }
    
    var ss = getSpreadsheet();
    var sheet = getOrCreateSheet(ss, sheetName);
    
    if (action === "list") {
      var data = getSheetData(sheet);
      return jsonResponse({
        success: true,
        data: data
      });
    }
    
    if (action === "get") {
      var id = params.id;
      if (!id) {
        return jsonResponse({ success: false, message: "ID diperlukan untuk action=get" });
      }
      var record = getRecordById(sheet, id);
      if (record) {
        return jsonResponse({ success: true, data: record });
      } else {
        return jsonResponse({ success: false, message: "Data dengan ID " + id + " tidak ditemukan." });
      }
    }
    
    return jsonResponse({ success: false, message: "Action tidak dikenali." });
    
  } catch (err) {
    return jsonResponse({
      success: false,
      message: "Terjadi kesalahan server: " + err.toString()
    });
  }
}

/**
 * Handle POST Requests (Create, Update, Delete)
 * Parameter diletakkan di body raw JSON
 */
function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    var sheetName = postData.sheet;
    var data = postData.data;
    
    if (!action || !sheetName) {
      return jsonResponse({
        success: false,
        message: "Parameter 'action' dan 'sheet' diperlukan di dalam body JSON."
      });
    }
    
    var ss = getSpreadsheet();
    var sheet = getOrCreateSheet(ss, sheetName);
    
    if (action === "create") {
      var newRecord = createRecord(sheet, data);
      return jsonResponse({
        success: true,
        message: "Data berhasil disimpan di " + sheetName,
        data: newRecord
      });
    }
    
    if (action === "update") {
      var id = postData.id || data.id;
      if (!id) {
        return jsonResponse({ success: false, message: "ID diperlukan untuk update." });
      }
      var updatedRecord = updateRecord(sheet, id, data);
      if (updatedRecord) {
        return jsonResponse({
          success: true,
          message: "Data berhasil diperbarui di " + sheetName,
          data: updatedRecord
        });
      } else {
        return jsonResponse({ success: false, message: "Data dengan ID " + id + " tidak ditemukan." });
      }
    }
    
    if (action === "delete") {
      var id = postData.id || (postData.data && postData.data.id);
      if (!id) {
        return jsonResponse({ success: false, message: "ID diperlukan untuk delete." });
      }
      var deleted = deleteRecord(sheet, id);
      if (deleted) {
        return jsonResponse({
          success: true,
          message: "Data dengan ID " + id + " berhasil dihapus dari " + sheetName
        });
      } else {
        return jsonResponse({ success: false, message: "Data dengan ID " + id + " tidak ditemukan atau gagal dihapus." });
      }
    }
    
    return jsonResponse({ success: false, message: "Action '" + action + "' tidak dikenali." });
    
  } catch (err) {
    return jsonResponse({
      success: false,
      message: "Gagal memproses request: " + err.toString()
    });
  }
}

// Helper: Ambil seluruh data dari sheet ke bentuk Array of Objects
function getSheetData(sheet) {
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  
  if (lastRow < 2) return []; // Hanya ada header atau kosong
  
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var rows = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  
  var result = [];
  for (var r = 0; r < rows.length; r++) {
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var cellVal = rows[r][c];
      
      // Mengubah format Date jika ada
      if (cellVal instanceof Date) {
        cellVal = cellVal.toISOString();
      }
      
      // Parse JSON string ke object jika kolom diakhiri dengan _json atau _list
      if (headers[c].endsWith("_json") || headers[c].endsWith("_list")) {
        try {
          cellVal = JSON.parse(cellVal);
        } catch (e) {
          // Tetap gunakan string biasa jika gagal parse
        }
      }
      
      obj[headers[c]] = cellVal;
    }
    result.push(obj);
  }
  return result;
}

// Helper: Cari data berdasarkan ID
function getRecordById(sheet, id) {
  var data = getSheetData(sheet);
  for (var i = 0; i < data.length; i++) {
    if (String(data[i].id).trim() === String(id).trim()) {
      return data[i];
    }
  }
  return null;
}

// Helper: Tambahkan record baru
function createRecord(sheet, data) {
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  
  // Jika sheet kosong sama sekali, buat header berdasarkan key data
  if (lastRow === 0) {
    var headers = Object.keys(data);
    var hasId = false;
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).trim().toLowerCase() === "id") {
        hasId = true;
        break;
      }
    }
    if (!hasId) {
      headers.unshift("id");
    }
    sheet.appendRow(headers);
    lastRow = 1;
    lastColumn = headers.length;
  }
  
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  
  // Generate ID baru jika belum ada
  if (!data.id) {
    data.id = "id-" + Utilities.getUuid();
  }
  
  data.created_at = data.created_at || new Date().toISOString();
  data.updated_at = new Date().toISOString();
  
  var newRow = [];
  for (var i = 0; i < headers.length; i++) {
    var colName = headers[i];
    var val = data[colName];
    
    if (val === undefined || val === null) {
      val = "";
    } else if (typeof val === "object") {
      val = JSON.stringify(val);
    }
    
    newRow.push(val);
  }
  
  sheet.appendRow(newRow);
  return data;
}

// Helper: Update record
function updateRecord(sheet, id, data) {
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  
  if (lastRow < 2) return null;
  
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var idColIndex = -1;
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i]).trim().toLowerCase() === "id") {
      idColIndex = i + 1;
      break;
    }
  }
  
  if (idColIndex === 0 || idColIndex === -1) return null;
  
  var idValues = sheet.getRange(2, idColIndex, lastRow - 1, 1).getValues();
  var rowIndex = -1;
  
  for (var r = 0; r < idValues.length; r++) {
    if (String(idValues[r][0]).trim() === String(id).trim()) {
      rowIndex = r + 2; // +2 karena baris ke-1 header dan baris dimulai dari 1
      break;
    }
  }
  
  if (rowIndex === -1) return null;
  
  data.updated_at = new Date().toISOString();
  
  // Update cell-by-cell sesuai key data
  for (var k in data) {
    var colIndex = -1;
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).trim() === String(k).trim()) {
        colIndex = i + 1;
        break;
      }
    }
    if (colIndex > 0 && k !== "id" && k !== "created_at") {
      var cellVal = data[k];
      if (typeof cellVal === "object") {
        cellVal = JSON.stringify(cellVal);
      }
      sheet.getRange(rowIndex, colIndex).setValue(cellVal);
    }
  }
  
  return getRecordById(sheet, id);
}

// Helper: Hapus record
function deleteRecord(sheet, id) {
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  
  if (lastRow < 2) return false;
  
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var idColIndex = -1;
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i]).trim().toLowerCase() === "id") {
      idColIndex = i + 1;
      break;
    }
  }
  
  if (idColIndex === 0 || idColIndex === -1) return false;
  
  var idValues = sheet.getRange(2, idColIndex, lastRow - 1, 1).getValues();
  var rowIndex = -1;
  
  for (var r = 0; r < idValues.length; r++) {
    if (String(idValues[r][0]).trim() === String(id).trim()) {
      rowIndex = r + 2;
      break;
    }
  }
  
  if (rowIndex === -1) return false;
  
  sheet.deleteRow(rowIndex);
  return true;
}

// Utilitas Keamanan: Enkripsi SHA-256 untuk memverifikasi password
function hashPasswordSHA256(password) {
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  var hashStr = "";
  for (var i = 0; i < rawHash.length; i++) {
    var byteVal = rawHash[i];
    if (byteVal < 0) byteVal += 256;
    var byteString = byteVal.toString(16);
    if (byteString.length == 1) byteString = "0" + byteString;
    hashStr += byteString;
  }
  return hashStr;
}
