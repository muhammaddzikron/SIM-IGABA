/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Teacher, School, User } from '../types';
import { getDirectDriveImageUrl } from '../lib/api';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  X,
  PlusCircle,
  Briefcase,
  Layers,
  GraduationCap,
  Calendar,
  Loader2,
  Download,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Eye,
  Printer
} from 'lucide-react';
import { ExportEngine } from './ExportEngine';
import { ApiService } from '../lib/api';

interface TeachersViewProps {
  user: User;
  teachers: Teacher[];
  schools: School[];
  onCreate: (data: Partial<Teacher>) => Promise<void>;
  onUpdate: (id: string, data: Partial<Teacher>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export default function TeachersView({
  user,
  teachers,
  schools,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh
}: TeachersViewProps) {
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const isAdmin = user.role === 'ADMIN';
  const isPetugas = user.role === 'PETUGAS';

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState(isPetugas ? user.school_id : 'ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedTahunPelajaran, setSelectedTahunPelajaran] = useState('ALL');
  const [selectedSemester, setSelectedSemester] = useState('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [selectedTeacherForView, setSelectedTeacherForView] = useState<Teacher | null>(null);
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
      const data = await ExportEngine.parseTeacherExcel(file);
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

    const teachersToImport = parsedData.map(t => ({
      ...t,
      school_id: targetSchoolId
    }));

    try {
      const res = await ApiService.importItems('teachers', teachersToImport);
      if (res.success) {
        setImportResult({
          success: true,
          message: `Berhasil mengimpor ${parsedData.length} data guru ke database!`
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
  const [formFields, setFormFields] = useState<Partial<Teacher>>({
    school_id: isPetugas ? user.school_id : '',
    nama: '',
    nik: '',
    nip: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    jenis_kelamin: 'P',
    alamat: '',
    no_hp: '',
    email: '',
    pendidikan: 'S1',
    jurusan: 'PG-PAUD',
    tmt: '',
    status_guru: 'Swasta - GTY',
    jabatan: 'Guru Kelas',
    golongan: '-',
    honor: 1500000,
    gty: true,
    gtt: false,
    pns: false,
    pppk: false,
    foto_url: '',
    tahun_pelajaran: '2026/2027',
    semester: 'Ganjil'
  });

  // Allowed teachers listing based on Petugas restriction
  const allowedTeachers = isPetugas
    ? teachers.filter(t => t.school_id === user.school_id)
    : teachers;

  // Filter and Search logic
  const filteredTeachers = allowedTeachers.filter(t => {
    const matchesSearch = t.nama.toLowerCase().includes(search.toLowerCase()) ||
      t.nik.includes(search);
    const matchesSchool = selectedSchoolId === 'ALL' || t.school_id === selectedSchoolId;
    const matchesStatus = selectedStatus === 'ALL' || t.status_guru === selectedStatus;
    const matchesTahunPelajaran = selectedTahunPelajaran === 'ALL' || t.tahun_pelajaran === selectedTahunPelajaran;
    const matchesSemester = selectedSemester === 'ALL' || t.semester === selectedSemester;
    
    return matchesSearch && matchesSchool && matchesStatus && matchesTahunPelajaran && matchesSemester;
  });

  const getSchoolName = (schoolId: string) => {
    const school = schools.find(s => s.id === schoolId);
    return school ? school.name : 'Sekolah Lain';
  };

  const openCreateForm = () => {
    setEditingTeacher(null);
    setFormFields({
      school_id: isPetugas ? user.school_id : (schools[0]?.id || ''),
      nama: '',
      nik: '',
      nip: '-',
      tempat_lahir: 'Klaten',
      tanggal_lahir: '1995-01-01',
      jenis_kelamin: 'P',
      alamat: '',
      no_hp: '',
      email: '',
      pendidikan: 'S1',
      jurusan: 'PG-PAUD',
      tmt: '2020-07-01',
      status_guru: 'Swasta - GTY',
      jabatan: 'Guru Kelas',
      golongan: '-',
      honor: 1800000,
      gty: true,
      gtt: false,
      pns: false,
      pppk: false,
      foto_url: '',
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

  const openEditForm = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormFields({
      ...teacher,
      tanggal_lahir: normalizeDateToYMD(teacher.tanggal_lahir),
      tmt: normalizeDateToYMD(teacher.tmt)
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Auto populate booleans based on status_guru select
    const status = formFields.status_guru;
    const computedFields = {
      ...formFields,
      gty: status === 'Swasta - GTY',
      gtt: status === 'Swasta - GTT WB' || status === 'Swasta GTT PNS' || status === 'Guru Bantu',
      pns: status?.toLowerCase().includes('pns') || status === 'Negeri - Depag' || status === 'Negeri - Instansi Lain',
      pppk: status === 'Negeri - PPPK',
      foto_url: getDirectDriveImageUrl(formFields.foto_url)
    };

    try {
      if (editingTeacher) {
        await onUpdate(editingTeacher.id, computedFields);
      } else {
        await onCreate(computedFields);
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
      {/* Filtering Sub-Panel */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              id="teacher-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari guru..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans"
            />
          </div>

          {/* School filter only for Super Admin and Admin */}
          {!isPetugas ? (
            <select
              id="school-filter"
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
            id="status-filter"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-600 focus:outline-none font-sans"
          >
            <option value="ALL">Semua Kepegawaian</option>
            <option value="Negeri - PPPK">Negeri - PPPK</option>
            <option value="Negeri - Depag">Negeri - Depag</option>
            <option value="Negeri - Instansi Lain">Negeri - Instansi Lain</option>
            <option value="Guru Bantu">Guru Bantu</option>
            <option value="Swasta - GTY">Swasta - GTY</option>
            <option value="Swasta - GTT WB">Swasta - GTT WB</option>
            <option value="Swasta GTT PNS">Swasta GTT PNS</option>
          </select>

          <select
            id="tapel-filter-teacher"
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
            id="semester-filter-teacher"
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
          Ditemukan {filteredTeachers.length} Guru
        </span>

        {!isAdmin && (
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {/* Download Template Master */}
            <button
              type="button"
              id="download-teacher-template-btn"
              onClick={() => ExportEngine.downloadTeacherTemplate()}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-2 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer font-sans"
              title="Unduh master template Excel untuk pengisian data guru"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Master Template</span>
            </button>

            {/* Import Excel */}
            <button
              type="button"
              id="import-teacher-excel-btn"
              onClick={() => {
                setImportFile(null);
                setParsedData(null);
                setImportResult(null);
                setIsImportOpen(true);
              }}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 py-2 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer font-sans"
              title="Unggah file Excel data guru yang sudah diisi"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Unggah Excel</span>
            </button>

            {/* Tambah Guru Manual */}
            <button
              type="button"
              id="add-teacher-btn"
              onClick={openCreateForm}
              className="bg-brand-600 hover:bg-brand-700 text-white py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-brand-600/10 transition-all cursor-pointer font-sans"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Guru Baru</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeachers.map((teacher) => (
          <div
            key={teacher.id}
            id={`teacher-card-${teacher.id}`}
            className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative animate-fade-in group/card"
          >
            {/* Upper details (clickable to view profile) */}
            <div 
              onClick={() => setSelectedTeacherForView(teacher)}
              className="space-y-4 cursor-pointer"
              title="Klik untuk melihat profil lengkap"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-700 border border-brand-100 flex items-center justify-center shrink-0 overflow-hidden group-hover/card:scale-105 transition-transform">
                  {teacher.foto_url ? (
                    <img src={getDirectDriveImageUrl(teacher.foto_url)} alt={teacher.nama} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-6 h-6" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center text-[9px] font-bold font-sans uppercase bg-brand-50 border border-brand-100 text-brand-700 px-2.5 py-0.5 rounded-full mb-1">
                    {teacher.status_guru}
                  </span>
                  <h3 className="font-bold text-slate-800 text-sm leading-tight font-sans truncate group-hover/card:text-brand-700 transition-colors">
                    {teacher.nama}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1 font-sans font-medium truncate">
                    {getSchoolName(teacher.school_id)}
                  </p>
                </div>
              </div>

              {/* Specifications */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-100 text-xs text-slate-500 font-sans">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Jabatan</span>
                  </div>
                  <span className="font-semibold text-slate-700 block text-[11px] truncate">{teacher.jabatan}</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Pendidikan</span>
                  </div>
                  <span className="font-semibold text-slate-700 block text-[11px] truncate">{teacher.pendidikan} {teacher.jurusan}</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Golongan</span>
                  </div>
                  <span className="font-semibold text-slate-700 block text-[11px]">{teacher.golongan || '-'}</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>TMT</span>
                  </div>
                  <span className="font-semibold text-slate-700 block text-[11px] font-mono">{teacher.tmt || '-'}</span>
                </div>
              </div>

              {/* Biodata list */}
              <div className="space-y-1.5 text-[11px] text-slate-500 font-sans border-t border-slate-50 pt-3">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{teacher.no_hp || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{teacher.email || '-'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{teacher.alamat}</span>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="border-t border-slate-100 pt-3.5 mt-4 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-mono">
                NIK: {teacher.nik}
              </span>

              <div className="flex items-center gap-1">
                <button
                  id={`view-teacher-${teacher.id}`}
                  onClick={() => setSelectedTeacherForView(teacher)}
                  className="p-1.5 bg-slate-50 hover:bg-brand-50 text-slate-500 hover:text-brand-700 rounded-lg border border-slate-200 hover:border-brand-100 transition-colors cursor-pointer"
                  title="Lihat Profil Guru"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                {(isSuperAdmin || isAdmin || (isPetugas && teacher.school_id === user.school_id)) && (
                  <button
                    id={`edit-teacher-${teacher.id}`}
                    onClick={() => openEditForm(teacher)}
                    className="p-1.5 bg-slate-50 hover:bg-brand-50 text-slate-500 hover:text-brand-700 rounded-lg border border-slate-200 hover:border-brand-100 transition-colors cursor-pointer"
                    title="Edit Profil Guru"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {(isSuperAdmin || isAdmin || (isPetugas && teacher.school_id === user.school_id)) && (
                  <button
                    id={`delete-teacher-${teacher.id}`}
                    onClick={() => handleDelete(teacher.id)}
                    className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg border border-slate-200 hover:border-rose-100 transition-colors cursor-pointer"
                    title="Hapus Guru"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filteredTeachers.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs font-sans">
            Guru tidak ditemukan.
          </div>
        )}
      </div>

      {/* CREATE / EDIT GURU MODAL */}
      {isFormOpen && createPortal(
        <div id="teacher-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden">
          <div className="bg-white w-full max-h-[85vh] sm:max-h-[90vh] rounded-2xl sm:rounded-3xl sm:max-w-2xl shadow-2xl animate-fade-in border border-slate-100 flex flex-col relative overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <h3 className="font-bold text-slate-800 text-sm font-sans flex items-center gap-2 text-brand-700">
                <UserIcon className="w-5 h-5" />
                {editingTeacher ? 'Edit Biodata Guru' : 'Tambah Guru Baru'}
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
                {/* School Selection: Locked for Petugas */}
                {!isPetugas ? (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Sekolah Penempatan</label>
                    <select
                      required
                      value={formFields.school_id || ''}
                      onChange={(e) => setFormFields({ ...formFields, school_id: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 focus:outline-none"
                    >
                      <option value="">-- Pilih Sekolah --</option>
                      {schools.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Sekolah Penempatan</label>
                    <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 font-semibold">
                      {getSchoolName(user.school_id)}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nama Lengkap & Gelar</label>
                  <input
                    type="text"
                    required
                    value={formFields.nama || ''}
                    onChange={(e) => setFormFields({ ...formFields, nama: e.target.value })}
                    placeholder="Siti Aminah, S.Pd"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">NIK (16 Digit)</label>
                    <input
                      type="text"
                      required
                      value={formFields.nik || ''}
                      onChange={(e) => setFormFields({ ...formFields, nik: e.target.value })}
                      placeholder="3573..."
                      maxLength={16}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">NIP (atau '-')</label>
                    <input
                      type="text"
                      value={formFields.nip || ''}
                      onChange={(e) => setFormFields({ ...formFields, nip: e.target.value })}
                      placeholder="1974..."
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Jenis Kelamin</label>
                  <select
                    value={formFields.jenis_kelamin || 'P'}
                    onChange={(e) => setFormFields({ ...formFields, jenis_kelamin: e.target.value as any })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-700"
                  >
                    <option value="P">Perempuan (P)</option>
                    <option value="L">Laki-laki (L)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tempat Lahir</label>
                    <input
                      type="text"
                      required
                      value={formFields.tempat_lahir || ''}
                      onChange={(e) => setFormFields({ ...formFields, tempat_lahir: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tanggal Lahir</label>
                    <input
                      type="date"
                      required
                      value={formFields.tanggal_lahir || ''}
                      onChange={(e) => setFormFields({ ...formFields, tanggal_lahir: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status Guru</label>
                  <select
                    value={formFields.status_guru || 'Swasta - GTY'}
                    onChange={(e) => setFormFields({ ...formFields, status_guru: e.target.value as any })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-700"
                  >
                    <option value="Negeri - PPPK">Negeri - PPPK</option>
                    <option value="Negeri - Depag">Negeri - Depag</option>
                    <option value="Negeri - Instansi Lain">Negeri - Instansi Lain</option>
                    <option value="Guru Bantu">Guru Bantu</option>
                    <option value="Swasta - GTY">Swasta - GTY (Guru Tetap Yayasan)</option>
                    <option value="Swasta - GTT WB">Swasta - GTT WB (Guru Tidak Tetap Wilayah Binaan)</option>
                    <option value="Swasta GTT PNS">Swasta GTT PNS (Guru Tidak Tetap PNS)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Jabatan Kerja</label>
                  <input
                    type="text"
                    required
                    value={formFields.jabatan || ''}
                    onChange={(e) => setFormFields({ ...formFields, jabatan: e.target.value })}
                    placeholder="Kepala Sekolah / Guru Kelas A / Pendamping"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Golongan</label>
                    <input
                      type="text"
                      value={formFields.golongan || ''}
                      onChange={(e) => setFormFields({ ...formFields, golongan: e.target.value })}
                      placeholder="e.g. III/a atau -"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Honorarium Bulanan (Rp)</label>
                    <input
                      type="number"
                      required
                      value={formFields.honor || 0}
                      onChange={(e) => setFormFields({ ...formFields, honor: Number(e.target.value) })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Pendidikan Terakhir</label>
                  <input
                    type="text"
                    required
                    value={formFields.pendidikan || ''}
                    onChange={(e) => setFormFields({ ...formFields, pendidikan: e.target.value })}
                    placeholder="e.g. S1 PGPAUD / S1 Psikologi"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nomor HP / WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={formFields.no_hp || ''}
                    onChange={(e) => setFormFields({ ...formFields, no_hp: e.target.value })}
                    placeholder="0812..."
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={formFields.email || ''}
                    onChange={(e) => setFormFields({ ...formFields, email: e.target.value })}
                    placeholder="guru@gmail.com"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tanggal TMT</label>
                  <input
                    type="date"
                    required
                    value={formFields.tmt || ''}
                    onChange={(e) => setFormFields({ ...formFields, tmt: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Alamat Rumah Lengkap</label>
                  <input
                    type="text"
                    required
                    value={formFields.alamat || ''}
                    onChange={(e) => setFormFields({ ...formFields, alamat: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Foto URL Link (Optional)</label>
                  <input
                    type="text"
                    value={formFields.foto_url || ''}
                    onChange={(e) => setFormFields({ ...formFields, foto_url: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono"
                  />
                </div>

                {/* Academic Year Basis Fields */}
                <div className="border-t border-slate-100 pt-4 sm:col-span-2">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">
                    Informasi Tugas Berbasis Tahun Pelajaran
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tahun Pelajaran</label>
                      <select
                        value={formFields.tahun_pelajaran || '2025/2026'}
                        onChange={(e) => setFormFields({ ...formFields, tahun_pelajaran: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 font-sans"
                      >
                        <option value="2024/2025">2024/2025</option>
                        <option value="2025/2026">2025/2026</option>
                        <option value="2026/2027">2026/2027</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Semester Tugas</label>
                      <select
                        value={formFields.semester || 'Ganjil'}
                        onChange={(e) => setFormFields({ ...formFields, semester: e.target.value as any })}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 font-sans"
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
                  Simpan Data Guru
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
              <h4 className="font-bold text-slate-800 text-sm font-sans">Hapus Data Guru?</h4>
              <p className="text-xs text-slate-500 font-sans leading-relaxed">
                Tindakan ini tidak dapat dibatalkan. Seluruh data profil guru ini akan dihapus secara permanen.
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
                  Import Massal Data Guru dari Excel
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
                    Seluruh data guru dalam file Excel ini akan didaftarkan ke sekolah yang Anda pilih di bawah ini.
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
                      Pratinjau Data Excel ({parsedData.length} Guru Ditemukan)
                    </h4>
                    <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-semibold">
                      Harap verifikasi sebelum disimpan
                    </span>
                  </div>
                  <div className="border border-slate-100 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase font-sans">
                          <th className="px-3 py-2 border-b border-slate-100">Nama</th>
                          <th className="px-3 py-2 border-b border-slate-100">NIK</th>
                          <th className="px-3 py-2 border-b border-slate-100">JK</th>
                          <th className="px-3 py-2 border-b border-slate-100">Jabatan</th>
                          <th className="px-3 py-2 border-b border-slate-100">Pendidikan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px] text-slate-600">
                        {parsedData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-3 py-1.5 font-medium text-slate-800">{row.nama}</td>
                            <td className="px-3 py-1.5 font-mono">{row.nik}</td>
                            <td className="px-3 py-1.5">{row.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                            <td className="px-3 py-1.5">{row.jabatan}</td>
                            <td className="px-3 py-1.5">{row.pendidikan}</td>
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
                  <span>Simpan {parsedData.length} Data Guru</span>
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DETAILED TEACHER PROFILE VIEW & PRINT/EXPORT MODAL */}
      {selectedTeacherForView && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-100 relative flex flex-col overflow-hidden max-h-[85vh] sm:max-h-[90vh]">
            
            {/* Modal Controls Bar */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 sticky top-0 z-10 shrink-0 no-print">
              <div className="flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-800 text-sm font-sans">Detail Profil Lengkap Guru</h3>
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
                  onClick={() => setSelectedTeacherForView(null)}
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
                #teacher-print-profile-content, #teacher-print-profile-content * {
                  visibility: visible !important;
                }
                #teacher-print-profile-content {
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
            <div id="teacher-print-profile-content" className="p-6 sm:p-8 space-y-6 bg-white overflow-y-auto flex-1 no-scrollbar">
              
              {/* Formal Header for Printing / Corporate Look */}
              <div className="flex items-center gap-4 border-b-2 border-slate-850 pb-4">
                <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center text-white font-extrabold text-xl shadow-md shrink-0">
                  {selectedTeacherForView.status_guru?.substring(0, 3).toUpperCase() || 'GT'}
                </div>
                <div className="space-y-0.5">
                  <h2 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase font-sans">
                    SISTEM INFORMASI MANAJEMEN PENDIDIKAN
                  </h2>
                  <h1 className="text-sm font-black tracking-tight text-slate-800 uppercase font-sans">
                    DATA BIO-PROFIL GURU / PENDIDIK
                  </h1>
                  <p className="text-[10px] text-slate-500 font-sans">
                    {getSchoolName(selectedTeacherForView.school_id)}
                  </p>
                </div>
              </div>

              {/* Main Profile Showcase */}
              <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                {/* Photo / Avatar */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                  {selectedTeacherForView.foto_url ? (
                    <img src={getDirectDriveImageUrl(selectedTeacherForView.foto_url)} alt={selectedTeacherForView.nama} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-12 h-12 text-brand-300" />
                  )}
                </div>

                <div className="min-w-0 flex-1 text-center sm:text-left space-y-2">
                  <div>
                    <span className="inline-flex items-center text-[10px] font-bold uppercase bg-brand-100 border border-brand-200 text-brand-800 px-3 py-1 rounded-full mb-1">
                      {selectedTeacherForView.status_guru} ({selectedTeacherForView.jabatan})
                    </span>
                    <h2 className="text-lg font-black text-slate-800 font-sans">
                      {selectedTeacherForView.nama}
                    </h2>
                    <p className="text-xs text-slate-500 font-sans">
                      {getSchoolName(selectedTeacherForView.school_id)}
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-center sm:justify-start gap-3 text-[11px] text-slate-600 font-sans">
                    <span className="bg-slate-100 border border-slate-200/50 px-2.5 py-1 rounded-lg">
                      NIK: <strong className="font-mono">{selectedTeacherForView.nik}</strong>
                    </span>
                    <span className="bg-slate-100 border border-slate-200/50 px-2.5 py-1 rounded-lg">
                      NIP: <strong className="font-mono">{selectedTeacherForView.nip || '-'}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Detailed Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Section A: Kepegawaian & Tugas */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-sans flex items-center gap-1 border-b border-slate-100 pb-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-brand-600" />
                    <span>Kepegawaian & Tugas</span>
                  </h4>
                  <div className="space-y-2 text-xs font-sans text-slate-700">
                    <div className="flex justify-between py-1 border-b border-slate-100/50">
                      <span className="text-slate-400">Status Kepegawaian</span>
                      <span className="font-bold text-slate-800">{selectedTeacherForView.status_guru}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100/50">
                      <span className="text-slate-400">Jabatan Kerja</span>
                      <span className="font-semibold text-slate-800">{selectedTeacherForView.jabatan}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100/50">
                      <span className="text-slate-400">Golongan</span>
                      <span className="font-semibold text-slate-800 font-mono">{selectedTeacherForView.golongan || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100/50">
                      <span className="text-slate-400">Tanggal TMT (Mulai Tugas)</span>
                      <span className="font-semibold text-slate-800 font-mono">{selectedTeacherForView.tmt || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100/50">
                      <span className="text-slate-400">Tahun Pelajaran Basis</span>
                      <span className="font-semibold text-slate-800 font-mono">{selectedTeacherForView.tahun_pelajaran || '2025/2026'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100/50">
                      <span className="text-slate-400">Semester Basis</span>
                      <span className="font-semibold text-slate-800">{selectedTeacherForView.semester || 'Ganjil'}</span>
                    </div>
                  </div>
                </div>

                {/* Section B: Data Personal */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-sans flex items-center gap-1 border-b border-slate-100 pb-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-brand-600" />
                    <span>Informasi Pribadi</span>
                  </h4>
                  <div className="space-y-2 text-xs font-sans text-slate-700">
                    <div className="flex justify-between py-1 border-b border-slate-100/50">
                      <span className="text-slate-400">Jenis Kelamin</span>
                      <span className="font-semibold text-slate-800">{selectedTeacherForView.jenis_kelamin === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100/50">
                      <span className="text-slate-400">Tempat Lahir</span>
                      <span className="font-semibold text-slate-800">{selectedTeacherForView.tempat_lahir || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100/50">
                      <span className="text-slate-400">Tanggal Lahir</span>
                      <span className="font-semibold text-slate-800 font-mono">{selectedTeacherForView.tanggal_lahir || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100/50">
                      <span className="text-slate-400">Pendidikan Terakhir</span>
                      <span className="font-semibold text-slate-800">{selectedTeacherForView.pendidikan || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100/50">
                      <span className="text-slate-400">Jurusan / Spesialisasi</span>
                      <span className="font-semibold text-slate-800">{selectedTeacherForView.jurusan || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Section C: Kontak & Domisili */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-sans flex items-center gap-1 border-b border-slate-100 pb-1.5">
                    <Phone className="w-3.5 h-3.5 text-brand-600" />
                    <span>Hubungan & Kontak</span>
                  </h4>
                  <div className="space-y-2 text-xs font-sans text-slate-700">
                    <div className="flex justify-between py-1 border-b border-slate-100/50">
                      <span className="text-slate-400">Nomor HP / WhatsApp</span>
                      <span className="font-semibold text-slate-800 font-mono">{selectedTeacherForView.no_hp || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100/50">
                      <span className="text-slate-400">Email</span>
                      <span className="font-semibold text-slate-800 font-mono truncate">{selectedTeacherForView.email || '-'}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 block">Alamat Tinggal Lengkap</span>
                      <span className="font-semibold text-slate-800 block bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed text-[11px]">{selectedTeacherForView.alamat || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Section D: Finansial & Gaji */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-sans flex items-center gap-1 border-b border-slate-100 pb-1.5">
                    <Layers className="w-3.5 h-3.5 text-brand-600" />
                    <span>Kesejahteraan & Keuangan</span>
                  </h4>
                  <div className="bg-brand-50/50 border border-brand-100 p-4 rounded-2xl text-center space-y-1">
                    <p className="text-[10px] text-brand-600 uppercase font-bold tracking-wider">Estimasi Honorarium Bulanan</p>
                    <p className="text-xl font-black text-brand-800 font-sans">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectedTeacherForView.honor || 0)}
                    </p>
                    <p className="text-[9px] text-slate-400 italic font-medium">Sistem Penggajian internal Pimpinan Daerah 'Aisyiyah.</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/80 no-print">
              <button
                type="button"
                onClick={() => setSelectedTeacherForView(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold font-sans cursor-pointer transition-colors"
              >
                Tutup
              </button>

              {(isSuperAdmin || isAdmin || (isPetugas && selectedTeacherForView.school_id === user.school_id)) && (
                <button
                  type="button"
                  onClick={() => {
                    const t = selectedTeacherForView;
                    setSelectedTeacherForView(null);
                    openEditForm(t);
                  }}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold font-sans flex items-center gap-1.5 cursor-pointer shadow-sm shadow-brand-600/10 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Profil Guru</span>
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
