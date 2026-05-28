import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
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
import AttendanceView from '../views/AttendanceView.vue'
import MenuAccessView from '../views/MenuAccessView.vue'
import StaffProfileView from '../views/StaffProfileView.vue'
import StaffAttendanceView from '../views/StaffAttendanceView.vue'
import LeaveRequestView from '../views/LeaveRequestView.vue'
import PublicHolidayView from '../views/PublicHolidayView.vue'
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
      name: 'change-password',
      component: ChangePasswordView,
      meta: { requiresAuth: true, passwordChange: true, title: 'Ganti Password' },
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
          path: 'attendance',
          name: 'attendance',
          component: AttendanceView,
          meta: { title: 'Absensi', levels: [1, 2], menuKey: 'attendance' },
        },
        {
          path: 'hr/attendance/minimum-monitoring',
          name: 'hr-attendance-minimum',
          component: HrAttendanceMinimumView,
          meta: { title: 'Monitoring Minimum Absensi', levels: [2], menuKey: 'hr-attendance-minimum' },
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
          path: 'access/menus',
          name: 'menu-access',
          component: MenuAccessView,
          meta: { title: 'Akses Menu', levels: [0], menuKey: 'menu-access' },
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  await auth.restore()

  if (to.meta.guestOnly) {
    return auth.isAuthenticated
      ? auth.user?.must_change_password
        ? '/change-password'
        : auth.dashboardPath
      : true
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (auth.user?.must_change_password && !to.meta.passwordChange) {
    return '/change-password'
  }

  if (to.name === 'home') {
    return auth.dashboardPath
  }

  if (to.meta.levels && !to.meta.levels.includes(auth.user?.level)) {
    return auth.dashboardPath
  }

  if (to.meta.menuKey && !auth.canAccess(to.meta.menuKey)) {
    return auth.dashboardPath
  }

  return true
})

export default router
