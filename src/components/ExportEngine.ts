/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { School, Teacher, Student, Report, AttendanceTeacher, AttendanceStudent, Inventory } from '../types';

export const ExportEngine = {
  /**
   * Generates a beautifully formatted Excel sheet matching official reporting templates
   */
  async exportToExcel(
    report: Report,
    school: School,
    teachers: Teacher[],
    students: Student[],
    inventories: Inventory[],
    attTeachers: AttendanceTeacher[],
    attStudents: AttendanceStudent[]
  ) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Bulanan');

    // Column widths
    worksheet.columns = [
      { key: 'A', width: 6 },
      { key: 'B', width: 26 },
      { key: 'C', width: 12 },
      { key: 'D', width: 10 },
      { key: 'E', width: 10 },
      { key: 'F', width: 10 },
      { key: 'G', width: 10 },
      { key: 'H', width: 16 }
    ];

    // Styles helper
    const titleFont = { name: 'Arial', size: 12, bold: true, color: { argb: '000000' } };
    const subTitleFont = { name: 'Arial', size: 10, bold: true, color: { argb: '555555' } };
    const headerFont = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFF' } };
    const regularFont = { name: 'Arial', size: 9 };
    const boldFont = { name: 'Arial', size: 9, bold: true };

    const headerFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '16a34a' } // Aisyiyah green
    } as any;

    const subHeaderFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'dcfce7' } // Light green
    } as any;

    const thinBorder = {
      top: { style: 'thin', color: { argb: 'cccccc' } },
      left: { style: 'thin', color: { argb: 'cccccc' } },
      bottom: { style: 'thin', color: { argb: 'cccccc' } },
      right: { style: 'thin', color: { argb: 'cccccc' } }
    } as any;

    // 1. REPORT HEADER
    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = 'LAPORAN BULANAN TK / PAUD AISYIYAH BUSTANUL ATHFAL';
    worksheet.getCell('A1').font = titleFont;
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:H2');
    worksheet.getCell('A2').value = `Sekolah: ${school.name} | Bulan: ${report.bulan} | Tahun Pelajaran: ${report.tahun_pelajaran}`;
    worksheet.getCell('A2').font = subTitleFont;
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    worksheet.addRow([]); // Row 3 Empty

    // 2. IDENTITAS SEKOLAH SECTION
    worksheet.addRow(['IDENTITAS SEKOLAH']).font = boldFont;
    worksheet.addRow(['Nama Sekolah', school.name, '', 'NPSN', school.npsn, '', 'Kepala', school.kepala_sekolah]);
    worksheet.addRow(['Alamat', school.alamat, '', 'NSM', school.nsm, '', 'Akreditasi', school.akreditasi]);
    worksheet.addRow(['Kecamatan', school.kecamatan, '', 'Kelurahan', school.kelurahan, '', 'Hari Belajar', `${report.hari_belajar} Hari`]);

    worksheet.addRow([]); // Blank line

    // 3. KEHADIRAN GURU SECTION
    const rowGuruHeader = worksheet.addRow(['ABSENSI KEHADIRAN GURU / TENAGA KEPENDIDIKAN']);
    rowGuruHeader.font = boldFont;
    worksheet.mergeCells(`A9:H9`);

    const headersGuru = ['No', 'Nama Lengkap Guru', 'L/P', 'Hadir', 'Izin', 'Sakit', 'Alpha', 'Persentase'];
    const rowGuruFields = worksheet.addRow(headersGuru);
    rowGuruFields.font = headerFont;
    rowGuruFields.eachCell((cell) => {
      cell.fill = headerFill;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    let teacherNo = 1;
    attTeachers.forEach((att) => {
      const totalDays = att.hadir + att.izin + att.sakit + att.alpha;
      const pct = totalDays > 0 ? `${Math.round((att.hadir / totalDays) * 100)}%` : '0%';
      const row = worksheet.addRow([
        teacherNo++,
        att.nama_guru,
        att.jenis_kelamin,
        att.hadir,
        att.izin,
        att.sakit,
        att.alpha,
        pct
      ]);
      row.font = regularFont;
      row.eachCell((cell, colNum) => {
        cell.border = thinBorder;
        if (colNum !== 2) {
          cell.alignment = { horizontal: 'center' };
        }
      });
    });

    worksheet.addRow([]); // Blank line

    // 4. KEHADIRAN MURID SECTION
    const rowMuridHeader = worksheet.addRow(['REKAPITULASI KEHADIRAN MURID']);
    rowMuridHeader.font = boldFont;

    const headersMurid = ['Gender', 'Hadir', 'Izin', 'Sakit', 'Alpha', 'Total Absensi', 'Persentase', ''];
    const rowMuridFields = worksheet.addRow(headersMurid);
    rowMuridFields.font = headerFont;
    rowMuridFields.eachCell((cell) => {
      cell.fill = headerFill;
      cell.alignment = { horizontal: 'center' };
    });

    attStudents.forEach((att) => {
      const totalDays = att.hadir + att.izin + att.sakit + att.alpha;
      const pct = totalDays > 0 ? `${Math.round((att.hadir / totalDays) * 100)}%` : '0%';
      const row = worksheet.addRow([
        att.jenis_kelamin === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)',
        att.hadir,
        att.izin,
        att.sakit,
        att.alpha,
        totalDays,
        pct,
        ''
      ]);
      row.font = regularFont;
      row.eachCell((cell) => {
        cell.border = thinBorder;
        cell.alignment = { horizontal: 'center' };
      });
    });

    worksheet.addRow([]); // Blank line

    // 5. INVENTARIS SECTION
    const rowInvHeader = worksheet.addRow(['DAFTAR INVENTARIS SARANA PRASARANA']);
    rowInvHeader.font = boldFont;

    const headersInv = ['No', 'Nama Item Inventaris', 'Total Kuantitas', 'Kondisi Baik', 'Kondisi Rusak', '', '', ''];
    const rowInvFields = worksheet.addRow(headersInv);
    rowInvFields.font = headerFont;
    rowInvFields.eachCell((cell) => {
      cell.fill = headerFill;
      cell.alignment = { horizontal: 'center' };
    });

    let invNo = 1;
    inventories.forEach((inv) => {
      const row = worksheet.addRow([
        invNo++,
        inv.item_name,
        inv.quantity,
        inv.status_baik,
        inv.status_rusak,
        '',
        '',
        ''
      ]);
      row.font = regularFont;
      row.eachCell((cell, colNum) => {
        cell.border = thinBorder;
        if (colNum !== 2) {
          cell.alignment = { horizontal: 'center' };
        }
      });
    });

    worksheet.addRow([]); // Blank line

    // 6. SIGNATURES FOOTER
    worksheet.addRow([]);
    const signRow1 = worksheet.addRow(['', '', '', '', '', 'Malang, ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })]);
    const signRow2 = worksheet.addRow(['', 'Mengetahui,', '', '', '', 'Dibuat Oleh,']);
    const signRow3 = worksheet.addRow(['', 'Kepala Sekolah', '', '', '', 'Petugas Administrasi']);
    worksheet.addRow([]);
    worksheet.addRow([]);
    worksheet.addRow([]);
    const signRow4 = worksheet.addRow(['', school.kepala_sekolah, '', '', '', 'Petugas Sekolah']);
    
    signRow1.font = regularFont;
    signRow2.font = boldFont;
    signRow3.font = boldFont;
    signRow4.font = boldFont;

    // Trigger Excel download in browser
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Laporan_Bulanan_${school.name.replace(/\s+/g, '_')}_${report.bulan}_2026.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Generates a beautifully formatted consolidated Excel workbook for all school reports in a selected month
   */
  async exportMonthlyConsolidatedExcel(
    month: string,
    reports: Report[],
    schools: School[],
    teachers: Teacher[],
    students: Student[],
    allInventories: Inventory[],
    allAttTeachers: AttendanceTeacher[],
    allAttStudents: AttendanceStudent[]
  ) {
    const workbook = new ExcelJS.Workbook();

    // Styles
    const titleFont = { name: 'Arial', size: 12, bold: true, color: { argb: '000000' } };
    const subTitleFont = { name: 'Arial', size: 10, bold: true, color: { argb: '555555' } };
    const headerFont = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFF' } };
    const regularFont = { name: 'Arial', size: 9 };
    const boldFont = { name: 'Arial', size: 9, bold: true };

    const headerFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '16a34a' } // Aisyiyah green
    } as any;

    const thinBorder = {
      top: { style: 'thin', color: { argb: 'cccccc' } },
      left: { style: 'thin', color: { argb: 'cccccc' } },
      bottom: { style: 'thin', color: { argb: 'cccccc' } },
      right: { style: 'thin', color: { argb: 'cccccc' } }
    } as any;

    // 1. SUMMARY SHEET
    const summarySheet = workbook.addWorksheet('Ringkasan Bulanan');
    summarySheet.columns = [
      { key: 'A', width: 6 },
      { key: 'B', width: 35 },
      { key: 'C', width: 14 },
      { key: 'D', width: 14 },
      { key: 'E', width: 14 },
      { key: 'F', width: 16 },
      { key: 'G', width: 16 },
      { key: 'H', width: 14 }
    ];

    summarySheet.mergeCells('A1:H1');
    summarySheet.getCell('A1').value = `REKAPITULASI DOKUMEN LAPORAN BULANAN - BULAN ${month.toUpperCase()}`;
    summarySheet.getCell('A1').font = titleFont;
    summarySheet.getCell('A1').alignment = { horizontal: 'center' };

    summarySheet.mergeCells('A2:H2');
    summarySheet.getCell('A2').value = `Sistem Informasi Administrasi Aisyiyah Bustanul Athfal (SIABA) | Tahun Pelajaran 2026/2027`;
    summarySheet.getCell('A2').font = subTitleFont;
    summarySheet.getCell('A2').alignment = { horizontal: 'center' };

    summarySheet.addRow([]); // spacer

    const summaryHeaders = [
      'No',
      'Nama TK / PAUD Sekolah',
      'Hari Belajar',
      'Total Guru',
      'Kehadiran Guru',
      'Total Murid Aktif',
      'Kehadiran Murid',
      'Status Laporan'
    ];

    const rowSumHeader = summarySheet.addRow(summaryHeaders);
    rowSumHeader.font = headerFont;
    rowSumHeader.eachCell((cell) => {
      cell.fill = headerFill;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    let sumIndex = 1;
    reports.forEach((rep) => {
      const sch = schools.find((s) => s.id === rep.school_id) || { name: 'Sekolah Lain' };
      const repTeachers = allAttTeachers.filter((t) => t.report_id === rep.id);
      const repStudents = allAttStudents.filter((s) => s.report_id === rep.id);

      // calc teacher attendance rate
      let totalTeacherDays = 0;
      let totalTeacherHadir = 0;
      repTeachers.forEach((t) => {
        totalTeacherHadir += t.hadir || 0;
        totalTeacherDays += (t.hadir || 0) + (t.izin || 0) + (t.sakit || 0) + (t.alpha || 0);
      });
      const tPct = totalTeacherDays > 0 ? `${Math.round((totalTeacherHadir / totalTeacherDays) * 100)}%` : '0%';

      // calc student attendance rate
      let totalStudentDays = 0;
      let totalStudentHadir = 0;
      repStudents.forEach((s) => {
        totalStudentHadir += s.hadir || 0;
        totalStudentDays += (s.hadir || 0) + (s.izin || 0) + (s.sakit || 0) + (s.alpha || 0);
      });
      const sPct = totalStudentDays > 0 ? `${Math.round((totalStudentHadir / totalStudentDays) * 100)}%` : '0%';

      const activeStudentsCount = students.filter((s) => s.school_id === rep.school_id && s.status_aktif === 'Aktif').length;

      const row = summarySheet.addRow([
        sumIndex++,
        sch.name,
        `${rep.hari_belajar} Hari`,
        repTeachers.length,
        tPct,
        activeStudentsCount > 0 ? activeStudentsCount : repStudents.length > 0 ? 'Ada' : 0,
        sPct,
        rep.status
      ]);

      row.font = regularFont;
      row.eachCell((cell, colNum) => {
        cell.border = thinBorder;
        if (colNum !== 2) {
          cell.alignment = { horizontal: 'center' };
        }
      });
    });

    if (reports.length === 0) {
      summarySheet.addRow(['', 'Belum ada laporan untuk bulan ini', '', '', '', '', '', '']);
    }

    // 2. DETAILED SCHOOL SHEETS
    reports.forEach((report) => {
      const school = schools.find((s) => s.id === report.school_id);
      if (!school) return;

      const cleanName = school.name
        .replace(/[\\\/\?\*\[\]\:]/g, '')
        .substring(0, 30);

      const worksheet = workbook.addWorksheet(cleanName);

      worksheet.columns = [
        { key: 'A', width: 6 },
        { key: 'B', width: 26 },
        { key: 'C', width: 12 },
        { key: 'D', width: 10 },
        { key: 'E', width: 10 },
        { key: 'F', width: 10 },
        { key: 'G', width: 10 },
        { key: 'H', width: 16 }
      ];

      // 1. REPORT HEADER
      worksheet.mergeCells('A1:H1');
      worksheet.getCell('A1').value = 'LAPORAN BULANAN TK / PAUD AISYIYAH BUSTANUL ATHFAL';
      worksheet.getCell('A1').font = titleFont;
      worksheet.getCell('A1').alignment = { horizontal: 'center' };

      worksheet.mergeCells('A2:H2');
      worksheet.getCell('A2').value = `Sekolah: ${school.name} | Bulan: ${report.bulan} | Tahun Pelajaran: ${report.tahun_pelajaran}`;
      worksheet.getCell('A2').font = subTitleFont;
      worksheet.getCell('A2').alignment = { horizontal: 'center' };

      worksheet.addRow([]); // Row 3 Empty

      // 2. IDENTITAS SEKOLAH SECTION
      worksheet.addRow(['IDENTITAS SEKOLAH']).font = boldFont;
      worksheet.addRow(['Nama Sekolah', school.name, '', 'NPSN', school.npsn, '', 'Kepala', school.kepala_sekolah]);
      worksheet.addRow(['Alamat', school.alamat, '', 'NSM', school.nsm, '', 'Akreditasi', school.akreditasi]);
      worksheet.addRow(['Kecamatan', school.kecamatan, '', 'Kelurahan', school.kelurahan, '', 'Hari Belajar', `${report.hari_belajar} Hari`]);

      worksheet.addRow([]); // Blank line

      // 3. KEHADIRAN GURU SECTION
      const rowGuruHeader = worksheet.addRow(['ABSENSI KEHADIRAN GURU / TENAGA KEPENDIDIKAN']);
      rowGuruHeader.font = boldFont;
      worksheet.mergeCells(`A9:H9`);

      const headersGuru = ['No', 'Nama Lengkap Guru', 'L/P', 'Hadir', 'Izin', 'Sakit', 'Alpha', 'Persentase'];
      const rowGuruFields = worksheet.addRow(headersGuru);
      rowGuruFields.font = headerFont;
      rowGuruFields.eachCell((cell) => {
        cell.fill = headerFill;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      const repTeachers = allAttTeachers.filter((t) => t.report_id === report.id);
      let teacherNo = 1;
      repTeachers.forEach((att) => {
        const totalDays = att.hadir + att.izin + att.sakit + att.alpha;
        const pct = totalDays > 0 ? `${Math.round((att.hadir / totalDays) * 100)}%` : '0%';
        const row = worksheet.addRow([
          teacherNo++,
          att.nama_guru,
          att.jenis_kelamin,
          att.hadir,
          att.izin,
          att.sakit,
          att.alpha,
          pct
        ]);
        row.font = regularFont;
        row.eachCell((cell, colNum) => {
          cell.border = thinBorder;
          if (colNum !== 2) {
            cell.alignment = { horizontal: 'center' };
          }
        });
      });

      worksheet.addRow([]); // Blank line

      // 4. KEHADIRAN MURID SECTION
      const rowMuridHeader = worksheet.addRow(['REKAPITULASI KEHADIRAN MURID']);
      rowMuridHeader.font = boldFont;

      const headersMurid = ['Gender', 'Hadir', 'Izin', 'Sakit', 'Alpha', 'Total Absensi', 'Persentase', ''];
      const rowMuridFields = worksheet.addRow(headersMurid);
      rowMuridFields.font = headerFont;
      rowMuridFields.eachCell((cell) => {
        cell.fill = headerFill;
        cell.alignment = { horizontal: 'center' };
      });

      const repStudents = allAttStudents.filter((s) => s.report_id === report.id);
      repStudents.forEach((att) => {
        const totalDays = att.hadir + att.izin + att.sakit + att.alpha;
        const pct = totalDays > 0 ? `${Math.round((att.hadir / totalDays) * 100)}%` : '0%';
        const row = worksheet.addRow([
          att.jenis_kelamin === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)',
          att.hadir,
          att.izin,
          att.sakit,
          att.alpha,
          totalDays,
          pct,
          ''
        ]);
        row.font = regularFont;
        row.eachCell((cell) => {
          cell.border = thinBorder;
          cell.alignment = { horizontal: 'center' };
        });
      });

      worksheet.addRow([]); // Blank line

      // 5. INVENTARIS SECTION
      const rowInvHeader = worksheet.addRow(['DAFTAR INVENTARIS SARANA PRASARANA']);
      rowInvHeader.font = boldFont;

      const headersInv = ['No', 'Nama Item Inventaris', 'Total Kuantitas', 'Kondisi Baik', 'Kondisi Rusak', '', '', ''];
      const rowInvFields = worksheet.addRow(headersInv);
      rowInvFields.font = headerFont;
      rowInvFields.eachCell((cell) => {
        cell.fill = headerFill;
        cell.alignment = { horizontal: 'center' };
      });

      const repInventories = allInventories.filter((i) => i.report_id === report.id);
      let invNo = 1;
      repInventories.forEach((inv) => {
        const row = worksheet.addRow([
          invNo++,
          inv.item_name,
          inv.quantity,
          inv.status_baik,
          inv.status_rusak,
          '',
          '',
          ''
        ]);
        row.font = regularFont;
        row.eachCell((cell, colNum) => {
          cell.border = thinBorder;
          if (colNum !== 2) {
            cell.alignment = { horizontal: 'center' };
          }
        });
      });

      worksheet.addRow([]); // Blank line

      // 6. SIGNATURES FOOTER
      worksheet.addRow([]);
      const signRow1 = worksheet.addRow(['', '', '', '', '', 'Malang, ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })]);
      const signRow2 = worksheet.addRow(['', 'Mengetahui,', '', '', '', 'Dibuat Oleh,']);
      const signRow3 = worksheet.addRow(['', 'Kepala Sekolah', '', '', '', 'Petugas Administrasi']);
      worksheet.addRow([]);
      worksheet.addRow([]);
      worksheet.addRow([]);
      const signRow4 = worksheet.addRow(['', school.kepala_sekolah, '', '', '', 'Petugas Sekolah']);
      
      signRow1.font = regularFont;
      signRow2.font = boldFont;
      signRow3.font = boldFont;
      signRow4.font = boldFont;
    });

    // Trigger Excel download in browser
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Rekap_Laporan_Bulanan_Aisyiyah_${month}_2026.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Generates a pixel-perfect styled A4 PDF matching the physical reporting layouts
   */
  async exportToPdf(elementId: string, schoolName: string, reportMonth: string) {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Set configuration for html2canvas
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution density
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210; // A4 standard width in mm
    const pageHeight = 295; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Add multiple pages if necessary
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`Laporan_Bulanan_${schoolName.replace(/\s+/g, '_')}_${reportMonth}_2026.pdf`);
  },

  /**
   * Generates a template for teacher data import
   */
  async downloadTeacherTemplate() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template Guru');

    // Instructions
    worksheet.mergeCells('A1:R1');
    worksheet.getCell('A1').value = 'PETUNJUK PENGISIAN TEMPLATE DATA GURU (SIABA)';
    worksheet.getCell('A1').font = { name: 'Arial', size: 12, bold: true, color: { argb: '15803d' } };

    worksheet.mergeCells('A2:R2');
    worksheet.getCell('A2').value = '1. Kolom bertanda bintang (*) WAJIB diisi. Kolom lainnya dapat dikosongkan atau diisi tanda strip (-).';
    worksheet.getCell('A2').font = { name: 'Arial', size: 9, italic: true };

    worksheet.mergeCells('A3:R3');
    worksheet.getCell('A3').value = '2. Format Tanggal Lahir & TMT menggunakan format YYYY-MM-DD (Contoh: 1990-05-20).';
    worksheet.getCell('A3').font = { name: 'Arial', size: 9, italic: true };

    worksheet.mergeCells('A4:R4');
    worksheet.getCell('A4').value = '3. Kolom Jenis Kelamin diisi L (Laki-laki) atau P (Perempuan).';
    worksheet.getCell('A4').font = { name: 'Arial', size: 9, italic: true };

    worksheet.mergeCells('A5:R5');
    worksheet.getCell('A5').value = '4. Kolom Status Kepegawaian diisi salah satu dari: GTY, GTT, PNS, PPPK, Honor.';
    worksheet.getCell('A5').font = { name: 'Arial', size: 9, italic: true };

    worksheet.addRow([]); // Blank spacer

    // Headers
    const headers = [
      'Nama Lengkap Guru*',
      'NIK* (16 Digit)',
      'NIP (Jika ada)',
      'Tempat Lahir*',
      'Tanggal Lahir* (YYYY-MM-DD)',
      'Jenis Kelamin* (L/P)',
      'Alamat*',
      'No HP*',
      'Email',
      'Pendidikan* (e.g. S1)',
      'Jurusan*',
      'TMT* (YYYY-MM-DD)',
      'Status Kepegawaian*',
      'Jabatan*',
      'Golongan (Jika ada)',
      'Honor Bulanan*',
      'Tahun Pelajaran*',
      'Semester* (Ganjil/Genap)'
    ];

    const rowHeader = worksheet.addRow(headers);
    rowHeader.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    rowHeader.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '16a34a' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });

    // Sample Row
    const sampleRow = worksheet.addRow([
      'Siti Aminah, S.Pd.',
      '3301021234567890',
      '-',
      'Klaten',
      '1992-04-12',
      'P',
      'Jl. Pemuda No. 45, Klaten Tengah',
      '081234567890',
      'siti.aminah@gmail.com',
      'S1',
      'PG-PAUD',
      '2018-07-01',
      'GTY',
      'Guru Kelas',
      '-',
      1800000,
      '2026/2027',
      'Ganjil'
    ]);
    sampleRow.font = { name: 'Arial', size: 9, color: { argb: '475569' } };

    // Column widths
    worksheet.columns = [
      { width: 25 }, // Nama
      { width: 20 }, // NIK
      { width: 20 }, // NIP
      { width: 15 }, // Tempat Lahir
      { width: 25 }, // Tanggal Lahir
      { width: 15 }, // Gender
      { width: 30 }, // Alamat
      { width: 15 }, // No HP
      { width: 25 }, // Email
      { width: 15 }, // Pendidikan
      { width: 15 }, // Jurusan
      { width: 20 }, // TMT
      { width: 20 }, // Status
      { width: 15 }, // Jabatan
      { width: 15 }, // Golongan
      { width: 15 }, // Honor
      { width: 15 }, // Tapel
      { width: 15 }  // Semester
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'Template_Master_Data_Guru.xlsx';
    anchor.click();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Generates a template for student data import
   */
  async downloadStudentTemplate() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template Murid');

    // Instructions
    worksheet.mergeCells('A1:V1');
    worksheet.getCell('A1').value = 'PETUNJUK PENGISIAN TEMPLATE DATA MURID (SIABA)';
    worksheet.getCell('A1').font = { name: 'Arial', size: 12, bold: true, color: { argb: '15803d' } };

    worksheet.mergeCells('A2:V2');
    worksheet.getCell('A2').value = '1. Kolom bertanda bintang (*) WAJIB diisi. Kolom lainnya dapat dikosongkan atau diisi tanda strip (-).';
    worksheet.getCell('A2').font = { name: 'Arial', size: 9, italic: true };

    worksheet.mergeCells('A3:V3');
    worksheet.getCell('A3').value = '2. Format Tanggal Lahir menggunakan format YYYY-MM-DD (Contoh: 2020-10-15).';
    worksheet.getCell('A3').font = { name: 'Arial', size: 9, italic: true };

    worksheet.mergeCells('A4:V4');
    worksheet.getCell('A4').value = '3. Kolom Jenis Kelamin diisi L (Laki-laki) atau P (Perempuan).';
    worksheet.getCell('A4').font = { name: 'Arial', size: 9, italic: true };

    worksheet.mergeCells('A5:V5');
    worksheet.getCell('A5').value = '4. Kolom Status Aktif diisi salah satu dari: Aktif, Lulus, Pindah, Keluar.';
    worksheet.getCell('A5').font = { name: 'Arial', size: 9, italic: true };

    worksheet.addRow([]); // Blank spacer

    // Headers
    const headers = [
      'Nama Lengkap Murid*',
      'NIK* (16 Digit)',
      'NISN* (10 Digit)',
      'Tempat Lahir*',
      'Tanggal Lahir* (YYYY-MM-DD)',
      'Jenis Kelamin* (L/P)',
      'Nama Ayah*',
      'Nama Ibu*',
      'Alamat*',
      'RT',
      'RW',
      'Kelurahan*',
      'Kecamatan*',
      'Kabupaten*',
      'Provinsi*',
      'Agama*',
      'Anak Ke*',
      'Jumlah Saudara*',
      'Status Aktif*',
      'Tahun Masuk*',
      'Tahun Pelajaran*',
      'Semester* (Ganjil/Genap)'
    ];

    const rowHeader = worksheet.addRow(headers);
    rowHeader.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    rowHeader.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '16a34a' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });

    // Sample Row
    const sampleRow = worksheet.addRow([
      'Ahmad Syarif',
      '3301021510200001',
      '0201234567',
      'Klaten',
      '2020-10-15',
      'L',
      'Budi Santoso',
      'Siti Rahma',
      'Jl. Mawar No. 5, Gergunung',
      '02',
      '04',
      'Gergunung',
      'Klaten Utara',
      'Klaten',
      'Jawa Tengah',
      'Islam',
      1,
      2,
      'Aktif',
      '2025',
      '2026/2027',
      'Ganjil'
    ]);
    sampleRow.font = { name: 'Arial', size: 9, color: { argb: '475569' } };

    // Column widths
    worksheet.columns = [
      { width: 25 }, // Nama
      { width: 20 }, // NIK
      { width: 15 }, // NISN
      { width: 15 }, // Tempat Lahir
      { width: 25 }, // Tanggal Lahir
      { width: 15 }, // Gender
      { width: 20 }, // Ayah
      { width: 20 }, // Ibu
      { width: 25 }, // Alamat
      { width: 8 },  // RT
      { width: 8 },  // RW
      { width: 15 }, // Kelurahan
      { width: 15 }, // Kecamatan
      { width: 15 }, // Kabupaten
      { width: 15 }, // Provinsi
      { width: 12 }, // Agama
      { width: 10 }, // Anak Ke
      { width: 15 }, // Jumlah Saudara
      { width: 15 }, // Status
      { width: 15 }, // Tahun Masuk
      { width: 15 }, // Tapel
      { width: 15 }  // Semester
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'Template_Master_Data_Murid.xlsx';
    anchor.click();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Parses uploaded Teacher Excel file
   */
  async parseTeacherExcel(file: File): Promise<any[]> {
    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.worksheets[0];
    const teachers: any[] = [];

    let headerIndex = -1;
    worksheet.eachRow((row, rowNumber) => {
      const cell1Text = row.getCell(1).text?.trim() || '';
      if (cell1Text.includes('Nama Lengkap Guru')) {
        headerIndex = rowNumber;
        return;
      }

      if (headerIndex !== -1 && rowNumber > headerIndex) {
        const nama = row.getCell(1).text?.trim();
        const nik = row.getCell(2).text?.trim();
        if (!nama || !nik) return;
        
        // Skip sample row
        if (nama === 'Siti Aminah, S.Pd.' || nik === '3301021234567890') return;

        // Clean values
        const t: any = {
          nama,
          nik,
          nip: row.getCell(3).text?.trim() || '-',
          tempat_lahir: row.getCell(4).text?.trim() || 'Klaten',
          tanggal_lahir: row.getCell(5).text?.trim() || '1990-01-01',
          jenis_kelamin: (row.getCell(6).text?.trim() || 'P').toUpperCase().startsWith('L') ? 'L' : 'P',
          alamat: row.getCell(7).text?.trim() || '',
          no_hp: row.getCell(8).text?.trim() || '-',
          email: row.getCell(9).text?.trim() || '-',
          pendidikan: row.getCell(10).text?.trim() || 'S1',
          jurusan: row.getCell(11).text?.trim() || 'PG-PAUD',
          tmt: row.getCell(12).text?.trim() || '2020-07-01',
          status_guru: (row.getCell(13).text?.trim() || 'GTY') as any,
          jabatan: row.getCell(14).text?.trim() || 'Guru Kelas',
          golongan: row.getCell(15).text?.trim() || '-',
          honor: typeof row.getCell(16).value === 'number' ? row.getCell(16).value : Number(row.getCell(16).text) || 1500000,
          tahun_pelajaran: row.getCell(17).text?.trim() || '2026/2027',
          semester: (row.getCell(18).text?.trim() || 'Ganjil') as any
        };
        teachers.push(t);
      }
    });

    return teachers;
  },

  /**
   * Parses uploaded Student Excel file
   */
  async parseStudentExcel(file: File): Promise<any[]> {
    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.worksheets[0];
    const students: any[] = [];

    let headerIndex = -1;
    worksheet.eachRow((row, rowNumber) => {
      const cell1Text = row.getCell(1).text?.trim() || '';
      if (cell1Text.includes('Nama Lengkap Murid')) {
        headerIndex = rowNumber;
        return;
      }

      if (headerIndex !== -1 && rowNumber > headerIndex) {
        const nama = row.getCell(1).text?.trim();
        const nik = row.getCell(2).text?.trim();
        if (!nama || !nik) return;

        // Skip sample row
        if (nama === 'Ahmad Syarif' || nik === '3301021510200001') return;

        // Clean values
        const s: any = {
          nama,
          nik,
          nisn: row.getCell(3).text?.trim() || '',
          tempat_lahir: row.getCell(4).text?.trim() || 'Klaten',
          tanggal_lahir: row.getCell(5).text?.trim() || '2020-01-01',
          jenis_kelamin: (row.getCell(6).text?.trim() || 'P').toUpperCase().startsWith('L') ? 'L' : 'P',
          nama_ayah: row.getCell(7).text?.trim() || '-',
          nama_ibu: row.getCell(8).text?.trim() || '-',
          alamat: row.getCell(9).text?.trim() || '',
          rt: row.getCell(10).text?.trim() || '01',
          rw: row.getCell(11).text?.trim() || '01',
          kelurahan: row.getCell(12).text?.trim() || '',
          kecamatan: row.getCell(13).text?.trim() || '',
          kabupaten: row.getCell(14).text?.trim() || 'Klaten',
          provinsi: row.getCell(15).text?.trim() || 'Jawa Tengah',
          agama: row.getCell(16).text?.trim() || 'Islam',
          anak_ke: typeof row.getCell(17).value === 'number' ? row.getCell(17).value : Number(row.getCell(17).text) || 1,
          jumlah_saudara: typeof row.getCell(18).value === 'number' ? row.getCell(18).value : Number(row.getCell(18).text) || 0,
          status_aktif: (row.getCell(19).text?.trim() || 'Aktif') as any,
          tahun_masuk: row.getCell(20).text?.trim() || '2025',
          tahun_pelajaran: row.getCell(21).text?.trim() || '2026/2027',
          semester: (row.getCell(22).text?.trim() || 'Ganjil') as any
        };
        students.push(s);
      }
    });

    return students;
  },

  /**
   * Exports a single school's complete profile to Excel, with formal headings and a signature block
   */
  async exportSchoolProfileToExcel(school: School) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Profil Sekolah');

    worksheet.columns = [
      { key: 'A', width: 25 },
      { key: 'B', width: 40 },
      { key: 'C', width: 5 },
      { key: 'D', width: 25 },
      { key: 'E', width: 40 }
    ];

    const titleFont = { name: 'Arial', size: 14, bold: true };
    const sectionFont = { name: 'Arial', size: 11, bold: true, color: { argb: '16a34a' } };
    const labelFont = { name: 'Arial', size: 10, bold: true };
    const valueFont = { name: 'Arial', size: 10 };
    const headerFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '16a34a' }
    } as any;

    // Title Block
    worksheet.mergeCells('A1:E1');
    worksheet.getCell('A1').value = 'PROFIL LENGKAP SEKOLAH';
    worksheet.getCell('A1').font = titleFont;
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:E2');
    worksheet.getCell('A2').value = school.name.toUpperCase();
    worksheet.getCell('A2').font = { ...titleFont, size: 12 };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    worksheet.addRow([]); // Blank spacer

    // Section 1: Identitas Sekolah (Left Column)
    worksheet.getCell('A4').value = 'I. IDENTITAS SEKOLAH';
    worksheet.getCell('A4').font = sectionFont;

    worksheet.getCell('A5').value = 'Nama Sekolah';
    worksheet.getCell('B5').value = school.name;
    worksheet.getCell('A6').value = 'NPSN';
    worksheet.getCell('B6').value = school.npsn;
    worksheet.getCell('A7').value = 'NSM';
    worksheet.getCell('B7').value = school.nsm || '-';
    worksheet.getCell('A8').value = 'Jenjang';
    worksheet.getCell('B8').value = school.jenjang;
    worksheet.getCell('A9').value = 'Status';
    worksheet.getCell('B9').value = school.status;
    worksheet.getCell('A10').value = 'Akreditasi';
    worksheet.getCell('B10').value = school.akreditasi || '-';
    worksheet.getCell('A11').value = 'Status Aktif';
    worksheet.getCell('B11').value = school.status_aktif;

    // Section 2: Alamat & Kontak (Right Column)
    worksheet.getCell('D4').value = 'II. ALAMAT & KONTAK';
    worksheet.getCell('D4').font = sectionFont;

    worksheet.getCell('D5').value = 'Alamat';
    worksheet.getCell('E5').value = school.alamat || '-';
    worksheet.getCell('D6').value = 'Kelurahan';
    worksheet.getCell('E6').value = school.kelurahan || '-';
    worksheet.getCell('D7').value = 'Kecamatan';
    worksheet.getCell('E7').value = school.kecamatan || '-';
    worksheet.getCell('D8').value = 'Kabupaten';
    worksheet.getCell('E8').value = school.kabupaten || '-';
    worksheet.getCell('D9').value = 'Provinsi';
    worksheet.getCell('E9').value = school.provinsi || '-';
    worksheet.getCell('D10').value = 'Kode Pos';
    worksheet.getCell('E10').value = school.kode_pos || '-';
    worksheet.getCell('D11').value = 'Telepon';
    worksheet.getCell('E11').value = school.telepon || '-';
    worksheet.getCell('D12').value = 'Email';
    worksheet.getCell('E12').value = school.email || '-';

    worksheet.addRow([]); // Spacer
    worksheet.addRow([]);

    // Section 3: Sarana & Prasarana
    worksheet.mergeCells('A14:E14');
    worksheet.getCell('A14').value = 'III. SARANA, PRASARANA & DETIL LAINNYA';
    worksheet.getCell('A14').font = sectionFont;

    worksheet.getCell('A15').value = 'Status Tanah';
    worksheet.getCell('B15').value = school.status_tanah || '-';
    worksheet.getCell('D15').value = 'Luas Tanah';
    worksheet.getCell('E15').value = (school.luas_tanah || 0) + ' m²';

    worksheet.getCell('A16').value = 'Status Gedung';
    worksheet.getCell('B16').value = school.status_gedung || '-';
    worksheet.getCell('D16').value = 'Luas Bangunan';
    worksheet.getCell('E16').value = (school.luas_bangunan || 0) + ' m²';

    worksheet.getCell('A17').value = 'Jumlah Ruang Kelas';
    worksheet.getCell('B17').value = school.jumlah_ruang || 0;
    worksheet.getCell('D17').value = 'Jumlah Toilet';
    worksheet.getCell('E17').value = school.jumlah_toilet || 0;

    worksheet.getCell('A18').value = 'Tahun Berdiri';
    worksheet.getCell('B18').value = school.tahun_berdiri || '-';
    worksheet.getCell('D18').value = 'Tahun Operasional';
    worksheet.getCell('E18').value = school.tahun_operasional || '-';

    worksheet.getCell('A19').value = 'Ranting Aisyiyah';
    worksheet.getCell('B19').value = school.ranting_aisyiyah || '-';
    worksheet.getCell('D19').value = 'Ketua Ranting';
    worksheet.getCell('E19').value = school.ketua_ranting || '-';

    worksheet.getCell('A20').value = 'Ketua PDA Majelis';
    worksheet.getCell('B20').value = school.ketua_pda || '-';
    worksheet.getCell('D20').value = 'Ketua PCA Majelis';
    worksheet.getCell('E20').value = school.ketua_pca || '-';

    worksheet.addRow([]);
    worksheet.addRow([]);
    worksheet.addRow([]);
    worksheet.addRow([]);

    // Signature Block at the bottom
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    
    // Fill the cells manually
    const startRowIndex = 24;
    worksheet.getCell(`D${startRowIndex}`).value = 'Malang, ' + dateStr;
    worksheet.getCell(`D${startRowIndex}`).font = valueFont;

    worksheet.getCell(`A${startRowIndex + 1}`).value = 'Mengetahui / Menyetujui,';
    worksheet.getCell(`A${startRowIndex + 1}`).font = labelFont;
    worksheet.getCell(`D${startRowIndex + 1}`).value = 'Kepala Sekolah,';
    worksheet.getCell(`D${startRowIndex + 1}`).font = labelFont;

    worksheet.getCell(`A${startRowIndex + 2}`).value = 'Pimpinan Aisyiyah Ranting';
    worksheet.getCell(`A${startRowIndex + 2}`).font = valueFont;
    worksheet.getCell(`D${startRowIndex + 2}`).value = school.name;
    worksheet.getCell(`D${startRowIndex + 2}`).font = valueFont;

    // Space for signature
    worksheet.getCell(`A${startRowIndex + 6}`).value = school.ketua_ranting ? `( ${school.ketua_ranting} )` : '( ________________________ )';
    worksheet.getCell(`A${startRowIndex + 6}`).font = labelFont;
    worksheet.getCell(`D${startRowIndex + 6}`).value = school.kepala_sekolah || '(Nama Kepala Sekolah)';
    worksheet.getCell(`D${startRowIndex + 6}`).font = { ...labelFont, underline: true };

    worksheet.getCell(`A${startRowIndex + 7}`).value = '';
    worksheet.getCell(`A${startRowIndex + 7}`).font = valueFont;
    worksheet.getCell(`D${startRowIndex + 7}`).value = 'NIP. ' + (school.nip_kepala || '-');
    worksheet.getCell(`D${startRowIndex + 7}`).font = valueFont;

    // Format headers and borders for identity and contacts
    for (let r = 5; r <= 12; r++) {
      worksheet.getCell(`A${r}`).font = labelFont;
      worksheet.getCell(`B${r}`).font = valueFont;
      worksheet.getCell(`D${r}`).font = labelFont;
      worksheet.getCell(`E${r}`).font = valueFont;
    }

    // Format section 3 values
    for (let r = 15; r <= 20; r++) {
      worksheet.getCell(`A${r}`).font = labelFont;
      worksheet.getCell(`B${r}`).font = valueFont;
      worksheet.getCell(`D${r}`).font = labelFont;
      worksheet.getCell(`E${r}`).font = valueFont;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Profil_Sekolah_${school.name.replace(/\s+/g, '_')}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Generates a beautifully styled A4 PDF of a single school's complete profile
   */
  async exportSchoolProfileToPdf(elementId: string, schoolName: string) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`Profil_Sekolah_${schoolName.replace(/\s+/g, '_')}.pdf`);
  }
};
