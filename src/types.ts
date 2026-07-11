/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'PETUGAS';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  school_id: string; // empty if Super Admin / Admin
  name: string;
  email: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface School {
  id: string;
  name: string;
  npsn: string;
  nsm: string;
  status: 'Negeri' | 'Swasta';
  jenjang: 'TK' | 'PAUD' | 'KB';
  alamat: string;
  kelurahan: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  kode_pos: string;
  telepon: string;
  email: string;
  website: string;
  kepala_sekolah: string;
  nip_kepala: string;
  akreditasi: 'A' | 'B' | 'C' | 'Belum Terakreditasi';
  status_tanah: 'Milik Sendiri' | 'Sewa' | 'Wakaf' | 'Pinjam Pakai';
  status_gedung: 'Milik Sendiri' | 'Sewa' | 'Wakaf' | 'Pinjam Pakai';
  luas_tanah: number; // m2
  luas_bangunan: number; // m2
  jumlah_ruang: number;
  jumlah_toilet: number;
  tahun_berdiri: string;
  tahun_operasional: string;
  latitude: string;
  longitude: string;
  foto_url: string;
  logo_url: string;
  status_aktif: 'Aktif' | 'Tidak Aktif';
  password_petugas?: string;
  username_petugas?: string;
  ranting_aisyiyah?: string;
  ketua_ranting?: string;
  ketua_pda?: string;
  ketua_pca?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Teacher {
  id: string;
  school_id: string;
  nama: string;
  nik: string;
  nip: string; // can be empty or '-'
  tempat_lahir: string;
  tanggal_lahir: string;
  jenis_kelamin: 'L' | 'P';
  alamat: string;
  no_hp: string;
  email: string;
  pendidikan: string; // e.g., S1 PAUD, D3
  jurusan: string;
  tmt: string; // Tanggal Mulai Tugas
  status_guru: string;
  jabatan: string; // Kepala Sekolah, Guru Kelas, Guru Pendamping, dll.
  golongan: string; // e.g., III/a, -
  honor: number; // Bulanan honor
  gty: boolean;
  gtt: boolean;
  pns: boolean;
  pppk: boolean;
  foto_url: string;
  tahun_pelajaran?: string;
  semester?: 'Ganjil' | 'Genap';
  created_at?: string;
  updated_at?: string;
}

export interface Student {
  id: string;
  school_id: string;
  nama: string;
  nik: string;
  nisn: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  jenis_kelamin: 'L' | 'P';
  nama_ayah: string;
  nama_ibu: string;
  alamat: string;
  rt: string;
  rw: string;
  kelurahan: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  agama: string;
  anak_ke: number;
  jumlah_saudara: number;
  status_aktif: 'Aktif' | 'Lulus' | 'Pindah' | 'Keluar';
  tahun_masuk: string;
  tahun_pelajaran: string;
  semester: 'Ganjil' | 'Genap';
  created_at?: string;
  updated_at?: string;
}

export type ReportStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected';

export interface Report {
  id: string;
  school_id: string;
  tahun_pelajaran: string; // e.g. 2025/2026
  semester: 'Ganjil' | 'Genap';
  bulan: string; // e.g. Januari, Februari
  hari_belajar: number;
  status_gedung: string;
  jumlah_ruangan: number;
  status: ReportStatus;
  notes: string;
  tahun?: number;
  jumlah_guru?: number;
  jumlah_siswa?: number;
  persentase_kehadiran_guru?: number;
  persentase_kehadiran_siswa?: number;
  created_at: string;
  updated_at: string;
}

export interface AttendanceTeacher {
  id: string;
  report_id: string;
  teacher_id: string;
  nama_guru: string;
  jenis_kelamin: 'L' | 'P';
  hadir: number;
  izin: number;
  sakit: number;
  alpha: number;
}

export interface AttendanceStudent {
  id: string;
  report_id: string;
  jenis_kelamin: 'L' | 'P';
  hadir: number;
  izin: number;
  sakit: number;
  alpha: number;
}

export interface Inventory {
  id: string;
  report_id: string;
  item_name: string;
  quantity: number;
  status_baik: number;
  status_rusak: number;
}

export interface District {
  id: string;
  name: string;
}

export interface Village {
  id: string;
  district_id: string;
  name: string;
}

export interface Log {
  id: string;
  user_id: string;
  username: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  user_name: string;
  user_role: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface SystemSettings {
  google_sheets_url: string;
  google_apps_script_url: string;
  backup_interval: string;
  allow_petugas_edit_after_submit: boolean;
  app_title?: string;
  app_subtitle?: string;
  super_admin_password?: string;
  admin_password?: string;
  petugas_password?: string;
}

export interface SKGuru {
  id: string;
  school_id: string;
  teacher_id: string;
  no_sk: string;
  tanggal_sk: string;
  jenis_sk: string;
  tmt_sk: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  notes: string;
  gaji_pokok?: number;
  tunjangan?: number;
  created_at: string;
  updated_at: string;
}
