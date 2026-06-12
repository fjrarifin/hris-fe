import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { backendUrl } from '../services/api'
import { notifier } from '../utils/notifications'
import AdminLayout from '../layouts/AdminLayout.vue'
import LoginView from '../views/LoginView.vue'
import ForgotPasswordView from '../views/ForgotPasswordView.vue'
import VerifyOtpView from '../views/VerifyOtpView.vue'
import ResetPasswordView from '../views/ResetPasswordView.vue'
import ChangePasswordView from '../views/ChangePasswordView.vue'
import DashboardView from '../views/DashboardView.vue'
import HrInternalDashboardView from '../views/HrInternalDashboardView.vue'
import EmployeeView from '../views/EmployeeView.vue'
import EmployeeCreateView from '../views/EmployeeCreateView.vue'
import EmployeeDetailView from '../views/EmployeeDetailView.vue'
import PayrollView from '../views/PayrollView.vue'
import PayrollMasterView from '../views/PayrollMasterView.vue'
import PayrollProcessView from '../views/PayrollProcessView.vue'
import AttendanceView from '../views/AttendanceView.vue'
import MenuAccessView from '../views/MenuAccessView.vue'
import AuditLogView from '../views/AuditLogView.vue'
import ItPushNotificationView from '../views/ItPushNotificationView.vue'
import ItUserManagementView from '../views/ItUserManagementView.vue'
import StaffProfileView from '../views/StaffProfileView.vue'
import StaffAttendanceView from '../views/StaffAttendanceView.vue'
import LeaveRequestView from '../views/LeaveRequestView.vue'
import PublicHolidayView from '../views/PublicHolidayView.vue'
import ExtraOffView from '../views/ExtraOffView.vue'
import PermissionView from '../views/PermissionView.vue'
import StaffApprovalView from '../views/StaffApprovalView.vue'
import OvertimeView from '../views/OvertimeView.vue'
import StaffTeamScheduleView from '../views/StaffTeamScheduleView.vue'
import GuideView from '../views/GuideView.vue'
import HrApprovalView from '../views/HrApprovalView.vue'
import HrContractView from '../views/HrContractView.vue'
import HrScheduleView from '../views/HrScheduleView.vue'
import HrGuideView from '../views/HrGuideView.vue'
import HrAttendanceCorrectionView from '../views/HrAttendanceCorrectionView.vue'
import HrAttendanceMinimumView from '../views/HrAttendanceMinimumView.vue'
import HrPerformancePeriodView from '../views/HrPerformancePeriodView.vue'
import HrPerformanceReviewView from '../views/HrPerformanceReviewView.vue'
import HrTalentJobdeskView from '../views/HrTalentJobdeskView.vue'
import HrTalentJobdeskDetailView from '../views/HrTalentJobdeskDetailView.vue'
import HrTalentKpiTemplateView from '../views/HrTalentKpiTemplateView.vue'
import StaffPerformanceReviewView from '../views/StaffPerformanceReviewView.vue'
import StaffTalentView from '../views/StaffTalentView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guestOnly: true, title: 'Login' },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: ForgotPasswordView,
      meta: { guestOnly: true, title: 'Lupa Password' },
    },
    {
      path: '/forgot-password/verify',
      name: 'verify-password-otp',
      component: VerifyOtpView,
      meta: { guestOnly: true, title: 'Verifikasi OTP' },
    },
    {
      path: '/forgot-password/reset',
      name: 'reset-password',
      component: ResetPasswordView,
      meta: { guestOnly: true, title: 'Buat Password Baru' },
    },
    {
      path: '/change-password',
      name: 'force-change-password',
      component: ChangePasswordView,
      meta: { requiresAuth: true, passwordChange: true, title: 'Ganti Password' },
    },
    {
      path: '/approval/:token',
      name: 'public-approval-redirect',
      beforeEnter: (to) => {
        window.location.replace(`${backendUrl}/api/approval/${encodeURIComponent(to.params.token)}`)
        return false
      },
    },
    {
      path: '/',
      component: AdminLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'home',
          component: DashboardView,
          meta: { title: 'Dashboard' },
        },
        {
          path: 'it/dashboard',
          name: 'it-dashboard',
          component: DashboardView,
          meta: { title: 'Dashboard IT', levels: [0], menuKey: 'dashboard' },
        },
        {
          path: 'admin/dashboard',
          name: 'admin-dashboard',
          component: DashboardView,
          meta: { title: 'Dashboard Admin', levels: [1], menuKey: 'dashboard' },
        },
        {
          path: 'hr/dashboard',
          name: 'hr-dashboard',
          component: DashboardView,
          meta: { title: 'Dashboard HR', levels: [2], menuKey: 'dashboard' },
        },
        {
          path: 'hr/internal-dashboard',
          name: 'hr-internal-dashboard',
          component: HrInternalDashboardView,
          meta: {
            title: 'Dashboard Internal',
            levels: [2],
            menuKey: 'hr-internal-dashboard',
          },
        },
        {
          path: 'staff/dashboard',
          name: 'staff-dashboard',
          component: DashboardView,
          meta: { title: 'Dashboard Karyawan', levels: [3], menuKey: 'dashboard' },
        },
        {
          path: 'staff/profile',
          name: 'staff-profile',
          component: StaffProfileView,
          meta: { title: 'Profil Saya', levels: [3] },
        },
        {
          path: 'staff/attendance',
          name: 'staff-attendance',
          component: StaffAttendanceView,
          meta: { title: 'Absensi Saya', levels: [3], menuKey: 'staff-attendance' },
        },
        {
          path: 'staff/leave',
          name: 'staff-leave',
          component: LeaveRequestView,
          meta: { title: 'Pengajuan Cuti', levels: [3], menuKey: 'staff-leave' },
        },
        {
          path: 'staff/public-holiday',
          name: 'staff-public-holiday',
          component: PublicHolidayView,
          meta: { title: 'Public Holiday', levels: [3], menuKey: 'staff-public-holiday' },
        },
        {
          path: 'staff/extra-off',
          name: 'staff-extra-off',
          component: ExtraOffView,
          meta: { title: 'Extra Off', levels: [3], menuKey: 'staff-extra-off' },
        },
        {
          path: 'staff/permission',
          name: 'staff-permission',
          component: PermissionView,
          meta: { title: 'Izin / Sakit', levels: [3], menuKey: 'staff-permission' },
        },
        {
          path: 'staff/approvals',
          name: 'staff-approvals',
          component: StaffApprovalView,
          meta: { title: 'Approval Pengajuan', levels: [3], menuKey: 'staff-approvals' },
        },
        {
          path: 'staff/overtime',
          name: 'staff-overtime',
          component: OvertimeView,
          meta: { title: 'Pengajuan Lembur', levels: [3], menuKey: 'staff-overtime' },
        },
        {
          path: 'staff/team-schedules',
          name: 'staff-team-schedules',
          component: StaffTeamScheduleView,
          meta: { title: 'Jadwal Tim', levels: [3], menuKey: 'staff-team-schedules' },
        },
        {
          path: 'staff/guide',
          name: 'staff-guide',
          component: GuideView,
          meta: { title: 'Panduan Aplikasi', levels: [3], menuKey: 'staff-guide' },
        },
        {
          path: 'employees',
          name: 'employees',
          component: EmployeeView,
          meta: { title: 'Data Karyawan', menuKey: 'employees' },
        },
        {
          path: 'employees/create',
          name: 'employee-create',
          component: EmployeeCreateView,
          meta: { title: 'Tambah Karyawan', menuKey: 'employees' },
        },
        {
          path: 'employees/:nik',
          name: 'employee-detail',
          component: EmployeeDetailView,
          meta: { title: 'Detail Karyawan', menuKey: 'employees' },
        },
        {
          path: 'payroll',
          name: 'payroll',
          component: PayrollView,
          meta: { title: 'Payroll', menuKey: 'payroll' },
        },
        {
          path: 'payroll/master',
          name: 'hr-payroll-master',
          component: PayrollMasterView,
          meta: { title: 'Master Payroll', levels: [1, 2], menuKey: 'hr-payroll-master' },
        },
        {
          path: 'payroll/process',
          name: 'hr-payroll-process',
          component: PayrollProcessView,
          meta: { title: 'Proses Payroll', levels: [1, 2], menuKey: 'hr-payroll-process' },
        },
        {
          path: 'attendance',
          name: 'attendance',
          component: AttendanceView,
          meta: { title: 'Absensi', levels: [1, 2], menuKey: 'attendance' },
        },
        {
          path: 'hr/attendance/minimum-monitoring',
          name: 'hr-attendance-minimum',
          component: HrAttendanceMinimumView,
          meta: {
            title: 'Monitoring Minimum Absensi',
            levels: [2],
            menuKey: 'hr-attendance-minimum',
          },
        },
        {
          path: 'hr/schedules',
          name: 'hr-schedules',
          component: HrScheduleView,
          meta: { title: 'Jadwal Karyawan', levels: [2], menuKey: 'hr-schedules' },
        },
        {
          path: 'hr/contracts',
          name: 'hr-contracts',
          component: HrContractView,
          meta: { title: 'Kontrak Karyawan', levels: [2], menuKey: 'hr-contracts' },
        },
        {
          path: 'hr/attendance-corrections',
          name: 'hr-attendance-corrections',
          component: HrAttendanceCorrectionView,
          meta: {
            title: 'Koreksi Absensi',
            levels: [2],
            menuKey: 'hr-attendance-corrections',
          },
        },
        {
          path: 'hr/approvals/leave',
          name: 'hr-approval-leave',
          component: HrApprovalView,
          meta: {
            title: 'Approval Cuti',
            levels: [2],
            menuKey: 'hr-approval-leave',
            approvalType: 'leave',
          },
        },
        {
          path: 'hr/approvals/overtime',
          name: 'hr-approval-overtime',
          component: HrApprovalView,
          meta: {
            title: 'Approval Lembur',
            levels: [2],
            menuKey: 'hr-approval-overtime',
            approvalType: 'overtime',
          },
        },
        {
          path: 'hr/approvals/ph',
          name: 'hr-approval-ph',
          component: HrApprovalView,
          meta: {
            title: 'Approval PH',
            levels: [2],
            menuKey: 'hr-approval-ph',
            approvalType: 'ph',
          },
        },
        {
          path: 'hr/approvals/extra-off',
          name: 'hr-approval-extra-off',
          component: HrApprovalView,
          meta: {
            title: 'Approval Extra Off',
            levels: [2],
            menuKey: 'hr-approval-extra-off',
            approvalType: 'extra_off',
          },
        },
        {
          path: 'hr/approvals/permission',
          name: 'hr-approval-permission',
          component: HrApprovalView,
          meta: {
            title: 'Approval Izin / Sakit',
            levels: [2],
            menuKey: 'hr-approval-permission',
            approvalType: 'permission',
          },
        },
        {
          path: 'hr/guide',
          name: 'hr-guide',
          component: HrGuideView,
          meta: { title: 'Panduan Aplikasi', levels: [2], menuKey: 'hr-guide' },
        },
        {
          path: 'hr/talent/jobdesks',
          name: 'hr-talent-jobdesks',
          component: HrTalentJobdeskView,
          meta: { title: 'Jobdesk Jabatan', levels: [2], menuKey: 'hr-talent-jobdesks' },
        },
        {
          path: 'hr/talent/jobdesks/:jabatanId',
          name: 'hr-talent-jobdesk-detail',
          component: HrTalentJobdeskDetailView,
          meta: { title: 'Detail Jobdesk', levels: [2], menuKey: 'hr-talent-jobdesks' },
        },
        {
          path: 'hr/talent/kpis',
          name: 'hr-talent-kpis',
          component: HrTalentKpiTemplateView,
          meta: { title: 'Template KPI', levels: [2], menuKey: 'hr-talent-kpis' },
        },
        {
          path: 'hr/talent/periods',
          name: 'hr-talent-periods',
          component: HrPerformancePeriodView,
          meta: { title: 'Periode Review', levels: [2], menuKey: 'hr-talent-periods' },
        },
        {
          path: 'hr/talent/reviews',
          name: 'hr-talent-reviews',
          component: HrPerformanceReviewView,
          meta: { title: 'Performance Review', levels: [2], menuKey: 'hr-talent-reviews' },
        },
        {
          path: 'staff/performance-reviews',
          name: 'staff-performance-reviews',
          component: StaffPerformanceReviewView,
          meta: {
            title: 'Performance Review Tim',
            levels: [3],
            menuKey: 'staff-performance-reviews',
          },
        },
        {
          path: 'staff/talent',
          name: 'staff-talent',
          component: StaffTalentView,
          meta: { title: 'Jobdesk & KPI Saya', levels: [3], menuKey: 'staff-talent' },
        },
        {
          path: 'account/change-password',
          name: 'account-change-password',
          component: ChangePasswordView,
          meta: { title: 'Ubah Password', passwordChange: true },
        },
        {
          path: 'access/menus',
          name: 'menu-access',
          component: MenuAccessView,
          meta: { title: 'Akses Menu', levels: [0], menuKey: 'menu-access' },
        },
        {
          path: 'it/audit-logs',
          name: 'audit-logs',
          component: AuditLogView,
          meta: { title: 'Log Perubahan', levels: [0], menuKey: 'audit-logs' },
        },
        {
          path: 'it/users',
          name: 'it-users',
          component: ItUserManagementView,
          meta: { title: 'Kelola User', levels: [0], menuKey: 'user-management' },
        },
        {
          path: 'it/push-notifications',
          name: 'it-push-notifications',
          component: ItPushNotificationView,
          meta: { title: 'Push Notification', levels: [0], menuKey: 'it-push-notifications' },
        },
      ],
    },
  ],
})

function passwordChangeAvailableText(value) {
  if (!value) {
    return 'jadwal berikutnya.'
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value))
}

router.beforeEach(async (to, from) => {
  const auth = useAuthStore()

  await auth.restore()

  if (to.meta.guestOnly) {
    return auth.isAuthenticated
      ? auth.user?.level === 3 && auth.user?.must_change_password
        ? '/change-password'
        : auth.dashboardPath
      : true
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (auth.user?.level === 3 && auth.user?.must_change_password && !to.meta.passwordChange) {
    return '/change-password'
  }

  if (to.name === 'force-change-password' && !(auth.user?.level === 3 && auth.user?.must_change_password)) {
    return '/account/change-password'
  }

  if (to.name === 'account-change-password' && auth.user?.level === 3 && auth.user?.must_change_password) {
    return '/change-password'
  }

  if (
    to.name === 'account-change-password' &&
    !auth.user?.must_change_password &&
    auth.user?.can_change_password === false
  ) {
    notifier.warning(
      `Password dapat diganti kembali pada ${passwordChangeAvailableText(auth.user?.password_change_available_at)}.`,
      'Perubahan belum tersedia',
    )

    return from.name ? false : auth.dashboardPath
  }

  if (to.name === 'home') {
    return auth.dashboardPath
  }

  if (to.meta.menuKey && !auth.canAccess(to.meta.menuKey)) {
    return auth.dashboardPath
  }

  if (!to.meta.menuKey && to.meta.levels && auth.user?.level !== 0 && !to.meta.levels.includes(auth.user?.level)) {
    return auth.dashboardPath
  }

  return true
})

export default router
