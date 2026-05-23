import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AdminLayout from '../layouts/AdminLayout.vue'
import LoginView from '../views/LoginView.vue'
import ChangePasswordView from '../views/ChangePasswordView.vue'
import DashboardView from '../views/DashboardView.vue'
import EmployeeView from '../views/EmployeeView.vue'
import EmployeeDetailView from '../views/EmployeeDetailView.vue'
import PayrollView from '../views/PayrollView.vue'
import AttendanceView from '../views/AttendanceView.vue'
import MenuAccessView from '../views/MenuAccessView.vue'
import StaffProfileView from '../views/StaffProfileView.vue'
import LeaveRequestView from '../views/LeaveRequestView.vue'
import PublicHolidayView from '../views/PublicHolidayView.vue'
import PermissionView from '../views/PermissionView.vue'
import StaffApprovalView from '../views/StaffApprovalView.vue'
import OvertimeView from '../views/OvertimeView.vue'
import GuideView from '../views/GuideView.vue'

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
          path: 'staff/dashboard',
          name: 'staff-dashboard',
          component: DashboardView,
          meta: { title: 'Dashboard Staff', levels: [3], menuKey: 'dashboard' },
        },
        {
          path: 'staff/profile',
          name: 'staff-profile',
          component: StaffProfileView,
          meta: { title: 'Profil Saya', levels: [3] },
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
          meta: { title: 'Absensi', menuKey: 'attendance' },
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

  if (!auth.user?.must_change_password && to.meta.passwordChange) {
    return auth.dashboardPath
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
