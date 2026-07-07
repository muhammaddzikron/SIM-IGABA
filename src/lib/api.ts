/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { School, Teacher, Student, Report, AttendanceTeacher, AttendanceStudent, Inventory, District, Village, Log, SystemSettings, User } from '../types';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  source?: 'google_sheets' | 'local_database';
  data?: T;
}

const API_BASE = '/api';

export const ApiService = {
  // Authentication
  async login(username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, message: 'Gagal menghubungi server backend.' };
    }
  },

  // Generic Sheets CRUD
  async getList<T>(sheet: string): Promise<ApiResponse<T[]>> {
    try {
      const res = await fetch(`${API_BASE}/sheets/${sheet}`);
      return await res.json();
    } catch (err) {
      console.error(`Get list error for ${sheet}:`, err);
      return { success: false, message: `Gagal memuat data ${sheet}` };
    }
  },

  async createItem<T>(sheet: string, data: Partial<T>): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(`${API_BASE}/sheets/${sheet}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (err) {
      console.error(`Create error for ${sheet}:`, err);
      return { success: false, message: `Gagal menyimpan data baru ke ${sheet}` };
    }
  },

  async importItems<T>(sheet: string, items: Partial<T>[]): Promise<ApiResponse<T[]>> {
    try {
      const res = await fetch(`${API_BASE}/sheets-import/${sheet}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items)
      });
      return await res.json();
    } catch (err) {
      console.error(`Import error for ${sheet}:`, err);
      return { success: false, message: `Gagal mengimpor data ke ${sheet}` };
    }
  },

  async updateItem<T>(sheet: string, id: string, data: Partial<T>): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(`${API_BASE}/sheets/${sheet}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (err) {
      console.error(`Update error for ${sheet} id ${id}:`, err);
      return { success: false, message: `Gagal memperbarui data ${sheet}` };
    }
  },

  async deleteItem(sheet: string, id: string): Promise<ApiResponse<void>> {
    try {
      const res = await fetch(`${API_BASE}/sheets/${sheet}/${id}`, {
        method: 'DELETE'
      });
      return await res.json();
    } catch (err) {
      console.error(`Delete error for ${sheet} id ${id}:`, err);
      return { success: false, message: `Gagal menghapus data dari ${sheet}` };
    }
  },

  // Settings
  async getSettings(): Promise<ApiResponse<SystemSettings>> {
    try {
      const res = await fetch(`${API_BASE}/settings`);
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Gagal memuat pengaturan' };
    }
  },

  async saveSettings(settings: SystemSettings): Promise<ApiResponse<SystemSettings>> {
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Gagal menyimpan pengaturan' };
    }
  },

  // Backup & Restore Database
  async backupDatabase(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/backup/export`);
      return await res.json();
    } catch (err) {
      console.error('Backup error:', err);
      throw new Error('Gagal mendownload backup database');
    }
  },

  async restoreDatabase(dbJson: any): Promise<ApiResponse<void>> {
    try {
      const res = await fetch(`${API_BASE}/backup/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbJson)
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Gagal memulihkan database' };
    }
  },

  // Initialize Google Sheets with sample data
  async initializeGoogleSheets(accessToken: string, spreadsheetId: string): Promise<ApiResponse<void>> {
    try {
      const res = await fetch(`${API_BASE}/sheets-setup/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, spreadsheetId })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Gagal menginisialisasi Google Spreadsheet' };
    }
  }
};
