/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, School, Teacher, Student, Report, AuditLog } from './types';
import { ApiService } from './lib/api';

// Components
import Login from './components/Login';
import Navbar from './components/Navbar';
import DashboardView from './components/DashboardView';
import SchoolsView from './components/SchoolsView';
import TeachersView from './components/TeachersView';
import StudentsView from './components/StudentsView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import LogsView from './components/LogsView';
import SKGuruView from './components/SKGuruView';

import { Loader2, AlertTriangle, ArrowRight } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  // Core Listings state
  const [schools, setSchools] = useState<School[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [sourceIndicator, setSourceIndicator] = useState<'google_sheets' | 'local_database'>('local_database');

  const [appTitle, setAppTitle] = useState('SIM IGABA');
  const [appSubtitle, setAppSubtitle] = useState('Klaten Utara');

  // Verify session and fetch settings on mount
  useEffect(() => {
    const initApp = async () => {
      // Set local storage values first for instantaneous rendering
      const localAppTitle = localStorage.getItem('APP_TITLE');
      const localAppSubtitle = localStorage.getItem('APP_SUBTITLE');
      if (localAppTitle) setAppTitle(localAppTitle);
      if (localAppSubtitle) setAppSubtitle(localAppSubtitle);

      try {
        const res = await ApiService.getSettings();
        if (res.success && res.data) {
          setAppTitle(localAppTitle || res.data.app_title || 'SIM IGABA');
          setAppSubtitle(localAppSubtitle || res.data.app_subtitle || 'Klaten Utara');
        }
      } catch (e) {
        console.error('Failed to load settings:', e);
      }

      const stored = localStorage.getItem('SIABA_SESSION');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (e) {
          localStorage.removeItem('SIABA_SESSION');
        }
      }
      setIsLoading(false);
    };
    initApp();
  }, []);

  useEffect(() => {
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setActiveTab(customEvent.detail);
      }
    };
    window.addEventListener('change-tab', handleTabChange);
    return () => window.removeEventListener('change-tab', handleTabChange);
  }, []);

  // Fetch all database records when user is logged-in
  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      const [schRes, teaRes, stuRes, repRes, logRes, setRes] = await Promise.all([
        ApiService.getList<School>('schools'),
        ApiService.getList<Teacher>('teachers'),
        ApiService.getList<Student>('students'),
        ApiService.getList<Report>('reports'),
        ApiService.getList<AuditLog>('logs'),
        ApiService.getSettings()
      ]);

      if (schRes.success && schRes.data) setSchools(schRes.data);
      if (teaRes.success && teaRes.data) setTeachers(teaRes.data);
      if (stuRes.success && stuRes.data) setStudents(stuRes.data);
      if (repRes.success && repRes.data) setReports(repRes.data);
      if (setRes.success && setRes.data) {
        const localAppTitle = localStorage.getItem('APP_TITLE');
        const localAppSubtitle = localStorage.getItem('APP_SUBTITLE');
        setAppTitle(localAppTitle || setRes.data.app_title || 'SIM IGABA');
        setAppSubtitle(localAppSubtitle || setRes.data.app_subtitle || 'Klaten Utara');
      }
      
      // Map server-side logs key appropriately
      if (logRes.success && logRes.data) {
        const mappedLogs = logRes.data.map((l: any) => ({
          id: l.id,
          user_name: l.username || 'System',
          user_role: l.username === 'admin' ? 'SUPER_ADMIN' : 'PETUGAS',
          action: l.action,
          details: l.details,
          timestamp: l.timestamp
        }));
        setLogs(mappedLogs);
      }

      if (schRes.source) {
        setSourceIndicator(schRes.source);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const handleLoginSuccess = (loggedInUser: User) => {
    localStorage.setItem('SIABA_SESSION', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('SIABA_SESSION');
    setUser(null);
    setActiveTab('dashboard');
  };

  // --- SCHOOLS WRITERS ---
  const handleCreateSchool = async (data: Partial<School>) => {
    const res = await ApiService.createItem<School>('schools', data);
    if (res.success) {
      await fetchAllData();
    } else {
      alert(res.message || 'Gagal menyimpan sekolah baru');
    }
  };

  const handleUpdateSchool = async (id: string, data: Partial<School>) => {
    const res = await ApiService.updateItem<School>('schools', id, data);
    if (res.success) {
      await fetchAllData();
    } else {
      alert(res.message || 'Gagal mengubah data sekolah');
    }
  };

  const handleDeleteSchool = async (id: string) => {
    const res = await ApiService.deleteItem('schools', id);
    if (res.success) {
      await fetchAllData();
    } else {
      alert(res.message || 'Gagal menghapus sekolah');
    }
  };

  // --- TEACHERS WRITERS ---
  const handleCreateTeacher = async (data: Partial<Teacher>) => {
    const res = await ApiService.createItem<Teacher>('teachers', data);
    if (res.success) {
      await fetchAllData();
    } else {
      alert(res.message || 'Gagal menyimpan profil guru');
    }
  };

  const handleUpdateTeacher = async (id: string, data: Partial<Teacher>) => {
    const res = await ApiService.updateItem<Teacher>('teachers', id, data);
    if (res.success) {
      await fetchAllData();
    } else {
      alert(res.message || 'Gagal merubah data guru');
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    const res = await ApiService.deleteItem('teachers', id);
    if (res.success) {
      await fetchAllData();
    } else {
      alert(res.message || 'Gagal menghapus guru');
    }
  };

  // --- STUDENTS WRITERS ---
  const handleCreateStudent = async (data: Partial<Student>) => {
    const res = await ApiService.createItem<Student>('students', data);
    if (res.success) {
      await fetchAllData();
    } else {
      alert(res.message || 'Gagal menyimpan data murid');
    }
  };

  const handleUpdateStudent = async (id: string, data: Partial<Student>) => {
    const res = await ApiService.updateItem<Student>('students', id, data);
    if (res.success) {
      await fetchAllData();
    } else {
      alert(res.message || 'Gagal memperbarui data murid');
    }
  };

  const handleDeleteStudent = async (id: string) => {
    const res = await ApiService.deleteItem('students', id);
    if (res.success) {
      await fetchAllData();
    } else {
      alert(res.message || 'Gagal menghapus murid');
    }
  };

  // Loading Screen
  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
        <span className="text-xs text-slate-500 font-semibold tracking-wide uppercase">Memuat Laporan Bulanan...</span>
      </div>
    );
  }

  // Auth Screen
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} appTitle={appTitle} appSubtitle={appSubtitle} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col">
      {/* Modern Top Navigation Header */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sourceIndicator={sourceIndicator}
        onLogout={handleLogout}
        onNavigateToSettings={() => setActiveTab('settings')}
        appTitle={appTitle}
        appSubtitle={appSubtitle}
      />

      {/* Main content view with balanced side, top, and bottom spacing */}
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8 max-w-7xl w-full mx-auto space-y-6">
          {isLoading && (
            <div className="p-3 bg-brand-50 border border-brand-100 rounded-2xl flex items-center gap-2.5 text-xs text-brand-800 font-medium font-sans animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
              <span>Sinkronisasi database dengan spreadsheet...</span>
            </div>
          )}

          {/* Dynamic Switch View Tabs */}
          {activeTab === 'dashboard' && (
            <DashboardView
              user={user}
              schools={schools}
              teachers={teachers}
              students={students}
              reports={reports}
            />
          )}

          {activeTab === 'schools' && (
            <SchoolsView
              user={user}
              schools={schools}
              onCreate={handleCreateSchool}
              onUpdate={handleUpdateSchool}
              onDelete={handleDeleteSchool}
            />
          )}

          {activeTab === 'teachers' && (
            <TeachersView
              user={user}
              teachers={teachers}
              schools={schools}
              onCreate={handleCreateTeacher}
              onUpdate={handleUpdateTeacher}
              onDelete={handleDeleteTeacher}
              onRefresh={fetchAllData}
            />
          )}

          {activeTab === 'students' && (
            <StudentsView
              user={user}
              students={students}
              schools={schools}
              onCreate={handleCreateStudent}
              onUpdate={handleUpdateStudent}
              onDelete={handleDeleteStudent}
              onRefresh={fetchAllData}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              user={user}
              reports={reports}
              schools={schools}
              teachers={teachers}
              students={students}
              onReportCreated={fetchAllData}
            />
          )}

          {activeTab === 'sk_guru' && (
            <SKGuruView
              user={user}
              teachers={teachers}
              schools={schools}
              onRefresh={fetchAllData}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              user={user}
              schools={schools}
              onSettingsUpdated={fetchAllData}
            />
          )}

          {activeTab === 'logs' && (
            <LogsView
              user={user}
              logs={logs}
            />
          )}
        </main>
    </div>
  );
}
