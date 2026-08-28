/**
 * KCG Health OSM — Staging backend
 * ใช้กับ Google Sheets + Google Drive ตาม PRD. ห้ามใส่ Secret ใน repository.
 * Script Properties: SPREADSHEET_ID, DRIVE_ROOT_ID, GOOGLE_CLIENT_ID, ALLOWED_DOMAIN (ถ้ามี)
 */

const API_VERSION = 'v1';
const TZ = 'Asia/Bangkok';
const SHEETS = {
  CONFIG: 'Config', USERS: 'Users', USER_AREAS: 'UserAreas', SESSIONS: 'Sessions', AREAS: 'Areas',
  HOUSEHOLDS: 'Households', PERSONS: 'Persons', PERSON_ASSIGNMENTS: 'PersonAssignments', TASKS: 'Tasks',
  TASK_EVENTS: 'TaskEvents', VISITS: 'Visits', MEASUREMENTS: 'Measurements', SCREENING: 'ScreeningResponses',
  RISK_FLAGS: 'RiskFlags', REFERRALS: 'Referrals', FOLLOWUPS: 'FollowUps', AUDIT_LOG: 'AuditLog',
  EXPORT_JOBS: 'ExportJobs', ATTACHMENTS: 'Attachments', LOOKUPS: 'Lookups'
};
const PRIVILEGED_ROLES = ['System Admin', 'Health Officer', 'Doctor', 'admin', 'staff'];

function doGet() {
  return json_({ ok: true, apiVersion: API_VERSION, service: 'KCG Health OSM', environment: environment_(), message: 'Use POST with JSON body.' });
}

function doPost(e) {
  const requestId = Utilities.getUuid();
  try {
    const body = parseBody_(e);
    const action = String(body.action || 'health');
    const result = route_(action, body, requestId);
    return json_({ ok: true, requestId, apiVersion: API_VERSION, serverTimestamp: new Date().toISOString(), data: result });
  } catch (error) {
    console.error(JSON.stringify({ requestId, error: String(error), stack: error.stack }));
    return json_({ ok: false, requestId, apiVersion: API_VERSION, serverTimestamp: new Date().toISOString(), error: publicError_(error) });
  }
}

function route_(action, body, requestId) {
  switch (action) {
    case 'health': return health_();
    case 'public.home': return publicHome_();
    case 'auth.google': return authGoogle_(body, requestId);
    case 'auth.logout': return logout_(body, requestId);
    case 'me.getProfile': return profile_(body, requestId);
    case 'dashboard': return dashboard_(body, requestId);
    case 'report.dashboard': return dashboard_(body, requestId);
    case 'tasks.list': return tasksList_(body, requestId);
    case 'tasks.updateStatus': return updateTaskStatus_(body, requestId);
    case 'area.list': return areaList_(body, requestId);
    case 'household.list': return householdList_(body, requestId);
    case 'person.list': return personList_(body, requestId);
    case 'registry.search': return registrySearch_(body, requestId);
    case 'risk.list': return riskList_(body, requestId);
    case 'visits.create': return createVisit_(body, requestId);
    default: throw new Error('UNKNOWN_ACTION');
  }
}

function environment_() { return PropertiesService.getScriptProperties().getProperty('APP_ENV') || 'staging'; }
function health_() {
  const props = PropertiesService.getScriptProperties();
  return { service: 'KCG Health OSM', environment: environment_(), configured: Boolean(props.getProperty('SPREADSHEET_ID') || SpreadsheetApp.getActiveSpreadsheet()), serverTime: new Date().toISOString(), timezone: TZ, capabilities: ['auth', 'dashboard', 'registry', 'visits', 'risk'] };
}

function publicHome_() {
  const ss = db_();
  const announcements = hasSheet_(ss, 'Announcements') ? readRows_(ss, 'Announcements').filter(row => row.status === 'published' && row.recordStatus !== 'deleted') : readRows_(ss, SHEETS.CONFIG).filter(row => row.configKey === 'publicAnnouncement' && row.isActive === 'TRUE');
  return { announcements: announcements.slice(0, 20), emergencyPhone: '1669', serviceHours: 'จันทร์–ศุกร์ 08:30–16:30 น.', facility: 'รพ.สต.โคกชะงาย' };
}

function authGoogle_(body, requestId) {
  if (!body.idToken) throw new Error('ID_TOKEN_REQUIRED');
  const token = verifyGoogleToken_(body.idToken);
  const email = String(token.email || '').toLowerCase();
  const user = readRows_(db_(), SHEETS.USERS).find(row => String(row.googleEmail || '').toLowerCase() === email && row.status === 'active' && row.recordStatus !== 'deleted');
  if (!user) { audit_('FAILED_LOGIN', 'User', email, '', requestId, 'denied'); throw new Error('ACCESS_DENIED'); }
  const allowedDomain = PropertiesService.getScriptProperties().getProperty('ALLOWED_DOMAIN');
  if (allowedDomain && !email.endsWith('@' + allowedDomain.toLowerCase())) throw new Error('ACCESS_DENIED');
  const rawSession = Utilities.getUuid() + Utilities.getUuid();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  appendRow_(db_(), SHEETS.SESSIONS, { sessionId: Utilities.getUuid(), userId: user.userId, tokenHash: digest_(rawSession), issuedAt: now.toISOString(), expiresAt: expiresAt.toISOString(), revokedAt: '', revokeReason: '', lastSeenAt: now.toISOString(), deviceLabel: body.deviceLabel || '', createdAt: now.toISOString(), createdBy: user.userId, recordStatus: 'active' });
  updateById_(db_(), SHEETS.USERS, 'userId', user.userId, { lastLoginAt: now.toISOString(), updatedAt: now.toISOString(), updatedBy: user.userId });
  audit_('LOGIN', 'User', user.userId, user.userId, requestId, 'success');
  return { sessionToken: rawSession, expiresAt: expiresAt.toISOString(), user: safeUser_(user) };
}

function logout_(body, requestId) {
  const session = requireSession_(body.sessionToken);
  updateById_(db_(), SHEETS.SESSIONS, 'sessionId', session.session.sessionId, { revokedAt: new Date().toISOString(), revokeReason: 'logout' });
  audit_('LOGOUT', 'Session', session.session.sessionId, session.user.userId, requestId, 'success');
  return { loggedOut: true };
}

function profile_(body, requestId) { const session = requireSession_(body.sessionToken); return { user: safeUser_(session.user), areas: areaIdsForUser_(session.user).map(id => ({ areaId: id })) }; }

function dashboard_(body, requestId) {
  const session = requireSession_(body.sessionToken);
  const tasks = scopedRows_(readRows_(db_(), SHEETS.TASKS), session.user).filter(row => row.recordStatus !== 'deleted');
  const risks = riskRowsForUser_(session.user);
  const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  return { metrics: { today: tasks.filter(r => String(r.dueAt || '').startsWith(today)).length, overdue: tasks.filter(r => r.status === 'overdue' || (r.dueAt && new Date(r.dueAt).getTime() < Date.now() && !['completed', 'cancelled'].includes(r.status))).length, completed: tasks.filter(r => r.status === 'completed').length, riskOpen: risks.filter(r => !['resolved', 'closed'].includes(r.status)).length }, tasks: tasks.slice(0, 50), risks: risks.slice(0, 20), serverTime: new Date().toISOString(), user: safeUser_(session.user) };
}

function tasksList_(body, requestId) {
  const session = requireSession_(body.sessionToken);
  let rows = scopedRows_(readRows_(db_(), SHEETS.TASKS), session.user).filter(row => row.recordStatus !== 'deleted');
  if (body.status) rows = rows.filter(row => row.status === body.status);
  return { items: rows.slice(0, 100) };
}

function updateTaskStatus_(body, requestId) {
  const session = requireSession_(body.sessionToken);
  if (!body.taskId || !body.status) throw new Error('TASK_UPDATE_REQUIRED');
  const ss = db_();
  const rows = readRows_(ss, SHEETS.TASKS);
  const task = rows.find(row => String(row.taskId) === String(body.taskId) && row.recordStatus !== 'deleted');
  if (!task || !canAccessRow_(task, session.user)) throw new Error('TASK_NOT_FOUND');
  const allowed = ['draft', 'assigned', 'accepted', 'in_progress', 'submitted', 'reviewed', 'completed', 'needs_revision', 'cancelled', 'unable_to_contact', 'overdue'];
  if (!allowed.includes(String(body.status))) throw new Error('VALIDATION_ERROR');
  const now = new Date().toISOString();
  const changes = { status: body.status, updatedAt: now, updatedBy: session.user.userId };
  if (body.status === 'submitted') changes.submittedAt = now;
  if (body.status === 'completed') changes.completedAt = now;
  updateById_(ss, SHEETS.TASKS, 'taskId', body.taskId, changes);
  appendRow_(ss, SHEETS.TASK_EVENTS, { taskEventId: Utilities.getUuid(), taskId: body.taskId, fromStatus: task.status || '', toStatus: body.status, eventType: 'transition', reason: body.reason || '', occurredAt: now, actorUserId: session.user.userId, requestId, recordStatus: 'active' });
  audit_('UPDATE_STATUS', 'Task', body.taskId, session.user.userId, requestId, 'success');
  return { taskId: body.taskId, fromStatus: task.status || '', status: body.status };
}

function areaList_(body, requestId) {
  const session = requireSession_(body.sessionToken);
  let rows = readRows_(db_(), SHEETS.AREAS).filter(row => row.recordStatus !== 'deleted');
  if (!isPrivileged_(session.user)) rows = rows.filter(row => areaIdsForUser_(session.user).indexOf(row.areaId) >= 0);
  return { items: rows };
}

function householdList_(body, requestId) {
  const session = requireSession_(body.sessionToken);
  let rows = scopedRows_(readRows_(db_(), SHEETS.HOUSEHOLDS), session.user).filter(row => row.recordStatus !== 'deleted');
  if (body.areaId) rows = rows.filter(row => row.areaId === body.areaId);
  if (body.q) rows = rows.filter(row => [row.householdCode, row.houseNo, row.addressLine, row.landmark].join(' ').toLowerCase().includes(String(body.q).toLowerCase()));
  return { items: rows.slice(0, 100).map(maskHousehold_) };
}

function personList_(body, requestId) {
  const session = requireSession_(body.sessionToken);
  let rows = scopedPersons_(session.user);
  if (body.householdId) rows = rows.filter(row => row.householdId === body.householdId);
  if (body.q) rows = rows.filter(row => [row.firstName, row.lastName, row.citizenCode, row.householdId, row.phone].join(' ').toLowerCase().includes(String(body.q).toLowerCase()));
  return { items: rows.slice(0, 100).map(maskPerson_) };
}

function registrySearch_(body, requestId) { return personList_({ sessionToken: body.sessionToken, q: body.query || body.q }, requestId); }

function riskList_(body, requestId) {
  const session = requireSession_(body.sessionToken);
  let rows = riskRowsForUser_(session.user);
  if (body.status) rows = rows.filter(row => row.status === body.status);
  return { items: rows.slice(0, 100) };
}

function createVisit_(body, requestId) {
  const session = requireSession_(body.sessionToken);
  if (!body.personId || !body.householdId || !body.visitType) throw new Error('VISIT_REQUIRED');
  validateNumber_(body.weightKg, 20, 350, 'WEIGHT_INVALID');
  validateNumber_(body.heightCm, 50, 250, 'HEIGHT_INVALID');
  const ss = db_();
  const person = readRows_(ss, SHEETS.PERSONS).find(row => row.personId === body.personId && row.recordStatus !== 'deleted');
  const household = readRows_(ss, SHEETS.HOUSEHOLDS).find(row => row.householdId === body.householdId && row.recordStatus !== 'deleted');
  if ((person || household) && (!canAccessRow_(person || household, session.user))) throw new Error('FORBIDDEN_AREA');
  const now = new Date().toISOString();
  const visitId = Utilities.getUuid();
  const bmi = body.weightKg && body.heightCm ? Number(body.weightKg) / Math.pow(Number(body.heightCm) / 100, 2) : null;
  appendRow_(ss, SHEETS.VISITS, { visitId, visitCode: 'VIS-' + Utilities.getUuid().slice(0, 8).toUpperCase(), taskId: body.taskId || '', personId: body.personId, householdId: body.householdId, areaId: body.areaId || (household && household.areaId) || '', visitType: body.visitType, visitedAt: now, clientRecordedAt: body.clientRecordedAt || '', recorderUserId: session.user.userId, status: 'submitted', symptomSummary: body.symptomSummary || '', observation: body.observation || '', actionTaken: body.actionTaken || '', nextFollowUpAt: body.nextFollowUpAt || '', submittedAt: now, reviewedAt: '', reviewedBy: '', reviewNote: '', templateVersion: body.templateVersion || 'staging-1', createdAt: now, createdBy: session.user.userId, updatedAt: now, updatedBy: session.user.userId, recordStatus: 'active' });
  if (body.weightKg) appendMeasurement_(ss, visitId, body.personId, 'weight', body.weightKg, 'kg', session.user.userId, now);
  if (body.heightCm) appendMeasurement_(ss, visitId, body.personId, 'height', body.heightCm, 'cm', session.user.userId, now);
  if (bmi) appendMeasurement_(ss, visitId, body.personId, 'bmi', bmi, 'kg/m2', session.user.userId, now);
  audit_('CREATE', 'Visit', visitId, session.user.userId, requestId, 'success');
  return { visitId, status: 'submitted', bmi: bmi ? Number(bmi.toFixed(2)) : null };
}

function appendMeasurement_(ss, visitId, personId, code, value, unit, actor, now) { appendRow_(ss, SHEETS.MEASUREMENTS, { measurementId: Utilities.getUuid(), visitId, personId, measurementCode: code, valueNumber: Number(value), valueText: '', unitCode: unit, measuredAt: now, status: 'valid', methodCode: '', deviceNote: '', ruleVersion: 'staging-1', createdAt: now, createdBy: actor, updatedAt: now, updatedBy: actor, recordStatus: 'active' }); }
function validateNumber_(value, min, max, code) { if (value === undefined || value === '' || value === null) return; const n = Number(value); if (!Number.isFinite(n) || n < min || n > max) throw new Error(code); }

function verifyGoogleToken_(idToken) { const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true }); if (response.getResponseCode() !== 200) throw new Error('INVALID_GOOGLE_TOKEN'); const token = JSON.parse(response.getContentText()); const clientId = PropertiesService.getScriptProperties().getProperty('GOOGLE_CLIENT_ID'); if (clientId && token.aud !== clientId) throw new Error('TOKEN_AUDIENCE_MISMATCH'); if (token.email_verified !== 'true') throw new Error('EMAIL_NOT_VERIFIED'); return token; }

function requireSession_(rawToken) { if (!rawToken) throw new Error('SESSION_REQUIRED'); const hash = digest_(rawToken); const rows = readRows_(db_(), SHEETS.SESSIONS); const session = rows.find(row => row.tokenHash === hash && !row.revokedAt && row.recordStatus !== 'deleted' && new Date(row.expiresAt).getTime() > Date.now()); if (!session) throw new Error('SESSION_INVALID'); const user = readRows_(db_(), SHEETS.USERS).find(row => row.userId === session.userId && row.status === 'active' && row.recordStatus !== 'deleted'); if (!user) throw new Error('ACCESS_DENIED'); return { session, user }; }
function isPrivileged_(user) { return PRIVILEGED_ROLES.indexOf(String(user.primaryRole || '')) >= 0; }
function areaIdsForUser_(user) { if (isPrivileged_(user)) return readRows_(db_(), SHEETS.AREAS).map(row => row.areaId).filter(Boolean); return readRows_(db_(), SHEETS.USER_AREAS).filter(row => row.userId === user.userId && row.recordStatus !== 'deleted' && (!row.endDate || new Date(row.endDate).getTime() >= Date.now())).map(row => row.areaId).filter(Boolean); }
function canAccessRow_(row, user) { if (!row || isPrivileged_(user)) return true; if (row.assigneeUserId && row.assigneeUserId === user.userId) return true; if (row.areaId) return areaIdsForUser_(user).indexOf(row.areaId) >= 0; return !row.assigneeUserId; }
function scopedRows_(rows, user) { return rows.filter(row => canAccessRow_(row, user)); }
function scopedPersons_(user) { const rows = readRows_(db_(), SHEETS.PERSONS).filter(row => row.recordStatus !== 'deleted'); if (isPrivileged_(user)) return rows; const ids = areaIdsForUser_(user); const assignments = readRows_(db_(), SHEETS.PERSON_ASSIGNMENTS).filter(row => row.userId === user.userId && row.recordStatus !== 'deleted' && (!row.endDate || new Date(row.endDate).getTime() >= Date.now())); const householdIds = readRows_(db_(), SHEETS.HOUSEHOLDS).filter(row => ids.indexOf(row.areaId) >= 0 && row.recordStatus !== 'deleted').map(row => row.householdId); return rows.filter(row => assignments.some(a => a.personId === row.personId) || (row.householdId && householdIds.indexOf(row.householdId) >= 0)); }
function riskRowsForUser_(user) { const rows = readRows_(db_(), SHEETS.RISK_FLAGS).filter(row => row.recordStatus !== 'deleted'); if (isPrivileged_(user)) return rows; const personIds = scopedPersons_(user).map(row => row.personId); return rows.filter(row => !row.personId || personIds.indexOf(row.personId) >= 0 || row.assignedUserId === user.userId); }
function safeUser_(row) { return { userId: row.userId, displayName: row.displayName, primaryRole: row.primaryRole, status: row.status }; }
function maskPerson_(row) { return { personId: row.personId, citizenCode: row.citizenCode, firstName: row.firstName, lastName: row.lastName, householdId: row.householdId, phone: row.phone ? String(row.phone).slice(0, 3) + '****' : '', residencyStatus: row.residencyStatus || '', tags: row.tags || '' }; }
function maskHousehold_(row) { return { householdId: row.householdId, householdCode: row.householdCode, areaId: row.areaId, houseNo: row.houseNo, addressLine: row.addressLine ? String(row.addressLine).slice(0, 12) + '…' : '', householdStatus: row.householdStatus || '' }; }
function audit_(action, entityType, entityId, actorUserId, requestId, result) { if (hasSheet_(db_(), SHEETS.AUDIT_LOG)) appendRow_(db_(), SHEETS.AUDIT_LOG, { auditId: Utilities.getUuid(), action, entityType, entityId, actorUserId: actorUserId || '', requestId, result, occurredAt: new Date().toISOString(), createdAt: new Date().toISOString(), recordStatus: 'active' }); }
function db_() { const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'); return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet(); }
function hasSheet_(ss, name) { return Boolean(ss.getSheetByName(name)); }
function sheet_(ss, name) { const sheet = ss.getSheetByName(name); if (!sheet) throw new Error('SHEET_NOT_FOUND:' + name); return sheet; }
function readRows_(ss, name) { const sheet = sheet_(ss, name); const values = sheet.getDataRange().getDisplayValues(); if (!values.length) return []; const headers = values.shift(); return values.filter(row => row.some(Boolean)).map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] || '']))); }
function appendRow_(ss, name, record) { const sheet = sheet_(ss, name); const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]; sheet.appendRow(headers.map(header => record[header] ?? '')); }
function updateById_(ss, name, idHeader, idValue, changes) { const sheet = sheet_(ss, name); const values = sheet.getDataRange().getValues(); if (!values.length) return false; const headers = values.shift(); const index = values.findIndex(row => String(row[headers.indexOf(idHeader)]) === String(idValue)); if (index < 0) return false; const rowNumber = index + 2; Object.keys(changes).forEach(key => { const column = headers.indexOf(key); if (column >= 0) sheet.getRange(rowNumber, column + 1).setValue(changes[key]); }); return true; }
function digest_(value) { return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value)); }
function parseBody_(e) { if (!e || !e.postData || !e.postData.contents) return {}; try { return JSON.parse(e.postData.contents); } catch (error) { throw new Error('INVALID_REQUEST'); } }
function publicError_(error) { const safe = ['ACCESS_DENIED', 'FORBIDDEN_ROLE', 'FORBIDDEN_AREA', 'SESSION_REQUIRED', 'SESSION_INVALID', 'INVALID_GOOGLE_TOKEN', 'TOKEN_AUDIENCE_MISMATCH', 'EMAIL_NOT_VERIFIED', 'UNKNOWN_ACTION', 'SHEET_NOT_FOUND', 'TASK_NOT_FOUND', 'VISIT_REQUIRED', 'TASK_UPDATE_REQUIRED', 'VALIDATION_ERROR', 'INVALID_REQUEST', 'WEIGHT_INVALID', 'HEIGHT_INVALID', 'ID_TOKEN_REQUIRED']; const code = String(error.message || error); return { code: safe.includes(code) || code.startsWith('SHEET_') ? code : 'REQUEST_FAILED', message: safe.includes(code) ? code : 'ไม่สามารถดำเนินการคำขอได้' }; }
function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
