import api from './api'

export function getHrDashboard() {
  return api.get('/hr/dashboard')
}

export function getHrRecruitmentDashboard(params) {
  return api.get('/hr/recruitment/dashboard', { params })
}

export function getHrRecruitmentInterviewAgenda(params) {
  return api.get('/hr/recruitment/interview-agenda', { params })
}

export function getHrContracts(params) {
  return api.get('/hr/contracts', { params })
}

export function getHrEmployeeContracts(nik) {
  return api.get(`/hr/contracts/${encodeURIComponent(nik)}`)
}

export function createHrContract(nik, payload) {
  return api.post(`/hr/contracts/${encodeURIComponent(nik)}`, payload)
}

export function updateHrContract(contractId, payload) {
  if (payload instanceof FormData) {
    return api.post(`/hr/contracts/records/${contractId}`, payload)
  }
  return api.put(`/hr/contracts/records/${contractId}`, payload)
}

export function getHrContractPdfPreview(contractId) {
  return api.get(`/hr/contracts/records/${contractId}/pdf-preview`)
}

export function getHrAttendance(params) {
  return api.get('/hr/attendance', { params })
}

export function getHrAttendanceOptions() {
  return api.get('/hr/attendance/options')
}

export function exportHrAttendance(params) {
  return api.get('/hr/attendance/export', { params, responseType: 'blob' })
}

export function getHrAttendanceMinimumMonitoring(params) {
  return api.get('/hr/attendance/minimum-monitoring', { params })
}

export function exportHrAttendanceMinimumMonitoring(params) {
  return api.get('/hr/attendance/minimum-monitoring/export', { params, responseType: 'blob' })
}

export function notifyHrAttendanceMinimumEmployee(payload) {
  return api.post('/hr/attendance/minimum-monitoring/notify', payload)
}

export function notifyHrAttendanceMinimumEmployees(payload) {
  return api.post('/hr/attendance/minimum-monitoring/notify-bulk', payload)
}

export function getHrPayrollMaster(params) {
  return api.get('/hr/payroll/master', { params })
}

export function getHrPayrollMasterEmployee(nik) {
  return api.get(`/hr/payroll/master/${encodeURIComponent(nik)}`)
}

export function saveHrPayrollMasterEmployee(nik, payload) {
  return api.put(`/hr/payroll/master/${encodeURIComponent(nik)}`, payload)
}

export function getHrPayrollComponents() {
  return api.get('/hr/payroll/master/components')
}

export function saveHrPayrollComponent(id, payload) {
  return api.put(`/hr/payroll/master/components/${id}`, payload)
}

export function previewHrPayrollProcess(params) {
  return api.get('/hr/payroll/process/preview', { params })
}

export function autoCorrectHrPayrollProcessAttendance(payload) {
  return api.post('/hr/payroll/process/preview/auto-correct', payload)
}

export function getHrPayrollPeriods() {
  return api.get('/hr/payroll/process/periods')
}

export function generateHrPayrollDrafts(payload) {
  return api.post('/hr/payroll/process/generate', payload)
}

export function getHrPayrollDrafts(params) {
  return api.get('/hr/payroll/process/drafts', { params })
}

export function exportHrPayrollDrafts(params) {
  return api.get('/hr/payroll/process/drafts/export', { params, responseType: 'blob' })
}

export function saveHrPayrollAdjustments(payrollId, adjustments) {
  return api.put(`/hr/payroll/process/drafts/${payrollId}/adjustments`, { adjustments })
}

export function submitHrPayrollDraft(payrollId) {
  return api.post(`/hr/payroll/process/drafts/${payrollId}/submit`)
}

export function approveHrPayrollDraft(payrollId) {
  return api.post(`/hr/payroll/process/drafts/${payrollId}/approve`)
}

export function cancelSubmitHrPayrollDraft(payrollId) {
  return api.post(`/hr/payroll/process/drafts/${payrollId}/cancel-submit`)
}

export function cancelApproveHrPayrollDraft(payrollId) {
  return api.post(`/hr/payroll/process/drafts/${payrollId}/cancel-approve`)
}

export function lockHrPayrollDraft(payrollId) {
  return api.post(`/hr/payroll/process/drafts/${payrollId}/lock`)
}

export function downloadHrPayrollSlip(payrollId) {
  return api.post(`/hr/payroll/process/drafts/${payrollId}/artifact`, {}, { responseType: 'blob' })
}

export function sendHrPayrollSlip(payrollId) {
  return api.post(`/hr/payroll/process/drafts/${payrollId}/send-slip`)
}

export function getHrAttendanceCorrections(params) {
  return api.get('/hr/attendance-corrections', { params })
}

export function saveHrAttendanceCorrection(nik, payload) {
  return api.put(`/hr/attendance-corrections/${encodeURIComponent(nik)}`, payload)
}

export function getHrApprovals(type, params) {
  return api.get(`/hr/approvals/${type}`, { params })
}

export function decideHrApproval(type, id, payload) {
  return api.post(`/hr/approvals/${type}/${id}`, payload)
}

export function cancelHrApproval(type, id, payload) {
  return api.post(`/hr/approvals/${type}/${id}/cancel`, payload)
}

export function getHrSchedules(params) {
  return api.get('/hr/schedules', { params })
}

export function getHrScheduleOptions() {
  return api.get('/hr/schedules/options')
}

export function downloadHrScheduleTemplate(params) {
  return api.get('/hr/schedules/template', { params, responseType: 'blob' })
}

export function getHrEmployeeSchedule(nik, params) {
  return api.get(`/hr/schedules/employees/${encodeURIComponent(nik)}`, { params })
}

export function saveHrEmployeeSchedule(nik, payload) {
  return api.put(`/hr/schedules/employees/${encodeURIComponent(nik)}`, payload)
}

export function uploadHrSchedule(payload) {
  return api.post('/hr/schedules/upload', payload)
}

export function getHrTalentOptions() {
  return api.get('/hr/talent/options')
}

export function getHrJobdesks(params) {
  return api.get('/hr/talent/jobdesks', { params })
}

export function createHrJobdesk(payload) {
  return api.post('/hr/talent/jobdesks', payload)
}

export function updateHrJobdesk(id, payload) {
  return api.post(`/hr/talent/jobdesks/${id}`, payload)
}

export function deleteHrJobdesk(id) {
  return api.delete(`/hr/talent/jobdesks/${id}`)
}

export function getHrJobdeskPdfPreview(id) {
  return api.get(`/hr/talent/jobdesks/${id}/pdf-preview`)
}

export function getHrKpis(params) {
  return api.get('/hr/talent/kpis', { params })
}

export function createHrKpi(payload) {
  return api.post('/hr/talent/kpis', payload)
}

export function updateHrKpi(id, payload) {
  return api.put(`/hr/talent/kpis/${id}`, payload)
}

export function deleteHrKpi(id) {
  return api.delete(`/hr/talent/kpis/${id}`)
}

export function syncActiveHrKpis(jabatanId, templateIds) {
  return api.post(`/hr/talent/kpis/jabatans/${jabatanId}/sync-active`, {
    template_ids: templateIds,
  })
}

export function getHrPerformancePeriods() {
  return api.get('/hr/talent/periods')
}

export function createHrPerformancePeriod(payload) {
  return api.post('/hr/talent/periods', payload)
}

export function updateHrPerformancePeriod(id, payload) {
  return api.put(`/hr/talent/periods/${id}`, payload)
}

export function getHrPerformanceReviews(params) {
  return api.get('/hr/talent/reviews', { params })
}

export function createHrPerformanceReview(payload) {
  return api.post('/hr/talent/reviews', payload)
}

export function updateHrPerformanceReviewStatus(id, payload) {
  return api.patch(`/hr/talent/reviews/${id}/status`, payload)
}

export function getHrVacancyFavorites(params) {
  return api.get('/hr/recruitment/vacancies/favorite', { params })
}

export function getHrVacancies(params) {
  return api.get('/hr/recruitment/vacancies', { params })
}

export function createHrVacancy(payload) {
  return api.post('/hr/recruitment/vacancies', payload)
}

export function updateHrVacancy(id, payload) {
  return api.put(`/hr/recruitment/vacancies/${id}`, payload)
}

export function deleteHrVacancy(id) {
  return api.delete(`/hr/recruitment/vacancies/${id}`)
}

export function getHrCandidates(params) {
  return api.get('/hr/recruitment/candidates', { params })
}

export function createHrCandidate(payload) {
  return api.post('/hr/recruitment/candidates', payload)
}

export function updateHrCandidate(id, payload) {
  return api.put(`/hr/recruitment/candidates/${id}`, payload)
}

export function checkHrScheduleConflict(payload) {
  return api.post('/hr/recruitment/candidates/check-conflict', payload)
}

export function deleteHrCandidate(id) {
  return api.delete(`/hr/recruitment/candidates/${id}`)
}

export function uploadHrCandidateResume(id, payload) {
  return api.post(`/hr/recruitment/candidates/${id}/upload-resume`, payload)
}

export function getHrCandidateResumePreview(id) {
  return api.get(`/hr/recruitment/candidates/${id}/resume-preview`)
}

export function getHrCandidateDetail(id) {
  return api.get(`/hr/recruitment/candidates/${id}`)
}

export function uploadHrCandidatePhoto(id, payload) {
  return api.post(`/hr/recruitment/candidates/${id}/upload-photo`, payload)
}

export function uploadHrCandidateOffering(id, payload) {
  return api.post(`/hr/recruitment/candidates/${id}/upload-offering`, payload)
}

export function getHrCandidateOfferingPreview(id) {
  return api.get(`/hr/recruitment/candidates/${id}/offering-preview`)
}

export function lockHrCandidateInterview(id) {
  return api.post(`/hr/recruitment/candidates/${id}/lock-interview`)
}

export function sendHrCandidateInterviewerWa(id) {
  return api.post(`/hr/recruitment/candidates/${id}/send-wa-interviewer`)
}

export function sendHrCandidateInterviewWa(id) {
  return api.post(`/hr/recruitment/candidates/${id}/send-wa-candidate-interview`)
}

export function sendHrCandidateCaseStudyWa(id) {
  return api.post(`/hr/recruitment/candidates/${id}/send-wa-candidate-case-study`)
}

export function scheduleHrCandidateInterview(id, payload) {
  return api.post(`/hr/recruitment/candidates/${id}/schedule-hr-interview`, payload)
}

export function completeHrCandidateInterview(id, payload) {
  return api.post(`/hr/recruitment/candidates/${id}/complete-hr-interview`, payload)
}

export function uploadHrCandidateInterviewSummary(id, payload) {
  return api.post(`/hr/recruitment/candidates/${id}/upload-hr-interview-summary`, payload)
}

export function getHrInterviewSummaryPreview(id) {
  return api.get(`/hr/recruitment/candidates/${id}/hr-interview-summary-preview`)
}

export function sendHrCandidateCaseStudy(id, payload) {
  return api.post(`/hr/recruitment/candidates/${id}/send-case-study`, payload)
}

export function uploadHrCandidateCaseStudySubmission(id, payload) {
  return api.post(`/hr/recruitment/candidates/${id}/upload-case-study-submission`, payload)
}

export function getCaseStudySubmissionPreview(id) {
  return api.get(`/hr/recruitment/candidates/${id}/case-study-submission-preview`)
}

export function scheduleUserInterviewRound(id, payload) {
  return api.post(`/hr/recruitment/candidates/${id}/schedule-user-interview-round`, payload)
}

export function completeUserInterviewRound(id, round, payload) {
  return api.post(`/hr/recruitment/candidates/${id}/user-interview-round/${round}/complete`, payload)
}

export function saveUserInterviewRoundEvaluation(id, payload) {
  return api.post(`/hr/recruitment/candidates/${id}/save-user-interview-round-evaluation`, payload)
}

export function uploadUserInterviewRoundSummary(id, payload) {
  return api.post(`/hr/recruitment/candidates/${id}/upload-user-interview-round-summary`, payload)
}

export function sendUserInterviewEvaluationWa(candidateId, round, evalId) {
  return api.post(`/hr/recruitment/candidates/${candidateId}/rounds/${round}/send-eval-wa/${evalId}`)
}

export function sendUserInterviewCandidateWa(candidateId, round) {
  return api.post(`/hr/recruitment/candidates/${candidateId}/rounds/${round}/send-candidate-wa`)
}

export function getEvaluationReportPreview(evalId) {
  return api.get(`/hr/recruitment/evaluations/${evalId}/preview`)
}

export function getPublicEvaluation(token) {
  return api.get(`/public/candidates/evaluation/${token}`)
}

export function submitPublicEvaluation(token, payload) {
  return api.post(`/public/candidates/evaluation/${token}`, payload)
}

export function sendReferenceCheckRequest(id) {
  return api.post(`/hr/recruitment/candidates/${id}/send-reference-check-request`)
}

export function sendReferenceCheckWa(id) {
  return api.post(`/hr/recruitment/candidates/${id}/send-reference-check-wa`)
}

export function previewReferenceCheckSummary(id) {
  return api.get(`/hr/recruitment/candidates/${id}/reference-check-summary-preview`)
}

export function getUserInterviewSummaryPreview(id, round) {
  return api.get(`/hr/recruitment/candidates/${id}/user-interview-round/${round}/summary-preview`)
}

export function getUserInterviewEvaluationRecapPreview(id, round) {
  return api.get(`/hr/recruitment/candidates/${id}/user-interview-round/${round}/evaluation-recap-preview`)
}

export function getPkbApprovalRecapPreview(id) {
  return api.get(`/hr/recruitment/candidates/${id}/pkb-approval-recap-preview`)
}

export function uploadReferenceCheckSummary(id, payload) {
  return api.post(`/hr/recruitment/candidates/${id}/upload-reference-check-summary`, payload)
}

export function sendOfferingLetterWithSignature(id, payload) {
  return api.post(`/hr/recruitment/candidates/${id}/send-offering-with-signature`, payload)
}

export function sendOfferingLetterWa(id) {
  return api.post(`/hr/recruitment/candidates/${id}/send-offering-wa`)
}

export function sendPkbApprovalRequest(id, payload) {
  return api.post(`/hr/recruitment/candidates/${id}/send-pkb-approval-request`, payload)
}

export function resendPkbSignerWa(candidateId, signerId) {
  return api.post(`/hr/recruitment/candidates/${candidateId}/pkb-signers/${signerId}/resend-wa`)
}

export function sendOnboardingFormLink(id) {
  return api.post(`/hr/recruitment/candidates/${id}/send-onboarding-link`)
}

export function sendOnboardingWa(id) {
  return api.post(`/hr/recruitment/candidates/${id}/send-onboarding-wa`)
}

export function importOnboarding(id, payload) {
  return api.post(`/hr/recruitment/candidates/${id}/import-onboarding`, payload)
}

export function saveOnboardingDraft(id, payload) {
  return api.post(`/hr/recruitment/candidates/${id}/save-onboarding-draft`, payload)
}

// PUBLIC ROUTES (Unauthenticated)
export function getPublicReferenceCheck(token, password) {
  return api.get(`/public/candidates/reference-check/${token}`, {
    headers: { 'X-Reference-Password': password },
  })
}

export function submitPublicReferenceCheck(token, payload) {
  return api.post(`/public/candidates/reference-check/${token}`, payload)
}

export function getPublicReferenceEvaluation(type, token) {
  return api.get(`/public/reference-check/${type}/${token}`)
}

export function submitPublicReferenceEvaluation(type, token, payload) {
  return api.post(`/public/reference-check/${type}/${token}`, payload)
}

export function getPublicReferenceEvaluationShort(code) {
  return api.get(`/public/reference-check-short/${code}`)
}

export function submitPublicReferenceEvaluationShort(code, payload) {
  return api.post(`/public/reference-check-short/${code}`, payload)
}

export function getPublicOffering(token, password) {
  return api.get(`/public/candidates/offering/${token}`, {
    headers: { 'X-Offering-Password': password },
  })
}

export function submitPublicOfferingSignature(token, payload) {
  return api.post(`/public/candidates/offering/${token}/sign`, payload)
}

export function getPublicCaseStudy(token, password) {
  return api.get(`/public/candidates/case-study/${token}`, {
    headers: { 'X-Case-Study-Password': password },
  })
}

export function submitPublicCaseStudy(token, payload) {
  return api.post(`/public/candidates/case-study/${token}/submit`, payload)
}

export function getPublicPkbSigner(id) {
  return api.get(`/public/pkb/signer/${id}`)
}

export function submitPublicPkbSignature(id, payload) {
  return api.post(`/public/pkb/signer/${id}/sign`, payload)
}

export function getPublicOnboarding(token) {
  return api.get(`/public/candidates/onboarding/${token}`)
}

export function submitPublicOnboarding(token, payload) {
  return api.post(`/public/candidates/onboarding/${token}/submit`, payload)
}

export function getHrRecruitmentRequests() {
  return api.get('/hr/recruitment/requests')
}

export function decideHrRecruitmentRequest(id, payload) {
  return api.post(`/hr/recruitment/requests/${id}/decide`, payload)
}

export function getHrMasterOrgs(type) {
  return api.get(`/hr/master-orgs/${type}`)
}

export function createHrMasterOrg(type, payload) {
  return api.post(`/hr/master-orgs/${type}`, payload)
}

export function updateHrMasterOrg(type, id, payload) {
  return api.put(`/hr/master-orgs/${type}/${id}`, payload)
}

export function deleteHrMasterOrg(type, id) {
  return api.delete(`/hr/master-orgs/${type}/${id}`)
}

export function getPublicResumeByEvaluationToken(token, payload) {
  return api.post(`/public/candidates/evaluation/${token}/resume`, payload)
}

export function getEmployeeOptions() {
  return api.get('/employee-options')
}

export function getMasterPositionTitles() {
  return api.get('/hr/master-orgs/positions')
}

export function getMasterDivisions() {
  return api.get('/hr/master-orgs/divisions')
}

export function getMasterDepartments() {
  return api.get('/hr/master-orgs/departments')
}

export function getMasterUnits() {
  return api.get('/hr/master-orgs/units')
}
