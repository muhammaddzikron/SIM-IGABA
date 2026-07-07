/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, AuditLog } from '../types';
import {
  Activity,
  Search,
  Filter,
  ShieldAlert,
  Clock,
  User as UserIcon,
  Tag
} from 'lucide-react';

interface LogsViewProps {
  user: User;
  logs: AuditLog[];
}

export default function LogsView({ user, logs }: LogsViewProps) {
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.user_name.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());
    
    const matchesRole = selectedRole === 'ALL' || log.user_role === selectedRole;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Filtering Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              id="log-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari logs berdasarkan aktivitas, detail, operator..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-slate-700 font-sans"
            />
          </div>

          <select
            id="log-role-filter"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-600 focus:outline-none font-sans"
          >
            <option value="ALL">Semua Tingkat Jabatan</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin (Read-Only)</option>
            <option value="PETUGAS">Petugas Sekolah</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200/60 rounded-3xl shadow-sm overflow-hidden animate-fade-in">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5 text-brand-700">
            <Activity className="w-4.5 h-4.5" />
            Log Aktivitas Keamanan Sistem
          </span>
          <span className="text-[10px] font-bold text-slate-400">
            Total {filteredLogs.length} Entri Keamanan
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="p-4 w-44">Waktu Kejadian (WIB)</th>
                <th className="p-4 w-44">Nama Pengguna</th>
                <th className="p-4 w-36">Jabatan / Role</th>
                <th className="p-4 w-44">Jenis Aktivitas</th>
                <th className="p-4">Keterangan Detail Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-mono text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    {new Date(log.timestamp).toLocaleString('id-ID', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </td>
                  <td className="p-4 font-semibold text-slate-800">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <span className="truncate">{log.user_name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      log.user_role === 'SUPER_ADMIN'
                        ? 'bg-amber-50 text-amber-700 border border-amber-100'
                        : log.user_role === 'ADMIN'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {log.user_role}
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                      {log.action}
                    </div>
                  </td>
                  <td className="p-4 text-slate-500 font-mono text-[11px] max-w-sm truncate" title={log.details}>
                    {log.details}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-slate-400 font-sans">
                    Log aktivitas tidak ditemukan atau kosong.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
