/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { School, User } from '../types';
import { ExportEngine } from './ExportEngine';
import { getDirectDriveImageUrl } from '../lib/api';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Mail,
  Phone,
  Globe,
  CheckCircle,
  FileSpreadsheet,
  X,
  FileText,
  School as SchoolIcon,
  Loader2,
  Building,
  Calendar,
  Award,
  Eye,
  EyeOff,
  Key,
  Shield,
  Printer,
  Download
} from 'lucide-react';

interface SchoolsViewProps {
  user: User;
  schools: School[];
  onCreate: (data: Partial<School>) => Promise<void>;
  onUpdate: (id: string, data: Partial<School>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function SchoolsView({
  user,
  schools,
  onCreate,
  onUpdate,
  onDelete
}: SchoolsViewProps) {
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const isAdmin = user.role === 'ADMIN';
  const isPetugas = user.role === 'PETUGAS';

  // Filter schools based on role
  const allowedSchools = isPetugas
    ? schools.filter(s => s.id === user.school_id)
    : schools;

  const [search, setSearch] = useState('');
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showSchoolPetugasPass, setShowSchoolPetugasPass] = useState(false);
  const [revealMySchoolPass, setRevealMySchoolPass] = useState(false);
  const [revealedSchoolPasswords, setRevealedSchoolPasswords] = useState<Record<string, boolean>>({});
  const [selectedSchoolForView, setSelectedSchoolForView] = useState<School | null>(null);

  // Form Fields State
  const [formFields, setFormFields] = useState<Partial<School>>({
    name: '',
    npsn: '',
    nsm: '',
    status: 'Swasta',
    jenjang: 'TK',
    alamat: '',
    kelurahan: '',
    kecamatan: '',
    kabupaten: 'Kota Malang',
    provinsi: 'Jawa Timur',
    kode_pos: '',
    telepon: '',
    email: '',
    website: '',
    kepala_sekolah: '',
    nip_kepala: '',
    akreditasi: 'A',
    status_tanah: 'Milik Sendiri',
    status_gedung: 'Milik Sendiri',
    luas_tanah: 0,
    luas_bangunan: 0,
    jumlah_ruang: 1,
    jumlah_toilet: 1,
    tahun_berdiri: '',
    tahun_operasional: '',
    latitude: '',
    longitude: '',
    foto_url: '',
    logo_url: '',
    status_aktif: 'Aktif',
    password_petugas: '',
    username_petugas: '',
    ranting_aisyiyah: '',
    ketua_ranting: '',
    ketua_pda: '',
    ketua_pca: ''
  });

  const filteredSchools = allowedSchools.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.npsn.toLowerCase().includes(search.toLowerCase()) ||
    s.kecamatan.toLowerCase().includes(search.toLowerCase())
  );

  const openCreateForm = () => {
    setEditingSchool(null);
    setFormFields({
      name: '',
      npsn: '',
      nsm: '',
      status: 'Swasta',
      jenjang: 'TK',
      alamat: '',
      kelurahan: '',
      kecamatan: '',
      kabupaten: 'Kota Malang',
      provinsi: 'Jawa Timur',
      kode_pos: '',
      telepon: '',
      email: '',
      website: '',
      kepala_sekolah: '',
      nip_kepala: '',
      akreditasi: 'A',
      status_tanah: 'Milik Sendiri',
      status_gedung: 'Milik Sendiri',
      luas_tanah: 200,
      luas_bangunan: 150,
      jumlah_ruang: 4,
      jumlah_toilet: 2,
      tahun_berdiri: '2010',
      tahun_operasional: '2011',
      latitude: '-7.98',
      longitude: '112.62',
      foto_url: '',
      logo_url: '',
      status_aktif: 'Aktif',
      password_petugas: '',
      username_petugas: '',
      ranting_aisyiyah: '',
      ketua_ranting: '',
      ketua_pda: '',
      ketua_pca: ''
    });
    setIsFormOpen(true);
  };

  const openPetugasCreateForm = () => {
    setEditingSchool(null);
    setFormFields({
      id: user.school_id,
      name: user.name.replace(/^Petugas\s+/i, '') || '',
      npsn: '',
      nsm: '',
      status: 'Swasta',
      jenjang: 'TK',
      alamat: '',
      kelurahan: '',
      kecamatan: '',
      kabupaten: 'Klaten',
      provinsi: 'Jawa Tengah',
      kode_pos: '',
      telepon: user.phone || '',
      email: user.email || '',
      website: '',
      kepala_sekolah: '',
      nip_kepala: '',
      akreditasi: 'A',
      status_tanah: 'Milik Sendiri',
      status_gedung: 'Milik Sendiri',
      luas_tanah: 200,
      luas_bangunan: 150,
      jumlah_ruang: 4,
      jumlah_toilet: 2,
      tahun_berdiri: '2010',
      tahun_operasional: '2011',
      latitude: '',
      longitude: '',
      foto_url: '',
      logo_url: '',
      status_aktif: 'Aktif',
      password_petugas: '',
      username_petugas: '',
      ranting_aisyiyah: '',
      ketua_ranting: '',
      ketua_pda: '',
      ketua_pca: ''
    });
    setIsFormOpen(true);
  };

  const openEditForm = (school: School) => {
    setEditingSchool(school);
    setFormFields({ ...school });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const sanitizedFields = {
      ...formFields,
      foto_url: getDirectDriveImageUrl(formFields.foto_url),
      logo_url: getDirectDriveImageUrl(formFields.logo_url)
    };
    try {
      if (editingSchool) {
        await onUpdate(editingSchool.id, sanitizedFields);
      } else {
        await onCreate(sanitizedFields);
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

  const [pdfGenerating, setPdfGenerating] = useState(false);

  const handleExportSingleExcel = async (school: School) => {
    try {
      await ExportEngine.exportSchoolProfileToExcel(school);
    } catch (err) {
      console.error('Gagal ekspor Excel:', err);
    }
  };

  const handleExportSinglePdf = async (school: School) => {
    setPdfGenerating(true);
    try {
      await ExportEngine.exportSchoolProfileToPdf('school-print-profile-content', school.name);
    } catch (err) {
      console.error('Gagal ekspor PDF:', err);
    } finally {
      setPdfGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {isPetugas ? (
        // DEDICATED PROFILE VIEW FOR PETUGAS SEKOLAH (SCHOOL OFFICER)
        (() => {
          const mySchool = schools.find(s => s.id === user.school_id);
          return mySchool ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden animate-fade-in">
              {/* Cover Banner */}
              <div className="h-64 bg-slate-100 relative overflow-hidden">
                <img
                  src={getDirectDriveImageUrl(mySchool.foto_url) || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=1200'}
                  alt={mySchool.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="flex items-center gap-4 text-white">
                    {mySchool.logo_url && (
                      <div className="w-16 h-16 bg-white rounded-2xl shadow-lg border border-slate-200/20 p-1 shrink-0 overflow-hidden flex items-center justify-center">
                        <img
                          src={getDirectDriveImageUrl(mySchool.logo_url)}
                          alt="Logo Sekolah"
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="bg-brand-600 text-white font-bold px-2.5 py-0.5 rounded-lg text-[10px] font-sans shadow-sm">
                          Terakreditasi {mySchool.akreditasi || 'Belum Terakreditasi'}
                        </span>
                        <span className="bg-white/20 backdrop-blur-md text-white font-mono text-[9px] px-2 py-0.5 rounded-md uppercase font-semibold">
                          {mySchool.status || 'Swasta'}
                        </span>
                      </div>
                      <h2 className="text-xl md:text-2xl font-bold tracking-tight font-sans">
                        {mySchool.name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-slate-200">
                        <span>NPSN: <b className="text-white font-semibold">{mySchool.npsn || '-'}</b></span>
                        <span>NSM: <b className="text-white font-semibold">{mySchool.nsm || '-'}</b></span>
                        <span>Jenjang: <b className="text-white font-semibold uppercase">{mySchool.jenjang || '-'}</b></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      id="petugas-view-school"
                      onClick={() => setSelectedSchoolForView(mySchool)}
                      className="bg-brand-600 hover:bg-brand-700 text-white py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.02] cursor-pointer font-sans"
                    >
                      <Eye className="w-4 h-4" />
                      Lihat & Cetak Profil
                    </button>
                    <button
                      id="petugas-edit-school"
                      onClick={() => openEditForm(mySchool)}
                      className="bg-white hover:bg-slate-50 text-slate-800 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.02] cursor-pointer font-sans border border-slate-200/50"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-brand-600" />
                      Edit Profil Sekolah
                    </button>
                  </div>
                </div>
              </div>

              {/* Profile Grid (Bento style) */}
              <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Identitas & Pimpinan */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2.5">
                    <SchoolIcon className="w-4 h-4 text-brand-600" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 font-sans">Pimpinan & Legalitas</h3>
                  </div>
                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400 font-sans">Kepala Sekolah</span>
                      <span className="font-semibold text-slate-800 text-sm font-sans">{mySchool.kepala_sekolah || '-'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400 font-sans">NIP Kepala</span>
                      <span className="font-mono text-slate-700">{mySchool.nip_kepala || '-'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400 font-sans">Tahun Berdiri</span>
                      <span className="font-semibold text-slate-800 font-sans">{mySchool.tahun_berdiri || '-'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400 font-sans">Tahun Operasional</span>
                      <span className="font-semibold text-slate-800 font-sans">{mySchool.tahun_operasional || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Kontak & Alamat */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2.5">
                    <MapPin className="w-4 h-4 text-brand-600" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 font-sans">Alamat & Kontak</h3>
                  </div>
                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400 font-sans">Alamat Lengkap</span>
                      <span className="text-slate-800 leading-relaxed font-sans block">
                        {mySchool.alamat || '-'}
                        {mySchool.kelurahan && `, Kel. ${mySchool.kelurahan}`}
                        {mySchool.kecamatan && `, Kec. ${mySchool.kecamatan}`}
                        {mySchool.kabupaten && `, ${mySchool.kabupaten}`}
                        {mySchool.provinsi && `, ${mySchool.provinsi}`}
                        {mySchool.kode_pos && ` (${mySchool.kode_pos})`}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400 font-sans">Telepon</span>
                        <span className="font-semibold text-slate-800 font-mono">{mySchool.telepon || '-'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400 font-sans">Email</span>
                        <span className="font-semibold text-slate-800 truncate block font-sans" title={mySchool.email}>{mySchool.email || '-'}</span>
                      </div>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400 font-sans">Website</span>
                      {mySchool.website ? (
                        <a href={mySchool.website.startsWith('http') ? mySchool.website : `https://${mySchool.website}`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline font-medium font-sans">
                          {mySchool.website}
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400 font-sans">Latitude</span>
                        <span className="font-mono text-slate-600">{mySchool.latitude || '-'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400 font-sans">Longitude</span>
                        <span className="font-mono text-slate-600">{mySchool.longitude || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Sarana & Prasarana */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2.5">
                    <Building className="w-4 h-4 text-brand-600" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 font-sans">Sarana & Prasarana</h3>
                  </div>
                  <div className="space-y-3.5 text-xs">
                    <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-100 text-center">
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-slate-400 font-sans">Luas Tanah</span>
                        <span className="text-sm font-bold text-slate-800 font-mono">{mySchool.luas_tanah || 0} m²</span>
                      </div>
                      <div className="border-l border-slate-100">
                        <span className="block text-[9px] uppercase font-bold text-slate-400 font-sans">Luas Bangunan</span>
                        <span className="text-sm font-bold text-slate-800 font-mono">{mySchool.luas_bangunan || 0} m²</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-100 text-center">
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-slate-400 font-sans">R. Kelas</span>
                        <span className="text-sm font-bold text-slate-800 font-mono">{mySchool.jumlah_ruang || 0}</span>
                      </div>
                      <div className="border-l border-slate-100">
                        <span className="block text-[9px] uppercase font-bold text-slate-400 font-sans">Toilet</span>
                        <span className="text-sm font-bold text-slate-800 font-mono">{mySchool.jumlah_toilet || 0}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400 font-sans">Status Tanah</span>
                        <span className="font-semibold text-slate-700 font-sans">{mySchool.status_tanah || '-'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400 font-sans">Status Gedung</span>
                        <span className="font-semibold text-slate-700 font-sans">{mySchool.status_gedung || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Petugas Login Account Info */}
              <div className="mx-6 md:mx-8 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider font-sans flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-brand-600" />
                    Kredensial Login Petugas Sekolah
                  </h4>
                  <p className="text-[11px] text-slate-500 font-sans">
                    Username dan password berikut dapat digunakan petugas khusus untuk login mandiri.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 flex flex-col">
                    <span className="text-[9px] text-slate-400 font-sans uppercase font-semibold">Username</span>
                    <span className="text-slate-800 font-semibold font-mono">{mySchool.username_petugas || mySchool.npsn || 'petugas'}</span>
                  </div>
                  <div className="bg-white pl-3 pr-2 py-1 rounded-xl border border-slate-200 flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 font-sans uppercase font-semibold">Password</span>
                      <span className="text-slate-800 font-semibold font-mono">
                        {mySchool.password_petugas ? (revealMySchoolPass ? mySchool.password_petugas : '••••••••') : '(Password Global)'}
                      </span>
                    </div>
                    {mySchool.password_petugas && (
                      <button
                        type="button"
                        onClick={() => setRevealMySchoolPass(!revealMySchoolPass)}
                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        title={revealMySchoolPass ? "Sembunyikan password" : "Tampilkan password"}
                      >
                        {revealMySchoolPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-8 md:p-12 text-center max-w-xl mx-auto space-y-5 shadow-sm animate-fade-in my-8">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto border border-amber-100 text-amber-600">
                <SchoolIcon className="w-8 h-8 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-slate-800 text-base font-sans">Profil Sekolah Belum Terdaftar</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Sistem mendeteksi Anda belum mengisi profil lengkap sekolah Anda. Silakan isi data identitas, alamat, sarana prasarana, serta kepala sekolah Anda sekarang agar data dapat terekam dan tersinkronisasi dengan baik.
                </p>
              </div>
              <button
                id="petugas-init-school"
                onClick={openPetugasCreateForm}
                className="bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center gap-2 mx-auto shadow-lg shadow-brand-600/15 hover:shadow-brand-600/25 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Isi Profil Sekolah Sekarang
              </button>
            </div>
          );
        })()
      ) :
        // MULTI-SCHOOL DIRECTORY VIEW FOR SUPER_ADMIN & ADMIN
        <>
          {/* Header operations */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                id="school-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama sekolah, NPSN atau kecamatan..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans shadow-sm"
              />
            </div>

            {isSuperAdmin && (
              <button
                id="add-school-btn"
                onClick={openCreateForm}
                className="bg-brand-600 hover:bg-brand-700 text-white py-2 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-brand-600/10 hover:shadow-brand-600/25 transition-all cursor-pointer font-sans"
              >
                <Plus className="w-4 h-4" />
                Tambah Sekolah Baru
              </button>
            )}
          </div>

          {/* Grid listing */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSchools.map((school) => (
              <div
                key={school.id}
                id={`school-card-${school.id}`}
                className="bg-white rounded-3xl border border-slate-200/75 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow group animate-fade-in"
              >
                {/* Banner Photo */}
                <div className="h-44 bg-slate-100 relative overflow-hidden">
                  <img
                    src={getDirectDriveImageUrl(school.foto_url) || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800'}
                    alt={school.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-brand-800 border border-brand-100 font-bold px-2.5 py-1 rounded-lg text-[10px] font-sans shadow-sm">
                    Accreditation: {school.akreditasi}
                  </span>
                  <span className="absolute top-3 right-3 bg-slate-900/80 text-white font-mono text-[9px] px-2 py-0.5 rounded-md uppercase font-semibold">
                    {school.status}
                  </span>
                  {school.logo_url && (
                    <div className="absolute bottom-3 right-3 w-10 h-10 bg-white rounded-xl shadow-md border border-slate-150 flex items-center justify-center p-0.5 overflow-hidden">
                      <img
                        src={getDirectDriveImageUrl(school.logo_url)}
                        alt="Logo"
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>

                {/* School details body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm leading-snug font-sans group-hover:text-brand-700 transition-colors">
                      {school.name}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 font-mono text-[10px] text-slate-400">
                      <span>NPSN: <b className="text-slate-600 font-semibold">{school.npsn}</b></span>
                      <span>NSM: <b className="text-slate-600 font-semibold">{school.nsm}</b></span>
                    </div>

                    <div className="mt-3.5 space-y-2 text-xs text-slate-500 font-sans">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 text-[11px] leading-relaxed">
                          {school.alamat}, Kel. {school.kelurahan}, Kec. {school.kecamatan}, {school.kabupaten}
                        </span>
                      </div>
                      {school.telepon && (
                        <div className="flex items-center gap-2 text-[11px]">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{school.telepon}</span>
                        </div>
                      )}
                      {school.email && (
                        <div className="flex items-center gap-2 text-[11px]">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{school.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Extra Infrastructure Specs */}
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 grid grid-cols-3 text-center">
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-slate-400 font-sans">R. Kelas</span>
                      <span className="text-xs font-bold text-slate-700 font-mono">{school.jumlah_ruang}</span>
                    </div>
                    <div className="border-x border-slate-200/50">
                      <span className="block text-[9px] uppercase font-bold text-slate-400 font-sans">Luas Bang</span>
                      <span className="text-xs font-bold text-slate-700 font-mono">{school.luas_bangunan}m²</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-slate-400 font-sans">Toilet</span>
                      <span className="text-xs font-bold text-slate-700 font-mono">{school.jumlah_toilet}</span>
                    </div>
                  </div>

                  {/* Credentials (visible only to Admin, Super Admin, or the school's own Petugas) */}
                  {(isSuperAdmin || isAdmin || (isPetugas && school.id === user.school_id)) && (school.username_petugas || school.password_petugas) && (
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs space-y-1.5 animate-fade-in">
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-400 uppercase font-bold tracking-wider">
                        <Key className="w-3.5 h-3.5 text-brand-500" />
                        Akun Login Petugas Khusus
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                        <div className="bg-white px-2 py-1 rounded-lg border border-slate-100">
                          <span className="text-slate-400 font-sans text-[10px] block font-semibold uppercase">Username</span>
                          <span className="text-slate-700 font-medium truncate block" title={school.username_petugas}>{school.username_petugas || '-'}</span>
                        </div>
                        <div className="bg-white px-2 py-1 rounded-lg border border-slate-100 flex items-center justify-between gap-1.5">
                          <div className="min-w-0 flex-1">
                            <span className="text-slate-400 font-sans text-[10px] block font-semibold uppercase">Password</span>
                            <span className="text-slate-700 font-medium truncate block font-mono" title={school.password_petugas}>
                              {school.password_petugas ? (revealedSchoolPasswords[school.id] ? school.password_petugas : '••••••••') : '(Global)'}
                            </span>
                          </div>
                          {school.password_petugas && (
                            <button
                              type="button"
                              onClick={() => setRevealedSchoolPasswords(prev => ({ ...prev, [school.id]: !prev[school.id] }))}
                              className="p-1 hover:bg-slate-50 rounded text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer"
                              title={revealedSchoolPasswords[school.id] ? "Sembunyikan password" : "Tampilkan password"}
                            >
                              {revealedSchoolPasswords[school.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="border-t border-slate-100 pt-3.5 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 font-sans">
                      Kepala: <b className="text-slate-600 font-semibold">{school.kepala_sekolah}</b>
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        id={`view-school-${school.id}`}
                        onClick={() => setSelectedSchoolForView(school)}
                        className="p-1.5 bg-slate-50 hover:bg-brand-50 text-slate-500 hover:text-brand-700 rounded-lg border border-slate-200 hover:border-brand-100 transition-colors cursor-pointer"
                        title="Lihat & Cetak Profil"
                      >
                        <Eye className="w-3.5 h-3.5 text-brand-600" />
                      </button>
                      {(isSuperAdmin || (isPetugas && school.id === user.school_id)) && (
                        <button
                          id={`edit-school-${school.id}`}
                          onClick={() => openEditForm(school)}
                          className="p-1.5 bg-slate-50 hover:bg-brand-50 text-slate-500 hover:text-brand-700 rounded-lg border border-slate-200 hover:border-brand-100 transition-colors cursor-pointer"
                          title="Edit profil sekolah"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isSuperAdmin && (
                        <button
                          id={`delete-school-${school.id}`}
                          onClick={() => handleDelete(school.id)}
                          className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg border border-slate-200 hover:border-rose-100 transition-colors cursor-pointer"
                          title="Hapus Sekolah"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isAdmin && (
                        <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                          Read-Only
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredSchools.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-400 text-xs font-sans">
                Sekolah yang Anda cari tidak ditemukan.
              </div>
            )}
          </div>
        </>
      }

      {/* CREATE / EDIT SEKOLAH MODAL */}
      {isFormOpen && createPortal(
        <div id="school-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden animate-fade-in">
          <div className="bg-white w-full max-h-[85vh] sm:max-h-[90vh] rounded-2xl sm:rounded-3xl max-w-4xl shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2 text-brand-700">
                <SchoolIcon className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-800 text-sm font-sans">
                  {editingSchool ? 'Edit Profil Lengkap Sekolah' : 'Isi Profil Lengkap Sekolah Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
              {/* Fields Container */}
              <div className="p-4 sm:p-6 md:p-8 space-y-8 flex-1 overflow-y-auto no-scrollbar font-sans text-xs text-slate-700">
                <div className="max-w-4xl mx-auto w-full space-y-8">
                  {/* Live Kop Surat Preview */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                      Pratinjau Kop Surat Resmi Sekolah
                    </span>
                    <div className="flex items-center gap-4 border-b-2 border-slate-700 pb-3 bg-white p-3.5 rounded-xl shadow-sm">
                      <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0 overflow-hidden">
                        {formFields.logo_url ? (
                          <img 
                            src={getDirectDriveImageUrl(formFields.logo_url)} 
                            alt="Logo Preview" 
                            className="w-full h-full object-contain p-0.5 bg-white"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          formFields.jenjang || 'TK'
                        )}
                      </div>
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <h4 className="text-[9px] font-extrabold text-slate-900 uppercase truncate tracking-wider leading-none">
                          PIMPINAN DAERAH AISYIYAH KOTA MALANG
                        </h4>
                        <h3 className="text-sm font-black text-brand-700 uppercase truncate leading-tight">
                          {formFields.name || 'NAMA SEKOLAH'}
                        </h3>
                        <p className="text-[9px] text-slate-500 font-mono truncate">
                          Alamat: {formFields.alamat || 'Alamat sekolah...'} {formFields.kelurahan ? `, Kel. ${formFields.kelurahan}` : ''} {formFields.kecamatan ? `, Kec. ${formFields.kecamatan}` : ''} {formFields.kabupaten ? `, ${formFields.kabupaten}` : ''}
                        </p>
                        <p className="text-[8px] text-slate-400 truncate leading-none">
                          Telp/HP: {formFields.telepon || '-'} | Email: {formFields.email || '-'} | Website: {formFields.website || '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bagian 1: Informasi Identitas Utama */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-brand-700 uppercase tracking-wide border-b border-slate-100 pb-1.5 font-sans flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-brand-500" />
                      1. Informasi Identitas Utama
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Nama Sekolah</label>
                        <input
                          type="text"
                          required
                          value={formFields.name || ''}
                          onChange={(e) => setFormFields({ ...formFields, name: e.target.value })}
                          placeholder="Contoh: TK Aisyiyah Bustanul Athfal 1 Malang"
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">NPSN</label>
                        <input
                          type="text"
                          required
                          value={formFields.npsn || ''}
                          onChange={(e) => setFormFields({ ...formFields, npsn: e.target.value })}
                          placeholder="Contoh: 20554101"
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">NSM</label>
                        <input
                          type="text"
                          required
                          value={formFields.nsm || ''}
                          onChange={(e) => setFormFields({ ...formFields, nsm: e.target.value })}
                          placeholder="Contoh: 11123305..."
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Jenjang</label>
                        <select
                          value={formFields.jenjang || 'TK'}
                          onChange={(e) => setFormFields({ ...formFields, jenjang: e.target.value as any })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans"
                        >
                          <option value="TK">Taman Kanak-kanak (TK)</option>
                          <option value="PAUD">PAUD Terpadu</option>
                          <option value="KB">Kelompok Bermain (KB)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Status Sekolah</label>
                        <select
                          value={formFields.status || 'Swasta'}
                          onChange={(e) => setFormFields({ ...formFields, status: e.target.value as any })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans"
                        >
                          <option value="Swasta">Swasta</option>
                          <option value="Negeri">Negeri</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Akreditasi</label>
                        <select
                          value={formFields.akreditasi || 'A'}
                          onChange={(e) => setFormFields({ ...formFields, akreditasi: e.target.value as any })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans"
                        >
                          <option value="A">Terakreditasi A</option>
                          <option value="B">Terakreditasi B</option>
                          <option value="C">Terakreditasi C</option>
                          <option value="Belum Terakreditasi">Belum Terakreditasi</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Status Keaktifan Sekolah</label>
                        <select
                          value={formFields.status_aktif || 'Aktif'}
                          onChange={(e) => setFormFields({ ...formFields, status_aktif: e.target.value as any })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans"
                        >
                          <option value="Aktif">Aktif</option>
                          <option value="Tidak Aktif">Tidak Aktif</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Thn Berdiri</label>
                          <input
                            type="text"
                            value={formFields.tahun_berdiri || ''}
                            onChange={(e) => setFormFields({ ...formFields, tahun_berdiri: e.target.value })}
                            placeholder="Contoh: 1985"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Thn Operasional</label>
                          <input
                            type="text"
                            value={formFields.tahun_operasional || ''}
                            onChange={(e) => setFormFields({ ...formFields, tahun_operasional: e.target.value })}
                            placeholder="Contoh: 1987"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Bagian 2: Alamat & Kontak Wilayah */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-brand-700 uppercase tracking-wide border-b border-slate-100 pb-1.5 font-sans flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-brand-500" />
                      2. Alamat & Kontak Wilayah
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Alamat Jalan</label>
                        <input
                          type="text"
                          required
                          value={formFields.alamat || ''}
                          onChange={(e) => setFormFields({ ...formFields, alamat: e.target.value })}
                          placeholder="Contoh: Jl. Brigjend Slamet Riadi No. 12"
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Kecamatan</label>
                        <input
                          type="text"
                          required
                          value={formFields.kecamatan || ''}
                          onChange={(e) => setFormFields({ ...formFields, kecamatan: e.target.value })}
                          placeholder="Contoh: Klojen"
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Kelurahan</label>
                        <input
                          type="text"
                          required
                          value={formFields.kelurahan || ''}
                          onChange={(e) => setFormFields({ ...formFields, kelurahan: e.target.value })}
                          placeholder="Contoh: Oro-oro Dowo"
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Kabupaten</label>
                        <input
                          type="text"
                          required
                          value={formFields.kabupaten || 'Klaten'}
                          onChange={(e) => setFormFields({ ...formFields, kabupaten: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Provinsi</label>
                          <input
                            type="text"
                            required
                            value={formFields.provinsi || 'Jawa Tengah'}
                            onChange={(e) => setFormFields({ ...formFields, provinsi: e.target.value })}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Kode Pos</label>
                          <input
                            type="text"
                            value={formFields.kode_pos || ''}
                            onChange={(e) => setFormFields({ ...formFields, kode_pos: e.target.value })}
                            placeholder="Contoh: 57438"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Email Sekolah</label>
                        <input
                          type="email"
                          value={formFields.email || ''}
                          onChange={(e) => setFormFields({ ...formFields, email: e.target.value })}
                          placeholder="Contoh: aba1malang@gmail.com"
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Telepon Sekolah</label>
                        <input
                          type="text"
                          value={formFields.telepon || ''}
                          onChange={(e) => setFormFields({ ...formFields, telepon: e.target.value })}
                          placeholder="Contoh: 0272-321122"
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans font-mono"
                        />
                      </div>

                      <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-1">
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Website</label>
                          <input
                            type="text"
                            value={formFields.website || ''}
                            onChange={(e) => setFormFields({ ...formFields, website: e.target.value })}
                            placeholder="Contoh: www.tkaba.sch.id"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Latitude (Koordinat)</label>
                          <input
                            type="text"
                            value={formFields.latitude || ''}
                            onChange={(e) => setFormFields({ ...formFields, latitude: e.target.value })}
                            placeholder="-7.6912"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Longitude (Koordinat)</label>
                          <input
                            type="text"
                            value={formFields.longitude || ''}
                            onChange={(e) => setFormFields({ ...formFields, longitude: e.target.value })}
                            placeholder="110.6124"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Bagian 3: Detail Gedung, Sarana Prasarana & Pimpinan */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-brand-700 uppercase tracking-wide border-b border-slate-100 pb-1.5 font-sans flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-brand-500" />
                      3. Pimpinan, Sarana & Prasarana
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Nama Kepala Sekolah</label>
                        <input
                          type="text"
                          required
                          value={formFields.kepala_sekolah || ''}
                          onChange={(e) => setFormFields({ ...formFields, kepala_sekolah: e.target.value })}
                          placeholder="Contoh: Wahyuningsih, S.Pd"
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">NIP Kepala</label>
                        <input
                          type="text"
                          value={formFields.nip_kepala || ''}
                          onChange={(e) => setFormFields({ ...formFields, nip_kepala: e.target.value })}
                          placeholder="Contoh: 19800512..."
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Jumlah Ruangan Kelas</label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={formFields.jumlah_ruang || 0}
                          onChange={(e) => setFormFields({ ...formFields, jumlah_ruang: Number(e.target.value) })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Jumlah Toilet</label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={formFields.jumlah_toilet || 0}
                          onChange={(e) => setFormFields({ ...formFields, jumlah_toilet: Number(e.target.value) })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Luas Tanah (m²)</label>
                        <input
                          type="number"
                          min="0"
                          value={formFields.luas_tanah || 0}
                          onChange={(e) => setFormFields({ ...formFields, luas_tanah: Number(e.target.value) })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Luas Bangunan (m²)</label>
                        <input
                          type="number"
                          min="0"
                          value={formFields.luas_bangunan || 0}
                          onChange={(e) => setFormFields({ ...formFields, luas_bangunan: Number(e.target.value) })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Status Kepemilikan Tanah</label>
                        <select
                          value={formFields.status_tanah || 'Milik Sendiri'}
                          onChange={(e) => setFormFields({ ...formFields, status_tanah: e.target.value as any })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans"
                        >
                          <option value="Milik Sendiri">Milik Sendiri</option>
                          <option value="Sewa">Sewa</option>
                          <option value="Wakaf">Wakaf</option>
                          <option value="Pinjam Pakai">Pinjam Pakai</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Status Kepemilikan Gedung</label>
                        <select
                          value={formFields.status_gedung || 'Milik Sendiri'}
                          onChange={(e) => setFormFields({ ...formFields, status_gedung: e.target.value as any })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans"
                        >
                          <option value="Milik Sendiri">Milik Sendiri</option>
                          <option value="Sewa">Sewa</option>
                          <option value="Wakaf">Wakaf</option>
                          <option value="Pinjam Pakai">Pinjam Pakai</option>
                        </select>
                      </div>

                      {/* Pimpinan Ranting Aisyiyah */}
                      <div className="sm:col-span-3 border-t border-slate-100 pt-3 mt-1">
                        <label className="block text-xs font-bold text-slate-700 mb-2 font-sans">
                          Pimpinan Ranting Aisyiyah
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">
                              Ranting Aisyiyah (Nama Desa/Kelurahan)
                            </label>
                            <input
                              type="text"
                              value={formFields.ranting_aisyiyah || ''}
                              onChange={(e) => setFormFields({ ...formFields, ranting_aisyiyah: e.target.value })}
                              placeholder="Contoh: Ranting Gergunung"
                              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans"
                            />
                            <p className="text-[9px] text-slate-400 mt-0.5">
                              Nama Desa/ Kelurahan sesuai alamat sekolah
                            </p>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">
                              Nama Ketua Pimpinan Ranting Aisyiyah
                            </label>
                            <input
                              type="text"
                              value={formFields.ketua_ranting || ''}
                              onChange={(e) => setFormFields({ ...formFields, ketua_ranting: e.target.value })}
                              placeholder="Masukkan nama ketua ranting"
                              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans"
                            />
                          </div>
                        </div>
                      </div>

                      {/* PDA and PCA Majelis PAUD Dasar dan Menengah */}
                      <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">
                            Nama Ketua PDA Majelis PAUD Dasar dan Menengah
                          </label>
                          <input
                            type="text"
                            value={formFields.ketua_pda || ''}
                            onChange={(e) => setFormFields({ ...formFields, ketua_pda: e.target.value })}
                            placeholder="Masukkan nama ketua PDA Majelis"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">
                            Nama PCA Majelis PAUD Dasar dan Menengah
                          </label>
                          <input
                            type="text"
                            value={formFields.ketua_pca || ''}
                            onChange={(e) => setFormFields({ ...formFields, ketua_pca: e.target.value })}
                            placeholder="Masukkan nama PCA Majelis"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Foto URL Banner Utama</label>
                        <input
                          type="text"
                          value={formFields.foto_url || ''}
                          onChange={(e) => setFormFields({ ...formFields, foto_url: e.target.value })}
                          placeholder="https://images.unsplash.com/photo-..."
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans font-mono"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans">Logo URL Sekolah (Google Drive / Lainnya)</label>
                        <input
                          type="text"
                          value={formFields.logo_url || ''}
                          onChange={(e) => setFormFields({ ...formFields, logo_url: e.target.value })}
                          placeholder="Contoh: https://drive.google.com/file/d/.../view"
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans font-mono"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans flex items-center justify-between">
                          <span>Username Petugas Sekolah (Khusus)</span>
                          {isPetugas && (
                            <span className="text-[10px] text-brand-600 font-medium font-sans">Dapat Anda Ubah</span>
                          )}
                        </label>
                        <input
                          type="text"
                          value={formFields.username_petugas || ''}
                          onChange={(e) => setFormFields({ ...formFields, username_petugas: e.target.value })}
                          placeholder="Masukkan username khusus petugas (opsional)"
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans font-mono"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Jika kosong, default menggunakan NPSN, Email, atau ID Sekolah.
                        </p>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1 font-sans flex items-center justify-between">
                          <span>Password Petugas Sekolah (Khusus)</span>
                          <span className="text-[10px] text-brand-600 font-medium font-sans">Sembunyikan Tampilan</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showSchoolPetugasPass ? "text" : "password"}
                            value={formFields.password_petugas || ''}
                            onChange={(e) => setFormFields({ ...formFields, password_petugas: e.target.value })}
                            placeholder="Masukkan password khusus petugas (opsional)"
                            className="w-full border border-slate-200 rounded-xl pl-3 pr-10 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSchoolPetugasPass(!showSchoolPetugasPass)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showSchoolPetugasPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Jika kosong, default menggunakan password petugas global di Pengaturan.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            {/* Form Actions */}
            <div className="px-4 sm:px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="h-10 px-5 sm:px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={loading}
                className="h-10 px-5 sm:px-6 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Simpan Data
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
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto animate-bounce">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-bold text-slate-800 text-sm font-sans">Hapus Data Sekolah?</h4>
              <p className="text-xs text-slate-500 font-sans leading-relaxed">
                Tindakan ini tidak dapat dibatalkan. Seluruh data sekolah, profil guru, data murid, dan laporan terkait akan dihapus secara permanen.
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

      {/* DETAILED SCHOOL PROFILE VIEW & PRINT/EXPORT MODAL */}
      {selectedSchoolForView && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden no-print">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full max-h-[85vh] sm:max-h-[90vh] shadow-2xl border border-slate-100 relative animate-fade-in no-print flex flex-col overflow-hidden">
            
            {/* Modal Controls Bar */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-2">
                <SchoolIcon className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-800 text-sm font-sans">Detail Profil Lengkap</h3>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Print button */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer font-sans border border-brand-100"
                  title="Cetak Profil / Save as PDF melalui browser"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / PDF (Browser)</span>
                </button>

                {/* Save PDF button */}
                <button
                  type="button"
                  onClick={() => handleExportSinglePdf(selectedSchoolForView)}
                  disabled={pdfGenerating}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer font-sans disabled:opacity-50"
                  title="Unduh file PDF beresolusi tinggi"
                >
                  {pdfGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>Ekspor PDF</span>
                </button>

                {/* Export Excel button */}
                <button
                  type="button"
                  onClick={() => handleExportSingleExcel(selectedSchoolForView)}
                  className="px-3.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer font-sans"
                  title="Unduh file Excel lengkap dengan format formal"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Ekspor Excel</span>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setSelectedSchoolForView(null)}
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer ml-2"
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
                #school-print-profile-content, #school-print-profile-content * {
                  visibility: visible !important;
                }
                #school-print-profile-content {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 20mm !important;
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

            {/* Printable Area Wrapper */}
            <div id="school-print-profile-content" className="p-5 sm:p-8 md:p-12 space-y-8 bg-white text-slate-800 overflow-y-auto flex-1 no-scrollbar">
              
              {/* Kop Surat / Formal Header */}
              <div className="flex items-center gap-6 border-b-4 border-slate-800 pb-5">
                <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-md shrink-0 print:border print:border-slate-300 overflow-hidden">
                  {selectedSchoolForView.logo_url ? (
                    <img 
                      src={getDirectDriveImageUrl(selectedSchoolForView.logo_url)} 
                      alt="Logo Sekolah" 
                      className="w-full h-full object-contain p-1 bg-white" 
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    selectedSchoolForView.jenjang || 'TK'
                  )}
                </div>
                <div className="space-y-1">
                  <h2 className="text-sm font-extrabold tracking-wider text-slate-900 uppercase font-sans leading-none">
                    PIMPINAN DAERAH AISYIYAH KOTA MALANG
                  </h2>
                  <h1 className="text-lg font-black tracking-tight text-brand-700 uppercase font-sans leading-none">
                    {selectedSchoolForView.name}
                  </h1>
                  <p className="text-xs text-slate-500 font-mono">
                    Alamat: {selectedSchoolForView.alamat || '-'} {selectedSchoolForView.kelurahan ? `, Kel. ${selectedSchoolForView.kelurahan}` : ''} {selectedSchoolForView.kecamatan ? `, Kec. ${selectedSchoolForView.kecamatan}` : ''} {selectedSchoolForView.kabupaten ? `, ${selectedSchoolForView.kabupaten}` : ''}
                  </p>
                  <p className="text-[10px] text-slate-400 font-sans">
                    Telp/HP: {selectedSchoolForView.telepon || '-'} | Email: {selectedSchoolForView.email || '-'} | Website: {selectedSchoolForView.website || '-'}
                  </p>
                </div>
              </div>

              {/* Document Title */}
              <div className="text-center space-y-1.5 py-2">
                <h3 className="text-base font-black uppercase tracking-widest text-slate-800 font-sans border-b border-slate-200 pb-2 max-w-md mx-auto">
                  DOKUMEN PROFIL SATUAN PENDIDIKAN
                </h3>
                <p className="text-xs font-mono text-slate-500">
                  Nomor Referensi Dokumen: SIABA-SCH/{selectedSchoolForView.npsn || '000000'}/{new Date().getFullYear()}
                </p>
              </div>

              {/* Profile Details Layout - Clean Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-xs">
                
                {/* Column 1: Identitas & Legalitas */}
                <div className="space-y-4">
                  <h4 className="font-bold text-xs text-brand-700 uppercase tracking-wider border-b border-slate-100 pb-1.5 font-sans flex items-center gap-2">
                    <SchoolIcon className="w-4 h-4 text-brand-600" />
                    I. Identitas & Legalitas Sekolah
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-semibold text-slate-500">Nama Sekolah:</span>
                      <span className="font-bold text-slate-800">{selectedSchoolForView.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 font-mono">
                      <span className="font-semibold text-slate-500 font-sans">NPSN:</span>
                      <span className="font-bold text-slate-800">{selectedSchoolForView.npsn}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 font-mono">
                      <span className="font-semibold text-slate-500 font-sans">NSM:</span>
                      <span className="font-bold text-slate-800">{selectedSchoolForView.nsm || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-semibold text-slate-500">Jenjang Pendidikan:</span>
                      <span className="font-bold text-slate-800 uppercase">{selectedSchoolForView.jenjang}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-semibold text-slate-500">Status Sekolah:</span>
                      <span className="font-bold text-slate-800">{selectedSchoolForView.status}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-semibold text-slate-500">Akreditasi:</span>
                      <span className="font-bold text-brand-600">Terakreditasi {selectedSchoolForView.akreditasi || 'Belum Terakreditasi'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-semibold text-slate-500">Status Operasional:</span>
                      <span className={`font-bold ${selectedSchoolForView.status_aktif === 'Aktif' ? 'text-green-600' : 'text-slate-500'}`}>{selectedSchoolForView.status_aktif}</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Alamat & Kontak */}
                <div className="space-y-4">
                  <h4 className="font-bold text-xs text-brand-700 uppercase tracking-wider border-b border-slate-100 pb-1.5 font-sans flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-brand-600" />
                    II. Alamat, Koordinat & Kontak
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-semibold text-slate-500">Alamat Lengkap:</span>
                      <span className="text-right text-slate-800 font-sans leading-tight max-w-[200px]">{selectedSchoolForView.alamat || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-semibold text-slate-500">Kelurahan:</span>
                      <span className="font-medium text-slate-800">{selectedSchoolForView.kelurahan || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-semibold text-slate-500">Kecamatan:</span>
                      <span className="font-medium text-slate-800">{selectedSchoolForView.kecamatan || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-semibold text-slate-500">Kabupaten/Kota:</span>
                      <span className="font-medium text-slate-800">{selectedSchoolForView.kabupaten || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-semibold text-slate-500">Provinsi:</span>
                      <span className="font-medium text-slate-800">{selectedSchoolForView.provinsi || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 font-mono">
                      <span className="font-semibold text-slate-500 font-sans">Kode Pos:</span>
                      <span className="font-medium text-slate-800">{selectedSchoolForView.kode_pos || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 font-mono">
                      <span className="font-semibold text-slate-500 font-sans">Koordinat:</span>
                      <span className="font-medium text-slate-800">{selectedSchoolForView.latitude && selectedSchoolForView.longitude ? `${selectedSchoolForView.latitude}, ${selectedSchoolForView.longitude}` : '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 font-mono">
                      <span className="font-semibold text-slate-500 font-sans">Telepon / HP:</span>
                      <span className="font-medium text-slate-800">{selectedSchoolForView.telepon || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-semibold text-slate-500">Surel (Email):</span>
                      <span className="font-medium text-slate-800">{selectedSchoolForView.email || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Row 2, Column 1: Pimpinan & Yayasan */}
                <div className="space-y-4">
                  <h4 className="font-bold text-xs text-brand-700 uppercase tracking-wider border-b border-slate-100 pb-1.5 font-sans flex items-center gap-2">
                    <Award className="w-4 h-4 text-brand-600" />
                    III. Pimpinan Sekolah & Kelembagaan
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-semibold text-slate-500">Kepala Sekolah:</span>
                      <span className="font-bold text-slate-800">{selectedSchoolForView.kepala_sekolah || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 font-mono">
                      <span className="font-semibold text-slate-500 font-sans">NIP Kepala Sekolah:</span>
                      <span className="font-medium text-slate-800">{selectedSchoolForView.nip_kepala || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-semibold text-slate-500">Pimpinan Ranting:</span>
                      <span className="font-bold text-slate-800">{selectedSchoolForView.ranting_aisyiyah || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-semibold text-slate-500">Ketua Ranting Aisyiyah:</span>
                      <span className="font-medium text-slate-800">{selectedSchoolForView.ketua_ranting || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-semibold text-slate-500">Ketua PDA Majelis:</span>
                      <span className="font-medium text-slate-800">{selectedSchoolForView.ketua_pda || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-semibold text-slate-500">Ketua PCA Majelis:</span>
                      <span className="font-medium text-slate-800">{selectedSchoolForView.ketua_pca || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 font-mono">
                      <span className="font-semibold text-slate-500 font-sans">Tahun Berdiri:</span>
                      <span className="font-medium text-slate-800">{selectedSchoolForView.tahun_berdiri || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 font-mono">
                      <span className="font-semibold text-slate-500 font-sans">Tahun Operasional:</span>
                      <span className="font-medium text-slate-800">{selectedSchoolForView.tahun_operasional || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Row 2, Column 2: Sarana & Prasarana */}
                <div className="space-y-4">
                  <h4 className="font-bold text-xs text-brand-700 uppercase tracking-wider border-b border-slate-100 pb-1.5 font-sans flex items-center gap-2">
                    <Building className="w-4 h-4 text-brand-600" />
                    IV. Sarana, Prasarana & Kepemilikan Asset
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-semibold text-slate-500">Status Kepemilikan Tanah:</span>
                      <span className="font-medium text-slate-800">{selectedSchoolForView.status_tanah || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="font-semibold text-slate-500">Status Kepemilikan Gedung:</span>
                      <span className="font-medium text-slate-800">{selectedSchoolForView.status_gedung || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 font-mono">
                      <span className="font-semibold text-slate-500 font-sans">Luas Tanah:</span>
                      <span className="font-bold text-slate-800">{selectedSchoolForView.luas_tanah || 0} m²</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 font-mono">
                      <span className="font-semibold text-slate-500 font-sans">Luas Bangunan:</span>
                      <span className="font-bold text-slate-800">{selectedSchoolForView.luas_bangunan || 0} m²</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 font-mono">
                      <span className="font-semibold text-slate-500 font-sans">Jumlah Ruang Kelas:</span>
                      <span className="font-bold text-slate-800">{selectedSchoolForView.jumlah_ruang || 0} Ruang</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 font-mono">
                      <span className="font-semibold text-slate-500 font-sans">Jumlah Toilet:</span>
                      <span className="font-bold text-slate-800">{selectedSchoolForView.jumlah_toilet || 0} Unit</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Legal Notes / Disclaimer */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 text-[10px] text-slate-500 leading-relaxed font-sans print:border print:border-slate-300">
                <p className="font-bold text-slate-700 uppercase tracking-wider mb-1">Catatan Keabsahan Dokumen:</p>
                Dokumen ini merupakan ringkasan data profil satuan pendidikan yang sah dari Sistem Informasi Administrasi Aisyiyah Bustanul Athfal (SIABA) Kota Malang. Seluruh data yang tercantum disinkronkan secara real-time oleh petugas administrasi sekolah dan divalidasi oleh pimpinan majelis.
              </div>

              {/* SIGNATURE SECTION (TANDA TANGAN KEPALA SEKOLAH DI BAWAH) */}
              <div className="pt-8 grid grid-cols-2 gap-12 font-sans text-xs">
                {/* Left Side: Komite / Yayasan */}
                <div className="text-center space-y-20">
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-700">Mengetahui / Menyetujui,</p>
                    <p className="font-bold text-slate-800">Pimpinan Aisyiyah Ranting</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-sm">
                      ( {selectedSchoolForView.ketua_ranting || '___________________________'} )
                    </p>
                  </div>
                </div>

                {/* Right Side: Kepala Sekolah */}
                <div className="text-center space-y-20">
                  <div className="space-y-1">
                    <p className="font-medium text-slate-600">Malang, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="font-bold text-slate-800">Kepala Sekolah {selectedSchoolForView.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-sm underline decoration-slate-800">
                      {selectedSchoolForView.kepala_sekolah || '(Nama Kepala Sekolah)'}
                    </p>
                    <p className="text-[10px] text-slate-700 font-mono">
                      NIP. {selectedSchoolForView.nip_kepala || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stamp Watermark Placeholder */}
              <div className="flex justify-center items-center pt-4 print:pt-2">
                <div className="border border-dashed border-brand-300 rounded-xl px-5 py-2.5 text-center bg-brand-50/20 print:bg-white shrink-0">
                  <span className="text-[9px] text-brand-600 uppercase tracking-wider font-extrabold block">Validasi Digital SIABA</span>
                  <span className="text-[8px] text-slate-400 block font-mono">SINKRONISASI AKTIF • {new Date().toLocaleDateString('id-ID')}</span>
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50 shrink-0 no-print">
              <button
                type="button"
                onClick={() => setSelectedSchoolForView(null)}
                className="h-10 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer"
              >
                Tutup Jendela
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
