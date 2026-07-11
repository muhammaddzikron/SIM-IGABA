/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, School, SystemSettings } from '../types';
import { ApiService } from '../lib/api';
import {
  Settings,
  Database,
  Cloud,
  Download,
  Upload,
  CheckCircle,
  HelpCircle,
  Shield,
  Loader2,
  Key,
  School as SchoolIcon,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase for Google Sheets OAuth in the preview
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

interface SettingsViewProps {
  user: User;
  schools: School[];
  onSettingsUpdated: () => void;
}

export default function SettingsView({ user, schools, onSettingsUpdated }: SettingsViewProps) {
  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // States for App Name and Passwords
  const [appTitle, setAppTitle] = useState('SIM IGABA');
  const [appSubtitle, setAppSubtitle] = useState('Klaten Utara');
  const [superAdminPass, setSuperAdminPass] = useState('adminn');
  const [adminPass, setAdminPass] = useState('admin');
  const [petugasPass, setPetugasPass] = useState('petugas');
  const [scriptUrl, setScriptUrl] = useState('');
  const [sheetsUrl, setSheetsUrl] = useState('https://docs.google.com/spreadsheets/d/1Bqgss06C6au6HfrLfF-6ywDftB7tOpN986b6QNh7ncI/edit');

  const [showSuperAdminPass, setShowSuperAdminPass] = useState(false);
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [showPetugasPass, setShowPetugasPass] = useState(false);

  // Google Sheets setup states
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleUser, setGoogleUser] = useState<{ name: string; email: string; token: string } | null>(null);
  const [showAdvancedSheets, setShowAdvancedSheets] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const res = await ApiService.getSettings();
        
        // Retrieve local storage overrides for serverless/Vercel persistence
        const localAppTitle = localStorage.getItem('APP_TITLE');
        const localAppSubtitle = localStorage.getItem('APP_SUBTITLE');
        const localSuperAdminPass = localStorage.getItem('SUPER_ADMIN_PASSWORD');
        const localAdminPass = localStorage.getItem('ADMIN_PASSWORD');
        const localPetugasPass = localStorage.getItem('PETUGAS_PASSWORD');
        const localScriptUrl = localStorage.getItem('GOOGLE_APPS_SCRIPT_URL');
        const localSheetsUrl = localStorage.getItem('GOOGLE_SHEETS_URL');

        if (res.success && res.data) {
          setAppTitle(localAppTitle || res.data.app_title || 'SIM IGABA');
          setAppSubtitle(localAppSubtitle || res.data.app_subtitle || 'Klaten Utara');
          setSuperAdminPass(localSuperAdminPass || res.data.super_admin_password || 'adminn');
          setAdminPass(localAdminPass || res.data.admin_password || 'admin');
          setPetugasPass(localPetugasPass || res.data.petugas_password || 'petugas');
          setScriptUrl(localScriptUrl || res.data.google_apps_script_url || '');
          setSheetsUrl(localSheetsUrl || res.data.google_sheets_url || 'https://docs.google.com/spreadsheets/d/1Bqgss06C6au6HfrLfF-6ywDftB7tOpN986b6QNh7ncI/edit');
        } else {
          // Fallback entirely to local storage if API fails or settings are empty
          if (localAppTitle) setAppTitle(localAppTitle);
          if (localAppSubtitle) setAppSubtitle(localAppSubtitle);
          if (localSuperAdminPass) setSuperAdminPass(localSuperAdminPass);
          if (localAdminPass) setAdminPass(localAdminPass);
          if (localPetugasPass) setPetugasPass(localPetugasPass);
          if (localScriptUrl) setScriptUrl(localScriptUrl);
          if (localSheetsUrl) setSheetsUrl(localSheetsUrl);
        }
      } catch (err: any) {
        setErrorMsg('Gagal memuat pengaturan: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSaveAllSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const payload: SystemSettings = {
        google_sheets_url: sheetsUrl,
        google_apps_script_url: scriptUrl,
        backup_interval: 'Bulanan',
        allow_petugas_edit_after_submit: false,
        app_title: appTitle,
        app_subtitle: appSubtitle,
        super_admin_password: superAdminPass,
        admin_password: adminPass,
        petugas_password: petugasPass
      };

      const res = await ApiService.saveSettings(payload);
      if (res.success) {
        setSuccessMsg('Pengaturan nama aplikasi, URL Google Sheets, dan password berhasil disimpan!');
        
        // Save to localStorage for robust client-side persistence
        localStorage.setItem('GOOGLE_APPS_SCRIPT_URL', scriptUrl);
        localStorage.setItem('GOOGLE_SHEETS_URL', sheetsUrl);
        localStorage.setItem('APP_TITLE', appTitle);
        localStorage.setItem('APP_SUBTITLE', appSubtitle);
        localStorage.setItem('SUPER_ADMIN_PASSWORD', superAdminPass);
        localStorage.setItem('ADMIN_PASSWORD', adminPass);
        localStorage.setItem('PETUGAS_PASSWORD', petugasPass);
        
        onSettingsUpdated();
      } else {
        setErrorMsg(res.message || 'Gagal menyimpan pengaturan.');
      }
    } catch (err: any) {
      setErrorMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    try {
      setLoading(true);
      const backupData = await ApiService.backupDatabase();
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Backup_Laporan_Aisyiyah_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
      setSuccessMsg('Backup database berhasil diunduh!');
    } catch (err: any) {
      setErrorMsg(`Gagal membackup: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Apakah Anda yakin ingin memulihkan database dari file backup ini? Seluruh data saat ini akan diganti.')) {
      return;
    }

    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        const res = await ApiService.restoreDatabase(parsed);
        if (res.success) {
          setSuccessMsg('Pemulihan database berhasil diselesaikan! Me-refresh halaman...');
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          setErrorMsg(res.message || 'Pemulihan gagal.');
        }
      } catch (err: any) {
        setErrorMsg(`Format backup salah atau korup: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleConnectGoogle = async () => {
    setGoogleLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/spreadsheets');
      provider.addScope('https://www.googleapis.com/auth/drive.file');

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (!token) {
        throw new Error('Gagal mendapatkan token akses dari Google.');
      }

      setGoogleUser({
        name: result.user.displayName || '',
        email: result.user.email || '',
        token: token
      });

      setSuccessMsg(`Berhasil terhubung dengan Google sebagai ${result.user.email}!`);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setErrorMsg(`Gagal terhubung dengan Google: ${err.message}`);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleInitializeSheets = async () => {
    if (!googleUser?.token) {
      setErrorMsg('Silakan hubungkan akun Google Anda terlebih dahulu.');
      return;
    }

    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      // Extract spreadsheet ID from the URL
      const match = sheetsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const spreadsheetId = match ? match[1] : '1Bqgss06C6au6HfrLfF-6ywDftB7tOpN986b6QNh7ncI';

      const res = await ApiService.initializeGoogleSheets(googleUser.token, spreadsheetId);
      if (res.success) {
        setSuccessMsg('Luar biasa! Seluruh lembar kerja (Sheets) dan data master contoh berhasil dibuat di Google Spreadsheet Anda.');
        onSettingsUpdated();
      } else {
        setErrorMsg(res.message || 'Gagal menginisialisasi Google Spreadsheet.');
      }
    } catch (err: any) {
      setErrorMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in font-sans">
      <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-6">
        <div className="flex items-center gap-2 text-brand-700 border-b border-slate-100 pb-3">
          <Settings className="w-5 h-5 text-green-700" />
          <h3 className="font-bold text-slate-800 text-sm">Setting Nama Aplikasi & Ubah Password</h3>
        </div>

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-medium">
            <Shield className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveAllSettings} className="space-y-6">
          {/* 1. APP NAME CONFIG */}
          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2">
              <SchoolIcon className="w-4 h-4 text-brand-600" />
              <h4 className="font-bold text-xs uppercase tracking-wide">Pengaturan Nama Aplikasi</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">Nama Utama Aplikasi (Title)</label>
                <input
                  type="text"
                  required
                  value={appTitle}
                  onChange={(e) => setAppTitle(e.target.value)}
                  placeholder="Contoh: SIM IGABA"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500"
                  disabled={!isSuperAdmin}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">Sub-nama / Wilayah (Subtitle)</label>
                <input
                  type="text"
                  required
                  value={appSubtitle}
                  onChange={(e) => setAppSubtitle(e.target.value)}
                  placeholder="Contoh: Klaten Utara"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500"
                  disabled={!isSuperAdmin}
                />
              </div>
            </div>
          </div>

          {/* 1.5. GOOGLE SHEETS & APPS SCRIPT INTEGRATION CONFIG */}
          {isSuperAdmin && (
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 text-slate-800">
                  <Cloud className="w-4 h-4 text-emerald-600 shrink-0" />
                  <h4 className="font-bold text-xs uppercase tracking-wide">Sinkronisasi Google Sheets</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvancedSheets(!showAdvancedSheets)}
                  className="text-[10px] font-semibold text-brand-600 hover:text-brand-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 shadow-sm transition-all cursor-pointer"
                >
                  {showAdvancedSheets ? 'Sembunyikan Pengaturan' : 'Tampilkan Detail Teknis'}
                </button>
              </div>

              {!showAdvancedSheets ? (
                <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-100 flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-emerald-900 block font-sans">Sistem Bekerja Otomatis di Belakang Layar</span>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                      Koneksi integrasi Google Spreadsheet aktif. Seluruh pembaruan data master sekolah, pendidik, siswa, dan laporan bulanan akan disinkronkan secara otomatis di latar belakang ke spreadsheet Anda.
                    </p>
                    {sheetsUrl && (
                      <a
                        href={sheetsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold underline inline-flex items-center gap-1 mt-1 font-sans"
                      >
                        Buka Google Spreadsheet Terhubung <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-600 flex items-center gap-1 font-sans">
                        <span>URL Google Spreadsheet</span>
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400" title="Masukkan URL lengkap Google Spreadsheet Anda" />
                      </label>
                      <input
                        type="text"
                        required
                        value={sheetsUrl}
                        onChange={(e) => setSheetsUrl(e.target.value)}
                        placeholder="Contoh: https://docs.google.com/spreadsheets/d/..."
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500"
                      />
                      <p className="text-[10px] text-slate-400 leading-normal font-sans">
                        Pastikan spreadsheet telah dibagikan (Share) agar dapat diakses oleh script.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-600 flex items-center gap-1 font-sans">
                        <span>URL Google Apps Script (Web App)</span>
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400" title="Masukkan URL Web App dari deployment Google Apps Script Anda" />
                      </label>
                      <input
                        type="text"
                        required
                        value={scriptUrl}
                        onChange={(e) => setScriptUrl(e.target.value)}
                        placeholder="https://script.google.com/macros/s/.../exec"
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-mono"
                      />
                      <p className="text-[10px] text-slate-400 leading-normal font-sans">
                        Dapatkan URL ini setelah mendeploy kode dari file <code className="bg-slate-100 px-1 py-0.5 rounded text-[9px]">GoogleAppsScript.js</code> sebagai Web App (Anyone can access).
                      </p>
                    </div>
                  </div>

                  {/* Google Sheets Initialization (OAuth) inside Settings */}
                  <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-100/50 space-y-3 mt-2">
                    <span className="font-bold text-xs text-emerald-900 block font-sans">Inisialisasi Cepat Google Sheets (Opsional)</span>
                    <p className="text-xs text-slate-600 leading-relaxed font-sans">
                      Jika Anda baru membuat Spreadsheet kosong, Anda bisa menghubungkan akun Google Anda dan menekan tombol di bawah untuk membuat semua lembar kerja (Schools, Teachers, Students, dll.) secara otomatis beserta data contoh bawaan.
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      {!googleUser ? (
                        <button
                          type="button"
                          onClick={handleConnectGoogle}
                          disabled={googleLoading}
                          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer shadow-sm shadow-slate-100/50 transition-colors font-sans"
                        >
                          {googleLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5 text-slate-500" />}
                          Hubungkan ke Akun Google
                        </button>
                      ) : (
                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                          <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5 bg-white border border-emerald-200 px-3 py-2 rounded-xl font-sans">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Terhubung: {googleUser.email}
                          </div>
                          <button
                            type="button"
                            onClick={handleInitializeSheets}
                            disabled={loading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-600/10 transition-colors font-sans"
                          >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            Inisialisasi Lembar Kerja (Sheets)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. PASSWORD CONFIG */}
          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2">
              <Key className="w-4 h-4 text-brand-600" />
              <h4 className="font-bold text-xs uppercase tracking-wide">Ubah Password Pengguna</h4>
            </div>

            <div className="max-w-md">
              {/* Super Admin Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 font-sans">
                  Password Super Admin <span className="text-slate-400 font-mono font-normal">(admin)</span>
                </label>
                <div className="relative">
                  <input
                    type={showSuperAdminPass ? "text" : "password"}
                    required
                    value={superAdminPass}
                    onChange={(e) => setSuperAdminPass(e.target.value)}
                    placeholder="Password admin"
                    className="w-full border border-slate-200 rounded-xl pl-3 pr-10 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 font-mono"
                    disabled={!isSuperAdmin}
                  />
                  {(isSuperAdmin) && (
                    <button
                      type="button"
                      onClick={() => setShowSuperAdminPass(!showSuperAdminPass)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showSuperAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {user.role === 'PETUGAS' && (
            <div className="bg-brand-50/50 p-6 rounded-2xl border border-brand-100 text-slate-700 space-y-3.5 animate-fade-in">
              <div className="flex items-center gap-2.5 text-brand-800">
                <SchoolIcon className="w-5 h-5 text-brand-600 shrink-0" />
                <h4 className="font-bold text-sm">Informasi Keamanan Petugas Sekolah</h4>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                Sebagai petugas sekolah, Anda dapat mengubah password akun petugas khusus sekolah Anda pada menu **Master Sekolah** (Profil Sekolah). Silakan klik tombol **Edit Profil Sekolah** untuk memperbarui data identitas beserta password petugas sekolah Anda secara mandiri.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const event = new CustomEvent('change-tab', { detail: 'schools' });
                    window.dispatchEvent(event);
                  }}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm shadow-brand-600/10 transition-all hover:scale-[1.01]"
                >
                  Buka Master Sekolah Sekarang
                </button>
              </div>
            </div>
          )}

          {(isSuperAdmin || user.role === 'ADMIN') && (
            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-brand-600/10 transition-colors"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Simpan Semua Konfigurasi
              </button>
            </div>
          )}
        </form>

        {/* SYSTEM BACKUP AND RESTORE */}
        {isSuperAdmin && (
          <div className="border-t border-slate-100 pt-6 space-y-4">
            <div className="flex items-start gap-3 bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
              <Database className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <span className="font-bold text-amber-900">Pusat Cadangan & Pemulihan (Backup/Restore)</span>
                <p className="text-amber-700 font-medium">
                  Super Admin memiliki hak eksklusif untuk mendownload seluruh isi database (Lembaga, Absensi, Siswa, Guru) dalam bentuk berkas terenkripsi JSON. Anda juga dapat memulihkan seluruh sistem kapan saja dengan mengunggah berkas cadangan tersebut.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleBackup}
                disabled={loading}
                className="bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Cadangan (JSON)
              </button>

              <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer border border-slate-300 transition-colors">
                <Upload className="w-4 h-4" />
                Unggah & Pulihkan Database
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestore}
                  className="hidden"
                  disabled={loading}
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
