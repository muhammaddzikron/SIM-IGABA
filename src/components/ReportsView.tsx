/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { Report, School, Teacher, Student, AttendanceTeacher, AttendanceStudent, Inventory, User, ReportStatus } from '../types';
import { ApiService } from '../lib/api';
import { masterInventories } from '../mockData';
import { ExportEngine } from './ExportEngine';
import {
  FileText,
  FileSpreadsheet,
  Plus,
  Trash2,
  Check,
  X,
  Printer,
  ChevronRight,
  ClipboardList,
  UserCheck,
  AlertCircle,
  Eye,
  CheckCircle,
  Send,
  Lock,
  Download,
  Info,
  QrCode,
  Maximize2,
  Minimize2,
  ArrowLeft
} from 'lucide-react';

interface ReportsViewProps {
  user: User;
  reports: Report[];
  schools: School[];
  teachers: Teacher[];
  students: Student[];
  onReportCreated: () => void;
}

export default function ReportsView({
  user,
  reports,
  schools,
  teachers,
  students,
  onReportCreated
}: ReportsViewProps) {
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const isAdmin = user.role === 'ADMIN';
  const isPetugas = user.role === 'PETUGAS';

  // State
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isModalFullscreen, setIsModalFullscreen] = useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scaleFactor = windowWidth < 850 ? (windowWidth - 32) / 794 : 1;

  // Form step
  const [formStep, setFormStep] = useState(1); // 1: General, 2: Guru Absen, 3: Murid Absen, 4: Inventaris

  // Form inputs
  const [generalFields, setGeneralFields] = useState({
    school_id: isPetugas ? user.school_id : '',
    tahun_pelajaran: '2026/2027',
    semester: 'Ganjil' as 'Ganjil' | 'Genap',
    bulan: 'Juli',
    hari_belajar: 22,
    status_gedung: 'Milik Sendiri',
    jumlah_ruangan: 4,
    notes: ''
  });

  const [attTeachersForm, setAttTeachersForm] = useState<Partial<AttendanceTeacher>[]>([]);
  const [attStudentsForm, setAttStudentsForm] = useState<Partial<AttendanceStudent>[]>([
    { jenis_kelamin: 'L', hadir: 0, izin: 0, sakit: 0, alpha: 0 },
    { jenis_kelamin: 'P', hadir: 0, izin: 0, sakit: 0, alpha: 0 }
  ]);
  const [inventoriesForm, setInventoriesForm] = useState<Partial<Inventory>[]>([]);

  // Detailed report details for the Live View Modal
  const [viewTeachers, setViewTeachers] = useState<AttendanceTeacher[]>([]);
  const [viewStudents, setViewStudents] = useState<AttendanceStudent[]>([]);
  const [viewInventories, setViewInventories] = useState<Inventory[]>([]);

  const [filterBulan, setFilterBulan] = useState<string>('Semua');

  // Fullscreen and Monthly Consolidation States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [monthlyDetails, setMonthlyDetails] = useState<{
    teachersMap: Record<string, AttendanceTeacher[]>;
    studentsMap: Record<string, AttendanceStudent[]>;
    inventoriesMap: Record<string, Inventory[]>;
  } | null>(null);

  // Fetch details for all reports in selected month
  const fetchMonthlyDetails = async () => {
    try {
      setLoadingMonthly(true);
      const [tRes, sRes, iRes] = await Promise.all([
        ApiService.getList<AttendanceTeacher>('attendanceTeachers'),
        ApiService.getList<AttendanceStudent>('attendanceStudents'),
        ApiService.getList<Inventory>('inventories')
      ]);

      const tList = tRes.data || [];
      const sList = sRes.data || [];
      const iList = iRes.data || [];

      const teachersMap: Record<string, AttendanceTeacher[]> = {};
      const studentsMap: Record<string, AttendanceStudent[]> = {};
      const inventoriesMap: Record<string, Inventory[]> = {};

      filteredReports.forEach(rep => {
        teachersMap[rep.id] = tList.filter(x => x.report_id === rep.id);
        studentsMap[rep.id] = sList.filter(x => x.report_id === rep.id);
        inventoriesMap[rep.id] = iList.filter(x => x.report_id === rep.id);
      });

      const details = { teachersMap, studentsMap, inventoriesMap };
      setMonthlyDetails(details);
      return details;
    } catch (e) {
      console.error(e);
      alert('Gagal mengambil rincian data bulanan');
      return null;
    } finally {
      setLoadingMonthly(false);
    }
  };

  // Automatically fetch monthly details on filter change
  useEffect(() => {
    if (filterBulan !== 'Semua') {
      fetchMonthlyDetails();
    } else {
      setMonthlyDetails(null);
    }
  }, [filterBulan, reports]);

  // Export selected month reports to a consolidated multi-sheet Excel
  const triggerMonthlyExcelExport = async () => {
    try {
      setLoadingMonthly(true);
      const [tRes, sRes, iRes] = await Promise.all([
        ApiService.getList<AttendanceTeacher>('attendanceTeachers'),
        ApiService.getList<AttendanceStudent>('attendanceStudents'),
        ApiService.getList<Inventory>('inventories')
      ]);

      const tList = tRes.data || [];
      const sList = sRes.data || [];
      const iList = iRes.data || [];

      await ExportEngine.exportMonthlyConsolidatedExcel(
        filterBulan,
        filteredReports,
        schools,
        teachers,
        students,
        iList,
        tList,
        sList
      );
    } catch (e) {
      console.error(e);
      alert('Gagal mendownload rekap Excel bulanan');
    } finally {
      setLoadingMonthly(false);
    }
  };

  // Export selected month reports to combined PDF document
  const triggerMonthlyPdfExport = async () => {
    let currentDetails = monthlyDetails;
    if (!currentDetails) {
      currentDetails = await fetchMonthlyDetails();
    }
    if (!currentDetails) return;

    // Small delay to ensure render in DOM
    setTimeout(() => {
      ExportEngine.exportToPdf('monthly-consolidated-print-sheet', `Rekap_Laporan_Bulanan_Aisyiyah`, filterBulan);
    }, 400);
  };

  // Filter reports based on user permissions
  const allowedReports = isPetugas
    ? reports.filter(r => r.school_id === user.school_id)
    : reports;

  const filteredReports = allowedReports.filter(r => {
    if (filterBulan === 'Semua') return true;
    return r.bulan.toLowerCase() === filterBulan.toLowerCase();
  });

  const getSchoolName = (schoolId: string) => {
    const s = schools.find(x => x.id === schoolId);
    return s ? s.name : 'Sekolah Lain';
  };

  const getSchoolDetails = (schoolId: string): School | undefined => {
    return schools.find(x => x.id === schoolId);
  };

  // Pull details when clicking "View Report"
  const loadReportDetails = async (report: Report) => {
    try {
      setLoading(true);
      const [tRes, sRes, iRes] = await Promise.all([
        ApiService.getList<AttendanceTeacher>('attendanceTeachers'),
        ApiService.getList<AttendanceStudent>('attendanceStudents'),
        ApiService.getList<Inventory>('inventories')
      ]);

      const tList = (tRes.data || []).filter(x => x.report_id === report.id);
      const sList = (sRes.data || []).filter(x => x.report_id === report.id);
      const iList = (iRes.data || []).filter(x => x.report_id === report.id);

      setViewTeachers(tList);
      setViewStudents(sList);
      setViewInventories(iList);

      setSelectedReport(report);
      setIsViewOpen(true);
    } catch (e) {
      alert('Gagal memuat detail laporan');
    } finally {
      setLoading(false);
    }
  };

  // Trigger Excel Export from API loaded details
  const triggerExcelExport = async (report: Report) => {
    try {
      const [tRes, sRes, iRes] = await Promise.all([
        ApiService.getList<AttendanceTeacher>('attendanceTeachers'),
        ApiService.getList<AttendanceStudent>('attendanceStudents'),
        ApiService.getList<Inventory>('inventories')
      ]);

      const tList = (tRes.data || []).filter(x => x.report_id === report.id);
      const sList = (sRes.data || []).filter(x => x.report_id === report.id);
      const iList = (iRes.data || []).filter(x => x.report_id === report.id);
      const targetSchool = schools.find(s => s.id === report.school_id) || schools[0];

      await ExportEngine.exportToExcel(report, targetSchool, teachers, students, iList, tList, sList);
    } catch (e) {
      alert('Gagal mendownload Excel');
    }
  };

  // Open Form Creator
  const handleOpenCreateForm = () => {
    setEditingReportId(null);
    const activeSchoolId = isPetugas ? user.school_id : (schools[0]?.id || '');
    const schoolTeachers = teachers.filter(t => t.school_id === activeSchoolId);
    
    // Autofill General Fields
    setGeneralFields({
      school_id: activeSchoolId,
      tahun_pelajaran: '2025/2026',
      semester: 'Ganjil',
      bulan: 'Juli',
      hari_belajar: 22,
      status_gedung: 'Milik Sendiri',
      jumlah_ruangan: 4,
      notes: ''
    });

    // Populate teachers attendances automatically
    const initialTeachersArr = schoolTeachers.map(t => ({
      teacher_id: t.id,
      nama_guru: t.nama,
      jenis_kelamin: t.jenis_kelamin,
      hadir: 22,
      izin: 0,
      sakit: 0,
      alpha: 0
    }));
    setAttTeachersForm(initialTeachersArr);

    // Initial student count estimations
    const maleCount = students.filter(s => s.school_id === activeSchoolId && s.jenis_kelamin === 'L').length;
    const femaleCount = students.filter(s => s.school_id === activeSchoolId && s.jenis_kelamin === 'P').length;

    setAttStudentsForm([
      { jenis_kelamin: 'L', hadir: maleCount * 22, izin: 0, sakit: 0, alpha: 0 },
      { jenis_kelamin: 'P', hadir: femaleCount * 22, izin: 0, sakit: 0, alpha: 0 }
    ]);

    // Populate Inventories from Master Data
    const initialInvArr = masterInventories.map(name => ({
      item_name: name,
      quantity: 10,
      status_baik: 10,
      status_rusak: 0
    }));
    setInventoriesForm(initialInvArr);

    setFormStep(1);
    setIsFormOpen(true);
  };

  // Open Form Editor for Editing Draft / Revision
  const handleOpenEditForm = async (report: Report) => {
    try {
      setLoading(true);
      setEditingReportId(report.id);

      // Fetch detail child items
      const [tRes, sRes, iRes] = await Promise.all([
        ApiService.getList<AttendanceTeacher>('attendanceTeachers'),
        ApiService.getList<AttendanceStudent>('attendanceStudents'),
        ApiService.getList<Inventory>('inventories')
      ]);

      const tList = (tRes.data || []).filter(x => x.report_id === report.id);
      const sList = (sRes.data || []).filter(x => x.report_id === report.id);
      const iList = (iRes.data || []).filter(x => x.report_id === report.id);

      setGeneralFields({
        school_id: report.school_id,
        tahun_pelajaran: report.tahun_pelajaran,
        semester: report.semester,
        bulan: report.bulan,
        hari_belajar: report.hari_belajar,
        status_gedung: report.status_gedung,
        jumlah_ruangan: report.jumlah_ruangan,
        notes: report.notes || ''
      });

      setAttTeachersForm(tList);
      setAttStudentsForm(sList.length > 0 ? sList : [
        { jenis_kelamin: 'L', hadir: 0, izin: 0, sakit: 0, alpha: 0 },
        { jenis_kelamin: 'P', hadir: 0, izin: 0, sakit: 0, alpha: 0 }
      ]);
      setInventoriesForm(iList.length > 0 ? iList : masterInventories.map(name => ({
        item_name: name,
        quantity: 10,
        status_baik: 10,
        status_rusak: 0
      })));

      setFormStep(1);
      setIsFormOpen(true);
    } catch (e) {
      alert('Gagal memuat data detail laporan untuk diedit');
    } finally {
      setLoading(false);
    }
  };

  // Submit report to server (Create / Edit)
  const handleSaveReport = async () => {
    try {
      setLoading(true);

      const reportPayload: Partial<Report> = {
        school_id: generalFields.school_id,
        tahun_pelajaran: generalFields.tahun_pelajaran,
        semester: generalFields.semester,
        bulan: generalFields.bulan,
        hari_belajar: Number(generalFields.hari_belajar),
        status_gedung: generalFields.status_gedung,
        jumlah_ruangan: Number(generalFields.jumlah_ruangan),
        notes: generalFields.notes
      };

      if (editingReportId) {
        // Edit Mode: Update Report general fields
        const repRes = await ApiService.updateItem<Report>('reports', editingReportId, reportPayload);
        if (!repRes.success) {
          throw new Error(repRes.message || 'Gagal memperbarui laporan utama');
        }

        // Save nested attendance & inventory list items. Use update if has ID, else create
        await Promise.all(
          attTeachersForm.map(att => {
            if (att.id) {
              return ApiService.updateItem<AttendanceTeacher>('attendanceTeachers', att.id, att);
            } else {
              return ApiService.createItem<AttendanceTeacher>('attendanceTeachers', { ...att, report_id: editingReportId });
            }
          })
        );

        await Promise.all(
          attStudentsForm.map(att => {
            if (att.id) {
              return ApiService.updateItem<AttendanceStudent>('attendanceStudents', att.id, att);
            } else {
              return ApiService.createItem<AttendanceStudent>('attendanceStudents', { ...att, report_id: editingReportId });
            }
          })
        );

        await Promise.all(
          inventoriesForm.map(inv => {
            if (inv.id) {
              return ApiService.updateItem<Inventory>('inventories', inv.id, inv);
            } else {
              return ApiService.createItem<Inventory>('inventories', { ...inv, report_id: editingReportId });
            }
          })
        );

      } else {
        // Create Mode: Store new Report
        const reportPayloadNew = { ...reportPayload, status: 'Draft' as ReportStatus };
        const repRes = await ApiService.createItem<Report>('reports', reportPayloadNew);
        if (!repRes.success || !repRes.data) {
          throw new Error(repRes.message || 'Gagal menyimpan laporan utama');
        }

        const reportId = repRes.data.id;

        // Create teacher attendances
        await Promise.all(
          attTeachersForm.map(att =>
            ApiService.createItem<AttendanceTeacher>('attendanceTeachers', {
              ...att,
              report_id: reportId
            })
          )
        );

        // Create student attendances
        await Promise.all(
          attStudentsForm.map(att =>
            ApiService.createItem<AttendanceStudent>('attendanceStudents', {
              ...att,
              report_id: reportId
            })
          )
        );

        // Create inventories
        await Promise.all(
          inventoriesForm.map(inv =>
            ApiService.createItem<Inventory>('inventories', {
              ...inv,
              report_id: reportId
            })
          )
        );
      }

      setIsFormOpen(false);
      onReportCreated();
    } catch (err: any) {
      alert(`Terjadi kesalahan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Update Report Status (Approve / Reject / Submit)
  const handleUpdateStatus = async (report: Report, newStatus: ReportStatus) => {
    if (confirm(`Apakah Anda yakin ingin mengubah status laporan menjadi ${newStatus}?`)) {
      try {
        setLoading(true);
        await ApiService.updateItem<Report>('reports', report.id, { status: newStatus });
        onReportCreated();
        setIsViewOpen(false);
      } catch (e) {
        alert('Gagal mengupdate status laporan');
      } finally {
        setLoading(false);
      }
    }
  };

  // Delete Report
  const handleDeleteReport = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus laporan bulanan ini beserta seluruh data lampirannya?')) {
      try {
        setLoading(true);
        await ApiService.deleteItem('reports', id);
        onReportCreated();
      } catch (e) {
        alert('Gagal menghapus laporan');
      } finally {
        setLoading(false);
      }
    }
  };

  // Student calculations for virtual sheet rendering
  const schoolStudents = selectedReport ? students.filter(s => s.school_id === selectedReport.school_id) : [];
  const maleCount = schoolStudents.filter(s => s.jenis_kelamin === 'L').length;
  const femaleCount = schoolStudents.filter(s => s.jenis_kelamin === 'P').length;
  const totalCount = maleCount + femaleCount;

  const m_A = Math.ceil(maleCount * 0.4);
  const m_B = maleCount - m_A;
  const p_A = Math.ceil(femaleCount * 0.4);
  const p_B = femaleCount - p_A;

  const s_sakit = viewStudents.reduce((acc, curr) => acc + (curr.sakit || 0), 0);
  const s_izin = viewStudents.reduce((acc, curr) => acc + (curr.izin || 0), 0);
  const s_alpha = viewStudents.reduce((acc, curr) => acc + (curr.alpha || 0), 0);
  const s_total_absen = s_sakit + s_izin + s_alpha;
  const s_pct = (totalCount > 0 && selectedReport) ? ((s_total_absen / (totalCount * selectedReport.hari_belajar)) * 100).toFixed(1) : '0.0';

  const getInvQty = (itemName: string, fallback: number) => {
    const item = viewInventories.find(x => x.item_name.toLowerCase().includes(itemName.toLowerCase()));
    return item ? `${item.quantity} buah` : `${fallback} buah`;
  };

  return (
    <div className={isFullscreen ? "fixed inset-0 bg-slate-100 z-50 overflow-y-auto p-6 md:p-8 space-y-6 flex flex-col" : "space-y-6 animate-fade-in"}>
      {/* Fullscreen Mode Top Status Banner */}
      {isFullscreen && (
        <div className="bg-brand-900 text-white rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl border border-brand-800 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-emerald-600/30 text-emerald-400 rounded-2xl">
              <ClipboardList className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide">SIABA - Mode Layar Penuh (Fullscreen)</h3>
              <p className="text-[10px] text-brand-200 font-semibold uppercase tracking-wider">Pimpinan Cabang Aisyiyah Bagian Dikdasmen Klaten Utara</p>
            </div>
          </div>
          <button
            onClick={() => setIsFullscreen(false)}
            className="w-full sm:w-auto px-4 py-2 bg-white/10 hover:bg-white/20 hover:scale-[1.02] active:scale-[0.98] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Minimize2 className="w-4 h-4" />
            Keluar Layar Penuh
          </button>
        </div>
      )}

      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-slate-200/40 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div>
            <span className="text-xs font-black text-slate-800 uppercase tracking-widest font-sans">
              Daftar Laporan Bulanan TK/PAUD Aisyiyah
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pilih Bulan:</span>
            <select
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
              className="border border-slate-200 bg-white rounded-xl px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 font-semibold cursor-pointer shadow-sm"
            >
              <option value="Semua">Semua Bulan</option>
              {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Fullscreen Toggle Button */}
            {!isFullscreen && (
              <button
                onClick={() => setIsFullscreen(true)}
                className="border border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white text-slate-600 rounded-xl px-3 py-1 text-xs font-semibold cursor-pointer shadow-sm flex items-center gap-1.5 transition-colors"
                title="Tampilan Layar Penuh (Fullscreen)"
              >
                <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                Layar Penuh
              </button>
            )}
          </div>
        </div>

        {isPetugas && (
          <button
            id="create-report-btn"
            onClick={handleOpenCreateForm}
            className="bg-brand-600 hover:bg-brand-700 text-white py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md shadow-brand-600/10 cursor-pointer font-sans"
          >
            <Plus className="w-4.5 h-4.5" />
            Isi Laporan Bulanan Baru
          </button>
        )}
      </div>

      {/* PANEL PETUGAS SEKOLAH - 12 MONTH BENTO TRACKER */}
      {isPetugas && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-950 text-base">Panel Pengisian Laporan Bulanan</h3>
                <p className="text-xs text-slate-500">
                  Selamat datang, Petugas <b>{getSchoolName(user.school_id)}</b>. Silakan lengkapi laporan sekolah bulanan Anda di bawah ini.
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenCreateForm}
              className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4.5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-brand-600/10 transition-all cursor-pointer hover:scale-[1.01]"
            >
              <Plus className="w-4 h-4" />
              Buat Laporan Baru
            </button>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status Pengisian Laporan 12 Bulan (Tahun Pelajaran: 2025/2026)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'].map((bln) => {
                const rep = reports.find(r => r.school_id === user.school_id && r.bulan.toLowerCase() === bln.toLowerCase());
                
                return (
                  <div 
                    key={bln} 
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[120px] ${
                      rep?.status === 'Approved'
                        ? 'bg-emerald-50/40 border-emerald-100 hover:border-emerald-200'
                        : rep?.status === 'Submitted'
                        ? 'bg-blue-50/40 border-blue-100 hover:border-blue-200'
                        : rep?.status === 'Rejected'
                        ? 'bg-rose-50/40 border-rose-100 hover:border-rose-200'
                        : rep?.status === 'Draft'
                        ? 'bg-amber-50/30 border-amber-100 hover:border-amber-200'
                        : 'bg-slate-50/50 border-slate-200/60 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold text-slate-800 text-xs">{bln}</span>
                        {rep ? (
                          <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase ${
                            rep.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rep.status === 'Submitted'
                              ? 'bg-blue-100 text-blue-800'
                              : rep.status === 'Rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {rep.status === 'Submitted' ? 'PENDING' : rep.status}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-full text-[8px] font-bold uppercase">
                            KOSONG
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {rep ? `${rep.hari_belajar} Hari Belajar` : 'Belum diisi'}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100/60">
                      {rep ? (
                        <div className="flex items-center justify-between gap-1.5">
                          <button
                            onClick={() => loadReportDetails(rep)}
                            className="text-[10px] font-bold text-slate-500 hover:text-brand-600 transition-colors cursor-pointer"
                          >
                            Lihat
                          </button>
                          
                          {rep.status === 'Draft' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleOpenEditForm(rep)}
                                className="text-[10px] font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(rep, 'Submitted')}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                              >
                                Kirim
                              </button>
                            </div>
                          )}

                          {rep.status === 'Rejected' && (
                            <button
                              onClick={() => handleOpenEditForm(rep)}
                              className="text-[10px] font-extrabold text-rose-600 hover:text-rose-700 animate-pulse cursor-pointer"
                              title="Klik untuk merevisi laporan Anda"
                            >
                              Revisi
                            </button>
                          )}

                          {rep.status === 'Approved' && (
                            <span className="text-[9px] font-extrabold text-emerald-600 flex items-center gap-0.5">
                              <CheckCircle className="w-3 h-3" /> Ready
                            </span>
                          )}
                          
                          {rep.status === 'Submitted' && (
                            <span className="text-[9px] font-bold text-blue-500 italic">
                              Review
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            handleOpenCreateForm();
                            setGeneralFields(prev => ({ ...prev, bulan: bln }));
                          }}
                          className="text-[10px] font-extrabold text-brand-600 hover:text-brand-700 flex items-center gap-0.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Isi Laporan
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ADMIN / SUPER ADMIN APPROVAL QUEUE PANEL */}
      {(isAdmin || isSuperAdmin) && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Pusat Persetujuan Laporan (Approval Center)</h3>
                <p className="text-[11px] text-slate-500">
                  Daftar laporan bulanan sekolah yang dikirim oleh petugas dan menunggu verifikasi Anda.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded-full uppercase">
              {reports.filter(r => r.status === 'Submitted').length} Antrean
            </span>
          </div>

          {reports.filter(r => r.status === 'Submitted').length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.filter(r => r.status === 'Submitted').map((rep) => (
                <div key={rep.id} className="bg-slate-50/50 border border-slate-200/60 p-4 rounded-2xl flex flex-col justify-between gap-4 hover:border-slate-300 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{rep.bulan} {rep.tahun_pelajaran}</span>
                      <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-extrabold rounded-md uppercase">
                        Menunggu Approval
                      </span>
                    </div>
                    <h4 className="font-black text-slate-800 text-xs leading-snug">{getSchoolName(rep.school_id)}</h4>
                    <p className="text-[10px] text-slate-500 font-mono">ID Laporan: {rep.id}</p>
                    {rep.notes && (
                      <p className="text-[10px] text-slate-500 bg-white border border-slate-100 p-1.5 rounded-lg italic mt-1.5">
                        " {rep.notes} "
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => loadReportDetails(rep)}
                      className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10px] py-1.5 px-2 rounded-xl text-center cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> Review
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(rep, 'Approved')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] py-1.5 px-2 rounded-xl text-center cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Check className="w-3 h-3" /> Approve
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(rep, 'Rejected')}
                      className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-[10px] py-1.5 px-2 rounded-xl text-center cursor-pointer flex items-center justify-center gap-1"
                    >
                      <X className="w-3 h-3" /> Tolak
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center bg-slate-50/50 rounded-2xl border border-slate-200/40">
              <p className="text-slate-400 text-xs">
                🎉 Semua laporan telah diproses! Tidak ada antrean laporan bulanan yang menunggu persetujuan saat ini.
              </p>
            </div>
          )}
        </div>
      )}

      {/* PANEL REKAP BULANAN */}
      {filterBulan !== 'Semua' && (
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden animate-fade-in border border-emerald-700/30">
          {/* Decorative background elements */}
          <div className="absolute right-0 bottom-0 translate-y-6 translate-x-6 opacity-10">
            <ClipboardList className="w-64 h-64 text-white" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <span className="px-2.5 py-1 bg-emerald-700/50 rounded-full text-[10px] font-bold tracking-wider uppercase border border-emerald-500/30">
                Rekapitulasi Bulanan Terpadu
              </span>
              <h2 className="text-lg md:text-xl font-black tracking-tight">
                Unduh Semua Laporan Bulan {filterBulan} 2026
              </h2>
              <p className="text-xs text-emerald-100 max-w-xl leading-relaxed">
                Anda dapat mengunduh seluruh dokumen laporan bulanan sekolah TK/PAUD Aisyiyah untuk bulan <b>{filterBulan}</b> secara kolektif. Format Excel berisi rekapitulasi ringkasan serta sheet detail untuk masing-masing sekolah. Format PDF menggabungkan seluruh dokumen A4 siap cetak.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <button
                disabled={loadingMonthly || filteredReports.length === 0}
                onClick={triggerMonthlyExcelExport}
                className="bg-white hover:bg-emerald-50 disabled:bg-slate-100/50 text-emerald-900 disabled:text-slate-400 font-bold text-xs px-4.5 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
              >
                {loadingMonthly ? (
                  <div className="w-4 h-4 border-2 border-emerald-900 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-600" />
                )}
                Unduh Rekap Excel (.xlsx)
              </button>

              <button
                disabled={loadingMonthly || filteredReports.length === 0}
                onClick={triggerMonthlyPdfExport}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-100/50 text-white disabled:text-slate-400 font-bold text-xs px-4.5 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all border border-emerald-500/30 hover:scale-[1.02] cursor-pointer"
              >
                {loadingMonthly ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Download className="w-4.5 h-4.5" />
                )}
                Unduh Rekap PDF (.pdf)
              </button>
            </div>
          </div>
          
          {filteredReports.length === 0 && (
            <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-emerald-200/80 flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Belum ada laporan bulanan yang terekam pada bulan {filterBulan} untuk diunduh.</span>
            </div>
          )}
        </div>
      )}

      {/* Reports Table Grid */}
      <div className="bg-white border border-slate-200/60 rounded-3xl shadow-sm overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="p-4">TK / PAUD Sekolah</th>
                <th className="p-4">Bulan</th>
                <th className="p-4">Tahun Pelajaran</th>
                <th className="p-4 text-center">Hari Belajar</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="p-4 font-semibold text-slate-800">
                    {getSchoolName(report.school_id)}
                  </td>
                  <td className="p-4 font-semibold">{report.bulan}</td>
                  <td className="p-4 font-mono">{report.tahun_pelajaran} - {report.semester}</td>
                  <td className="p-4 text-center font-mono">{report.hari_belajar} Hari</td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      report.status === 'Approved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : report.status === 'Submitted'
                        ? 'bg-blue-50 text-blue-700 border-blue-100'
                        : report.status === 'Rejected'
                        ? 'bg-rose-50 text-rose-700 border-rose-100'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="p-4 text-right flex justify-end gap-1.5 items-center">
                    <button
                      id={`view-report-${report.id}`}
                      onClick={() => loadReportDetails(report)}
                      className="p-1.5 bg-slate-50 hover:bg-brand-50 border border-slate-200 text-slate-500 hover:text-brand-700 rounded-lg cursor-pointer"
                      title="Lihat & Cetak PDF"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    
                    <button
                      id={`excel-report-${report.id}`}
                      onClick={() => triggerExcelExport(report)}
                      className="p-1.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 text-slate-500 hover:text-emerald-700 rounded-lg cursor-pointer"
                      title="Download Excel"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    </button>

                    {(isAdmin || isSuperAdmin) && (
                      <button
                        id={`delete-report-${report.id}`}
                        onClick={() => handleDeleteReport(report.id)}
                        className="p-1.5 bg-slate-50 hover:bg-rose-50 border border-slate-200 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                        title="Hapus Laporan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-16 text-center text-slate-400 font-sans">
                    Belum ada laporan bulanan yang diinput untuk kriteria pencarian atau bulan ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* STEPPED MULTI-STEP CREATION FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-fade-in border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-brand-600 text-white rounded-lg"><ClipboardList className="w-4.5 h-4.5" /></span>
                <span className="font-bold text-slate-800 text-sm">Isi Formulir Laporan Bulanan</span>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono font-semibold">
                Langkah {formStep} dari 4
              </span>
            </div>

            {/* Steps Nav Tracker */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 grid grid-cols-4 gap-1 text-[10px] font-semibold text-slate-400 text-center uppercase tracking-wide">
              <span className={formStep === 1 ? 'text-brand-600 font-bold' : ''}>1. Umum</span>
              <span className={formStep === 2 ? 'text-brand-600 font-bold' : ''}>2. Guru</span>
              <span className={formStep === 3 ? 'text-brand-600 font-bold' : ''}>3. Murid</span>
              <span className={formStep === 4 ? 'text-brand-600 font-bold' : ''}>4. Sarpras</span>
            </div>

            {/* Stepped Form Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 font-sans text-xs text-slate-700">
              {formStep === 1 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide border-b pb-2">Informasi Umum Laporan</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {!isPetugas ? (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Sekolah Penanggung Jawab</label>
                        <select
                          required
                          value={generalFields.school_id}
                          onChange={(e) => setGeneralFields({ ...generalFields, school_id: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white"
                        >
                          <option value="">-- Pilih Sekolah --</option>
                          {schools.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Sekolah Penanggung Jawab</label>
                        <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 font-semibold">
                          {getSchoolName(user.school_id)}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Bulan</label>
                        <select
                          value={generalFields.bulan}
                          onChange={(e) => setGeneralFields({ ...generalFields, bulan: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
                        >
                          {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Hari Belajar</label>
                        <input
                          type="number"
                          value={generalFields.hari_belajar}
                          onChange={(e) => setGeneralFields({ ...generalFields, hari_belajar: Number(e.target.value) })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tahun Pelajaran</label>
                        <input
                          type="text"
                          value={generalFields.tahun_pelajaran}
                          onChange={(e) => setGeneralFields({ ...generalFields, tahun_pelajaran: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Semester</label>
                        <select
                          value={generalFields.semester}
                          onChange={(e) => setGeneralFields({ ...generalFields, semester: e.target.value as any })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
                        >
                          <option value="Ganjil">Ganjil</option>
                          <option value="Genap">Genap</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status Gedung</label>
                        <input
                          type="text"
                          value={generalFields.status_gedung}
                          onChange={(e) => setGeneralFields({ ...generalFields, status_gedung: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Jumlah Kelas</label>
                        <input
                          type="number"
                          value={generalFields.jumlah_ruangan}
                          onChange={(e) => setGeneralFields({ ...generalFields, jumlah_ruangan: Number(e.target.value) })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Catatan Tambahan (Optional)</label>
                      <textarea
                        value={generalFields.notes}
                        onChange={(e) => setGeneralFields({ ...generalFields, notes: e.target.value })}
                        placeholder="Masukkan catatan pendukung laporan..."
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs h-16"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formStep === 2 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide border-b pb-2">Absensi Kehadiran Guru</h4>
                  <p className="text-[10px] text-slate-400">Silakan input jumlah hari ketidakhadiran guru dalam bulan ini.</p>
                  
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                          <th className="p-2.5">Nama Guru</th>
                          <th className="p-2.5 text-center">Hadir</th>
                          <th className="p-2.5 text-center">Izin</th>
                          <th className="p-2.5 text-center">Sakit</th>
                          <th className="p-2.5 text-center">Alpha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {attTeachersForm.map((att, index) => (
                          <tr key={index}>
                            <td className="p-2.5 font-semibold text-slate-700">{att.nama_guru}</td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                value={att.hadir || 0}
                                onChange={(e) => {
                                  const updated = [...attTeachersForm];
                                  updated[index].hadir = Number(e.target.value);
                                  setAttTeachersForm(updated);
                                }}
                                className="w-14 border border-slate-200 rounded px-1.5 py-1 text-center font-mono text-xs"
                              />
                            </td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                value={att.izin || 0}
                                onChange={(e) => {
                                  const updated = [...attTeachersForm];
                                  updated[index].izin = Number(e.target.value);
                                  setAttTeachersForm(updated);
                                }}
                                className="w-14 border border-slate-200 rounded px-1.5 py-1 text-center font-mono text-xs"
                              />
                            </td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                value={att.sakit || 0}
                                onChange={(e) => {
                                  const updated = [...attTeachersForm];
                                  updated[index].sakit = Number(e.target.value);
                                  setAttTeachersForm(updated);
                                }}
                                className="w-14 border border-slate-200 rounded px-1.5 py-1 text-center font-mono text-xs"
                              />
                            </td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                value={att.alpha || 0}
                                onChange={(e) => {
                                  const updated = [...attTeachersForm];
                                  updated[index].alpha = Number(e.target.value);
                                  setAttTeachersForm(updated);
                                }}
                                className="w-14 border border-slate-200 rounded px-1.5 py-1 text-center font-mono text-xs"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {formStep === 3 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide border-b pb-2">Absensi Kehadiran Murid</h4>
                  <p className="text-[10px] text-slate-400">Input total hari kehadiran kumulatif seluruh murid berdasarkan gender.</p>

                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                          <th className="p-3">Gender Murid</th>
                          <th className="p-3 text-center">Hadir</th>
                          <th className="p-3 text-center">Izin</th>
                          <th className="p-3 text-center">Sakit</th>
                          <th className="p-3 text-center">Alpha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {attStudentsForm.map((att, index) => (
                          <tr key={index}>
                            <td className="p-3 font-semibold text-slate-700">
                              {att.jenis_kelamin === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="number"
                                value={att.hadir || 0}
                                onChange={(e) => {
                                  const updated = [...attStudentsForm];
                                  updated[index].hadir = Number(e.target.value);
                                  setAttStudentsForm(updated);
                                }}
                                className="w-20 border border-slate-200 rounded px-2 py-1 text-center font-mono"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="number"
                                value={att.izin || 0}
                                onChange={(e) => {
                                  const updated = [...attStudentsForm];
                                  updated[index].izin = Number(e.target.value);
                                  setAttStudentsForm(updated);
                                }}
                                className="w-20 border border-slate-200 rounded px-2 py-1 text-center font-mono"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="number"
                                value={att.sakit || 0}
                                onChange={(e) => {
                                  const updated = [...attStudentsForm];
                                  updated[index].sakit = Number(e.target.value);
                                  setAttStudentsForm(updated);
                                }}
                                className="w-20 border border-slate-200 rounded px-2 py-1 text-center font-mono"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="number"
                                value={att.alpha || 0}
                                onChange={(e) => {
                                  const updated = [...attStudentsForm];
                                  updated[index].alpha = Number(e.target.value);
                                  setAttStudentsForm(updated);
                                }}
                                className="w-20 border border-slate-200 rounded px-2 py-1 text-center font-mono"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {formStep === 4 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide border-b pb-2">Inventaris Sarana Prasarana</h4>
                  <p className="text-[10px] text-slate-400">Periksa kondisi dan kuantitas item inventaris di sekolah.</p>

                  <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[35vh] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold sticky top-0 z-10">
                          <th className="p-2.5">Nama Barang</th>
                          <th className="p-2.5 text-center">Total Unit</th>
                          <th className="p-2.5 text-center">Baik</th>
                          <th className="p-2.5 text-center">Rusak</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inventoriesForm.map((inv, index) => (
                          <tr key={index}>
                            <td className="p-2.5 font-semibold text-slate-700">{inv.item_name}</td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                value={inv.quantity || 0}
                                onChange={(e) => {
                                  const updated = [...inventoriesForm];
                                  updated[index].quantity = Number(e.target.value);
                                  // Auto adjust status baik
                                  updated[index].status_baik = Number(e.target.value) - (updated[index].status_rusak || 0);
                                  setInventoriesForm(updated);
                                }}
                                className="w-16 border border-slate-200 rounded px-1.5 py-1 text-center font-mono"
                              />
                            </td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                value={inv.status_baik || 0}
                                onChange={(e) => {
                                  const updated = [...inventoriesForm];
                                  updated[index].status_baik = Number(e.target.value);
                                  setInventoriesForm(updated);
                                }}
                                className="w-16 border border-slate-200 rounded px-1.5 py-1 text-center font-mono"
                              />
                            </td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                value={inv.status_rusak || 0}
                                onChange={(e) => {
                                  const updated = [...inventoriesForm];
                                  updated[index].status_rusak = Number(e.target.value);
                                  // Auto adjust status baik
                                  updated[index].status_baik = (updated[index].quantity || 0) - Number(e.target.value);
                                  setInventoriesForm(updated);
                                }}
                                className="w-16 border border-slate-200 rounded px-1.5 py-1 text-center font-mono"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Form Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setFormStep(Math.max(1, formStep - 1))}
                disabled={formStep === 1}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-600 disabled:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Kembali
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>

                {formStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => setFormStep(formStep + 1)}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    Lanjut
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveReport}
                    disabled={loading}
                    className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-brand-600/15"
                  >
                    {loading && <X className="w-3.5 h-3.5 animate-spin" />}
                    Simpan & Submit Draft
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PIXEL-PERFECT A4 REPORT LIVE PREVIEW MODAL */}
      {isViewOpen && selectedReport && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className={isModalFullscreen 
            ? "bg-slate-900 w-full h-full fixed inset-0 z-50 flex flex-col animate-fade-in" 
            : "bg-slate-900 w-full sm:max-w-4xl h-full sm:h-[95vh] sm:rounded-3xl shadow-2xl animate-fade-in border-0 sm:border border-slate-800 flex flex-col overflow-hidden"}
          >
            
            {/* Toolbar Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-850 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setIsViewOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700/60"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Kembali ke Daftar
                </button>
                <div className="h-6 w-px bg-slate-800 hidden md:block"></div>
                <div className="flex items-center gap-2 text-brand-400">
                  <FileText className="w-4 h-4" />
                  <div>
                    <h3 className="font-bold text-white text-xs font-sans">Dokumen Preview Laporan Bulanan</h3>
                    <p className="text-[10px] text-slate-400">Format Standard Aisyiyah Bustanul Athfal</p>
                  </div>
                </div>
              </div>

              {/* Action buttons on Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Print/Download triggers */}
                <button
                  onClick={() => ExportEngine.exportToPdf('a4-print-sheet', getSchoolName(selectedReport.school_id), selectedReport.bulan)}
                  className="bg-brand-600 hover:bg-brand-700 text-white text-xs px-3.5 py-2 rounded-xl font-semibold flex items-center gap-1.5 shadow-md shadow-brand-600/10 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>

                <button
                  onClick={() => triggerExcelExport(selectedReport)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-2 rounded-xl font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/10 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel
                </button>

                {/* Status updates only for Admin, Super Admin and Petugas */}
                {(isAdmin || isSuperAdmin) && selectedReport.status === 'Submitted' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(selectedReport, 'Approved')}
                      className="bg-emerald-500/20 hover:bg-emerald-500 hover:text-white border border-emerald-500/50 text-emerald-300 text-xs px-3 py-2 rounded-xl font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedReport, 'Rejected')}
                      className="bg-rose-500/20 hover:bg-rose-50 hover:text-rose-950 border border-rose-500/50 text-rose-300 text-xs px-3 py-2 rounded-xl font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  </>
                )}

                {isPetugas && selectedReport.status === 'Draft' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedReport, 'Submitted')}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    Kirim ke Pusat
                  </button>
                )}

                {/* Fullscreen Modal Toggle Button */}
                <button
                  onClick={() => setIsModalFullscreen(!isModalFullscreen)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title={isModalFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
                >
                  {isModalFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>

                <button
                  onClick={() => setIsViewOpen(false)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Viewport container with virtual A4 sheet */}
            <div className="flex-1 overflow-auto p-4 sm:p-8 bg-slate-950 flex flex-col items-center gap-6 w-full">
              <div 
                className="w-full flex justify-center origin-top shrink-0" 
                style={scaleFactor < 1 ? { height: `${2269 * scaleFactor}px`, overflow: 'hidden' } : undefined}
              >
                {/* VIRTUAL A4 SHEET CONTAINER */}
                <div
                  id="a4-print-sheet"
                  className="flex flex-col gap-6 w-[210mm] text-slate-900 select-text origin-top shrink-0"
                  style={{ 
                    contentVisibility: 'auto',
                    transform: scaleFactor < 1 ? `scale(${scaleFactor})` : undefined,
                    transformOrigin: 'top center'
                  }}
                >
                {/* PAGE 1: IDENTITAS & SARANA PRASARANA */}
                <div className="w-[210mm] h-[297mm] bg-white p-[15mm] flex flex-col justify-between shadow-2xl relative border border-slate-200">
                  <div>
                    {/* Official Letterhead */}
                    <div className="text-center border-b-2 border-slate-900 pb-2 mb-4">
                      <div className="flex items-center justify-between">
                        {/* Left Green Logo */}
                        <div className="w-14 h-14 bg-emerald-700 rounded-full flex flex-col items-center justify-center font-bold text-white shrink-0 shadow-sm border border-emerald-600">
                          <span className="text-[12px] font-black leading-none tracking-tighter">ABA</span>
                          <span className="text-[6px] font-medium leading-none tracking-widest mt-0.5">AISYIYAH</span>
                        </div>
                        <div className="flex-1 text-center">
                          <h2 className="text-[11px] uppercase font-black tracking-widest text-emerald-800 leading-none">LAPORAN BULANAN</h2>
                          <h1 className="text-[14px] font-extrabold text-slate-900 uppercase font-sans mt-1">BUSTANUL ATHFAL AISYIYAH</h1>
                          <h2 className="text-[11px] font-bold text-slate-800 uppercase font-sans mt-0.5">DAERAH KLATEN</h2>
                          <p className="text-[8px] text-slate-500 mt-0.5 font-medium leading-none">
                            Pimpinan Cabang Aisyiyah Bagian Dikdasmen Klaten Utara Daerah Klaten.
                          </p>
                        </div>
                        {/* Right QR Code or similar */}
                        <div className="border border-slate-300 p-1 rounded-lg shrink-0 flex flex-col items-center bg-slate-50">
                          <QrCode className="w-8 h-8 text-slate-800" />
                          <span className="text-[5px] text-slate-400 font-mono mt-0.5 uppercase font-bold leading-none">VALIDATED</span>
                        </div>
                      </div>
                    </div>

                    {/* Document Header Info */}
                    <div className="text-center my-3 bg-slate-50 py-2.5 rounded-xl border border-slate-200/80 shadow-sm">
                      <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-800 font-sans leading-none">
                        PROFIL & KEADAAN UMUM SEKOLAH
                      </h3>
                      <p className="text-[9px] text-slate-600 font-sans mt-1.5">
                        Bulan Laporan: <b className="text-emerald-800 font-black">{selectedReport.bulan} {String(selectedReport.tahun_pelajaran || '').includes('/') ? String(selectedReport.tahun_pelajaran).split('/')[0] : String(selectedReport.tahun_pelajaran || '2026')}</b> | Tahun Pelajaran: <b className="text-slate-900 font-bold">{selectedReport.tahun_pelajaran}</b> | Semester: <b className="text-slate-900 font-bold">{selectedReport.semester}</b>
                      </p>
                    </div>

                    {/* Section 1: Identitas Sekolah 1-9 */}
                    <div className="grid grid-cols-1 gap-y-1.5 text-[9px] text-slate-700 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                      <div className="grid grid-cols-[20px_220px_10px_1fr] items-center">
                        <span className="font-bold text-emerald-800">1.</span>
                        <span className="font-medium text-slate-600">Nama TK / PAUD Sekolah</span>
                        <span className="text-slate-400 text-center">:</span>
                        <span className="font-bold uppercase text-slate-900">{getSchoolName(selectedReport.school_id)}</span>
                      </div>

                      <div className="grid grid-cols-[20px_220px_10px_1fr] items-center">
                        <span className="font-bold text-emerald-800">2.</span>
                        <span className="font-medium text-slate-600">NSM / NPSN</span>
                        <span className="text-slate-400 text-center">:</span>
                        <span className="font-mono text-slate-900 font-bold">{getSchoolDetails(selectedReport.school_id)?.nsm || '101233100001'} / {getSchoolDetails(selectedReport.school_id)?.npsn || '69741194'}</span>
                      </div>

                      <div className="grid grid-cols-[20px_220px_10px_1fr] items-start">
                        <span className="font-bold text-emerald-800 pt-0.5">3.</span>
                        <span className="font-medium text-slate-600 pt-0.5">Alamat Lengkap Kelurahan</span>
                        <span className="text-slate-400 text-center pt-0.5">:</span>
                        <span className="text-slate-900 font-semibold leading-tight">
                          {getSchoolDetails(selectedReport.school_id)?.alamat || 'Macanan 02/01'}, {' '}
                          {getSchoolDetails(selectedReport.school_id)?.kelurahan || 'Karanganom'}, {' '}
                          {getSchoolDetails(selectedReport.school_id)?.kecamatan || 'Klaten Utara'}, {' '}
                          {getSchoolDetails(selectedReport.school_id)?.kabupaten || 'Klaten'}
                        </span>
                      </div>

                      <div className="grid grid-cols-[20px_220px_10px_1fr] items-center">
                        <span className="font-bold text-emerald-800">4.</span>
                        <span className="font-medium text-slate-600">Didirikan Pada Tanggal / Tahun Berdiri</span>
                        <span className="text-slate-400 text-center">:</span>
                        <span className="text-slate-800 font-medium">{getSchoolDetails(selectedReport.school_id)?.tahun_berdiri || '01 September 1964'}</span>
                      </div>

                      <div className="grid grid-cols-[20px_220px_10px_1fr] items-center">
                        <span className="font-bold text-emerald-800">5.</span>
                        <span className="font-medium text-slate-600">Jenjang / Jenis TK</span>
                        <span className="text-slate-400 text-center">:</span>
                        <span className="text-slate-800 font-semibold">{getSchoolDetails(selectedReport.school_id)?.jenjang || 'TK'} Biasa / Reguler</span>
                      </div>

                      <div className="grid grid-cols-[20px_220px_10px_1fr] items-center">
                        <span className="font-bold text-emerald-800">6.</span>
                        <span className="font-medium text-slate-600">Kondisi Fisik Gedung Sekolah</span>
                        <span className="text-slate-400 text-center">:</span>
                        <span className="text-slate-800 font-semibold">{getSchoolDetails(selectedReport.school_id)?.status_gedung === 'Milik Sendiri' ? 'Sangat Baik (Sangat Layak)' : 'Cukup Baik'}</span>
                      </div>

                      <div className="grid grid-cols-[20px_220px_10px_1fr] items-center">
                        <span className="font-bold text-emerald-800">7.</span>
                        <span className="font-medium text-slate-600">Jumlah Hari Sekolah (Hari Efektif)</span>
                        <span className="text-slate-400 text-center">:</span>
                        <span className="font-mono text-emerald-800 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">{selectedReport.hari_belajar || 23} Hari Belajar</span>
                      </div>

                      <div className="grid grid-cols-[20px_220px_10px_1fr] items-center">
                        <span className="font-bold text-emerald-800">8.</span>
                        <span className="font-medium text-slate-600">Status Pemilikan Gedung / Tanah</span>
                        <span className="text-slate-400 text-center">:</span>
                        <span className="text-slate-800 font-semibold">{getSchoolDetails(selectedReport.school_id)?.status_tanah || 'Persyarikatan Yayasan'}</span>
                      </div>

                      <div className="grid grid-cols-[20px_220px_10px_1fr] items-center">
                        <span className="font-bold text-emerald-800">9.</span>
                        <span className="font-medium text-slate-600">Banyak Gedung / Ruang Belajar Aktif</span>
                        <span className="text-slate-400 text-center">:</span>
                        <span className="font-mono text-slate-900 font-semibold">{getSchoolDetails(selectedReport.school_id)?.jumlah_ruang || selectedReport.jumlah_ruangan || 2} Buah Gedung / {getSchoolDetails(selectedReport.school_id)?.jumlah_ruang || selectedReport.jumlah_ruangan || 2} Ruangan Kelas</span>
                      </div>
                    </div>

                    {/* 10. Alat-Alat Perlengkapan Umum */}
                    <div className="mt-3.5 text-[9px] text-slate-800 border-t border-slate-200/80 pt-2.5">
                      <span className="font-bold text-emerald-800 block mb-1.5">10. Alat-Alat Perlengkapan Umum Sekolah :</span>
                      <div className="grid grid-cols-3 gap-y-2 gap-x-6 pl-2 text-[8.5px]">
                        <div className="flex justify-between border-b border-dashed border-slate-200 pb-0.5">
                          <span className="text-slate-500">a. Halaman Bermain</span>
                          <span className="font-bold text-emerald-700">Ada</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-slate-200 pb-0.5">
                          <span className="text-slate-500">b. Alat Bermain Besar</span>
                          <span className="font-bold text-emerald-700">Ada</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-slate-200 pb-0.5">
                          <span className="text-slate-500">c. Ruang Kantor</span>
                          <span className="font-bold text-emerald-700">Ada</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-slate-200 pb-0.5">
                          <span className="text-slate-500">d. Ruang Gudang</span>
                          <span className="font-bold text-emerald-700">Ada</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-slate-200 pb-0.5">
                          <span className="text-slate-500">e. Ruang Dapur</span>
                          <span className="font-bold text-slate-400">Tidak ada</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-slate-200 pb-0.5">
                          <span className="text-slate-500">f. Kamar Mandi & WC</span>
                          <span className="font-bold text-emerald-700">Ada</span>
                        </div>
                      </div>
                    </div>

                    {/* 11. Alat-Alat Perlengkapan Khusus */}
                    <div className="mt-3.5 text-[9px] text-slate-800 border-t border-slate-200/80 pt-2.5">
                      <span className="font-bold text-emerald-800 block mb-1.5">11. Alat-Alat Perlengkapan Khusus Kelas (Kuantitas Terdaftar) :</span>
                      <div className="grid grid-cols-2 gap-x-12 gap-y-1.5 pl-2 text-[8.5px]">
                        {/* Left column: a-f */}
                        <div className="space-y-1">
                          <div className="flex justify-between border-b border-slate-100 pb-0.5">
                            <span className="text-slate-500">a. Kursi Anak</span>
                            <span className="font-bold font-mono text-slate-900">{getInvQty('kursi anak', 40)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-0.5">
                            <span className="text-slate-500">b. Meja Anak</span>
                            <span className="font-bold font-mono text-slate-900">{getInvQty('meja anak', 20)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-0.5">
                            <span className="text-slate-500">c. Kursi Guru</span>
                            <span className="font-bold font-mono text-slate-900">{getInvQty('kursi guru', 5)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-0.5">
                            <span className="text-slate-500">d. Meja Guru</span>
                            <span className="font-bold font-mono text-slate-900">{getInvQty('meja guru', 2)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-0.5">
                            <span className="text-slate-500">e. Papan Tulis</span>
                            <span className="font-bold font-mono text-slate-900">{getInvQty('papan tulis', 2)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-0.5">
                            <span className="text-slate-500">f. Lemari Besar</span>
                            <span className="font-bold font-mono text-slate-900">{getInvQty('lemari', 2)}</span>
                          </div>
                        </div>
                        {/* Right column: g-l */}
                        <div className="space-y-1">
                          <div className="flex justify-between border-b border-slate-100 pb-0.5">
                            <span className="text-slate-500">g. Lemari Kecil / Rak Buku</span>
                            <span className="font-bold font-mono text-slate-900">{getInvQty('rak', 2)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-0.5">
                            <span className="text-slate-500">h. Timbangan Badan</span>
                            <span className="font-bold font-mono text-slate-900">{getInvQty('timbangan', 1)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-0.5">
                            <span className="text-slate-500">i. Kotak / Lemari PPPK</span>
                            <span className="font-bold font-mono text-slate-900">{getInvQty('pppk', 1)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-0.5">
                            <span className="text-slate-500">j. Alat Ukur Tinggi Badan</span>
                            <span className="font-bold font-mono text-slate-900">{getInvQty('tinggi', 1)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-0.5">
                            <span className="text-slate-500">k. Dipan UKS</span>
                            <span className="text-slate-400 font-mono">{getInvQty('dipan', 0)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-0.5">
                            <span className="text-slate-500">l. Bak Pasir / Bak Air Bermain</span>
                            <span className="font-bold font-mono text-slate-900">{getInvQty('bak', 1)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 12. Sudut-Sudut Pembelajaran */}
                    <div className="mt-3.5 text-[9px] text-slate-800 border-t border-slate-200/80 pt-2.5">
                      <span className="font-bold text-emerald-800 block mb-1.5">12. Keadaan Sudut-Sudut Pembelajaran Kelas (Corners) :</span>
                      <div className="grid grid-cols-2 gap-x-12 gap-y-1.5 pl-2 text-[8.5px]">
                        <div className="flex justify-between border-b border-slate-100 pb-0.5">
                          <span className="text-slate-500">a. Sudut Ke-Tuhanan / Religi</span>
                          <span className="text-emerald-700 font-bold uppercase text-[7px] bg-emerald-50 px-1.5 py-0.5 rounded">Sempurna</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-0.5">
                          <span className="text-slate-500">b. Sudut Keluarga / Sosial</span>
                          <span className="text-emerald-700 font-bold uppercase text-[7px] bg-emerald-50 px-1.5 py-0.5 rounded">Sempurna</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-0.5">
                          <span className="text-slate-500">c. Sudut Alam Sekitar & IPA</span>
                          <span className="text-amber-700 font-semibold uppercase text-[7px] bg-amber-50 px-1.5 py-0.5 rounded">Cukup Baik</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-0.5">
                          <span className="text-slate-500">d. Sudut Kebudayaan / Seni</span>
                          <span className="text-emerald-700 font-bold uppercase text-[7px] bg-emerald-50 px-1.5 py-0.5 rounded">Sempurna</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-0.5 sm:col-span-2">
                          <span className="text-slate-500">e. Sudut Pembangunan / Balok</span>
                          <span className="text-amber-700 font-semibold uppercase text-[7px] bg-amber-50 px-1.5 py-0.5 rounded">Cukup Baik</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Page Footer Label */}
                  <div className="text-center text-[8px] text-slate-400 font-mono border-t border-slate-100 pt-2">
                    Laporan Bulanan ABA Klaten | Halaman 1 dari 2
                  </div>
                </div>

                {/* PAGE 2: KEADAAN GURU, BANYAK MURID, AGAMA, ABSENSI & SIGNATURES */}
                <div className="w-[210mm] h-[297mm] bg-white p-[15mm] flex flex-col justify-between shadow-2xl relative border border-slate-200">
                  <div className="space-y-4">
                    {/* Section 15: Keadaan Guru */}
                    <div>
                      <h4 className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1.5 border-b border-emerald-100 pb-1 font-sans">
                        15. KEADAAN GURU & TENAGA KEPENDIDIKAN
                      </h4>
                      <div className="border border-slate-400 rounded-lg overflow-hidden">
                        <table className="w-full text-left border-collapse text-[7px] leading-tight font-sans">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-400 text-[6.5px] font-bold text-center">
                              <th rowSpan={2} className="p-1 border-r border-slate-400 w-4">No</th>
                              <th rowSpan={2} className="p-1 border-r border-slate-400 w-24">NAMA GURU / NIP</th>
                              <th rowSpan={2} className="p-1 border-r border-slate-400 w-5">L/P</th>
                              <th rowSpan={2} className="p-1 border-r border-slate-400 w-20">Tempat/Tgl Lahir</th>
                              <th rowSpan={2} className="p-1 border-r border-slate-400 w-8">Agama</th>
                              <th rowSpan={2} className="p-1 border-r border-slate-400 w-12">Ijazah / Thn</th>
                              <th rowSpan={2} className="p-1 border-r border-slate-400 w-18">Jabatan</th>
                              <th colSpan={2} className="p-0.5 border-r border-slate-400 border-b border-slate-400">Status Pegawai</th>
                              <th rowSpan={2} className="p-1 border-r border-slate-400 w-8">Gol</th>
                              <th rowSpan={2} className="p-1 border-r border-slate-400 w-14">TMT</th>
                              <th rowSpan={2} className="p-1 border-r border-slate-400 w-20">Gaji Pokok / Honor</th>
                              <th colSpan={4} className="p-0.5 border-b border-slate-400">Absensi</th>
                            </tr>
                            <tr className="bg-slate-50 text-[6px] font-bold text-center">
                              <th className="p-0.5 border-r border-slate-400">Negeri</th>
                              <th className="p-0.5 border-r border-slate-400">Swasta</th>
                              <th className="p-0.5 border-r border-slate-400 w-4">S</th>
                              <th className="p-0.5 border-r border-slate-400 w-4">I</th>
                              <th className="p-0.5 border-r border-slate-400 w-4">A</th>
                              <th className="p-0.5 w-5">Jml</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-300">
                            {viewTeachers.map((t, idx) => {
                              const tInfo = teachers.find(x => x.id === t.teacher_id);
                              const totalAbsen = t.sakit + t.izin + t.alpha;
                              const isNegeri = tInfo?.status_guru === 'PNS' || tInfo?.status_guru === 'PPPK';
                              const isSwasta = tInfo?.status_guru === 'GTY' || tInfo?.status_guru === 'GTT' || tInfo?.status_guru === 'Honor' || !tInfo?.status_guru;
                              
                              return (
                                <tr key={t.id || idx} className="text-slate-800 hover:bg-slate-50">
                                  <td className="p-1 border-r border-slate-300 text-center font-mono font-medium">{idx + 1}</td>
                                  <td className="p-1 border-r border-slate-300 font-bold text-slate-900 leading-tight">
                                    {t.nama_guru}
                                    {tInfo?.nip && <span className="block text-[6px] font-mono text-slate-500 font-medium">NIP. {tInfo.nip}</span>}
                                  </td>
                                  <td className="p-1 border-r border-slate-300 text-center font-mono">{t.jenis_kelamin}</td>
                                  <td className="p-1 border-r border-slate-300 leading-none">
                                    {tInfo ? `${tInfo.tempat_lahir}, ${tInfo.tanggal_lahir}` : 'Klaten, -'}
                                  </td>
                                  <td className="p-1 border-r border-slate-300 text-center">Islam</td>
                                  <td className="p-1 border-r border-slate-300 text-center font-semibold text-slate-700">{tInfo?.pendidikan || 'S1'}</td>
                                  <td className="p-1 border-r border-slate-300 truncate max-w-[60px] font-semibold text-slate-700">{tInfo?.jabatan || 'Guru Kelas'}</td>
                                  <td className="p-1 border-r border-slate-300 text-center font-mono font-semibold text-emerald-800">
                                    {isNegeri ? tInfo?.status_guru : '-'}
                                  </td>
                                  <td className="p-1 border-r border-slate-300 text-center font-mono font-semibold text-brand-800">
                                    {isSwasta ? (tInfo?.status_guru || 'GTY') : '-'}
                                  </td>
                                  <td className="p-1 border-r border-slate-300 text-center font-mono">{tInfo?.golongan || '-'}</td>
                                  <td className="p-1 border-r border-slate-300 text-center font-mono leading-none">{tInfo?.tmt || '-'}</td>
                                  <td className="p-1 border-r border-slate-300 text-right font-mono font-semibold text-slate-900 pr-1">
                                    {tInfo?.honor ? `Rp. ${tInfo.honor.toLocaleString('id-ID')}` : 'Rp. 450.000'}
                                  </td>
                                  <td className="p-1 border-r border-slate-300 text-center font-mono text-slate-500">{t.sakit}</td>
                                  <td className="p-1 border-r border-slate-300 text-center font-mono text-slate-500">{t.izin}</td>
                                  <td className="p-1 border-r border-slate-300 text-center font-mono text-slate-500">{t.alpha}</td>
                                  <td className="p-1 text-center font-mono font-bold text-rose-700 bg-rose-50/50">{totalAbsen}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Master Student Data Grid with Religion, Absen Murid */}
                    <div>
                      <h4 className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1.5 border-b border-emerald-100 pb-1 font-sans">
                        KEADAAN MURID, AGAMA & REKAP ABSENSI MURID
                      </h4>
                      <div className="border border-slate-400 rounded-lg overflow-hidden">
                        <table className="w-full text-center border-collapse text-[6.5px] sm:text-[7px] font-sans leading-tight">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-400 font-bold">
                              <th rowSpan={3} className="border-r border-slate-400 p-1 w-16">Keadaan</th>
                              <th colSpan={9} className="border-r border-slate-400 p-0.5">Banyak Murid</th>
                              <th colSpan={18} className="border-r border-slate-400 p-0.5">Agama Murid</th>
                              <th colSpan={5} className="p-0.5">Absen Murid</th>
                            </tr>
                            <tr className="bg-slate-50 border-b border-slate-400 font-bold">
                              <th colSpan={3} className="border-r border-slate-400 p-0.5">Kelompok A</th>
                              <th colSpan={3} className="border-r border-slate-400 p-0.5">Kelompok B</th>
                              <th colSpan={3} className="border-r border-slate-400 p-0.5">Jumlah</th>
                              <th colSpan={3} className="border-r border-slate-400 p-0.5">Islam</th>
                              <th colSpan={3} className="border-r border-slate-400 p-0.5">Kristen</th>
                              <th colSpan={3} className="border-r border-slate-400 p-0.5">Katolik</th>
                              <th colSpan={3} className="border-r border-slate-400 p-0.5">Hindhu</th>
                              <th colSpan={3} className="border-r border-slate-400 p-0.5">Budha</th>
                              <th colSpan={3} className="border-r border-slate-400 p-0.5">Jumlah</th>
                              <th rowSpan={2} className="border-r border-slate-400 p-0.5 w-4">S</th>
                              <th rowSpan={2} className="border-r border-slate-400 p-0.5 w-4">I</th>
                              <th rowSpan={2} className="border-r border-slate-400 p-0.5 w-4">A</th>
                              <th rowSpan={2} className="border-r border-slate-400 p-0.5 w-5">Jml</th>
                              <th rowSpan={2} className="p-0.5 w-6">%</th>
                            </tr>
                            <tr className="bg-slate-50 border-b border-slate-400 font-bold text-[6px]">
                              <th className="border-r border-slate-300 p-0.5 w-3">L</th>
                              <th className="border-r border-slate-300 p-0.5 w-3">P</th>
                              <th className="border-r border-slate-400 p-0.5 w-4 bg-slate-100">Jml</th>
                              <th className="border-r border-slate-300 p-0.5 w-3">L</th>
                              <th className="border-r border-slate-300 p-0.5 w-3">P</th>
                              <th className="border-r border-slate-400 p-0.5 w-4 bg-slate-100">Jml</th>
                              <th className="border-r border-slate-300 p-0.5 w-3">L</th>
                              <th className="border-r border-slate-300 p-0.5 w-3">P</th>
                              <th className="border-r border-slate-400 p-0.5 w-4 bg-emerald-50">Jml</th>
                              
                              <th className="border-r border-slate-300 p-0.5 w-3">L</th>
                              <th className="border-r border-slate-300 p-0.5 w-3">P</th>
                              <th className="border-r border-slate-400 p-0.5 w-4">Jml</th>
                              <th className="border-r border-slate-300 p-0.5 w-3">L</th>
                              <th className="border-r border-slate-300 p-0.5 w-3">P</th>
                              <th className="border-r border-slate-400 p-0.5 w-4">Jml</th>
                              <th className="border-r border-slate-300 p-0.5 w-3">L</th>
                              <th className="border-r border-slate-300 p-0.5 w-3">P</th>
                              <th className="border-r border-slate-400 p-0.5 w-4">Jml</th>
                              <th className="border-r border-slate-300 p-0.5 w-3">L</th>
                              <th className="border-r border-slate-300 p-0.5 w-3">P</th>
                              <th className="border-r border-slate-400 p-0.5 w-4">Jml</th>
                              <th className="border-r border-slate-300 p-0.5 w-3">L</th>
                              <th className="border-r border-slate-300 p-0.5 w-3">P</th>
                              <th className="border-r border-slate-400 p-0.5 w-4">Jml</th>
                              <th className="border-r border-slate-300 p-0.5 w-3">L</th>
                              <th className="border-r border-slate-300 p-0.5 w-3">P</th>
                              <th className="border-r border-slate-400 p-0.5 w-4 bg-emerald-50 font-bold">Jml</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-300 font-mono">
                            {/* Awal Bulan */}
                            <tr className="hover:bg-slate-50 text-slate-800">
                              <td className="p-1 border-r border-slate-400 font-sans font-semibold text-left">Awal Bulan</td>
                              <td className="p-1 border-r border-slate-300">{m_A}</td>
                              <td className="p-1 border-r border-slate-300">{p_A}</td>
                              <td className="p-1 border-r border-slate-400 bg-slate-50 font-bold">{m_A + p_A}</td>
                              <td className="p-1 border-r border-slate-300">{m_B}</td>
                              <td className="p-1 border-r border-slate-300">{p_B}</td>
                              <td className="p-1 border-r border-slate-400 bg-slate-50 font-bold">{m_B + p_B}</td>
                              <td className="p-1 border-r border-slate-300 font-bold text-slate-900">{maleCount || 10}</td>
                              <td className="p-1 border-r border-slate-300 font-bold text-slate-900">{femaleCount || 13}</td>
                              <td className="p-1 border-r border-slate-400 bg-emerald-50 font-extrabold text-emerald-800">{totalCount || 23}</td>
                              {/* Islam */}
                              <td className="p-1 border-r border-slate-300">{maleCount || 10}</td>
                              <td className="p-1 border-r border-slate-300">{femaleCount || 13}</td>
                              <td className="p-1 border-r border-slate-400 font-bold">{totalCount || 23}</td>
                              {/* Kristen */}
                              <td className="p-1 border-r border-slate-300 text-slate-300">-</td>
                              <td className="p-1 border-r border-slate-300 text-slate-300">-</td>
                              <td className="p-1 border-r border-slate-400 text-slate-300">-</td>
                              {/* Katolik */}
                              <td className="p-1 border-r border-slate-300 text-slate-300">-</td>
                              <td className="p-1 border-r border-slate-300 text-slate-300">-</td>
                              <td className="p-1 border-r border-slate-400 text-slate-300">-</td>
                              {/* Hindu */}
                              <td className="p-1 border-r border-slate-300 text-slate-300">-</td>
                              <td className="p-1 border-r border-slate-300 text-slate-300">-</td>
                              <td className="p-1 border-r border-slate-400 text-slate-300">-</td>
                              {/* Buddha */}
                              <td className="p-1 border-r border-slate-300 text-slate-300">-</td>
                              <td className="p-1 border-r border-slate-300 text-slate-300">-</td>
                              <td className="p-1 border-r border-slate-400 text-slate-300">-</td>
                              {/* Religion Total */}
                              <td className="p-1 border-r border-slate-300 font-bold">{maleCount || 10}</td>
                              <td className="p-1 border-r border-slate-300 font-bold">{femaleCount || 13}</td>
                              <td className="p-1 border-r border-slate-400 font-extrabold bg-emerald-50 text-emerald-800">{totalCount || 23}</td>
                              
                              <td rowSpan={4} className="p-1 border-r border-slate-400 text-center text-slate-500">{s_sakit}</td>
                              <td rowSpan={4} className="p-1 border-r border-slate-400 text-center text-slate-500">{s_izin}</td>
                              <td rowSpan={4} className="p-1 border-r border-slate-400 text-center text-slate-500">{s_alpha}</td>
                              <td rowSpan={4} className="p-1 border-r border-slate-400 font-bold text-rose-700 bg-rose-50/50">{s_total_absen}</td>
                              <td rowSpan={4} className="p-1 font-bold text-emerald-800 bg-emerald-50">{s_pct}%</td>
                            </tr>
                            {/* Masuk */}
                            <tr className="hover:bg-slate-50 text-slate-400 text-[6px]">
                              <td className="p-1 border-r border-slate-400 font-sans text-left text-slate-500">Masuk (Mutasi)</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-400 bg-slate-50">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-400 bg-slate-50">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-400 bg-emerald-50/30">-</td>
                              
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-400">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-400">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-400">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-400">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-400">-</td>
                              
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-400 bg-emerald-50/30">-</td>
                            </tr>
                            {/* Keluar */}
                            <tr className="hover:bg-slate-50 text-slate-400 text-[6px]">
                              <td className="p-1 border-r border-slate-400 font-sans text-left text-slate-500">Keluar (Mutasi)</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-400 bg-slate-50">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-400 bg-slate-50">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-400 bg-emerald-50/30">-</td>
                              
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-400">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-400">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-400">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-400">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-400">-</td>
                              
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-300">-</td>
                              <td className="p-1 border-r border-slate-400 bg-emerald-50/30">-</td>
                            </tr>
                            {/* Akhir Bulan */}
                            <tr className="hover:bg-slate-50 text-slate-800 font-semibold bg-slate-50/30">
                              <td className="p-1 border-r border-slate-400 font-sans text-left font-bold text-slate-900">Akhir Bulan</td>
                              <td className="p-1 border-r border-slate-300">{m_A}</td>
                              <td className="p-1 border-r border-slate-300">{p_A}</td>
                              <td className="p-1 border-r border-slate-100 font-bold text-slate-900">{m_A + p_A}</td>
                              <td className="p-1 border-r border-slate-300">{m_B}</td>
                              <td className="p-1 border-r border-slate-300">{p_B}</td>
                              <td className="p-1 border-r border-slate-100 font-bold text-slate-900">{m_B + p_B}</td>
                              <td className="p-1 border-r border-slate-300 font-extrabold text-slate-900">{maleCount || 10}</td>
                              <td className="p-1 border-r border-slate-300 font-extrabold text-slate-900">{femaleCount || 13}</td>
                              <td className="p-1 border-r border-slate-400 bg-emerald-100/60 font-black text-emerald-950">{totalCount || 23}</td>
                              {/* Islam */}
                              <td className="p-1 border-r border-slate-300">{maleCount || 10}</td>
                              <td className="p-1 border-r border-slate-300">{femaleCount || 13}</td>
                              <td className="p-1 border-r border-slate-400 font-bold">{totalCount || 23}</td>
                              {/* Kristen */}
                              <td className="p-1 border-r border-slate-300 text-slate-300">-</td>
                              <td className="p-1 border-r border-slate-300 text-slate-300">-</td>
                              <td className="p-1 border-r border-slate-400 text-slate-300">-</td>
                              {/* Katolik */}
                              <td className="p-1 border-r border-slate-300 text-slate-300">-</td>
                              <td className="p-1 border-r border-slate-300 text-slate-300">-</td>
                              <td className="p-1 border-r border-slate-400 text-slate-300">-</td>
                              {/* Hindu */}
                              <td className="p-1 border-r border-slate-300 text-slate-300">-</td>
                              <td className="p-1 border-r border-slate-300 text-slate-300">-</td>
                              <td className="p-1 border-r border-slate-400 text-slate-300">-</td>
                              {/* Buddha */}
                              <td className="p-1 border-r border-slate-300 text-slate-300">-</td>
                              <td className="p-1 border-r border-slate-300 text-slate-300">-</td>
                              <td className="p-1 border-r border-slate-400 text-slate-300">-</td>
                              {/* Religion Total */}
                              <td className="p-1 border-r border-slate-300 font-bold">{maleCount || 10}</td>
                              <td className="p-1 border-r border-slate-300 font-bold">{femaleCount || 13}</td>
                              <td className="p-1 border-r border-slate-400 font-extrabold bg-emerald-100/60 text-emerald-950">{totalCount || 23}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Section 16: Keterangan cara menghitung persentase absen */}
                    <div className="text-[8px] text-slate-500 font-sans border border-slate-200 bg-slate-50 p-2 rounded-lg space-y-1">
                      <div className="flex items-start gap-1">
                        <span className="font-bold shrink-0">16. Keterangan Cara menghitung persentase absen murid :</span>
                        <div className="flex items-center gap-1 font-semibold">
                          <span>Persentase Absen Murid = </span>
                          <div className="flex flex-col items-center border-b border-slate-400 px-1 text-center font-mono text-[7px] leading-tight shrink-0 font-bold">
                            <span>Jumlah Absen (S+I+A)</span>
                            <span>Jumlah Murid x Jumlah Hari Belajar</span>
                          </div>
                          <span>x 100%</span>
                        </div>
                      </div>
                      <div className="pl-4 font-mono text-[7.5px] text-slate-600">
                        Hasil perhitungan bulan ini: <b>{s_total_absen}</b> / (<b>{totalCount}</b> murid x <b>{selectedReport.hari_belajar || 23}</b> hari) x 100% = <b className="text-emerald-800">{s_pct}%</b>
                      </div>
                    </div>
                  </div>

                  {/* Signatures & Stamps Footer */}
                  <div>
                    <div className="grid grid-cols-2 text-center text-[9px] font-sans text-slate-800 leading-relaxed pt-2 border-t border-slate-100">
                      <div className="flex flex-col items-center justify-between">
                        <div>
                          <span className="font-bold block">Mengetahui,</span>
                          <span className="text-[8px] text-slate-500 block">PDA Majelis PAUD Dasar dan Menengah</span>
                        </div>
                        
                        {/* Space for stempel / signature */}
                        <div className="h-14 flex items-center justify-center relative my-1">
                          <div className="border border-emerald-500/20 bg-emerald-50/10 rounded-lg text-[6.5px] px-2 py-1 rotate-3 w-28 uppercase font-bold text-emerald-700/40 border-dashed">
                            PDA MAJELIS PAUD KLATEN
                          </div>
                        </div>
                        
                        <div>
                          <span className="font-extrabold underline block leading-none">Ensapt Sri Mulat, S.Psi., M.Si.Psikolog</span>
                          <span className="text-slate-500 font-mono text-[8px] block mt-0.5 font-bold">NBM. 1243524</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-between">
                        <div>
                          <span className="text-slate-500 block leading-none mb-1 font-bold">Klaten, tgl. 31 {selectedReport.bulan} {String(selectedReport.tahun_pelajaran || '').includes('/') ? String(selectedReport.tahun_pelajaran).split('/')[0] : String(selectedReport.tahun_pelajaran || '2026')}</span>
                          <span className="font-bold block">Kepala Sekolah {getSchoolName(selectedReport.school_id)}</span>
                        </div>
                        
                        <div className="h-14 flex items-center justify-center relative my-1">
                          <div className="border border-emerald-500/20 bg-emerald-50/10 rounded-lg text-[6.5px] px-2 py-1 -rotate-3 w-28 uppercase font-bold text-emerald-700/40 border-dashed">
                            STEMPEL SEKOLAH OFFICIAL
                          </div>
                        </div>

                        <div>
                          <span className="font-extrabold underline block leading-none">{getSchoolDetails(selectedReport.school_id)?.kepala_sekolah || 'Suratmi, S.Pd.I'}</span>
                          <span className="text-slate-500 font-mono text-[8px] block mt-0.5 font-bold">NBM. {getSchoolDetails(selectedReport.school_id)?.nip_kepala || '1162029'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Page Footer Label */}
                    <div className="text-center text-[8px] text-slate-400 font-mono border-t border-slate-100 pt-3 mt-3">
                      Laporan Bulanan ABA Klaten | Halaman 2 dari 2
                    </div>
                  </div>
                </div>
              </div>
              </div>

              {/* Bottom Quick Controls */}
              <div className="flex items-center justify-center gap-3 w-full max-w-[210mm] border-t border-slate-800/40 pt-6 pb-12 shrink-0">
                <button
                  onClick={() => setIsViewOpen(false)}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-xs font-extrabold rounded-2xl flex items-center gap-2 shadow-lg transition-all border border-slate-700/80 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Kembali ke Daftar Laporan
                </button>
                <button
                  onClick={() => ExportEngine.exportToPdf('a4-print-sheet', getSchoolName(selectedReport.school_id), selectedReport.bulan)}
                  className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 active:scale-95 text-white text-xs font-extrabold rounded-2xl flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Unduh Dokumen PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN CONSOLIDATED PRINT ELEMENT FOR MONTHLY PDF EXPORT */}
      {filterBulan !== 'Semua' && monthlyDetails && (
        <div className="absolute opacity-0 pointer-events-none -left-[9999px]" style={{ width: '210mm' }}>
          <div id="monthly-consolidated-print-sheet" className="flex flex-col gap-8 text-slate-900 bg-slate-100 p-4">
            
            {/* COVER PAGE */}
            <div className="w-[210mm] h-[297mm] bg-white p-[20mm] flex flex-col justify-between shadow-2xl relative border border-slate-200">
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                {/* Large Green Logo */}
                <div className="w-24 h-24 bg-emerald-700 rounded-full flex flex-col items-center justify-center font-bold text-white mb-6 shadow-md border border-emerald-600">
                  <span className="text-[20px] font-black leading-none tracking-tighter">ABA</span>
                  <span className="text-[10px] font-medium leading-none tracking-widest mt-1">AISYIYAH</span>
                </div>
                <h1 className="text-xl font-extrabold text-emerald-800 tracking-wider uppercase">REKAPITULASI LAPORAN BULANAN</h1>
                <h2 className="text-md font-bold text-slate-800 tracking-wide uppercase mt-1">BUSTANUL ATHFAL AISYIYAH</h2>
                <h3 className="text-sm font-semibold text-slate-600 tracking-normal mt-0.5">KABUPATEN KLATEN</h3>
                
                <div className="w-32 h-1 bg-emerald-600 my-8"></div>
                
                <p className="text-sm text-slate-500 font-semibold uppercase">Bulan Laporan</p>
                <p className="text-2xl font-black text-slate-800 uppercase tracking-widest mt-1">{filterBulan} 2026</p>
                
                <p className="text-xs text-slate-400 mt-12 max-w-md">
                  Dokumen ini berisi kumpulan seluruh laporan bulanan TK/PAUD Aisyiyah di bawah naungan Pimpinan Cabang Aisyiyah Dikdasmen Klaten Utara Daerah Klaten.
                </p>
              </div>
              <div className="text-center text-[10px] text-slate-400 border-t pt-4">
                Sistem Informasi Administrasi Aisyiyah Bustanul Athfal (SIABA) &bull; {new Date().getFullYear()}
              </div>
            </div>

            {/* MAP THROUGH SELECTED SCHOOL REPORTS */}
            {filteredReports.map((report) => {
              const school = schools.find(s => s.id === report.school_id) || schools[0];
              const schoolStudents = students.filter(s => s.school_id === report.school_id);
              
              const repTeachers = monthlyDetails.teachersMap[report.id] || [];
              const repStudents = monthlyDetails.studentsMap[report.id] || [];
              const repInventories = monthlyDetails.inventoriesMap[report.id] || [];
              
              const maleCount = schoolStudents.filter(s => s.jenis_kelamin === 'L').length;
              const femaleCount = schoolStudents.filter(s => s.jenis_kelamin === 'P').length;
              const totalCount = maleCount + femaleCount;
              
              const m_A = Math.ceil(maleCount * 0.4);
              const m_B = maleCount - m_A;
              const p_A = Math.ceil(femaleCount * 0.4);
              const p_B = femaleCount - p_A;

              const sSakit = repStudents.reduce((acc, curr) => acc + (curr.sakit || 0), 0);
              const sIzin = repStudents.reduce((acc, curr) => acc + (curr.izin || 0), 0);
              const sAlpha = repStudents.reduce((acc, curr) => acc + (curr.alpha || 0), 0);
              const sTotalAbs = sSakit + sIzin + sAlpha;
              const sPercent = (totalCount > 0) ? ((sTotalAbs / (totalCount * (report.hari_belajar || 22))) * 100).toFixed(1) : '0.0';

              return (
                <React.Fragment key={report.id}>
                  {/* PAGE 1: SCHOOL IDENTITY & SARPRAS */}
                  <div className="w-[210mm] h-[297mm] bg-white p-[15mm] flex flex-col justify-between border border-slate-200">
                    <div>
                      {/* Official Letterhead */}
                      <div className="text-center border-b-2 border-slate-900 pb-2 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="w-14 h-14 bg-emerald-700 rounded-full flex flex-col items-center justify-center font-bold text-white shrink-0 shadow-sm border border-emerald-600">
                            <span className="text-[12px] font-black leading-none tracking-tighter">ABA</span>
                            <span className="text-[6px] font-medium leading-none tracking-widest mt-0.5">AISYIYAH</span>
                          </div>
                          <div className="flex-1 text-center">
                            <h2 className="text-[11px] uppercase font-black tracking-widest text-emerald-800 leading-none">LAPORAN BULANAN</h2>
                            <h1 className="text-[14px] font-extrabold text-slate-900 uppercase font-sans mt-1">BUSTANUL ATHFAL AISYIYAH</h1>
                            <h2 className="text-[11px] font-bold text-slate-800 uppercase font-sans mt-0.5">DAERAH KLATEN</h2>
                            <p className="text-[8px] text-slate-500 mt-0.5 font-medium leading-none">
                              Pimpinan Cabang Aisyiyah Bagian Dikdasmen Klaten Utara Daerah Klaten.
                            </p>
                          </div>
                          <div className="border border-slate-300 p-1 rounded-lg shrink-0 flex flex-col items-center bg-slate-50">
                            <QrCode className="w-8 h-8 text-slate-800" />
                            <span className="text-[5px] text-slate-400 font-mono mt-0.5 uppercase font-bold leading-none font-sans">VALIDATED</span>
                          </div>
                        </div>
                      </div>

                      {/* Document Header Info */}
                      <div className="text-center my-3 bg-slate-100 py-1.5 rounded-lg border border-slate-200/60">
                        <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-800 font-sans leading-none">
                          PROFIL & KEADAAN UMUM SEKOLAH
                        </h3>
                        <p className="text-[9px] text-slate-600 font-sans mt-1">
                          Bulan Laporan: <b className="text-slate-900 font-extrabold">{report.bulan} 2026</b> | Tahun Pelajaran: <b className="text-slate-900 font-bold">{report.tahun_pelajaran}</b> | Semester: <b className="text-slate-900 font-bold">{report.semester}</b>
                        </p>
                      </div>

                      {/* Identitas Sekolah */}
                      <div className="space-y-1.5 text-[9.5px] text-slate-800">
                        <div className="flex items-start">
                          <span className="w-5 shrink-0 font-bold">1.</span>
                          <span className="w-52 shrink-0 font-medium">Nama TK</span>
                          <span className="mr-2">:</span>
                          <span className="font-bold uppercase text-slate-900">{school.name}</span>
                        </div>

                        <div className="flex items-start">
                          <span className="w-5 shrink-0 font-bold">2.</span>
                          <span className="w-52 shrink-0 font-medium">NSM / NPSN</span>
                          <span className="mr-2">:</span>
                          <span className="font-mono text-slate-900 font-bold">{school.nsm || '101233100001'} / {school.npsn || '69741194'}</span>
                        </div>

                        <div className="flex items-start">
                          <span className="w-5 shrink-0 font-bold">3.</span>
                          <span className="w-52 shrink-0 font-medium">Alamat TK / Kelurahan</span>
                          <span className="mr-2">:</span>
                          <span className="text-slate-900 font-semibold">{school.alamat}, {school.kelurahan}, {school.kecamatan}, {school.kabupaten}</span>
                        </div>

                        <div className="flex items-start">
                          <span className="w-5 shrink-0 font-bold">4.</span>
                          <span className="w-52 shrink-0 font-medium">Didirikan pada tanggal</span>
                          <span className="mr-2">:</span>
                          <span className="text-slate-800">{school.tahun_berdiri || '01 September 1964'}</span>
                        </div>

                        <div className="flex items-start">
                          <span className="w-5 shrink-0 font-bold">5.</span>
                          <span className="w-52 shrink-0 font-medium">Jenis TK</span>
                          <span className="mr-2">:</span>
                          <span className="text-slate-800 font-semibold">{school.jenjang || 'TK'} Biasa</span>
                        </div>

                        <div className="flex items-start">
                          <span className="w-5 shrink-0 font-bold">6.</span>
                          <span className="w-52 shrink-0 font-medium">Kondisi Gedung</span>
                          <span className="mr-2">:</span>
                          <span className="text-slate-800 font-semibold">{school.status_gedung === 'Milik Sendiri' ? 'Sangat Baik' : 'Cukup'}</span>
                        </div>

                        <div className="flex items-start">
                          <span className="w-5 shrink-0 font-bold">7.</span>
                          <span className="w-52 shrink-0 font-medium">Jumlah hari sekolah (Hari Belajar)</span>
                          <span className="mr-2">:</span>
                          <span className="font-mono text-slate-900 font-bold">{report.hari_belajar || 22} hari</span>
                        </div>

                        <div className="flex items-start">
                          <span className="w-5 shrink-0 font-bold">8.</span>
                          <span className="w-52 shrink-0 font-medium">Status Pemilikan Gedung</span>
                          <span className="mr-2">:</span>
                          <span className="text-slate-800 font-semibold">{school.status_tanah || 'Yayasan'}</span>
                        </div>

                        <div className="flex items-start">
                          <span className="w-5 shrink-0 font-bold">9.</span>
                          <span className="w-52 shrink-0 font-medium">Kondisi Sarana Prasarana (Sarpras)</span>
                          <span className="mr-2">:</span>
                          <span className="text-slate-500 font-medium">Daftar inventariat terlampir di bawah</span>
                        </div>
                      </div>

                      {/* Sarpras Table */}
                      <div className="mt-4">
                        <table className="w-full text-left border-collapse border border-slate-400 text-[8.5px]">
                          <thead>
                            <tr className="bg-emerald-700 text-white font-bold uppercase text-center border-b border-slate-400">
                              <th className="p-1 border border-slate-400 w-10">No</th>
                              <th className="p-1 border border-slate-400 text-left">Nama Inventaris Sarpras</th>
                              <th className="p-1 border border-slate-400 w-24">Jumlah Unit</th>
                              <th className="p-1 border border-slate-400 w-24">Kondisi Baik</th>
                              <th className="p-1 border border-slate-400 w-24">Kondisi Rusak</th>
                            </tr>
                          </thead>
                          <tbody>
                            {repInventories.map((inv, idx) => (
                              <tr key={inv.id || idx} className="text-center font-medium">
                                <td className="p-1 border border-slate-400 font-mono">{idx + 1}</td>
                                <td className="p-1 border border-slate-400 text-left font-semibold">{inv.item_name}</td>
                                <td className="p-1 border border-slate-400 font-mono font-bold text-slate-900">{inv.quantity}</td>
                                <td className="p-1 border border-slate-400 font-mono text-emerald-700 font-bold">{inv.status_baik}</td>
                                <td className="p-1 border border-slate-400 font-mono text-rose-600 font-bold">{inv.status_rusak}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="text-right text-[8px] text-slate-400 border-t pt-2 font-mono">
                      Halaman 1/2 &bull; {school.name} &bull; Laporan {report.bulan}
                    </div>
                  </div>

                  {/* PAGE 2: GURU, MURID & SIGNATURES */}
                  <div className="w-[210mm] h-[297mm] bg-white p-[15mm] flex flex-col justify-between border border-slate-200">
                    <div>
                      {/* Title Header Page 2 */}
                      <div className="text-center bg-slate-100 py-1.5 rounded-lg border border-slate-200/60 mb-3">
                        <h3 className="text-[11px] font-bold uppercase tracking-wide text-emerald-800 font-sans leading-none">
                          KEADAAN GURU & REKAP ABSENSI SISWA
                        </h3>
                      </div>

                      {/* Teachers Table */}
                      <div className="space-y-1.5">
                        <h4 className="text-[9.5px] font-bold text-slate-900 uppercase tracking-wide">
                          A. DAFTAR HADIR GURU / TENAGA KEPENDIDIKAN
                        </h4>
                        <table className="w-full text-left border-collapse border border-slate-400 text-[8.5px]">
                          <thead>
                            <tr className="bg-emerald-700 text-white font-bold uppercase text-center border-b border-slate-400">
                              <th className="p-1 border border-slate-400 w-8">No</th>
                              <th className="p-1 border border-slate-400 text-left">Nama Lengkap Guru / Pegawai</th>
                              <th className="p-1 border border-slate-400 w-10">L/P</th>
                              <th className="p-1 border border-slate-400 w-14">Hadir</th>
                              <th className="p-1 border border-slate-400 w-14">Izin</th>
                              <th className="p-1 border border-slate-400 w-14">Sakit</th>
                              <th className="p-1 border border-slate-400 w-14">Alpha</th>
                              <th className="p-1 border border-slate-400 w-20">Persentase</th>
                            </tr>
                          </thead>
                          <tbody>
                            {repTeachers.map((att, idx) => {
                              const totDays = (att.hadir || 0) + (att.izin || 0) + (att.sakit || 0) + (att.alpha || 0);
                              const rate = totDays > 0 ? ((att.hadir / totDays) * 100).toFixed(0) + '%' : '0%';
                              return (
                                <tr key={att.id || idx} className="text-center font-medium">
                                  <td className="p-1 border border-slate-400 font-mono">{idx + 1}</td>
                                  <td className="p-1 border border-slate-400 text-left font-semibold text-slate-900">{att.nama_guru}</td>
                                  <td className="p-1 border border-slate-400 font-semibold">{att.jenis_kelamin}</td>
                                  <td className="p-1 border border-slate-400 font-mono font-bold">{att.hadir}</td>
                                  <td className="p-1 border border-slate-400 font-mono">{att.izin}</td>
                                  <td className="p-1 border border-slate-400 font-mono text-amber-600">{att.sakit}</td>
                                  <td className="p-1 border border-slate-400 font-mono text-rose-600">{att.alpha}</td>
                                  <td className="p-1 border border-slate-400 font-mono font-bold text-emerald-700">{rate}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Students Table */}
                      <div className="space-y-1.5 mt-4">
                        <h4 className="text-[9.5px] font-bold text-slate-900 uppercase tracking-wide">
                          B. REKAPITULASI DATA KEADAAN & ABSENSI SISWA
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          {/* Left Column: Keadaan Siswa */}
                          <div className="border border-slate-400 p-2 rounded-lg bg-slate-50">
                            <span className="text-[9px] font-bold text-slate-700 border-b pb-1 mb-1 block uppercase">Data Keadaan Siswa:</span>
                            <div className="space-y-1 text-[8.5px]">
                              <div className="flex justify-between"><span>Jumlah Murid Laki-laki:</span><b className="font-mono text-slate-900">{maleCount} anak</b></div>
                              <div className="flex justify-between"><span>Jumlah Murid Perempuan:</span><b className="font-mono text-slate-900">{femaleCount} anak</b></div>
                              <div className="flex justify-between border-t pt-1 font-bold text-emerald-800">
                                <span>TOTAL MURID AKTIF:</span><span className="font-mono">{totalCount} anak</span>
                              </div>
                            </div>
                          </div>

                          {/* Right Column: Absensi Kehadiran */}
                          <div className="border border-slate-400 p-2 rounded-lg bg-slate-50">
                            <span className="text-[9px] font-bold text-slate-700 border-b pb-1 mb-1 block uppercase">Absensi Bulanan Murid:</span>
                            <div className="space-y-1 text-[8.5px]">
                              <div className="flex justify-between"><span>Total Absensi Sakit:</span><b className="font-mono text-amber-700">{sSakit} hari</b></div>
                              <div className="flex justify-between"><span>Total Absensi Izin:</span><b className="font-mono text-blue-700">{sIzin} hari</b></div>
                              <div className="flex justify-between"><span>Total Absensi Tanpa Keterangan:</span><b className="font-mono text-rose-600">{sAlpha} hari</b></div>
                              <div className="flex justify-between border-t pt-1 font-bold text-slate-800">
                                <span>RATA-RATA ABSENSI:</span><span className="font-mono text-rose-600">{sPercent}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Signatures */}
                      <div className="mt-8 grid grid-cols-2 text-[9.5px] text-slate-800 font-sans">
                        <div className="space-y-12">
                          <div className="space-y-1 text-center">
                            <p className="font-medium">Mengetahui,</p>
                            <p className="font-bold">Kepala Sekolah TK/PAUD</p>
                          </div>
                          <div className="text-center font-bold underline uppercase text-slate-900">
                            {school.kepala_sekolah}
                          </div>
                        </div>

                        <div className="space-y-12 text-center">
                          <div className="space-y-1">
                            <p className="text-[8.5px] text-slate-500 font-mono">Klaten, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <p className="font-bold">Petugas Administrasi / Guru Kelas</p>
                          </div>
                          <div className="font-bold underline uppercase text-slate-900">
                            PETUGAS SEKOLAH
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-[8px] text-slate-400 border-t pt-2 font-mono">
                      Halaman 2/2 &bull; {school.name} &bull; Laporan {report.bulan}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
