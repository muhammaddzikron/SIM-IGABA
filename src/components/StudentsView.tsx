/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Student, School, User } from '../types';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  GraduationCap,
  Calendar,
  Layers,
  Heart,
  Home,
  UserCheck,
  X,
  Loader2,
  Download,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Eye,
  Printer,
  User as UserIcon,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { ExportEngine } from './ExportEngine';
import { ApiService } from '../lib/api';

interface StudentsViewProps {
  user: User;
  students: Student[];
  schools: School[];
  onCreate: (data: Partial<Student>) => Promise<void>;
  onUpdate: (id: string, data: Partial<Student>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export default function StudentsView({
  user,
  students,
  schools,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh
}: StudentsViewProps) {
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const isAdmin = user.role === 'ADMIN';
  const isPetugas = user.role === 'PETUGAS';

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState(isPetugas ? user.school_id : 'ALL');
  const [selectedGender, setSelectedGender] = useState('ALL');
  const [selectedTahunPelajaran, setSelectedTahunPelajaran] = useState('ALL');
  const [selectedSemester, setSelectedSemester] = useState('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedStudentForView, setSelectedStudentForView] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Excel Import States
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [targetSchoolId, setTargetSchoolId] = useState(isPetugas ? user.school_id : (schools[0]?.id || ''));
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    try {
      const data = await ExportEngine.parseStudentExcel(file);
      setParsedData(data);
      setImportResult(null);
    } catch (err: any) {
      setImportResult({ success: false, message: 'Gagal membaca file Excel: ' + err.message });
      setParsedData(null);
    }
  };

  const handleImportSubmit = async () => {
    if (!parsedData || parsedData.length === 0) return;
    setImportLoading(true);
    setImportResult(null);

    const studentsToImport = parsedData.map(s => ({
      ...s,
      school_id: targetSchoolId
    }));

    try {
      const res = await ApiService.importItems('students', studentsToImport);
      if (res.success) {
        setImportResult({
          success: true,
          message: `Berhasil mengimpor ${parsedData.length} data murid ke database!`
        });
        setImportFile(null);
        setParsedData(null);
        await onRefresh();
      } else {
        setImportResult({ success: false, message: res.message || 'Gagal mengimpor data.' });
      }
    } catch (err: any) {
      setImportResult({ success: false, message: err.message || 'Terjadi kesalahan jaringan.' });
    } finally {
      setImportLoading(false);
    }
  };

  // Form Fields
  const [formFields, setFormFields] = useState<Partial<Student>>({
    school_id: isPetugas ? user.school_id : '',
    nama: '',
    nik: '',
    nisn: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    jenis_kelamin: 'L',
    nama_ayah: '',
    nama_ibu: '',
    alamat: '',
    rt: '01',
    rw: '01',
    kelurahan: '',
    kecamatan: '',
    kabupaten: 'Klaten',
    provinsi: 'Jawa Tengah',
    agama: 'Islam',
    anak_ke: 1,
    jumlah_saudara: 1,
    status_aktif: 'Aktif',
    tahun_masuk: '2026',
    tahun_pelajaran: '2026/2027',
    semester: 'Ganjil'
  });

  const allowedStudents = isPetugas
    ? students.filter(s => s.school_id === user.school_id)
    : students;

  const filteredStudents = allowedStudents.filter(s => {
    const matchesSearch = s.nama.toLowerCase().includes(search.toLowerCase()) ||
      s.nik.includes(search) ||
      s.nisn.includes(search);
    const matchesSchool = selectedSchoolId === 'ALL' || s.school_id === selectedSchoolId;
    const matchesGender = selectedGender === 'ALL' || s.jenis_kelamin === selectedGender;
    const matchesTahunPelajaran = selectedTahunPelajaran === 'ALL' || s.tahun_pelajaran === selectedTahunPelajaran;
    const matchesSemester = selectedSemester === 'ALL' || s.semester === selectedSemester;

    return matchesSearch && matchesSchool && matchesGender && matchesTahunPelajaran && matchesSemester;
  });

  const getSchoolName = (schoolId: string) => {
    const school = schools.find(s => s.id === schoolId);
    return school ? school.name : 'Sekolah Lain';
  };

  const openCreateForm = () => {
    setEditingStudent(null);
    setFormFields({
      school_id: isPetugas ? user.school_id : (schools[0]?.id || ''),
      nama: '',
      nik: '',
      nisn: '',
      tempat_lahir: 'Klaten',
      tanggal_lahir: '2020-01-01',
      jenis_kelamin: 'L',
      nama_ayah: '',
      nama_ibu: '',
      alamat: '',
      rt: '01',
      rw: '01',
      kelurahan: 'Gergunung',
      kecamatan: 'Klaten Utara',
      kabupaten: 'Klaten',
      provinsi: 'Jawa Tengah',
      agama: 'Islam',
      anak_ke: 1,
      jumlah_saudara: 1,
      status_aktif: 'Aktif',
      tahun_masuk: '2026',
      tahun_pelajaran: '2026/2027',
      semester: 'Ganjil'
    });
    setIsFormOpen(true);
  };

  // Helper to normalize any date string format to YYYY-MM-DD for form binding
  const normalizeDateToYMD = (dateStr: string | undefined | null): string => {
    if (!dateStr) return '';
    const str = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    // DD/MM/YYYY or DD-MM-YYYY
    const match1 = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (match1) {
      return `${match1[3]}-${match1[2].padStart(2, '0')}-${match1[1].padStart(2, '0')}`;
    }

    // YYYY/MM/DD
    const match2 = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (match2) {
      return `${match2[1]}-${match2[2].padStart(2, '0')}-${match2[3].padStart(2, '0')}`;
    }

    // JS Date
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return '';
  };

  const openEditForm = (student: Student) => {
    setEditingStudent(student);
    setFormFields({
      ...student,
      tanggal_lahir: normalizeDateToYMD(student.tanggal_lahir)
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingStudent) {
        await onUpdate(editingStudent.id, formFields);
      } else {
        await onCreate(formFields);
      }
      setIsFormOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmId) {
      setLoading(true);
      try {
        await onDelete(deleteConfirmId);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setDeleteConfirmId(null);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search and Filters */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              id="student-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari murid..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans"
            />
          </div>

          {!isPetugas ? (
            <select
              id="school-filter-student"
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-600 focus:outline-none font-sans"
            >
              <option value="ALL">Semua TK / PAUD</option>
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          ) : (
            <div className="border border-slate-100 bg-brand-50/50 rounded-xl px-3 py-2 text-xs text-brand-800 font-sans font-semibold flex items-center">
              Sekolah: {getSchoolName(user.school_id)}
            </div>
          )}

          <select
            id="gender-filter-student"
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value)}
            className="border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-600 focus:outline-none font-sans"
          >
            <option value="ALL">Semua Gender</option>
            <option value="L">Laki-laki (L)</option>
            <option value="P">Perempuan (P)</option>
          </select>

          <select
            id="tapel-filter-student"
            value={selectedTahunPelajaran}
            onChange={(e) => setSelectedTahunPelajaran(e.target.value)}
            className="border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-600 focus:outline-none font-sans"
          >
            <option value="ALL">Semua Tahun Pelajaran</option>
            <option value="2024/2025">T.P. 2024/2025</option>
            <option value="2025/2026">T.P. 2025/2026</option>
            <option value="2026/2027">T.P. 2026/2027</option>
          </select>

          <select
            id="semester-filter-student"
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-600 focus:outline-none font-sans"
          >
            <option value="ALL">Semua Semester</option>
            <option value="Ganjil">Semester Ganjil</option>
            <option value="Genap">Semester Genap</option>
          </select>
        </div>
      </div>

      {/* Grid listing */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <span className="text-xs font-bold text-slate-500 font-sans">
          Ditemukan {filteredStudents.length} Siswa Aktif
        </span>

        {!isAdmin && (
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {/* Download Template Master */}
            <button
              type="button"
              id="download-student-template-btn"
              onClick={() => ExportEngine.downloadStudentTemplate()}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-2 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer font-sans"
              title="Unduh master template Excel untuk pengisian data murid"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Master Template</span>
            </button>

            {/* Import Excel */}
            <button
              type="button"
              id="import-student-excel-btn"
              onClick={() => {
                setImportFile(null);
                setParsedData(null);
                setImportResult(null);
                setIsImportOpen(true);
              }}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 py-2 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer font-sans"
              title="Unggah file Excel data murid yang sudah diisi"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Unggah Excel</span>
            </button>

            {/* Tambah Murid Manual */}
            <button
              type="button"
              id="add-student-btn"
              onClick={openCreateForm}
              className="bg-brand-600 hover:bg-brand-700 text-white py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-brand-600/10 transition-all cursor-pointer font-sans"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Murid Baru</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map((student) => (
          <div
            key={student.id}
            id={`student-card-${student.id}`}
            className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition-shadow animate-fade-in"
          >
            <div className="space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-700 border border-brand-100 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`inline-flex items-center text-[8px] font-bold font-sans uppercase px-2 py-0.5 rounded-full mb-1 ${
                    student.jenis_kelamin === 'L' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-pink-50 text-pink-700 border border-pink-100'
                  }`}>
                    {student.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                  </span>
                  <h3 className="font-bold text-slate-800 text-xs leading-tight font-sans truncate">
                    {student.nama}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-sans truncate">
                    {getSchoolName(student.school_id)}
                  </p>
                </div>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100 text-[11px] text-slate-500 font-sans">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold leading-none mb-1">Orang Tua (Ayah / Ibu)</span>
                  <span className="font-semibold text-slate-700 block truncate">{student.nama_ayah || '-'} / {student.nama_ibu || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold leading-none mb-1">Tahun Masuk</span>
                  <span className="font-semibold text-slate-700 block font-mono">{student.tahun_masuk}</span>
                </div>
                <div className="mt-1">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold leading-none mb-1">NISN</span>
                  <span className="font-semibold text-slate-700 block font-mono">{student.nisn || '-'}</span>
                </div>
                <div className="mt-1">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold leading-none mb-1">Status</span>
                  <span className="inline-flex text-[9px] font-bold text-brand-700 font-sans">{student.status_aktif}</span>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1.5 text-[11px] text-slate-500 font-sans border-t border-slate-50 pt-3">
                <div className="flex items-center gap-2">
                  <Home className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="line-clamp-1">{student.alamat}, RT {student.rt} RW {student.rw}, {student.kelurahan}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Anak ke {student.anak_ke} dari {student.jumlah_saudara + 1} bersaudara</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-slate-100 pt-3.5 mt-4 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-mono">
                NIK: {student.nik}
              </span>

              <div className="flex items-center gap-1">
                <button
                  id={`view-student-${student.id}`}
                  onClick={() => setSelectedStudentForView(student)}
                  className="p-1.5 bg-slate-50 hover:bg-brand-50 text-slate-500 hover:text-brand-700 rounded-lg border border-slate-200 hover:border-brand-100 transition-colors cursor-pointer"
                  title="Lihat Profil Siswa"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                {(isSuperAdmin || isAdmin || (isPetugas && student.school_id === user.school_id)) && (
                  <button
                    id={`edit-student-${student.id}`}
                    onClick={() => openEditForm(student)}
                    className="p-1.5 bg-slate-50 hover:bg-brand-50 text-slate-500 hover:text-brand-700 rounded-lg border border-slate-200 hover:border-brand-100 transition-colors cursor-pointer"
                    title="Edit Profil Siswa"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {(isSuperAdmin || isAdmin || (isPetugas && student.school_id === user.school_id)) && (
                  <button
                    id={`delete-student-${student.id}`}
                    onClick={() => handleDelete(student.id)}
                    className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg border border-slate-200 hover:border-rose-100 transition-colors cursor-pointer"
                    title="Hapus Murid"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filteredStudents.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs font-sans">
            Data murid tidak ditemukan.
          </div>
        )}
      </div>

      {/* CREATE / EDIT SISWA MODAL */}
      {isFormOpen && createPortal(
        <div id="student-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden">
          <div className="bg-white w-full max-h-[85vh] sm:max-h-[90vh] rounded-2xl sm:rounded-3xl sm:max-w-2xl shadow-2xl animate-fade-in border border-slate-100 flex flex-col relative overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <h3 className="font-bold text-slate-800 text-sm font-sans flex items-center gap-2 text-brand-700">
                <GraduationCap className="w-5 h-5" />
                {editingStudent ? 'Edit Biodata Murid' : 'Tambah Murid Baru'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Fields Container (Scrolls cleanly on mobile & desktop if content overflows) */}
              <div className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto no-scrollbar font-sans text-xs text-slate-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Sekolah Terdaftar */}
                  {!isPetugas ? (
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Sekolah Terdaftar</label>
                      <select
                        required
                        value={formFields.school_id || ''}
                        onChange={(e) => setFormFields({ ...formFields, school_id: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      >
                        <option value="">-- Pilih Sekolah --</option>
                        {schools.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Sekolah Terdaftar</label>
                      <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 font-semibold">
                        {getSchoolName(user.school_id)}
                      </div>
                    </div>
                  )}

                  {/* Nama Lengkap */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nama Lengkap Murid</label>
                    <input
                      type="text"
                      required
                      value={formFields.nama || ''}
                      onChange={(e) => setFormFields({ ...formFields, nama: e.target.value })}
                      placeholder="Contoh: Muhammad Al-Fatih"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>

                  {/* NIK Murid */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">NIK Murid</label>
                    <input
                      type="text"
                      required
                      value={formFields.nik || ''}
                      onChange={(e) => setFormFields({ ...formFields, nik: e.target.value })}
                      maxLength={16}
                      placeholder="Masukkan 16 digit NIK"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>

                  {/* NISN */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">NISN (10 Digit)</label>
                    <input
                      type="text"
                      required
                      value={formFields.nisn || ''}
                      onChange={(e) => setFormFields({ ...formFields, nisn: e.target.value })}
                      maxLength={10}
                      placeholder="Masukkan 10 digit NISN"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>

                  {/* Jenis Kelamin */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Jenis Kelamin</label>
                    <select
                      value={formFields.jenis_kelamin || 'L'}
                      onChange={(e) => setFormFields({ ...formFields, jenis_kelamin: e.target.value as any })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="L">Laki-laki (L)</option>
                      <option value="P">Perempuan (P)</option>
                    </select>
                  </div>

                  {/* Agama */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Agama</label>
                    <input
                      type="text"
                      required
                      value={formFields.agama || 'Islam'}
                      onChange={(e) => setFormFields({ ...formFields, agama: e.target.value })}
                      placeholder="Contoh: Islam"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>

                  {/* Tempat Lahir */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tempat Lahir</label>
                    <input
                      type="text"
                      required
                      value={formFields.tempat_lahir || ''}
                      onChange={(e) => setFormFields({ ...formFields, tempat_lahir: e.target.value })}
                      placeholder="Contoh: Klaten"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>

                  {/* Tanggal Lahir */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tanggal Lahir</label>
                    <input
                      type="date"
                      required
                      value={formFields.tanggal_lahir || ''}
                      onChange={(e) => setFormFields({ ...formFields, tanggal_lahir: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>

                  {/* Nama Ayah */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nama Ayah Kandung</label>
                    <input
                      type="text"
                      required
                      value={formFields.nama_ayah || ''}
                      onChange={(e) => setFormFields({ ...formFields, nama_ayah: e.target.value })}
                      placeholder="Nama Lengkap Ayah"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>

                  {/* Nama Ibu */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nama Ibu Kandung</label>
                    <input
                      type="text"
                      required
                      value={formFields.nama_ibu || ''}
                      onChange={(e) => setFormFields({ ...formFields, nama_ibu: e.target.value })}
                      placeholder="Nama Lengkap Ibu"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>

                  {/* Anak Ke */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Anak Ke</label>
                    <input
                      type="number"
                      required
                      value={formFields.anak_ke || 1}
                      onChange={(e) => setFormFields({ ...formFields, anak_ke: Number(e.target.value) })}
                      min={1}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>

                  {/* Jumlah Sdr */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Jumlah Saudara</label>
                    <input
                      type="number"
                      required
                      value={formFields.jumlah_saudara || 0}
                      onChange={(e) => setFormFields({ ...formFields, jumlah_saudara: Number(e.target.value) })}
                      min={0}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>

                  {/* Alamat */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Alamat Domisili Siswa</label>
                    <input
                      type="text"
                      required
                      value={formFields.alamat || ''}
                      onChange={(e) => setFormFields({ ...formFields, alamat: e.target.value })}
                      placeholder="Nama jalan, perumahan, nomor rumah..."
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>

                  {/* RT, RW, Kelurahan */}
                  <div className="grid grid-cols-4 gap-2 sm:col-span-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">RT</label>
                      <input
                        type="text"
                        required
                        value={formFields.rt || ''}
                        onChange={(e) => setFormFields({ ...formFields, rt: e.target.value })}
                        placeholder="01"
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">RW</label>
                      <input
                        type="text"
                        required
                        value={formFields.rw || ''}
                        onChange={(e) => setFormFields({ ...formFields, rw: e.target.value })}
                        placeholder="01"
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Kelurahan</label>
                      <input
                        type="text"
                        required
                        value={formFields.kelurahan || ''}
                        onChange={(e) => setFormFields({ ...formFields, kelurahan: e.target.value })}
                        placeholder="Contoh: Gergunung"
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                  </div>

                  {/* Kecamatan & Status Keaktifan */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Kecamatan</label>
                    <input
                      type="text"
                      required
                      value={formFields.kecamatan || ''}
                      onChange={(e) => setFormFields({ ...formFields, kecamatan: e.target.value })}
                      placeholder="Contoh: Klaten Utara"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status Keaktifan</label>
                    <select
                      value={formFields.status_aktif || 'Aktif'}
                      onChange={(e) => setFormFields({ ...formFields, status_aktif: e.target.value as any })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Lulus">Lulus</option>
                      <option value="Pindah">Pindah Sekolah</option>
                      <option value="Keluar">Keluar / DO</option>
                    </select>
                  </div>

                  {/* Academic Info */}
                  <div className="border-t border-slate-100 pt-4 sm:col-span-2">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">
                      Informasi Akademik Berbasis Tahun Pelajaran
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tahun Masuk</label>
                        <input
                          type="text"
                          required
                          value={formFields.tahun_masuk || ''}
                          onChange={(e) => setFormFields({ ...formFields, tahun_masuk: e.target.value })}
                          placeholder="Contoh: 2024"
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tahun Pelajaran Aktif</label>
                        <select
                          value={formFields.tahun_pelajaran || '2025/2026'}
                          onChange={(e) => setFormFields({ ...formFields, tahun_pelajaran: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 font-sans focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                          <option value="2024/2025">2024/2025</option>
                          <option value="2025/2026">2025/2026</option>
                          <option value="2026/2027">2026/2027</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Semester Aktif</label>
                        <select
                          value={formFields.semester || 'Ganjil'}
                          onChange={(e) => setFormFields({ ...formFields, semester: e.target.value as any })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 font-sans focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                          <option value="Ganjil">Ganjil</option>
                          <option value="Genap">Genap</option>
                        </select>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Modal Actions */}
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Data Siswa
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* CUSTOM CONFIRM DELETE MODAL */}
      {deleteConfirmId && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-bold text-slate-800 text-sm font-sans">Hapus Data Murid?</h4>
              <p className="text-xs text-slate-500 font-sans leading-relaxed">
                Tindakan ini tidak dapat dibatalkan. Seluruh data biodata murid ini akan dihapus secara permanen.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold font-sans cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={loading}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white rounded-xl text-xs font-semibold font-sans flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* EXCEL IMPORT MODAL */}
      {isImportOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-sm font-sans">
                  Import Massal Data Murid dari Excel
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImportOpen(false);
                  setImportFile(null);
                  setParsedData(null);
                  setImportResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Target School Selector (Only if Super Admin / Admin) */}
              {!isPetugas && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide font-sans">
                    Pilih Sekolah Tujuan Import*
                  </label>
                  <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                    Seluruh data murid dalam file Excel ini akan didaftarkan ke sekolah yang Anda pilih di bawah ini.
                  </p>
                  <select
                    value={targetSchoolId}
                    onChange={(e) => setTargetSchoolId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 font-sans focus:outline-none"
                  >
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status alerts */}
              {importResult && (
                <div className={`p-4 rounded-xl flex items-start gap-2.5 ${importResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-100 animate-fade-in' : 'bg-rose-50 text-rose-800 border border-rose-100 animate-fade-in'}`}>
                  {importResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs">
                    <p className="font-semibold font-sans">{importResult.success ? 'Berhasil!' : 'Gagal!'}</p>
                    <p className="font-sans leading-relaxed mt-0.5">{importResult.message}</p>
                  </div>
                </div>
              )}

              {/* Upload Drop Zone */}
              {!importResult?.success && (
                <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/10 rounded-2xl p-6 transition-all text-center relative group">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-2 pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 flex items-center justify-center mx-auto transition-colors">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-700 font-sans">
                        {importFile ? importFile.name : 'Pilih atau Seret File Excel ke Sini'}
                      </p>
                      <p className="text-[11px] text-slate-400 font-sans">
                        Mendukung file ekstensi .xlsx, .xls
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview table of parsed data */}
              {parsedData && parsedData.length > 0 && !importResult?.success && (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide font-sans">
                      Pratinjau Data Excel ({parsedData.length} Murid Ditemukan)
                    </h4>
                    <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-semibold font-sans">
                      Harap verifikasi sebelum disimpan
                    </span>
                  </div>
                  <div className="border border-slate-100 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase font-sans">
                          <th className="px-3 py-2 border-b border-slate-100">Nama</th>
                          <th className="px-3 py-2 border-b border-slate-100">NIK</th>
                          <th className="px-3 py-2 border-b border-slate-100">NISN</th>
                          <th className="px-3 py-2 border-b border-slate-100">JK</th>
                          <th className="px-3 py-2 border-b border-slate-100">Nama Ibu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px] text-slate-600">
                        {parsedData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-3 py-1.5 font-medium text-slate-800">{row.nama}</td>
                            <td className="px-3 py-1.5 font-mono">{row.nik}</td>
                            <td className="px-3 py-1.5 font-mono">{row.nisn}</td>
                            <td className="px-3 py-1.5">{row.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                            <td className="px-3 py-1.5">{row.nama_ibu}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50 rounded-b-3xl shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsImportOpen(false);
                  setImportFile(null);
                  setParsedData(null);
                  setImportResult(null);
                }}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold font-sans cursor-pointer transition-colors"
              >
                Tutup
              </button>
              {parsedData && parsedData.length > 0 && !importResult?.success && (
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  disabled={importLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-semibold font-sans flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {importLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Simpan {parsedData.length} Data Murid</span>
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DETAILED STUDENT PROFILE VIEW & PRINT/EXPORT MODAL */}
      {selectedStudentForView && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-100 relative flex flex-col overflow-hidden max-h-[85vh] sm:max-h-[90vh]">
            
            {/* Modal Controls Bar */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 sticky top-0 z-10 shrink-0 no-print">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-800 text-sm font-sans">Detail Profil Lengkap Murid</h3>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Print button */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer font-sans border border-brand-100"
                  title="Cetak Profil / Save as PDF melalui browser"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Profil</span>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setSelectedStudentForView(null)}
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Print Styling Injection */}
            <style dangerouslySetInnerHTML={{__html: `
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #student-print-profile-content, #student-print-profile-content * {
                  visibility: visible !important;
                }
                #student-print-profile-content {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 15mm !important;
                  background: white !important;
                  color: black !important;
                  box-shadow: none !important;
                  border: none !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}} />

            {/* Printable & Scrollable Content Area */}
            <div id="student-print-profile-content" className="p-6 sm:p-8 space-y-6 bg-white overflow-y-auto flex-1 no-scrollbar text-xs">
              
              {/* Formal Header for Printing */}
              <div className="flex items-center gap-4 border-b-2 border-slate-800 pb-4">
                <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center text-white font-extrabold text-xl shadow-md shrink-0">
                  PD
                </div>
                <div className="space-y-0.5">
                  <h2 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase font-sans">
                    SISTEM INFORMASI MANAJEMEN PENDIDIKAN
                  </h2>
                  <h1 className="text-sm font-black tracking-tight text-slate-800 uppercase font-sans">
                    DATA BIO-PROFIL PESERTA DIDIK / MURID
                  </h1>
                  <p className="text-[10px] text-slate-500 font-sans">
                    {getSchoolName(selectedStudentForView.school_id)}
                  </p>
                </div>
              </div>

              {/* Main Profile Showcase */}
              <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                {/* Icon / Avatar */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                  <GraduationCap className="w-10 h-10 text-brand-500" />
                </div>

                <div className="min-w-0 flex-1 text-center sm:text-left space-y-2">
                  <div>
                    <span className={`inline-flex items-center text-[10px] font-bold uppercase px-3 py-1 rounded-full mb-1 border ${
                      selectedStudentForView.jenis_kelamin === 'L' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-pink-50 text-pink-700 border-pink-200'
                    }`}>
                      {selectedStudentForView.jenis_kelamin === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}
                    </span>
                    <h2 className="text-lg font-black text-slate-800 font-sans">
                      {selectedStudentForView.nama}
                    </h2>
                    <p className="text-xs text-slate-500 font-sans">
                      {getSchoolName(selectedStudentForView.school_id)}
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-center sm:justify-start gap-3 text-[11px] text-slate-600 font-sans">
                    <span className="bg-slate-100 border border-slate-200/50 px-2.5 py-1 rounded-lg">
                      NISN: <strong className="font-mono text-slate-800">{selectedStudentForView.nisn || '-'}</strong>
                    </span>
                    <span className="bg-slate-100 border border-slate-200/50 px-2.5 py-1 rounded-lg">
                      NIK: <strong className="font-mono text-slate-800">{selectedStudentForView.nik || '-'}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Detailed Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
                
                {/* 1. DATA IDENTITAS DIRI */}
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center gap-1.5 uppercase tracking-wide text-[10px] text-brand-700">
                    <UserIcon className="w-4 h-4" />
                    <span>Identitas Pribadi</span>
                  </h4>
                  <div className="space-y-2.5 text-[11px]">
                    <div className="grid grid-cols-3 py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Nama Lengkap</span>
                      <span className="col-span-2 font-semibold text-slate-800">{selectedStudentForView.nama}</span>
                    </div>
                    <div className="grid grid-cols-3 py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">NIK</span>
                      <span className="col-span-2 font-mono font-semibold text-slate-800">{selectedStudentForView.nik}</span>
                    </div>
                    <div className="grid grid-cols-3 py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">NISN</span>
                      <span className="col-span-2 font-mono font-semibold text-slate-800">{selectedStudentForView.nisn || '-'}</span>
                    </div>
                    <div className="grid grid-cols-3 py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Tempat, Tgl Lahir</span>
                      <span className="col-span-2 font-semibold text-slate-800">
                        {selectedStudentForView.tempat_lahir}, {selectedStudentForView.tanggal_lahir}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Jenis Kelamin</span>
                      <span className="col-span-2 font-semibold text-slate-800">
                        {selectedStudentForView.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Agama</span>
                      <span className="col-span-2 font-semibold text-slate-800">{selectedStudentForView.agama || 'Islam'}</span>
                    </div>
                  </div>
                </div>

                {/* 2. DATA ORANG TUA / KELUARGA */}
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center gap-1.5 uppercase tracking-wide text-[10px] text-brand-700">
                    <UserCheck className="w-4 h-4" />
                    <span>Keluarga / Wali</span>
                  </h4>
                  <div className="space-y-2.5 text-[11px]">
                    <div className="grid grid-cols-3 py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Nama Ayah</span>
                      <span className="col-span-2 font-semibold text-slate-800">{selectedStudentForView.nama_ayah || '-'}</span>
                    </div>
                    <div className="grid grid-cols-3 py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Nama Ibu</span>
                      <span className="col-span-2 font-semibold text-slate-800">{selectedStudentForView.nama_ibu || '-'}</span>
                    </div>
                    <div className="grid grid-cols-3 py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Anak Ke</span>
                      <span className="col-span-2 font-semibold text-slate-800">{selectedStudentForView.anak_ke || 1}</span>
                    </div>
                    <div className="grid grid-cols-3 py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Jumlah Saudara</span>
                      <span className="col-span-2 font-semibold text-slate-800">{selectedStudentForView.jumlah_saudara || 0}</span>
                    </div>
                  </div>
                </div>

                {/* 3. ALAMAT TEMPAT TINGGAL */}
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center gap-1.5 uppercase tracking-wide text-[10px] text-brand-700">
                    <Home className="w-4 h-4" />
                    <span>Alamat Domisili</span>
                  </h4>
                  <div className="space-y-2.5 text-[11px]">
                    <div className="grid grid-cols-3 py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Alamat</span>
                      <span className="col-span-2 font-semibold text-slate-800">{selectedStudentForView.alamat || '-'}</span>
                    </div>
                    <div className="grid grid-cols-3 py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">RT / RW</span>
                      <span className="col-span-2 font-semibold text-slate-800">RT {selectedStudentForView.rt || '01'} / RW {selectedStudentForView.rw || '01'}</span>
                    </div>
                    <div className="grid grid-cols-3 py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Kelurahan</span>
                      <span className="col-span-2 font-semibold text-slate-800">{selectedStudentForView.kelurahan || '-'}</span>
                    </div>
                    <div className="grid grid-cols-3 py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Kecamatan</span>
                      <span className="col-span-2 font-semibold text-slate-800">{selectedStudentForView.kecamatan || '-'}</span>
                    </div>
                    <div className="grid grid-cols-3 py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Kabupaten</span>
                      <span className="col-span-2 font-semibold text-slate-800">{selectedStudentForView.kabupaten || 'Klaten'}</span>
                    </div>
                    <div className="grid grid-cols-3 py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Provinsi</span>
                      <span className="col-span-2 font-semibold text-slate-800">{selectedStudentForView.provinsi || 'Jawa Tengah'}</span>
                    </div>
                  </div>
                </div>

                {/* 4. STATUS AKADEMIK / SEKOLAH */}
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center gap-1.5 uppercase tracking-wide text-[10px] text-brand-700">
                    <Layers className="w-4 h-4" />
                    <span>Akademik / Sekolah</span>
                  </h4>
                  <div className="space-y-2.5 text-[11px]">
                    <div className="grid grid-cols-3 py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Status Aktif</span>
                      <span className="col-span-2 font-bold text-emerald-700">{selectedStudentForView.status_aktif || 'Aktif'}</span>
                    </div>
                    <div className="grid grid-cols-3 py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Tahun Masuk</span>
                      <span className="col-span-2 font-mono font-semibold text-slate-800">{selectedStudentForView.tahun_masuk || '-'}</span>
                    </div>
                    <div className="grid grid-cols-3 py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Thn Pelajaran</span>
                      <span className="col-span-2 font-mono font-semibold text-slate-800">{selectedStudentForView.tahun_pelajaran || '-'}</span>
                    </div>
                    <div className="grid grid-cols-3 py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Semester</span>
                      <span className="col-span-2 font-semibold text-slate-800">{selectedStudentForView.semester || '-'}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Tanda Tangan Ketetapan */}
              <div className="pt-12 grid grid-cols-2 gap-4 text-center text-[11px] font-sans">
                <div></div>
                <div className="space-y-16">
                  <div>
                    <p className="text-slate-500">Klaten, {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                    <p className="font-bold text-slate-800">Kepala Sekolah</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 underline">......................................................</p>
                    <p className="text-slate-400 text-[10px]">NIP. ..........................................</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Actions Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedStudentForView(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold font-sans cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
