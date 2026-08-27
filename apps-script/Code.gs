/**
 * KCG Health OSM — Staging backend
 * ใช้กับ Google Sheets + Google Drive ตาม PRD. ห้ามใส่ Secret ใน repository.
 * Script Properties ที่ต้องกำหนดก่อน Deploy:
 * SPREADSHEET_ID, DRIVE_ROOT_ID, GOOGLE_CLIENT_ID, ALLOWED_DOMAIN (ถ้ามี)
 */

const API_VERSION = 'v1';
const TZ = 'Asia/Bangkok';
const SHEETS = {
  CONFIG: 'Config', USERS: 'Users', AREAS: 'Areas', HOUSEHOLDS: 'Households',
  PERSONS: 'Persons', TASKS: 'Tasks', VISITS: 'Visits', RISK_FLAGS: 'RiskFlags',
  AUDIT_LOG: 'AuditLog', EXPORT_JOBS: 'ExportJobs', ATTACHMENTS: 'Attachments',
  LOOKUPS: 'Lookups'
};

function doGet() {
  return json_({ ok: true, apiVersion: API_VERSION, service: 'KCG Health OSM', environment: 'staging', message: 'Use POST with JSON body.' });
}

function doPost(e) {
  const requestId = Utilities.getUuid();
  try {
    const body = parseBody_(e);
    const action = String(body.action || 'health');
    const result = route_(action, body, requestId);
    return json_({ ok: true, requestId, apiVersion: API_VERSION, data: result });
  } catch (error) {
    console.error(JSON.stringify({ requestId, error: String(error), stack: error.stack }));
    return json_({ ok: false, requestId, apiVersion: API_VERSION, error: publicError_(error) });
  }
}

function route_(action, body, requestId) {
  switch (action) {
    case 'health': return health_();
    case 'public.home': return publicHome_();
    case 'auth.google': return authGoogle_(body, requestId);
    case 'auth.logout': return logout_(body, requestId);
    case 'dashboard': return dashboard_(body, requestId);
    case 'tasks.list': return tasksList_(body, requestId);
    case 'tasks.updateStatus': return updateTaskStatus_(body, requestId);
    case 'registry.search': return registrySearch_(body, requestId);
    case 'visits.create': return createVisit_(body, requestId);
    default: throw new Error('UNKNOWN_ACTION');
  }
}

function health_() {
  const props = PropertiesService.getScriptProperties();
  return { service: 'KCG Health OSM', environment: 'staging', configured: Boolean(props.getProperty('SPREADSHEET_ID') || SpreadsheetApp.getActiveSpreadsheet()), serverTime: new Date().toISOString(), timezone: TZ };
}

function publicHome_() {
  const ss = db_();
  const announcements = readRows_(ss, SHEETS.CONFIG).filter(row => row.configKey === 'publicAnnouncement' && row.isActive === 'TRUE');
  return { announcements, emergencyPhone: '1669', serviceHours: 'จันทร์–ศุกร์ 08:30–16:30 น.', facility: 'รพ.สต.โคกชะงาย' };
}

function authGoogle_(body, requestId) {
  if (!body.idToken) throw new Error('ID_TOKEN_REQUIRED');
  const token = verifyGoogleToken_(body.idToken);
  const email = String(token.email || '').toLowerCase();
  const user = readRows_(db_(), SHEETS.USERS).find(row => String(row.googleEmail || '').toLowerCase() === email && row.status === 'active');
  if (!user) { audit_('FAILED_LOGIN', 'User', email, null, requestId, 'denied'); throw new Error('ACCESS_DENIED'); }
  const allowedDomain = PropertiesService.getScriptProperties().getProperty('ALLOWED_DOMAIN');
  if (allowedDomain && !email.endsWith('@' + allowedDomain.toLowerCase())) throw new Error('ACCESS_DENIED');
  const rawSession = Utilities.getUuid() + Utilities.getUuid();
  const sessionHash = digest_(rawSession);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  appendRow_(db_(), SHEETS.SESSIONS, { sessionId: Utilities.getUuid(), userId: user.userId, tokenHash: sessionHash, issuedAt: now.toISOString(), expiresAt: expiresAt.toISOString(), revokedAt: '', revokeReason: '', lastSeenAt: now.toISOString(), deviceLabel: body.deviceLabel || '', createdAt: now.toISOString(), createdBy: user.userId, recordStatus: 'active' });
  appendRow_(db_(), SHEETS.AUDIT_LOG, auditRow_('LOGIN', 'User', user.userId, user.userId, requestId, 'success'));
  return { sessionToken: rawSession, expiresAt: expiresAt.toISOString(), user: safeUser_(user) };
}

function logout_(body, requestId) { const session = requireSession_(body.sessionToken); const sheet = sheet_(db_(), SHEETS.SESSIONS); const values = sheet.getDataRange().getValues(); const headers = values.shift(); const index = values.findIndex(row => String(row[headers.indexOf('sessionId')]) === String(session.session.sessionId)); if (index >= 0) { const row = index + 2; sheet.getRange(row, headers.indexOf('revokedAt') + 1).setValue(new Date().toISOString()); sheet.getRange(row, headers.indexOf('revokeReason') + 1).setValue('logout'); } audit_('LOGOUT', 'Session', session.sessionId, session.userId, requestId, 'success'); return { loggedOut: true }; }

function dashboard_(body, requestId) {
  const session = requireSession_(body.sessionToken); const rows = scopedRows_(readRows_(db_(), SHEETS.TASKS), session.user);
  const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  return { metrics: { today: rows.filter(r => String(r.dueAt || '').startsWith(today)).length, overdue: rows.filter(r => r.status === 'overdue').length, completed: rows.filter(r => r.status === 'completed').length }, tasks: rows.slice(0, 50), serverTime: new Date().toISOString() };
}

function tasksList_(body, requestId) { const session = requireSession_(body.sessionToken); let rows = scopedRows_(readRows_(db_(), SHEETS.TASKS), session.user); if (body.status) rows = rows.filter(row => row.status === body.status); return { items: rows.slice(0, 100) }; }

function updateTaskStatus_(body, requestId) {
  const session = requireSession_(body.sessionToken); if (!body.taskId || !body.status) throw new Error('TASK_UPDATE_REQUIRED');
  const sheet = sheet_(db_(), SHEETS.TASKS); const values = sheet.getDataRange().getValues(); const headers = values.shift(); const index = values.findIndex(row => String(row[headers.indexOf('taskId')]) === String(body.taskId)); if (index < 0) throw new Error('TASK_NOT_FOUND');
  const row = index + 2; const statusColumn = headers.indexOf('status') + 1; sheet.getRange(row, statusColumn).setValue(body.status); sheet.getRange(row, headers.indexOf('updatedAt') + 1).setValue(new Date().toISOString()); sheet.getRange(row, headers.indexOf('updatedBy') + 1).setValue(session.user.userId); audit_('UPDATE_STATUS', 'Task', body.taskId, session.user.userId, requestId, 'success'); return { taskId: body.taskId, status: body.status };
}

function registrySearch_(body, requestId) { const session = requireSession_(body.sessionToken); const q = String(body.query || '').trim().toLowerCase(); if (!q) return { items: [] }; const rows = scopedRows_(readRows_(db_(), SHEETS.PERSONS), session.user); return { items: rows.filter(row => [row.firstName, row.lastName, row.citizenCode, row.householdId].join(' ').toLowerCase().includes(q)).slice(0, 50).map(maskPerson_) }; }

function createVisit_(body, requestId) {
  const session = requireSession_(body.sessionToken); if (!body.personId || !body.householdId || !body.visitType) throw new Error('VISIT_REQUIRED');
  const visitId = Utilities.getUuid(); const now = new Date().toISOString(); const bmi = body.weightKg && body.heightCm ? Number(body.weightKg) / Math.pow(Number(body.heightCm) / 100, 2) : '';
  appendRow_(db_(), SHEETS.VISITS, { visitId, visitCode: 'VIS-' + Utilities.getUuid().slice(0, 8).toUpperCase(), taskId: body.taskId || '', personId: body.personId, householdId: body.householdId, areaId: body.areaId || '', visitType: body.visitType, visitedAt: now, clientRecordedAt: body.clientRecordedAt || '', recorderUserId: session.user.userId, status: 'submitted', symptomSummary: body.symptomSummary || '', observation: body.observation || '', actionTaken: body.actionTaken || '', bmi, submittedAt: now, templateVersion: body.templateVersion || 'staging-1', createdAt: now, createdBy: session.user.userId, updatedAt: now, updatedBy: session.user.userId, recordStatus: 'active' });
  audit_('CREATE', 'Visit', visitId, session.user.userId, requestId, 'success'); return { visitId, status: 'submitted', bmi: bmi ? Number(bmi.toFixed(2)) : null };
}

function verifyGoogleToken_(idToken) { const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true }); if (response.getResponseCode() !== 200) throw new Error('INVALID_GOOGLE_TOKEN'); const token = JSON.parse(response.getContentText()); const clientId = PropertiesService.getScriptProperties().getProperty('GOOGLE_CLIENT_ID'); if (clientId && token.aud !== clientId) throw new Error('TOKEN_AUDIENCE_MISMATCH'); if (token.email_verified !== 'true') throw new Error('EMAIL_NOT_VERIFIED'); return token; }

function requireSession_(rawToken) { if (!rawToken) throw new Error('SESSION_REQUIRED'); const hash = digest_(rawToken); const rows = readRows_(db_(), 'Sessions'); const session = rows.find(row => row.tokenHash === hash && !row.revokedAt && new Date(row.expiresAt).getTime() > Date.now()); if (!session) throw new Error('SESSION_INVALID'); const user = readRows_(db_(), SHEETS.USERS).find(row => row.userId === session.userId && row.status === 'active'); if (!user) throw new Error('ACCESS_DENIED'); return { session, user }; }
function scopedRows_(rows, user) { if (user.primaryRole === 'System Admin' || user.primaryRole === 'Health Officer') return rows; return rows.filter(row => !row.assigneeUserId || row.assigneeUserId === user.userId || !row.areaId); }
function safeUser_(row) { return { userId: row.userId, displayName: row.displayName, primaryRole: row.primaryRole, status: row.status }; }
function maskPerson_(row) { return { personId: row.personId, citizenCode: row.citizenCode, firstName: row.firstName, lastName: row.lastName, householdId: row.householdId, phone: row.phone ? String(row.phone).slice(0, 3) + '****' : '' }; }
function audit_(action, entityType, entityId, actorUserId, requestId, result) { appendRow_(db_(), SHEETS.AUDIT_LOG, auditRow_(action, entityType, entityId, actorUserId, requestId, result)); }
function auditRow_(action, entityType, entityId, actorUserId, requestId, result) { const now = new Date().toISOString(); return { auditId: Utilities.getUuid(), action, entityType, entityId, actorUserId: actorUserId || '', requestId, result, occurredAt: now, createdAt: now, recordStatus: 'active' }; }
function db_() { const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'); return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet(); }
function sheet_(ss, name) { const sheet = ss.getSheetByName(name); if (!sheet) throw new Error('SHEET_NOT_FOUND:' + name); return sheet; }
function readRows_(ss, name) { const sheet = sheet_(ss, name); const values = sheet.getDataRange().getDisplayValues(); if (!values.length) return []; const headers = values.shift(); return values.filter(row => row.some(Boolean)).map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] || '']))); }
function appendRow_(ss, name, record) { const sheet = sheet_(ss, name); const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]; sheet.appendRow(headers.map(header => record[header] ?? '')); }
function digest_(value) { return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value)); }
function parseBody_(e) { if (!e || !e.postData || !e.postData.contents) return {}; return JSON.parse(e.postData.contents); }
function publicError_(error) { const safe = ['ACCESS_DENIED', 'SESSION_REQUIRED', 'SESSION_INVALID', 'INVALID_GOOGLE_TOKEN', 'UNKNOWN_ACTION', 'SHEET_NOT_FOUND', 'TASK_NOT_FOUND', 'VISIT_REQUIRED']; const code = String(error.message || error); return { code: safe.includes(code) || code.startsWith('SHEET_') ? code : 'REQUEST_FAILED', message: safe.includes(code) ? code : 'ไม่สามารถดำเนินการคำขอได้' }; }
function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
