#!/usr/bin/env bash
set -euo pipefail
SPREADSHEET_ID="1fDkI4cGOb4bl7QEYnZxpAuwh6VDyHvy5Zqe3z8hjDXg"
update_sheet() {
  local sheet="$1"
  local headers="$2"
  gws sheets spreadsheets values update --params "{\"spreadsheetId\":\"${SPREADSHEET_ID}\",\"range\":\"${sheet}!A1\",\"valueInputOption\":\"RAW\"}" --json "{\"range\":\"${sheet}!A1\",\"majorDimension\":\"ROWS\",\"values\":[${headers}]}" --format json >/dev/null
}
update_sheet "Config" '["configKey","configValue","valueType","environment","description","isActive","updatedAt","updatedBy"]'
update_sheet "Users" '["userId","googleEmail","displayName","phoneMasked","primaryRole","status","lastLoginAt","mustReauthAt","createdAt","createdBy","updatedAt","updatedBy","recordStatus"]'
update_sheet "UserAreas" '["userAreaId","userId","areaId","assignmentRole","startDate","endDate","isPrimary","createdAt","createdBy","updatedAt","updatedBy","recordStatus"]'
update_sheet "Sessions" '["sessionId","userId","tokenHash","issuedAt","expiresAt","revokedAt","revokeReason","lastSeenAt","deviceLabel","createdAt","createdBy","recordStatus"]'
update_sheet "Areas" '["areaId","areaCode","areaType","areaNameTh","parentAreaId","villageNo","status","sortOrder","createdAt","createdBy","updatedAt","updatedBy","recordStatus"]'
update_sheet "Households" '["householdId","householdCode","areaId","houseNo","addressLine","landmark","latitude","longitude","locationConsentStatus","primaryContactPersonId","householdStatus","createdAt","createdBy","updatedAt","updatedBy","recordStatus"]'
update_sheet "Persons" '["personId","citizenCode","householdId","nationalId","title","firstName","lastName","nickname","birthDate","birthDatePrecision","genderCode","relationshipCode","phone","emergencyContactName","emergencyContactPhone","residencyStatus","lifeStatus","portalStatus","consentStatus","createdAt","createdBy","updatedAt","updatedBy","recordStatus"]'
update_sheet "PersonAssignments" '["assignmentId","personId","userId","areaId","assignmentType","startDate","endDate","reason","createdAt","createdBy","updatedAt","updatedBy","recordStatus"]'
update_sheet "Tasks" '["taskId","taskCode","taskType","personId","householdId","areaId","assigneeUserId","assignedBy","priority","dueAt","status","title","instruction","recurrenceKey","submittedAt","reviewedAt","completedAt","outcomeCode","createdAt","createdBy","updatedAt","updatedBy","recordStatus"]'
update_sheet "TaskEvents" '["taskEventId","taskId","fromStatus","toStatus","eventType","reason","occurredAt","actorUserId","requestId","recordStatus"]'
update_sheet "Visits" '["visitId","visitCode","taskId","personId","householdId","areaId","visitType","visitedAt","clientRecordedAt","recorderUserId","status","symptomSummary","observation","actionTaken","nextFollowUpAt","submittedAt","reviewedAt","reviewedBy","reviewNote","templateVersion","createdAt","createdBy","updatedAt","updatedBy","recordStatus"]'
update_sheet "Measurements" '["measurementId","visitId","personId","measurementCode","valueNumber","valueText","unitCode","measuredAt","status","methodCode","deviceNote","ruleVersion","createdAt","createdBy","updatedAt","updatedBy","recordStatus"]'
update_sheet "ScreeningResponses" '["responseId","visitId","personId","templateId","templateVersion","questionCode","answerType","answerValue","score","answeredAt","createdAt","createdBy","updatedAt","updatedBy","recordStatus"]'
update_sheet "RiskFlags" '["riskFlagId","personId","visitId","riskCode","sourceType","sourceId","ruleId","ruleVersion","suggestedLevel","confirmedLevel","status","reason","detectedAt","acknowledgedAt","acknowledgedBy","assignedUserId","resolvedAt","resolvedBy","outcomeCode","createdAt","createdBy","updatedAt","updatedBy","recordStatus"]'
update_sheet "Referrals" '["referralId","riskFlagId","personId","fromUnit","toUnit","reason","referredAt","appointmentAt","status","outcomeCode","outcomeNote","closedAt","closedBy","createdAt","createdBy","updatedAt","updatedBy","recordStatus"]'
update_sheet "FollowUps" '["followUpId","personId","riskFlagId","referralId","dueAt","contactedAt","methodCode","resultCode","note","nextDueAt","status","createdAt","createdBy","updatedAt","updatedBy","recordStatus"]'
update_sheet "Attachments" '["attachmentId","entityType","entityId","driveFileId","fileName","mimeType","sizeBytes","sha256","visibility","uploadedAt","uploadedBy","recordStatus"]'
update_sheet "ExportJobs" '["exportJobId","templateVersion","filtersJson","status","rowCount","errorCount","driveFileId","fileHash","createdAt","createdBy","completedAt","recordStatus"]'
update_sheet "AuditLog" '["auditId","action","entityType","entityId","actorUserId","requestId","result","occurredAt","createdAt","recordStatus"]'
update_sheet "Lookups" '["lookupType","lookupCode","labelTh","sortOrder","version","effectiveDate","isActive","updatedAt","updatedBy"]'
printf 'Initialized Staging headers for %s\n' "$SPREADSHEET_ID"
