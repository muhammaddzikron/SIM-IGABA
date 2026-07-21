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
  X,
  Loader2,
  Download,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Info,
  Building,
  Users
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
  const [selectedTahunPelajaran, setSelectedTahunPelajaran] = useState('ALL');
  const [selectedSemester, setSelectedSemester] = useState('ALL');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Excel Import States
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [targetSchoolId, setTargetSchoolId] = useState(isPetugas ? user.school_id : (schools[0]?.id || ''));
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form Fields
  const [formFields, setFormFields] = useState({
    school_id: isPetugas ? user.school_id : (schools[0]?.id || ''),
    tahun_pelajaran: '2025/2026',
    semester: 'Ganjil' as 'Ganjil' | 'Genap',
    jumlah_l: 0,
    jumlah_p: 0
  });

  // Group legacy data or keep existing recap data
  const getNormalizedStudents = (): Student[] => {
    const recaps: Student[] = [];
    const legacyToGroup: Student[] = [];

    students.forEach(s => {
      if (s.jumlah_l !== undefined && s.jumlah_p !== undefined) {
        recaps.push(s);
      } else {
        legacyToGroup.push(s);
      }
    });

    // Group legacy records by school_id, tahun_pelajaran, semester
    const groupedMap: Record<string, Student[]> = {};
    legacyToGroup.forEach(s => {
      const key = `${s.school_id}-${s.tahun_pelajaran || '2025/2026'}-${s.semester || 'Ganjil'}`;
      if (!groupedMap[key]) {
        groupedMap[key] = [];
      }
      groupedMap[key].push(s);
    });

    Object.entries(groupedMap).forEach(([key, list]) => {
      const first = list[0];
      const boys = list.filter(s => s.jenis_kelamin === 'L').length;
      const girls = list.filter(s => s.jenis_kelamin === 'P').length;
      
      recaps.push({
        id: `legacy-${key}`,
        school_id: first.school_id,
        tahun_pelajaran: first.tahun_pelajaran || '2025/2026',
        semester: first.semester || 'Ganjil',
        jumlah_l: boys,
        jumlah_p: girls,
        jumlah_total: boys + girls,
        is_legacy: true
      } as any);
    });

    return recaps;
  };

  const normalizedRecaps = getNormalizedStudents();

  // Handle Excel parsing
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

  // Import submits
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
          message: `Berhasil mengimpor ${parsedData.length} data rekap murid ke database!`
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

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormFields({
      school_id: isPetugas ? user.school_id : (schools[0]?.id || ''),
      tahun_pelajaran: '2025/2026',
      semester: 'Ganjil',
      jumlah_l: 0,
      jumlah_p: 0
    });
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (recap: Student) => {
    if (recap.is_legacy) return; // Legacy read-only grouping
    setEditingStudent(recap);
    setFormFields({
      school_id: recap.school_id,
      tahun_pelajaran: recap.tahun_pelajaran || '2025/2026',
      semester: (recap.semester || 'Ganjil') as 'Ganjil' | 'Genap',
      jumlah_l: recap.jumlah_l || 0,
      jumlah_p: recap.jumlah_p || 0
    });
    setIsFormOpen(true);
  };

  // Submit Add / Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const submitData: Partial<Student> = {
      school_id: formFields.school_id,
      tahun_pelajaran: formFields.tahun_pelajaran,
      semester: formFields.semester,
      jumlah_l: Number(formFields.jumlah_l),
      jumlah_p: Number(formFields.jumlah_p),
      jumlah_total: Number(formFields.jumlah_l) + Number(formFields.jumlah_p),
      status_aktif: 'Aktif'
    };

    try {
      if (editingStudent) {
        await onUpdate(editingStudent.id, submitData);
      } else {
        await onCreate(submitData);
      }
      setIsFormOpen(false);
      await onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Delete Action
  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    setLoading(true);
    try {
      await onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
      await onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Get school name helper
  const getSchoolName = (schoolId: string) => {
    return schools.find(s => s.id === schoolId)?.name || 'Sekolah Tidak Dikenal';
  };

  // Filter recaps
  const filteredRecaps = normalizedRecaps.filter(recap => {
    // School Filter
    if (selectedSchoolId !== 'ALL' && recap.school_id !== selectedSchoolId) return false;
    
    // Academic Year Filter
    if (selectedTahunPelajaran !== 'ALL' && recap.tahun_pelajaran !== selectedTahunPelajaran) return false;

    // Semester Filter
    if (selectedSemester !== 'ALL' && recap.semester !== selectedSemester) return false;

    // Search query (matches school name or tapel)
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      const schName = getSchoolName(recap.school_id).toLowerCase();
      const tapel = (recap.tahun_pelajaran || '').toLowerCase();
      if (!schName.includes(q) && !tapel.includes(q)) return false;
    }

    return true;
  });

  // Get list of academic years for filter dropdown
  const tapelOptions = Array.from(new Set(normalizedRecaps.map(r => r.tahun_pelajaran).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight font-sans">
            Data Rekap Murid
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Manajemen rekap total jumlah murid (L/P) per sekolah dan tahun pelajaran.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer font-sans border border-emerald-100/50"
          >
            <Upload className="w-4 h-4" />
            <span>Import Excel</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer font-sans shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Rekap Murid</span>
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari sekolah atau tahun pelajaran..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all font-sans"
            />
          </div>

          {/* School Filter (Super Admin / Admin Only) */}
          {!isPetugas ? (
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all font-sans"
            >
              <option value="ALL">Semua Sekolah</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-sans flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate">{getSchoolName(user.school_id)}</span>
            </div>
          )}

          {/* Academic Year Filter */}
          <select
            value={selectedTahunPelajaran}
            onChange={(e) => setSelectedTahunPelajaran(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all font-sans"
          >
            <option value="ALL">Semua Tahun Pelajaran</option>
            {tapelOptions.map((tp) => (
              <option key={tp} value={tp}>
                TP {tp}
              </option>
            ))}
            {!tapelOptions.includes('2025/2026') && <option value="2025/2026">TP 2025/2026</option>}
            {!tapelOptions.includes('2026/2027') && <option value="2026/2027">TP 2026/2027</option>}
          </select>

          {/* Semester Filter */}
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all font-sans"
          >
            <option value="ALL">Semua Semester</option>
            <option value="Ganjil">Ganjil</option>
            <option value="Genap">Genap</option>
          </select>
        </div>
      </div>

      {/* Content Area */}
      {filteredRecaps.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-sm space-y-3">
          <div className="w-16 h-16 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="font-bold text-slate-700 text-sm font-sans">Tidak ada rekap murid ditemukan</h4>
            <p className="text-xs text-slate-500 font-sans leading-relaxed">
              Silakan buat rekap baru atau ubah filter pencarian Anda.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRecaps.map((recap) => {
            const sumL = recap.jumlah_l || 0;
            const sumP = recap.jumlah_p || 0;
            const total = recap.jumlah_total || (sumL + sumP);
            const lPercent = total > 0 ? Math.round((sumL / total) * 100) : 50;
            const pPercent = total > 0 ? Math.round((sumP / total) * 100) : 50;

            return (
              <div
                key={recap.id}
                className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                {/* Header */}
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg uppercase tracking-wide font-sans flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      {getSchoolName(recap.school_id)}
                    </span>
                    {recap.is_legacy && (
                      <span className="text-[9px] font-semibold text-slate-400 bg-slate-50 border border-slate-200/50 px-2 py-0.5 rounded">
                        Generated
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm font-sans">
                    Rekap Total Murid
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-sans">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      TP {recap.tahun_pelajaran}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      Semester {recap.semester}
                    </span>
                  </div>
                </div>

                {/* Big Metric Section */}
                <div className="bg-slate-50/70 rounded-xl p-4 flex items-center justify-between border border-slate-100/50">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide font-sans">
                      Total Murid
                    </p>
                    <p className="text-2xl font-black text-slate-800 font-mono">
                      {total} <span className="text-xs font-semibold text-slate-500 font-sans">Siswa</span>
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-slate-300" />
                </div>

                {/* Breakdown & Progress Split */}
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                    <div className="space-y-0.5">
                      <p className="text-slate-400 font-medium flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        Laki-laki (L)
                      </p>
                      <p className="font-bold text-slate-700 font-mono">{sumL} Siswa ({lPercent}%)</p>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <p className="text-slate-400 font-medium flex items-center justify-end gap-1">
                        <span className="w-2 h-2 rounded-full bg-pink-400"></span>
                        Perempuan (P)
                      </p>
                      <p className="font-bold text-slate-700 font-mono">{sumP} Siswa ({pPercent}%)</p>
                    </div>
                  </div>

                  {/* Elegant Split Bar Gauge */}
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${lPercent}%` }}
                      className="bg-blue-400 h-full transition-all duration-500"
                      title={`Laki-laki: ${lPercent}%`}
                    />
                    <div
                      style={{ width: `${pPercent}%` }}
                      className="bg-pink-400 h-full transition-all duration-500"
                      title={`Perempuan: ${pPercent}%`}
                    />
                  </div>
                </div>

                {/* Action Controls */}
                <div className="border-t border-slate-100 pt-3 flex items-center justify-end gap-1.5">
                  {recap.is_legacy ? (
                    <div className="text-[10px] text-slate-400 font-sans italic flex items-center gap-1 mr-auto">
                      <Info className="w-3.5 h-3.5" />
                      Berdasarkan biodata lama
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(recap)}
                        className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all border border-slate-100 cursor-pointer"
                        title="Edit Rekap"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(recap.id)}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all border border-rose-100/50 cursor-pointer"
                        title="Hapus Rekap"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {isFormOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-800 text-sm font-sans">
                  {editingStudent ? 'Edit Rekap Murid' : 'Tambah Rekap Murid Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="p-6 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* School Selector */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide font-sans">
                      Pilih Sekolah*
                    </label>
                    <select
                      value={formFields.school_id}
                      onChange={(e) => setFormFields({ ...formFields, school_id: e.target.value })}
                      required
                      disabled={isPetugas || !!editingStudent}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all font-sans"
                    >
                      {schools.map((school) => (
                        <option key={school.id} value={school.id}>
                          {school.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Academic Year */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide font-sans">
                      Tahun Pelajaran*
                    </label>
                    <select
                      value={formFields.tahun_pelajaran}
                      onChange={(e) => setFormFields({ ...formFields, tahun_pelajaran: e.target.value })}
                      required
                      disabled={!!editingStudent}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all font-sans"
                    >
                      <option value="2024/2025">2024/2025</option>
                      <option value="2025/2026">2025/2026</option>
                      <option value="2026/2027">2026/2027</option>
                      <option value="2027/2028">2027/2028</option>
                    </select>
                  </div>

                  {/* Semester */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide font-sans">
                      Semester*
                    </label>
                    <select
                      value={formFields.semester}
                      onChange={(e) => setFormFields({ ...formFields, semester: e.target.value as any })}
                      required
                      disabled={!!editingStudent}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all font-sans"
                    >
                      <option value="Ganjil">Ganjil</option>
                      <option value="Genap">Genap</option>
                    </select>
                  </div>

                  {/* L count */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide font-sans">
                      Jumlah Murid Laki-laki (L)*
                    </label>
                    <input
                      type="number"
                      value={formFields.jumlah_l}
                      onChange={(e) => setFormFields({ ...formFields, jumlah_l: Math.max(0, parseInt(e.target.value) || 0) })}
                      required
                      min={0}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all font-mono"
                    />
                  </div>

                  {/* P count */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide font-sans">
                      Jumlah Murid Perempuan (P)*
                    </label>
                    <input
                      type="number"
                      value={formFields.jumlah_p}
                      onChange={(e) => setFormFields({ ...formFields, jumlah_p: Math.max(0, parseInt(e.target.value) || 0) })}
                      required
                      min={0}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all font-mono"
                    />
                  </div>

                  {/* Calculated total summary */}
                  <div className="sm:col-span-2 bg-slate-50 border border-slate-200/50 rounded-2xl p-4 flex justify-between items-center mt-2">
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide font-sans">
                        Kalkulasi Total Murid
                      </p>
                      <p className="text-xl font-extrabold text-brand-700 font-mono">
                        {formFields.jumlah_l + formFields.jumlah_p} <span className="text-xs font-semibold text-slate-500 font-sans">Siswa</span>
                      </p>
                    </div>
                    <Users className="w-7 h-7 text-slate-300" />
                  </div>

                </div>
              </div>

              {/* Actions Footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold font-sans cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Rekap
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmId && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-bold text-slate-800 text-sm font-sans">Hapus Rekap Murid?</h4>
              <p className="text-xs text-slate-500 font-sans leading-relaxed">
                Tindakan ini tidak dapat dibatalkan. Data rekap total murid pada tahun ajaran ini akan dihapus secara permanen.
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
                  Import Massal Rekap Murid dari Excel
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
              {/* Instructions Row */}
              <div className="bg-amber-50 border border-amber-200/50 rounded-2xl p-4 flex gap-3 text-amber-900">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold">Informasi Penting</p>
                  <p className="leading-relaxed">
                    Format file Excel harus sesuai dengan template terbaru. Unduh template Excel di bawah ini untuk melihat struktur kolom yang benar.
                  </p>
                  <button
                    type="button"
                    onClick={() => ExportEngine.downloadStudentTemplate()}
                    className="mt-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold inline-flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh Template Excel
                  </button>
                </div>
              </div>

              {/* Target School Selector (Only if Super Admin / Admin) */}
              {!isPetugas && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide font-sans">
                    Pilih Sekolah Tujuan Import*
                  </label>
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
                <div className={`p-4 rounded-xl flex items-start gap-2.5 ${importResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'}`}>
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
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide font-sans">
                      Pratinjau Data Excel ({parsedData.length} Rekap Ditemukan)
                    </h4>
                  </div>
                  <div className="border border-slate-100 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase font-sans">
                          <th className="px-3 py-2 border-b border-slate-100">Tahun Pelajaran</th>
                          <th className="px-3 py-2 border-b border-slate-100">Semester</th>
                          <th className="px-3 py-2 border-b border-slate-100">Laki-laki (L)</th>
                          <th className="px-3 py-2 border-b border-slate-100">Perempuan (P)</th>
                          <th className="px-3 py-2 border-b border-slate-100">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px] text-slate-600 font-mono">
                        {parsedData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-3 py-1.5 font-medium text-slate-800">{row.tahun_pelajaran}</td>
                            <td className="px-3 py-1.5 font-sans">{row.semester}</td>
                            <td className="px-3 py-1.5">{row.jumlah_l}</td>
                            <td className="px-3 py-1.5">{row.jumlah_p}</td>
                            <td className="px-3 py-1.5 font-bold text-brand-600">{row.jumlah_total}</td>
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
                  <span>Simpan {parsedData.length} Rekap</span>
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
