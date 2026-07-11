/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SKGuru, Teacher, School, User } from '../types';
import { ApiService } from '../lib/api';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Printer,
  ChevronRight,
  Info,
  Calendar,
  DollarSign,
  User as UserIcon,
  X,
  FileCheck,
  Building,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SKGuruViewProps {
  user: User;
  teachers: Teacher[];
  schools: School[];
  onRefresh: () => void;
}

export default function SKGuruView({
  user,
  teachers,
  schools,
  onRefresh
}: SKGuruViewProps) {
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const isAdmin = user.role === 'ADMIN';
  const isAdminOrSuper = isSuperAdmin || isAdmin;
  const isPetugas = user.role === 'PETUGAS';

  const [sks, setSks] = useState<SKGuru[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSchool, setFilterSchool] = useState(isPetugas ? user.school_id : 'ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal States
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Submit Feedback States
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Selected Item States
  const [selectedSK, setSelectedSK] = useState<SKGuru | null>(null);

  // Form Fields State (New Application)
  const [formFields, setFormFields] = useState({
    school_id: isPetugas ? (user.school_id || '') : '',
    teacher_id: '',
    jenis_sk: 'Pengangkatan Guru Tetap Yayasan (GTY)',
    tmt_sk: new Date().toISOString().split('T')[0],
    gaji_pokok: 600000,
    tunjangan: 200000,
    notes: '',
    tahun_mengajar: '2025/2026'
  });

  // Approval Form State
  const [approvalFields, setApprovalFields] = useState({
    no_sk: '',
    gaji_pokok: 600000,
    tunjangan: 200000,
    notes: ''
  });

  // Rejection Form State
  const [rejectionNotes, setRejectionNotes] = useState('');

  // Processing indicator
  const [processing, setProcessing] = useState(false);

  // Fetch SKs
  const fetchSks = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ApiService.getList<SKGuru>('sk_guru');
      if (res.success && res.data) {
        setSks(res.data);
      } else {
        setError(res.message || 'Gagal memuat data SK Guru');
      }
    } catch (err: any) {
      console.error('Error fetching SK Guru:', err);
      setError('Terjadi kesalahan koneksi saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSks();
  }, [user]);

  // Helpers
  const getTeacherName = (id: string) => {
    const t = teachers.find(item => item.id === id);
    return t ? t.nama : 'Guru Tidak Dikenal';
  };

  const getTeacherDetails = (id: string) => {
    return teachers.find(item => item.id === id);
  };

  const getSchoolName = (id: string) => {
    const s = schools.find(item => item.id === id);
    return s ? s.name : 'Sekolah Tidak Dikenal';
  };

  const getSchoolDetails = (id: string) => {
    return schools.find(item => item.id === id);
  };

  // Filtered lists
  const filteredSks = sks.filter(sk => {
    // School Filter
    if (filterSchool !== 'ALL' && sk.school_id !== filterSchool) return false;

    // Status Filter
    if (filterStatus !== 'ALL' && sk.status !== filterStatus) return false;

    // Search Query (Teacher Name or SK Number)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const teacherName = getTeacherName(sk.teacher_id).toLowerCase();
      const skNumber = (sk.no_sk || '').toLowerCase();
      const skType = sk.jenis_sk.toLowerCase();
      if (!teacherName.includes(q) && !skNumber.includes(q) && !skType.includes(q)) return false;
    }

    return true;
  });

  // Calculate stats
  const activeSks = isPetugas ? sks.filter(s => s.school_id === user.school_id) : sks;
  const statTotal = activeSks.length;
  const statApproved = activeSks.filter(s => s.status === 'Approved').length;
  const statPending = activeSks.filter(s => s.status === 'Pending').length;
  const statRejected = activeSks.filter(s => s.status === 'Rejected').length;

  // Handle Create SK Proposal (Petugas or Admin)
  const handleCreateSK = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitSuccess(null);
    setSubmitError(null);

    const targetSchoolId = isPetugas ? user.school_id : formFields.school_id;
    if (!targetSchoolId) {
      setSubmitError('Pilih sekolah terlebih dahulu.');
      return;
    }
    if (!formFields.teacher_id) {
      setSubmitError('Pilih guru terlebih dahulu.');
      return;
    }

    try {
      setProcessing(true);
      const newSk: Partial<SKGuru> = {
        school_id: targetSchoolId,
        teacher_id: formFields.teacher_id,
        no_sk: '', // Pending SK doesn't have an official number yet
        tanggal_sk: new Date().toISOString().split('T')[0],
        jenis_sk: formFields.jenis_sk,
        tmt_sk: formFields.tmt_sk,
        status: 'Pending',
        notes: formFields.notes || `Pengajuan SK Mengajar Tahun ${formFields.tahun_mengajar}`,
        gaji_pokok: Number(formFields.gaji_pokok) || 0,
        tunjangan: Number(formFields.tunjangan) || 0,
        tahun_mengajar: formFields.tahun_mengajar
      };

      const res = await ApiService.createItem<SKGuru>('sk_guru', newSk);
      if (res.success) {
        setSubmitSuccess('Pengajuan SK Guru berhasil dikirim!');
        // Reset form
        setFormFields({
          school_id: isPetugas ? (user.school_id || '') : '',
          teacher_id: '',
          jenis_sk: 'Pengangkatan Guru Tetap Yayasan (GTY)',
          tmt_sk: new Date().toISOString().split('T')[0],
          gaji_pokok: 600000,
          tunjangan: 200000,
          notes: '',
          tahun_mengajar: '2025/2026'
        });
        await fetchSks();
        onRefresh();
      } else {
        setSubmitError(res.message || 'Gagal mengajukan SK');
      }
    } catch (err: any) {
      console.error('Error submitting SK:', err);
      setSubmitError('Terjadi kesalahan koneksi saat mengirim pengajuan.');
    } finally {
      setProcessing(false);
    }
  };

  // Handle Approve (Admin/Super)
  const handleApproveSK = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSK) return;
    if (!approvalFields.no_sk) {
      alert('Nomor SK wajib diisi');
      return;
    }

    try {
      setProcessing(true);
      const updateData: Partial<SKGuru> = {
        status: 'Approved',
        no_sk: approvalFields.no_sk,
        gaji_pokok: Number(approvalFields.gaji_pokok) || 0,
        tunjangan: Number(approvalFields.tunjangan) || 0,
        notes: approvalFields.notes,
        tanggal_sk: new Date().toISOString().split('T')[0]
      };

      const res = await ApiService.updateItem<SKGuru>('sk_guru', selectedSK.id, updateData);
      if (res.success) {
        setIsApprovalModalOpen(false);
        setSelectedSK(null);
        await fetchSks();
        onRefresh();
      } else {
        alert(res.message || 'Gagal menyetujui SK');
      }
    } catch (err: any) {
      alert('Terjadi kesalahan: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Handle Reject (Admin/Super)
  const handleRejectSK = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSK) return;

    try {
      setProcessing(true);
      const updateData: Partial<SKGuru> = {
        status: 'Rejected',
        notes: rejectionNotes || 'Ditolak oleh pimpinan majelis'
      };

      const res = await ApiService.updateItem<SKGuru>('sk_guru', selectedSK.id, updateData);
      if (res.success) {
        setIsRejectModalOpen(false);
        setSelectedSK(null);
        setRejectionNotes('');
        await fetchSks();
        onRefresh();
      } else {
        alert(res.message || 'Gagal menolak SK');
      }
    } catch (err: any) {
      alert('Terjadi kesalahan: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Open Approval Modal
  const openApproveDialog = (sk: SKGuru) => {
    setSelectedSK(sk);
    const teacher = getTeacherDetails(sk.teacher_id);
    // Auto generate suggestion for Decree number based on role/school
    const year = new Date(sk.tmt_sk).getFullYear();
    const sequence = Math.floor(Math.random() * 80) + 10;
    const suggestedNoSK = `${sequence}/SK.G/PDA/VII/${year}`;

    setApprovalFields({
      no_sk: sk.no_sk || suggestedNoSK,
      gaji_pokok: sk.gaji_pokok || 650000,
      tunjangan: sk.tunjangan || 180000,
      notes: sk.notes || 'Disetujui dan ditandatangani oleh Pimpinan Daerah Aisyiyah Klaten'
    });
    setIsApprovalModalOpen(true);
  };

  // Open Reject Dialog
  const openRejectDialog = (sk: SKGuru) => {
    setSelectedSK(sk);
    setRejectionNotes('');
    setIsRejectModalOpen(true);
  };

  // Open Document Preview Modal
  const openPreviewDialog = (sk: SKGuru) => {
    setSelectedSK(sk);
    setIsPreviewModalOpen(true);
  };

  // Filter teachers for the selection dropdown (Active school only, and doesn't already have a pending SK)
  const selectedFormSchoolId = isPetugas ? user.school_id : formFields.school_id;
  const schoolTeachers = selectedFormSchoolId 
    ? teachers.filter(t => t.school_id === selectedFormSchoolId) 
    : [];
  const eligibleTeachers = schoolTeachers.filter(t => {
    const hasPendingSK = sks.some(s => s.teacher_id === t.id && s.status === 'Pending');
    return !hasPendingSK;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header and Call to Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-green-700" />
            {isAdminOrSuper ? 'Pengelolaan SK Guru Aisyiyah' : 'Pengajuan SK Guru'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isAdminOrSuper
              ? 'Kelola, validasi, dan setujui penerbitan Surat Keputusan (SK) Guru dari seluruh satuan pendidikan.'
              : 'Ajukan usulan Surat Keputusan (SK) Guru Tetap Yayasan (GTY) atau guru pendamping ke PDA.'}
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total stats */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Usulan</p>
            <p className="text-lg font-extrabold text-slate-800 leading-tight mt-0.5">{statTotal} Berkas</p>
          </div>
        </div>

        {/* Pending stats */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Menunggu Approval</p>
            <p className="text-lg font-extrabold text-slate-800 leading-tight mt-0.5">{statPending} Berkas</p>
          </div>
        </div>

        {/* Approved stats */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Disetujui (Aktif)</p>
            <p className="text-lg font-extrabold text-slate-800 leading-tight mt-0.5">{statApproved} SK</p>
          </div>
        </div>

        {/* Rejected stats */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-700 rounded-xl">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ditolak / Revisi</p>
            <p className="text-lg font-extrabold text-slate-800 leading-tight mt-0.5">{statRejected} Berkas</p>
          </div>
        </div>
      </div>

      {/* Split Grid Layout: Left Column = Form, Right Column = Filters & Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Pengajuan Baru */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2 text-green-700">
              <FileCheck className="w-5 h-5 text-green-600" />
              Buat Pengajuan Baru
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Isi data di bawah ini untuk mengajukan usulan SK mengajar baru ke Pimpinan Daerah Aisyiyah Klaten.
            </p>
          </div>

          {submitSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-medium">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{submitSuccess}</span>
            </div>
          )}

          {submitError && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-xs text-rose-800 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleCreateSK} className="space-y-4">
            {/* School Selector (Admin Only) */}
            {!isPetugas && (
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Pilih Sekolah <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formFields.school_id}
                  onChange={(e) => {
                    setFormFields(prev => ({
                      ...prev,
                      school_id: e.target.value,
                      teacher_id: '' // Reset selected teacher
                    }));
                  }}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-green-600 transition-all font-medium cursor-pointer"
                >
                  <option value="">-- Pilih Sekolah --</option>
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.jenjang})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Teacher Selector */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Pilih Guru <span className="text-rose-500">*</span>
              </label>
              <select
                value={formFields.teacher_id}
                onChange={(e) => setFormFields(prev => ({ ...prev, teacher_id: e.target.value }))}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-green-600 transition-all font-medium cursor-pointer"
              >
                <option value="">
                  {!isPetugas && !formFields.school_id 
                    ? 'Pilih sekolah terlebih dahulu' 
                    : '-- Pilih Guru --'}
                </option>
                {eligibleTeachers.map(t => (
                  <option key={t.id} value={t.id}>{t.nama} - {t.jabatan || 'Guru'}</option>
                ))}
              </select>
              {eligibleTeachers.length === 0 && (formFields.school_id || isPetugas) && (
                <p className="text-[10px] text-amber-600 font-medium italic mt-1">
                  Semua guru di sekolah ini telah memiliki pengajuan SK aktif.
                </p>
              )}
            </div>

            {/* Academic Year and TMT */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Tahun Pelajaran <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formFields.tahun_mengajar}
                  onChange={(e) => setFormFields(prev => ({ ...prev, tahun_mengajar: e.target.value }))}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-green-600 transition-all font-medium cursor-pointer"
                >
                  <option value="2024/2025">2024/2025</option>
                  <option value="2025/2026">2025/2026</option>
                  <option value="2026/2027">2026/2027</option>
                  <option value="2027/2028">2027/2028</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  TMT SK <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formFields.tmt_sk}
                  onChange={(e) => setFormFields(prev => ({ ...prev, tmt_sk: e.target.value }))}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-green-600 transition-all font-medium cursor-pointer"
                />
              </div>
            </div>

            {/* Jenis SK */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Jenis SK <span className="text-rose-500">*</span>
              </label>
              <select
                value={formFields.jenis_sk}
                onChange={(e) => setFormFields(prev => ({ ...prev, jenis_sk: e.target.value }))}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-green-600 transition-all font-medium cursor-pointer"
              >
                <option value="Pembagian Tugas Mengajar">Pembagian Tugas Mengajar (SK Mengajar)</option>
                <option value="Pengangkatan Guru Tetap Yayasan (GTY)">Pengangkatan Guru Tetap Yayasan (GTY)</option>
                <option value="Pengangkatan Guru Tidak Tetap (GTT)">Pengangkatan Guru Tidak Tetap (GTT)</option>
                <option value="Penetapan Kepala Sekolah">Penetapan Kepala Sekolah</option>
              </select>
            </div>

            {/* Financial fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Usulan Gaji Pokok
                </label>
                <div className="relative">
                  <span className="text-[10px] font-bold text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2">Rp</span>
                  <input
                    type="number"
                    min="0"
                    value={formFields.gaji_pokok}
                    onChange={(e) => setFormFields(prev => ({ ...prev, gaji_pokok: Number(e.target.value) || 0 }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-green-600 transition-all font-medium font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Usulan Tunjangan
                </label>
                <div className="relative">
                  <span className="text-[10px] font-bold text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2">Rp</span>
                  <input
                    type="number"
                    min="0"
                    value={formFields.tunjangan}
                    onChange={(e) => setFormFields(prev => ({ ...prev, tunjangan: Number(e.target.value) || 0 }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-green-600 transition-all font-medium font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Catatan / Keterangan Usulan
              </label>
              <textarea
                value={formFields.notes}
                onChange={(e) => setFormFields(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Misalnya: Pengusulan SK Mengajar Semester Ganjil..."
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-green-600 transition-all font-medium"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={processing || (!isPetugas && !formFields.school_id)}
              className="w-full bg-green-700 hover:bg-green-800 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileCheck className="w-4 h-4" />
              )}
              <span>Kirim Pengajuan SK Guru</span>
            </button>
          </form>
        </div>

        {/* Right Column: Filters and Main List Table */}
        <div className="lg:col-span-8 space-y-4">
          {/* Filters Area */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari guru, nomor SK, atau jenis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-600 focus:bg-white text-slate-700 transition-all font-medium"
              />
            </div>

            <div className="flex flex-wrap md:flex-nowrap items-center gap-3 w-full md:w-auto">
              {/* School filter for Admins */}
              {isAdminOrSuper && (
                <div className="flex items-center gap-1.5 w-full md:w-auto">
                  <Building className="w-4 h-4 text-slate-400 shrink-0" />
                  <select
                    value={filterSchool}
                    onChange={(e) => setFilterSchool(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600 focus:outline-none w-full md:w-48 font-semibold cursor-pointer"
                  >
                    <option value="ALL">Semua Sekolah</option>
                    {schools.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status filter */}
              <div className="flex items-center gap-1.5 w-full md:w-auto">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600 focus:outline-none w-full md:w-40 font-semibold cursor-pointer"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="Pending">Menunggu Approval</option>
                  <option value="Approved">Disetujui</option>
                  <option value="Rejected">Ditolak</option>
                </select>
              </div>
            </div>
          </div>

          {/* Main List */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-green-700" />
                <span className="text-xs text-slate-400 font-semibold">Memuat berkas SK Guru...</span>
              </div>
            ) : error ? (
              <div className="py-16 text-center">
                <div className="inline-flex p-3 bg-red-50 text-red-600 rounded-2xl mb-3">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-800">{error}</p>
                <button
                  onClick={fetchSks}
                  className="mt-3 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Coba Lagi
                </button>
              </div>
            ) : filteredSks.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <FileText className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5]" />
                <p className="text-xs font-bold mt-4 text-slate-500">Tidak ada pengajuan SK ditemukan</p>
                <p className="text-[11px] text-slate-400 mt-1">Coba sesuaikan kata kunci atau filter pencarian Anda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4 font-sans">Nama Guru & Sekolah</th>
                      <th className="py-3.5 px-4 font-sans">Jenis SK</th>
                      <th className="py-3.5 px-4 font-sans">Nomor SK</th>
                      <th className="py-3.5 px-4 font-sans text-center">TMT SK</th>
                      <th className="py-3.5 px-4 font-sans text-center">Status</th>
                      <th className="py-3.5 px-4 font-sans text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSks.map(sk => {
                      const teacher = getTeacherDetails(sk.teacher_id);
                      const school = getSchoolDetails(sk.school_id);

                      return (
                        <tr key={sk.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-sans">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                                {teacher?.nama.charAt(0) || 'G'}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 text-sm leading-tight">{teacher?.nama || 'N/A'}</p>
                                <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                  <Building className="w-3 h-3 text-slate-400" />
                                  {school?.name || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-sans font-medium text-slate-700">
                            {sk.jenis_sk}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                            {sk.status === 'Approved' ? (
                              sk.no_sk || '-'
                            ) : (
                              <span className="text-[10px] text-slate-400 font-sans font-semibold">Belum Diterbitkan</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-center text-slate-600 font-semibold">
                            {new Date(sk.tmt_sk).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {sk.status === 'Approved' && (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-bold">
                                <CheckCircle className="w-3 h-3" />
                                Disetujui
                              </span>
                            )}
                            {sk.status === 'Pending' && (
                              <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-bold animate-pulse">
                                <Clock className="w-3 h-3" />
                                Diproses
                              </span>
                            )}
                            {sk.status === 'Rejected' && (
                              <span className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-700 px-2.5 py-1 rounded-full text-[10px] font-bold">
                                <XCircle className="w-3 h-3" />
                                Ditolak
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-sans">
                            <div className="flex items-center justify-end gap-2">
                              {/* Print / View Decree Document */}
                              {sk.status === 'Approved' && (
                                <button
                                  onClick={() => openPreviewDialog(sk)}
                                  className="inline-flex items-center gap-1 bg-green-50 border border-green-200 hover:bg-green-100 text-green-700 font-bold px-3 py-1.5 rounded-xl cursor-pointer text-[11px] transition-colors"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>Cetak SK</span>
                                </button>
                              )}

                              {/* Approval controls for admin */}
                              {isAdminOrSuper && sk.status === 'Pending' && (
                                <>
                                  <button
                                    onClick={() => openApproveDialog(sk)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl cursor-pointer text-[11px] transition-colors"
                                  >
                                    Setujui
                                  </button>
                                  <button
                                    onClick={() => openRejectDialog(sk)}
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold px-3 py-1.5 rounded-xl cursor-pointer text-[11px] transition-colors"
                                  >
                                    Tolak
                                  </button>
                                </>
                              )}

                              {/* Information for rejected / other statuses */}
                              {sk.status === 'Rejected' && (
                                <div className="relative group">
                                  <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                                    <Info className="w-4 h-4" />
                                  </button>
                                  <div className="absolute right-0 bottom-full mb-1 w-48 bg-slate-800 text-white p-2 rounded-lg text-[10px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg z-10 font-sans text-left">
                                    <p className="font-bold border-b border-white/20 pb-1 mb-1">Catatan Penolakan:</p>
                                    <p className="italic">{sk.notes || 'Tidak ada alasan khusus.'}</p>
                                  </div>
                                </div>
                              )}
                              
                              {sk.status === 'Pending' && isPetugas && (
                                <span className="text-[10px] text-slate-400 font-semibold italic flex items-center gap-1 px-1 py-1 bg-slate-50 rounded-lg">
                                  Menunggu PDA
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: APPROVE SK (Admin Only) */}
      <AnimatePresence>
        {isApprovalModalOpen && selectedSK && createPortal(
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white w-full max-h-[85vh] sm:max-h-[90vh] rounded-3xl sm:max-w-md shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 text-emerald-700">
                  <CheckCircle className="w-5 h-5" />
                  Setujui & Terbitkan SK Guru
                </h3>
                <button
                  onClick={() => setIsApprovalModalOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleApproveSK} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="p-6 space-y-4 flex-1 overflow-y-auto no-scrollbar text-xs text-slate-700">
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 text-[11px] text-slate-600 leading-relaxed">
                    <p className="font-bold text-emerald-800 mb-1 uppercase tracking-wider">Identitas Usulan:</p>
                    <p><strong>Nama Guru:</strong> {getTeacherName(selectedSK.teacher_id)}</p>
                    <p><strong>Asal Sekolah:</strong> {getSchoolName(selectedSK.school_id)}</p>
                    <p><strong>Jenis SK:</strong> {selectedSK.jenis_sk}</p>
                    <p><strong>TMT Terbit:</strong> {new Date(selectedSK.tmt_sk).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>

                  {/* No SK */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Nomor SK Resmi (Wajib)</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 054/SK.G/PDA/VII/2026"
                      value={approvalFields.no_sk}
                      onChange={(e) => setApprovalFields({ ...approvalFields, no_sk: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 focus:outline-none font-bold font-mono text-emerald-800 placeholder-slate-400"
                    />
                  </div>

                  {/* Confirmed Gaji Pokok */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Gaji Pokok Disetujui (Rp)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={approvalFields.gaji_pokok}
                      onChange={(e) => setApprovalFields({ ...approvalFields, gaji_pokok: Number(e.target.value) })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 focus:outline-none font-semibold font-mono"
                    />
                  </div>

                  {/* Confirmed Tunjangan */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Tunjangan Disetujui (Rp)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={approvalFields.tunjangan}
                      onChange={(e) => setApprovalFields({ ...approvalFields, tunjangan: Number(e.target.value) })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 focus:outline-none font-semibold font-mono"
                    />
                  </div>

                  {/* Approval Notes */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Catatan Persetujuan</label>
                    <textarea
                      value={approvalFields.notes}
                      onChange={(e) => setApprovalFields({ ...approvalFields, notes: e.target.value })}
                      rows={2}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 focus:outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsApprovalModalOpen(false)}
                    className="bg-white border border-slate-200 text-slate-600 font-bold px-4 py-2 rounded-xl text-xs hover:bg-slate-100 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer shadow-sm flex items-center gap-1"
                  >
                    {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    <span>Setujui & Terbitkan SK</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>

      {/* MODAL: REJECT SK (Admin Only) */}
      <AnimatePresence>
        {isRejectModalOpen && selectedSK && createPortal(
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white w-full rounded-3xl max-w-sm shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                <h3 className="font-bold text-rose-800 text-sm flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-rose-600" />
                  Tolak Berkas Pengajuan SK
                </h3>
                <button
                  onClick={() => setIsRejectModalOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRejectSK} className="p-6 space-y-4 text-xs">
                <p className="text-slate-500 leading-normal">
                  Anda akan menolak pengajuan SK Guru atas nama <strong>{getTeacherName(selectedSK.teacher_id)}</strong> dari sekolah <strong>{getSchoolName(selectedSK.school_id)}</strong>.
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Catatan Penolakan / Alasan Revisi</label>
                  <textarea
                    required
                    placeholder="Contoh: Pengajuan ditolak karena tmt mengajar guru belum mencapai 1 tahun pengabdian minimum..."
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    rows={4}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 focus:outline-none font-medium"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsRejectModalOpen(false)}
                    className="bg-white border border-slate-200 text-slate-600 font-bold px-4 py-2 rounded-xl text-xs hover:bg-slate-100 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer shadow-sm flex items-center gap-1"
                  >
                    {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>Tolak Berkas</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>

      {/* MODAL: PREVIEW DOCUMENT DECREE (PRINT READY) */}
      <AnimatePresence>
        {isPreviewModalOpen && selectedSK && createPortal(
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white w-full max-h-[92vh] rounded-3xl sm:max-w-3xl shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden"
            >
              {/* Header inside modal */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white print:hidden">
                <h3 className="font-bold text-slate-800 text-sm font-sans flex items-center gap-2 text-green-700">
                  <FileText className="w-5 h-5" />
                  Pratinjau Surat Keputusan Resmi (SK)
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 bg-green-700 hover:bg-green-800 text-white font-bold px-4 py-1.5 rounded-xl text-xs cursor-pointer shadow-sm transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak Dokumen</span>
                  </button>
                  <button
                    onClick={() => setIsPreviewModalOpen(false)}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Document Container */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/50 flex justify-center print:bg-white print:p-0 no-scrollbar">
                {/* Visual A4 paper wrapper */}
                <div 
                  id="printable-sk-area"
                  className="bg-white w-full max-w-[210mm] min-h-[297mm] p-6 sm:p-12 shadow-md border border-slate-200/50 rounded-2xl flex flex-col font-serif text-[11px] leading-relaxed text-slate-900 print:shadow-none print:border-none print:rounded-none print:p-0"
                >
                  {/* Formal Letterhead */}
                  <div className="flex items-center justify-center gap-4 border-b-4 border-double border-slate-900 pb-3 text-center">
                    <img 
                      src="https://igaba.id/Icon-IGABA.png" 
                      alt="Logo Aisyiyah" 
                      className="w-16 h-16 object-contain shrink-0" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1">
                      <h2 className="text-sm font-black tracking-widest text-slate-900 font-sans leading-none uppercase">PIMPINAN DAERAH AISYIYAH</h2>
                      <h2 className="text-xs font-black tracking-widest text-green-800 font-sans mt-1 leading-none uppercase">MAJELIS PAUD, DASAR DAN MENENGAH</h2>
                      <h2 className="text-sm font-extrabold tracking-wide text-slate-900 font-sans mt-1 leading-none uppercase">KABUPATEN KLATEN</h2>
                      <p className="text-[8px] font-sans text-slate-500 font-medium mt-1 leading-none italic">
                        Sekretariat: Jl. Ronggowarsito No. 1, Klaten Utara, Klaten • Telp. (0272) 321123 • Email: pda.klaten@gmail.com
                      </p>
                    </div>
                  </div>

                  {/* Title of Decree */}
                  <div className="text-center mt-6 space-y-1">
                    <h1 className="text-xs font-bold uppercase tracking-wider underline leading-none">SURAT KEPUTUSAN</h1>
                    <h2 className="text-xs font-bold uppercase tracking-wider leading-none">PIMPINAN DAERAH AISYIYAH KABUPATEN KLATEN</h2>
                    <p className="font-mono text-[10px] font-bold text-slate-700">Nomor: {selectedSK.no_sk || '.../SK.G/PDA/VII/2026'}</p>
                    <p className="font-sans text-[9px] text-slate-500 italic mt-1 font-bold">Tentang</p>
                    <p className="font-bold uppercase tracking-wider px-6 mt-1 text-xs">
                      {selectedSK.jenis_sk.toUpperCase()}<br/>
                      {getTeacherName(selectedSK.teacher_id).toUpperCase()} PADA {getSchoolName(selectedSK.school_id).toUpperCase()}
                    </p>
                  </div>

                  {/* Body Content */}
                  <div className="mt-6 space-y-3 text-justify">
                    <p className="indent-8 font-sans text-[10px] italic font-bold">Bismillahir-rahmanir-rahim</p>
                    
                    {/* Menimbang */}
                    <div className="flex gap-4">
                      <span className="font-bold w-16 shrink-0 text-left">Menimbang</span>
                      <span className="shrink-0">:</span>
                      <div className="flex-1 space-y-1">
                        <p>a. bahwa demi kelancaran administrasi dan operasional belajar mengajar pada Bustanul Athfal Aisyiyah di lingkungan PDA Klaten, dipandang perlu untuk mengesahkan penetapan jabatan/tugas mengajar guru;</p>
                        <p>b. bahwa Saudara/i yang tercantum namanya dalam Keputusan ini dinilai memiliki integritas, loyalitas, serta kecakapan yang cukup untuk mengemban tugas tersebut;</p>
                        <p>c. bahwa berdasarkan pertimbangan sebagaimana dimaksud pada huruf a dan b, perlu diterbitkan Surat Keputusan Pimpinan Daerah Aisyiyah.</p>
                      </div>
                    </div>

                    {/* Mengingat */}
                    <div className="flex gap-4">
                      <span className="font-bold w-16 shrink-0 text-left">Mengingat</span>
                      <span className="shrink-0">:</span>
                      <div className="flex-1 space-y-1">
                        <p>1. Anggaran Dasar dan Anggaran Rumah Tangga (AD/ART) Persyarikatan Aisyiyah;</p>
                        <p>2. Undang-Undang Republik Indonesia Nomor 14 Tahun 2005 tentang Guru dan Dosen;</p>
                        <p>3. Keputusan Majelis PAUD, Dasar & Menengah Pimpinan Pusat Aisyiyah tentang Pengelolaan Satuan Pendidikan.</p>
                      </div>
                    </div>

                    {/* Memutuskan */}
                    <div className="border-t border-slate-200/60 pt-3 flex justify-center">
                      <span className="font-sans font-black tracking-widest uppercase text-slate-900 border-b border-slate-900 px-6 py-0.5 leading-none">MEMUTUSKAN:</span>
                    </div>

                    {/* Menetapkan */}
                    <div className="flex gap-4">
                      <span className="font-bold w-16 shrink-0 text-left">Menetapkan</span>
                      <span className="shrink-0">:</span>
                      <div className="flex-1 space-y-1">
                        <p className="font-bold uppercase tracking-wider text-[10px] text-green-950">SURAT KEPUTUSAN PIMPINAN DAERAH AISYIYAH KABUPATEN KLATEN TENTANG {selectedSK.jenis_sk.toUpperCase()}</p>
                      </div>
                    </div>

                    {/* Diktum Utama */}
                    <div className="space-y-2 pl-20">
                      <div className="flex gap-2">
                        <span className="font-bold w-14 shrink-0">PERTAMA</span>
                        <span>:</span>
                        <div className="flex-1">
                          Mengangkat dan mengesahkan Saudara/i:
                          <table className="w-full mt-1.5 border-none text-[11px]">
                            <tbody>
                              <tr>
                                <td className="py-0.5 w-24">Nama Lengkap</td>
                                <td className="py-0.5 w-3">:</td>
                                <td className="py-0.5 font-bold">{getTeacherName(selectedSK.teacher_id)}</td>
                              </tr>
                              <tr>
                                <td className="py-0.5">Pendidikan</td>
                                <td className="py-0.5">:</td>
                                <td>{getTeacherDetails(selectedSK.teacher_id)?.pendidikan || 'S1'} {getTeacherDetails(selectedSK.teacher_id)?.jurusan || ''}</td>
                              </tr>
                              <tr>
                                <td className="py-0.5">Penempatan</td>
                                <td className="py-0.5">:</td>
                                <td className="font-bold text-slate-800">{getSchoolName(selectedSK.school_id)}</td>
                              </tr>
                              <tr>
                                <td className="py-0.5">Jabatan Pokok</td>
                                <td className="py-0.5">:</td>
                                <td>{getTeacherDetails(selectedSK.teacher_id)?.jabatan || 'Guru Kelas'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <span className="font-bold w-14 shrink-0">KEDUA</span>
                        <span>:</span>
                        <div className="flex-1">
                          Terhitung Mulai Tanggal (TMT) Keputusan ini berlaku sejak tanggal: <strong className="font-mono">{new Date(selectedSK.tmt_sk).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <span className="font-bold w-14 shrink-0">KETIGA</span>
                        <span>:</span>
                        <div className="flex-1">
                          Kepadanya diberikan hak keuangan berupa Gaji Pokok sebesar <strong>Rp {(selectedSK.gaji_pokok || 0).toLocaleString('id-ID')}</strong> ditambah Tunjangan sebesar <strong>Rp {(selectedSK.tunjangan || 0).toLocaleString('id-ID')}</strong> per bulan, yang dibayarkan bersumber dari dana komite sekolah/yayasan sesuai dengan regulasi yang berlaku.
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <span className="font-bold w-14 shrink-0">KEEMPAT</span>
                        <span>:</span>
                        <div className="flex-1">
                          Surat Keputusan ini diterbitkan untuk dipergunakan sebagaimana mestinya, dan apabila di kemudian hari terdapat kekeliruan dalam penetapan ini, maka akan dilakukan perbaikan secara administratif sebagaimana mestinya.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Signatures Section */}
                  <div className="mt-10 flex justify-between items-start font-sans">
                    <div className="w-48 text-center pt-2">
                      <p className="text-[10px] font-bold text-slate-500">Mengetahui/Menyetujui,</p>
                      <p className="font-bold mt-1">Kepala Sekolah {getSchoolDetails(selectedSK.school_id)?.jenjang || 'TK'} ABA</p>
                      <div className="h-16"></div>
                      <p className="font-bold underline uppercase">{getSchoolDetails(selectedSK.school_id)?.kepala_sekolah || 'Kepala Sekolah'}</p>
                      <p className="text-[8px] text-slate-500 font-mono">NIP/NBM. {getSchoolDetails(selectedSK.school_id)?.nip_kepala || '-'}</p>
                    </div>

                    <div className="w-56 text-center">
                      <p className="text-[9.5px] text-slate-500 font-mono">Ditetapkan di: Klaten</p>
                      <p className="text-[9.5px] text-slate-500 font-mono">Pada tanggal : {new Date(selectedSK.tanggal_sk).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      <p className="font-bold mt-2 text-green-950 uppercase leading-tight text-[10px]">PIMPINAN DAERAH AISYIYAH KABUPATEN KLATEN</p>
                      <p className="font-semibold text-[9px] text-slate-600 uppercase mt-0.5">Majelis PAUD, Dasar & Menengah</p>
                      <div className="h-14 flex items-center justify-center relative my-1">
                        {/* Fake stamp layout */}
                        <div className="border-2 border-emerald-500/25 bg-emerald-50/10 rounded-full text-[6px] p-2 rotate-12 w-24 h-24 flex flex-col items-center justify-center uppercase font-bold text-emerald-700/30 border-dashed absolute leading-none">
                          <span className="text-[5px]">STEMPEL RESMI</span>
                          <span>PDA PAUD</span>
                          <span>KLATEN</span>
                        </div>
                      </div>
                      <p className="font-bold underline uppercase">{getSchoolDetails(selectedSK.school_id)?.ketua_pda || 'Ensapt Sri Mulat, S.Psi., M.Si.Psikolog'}</p>
                      <p className="text-[8px] text-slate-500 font-mono">NBM. 1243524</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action bar inside Preview Modal */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2 shrink-0 print:hidden">
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="bg-white border border-slate-200 text-slate-600 font-bold px-4 py-2 rounded-xl text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Tutup Pratinjau
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
}
