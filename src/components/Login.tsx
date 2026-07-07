/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ApiService } from '../lib/api';
import { User } from '../types';
import { Shield, Key, UserCheck, School, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  appTitle?: string;
  appSubtitle?: string;
}

export default function Login({ onLoginSuccess, appTitle = 'SIM IGABA', appSubtitle = 'Klaten Utara' }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [schoolsList, setSchoolsList] = useState<{ id: string, name: string, npsn: string, username_petugas: string }[]>([]);

  useEffect(() => {
    fetch('/api/auth/schools')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.schools) {
          setSchoolsList(data.schools);
        }
      })
      .catch(err => console.error('Failed to fetch auth schools:', err));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await ApiService.login(username, password);
    setLoading(false);

    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else {
      setError(res.message || 'Username atau password salah.');
    }
  };

  const prefill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div id="login-screen" className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden" style={{ backgroundImage: "radial-gradient(at 0% 0%, rgba(220, 252, 231, 0.4) 0, transparent 50%), radial-gradient(at 100% 100%, rgba(187, 247, 208, 0.4) 0, transparent 50%)" }}>
      {/* Decorative ambient circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-200/20 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-100/30 rounded-full blur-3xl -z-10"></div>

      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-2 bg-white rounded-2xl shadow-xl mb-4 ring-4 ring-green-100">
            <img src="https://igaba.id/Icon-IGABA.png" alt="SIM IGABA Logo" className="w-16 h-16 object-contain" referrerPolicy="no-referrer" id="logo-icon" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans uppercase" id="app-title">
            {appTitle}
          </h1>
          <p className="text-sm text-slate-500 font-medium font-sans">
            {appSubtitle}
          </p>
        </div>

        <div className="glass-panel rounded-3xl shadow-xl shadow-slate-100 p-8 border border-white/60">
          <h2 className="text-lg font-semibold text-slate-800 mb-6 font-sans">
            Masuk ke Sistem
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 font-sans flex items-start gap-2 animate-pulse">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <UserCheck className="w-4.5 h-4.5" />
                </span>
                <input
                  id="username-input"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-800 font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Key className="w-4.5 h-4.5" />
                </span>
                <input
                  id="password-input"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-white/80 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-800 font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <button
              id="login-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-600/10 hover:shadow-brand-600/20 hover:scale-[1.01] transition-all cursor-pointer font-sans"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  Masuk Aplikasi
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts Helper */}
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-sans">
              Bantuan Akun Login & Contoh
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {/* Super Admin */}
              <div 
                onClick={() => prefill('admin', 'adminn')}
                className="p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/50 flex items-center justify-between text-left transition-colors cursor-pointer group"
                title="Klik untuk mengisi data login Super Admin"
              >
                <div className="min-w-0">
                  <span className="text-[9px] bg-indigo-50 text-indigo-600 font-bold px-1.5 py-0.5 rounded uppercase font-sans">Super Admin</span>
                  <p className="text-xs font-semibold text-slate-700 truncate mt-1">User: admin</p>
                </div>
                <span className="text-[10px] text-slate-400 group-hover:text-brand-600 font-medium font-sans flex items-center gap-0.5">
                  Gunakan <ArrowRight className="w-3 h-3" />
                </span>
              </div>

              {/* Schools List */}
              {schoolsList.map((sch) => (
                <div 
                  key={sch.id}
                  onClick={() => prefill(sch.username_petugas, sch.username_petugas)}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/50 flex items-center justify-between text-left transition-colors cursor-pointer group"
                  title={`Klik untuk mengisi data login Petugas ${sch.name}`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <span className="text-[9px] bg-green-50 text-green-600 font-bold px-1.5 py-0.5 rounded uppercase font-sans">
                      Petugas {sch.name.replace('TK Aisyiyah Bustanul Athfal ', 'ABA ')}
                    </span>
                    <p className="text-xs font-semibold text-slate-700 truncate mt-1">
                      User: <b className="text-slate-950 font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200">{sch.username_petugas}</b>
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 group-hover:text-brand-600 font-medium font-sans flex items-center gap-0.5 shrink-0">
                    Gunakan <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6 font-sans">
          {appTitle} {appSubtitle} © 2026. Hak Cipta Dilindungi.
        </p>
      </div>
    </div>
  );
}
