/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';

// Seed data imports
import {
  schools as seedSchools,
  teachers as seedTeachers,
  students as seedStudents,
  reports as seedReports,
  attendanceTeachers as seedAttendanceTeachers,
  attendanceStudents as seedAttendanceStudents,
  inventories as seedInventories,
  districts as seedDistricts,
  villages as seedVillages,
  systemLogs as seedLogs,
  initialSettings as seedSettings
} from './src/mockData';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Paths
const DATA_FILE = (() => {
  const isServerless = !!(process.env.VERCEL || process.env.TMPDIR || fs.existsSync('/tmp'));
  if (isServerless) {
    const tmpPath = path.join('/tmp', 'data-store.json');
    const repoPath = (() => {
      try {
        if (typeof __dirname !== 'undefined' && __dirname) {
          return path.join(__dirname, '../data-store.json');
        }
      } catch (e) {}
      return path.join(process.cwd(), 'data-store.json');
    })();
    if (!fs.existsSync(tmpPath) && fs.existsSync(repoPath)) {
      try {
        fs.copyFileSync(repoPath, tmpPath);
      } catch (err) {
        console.error('Failed to copy data-store.json to /tmp:', err);
      }
    }
    return tmpPath;
  }
  return path.join(process.cwd(), 'data-store.json');
})();

function getDefaultUsername(school: any): string {
  if (school.username_petugas) return school.username_petugas;

  let name = (school.name || '').toLowerCase();

  // First check if there's a hardcoded ID match from original mock data just to preserve original accounts
  if (school.id === 'school-1') return 'tkabagergunung';
  if (school.id === 'school-2') return 'tkababarenglor';
  if (school.id === 'school-3') return 'tkababramen';
  if (school.id === 'school-4') return 'tkabagunungan';

  // Specific hardcoded checks for backwards compatibility
  if (name.includes('gergunung') && (name.includes('ba') || name.includes('tk') || name.includes('aba')) && !name.includes('gergunung i') && !name.includes('gergunung ii') && !name.includes('gergunung 1') && !name.includes('gergunung 2')) {
    return 'tkabagergunung';
  }
  if (name.includes('bareng') || name.includes('lor')) return 'tkababarenglor';
  if (name.includes('bramen')) return 'tkababramen';

  // Normalize school prefix type: "kb", "ba", "tk"
  let typePrefix = 'tkaba'; // default
  if (name.includes('kb ') || name.includes('kelompok bermain')) {
    typePrefix = 'kb';
  } else if (name.includes('ba ') || name.includes('bustanul') || name.includes('bustanul athfal')) {
    typePrefix = 'ba';
  } else if (name.includes('tk ') || name.includes('aba ')) {
    typePrefix = 'tkaba';
  }

  // Remove common prefixes and structural words
  let cleaned = name
    .replace(/kelompok bermain/g, '')
    .replace(/bustanul athfal/g, '')
    .replace(/aisyiyah/g, '')
    .replace(/bustanul/g, '')
    .replace(/athfal/g, '')
    .replace(/aba/g, '')
    .replace(/\bba\b/g, '')
    .replace(/\bkb\b/g, '')
    .replace(/\btk\b/g, '')
    .replace(/['’]/g, ''); // strip single quotes

  // Remove any non-alphanumeric except spaces, then clean spaces
  cleaned = cleaned.replace(/[^a-z0-9\s]/g, '').trim();

  // Replace spaces with nothing for a compact username
  let words = cleaned.split(/\s+/).filter(Boolean);
  let joinedWords = words.join('');

  let usernameResult = typePrefix + joinedWords;
  return usernameResult || 'tkabapetugas';
}

function getDynamicSeedSKGuru(teachers: any[], schools: any[]) {
  const sks: any[] = [];
  const teachersBySchool: Record<string, any[]> = {};
  for (const t of teachers) {
    if (!teachersBySchool[t.school_id]) {
      teachersBySchool[t.school_id] = [];
    }
    teachersBySchool[t.school_id].push(t);
  }

  let skIdCounter = 1;
  const schoolIds = Object.keys(teachersBySchool);

  for (const sId of schoolIds) {
    const schoolTeachers = teachersBySchool[sId];
    if (!schoolTeachers || schoolTeachers.length === 0) continue;

    const kepsek = schoolTeachers.find(t => String(t.jabatan || '').toLowerCase().includes('kepala')) || schoolTeachers[0];
    const otherTeachers = schoolTeachers.filter(t => t.id !== kepsek.id);

    const yearKepsek = kepsek.tmt ? (String(kepsek.tmt).match(/\d{4}/) ? String(kepsek.tmt).match(/\d{4}/)![0] : '2021') : '2021';
    sks.push({
      id: `sk-${skIdCounter++}`,
      school_id: sId,
      teacher_id: kepsek.id,
      no_sk: `0${skIdCounter + 10}/SK.G/PDA/VII/${yearKepsek}`,
      tanggal_sk: kepsek.tmt || '2021-07-01',
      jenis_sk: String(kepsek.jabatan || '').toLowerCase().includes('kepala') ? 'Penetapan Kepala Sekolah' : 'Pengangkatan Guru Tetap Yayasan (GTY)',
      tmt_sk: kepsek.tmt || '2021-07-01',
      status: 'Approved',
      notes: `SK Pengangkatan sebagai ${kepsek.jabatan || 'Kepala Sekolah'} otomatis oleh sistem SIM IGABA`,
      gaji_pokok: 750000,
      tunjangan: 250000,
      created_at: new Date('2026-07-01T00:00:00.000Z').toISOString(),
      updated_at: new Date('2026-07-01T00:00:00.000Z').toISOString()
    });

    if (otherTeachers.length > 0) {
      const secondT = otherTeachers[0];
      const yearSecond = secondT.tmt ? (String(secondT.tmt).match(/\d{4}/) ? String(secondT.tmt).match(/\d{4}/)![0] : '2022') : '2022';
      sks.push({
        id: `sk-${skIdCounter++}`,
        school_id: sId,
        teacher_id: secondT.id,
        no_sk: `0${skIdCounter + 15}/SK.G/PDA/VII/${yearSecond}`,
        tanggal_sk: secondT.tmt || '2022-07-15',
        jenis_sk: secondT.status_guru === 'GTT' ? 'Pengangkatan Guru Tidak Tetap (GTT)' : 'Pengangkatan Guru Tetap Yayasan (GTY)',
        tmt_sk: secondT.tmt || '2022-07-15',
        status: 'Approved',
        notes: `Pengangkatan ${secondT.status_guru || 'GTY'} otomatis`,
        gaji_pokok: 500000,
        tunjangan: 150000,
        created_at: new Date('2026-07-02T00:00:00.000Z').toISOString(),
        updated_at: new Date('2026-07-02T00:00:00.000Z').toISOString()
      });
    }

    if (otherTeachers.length > 1) {
      const thirdT = otherTeachers[1];
      sks.push({
        id: `sk-${skIdCounter++}`,
        school_id: sId,
        teacher_id: thirdT.id,
        no_sk: '',
        tanggal_sk: '2026-07-05',
        jenis_sk: 'Pengangkatan Guru Tetap Yayasan (GTY)',
        tmt_sk: '2026-07-15',
        status: 'Pending',
        notes: `Usulan kenaikan status menjadi GTY untuk ${thirdT.nama}`,
        gaji_pokok: 600000,
        tunjangan: 200000,
        created_at: new Date('2026-07-11T00:00:00.000Z').toISOString(),
        updated_at: new Date('2026-07-11T00:00:00.000Z').toISOString()
      });
    }
  }
  return sks;
}

let memoryDbCache: any = null;

// Ensure database file exists
function loadLocalDatabase() {
  if (memoryDbCache) {
    return memoryDbCache;
  }

  const getInitialDb = () => ({
    schools: seedSchools,
    teachers: seedTeachers,
    students: seedStudents,
    reports: seedReports,
    attendanceTeachers: seedAttendanceTeachers,
    attendanceStudents: seedAttendanceStudents,
    inventories: seedInventories,
    districts: seedDistricts,
    villages: seedVillages,
    logs: seedLogs,
    settings: seedSettings,
    sk_guru: []
  });

  if (!fs.existsSync(DATA_FILE)) {
    const initialDb = getInitialDb();
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to write initial db to disk, using memory cache:', e);
    }
    memoryDbCache = initialDb;
    return initialDb;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const db = JSON.parse(raw);
    
    // Deduplicate any collection to prevent duplicate keys in local database
    let updatedLocal = false;
    const collections = ['schools', 'teachers', 'students', 'reports', 'attendanceTeachers', 'attendanceStudents', 'inventories', 'logs', 'sk_guru'];
    for (const key of collections) {
      if (Array.isArray(db[key])) {
        const seen = new Set();
        const deduped = db[key].filter((item: any) => {
          if (!item || !item.id) return true;
          const idStr = String(item.id);
          if (seen.has(idStr)) {
            updatedLocal = true;
            return false;
          }
          seen.add(idStr);
          return true;
        });
        db[key] = deduped;
      }
    }

    if (!db.sk_guru || !Array.isArray(db.sk_guru) || db.sk_guru.length === 0) {
      db.sk_guru = getDynamicSeedSKGuru(db.teachers || [], db.schools || []);
      updatedLocal = true;
    }
    
    // Self-healing: Ensure all seed schools exist in the schools list
    if (db.schools) {
      // Apply credentials and default properties to existing schools in DB if missing
      for (const s of db.schools) {
        let changed = false;
        if (!s.username_petugas) {
          s.username_petugas = getDefaultUsername(s);
          changed = true;
        }
        if (!s.password_petugas || s.password_petugas === s.username_petugas) {
          s.password_petugas = 'petugas';
          changed = true;
        }
        if (!s.status_aktif) {
          s.status_aktif = 'Aktif';
          changed = true;
        }
        if (s.logo_url === undefined) {
          s.logo_url = '';
          changed = true;
        }
        if (s.ranting_aisyiyah === undefined) {
          s.ranting_aisyiyah = '';
          changed = true;
        }
        if (s.ketua_ranting === undefined) {
          s.ketua_ranting = '';
          changed = true;
        }
        if (s.ketua_pda === undefined) {
          s.ketua_pda = '';
          changed = true;
        }
        if (s.ketua_pca === undefined) {
          s.ketua_pca = '';
          changed = true;
        }
        if (changed) {
          updatedLocal = true;
        }
      }

      for (const s of seedSchools) {
        if (!db.schools.some((existingS: any) => String(existingS.id) === String(s.id))) {
          const filledSchool = { ...s };
          if (!filledSchool.username_petugas) {
            filledSchool.username_petugas = getDefaultUsername(filledSchool);
          }
          if (!filledSchool.password_petugas || filledSchool.password_petugas === filledSchool.username_petugas) {
            filledSchool.password_petugas = 'petugas';
          }
          db.schools.push(filledSchool);
          updatedLocal = true;
          
          // Also add teachers of this school if missing
          seedTeachers.filter(t => t.school_id === s.id).forEach(t => {
            if (!db.teachers.some((existingT: any) => existingT.id === t.id)) {
              db.teachers.push(t);
            }
          });
          // Also add students of this school if missing
          seedStudents.filter(st => st.school_id === s.id).forEach(st => {
            if (!db.students.some((existingS: any) => existingS.id === st.id)) {
              db.students.push(st);
            }
          });
        }
      }
    }

    if (updatedLocal) {
      try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
      } catch (e) {
        console.warn('Failed to write updated db to disk:', e);
      }
    }
    
    memoryDbCache = db;
    return db;
  } catch (err) {
    console.error('Error loading database file. Re-initializing...', err);
    const initialDb = getInitialDb();
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to write re-initialized db to disk:', e);
    }
    memoryDbCache = initialDb;
    return initialDb;
  }
}

function saveLocalDatabase(db: any) {
  memoryDbCache = db;
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to save db to disk, using memory cache:', e);
  }
}

function getDirectDriveImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
    // Match /d/[FILE_ID]
    const dMatch = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (dMatch && dMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${dMatch[1]}`;
    }

    // Match id=[FILE_ID] query param
    const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (idMatch && idMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
    }
  }

  return trimmed;
}

// Helper to get effective settings with header overrides for serverless environments (Vercel)
function getEffectiveSettings(req: any, dbSettings: any): any {
  const settings = { ...(dbSettings || {}) };
  if (req && req.headers) {
    const hScriptUrl = req.headers['x-google-apps-script-url'];
    const hSheetsUrl = req.headers['x-google-sheets-url'];
    const hSuperAdminPass = req.headers['x-super-admin-password'];
    const hAdminPass = req.headers['x-admin-password'];
    const hPetugasPass = req.headers['x-petugas-password'];
    const hAppTitle = req.headers['x-app-title'];
    const hAppSubtitle = req.headers['x-app-subtitle'];

    const safeDecode = (val: any) => {
      if (!val) return '';
      try {
        return decodeURIComponent(val).trim();
      } catch (e) {
        return String(val).trim();
      }
    };

    if (hScriptUrl) settings.google_apps_script_url = safeDecode(hScriptUrl);
    if (hSheetsUrl) settings.google_sheets_url = safeDecode(hSheetsUrl);
    if (hSuperAdminPass) settings.super_admin_password = safeDecode(hSuperAdminPass);
    if (hAdminPass) settings.admin_password = safeDecode(hAdminPass);
    if (hPetugasPass) settings.petugas_password = safeDecode(hPetugasPass);
    if (hAppTitle) settings.app_title = safeDecode(hAppTitle);
    if (hAppSubtitle) settings.app_subtitle = safeDecode(hAppSubtitle);
  }
  return settings;
}

// Check if Apps Script is configured
async function proxyToAppsScript(action: string, sheet: string, bodyData?: any, id?: string, req?: any): Promise<any> {
  const db = loadLocalDatabase();
  
  let scriptUrl = '';
  if (req && req.headers && req.headers['x-google-apps-script-url']) {
    try {
      scriptUrl = decodeURIComponent(req.headers['x-google-apps-script-url']).trim();
    } catch (e) {
      scriptUrl = String(req.headers['x-google-apps-script-url']).trim();
    }
  }

  if (!scriptUrl) {
    scriptUrl = db.settings?.google_apps_script_url || 
                process.env.GOOGLE_APPS_SCRIPT_URL || 
                'https://script.google.com/macros/s/AKfycbz4C2cHkY4u6Ige3Ru595DhyhOUn9Fv-t9aI6m1seek-NJjNKXOloY9mLyoh7BT4pJV/exec';
  }

  scriptUrl = (scriptUrl || '').trim();
  
  if (!scriptUrl) {
    return null; // Not configured, fallback to local file database
  }

  try {
    if (action === 'list') {
      const targetUrl = `${scriptUrl}?action=list&sheet=${encodeURIComponent(sheet)}`;
      const response = await fetch(targetUrl);
      const json = await response.json();
      if (json.success) {
        return json.data;
      }
      throw new Error(json.message || 'Apps Script returned failure');
    } else {
      // POST, PUT, DELETE
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          sheet,
          id,
          data: bodyData
        })
      });
      const json = await response.json();
      if (json.success) {
        return json.data || true;
      }
      throw new Error(json.message || 'Apps Script execution failure');
    }
  } catch (err: any) {
    console.log(`[Google Sheets Proxy] Note: Sheet "${sheet}" fallback. Info: ${err.message}`);
    throw err; // Propagate error so frontend knows or we fall back
  }
}

// Logger helper
function writeAuditLog(user: string, action: string, details: string) {
  try {
    const db = loadLocalDatabase();
    const newLog = {
      id: `log-${Date.now()}`,
      user_id: user === 'admin' ? 'user-admin' : 'user-petugas',
      username: user,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    db.logs.unshift(newLog);
    // Limit to 200 logs
    if (db.logs.length > 200) {
      db.logs = db.logs.slice(0, 200);
    }
    saveLocalDatabase(db);
  } catch (e) {
    console.error('Failed to write log:', e);
  }
}

// ----------------------------------------
// API ENDPOINTS
// ----------------------------------------

// Auth Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
  }

  const db = loadLocalDatabase();
  const settings = getEffectiveSettings(req, db.settings);
  const superAdminPass = settings.super_admin_password || 'adminn';
  const adminPass = settings.admin_password || 'admin';
  const petugasPass = settings.petugas_password || 'petugas';

  // Super Admin: admin / superAdminPass
  if (username === 'admin' && password === superAdminPass) {
    const sessionUser = {
      id: 'super-admin-1',
      username: 'admin',
      role: 'SUPER_ADMIN',
      school_id: '',
      name: 'Super Admin',
      email: 'admin.aisyiyah@or.id',
      phone: '081122334455',
      status: 'ACTIVE'
    };
    writeAuditLog('admin', 'LOGIN', 'Super Admin berhasil login');
    return res.json({ success: true, user: sessionUser });
  }

  // Admin: admin / adminPass
  if (username === 'admin' && password === adminPass) {
    const sessionUser = {
      id: 'admin-1',
      username: 'admin',
      role: 'ADMIN',
      school_id: '',
      name: 'Admin Pembina (Read-Only)',
      email: 'pembina.aisyiyah@or.id',
      phone: '081122334466',
      status: 'ACTIVE'
    };
    writeAuditLog('admin', 'LOGIN', 'Admin Read-Only berhasil login');
    return res.json({ success: true, user: sessionUser });
  }

  // Petugas: custom per-school or global fallback
  // 1. Try to find a matching school by custom password or NPSN / email / ID / custom username
  let matchingSchool = db.schools.find((s: any) => {
    const schoolPass = s.password_petugas || petugasPass;
    const customUser = s.username_petugas ? s.username_petugas.trim().toLowerCase() : '';
    const isMatchingUsername = (customUser && username.toLowerCase() === customUser) ||
                               username.toLowerCase() === s.npsn.toLowerCase() || 
                               username.toLowerCase() === s.email.toLowerCase() ||
                               username.toLowerCase() === s.id.toLowerCase();
    return isMatchingUsername && password === schoolPass;
  });

  // 2. If username is exactly 'petugas', try to match any school that has s.password_petugas equal to password
  if (!matchingSchool && username.toLowerCase() === 'petugas') {
    matchingSchool = db.schools.find((s: any) => s.password_petugas && s.password_petugas === password);
  }

  // 3. Fallback: If username is exactly 'petugas' and password is the global default petugasPass
  if (!matchingSchool && username.toLowerCase() === 'petugas' && password === petugasPass) {
    matchingSchool = db.schools.find((s: any) => s.id === 'school-4') || db.schools[0];
  }

  // 4. Try syncing schools from Google Sheets to see if credentials changed there
  if (!matchingSchool) {
    try {
      console.log(`[Login Auth] Local credentials check failed. Syncing from Google Sheets...`);
      const appsScriptSheet = getAppsScriptSheetName('schools');
      const scriptData = await proxyToAppsScript('list', appsScriptSheet, undefined, undefined, req);
      if (Array.isArray(scriptData) && scriptData.length > 0) {
        db.schools = scriptData;
        saveLocalDatabase(db);
        
        // Re-try finding matching school with newly synced data
        matchingSchool = db.schools.find((s: any) => {
          const schoolPass = s.password_petugas || petugasPass;
          const customUser = s.username_petugas ? s.username_petugas.trim().toLowerCase() : '';
          const isMatchingUsername = (customUser && username.toLowerCase() === customUser) ||
                                     username.toLowerCase() === s.npsn.toLowerCase() || 
                                     username.toLowerCase() === s.email.toLowerCase() ||
                                     username.toLowerCase() === s.id.toLowerCase();
          return isMatchingUsername && password === schoolPass;
        });

        if (!matchingSchool && username.toLowerCase() === 'petugas') {
          matchingSchool = db.schools.find((s: any) => s.password_petugas && s.password_petugas === password);
        }
      }
    } catch (sheetErr: any) {
      console.log(`Failed to fetch schools from Google Sheets on login fallback: ${sheetErr.message}`);
    }
  }

  if (matchingSchool) {
    const sessionUser = {
      id: `petugas-${matchingSchool.id}`,
      username: username === 'petugas' ? 'petugas' : matchingSchool.npsn,
      role: 'PETUGAS',
      school_id: matchingSchool.id,
      name: `Petugas ${matchingSchool.name}`,
      email: matchingSchool.email || `${matchingSchool.id}@aisyiyah.or.id`,
      phone: matchingSchool.telepon || '081223344556',
      status: 'ACTIVE'
    };
    writeAuditLog(username, 'LOGIN', `Petugas ${matchingSchool.name} berhasil login`);
    return res.json({ success: true, user: sessionUser });
  }

  return res.status(401).json({ success: false, message: 'Kombinasi username atau password salah' });
});

// Auth schools list for login helper
app.get('/api/auth/schools', async (req, res) => {
  try {
    const db = loadLocalDatabase();

    // Attempt to sync schools from Google Sheets on load so the login helper is always up-to-date
    try {
      const appsScriptSheet = getAppsScriptSheetName('schools');
      const scriptData = await proxyToAppsScript('list', appsScriptSheet, undefined, undefined, req);
      if (Array.isArray(scriptData) && scriptData.length > 0) {
        db.schools = scriptData;
        saveLocalDatabase(db);
      }
    } catch (sheetErr: any) {
      console.log(`Failed to sync schools on /api/auth/schools: ${sheetErr.message}`);
    }

    const publicSchools = (db.schools || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      npsn: s.npsn,
      username_petugas: s.username_petugas || getDefaultUsername(s),
    }));
    return res.json({ success: true, schools: publicSchools });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Generic dynamic sheets middleware/helpers
const VALID_SHEETS = [
  'schools',
  'teachers',
  'students',
  'reports',
  'attendanceTeachers',
  'attendanceStudents',
  'inventories',
  'districts',
  'villages',
  'logs',
  'settings',
  'sk_guru'
];

// Helper to translate to sheet name in spreadsheet
function getAppsScriptSheetName(sheet: string): string {
  const map: Record<string, string> = {
    schools: 'Schools',
    teachers: 'Teachers',
    students: 'Students',
    reports: 'Reports',
    attendanceTeachers: 'AttendanceTeachers',
    attendanceStudents: 'AttendanceStudents',
    inventories: 'Inventories',
    districts: 'Districts',
    villages: 'Villages',
    logs: 'Logs',
    settings: 'Settings',
    sk_guru: 'SK_Guru'
  };
  return map[sheet] || sheet;
}

// GET all list
app.get('/api/sheets/:sheet', async (req, res) => {
  const { sheet } = req.params;
  if (!VALID_SHEETS.includes(sheet)) {
    return res.status(400).json({ success: false, message: 'Sheet tidak valid' });
  }

  try {
    // Try proxying to Google Apps Script first
    const appsScriptSheet = getAppsScriptSheetName(sheet);
    let scriptData = await proxyToAppsScript('list', appsScriptSheet, undefined, undefined, req);
    if (scriptData) {
      // Auto-Sync Seeding: If Google Sheets works and is schools, make sure our 8 sample schools are synced!
      if (sheet === 'schools' && Array.isArray(scriptData)) {
        const db = loadLocalDatabase();
        if (!db.settings) db.settings = {};
        
        const localSchools = db.schools || [];
        let updatedAny = false;

        // Check if any of the local default schools are missing in Google Sheets
        const missingSchools = localSchools.filter(localSch => 
          !scriptData.some((s: any) => String(s.id) === String(localSch.id))
        );

        // Only run seeder if some schools are missing or if spreadsheet schools are completely empty/missing keys
        if (missingSchools.length > 0 || scriptData.length === 0) {
          console.log(`[Auto-Sync] Seeding missing schools to Google Sheets (Missing count: ${missingSchools.length})...`);
          
          for (const localSch of localSchools) {
            const found = scriptData.find((s: any) => String(s.id) === String(localSch.id));
            if (!found) {
              console.log(`[Auto-Sync] Seeding missing school: ${localSch.name} (${localSch.id})`);
              try {
                await proxyToAppsScript('create', 'Schools', localSch, undefined, req);
                scriptData.push(localSch);
                updatedAny = true;
              } catch (syncErr: any) {
                console.error(`Failed to seed school ${localSch.id}:`, syncErr.message);
              }
            }
          }

          // Mark as seeded in settings to prevent unnecessary checking
          db.settings.schools_seeded_to_sheets = true;
          saveLocalDatabase(db);
          console.log('[Auto-Sync] Finished seeding missing schools.');
        }
      }

      // Deduplicate scriptData to prevent any duplicate key errors on the client due to spreadsheet duplicates
      if (Array.isArray(scriptData)) {
        const seenIds = new Set();
        scriptData = scriptData.filter((item: any) => {
          if (!item || !item.id) return true;
          const idStr = String(item.id);
          if (seenIds.has(idStr)) {
            return false;
          }
          seenIds.add(idStr);
          return true;
        });

        // Normalize schools credentials if loading schools from Google Sheets
        if (sheet === 'schools') {
          scriptData = scriptData.map((s: any) => {
            const username = s.username_petugas || getDefaultUsername(s);
            const password = s.password_petugas || 'petugas';
            return {
              ...s,
              username_petugas: username,
              password_petugas: password,
            };
          });
        }

        // Normalize teachers sheet if loading from Google Sheets
        if (sheet === 'teachers') {
          scriptData = scriptData.map((item: any) => {
            const possibleHonorKeys = [
              'Honorarium Bulanan (Rp)',
              'Honor Bulanan (Rp)',
              'Honorarium Bulanan',
              'Honor Bulanan',
              'Honor (Rp)',
              'honor'
            ];
            
            let honorVal = undefined;
            for (const key of possibleHonorKeys) {
              if (item[key] !== undefined && item[key] !== null) {
                honorVal = item[key];
                break;
              }
            }

            let parsedHonor = 0;
            if (honorVal !== undefined && honorVal !== null) {
              if (typeof honorVal === 'number') {
                parsedHonor = honorVal;
              } else {
                const str = String(honorVal).trim();
                const digits = str.replace(/[^0-9]/g, '');
                parsedHonor = parseInt(digits, 10) || 0;
              }
            }

            return {
              ...item,
              honor: parsedHonor
            };
          });
        }

        // Normalize reports sheet if loading from Google Sheets
        if (sheet === 'reports') {
          scriptData = scriptData.map((item: any) => {
            let status = item.status || item.status_laporan || 'Submitted';
            if (status.toLowerCase() === 'approved') status = 'Approved';
            if (status.toLowerCase() === 'submitted') status = 'Submitted';
            if (status.toLowerCase() === 'rejected') status = 'Rejected';
            if (status.toLowerCase() === 'draft') status = 'Draft';

            return {
              ...item,
              tahun_pelajaran: item.tahun_pelajaran || item.tahun || '2025/2026',
              semester: item.semester || 'Ganjil',
              hari_belajar: item.hari_belajar !== undefined ? Number(item.hari_belajar) : 22,
              status_gedung: item.status_gedung || 'Milik Sendiri',
              jumlah_ruangan: item.jumlah_ruangan !== undefined ? Number(item.jumlah_ruangan) : 4,
              status: status,
              notes: item.notes || item.catatan || '',
            };
          });
        }
      }

      // Save Google Sheets data to local database for local sync/fallback
      if (Array.isArray(scriptData) && scriptData.length > 0) {
        const db = loadLocalDatabase();
        db[sheet] = scriptData;
        saveLocalDatabase(db);
      }

      return res.json({ success: true, source: 'google_sheets', data: scriptData });
    }
  } catch (err: any) {
    console.log(`Fallback to local database for GET /api/sheets/${sheet} due to: ${err.message}`);
  }

  // Fallback to local database
  const db = loadLocalDatabase();
  let localData = db[sheet] || [];
  if (Array.isArray(localData)) {
    const seenIds = new Set();
    localData = localData.filter((item: any) => {
      if (!item || !item.id) return true;
      const idStr = String(item.id);
      if (seenIds.has(idStr)) {
        return false;
      }
      seenIds.add(idStr);
      return true;
    });

    // Normalize schools credentials if loading schools from local database
    if (sheet === 'schools') {
      localData = localData.map((s: any) => {
        const username = s.username_petugas || getDefaultUsername(s);
        const password = s.password_petugas || 'petugas';
        return {
          ...s,
          username_petugas: username,
          password_petugas: password,
        };
      });
    }

    // Normalize teachers if loading from local database fallback
    if (sheet === 'teachers') {
      localData = localData.map((item: any) => {
        const possibleHonorKeys = [
          'Honorarium Bulanan (Rp)',
          'Honor Bulanan (Rp)',
          'Honorarium Bulanan',
          'Honor Bulanan',
          'Honor (Rp)',
          'honor'
        ];
        
        let honorVal = undefined;
        for (const key of possibleHonorKeys) {
          if (item[key] !== undefined && item[key] !== null) {
            honorVal = item[key];
            break;
          }
        }

        let parsedHonor = 0;
        if (honorVal !== undefined && honorVal !== null) {
          if (typeof honorVal === 'number') {
            parsedHonor = honorVal;
          } else {
            const str = String(honorVal).trim();
            const digits = str.replace(/[^0-9]/g, '');
            parsedHonor = parseInt(digits, 10) || 0;
          }
        }

        return {
          ...item,
          honor: parsedHonor
        };
      });
    }

    // Normalize reports if loading from local database fallback
    if (sheet === 'reports') {
      localData = localData.map((item: any) => {
        let status = item.status || item.status_laporan || 'Submitted';
        if (status.toLowerCase() === 'approved') status = 'Approved';
        if (status.toLowerCase() === 'submitted') status = 'Submitted';
        if (status.toLowerCase() === 'rejected') status = 'Rejected';
        if (status.toLowerCase() === 'draft') status = 'Draft';

        return {
          ...item,
          tahun_pelajaran: item.tahun_pelajaran || item.tahun || '2025/2026',
          semester: item.semester || 'Ganjil',
          hari_belajar: item.hari_belajar !== undefined ? Number(item.hari_belajar) : 22,
          status_gedung: item.status_gedung || 'Milik Sendiri',
          jumlah_ruangan: item.jumlah_ruangan !== undefined ? Number(item.jumlah_ruangan) : 4,
          status: status,
          notes: item.notes || item.catatan || '',
        };
      });
    }
  }
  return res.json({ success: true, source: 'local_database', data: localData });
});

// POST item (create)
app.post('/api/sheets/:sheet', async (req, res) => {
  const { sheet } = req.params;
  const bodyData = req.body;

  if (!VALID_SHEETS.includes(sheet)) {
    return res.status(400).json({ success: false, message: 'Sheet tidak valid' });
  }

  // Generate ID if not provided
  if (!bodyData.id) {
    bodyData.id = `${sheet.slice(0, 3)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
  bodyData.created_at = new Date().toISOString();
  bodyData.updated_at = new Date().toISOString();

  // Convert Google Drive image links to direct image URLs
  if (bodyData.foto_url) {
    bodyData.foto_url = getDirectDriveImageUrl(bodyData.foto_url);
  }
  if (bodyData.logo_url) {
    bodyData.logo_url = getDirectDriveImageUrl(bodyData.logo_url);
  }

  // Normalize report fields for Google Sheets compatibility
  if (sheet === 'reports') {
    bodyData.tahun = bodyData.tahun_pelajaran || bodyData.tahun || '2026';
    bodyData.status_laporan = bodyData.status || bodyData.status_laporan || 'Submitted';
    bodyData.catatan = bodyData.notes || bodyData.catatan || '';
  }

  // Normalize teacher honorarium fields for Google Sheets compatibility
  if (sheet === 'teachers') {
    const honorVal = bodyData.honor !== undefined ? bodyData.honor : 1500000;
    bodyData['Honorarium Bulanan (Rp)'] = honorVal;
    bodyData['Honor Bulanan'] = honorVal;
    bodyData['Honor Bulanan (Rp)'] = honorVal;
    bodyData['Honorarium Bulanan'] = honorVal;
    bodyData['honor'] = honorVal;
  }

  // 1. Always save to local database first to ensure mirroring/fallback completeness
  const db = loadLocalDatabase();
  if (!db[sheet]) db[sheet] = [];
  db[sheet].push(bodyData);
  saveLocalDatabase(db);

  // 2. Try Apps Script proxy to synchronize
  try {
    const appsScriptSheet = getAppsScriptSheetName(sheet);
    const scriptResult = await proxyToAppsScript('create', appsScriptSheet, bodyData, undefined, req);
    if (scriptResult) {
      writeAuditLog('user', 'CREATE_RECORD', `Menambah data di sheet ${sheet}: ${bodyData.id} (Disinkronkan ke Google Sheets)`);
      return res.json({ success: true, source: 'google_sheets', data: typeof scriptResult === 'object' ? scriptResult : bodyData });
    }
  } catch (err: any) {
    console.log(`Sync to Google Sheets failed for POST /api/sheets/${sheet}, saved locally. Info: ${err.message}`);
  }

  writeAuditLog('user', 'CREATE_RECORD', `Menambah data di local database ${sheet}: ${bodyData.id} (Mode Cadangan)`);
  return res.json({ success: true, source: 'local_database', data: bodyData });
});

// POST items batch (import)
app.post('/api/sheets-import/:sheet', async (req, res) => {
  const { sheet } = req.params;
  const items = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ success: false, message: 'Data yang dikirim harus berupa array' });
  }

  if (!VALID_SHEETS.includes(sheet)) {
    return res.status(400).json({ success: false, message: 'Sheet tidak valid' });
  }

  const db = loadLocalDatabase();
  if (!db[sheet]) db[sheet] = [];

  const processedItems = [];
  for (let i = 0; i < items.length; i++) {
    const item = { ...items[i] };
    if (!item.id) {
      item.id = `${sheet.slice(0, 3)}-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`;
    }
    item.created_at = new Date().toISOString();
    item.updated_at = new Date().toISOString();

    if (sheet === 'teachers') {
      const honorVal = item.honor !== undefined ? item.honor : 1500000;
      item['Honorarium Bulanan (Rp)'] = honorVal;
      item['Honor Bulanan'] = honorVal;
      item['Honor Bulanan (Rp)'] = honorVal;
      item['Honorarium Bulanan'] = honorVal;
      item['honor'] = honorVal;
    }

    processedItems.push(item);
  }

  // 1. Save to local database
  db[sheet].push(...processedItems);
  saveLocalDatabase(db);

  // 2. Try Apps Script proxy to synchronize
  let syncCount = 0;
  const syncErrors = [];
  try {
    const appsScriptSheet = getAppsScriptSheetName(sheet);
    for (const item of processedItems) {
      try {
        await proxyToAppsScript('create', appsScriptSheet, item, undefined, req);
        syncCount++;
      } catch (syncErr: any) {
        syncErrors.push(`ID ${item.id}: ${syncErr.message}`);
      }
    }
    writeAuditLog('user', 'IMPORT_RECORDS', `Mengimpor ${processedItems.length} data di sheet ${sheet} (Berhasil disinkronkan: ${syncCount}/${processedItems.length})`);
  } catch (err: any) {
    console.log(`Sync to Google Sheets failed/partial for import of ${sheet}. Info: ${err.message}`);
  }

  return res.json({
    success: true,
    message: `Berhasil mengimpor ${processedItems.length} data.`,
    synced_count: syncCount,
    sync_errors: syncErrors,
    data: processedItems
  });
});

// PUT item (update)
app.put('/api/sheets/:sheet/:id', async (req, res) => {
  const { sheet, id } = req.params;
  const bodyData = req.body;

  if (!VALID_SHEETS.includes(sheet)) {
    return res.status(400).json({ success: false, message: 'Sheet tidak valid' });
  }

  bodyData.updated_at = new Date().toISOString();

  // Convert Google Drive image links to direct image URLs
  if (bodyData.foto_url) {
    bodyData.foto_url = getDirectDriveImageUrl(bodyData.foto_url);
  }
  if (bodyData.logo_url) {
    bodyData.logo_url = getDirectDriveImageUrl(bodyData.logo_url);
  }

  // Normalize report fields for Google Sheets compatibility
  if (sheet === 'reports') {
    bodyData.tahun = bodyData.tahun_pelajaran || bodyData.tahun;
    bodyData.status_laporan = bodyData.status || bodyData.status_laporan;
    bodyData.catatan = bodyData.notes || bodyData.catatan;
  }

  // Normalize teacher honorarium fields for Google Sheets compatibility
  if (sheet === 'teachers') {
    if (bodyData.honor !== undefined) {
      bodyData['Honorarium Bulanan (Rp)'] = bodyData.honor;
      bodyData['Honor Bulanan'] = bodyData.honor;
      bodyData['Honor Bulanan (Rp)'] = bodyData.honor;
      bodyData['Honorarium Bulanan'] = bodyData.honor;
      bodyData['honor'] = bodyData.honor;
    }
  }

  // 1. Always update local database first to ensure mirroring/fallback completeness
  const db = loadLocalDatabase();
  const index = db[sheet].findIndex((x: any) => String(x.id) === String(id));
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
  }

  db[sheet][index] = { ...db[sheet][index], ...bodyData, id }; // retain original ID
  saveLocalDatabase(db);
  const updatedItem = db[sheet][index];

  // 2. Try Apps Script proxy to synchronize
  try {
    const appsScriptSheet = getAppsScriptSheetName(sheet);
    const scriptResult = await proxyToAppsScript('update', appsScriptSheet, bodyData, id, req);
    if (scriptResult) {
      writeAuditLog('user', 'UPDATE_RECORD', `Mengubah data di sheet ${sheet}: ${id} (Disinkronkan ke Google Sheets)`);
      return res.json({ success: true, source: 'google_sheets', data: typeof scriptResult === 'object' ? scriptResult : updatedItem });
    }
  } catch (err: any) {
    console.log(`Sync to Google Sheets failed for PUT /api/sheets/${sheet}/${id}, updated locally. Info: ${err.message}`);
  }

  writeAuditLog('user', 'UPDATE_RECORD', `Mengubah data di local database ${sheet}: ${id} (Mode Cadangan)`);
  return res.json({ success: true, source: 'local_database', data: updatedItem });
});

// DELETE item
app.delete('/api/sheets/:sheet/:id', async (req, res) => {
  const { sheet, id } = req.params;

  if (!VALID_SHEETS.includes(sheet)) {
    return res.status(400).json({ success: false, message: 'Sheet tidak valid' });
  }

  // 1. Always update local database first to ensure mirroring/fallback completeness
  const db = loadLocalDatabase();
  const index = db[sheet].findIndex((x: any) => String(x.id) === String(id));
  let deletedLocally = false;

  if (index !== -1) {
    db[sheet].splice(index, 1);
    
    // Self-healing / cascade delete: If deleting a report, also delete all linked records
    if (sheet === 'reports') {
      const attTeachers = db.attendanceTeachers || [];
      db.attendanceTeachers = attTeachers.filter((x: any) => String(x.report_id) !== String(id));

      const attStudents = db.attendanceStudents || [];
      db.attendanceStudents = attStudents.filter((x: any) => String(x.report_id) !== String(id));

      const invs = db.inventories || [];
      db.inventories = invs.filter((x: any) => String(x.report_id) !== String(id));
    }

    saveLocalDatabase(db);
    deletedLocally = true;
  }

  // 2. Try Apps Script proxy to synchronize
  let deletedRemotely = false;
  try {
    const appsScriptSheet = getAppsScriptSheetName(sheet);
    const scriptResult = await proxyToAppsScript('delete', appsScriptSheet, undefined, id, req);
    if (scriptResult) {
      deletedRemotely = true;
    }
  } catch (err: any) {
    console.log(`Sync to Google Sheets failed for DELETE /api/sheets/${sheet}/${id}. Info: ${err.message}`);
  }

  if (deletedLocally || deletedRemotely) {
    writeAuditLog('user', 'DELETE_RECORD', `Menghapus data ${sheet}: ${id} (Lokal: ${deletedLocally}, Remot: ${deletedRemotely})`);
    return res.json({ success: true, source: deletedRemotely ? 'google_sheets' : 'local_database' });
  }

  // Always return success on DELETE to prevent frontend from getting stuck
  return res.json({ success: true, message: 'Data berhasil dihapus (tidak ditemukan)' });
});

// Settings operations
app.get('/api/settings', (req, res) => {
  const db = loadLocalDatabase();
  const settings = getEffectiveSettings(req, db.settings);
  res.json({ success: true, data: settings });
});

app.post('/api/settings', (req, res) => {
  const db = loadLocalDatabase();
  db.settings = { ...db.settings, ...req.body };
  saveLocalDatabase(db);
  writeAuditLog('admin', 'UPDATE_SETTINGS', 'Mengubah pengaturan sistem');
  res.json({ success: true, data: db.settings });
});

app.post('/api/settings/config', (req, res) => {
  const { scriptUrl } = req.body;
  const db = loadLocalDatabase();
  if (!db.settings) {
    db.settings = {
      google_sheets_url: 'https://docs.google.com/spreadsheets/d/1Bqgss06C6au6HfrLfF-6ywDftB7tOpN986b6QNh7ncI/edit',
      google_apps_script_url: '',
      backup_interval: 'Bulanan',
      allow_petugas_edit_after_submit: false
    };
  }
  db.settings.google_apps_script_url = scriptUrl;
  saveLocalDatabase(db);
  writeAuditLog('admin', 'UPDATE_SETTINGS', `Mengubah Google Apps Script URL ke: ${scriptUrl}`);
  res.json({ success: true });
});

// Google Sheets Auto-Initialization & Seed API
app.post('/api/sheets-setup/initialize', async (req, res) => {
  const { accessToken, spreadsheetId } = req.body;
  if (!accessToken || !spreadsheetId) {
    return res.status(400).json({ success: false, message: 'accessToken dan spreadsheetId wajib diisi.' });
  }

  try {
    // 1. Get existing sheets
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`;
    const sheetsRes = await fetch(sheetsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!sheetsRes.ok) {
      const errorText = await sheetsRes.text();
      return res.status(sheetsRes.status).json({ success: false, message: `Gagal mengakses spreadsheet: ${errorText}` });
    }

    const sheetsData = await sheetsRes.json() as any;
    const existingTitles = (sheetsData.sheets || []).map((s: any) => s.properties.title);

    // 2. Load our local database so we have the seed data
    const db = loadLocalDatabase();

    const SHEET_NAME_MAP: Record<string, string> = {
      schools: 'Schools',
      teachers: 'Teachers',
      students: 'Students',
      reports: 'Reports',
      attendanceTeachers: 'AttendanceTeachers',
      attendanceStudents: 'AttendanceStudents',
      inventories: 'Inventories',
      districts: 'Districts',
      villages: 'Villages',
      logs: 'Logs',
      settings: 'Settings'
    };

    // 3. Create missing sheets
    const createRequests: any[] = [];
    for (const [dbKey, sheetTitle] of Object.entries(SHEET_NAME_MAP)) {
      if (!existingTitles.includes(sheetTitle)) {
        createRequests.push({
          addSheet: {
            properties: { title: sheetTitle }
          }
        });
      }
    }

    if (createRequests.length > 0) {
      const batchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests: createRequests })
      });
      if (!batchRes.ok) {
        const err = await batchRes.text();
        console.error('Batch update failed:', err);
      }
    }

    // 4. Seed/overwrite each sheet with sample data
    const SHEET_HEADERS_MAP: Record<string, string[]> = {
      schools: ["id", "name", "npsn", "nsm", "status", "jenjang", "alamat", "kelurahan", "kecamatan", "kabupaten", "provinsi", "kode_pos", "telepon", "email", "website", "kepala_sekolah", "nip_kepala", "akreditasi", "status_tanah", "status_gedung", "luas_tanah", "luas_bangunan", "jumlah_ruang", "jumlah_toilet", "tahun_berdiri", "tahun_operasional", "latitude", "longitude", "foto_url", "logo_url", "status_aktif", "password_petugas", "username_petugas", "ranting_aisyiyah", "ketua_ranting", "ketua_pda", "ketua_pca", "created_at", "updated_at"],
      teachers: ["id", "school_id", "nama", "nik", "nip", "tempat_lahir", "tanggal_lahir", "jenis_kelamin", "alamat", "no_hp", "email", "pendidikan", "jurusan", "tmt", "status_guru", "jabatan", "golongan", "honor", "gty", "gtt", "pns", "pppk", "foto_url", "tahun_pelajaran", "semester", "created_at", "updated_at"],
      students: ["id", "school_id", "nama", "nik", "nisn", "tempat_lahir", "tanggal_lahir", "jenis_kelamin", "nama_ayah", "nama_ibu", "alamat", "rt", "rw", "kelurahan", "kecamatan", "kabupaten", "provinsi", "agama", "anak_ke", "jumlah_saudara", "status_aktif", "tahun_masuk", "tahun_pelajaran", "semester", "created_at", "updated_at"],
      reports: ["id", "school_id", "bulan", "tahun", "tahun_pelajaran", "semester", "hari_belajar", "status_gedung", "jumlah_ruangan", "status", "notes", "jumlah_guru", "jumlah_siswa", "persentase_kehadiran_guru", "persentase_kehadiran_siswa", "status_laporan", "catatan", "created_at", "updated_at"],
      attendanceTeachers: ["id", "school_id", "tanggal", "jumlah_hadir", "jumlah_izin", "jumlah_sakit", "jumlah_alfa", "created_at", "updated_at"],
      attendanceStudents: ["id", "school_id", "tanggal", "jumlah_hadir", "jumlah_izin", "jumlah_sakit", "jumlah_alfa", "created_at", "updated_at"],
      inventories: ["id", "school_id", "nama_barang", "jumlah", "kondisi_baik", "kondisi_rusak_ringan", "kondisi_rusak_berat", "sumber_dana", "created_at", "updated_at"],
      districts: ["id", "name", "created_at", "updated_at"],
      villages: ["id", "district_id", "name", "created_at", "updated_at"],
      logs: ["id", "user_id", "username", "action", "details", "timestamp"],
      settings: ["id", "google_sheets_url", "google_apps_script_url", "backup_interval", "allow_petugas_edit_after_submit", "app_title", "app_subtitle", "super_admin_password", "admin_password", "petugas_password", "created_at", "updated_at"]
    };

    for (const [dbKey, sheetTitle] of Object.entries(SHEET_NAME_MAP)) {
      let items = db[dbKey];
      if (!items) continue;

      // Handle single object in settings
      if (dbKey === 'settings') {
        items = [getEffectiveSettings(req, db.settings)];
      }

      const headers = SHEET_HEADERS_MAP[dbKey] || ['id', 'created_at', 'updated_at'];

      if (!Array.isArray(items) || items.length === 0) {
        await writeSheetValues(accessToken, spreadsheetId, sheetTitle, [headers]);
        continue;
      }
      
      // Convert items to row arrays aligned to the strict headers list
      const rows = items.map((item: any) => {
        return headers.map(header => {
          let val = item[header];
          // Provide defaults for credentials & status if not present in loaded item to ensure complete data
          if (dbKey === 'schools' && (val === undefined || val === null)) {
            if (header === 'username_petugas') val = getDefaultUsername(item);
            if (header === 'password_petugas') val = 'petugas';
            if (header === 'status_aktif') val = 'Aktif';
          }
          if (val === undefined || val === null) return '';
          if (typeof val === 'object') return JSON.stringify(val);
          return val;
        });
      });

      // Write values (including header row)
      await writeSheetValues(accessToken, spreadsheetId, sheetTitle, [headers, ...rows]);
    }

    // Save Spreadsheet URL and Google Apps Script URL alignment in db
    const settings = getEffectiveSettings(req, db.settings);
    const scriptUrl = settings?.google_apps_script_url || process.env.GOOGLE_APPS_SCRIPT_URL || '';
    db.settings = {
      ...db.settings,
      ...settings,
      google_sheets_url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      google_apps_script_url: scriptUrl
    };
    saveLocalDatabase(db);
    writeAuditLog('admin', 'INITIALIZE_SHEETS', 'Inisialisasi ulang seluruh sheet dan data contoh pada Google Spreadsheet');

    return res.json({ success: true, message: 'Google Spreadsheet berhasil diinisialisasi dengan data contoh!' });

  } catch (err: any) {
    console.error('Error initializing sheets:', err);
    return res.status(500).json({ success: false, message: `Gagal menginisialisasi spreadsheet: ${err.message}` });
  }
});

// Helper function to write sheet values
async function writeSheetValues(accessToken: string, spreadsheetId: string, sheetTitle: string, values: any[][]) {
  try {
    // Clear sheet values first
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    // Write new values
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A1?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: `${sheetTitle}!A1`,
        majorDimension: 'ROWS',
        values: values
      })
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Failed to write to sheet ${sheetTitle}:`, text);
    }
  } catch (err: any) {
    console.error(`Error in writeSheetValues for ${sheetTitle}:`, err.message);
  }
}

// Backup operations: Export JSON
app.get('/api/backup/export', (req, res) => {
  const db = loadLocalDatabase();
  writeAuditLog('admin', 'EXPORT_BACKUP', 'Mengekspor backup JSON database');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=backup-aisyiyah-tk.json');
  res.send(JSON.stringify(db, null, 2));
});

// Backup operations: Import JSON
app.post('/api/backup/import', (req, res) => {
  try {
    const importData = req.body;
    if (!importData.schools || !importData.teachers || !importData.students) {
      return res.status(400).json({ success: false, message: 'Format data backup tidak valid. Harus mengandung database utama.' });
    }
    saveLocalDatabase(importData);
    writeAuditLog('admin', 'IMPORT_BACKUP', 'Melakukan pemulihan (restore) database dari JSON');
    res.json({ success: true, message: 'Database berhasil dipulihkan' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------
// VITE CLIENT MIDDLEWARE & ROUTING
// ----------------------------------------

async function syncDatabaseOnStartup() {
  console.log('[Startup Sync] Initializing background sync with Google Sheets...');
  const db = loadLocalDatabase();
  const scriptUrl = db.settings?.google_apps_script_url || process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!scriptUrl) {
    console.log('[Startup Sync] Google Apps Script URL not configured in settings, skipping sync.');
    return;
  }

  const sheetsToSync = ['schools', 'teachers', 'students', 'reports'];
  for (const sheet of sheetsToSync) {
    try {
      const appsScriptSheet = getAppsScriptSheetName(sheet);
      console.log(`[Startup Sync] Syncing sheet "${sheet}" (${appsScriptSheet}) from Google Sheets...`);
      const scriptData = await proxyToAppsScript('list', appsScriptSheet, undefined, undefined, undefined);
      if (Array.isArray(scriptData) && scriptData.length > 0) {
        // Normalize
        let normalized = scriptData.filter((item: any) => item && item.id);
        
        // Deduplicate
        const seenIds = new Set();
        normalized = normalized.filter((item: any) => {
          const idStr = String(item.id);
          if (seenIds.has(idStr)) return false;
          seenIds.add(idStr);
          return true;
        });

        if (sheet === 'schools') {
          normalized = normalized.map((s: any) => {
            const username = s.username_petugas || getDefaultUsername(s);
            const password = s.password_petugas || 'petugas';
            return {
              ...s,
              username_petugas: username,
              password_petugas: password,
            };
          });
        }

        if (sheet === 'teachers') {
          normalized = normalized.map((item: any) => {
            const possibleHonorKeys = [
              'Honorarium Bulanan (Rp)',
              'Honor Bulanan (Rp)',
              'Honorarium Bulanan',
              'Honor Bulanan',
              'Honor (Rp)',
              'honor'
            ];
            let honorVal = undefined;
            for (const key of possibleHonorKeys) {
              if (item[key] !== undefined && item[key] !== null) {
                honorVal = item[key];
                break;
              }
            }
            let parsedHonor = 0;
            if (honorVal !== undefined && honorVal !== null) {
              if (typeof honorVal === 'number') {
                parsedHonor = honorVal;
              } else {
                const str = String(honorVal).trim();
                const digits = str.replace(/[^0-9]/g, '');
                parsedHonor = parseInt(digits, 10) || 0;
              }
            }
            return { ...item, honor: parsedHonor };
          });
        }

        if (sheet === 'reports') {
          normalized = normalized.map((item: any) => {
            let status = item.status || item.status_laporan || 'Submitted';
            if (status.toLowerCase() === 'approved') status = 'Approved';
            if (status.toLowerCase() === 'submitted') status = 'Submitted';
            if (status.toLowerCase() === 'rejected') status = 'Rejected';
            if (status.toLowerCase() === 'draft') status = 'Draft';

            return {
              ...item,
              tahun_pelajaran: item.tahun_pelajaran || item.tahun || '2025/2026',
              semester: item.semester || 'Ganjil',
              hari_belajar: item.hari_belajar !== undefined ? Number(item.hari_belajar) : 22,
              status_gedung: item.status_gedung || 'Milik Sendiri',
              jumlah_ruangan: item.jumlah_ruangan !== undefined ? Number(item.jumlah_ruangan) : 4,
              status: status,
              notes: item.notes || item.catatan || '',
            };
          });
        }

        // Save
        const currentDb = loadLocalDatabase();
        currentDb[sheet] = normalized;
        saveLocalDatabase(currentDb);
        console.log(`[Startup Sync] Successfully synced ${normalized.length} records for "${sheet}".`);
      }
    } catch (err: any) {
      console.error(`[Startup Sync] Failed to sync "${sheet}":`, err.message);
    }
  }
  console.log('[Startup Sync] Finished background database sync.');
}

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Running at http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    // Run background sync
    syncDatabaseOnStartup().catch(err => {
      console.error('[Startup Sync] Error running background sync:', err);
    });
  });
}

if (!process.env.VERCEL) {
  start();
}

export default app;
