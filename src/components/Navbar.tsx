/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User } from '../types';
import {
  Bell,
  Database,
  ChevronDown,
  LogOut,
  Settings,
  Menu,
  X,
  ShieldCheck,
  Globe,
  LayoutDashboard,
  School,
  Users,
  GraduationCap,
  ClipboardList,
  History,
  FileCheck
} from 'lucide-react';

interface NavbarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sourceIndicator: 'google_sheets' | 'local_database';
  onLogout: () => void;
  onNavigateToSettings?: () => void;
  appTitle?: string;
  appSubtitle?: string;
}

export default function Navbar({
  user,
  activeTab,
  setActiveTab,
  sourceIndicator,
  onLogout,
  onNavigateToSettings,
  appTitle = 'SIM IGABA',
  appSubtitle = 'Klaten Utara'
}: NavbarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'schools', label: 'Master Sekolah', icon: School },
    { id: 'teachers', label: 'Master Guru', icon: Users },
    { id: 'students', label: 'Data Murid', icon: GraduationCap },
    { id: 'reports', label: 'Laporan Bulanan', icon: ClipboardList },
    { id: 'sk_guru', label: (isSuperAdmin || user.role === 'ADMIN') ? 'Pengelolaan SK Guru' : 'Pengajuan SK Guru', icon: FileCheck },
    ...((isSuperAdmin || user.role === 'ADMIN' || user.role === 'PETUGAS') ? [
      { id: 'settings', label: 'Pengaturan', icon: Settings }
    ] : []),
    ...(isSuperAdmin ? [
      { id: 'logs', label: 'Log Aktivitas', icon: History }
    ] : [])
  ];

  const getBreadcrumb = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard Utama';
      case 'schools':
        return 'Data Master Sekolah';
      case 'teachers':
        return 'Data Master Guru';
      case 'students':
        return 'Data Siswa Aktif';
      case 'reports':
        return 'Laporan Bulanan';
      case 'sk_guru':
        return (isSuperAdmin || user.role === 'ADMIN') ? 'Pengelolaan SK Guru' : 'Pengajuan SK Guru';
      case 'settings':
        return 'Pengaturan Sistem';
      case 'logs':
        return 'Audit Log Aktivitas';
      default:
        return 'Sistem Informasi';
    }
  };

  const getCurrentTahunPelajaran = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0 is January, 6 is July
    if (month >= 6) {
      return `${year}/${year + 1}`;
    } else {
      return `${year - 1}/${year}`;
    }
  };

  return (
    <header id="top-navbar" className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-sm">
      {/* Top Row: Branding & Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-50 rounded-xl border border-green-100 shrink-0 shadow-sm">
              <img 
                src="https://igaba.id/Icon-IGABA.png" 
                alt="Logo" 
                className="w-7 h-7 object-contain" 
                referrerPolicy="no-referrer" 
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-slate-800 font-sans leading-none">
                  {appTitle}
                </span>
                <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-green-200/50 leading-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  TP {getCurrentTahunPelajaran()}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium font-sans mt-0.5 leading-none">
                {appSubtitle} • Sistem Laporan Bulanan
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Database indicator (hidden on extra small screens) */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-medium font-sans bg-slate-50/50 border-slate-100">
            <Database className={`w-3.5 h-3.5 ${sourceIndicator === 'google_sheets' ? 'text-green-600 animate-pulse' : 'text-amber-500'}`} />
            <span className="text-slate-500">Database:</span>
            {sourceIndicator === 'google_sheets' ? (
              <span className="inline-flex items-center gap-1 text-green-700 font-semibold bg-green-50 px-2 py-0.5 rounded-full text-[10px] border border-green-100">
                <Globe className="w-3 h-3" />
                Google Sheets
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full text-[10px]">
                Lokal Fallback
              </span>
            )}
          </div>

          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={() => {
                setNotifOpen(!notifOpen);
                setProfileOpen(false);
              }}
              className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-700 border border-transparent hover:border-slate-100 transition-all relative cursor-pointer"
            >
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-green-600 rounded-full"></span>
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl py-3 z-50 animate-fade-in font-sans">
                <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Notifikasi Masuk</span>
                  <span className="text-[10px] text-green-600 font-medium cursor-pointer hover:underline">Tandai semua dibaca</span>
                </div>
                <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                  <div className="p-3.5 hover:bg-slate-50 text-left text-xs transition-colors">
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-slate-800">Laporan Baru Masuk</span>
                      <span className="text-[9px] text-slate-400 font-mono">1 jam lalu</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Petugas TK ABA 1 Malang mensubmit laporan bulanan Juni 2026.</p>
                  </div>
                  <div className="p-3.5 hover:bg-slate-50 text-left text-xs transition-colors">
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-slate-800">Database Tersambung</span>
                      <span className="text-[9px] text-slate-400 font-mono">2 jam lalu</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Sistem berhasil memuat data inisial dari fallback database JSON lokal.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotifOpen(false);
              }}
              className="flex items-center gap-1.5 p-1.5 hover:bg-slate-50 rounded-xl transition-all text-slate-700 cursor-pointer border border-transparent hover:border-slate-100"
            >
              <div className="w-7 h-7 rounded-lg bg-green-600 text-white font-bold flex items-center justify-center text-xs">
                {user.name.charAt(0)}
              </div>
              <span className="hidden sm:inline text-xs font-semibold text-slate-700 max-w-[100px] truncate">
                {user.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2.5 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2.5 z-50 animate-fade-in font-sans">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{user.email}</p>
                </div>
                <div className="py-1">
                  {onNavigateToSettings && user.role === 'SUPER_ADMIN' && (
                    <button
                      onClick={() => {
                        onNavigateToSettings();
                        setProfileOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs text-slate-600 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      Pengaturan
                    </button>
                  )}
                  <div className="w-full text-left px-4 py-2 text-xs text-slate-400 flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-slate-300" />
                    Role: <span className="font-mono text-[10px] text-green-600 font-semibold">{user.role}</span>
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-1.5 mt-1.5">
                  <button
                    onClick={() => {
                      onLogout();
                      setProfileOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-rose-50 text-xs text-rose-600 flex items-center gap-2.5 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    Keluar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Hamburger Mobile Menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-slate-50 border border-slate-100 rounded-xl text-slate-600 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Row 2: Horizontal Menu Tabs (Desktop only) */}
      <div className="hidden md:block bg-slate-50/50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex items-center gap-1.5 py-1.5 overflow-x-auto scrollbar-none">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-green-700 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Dropdown Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-150 bg-white animate-slide-down shadow-lg pb-4">
          <div className="p-3 border-b border-slate-50 space-y-1 bg-slate-50/50">
            {/* Show Database status inside mobile menu */}
            <div className="flex items-center justify-between px-3 py-2 text-xs font-medium font-sans">
              <span className="text-slate-500">Database Status:</span>
              {sourceIndicator === 'google_sheets' ? (
                <span className="inline-flex items-center gap-1 text-green-700 font-semibold bg-green-50 px-2.5 py-0.5 rounded-full text-[10px] border border-green-100/60">
                  <Globe className="w-3 h-3" />
                  Google Sheets
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-2.5 py-0.5 rounded-full text-[10px]">
                  Lokal Fallback
                </span>
              )}
            </div>
          </div>

          <nav className="px-3 py-2 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer text-left ${
                    isActive
                      ? 'bg-green-700 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Separator & Logout button inside mobile menu */}
            <div className="border-t border-slate-100 my-2 pt-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all duration-150 cursor-pointer text-left"
              >
                <LogOut className="w-4.5 h-4.5 shrink-0 text-rose-500" />
                <span>Keluar dari Akun</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
