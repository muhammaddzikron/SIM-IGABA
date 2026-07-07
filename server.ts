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
    settings: seedSettings
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
    const collections = ['schools', 'teachers', 'students', 'reports', 'attendanceTeachers', 'attendanceStudents', 'inventories', 'logs'];
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
    
    // Self-healing: Ensure all seed schools exist in the schools list
    if (db.schools) {
      const getDefaultUsername = (school: any): string => {
        if (school.id === 'school-1') return 'tkabagergunung';
        if (school.id === 'school-2') return 'tkababarenglor';
        if (school.id === 'school-3') return 'tkababramen';
        if (school.id === 'school-4') return 'tkabagunungan';

        let name = (school.name || '').toLowerCase();
        if (name.includes('gergunung')) return 'tkabagergunung';
        if (name.includes('bareng') || name.includes('lor')) return 'tkababarenglor';
        if (name.includes('bramen')) return 'tkababramen';
        if (name.includes('gunungan')) return 'tkabagunungan';

        let cleaned = name
          .replace(/aisyiyah/g, '')
          .replace(/bustanul/g, '')
          .replace(/athfal/g, '')
          .replace(/aba/g, '')
          .replace(/[^a-z0-9]/g, '');
        if (!cleaned.startsWith('tk')) {
          cleaned = 'tkaba' + cleaned;
        } else if (cleaned.startsWith('tk') && !cleaned.startsWith('tkaba')) {
          cleaned = cleaned.replace(/^tk/, 'tkaba');
        }
        return cleaned || 'tkabapetugas';
      };

      // Apply credentials to existing schools in DB if missing
      for (const s of db.schools) {
        let changed = false;
        if (!s.username_petugas) {
          s.username_petugas = getDefaultUsername(s);
          changed = true;
        }
        if (!s.password_petugas) {
          s.password_petugas = s.username_petugas;
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
          if (!filledSchool.password_petugas) {
            filledSchool.password_petugas = filledSchool.username_petugas;
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
app.post('/api/auth/login', (req, res) => {
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
app.get('/api/auth/schools', (req, res) => {
  try {
    const db = loadLocalDatabase();
    const publicSchools = (db.schools || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      npsn: s.npsn,
      username_petugas: s.username_petugas || s.npsn || 'petugas',
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
  'settings'
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
    settings: 'Settings'
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

        // Only run seeder if not seeded yet, or if spreadsheet schools are completely empty/missing keys, or some schools are missing
        if (missingSchools.length > 0 || !db.settings.schools_seeded_to_sheets || scriptData.length === 0) {
          console.log(`[Auto-Sync] Seeding or healing schools to Google Sheets (Missing count: ${missingSchools.length})...`);
          
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
            } else {
              // Check if name or banner needs update to ensure sample completeness
              const needsUpdate = found.name !== localSch.name || 
                                  (localSch.foto_url && found.foto_url !== localSch.foto_url);
              if (needsUpdate) {
                console.log(`[Auto-Sync] Syncing name/banner for school: ${localSch.name} (${localSch.id})`);
                try {
                  const merged = { ...found, ...localSch };
                  await proxyToAppsScript('update', 'Schools', merged, localSch.id, req);
                  const idx = scriptData.findIndex((s: any) => String(s.id) === String(localSch.id));
                  if (idx !== -1) {
                    scriptData[idx] = merged;
                  }
                  updatedAny = true;
                } catch (syncErr: any) {
                  console.error(`Failed to sync update for school ${localSch.id}:`, syncErr.message);
                }
              }
            }
          }

          // Mark as seeded so we don't spam requests on subsequent loads
          db.settings.schools_seeded_to_sheets = true;
          saveLocalDatabase(db);
          console.log('[Auto-Sync] Finished seeding/healing 8 sample schools.');
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

  // Normalize report fields for Google Sheets compatibility
  if (sheet === 'reports') {
    bodyData.tahun = bodyData.tahun_pelajaran || bodyData.tahun || '2026';
    bodyData.status_laporan = bodyData.status || bodyData.status_laporan || 'Submitted';
    bodyData.catatan = bodyData.notes || bodyData.catatan || '';
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

  // Normalize report fields for Google Sheets compatibility
  if (sheet === 'reports') {
    bodyData.tahun = bodyData.tahun_pelajaran || bodyData.tahun;
    bodyData.status_laporan = bodyData.status || bodyData.status_laporan;
    bodyData.catatan = bodyData.notes || bodyData.catatan;
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
    for (const [dbKey, sheetTitle] of Object.entries(SHEET_NAME_MAP)) {
      let items = db[dbKey];
      if (!items) continue;

      // Handle single object in settings
      if (dbKey === 'settings') {
        items = [getEffectiveSettings(req, db.settings)];
      }

      if (!Array.isArray(items) || items.length === 0) {
        // If empty, just write default header
        const headers = ['id', 'created_at', 'updated_at'];
        await writeSheetValues(accessToken, spreadsheetId, sheetTitle, [headers]);
        continue;
      }

      // Collect all keys as headers
      const headers = Array.from(new Set(items.flatMap((item: any) => Object.keys(item))));
      
      // Convert items to row arrays
      const rows = items.map((item: any) => {
        return headers.map(header => {
          const val = item[header];
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
  });
}

if (!process.env.VERCEL) {
  start();
}

export default app;
