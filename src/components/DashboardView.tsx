/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { School, Teacher, Student, Report, User, SKGuru } from '../types';
import { ApiService } from '../lib/api';
import {
  School as SchoolIcon,
  Users,
  GraduationCap,
  ClipboardList,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Award,
  ArrowUpRight,
  FileText,
  Printer,
  X,
  Loader2,
  PlusCircle,
  Calendar,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DashboardViewProps {
  user: User;
  schools: School[];
  teachers: Teacher[];
  students: Student[];
  reports: Report[];
}

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'];

export default function DashboardView({
  user,
  schools,
  teachers,
  students,
  reports
}: DashboardViewProps) {
  const isPetugas = user.role === 'PETUGAS';
  const schoolId = user.school_id;

  // Filter lists based on role
  const displaySchools = isPetugas 
    ? schools.filter(s => s.id === schoolId) 
    : schools;
  const displayTeachers = isPetugas 
    ? teachers.filter(t => t.school_id === schoolId) 
    : teachers;
  const displayStudents = isPetugas 
    ? students.filter(s => s.school_id === schoolId) 
    : students;
  const displayReports = isPetugas 
    ? reports.filter(r => r.school_id === schoolId) 
    : reports;

  // Aggregate Metrics
  const totalSchools = displaySchools.length;
  const totalTeachers = displayTeachers.length;
  const totalStudents = displayStudents.length;
  const totalReports = displayReports.length;
  
  const incompleteReports = displayReports.filter(
    r => r.status === 'Draft' || r.status === 'Rejected'
  ).length;
  
  const completeReports = displayReports.filter(
    r => r.status === 'Approved'
  ).length;

  const sentReportsCount = displayReports.filter(
    r => r.status !== 'Draft'
  ).length;

  // 1. Data Kecamatan
  const kecamatanCounts: Record<string, number> = {};
  displaySchools.forEach(s => {
    const kec = s.kecamatan || 'Lainnya';
    kecamatanCounts[kec] = (kecamatanCounts[kec] || 0) + 1;
  });
  const dataKecamatan = Object.entries(kecamatanCounts).map(([name, value]) => ({
    name,
    sekolah: value
  }));

  // 2. Data Perkembangan per Tahun Pelajaran (Seeded history mockup)
  const dataPerkembangan = [
    { tahun: '2023/2024', murid: Math.max(12, totalStudents - 8), guru: Math.max(2, totalTeachers - 2) },
    { tahun: '2024/2025', murid: Math.max(25, totalStudents - 4), guru: Math.max(3, totalTeachers - 1) },
    { tahun: '2025/2026', murid: totalStudents, guru: totalTeachers }
  ];

  // 3. Gender breakdown Murid
  const boyMurid = displayStudents.filter(s => s.jenis_kelamin === 'L').length;
  const girlMurid = displayStudents.filter(s => s.jenis_kelamin === 'P').length;
  const dataGenderMurid = [
    { name: 'Laki-laki (L)', value: boyMurid || 2 },
    { name: 'Perempuan (P)', value: girlMurid || 2 }
  ];

  // 4. Gender breakdown Guru
  const maleGuru = displayTeachers.filter(t => t.jenis_kelamin === 'L').length;
  const femaleGuru = displayTeachers.filter(t => t.jenis_kelamin === 'P').length;
  const dataGenderGuru = [
    { name: 'Laki-laki (L)', value: maleGuru || 1 },
    { name: 'Perempuan (P)', value: femaleGuru || 4 }
  ];

  // 5. Laporan per bulan (Juni vs Mei, dll)
  const monthMap: Record<string, number> = {};
  displayReports.forEach(r => {
    // For school officers, only include sent reports
    if (isPetugas && r.status === 'Draft') return;
    const key = r.bulan;
    monthMap[key] = (monthMap[key] || 0) + 1;
  });
  const dataLaporanMasuk = Object.entries(monthMap).map(([name, value]) => ({
    name,
    laporan: value
  }));

  const mySchool = schools.find(s => s.id === schoolId);
  const welcomeName = isPetugas && mySchool ? `${user.name} (${mySchool.name})` : (user.name.includes('Super Admin') ? 'Super Admin' : user.name);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome header info */}
      <div className="glass-panel rounded-3xl p-6 border border-white/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-sans tracking-tight">
            Selamat datang, {welcomeName}!
          </h2>
          <p className="text-slate-500 text-xs mt-1 font-sans">
            Aplikasi laporan bulanan terintegrasi dengan Google Sheets. Anda masuk sebagai <span className="font-mono bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-bold uppercase text-[10px]">{user.role}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-xs font-semibold text-slate-500 font-sans">Tahun Pelajaran Aktif</p>
            <p className="text-sm font-bold text-brand-700 font-sans">2025/2026 - Ganjil</p>
          </div>
          <span className="p-3 bg-brand-100 text-brand-800 rounded-2xl hidden md:block border border-brand-200">
            <Award className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* Bento Grid Metrics Cards */}
      {isPetugas ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Guru */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-brand-50 text-brand-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide font-sans">Total Guru</span>
              <span className="text-2xl font-extrabold text-slate-800 font-mono">{totalTeachers}</span>
            </div>
          </div>

          {/* Card 2: Total Siswa */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-sky-50 text-sky-600 rounded-xl">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide font-sans">Total Siswa</span>
              <span className="text-2xl font-extrabold text-slate-800 font-mono">{totalStudents}</span>
            </div>
          </div>

          {/* Card 3: Total Laporan yang sudah dikirim */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide font-sans">Total Laporan Dikirim</span>
              <span className="text-2xl font-extrabold text-slate-800 font-mono">{sentReportsCount}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Sekolah */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <SchoolIcon className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide font-sans">Total Sekolah</span>
              <span className="text-xl font-bold text-slate-800 font-mono">{totalSchools}</span>
            </div>
          </div>

          {/* Card 2: Guru */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-brand-50 text-brand-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide font-sans">Total Guru</span>
              <span className="text-xl font-bold text-slate-800 font-mono">{totalTeachers}</span>
            </div>
          </div>

          {/* Card 3: Murid */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide font-sans">Total Murid</span>
              <span className="text-xl font-bold text-slate-800 font-mono">{totalStudents}</span>
            </div>
          </div>

          {/* Card 4: Laporan */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide font-sans">Laporan Bulanan</span>
              <span className="text-xl font-bold text-slate-800 font-mono">{totalReports}</span>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Quick Statistics Sub-Panel (Admin Only) */}
      {!isPetugas && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-brand-50/40 rounded-2xl p-4 border border-brand-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl"><CheckCircle2 className="w-4 h-4" /></span>
              <span className="text-xs font-semibold text-slate-700 font-sans">Laporan Selesai (Approved)</span>
            </div>
            <span className="text-lg font-bold text-emerald-700 font-mono">{completeReports}</span>
          </div>

          <div className="bg-rose-50/40 rounded-2xl p-4 border border-rose-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-rose-100 text-rose-800 rounded-xl"><XCircle className="w-4 h-4" /></span>
              <span className="text-xs font-semibold text-slate-700 font-sans">Belum Lengkap / Draft</span>
            </div>
            <span className="text-lg font-bold text-rose-700 font-mono">{incompleteReports}</span>
          </div>

          <div className="bg-indigo-50/40 rounded-2xl p-4 border border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-indigo-100 text-indigo-800 rounded-xl"><TrendingUp className="w-4 h-4" /></span>
              <span className="text-xs font-semibold text-slate-700 font-sans">Rasio Penyelesaian</span>
            </div>
            <span className="text-lg font-bold text-indigo-700 font-mono">
              {totalReports > 0 ? `${Math.round((completeReports / totalReports) * 100)}%` : '0%'}
            </span>
          </div>
        </div>
      )}

      {/* Charts Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Sekolah Per Kecamatan (Admin Only) */}
        {!isPetugas && (
          <div className="bg-white rounded-3xl p-5 border border-slate-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide font-sans">Jumlah Sekolah Per Kecamatan</h3>
              <span className="text-[10px] text-slate-400 font-mono">Real-time aggregasi</span>
            </div>
            <div className="h-64">
              {dataKecamatan.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataKecamatan} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }} />
                    <Bar dataKey="sekolah" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs font-sans">Data tidak ditemukan</div>
              )}
            </div>
          </div>
        )}

        {/* Chart 2: Perkembangan Murid & Guru per Tahun Pelajaran */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide font-sans">Perkembangan Guru & Murid</h3>
            <span className="text-[10px] text-slate-400 font-mono">Lintas Tahun Pelajaran</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataPerkembangan} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="tahun" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip />
                <Legend iconType="circle" fontSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="murid" name="Jumlah Murid" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="guru" name="Jumlah Guru" stroke="#16a34a" strokeWidth={3} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Genders Pie Charts */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/60 shadow-sm grid grid-cols-2 gap-4">
          <div className="border-r border-slate-100 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide font-sans mb-1">Gender Murid</h4>
              <span className="text-[10px] text-slate-400 font-sans">Laki-laki vs Perempuan</span>
            </div>
            <div className="h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataGenderMurid}
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {dataGenderMurid.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#ec4899'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center text-[10px] text-slate-500 font-sans space-y-1">
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full inline-block"></span>
                <span>L: {boyMurid}</span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-pink-500 rounded-full inline-block"></span>
                <span>P: {girlMurid}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide font-sans mb-1">Gender Guru</h4>
              <span className="text-[10px] text-slate-400 font-sans">Laki-laki vs Perempuan</span>
            </div>
            <div className="h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataGenderGuru}
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {dataGenderGuru.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#ec4899'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center text-[10px] text-slate-500 font-sans space-y-1">
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full inline-block"></span>
                <span>L: {maleGuru}</span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-pink-500 rounded-full inline-block"></span>
                <span>P: {femaleGuru}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 4: Laporan Masuk Setiap Bulan */}
        <div className={`bg-white rounded-3xl p-5 border border-slate-200/60 shadow-sm ${isPetugas ? 'lg:col-span-2' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide font-sans">
              {isPetugas ? 'Statistik Pengiriman Laporan Bulanan Anda' : 'Laporan Masuk Bulanan'}
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              {isPetugas ? 'Data laporan yang telah dikirim' : 'Volume Laporan Bulanan'}
            </span>
          </div>
          <div className="h-64">
            {dataLaporanMasuk.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataLaporanMasuk} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }} />
                  <Bar dataKey="laporan" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-sans animate-pulse">
                Menunggu penyerahan laporan perdana
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
