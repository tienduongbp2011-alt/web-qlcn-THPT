import React, { useState } from 'react';
import {
  Award,
  Bell,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Database,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Trophy,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext.tsx';
import { ModuleKey } from '../types/index.ts';
import { formatVietnameseDate, toISODate } from '../utils/calculations.ts';

interface NavItem {
  key: ModuleKey;
  label: string;
  shortDesc: string;
  icon: React.FC<{ className?: string }>;
}

export const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: '1. Trang chủ',
    shortDesc: 'Tổng quan lớp 10A3',
    icon: LayoutDashboard,
  },
  {
    key: 'students',
    label: '2. Quản lý học sinh',
    shortDesc: 'Hồ sơ & Phân 4 tổ',
    icon: Users,
  },
  {
    key: 'competition',
    label: '3. Quản lý 4 tổ thi đua',
    shortDesc: 'Chấm trực & Xếp hạng',
    icon: Trophy,
  },
  {
    key: 'attendance',
    label: '4. Chuyên cần và nề nếp',
    shortDesc: 'Điểm danh & Nề nếp',
    icon: CalendarCheck,
  },
  {
    key: 'finance',
    label: '5. Quản lý tài chính lớp',
    shortDesc: 'Sổ quỹ & Đối chiếu',
    icon: Wallet,
  },
  {
    key: 'reports',
    label: '6. Báo cáo và khen thưởng',
    shortDesc: 'Thống kê & In giấy khen',
    icon: Award,
  },
  {
    key: 'planning',
    label: '7. Kế hoạch chủ nhiệm',
    shortDesc: 'Lịch tuần & Nhiệm vụ',
    icon: ClipboardList,
  },
  {
    key: 'settings',
    label: '8. Cài đặt và quản trị',
    shortDesc: 'Cấu hình & Sao lưu',
    icon: Settings,
  },
];

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    state,
    activeModule,
    setActiveModule,
    sessionRole,
    setSessionRole,
    firebaseUser,
    syncMessage,
    supabaseStatus,
    syncNowWithSupabase,
    toastMessage,
    loginWithGoogle,
    logoutUser,
    clearDemoData,
  } = useWorkspace();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  const currentClass =
    state.classes.find((c) => c.id === state.currentClassId) || state.classes[0];
  const currentSchoolYear =
    state.schoolYears.find((y) => y.id === state.currentSchoolYearId) ||
    state.schoolYears[0];
  const todayFormatted = formatVietnameseDate(toISODate(new Date()));

  const pendingTasks = state.tasks.filter((t) => t.status !== 'Hoàn thành');
  const pendingReconciles = state.financeTransactions.filter(
    (t) => !t.isCancelled && t.reconcileStatus === 'Cần đối chiếu'
  );

  // Filter menu items: Group leader only sees Competition module (Requirement 6.1)
  const visibleNavItems =
    sessionRole.role === 'TO_TRUONG'
      ? NAV_ITEMS.filter((item) => item.key === 'competition')
      : NAV_ITEMS;

  const handleSelectRole = (
    roleType: 'GVCN' | 'ADMIN' | 'TO_TRUONG',
    groupId?: string
  ) => {
    if (roleType === 'GVCN') {
      setSessionRole({
        role: 'GVCN',
        actorName: currentClass?.homeroomTeacher || 'Nguyễn Tiến Dương',
      });
    } else if (roleType === 'ADMIN') {
      setSessionRole({
        role: 'ADMIN',
        actorName: 'Quản trị hệ thống THPT Thanh Hòa',
      });
    } else if (roleType === 'TO_TRUONG' && groupId) {
      const grp = state.groups.find((g) => g.id === groupId);
      const leader = state.students.find((s) => s.id === grp?.leaderStudentId);
      setSessionRole({
        role: 'TO_TRUONG',
        actorName: leader
          ? `${leader.fullName.replace(' (Demo)', '')} (${grp?.name})`
          : `Tổ trưởng ${grp?.name || ''}`,
        groupId,
      });
    }
    setRoleSwitcherOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4FAFF] text-[#17365D]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 no-print max-w-md rounded-lg border border-[#D7EAFE] bg-white px-4 py-3 shadow-lg flex items-center gap-3">
          <CheckCircle2
            className={`w-5 h-5 shrink-0 ${
              toastMessage.type === 'error'
                ? 'text-[#DC2626]'
                : toastMessage.type === 'info'
                ? 'text-[#0D47A1]'
                : 'text-[#16A34A]'
            }`}
          />
          <span className="text-sm font-medium text-[#17365D]">
            {toastMessage.text}
          </span>
        </div>
      )}

      {/* TOP HEADER (Section 3.4.A) */}
      <header className="sticky top-0 z-30 no-print bg-white/95 backdrop-blur-md border-b border-[#D7EAFE] shadow-xs">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Left: School Book & Torch Emblem + Titles */}
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg border border-[#D7EAFE] text-[#0D47A1] hover:bg-[#E3F2FD]"
              aria-label="Mở menu điều hướng"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Book & Torch SVG Emblem */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0D47A1] to-[#42A5F5] p-0.5 shadow-xs shrink-0 flex items-center justify-center">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
                <svg
                  viewBox="0 0 64 64"
                  className="w-9 h-9"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Open Book */}
                  <path
                    d="M10 44C18 40 26 42 32 46C38 42 46 40 54 44V24C46 20 38 22 32 26C26 22 18 20 10 24V44Z"
                    fill="#E3F2FD"
                    stroke="#0D47A1"
                    strokeWidth="2.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M32 26V46"
                    stroke="#0D47A1"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                  {/* Torch Handle */}
                  <path
                    d="M29 25L32 36L35 25H29Z"
                    fill="#0D47A1"
                  />
                  {/* Torch Flame */}
                  <path
                    d="M32 6C32 6 41 13 38 20C36 24 28 24 26 20C23 13 32 6 32 6Z"
                    fill="#FF8A00"
                  />
                  <path
                    d="M32 11C32 11 36 15 35 19C34 21 30 21 29 19C28 15 32 11 32 11Z"
                    fill="#FFF3E0"
                  />
                </svg>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold tracking-wider text-[#0D47A1]">
                <span>{state.school.name}</span>
                <span aria-hidden="true">·</span>
                <span>NĂM HỌC {currentSchoolYear?.name || '2026–2027'}</span>
                {state.isDemoMode && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#FF8A00] font-bold">
                      CHẾ ĐỘ DỮ LIỆU DEMO
                    </span>
                  </>
                )}
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-[#0D47A1] leading-tight">
                THANH HÒA CLASS MANAGER
              </h1>
              <p className="text-xs text-[#64748B] hidden sm:block">
                Hệ thống quản lý lớp chủ nhiệm, thi đua và tài chính lớp học
              </p>
            </div>
          </div>

          {/* Right: System Date, Role Switcher, Notifications, Teacher Avatar & Info */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* System Date & School Year */}
            <div className="hidden xl:flex flex-col items-end text-right pr-3 border-r border-[#D7EAFE]">
              <span className="text-xs text-[#64748B]">
                Ngày hệ thống: <strong className="text-[#17365D] tabular-nums">{todayFormatted}</strong>
              </span>
              <span className="text-xs text-[#0D47A1] font-semibold">
                Lớp {currentClass?.name || '10A3'} · Năm học {currentSchoolYear?.name || '2026–2027'}
              </span>
            </div>

            {/* Role Switcher (GVCN vs Tổ trưởng trực thi đua) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
                className="px-3 py-1.5 rounded-lg border border-[#D7EAFE] bg-[#E3F2FD]/60 hover:bg-[#E3F2FD] text-xs font-bold text-[#0D47A1] flex items-center gap-1.5 transition-colors whitespace-nowrap"
                title="Chuyển đổi quyền truy cập (GVCN / Tổ trưởng trực thi đua)"
              >
                <ShieldCheck className="w-4 h-4 text-[#0D47A1]" />
                <span>
                  Quyền: {sessionRole.role === 'GVCN' ? 'GVCN' : sessionRole.role === 'TO_TRUONG' ? 'Tổ trưởng trực' : 'Quản trị'}
                </span>
              </button>

              {roleSwitcherOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white border border-[#D7EAFE] shadow-xl p-3 z-50">
                  <div className="text-xs font-bold text-[#0D47A1] mb-2 pb-1.5 border-b border-[#D7EAFE]">
                    CHẾ ĐỘ PHÂN QUYỀN TRUY CẬP
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => handleSelectRole('GVCN')}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                        sessionRole.role === 'GVCN'
                          ? 'bg-[#0D47A1] text-white font-bold'
                          : 'hover:bg-[#E3F2FD] text-[#17365D]'
                      }`}
                    >
                      <span>GVCN: Nguyễn Tiến Dương (Toàn quyền)</span>
                    </button>

                    <div className="pt-1 text-[11px] text-[#64748B] font-semibold px-1">
                      Tài khoản Tổ trưởng trực chéo (Chỉ được chấm tổ được phân công):
                    </div>
                    {state.groups.map((grp) => {
                      const targetGrp = state.groups.find(
                        (g) => g.id === grp.dutyTargetGroupId
                      );
                      const isSelected =
                        sessionRole.role === 'TO_TRUONG' &&
                        sessionRole.groupId === grp.id;
                      return (
                        <button
                          key={grp.id}
                          type="button"
                          onClick={() => handleSelectRole('TO_TRUONG', grp.id)}
                          className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors flex items-center justify-between ${
                            isSelected
                              ? 'bg-[#0D47A1] text-white font-bold'
                              : 'hover:bg-[#E3F2FD] text-[#17365D]'
                          }`}
                        >
                          <span>Tổ trưởng {grp.name}</span>
                          <span
                            className={
                              isSelected ? 'text-[#E3F2FD]' : 'text-[#FF8A00] font-semibold'
                            }
                          >
                            Trực chấm {targetGrp?.name || 'Tổ khác'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 rounded-lg border border-[#D7EAFE] bg-white hover:bg-[#E3F2FD] text-[#0D47A1] relative transition-colors"
                aria-label="Thông báo lớp học"
              >
                <Bell className="w-5 h-5" />
                {pendingTasks.length + pendingReconciles.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF8A00] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {pendingTasks.length + pendingReconciles.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white border border-[#D7EAFE] shadow-xl p-3.5 z-50">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#D7EAFE]">
                    <span className="text-sm font-bold text-[#0D47A1]">
                      Thông báo & Nhắc việc ({pendingTasks.length + pendingReconciles.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-[#64748B] hover:text-[#17365D]"
                    >
                      Đóng
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
                    {pendingTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-2 rounded-lg bg-[#F4FAFF] border border-[#D7EAFE]"
                      >
                        <div className="font-bold text-[#17365D]">{t.title}</div>
                        <div className="text-[#64748B] mt-0.5">
                          Phụ trách: {t.assigneeName} · Hạn: {formatVietnameseDate(t.dueDate)}
                        </div>
                      </div>
                    ))}
                    {pendingReconciles.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-2 rounded-lg bg-[#FFF8F0] border border-[#FFE0B2]"
                      >
                        <div className="font-bold text-[#FF8A00]">
                          Cần đối chiếu chứng từ: {tx.transactionCode}
                        </div>
                        <div className="text-[#17365D] mt-0.5">{tx.content}</div>
                      </div>
                    ))}
                    {pendingTasks.length === 0 && pendingReconciles.length === 0 && (
                      <div className="text-center py-4 text-[#64748B]">
                        Không có công việc tồn đọng cần xử lý.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Illustrated Teacher Avatar & Homeroom Info */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-[#D7EAFE]">
              <div className="w-10 h-10 rounded-full bg-[#E3F2FD] border-2 border-[#42A5F5] flex items-center justify-center overflow-hidden shrink-0">
                <svg
                  viewBox="0 0 64 64"
                  className="w-9 h-9"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="32" cy="22" r="11" fill="#0D47A1" />
                  <path
                    d="M14 54C14 43 22 36 32 36C42 36 50 43 50 54"
                    fill="#42A5F5"
                  />
                  <path
                    d="M28 36L32 48L36 36"
                    fill="#FFFFFF"
                  />
                  <path
                    d="M31 38L32 46L33 38"
                    stroke="#FF8A00"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <div className="hidden md:block leading-tight">
                <div className="text-sm font-bold text-[#0D47A1]">
                  {sessionRole.actorName}
                </div>
                <div className="text-xs text-[#64748B]">
                  {sessionRole.role === 'GVCN'
                    ? `Giáo viên chủ nhiệm - Lớp ${currentClass?.name || '10A3'}`
                    : sessionRole.role === 'TO_TRUONG'
                    ? `Tổ trưởng trực thi đua - Lớp ${currentClass?.name || '10A3'}`
                    : `Quản trị hệ thống - Lớp ${currentClass?.name || '10A3'}`}
                </div>
              </div>

              {/* Account / Settings Quick Actions */}
              {firebaseUser ? (
                <button
                  type="button"
                  onClick={logoutUser}
                  className="p-2 rounded-lg border border-[#D7EAFE] text-[#17365D] hover:bg-[#E3F2FD] text-xs flex items-center gap-1"
                  title={`Đã đăng nhập: ${firebaseUser.email}. Nhấn để đăng xuất`}
                >
                  <LogOut className="w-4 h-4 text-[#0D47A1]" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={loginWithGoogle}
                  className="px-2.5 py-1.5 rounded-lg bg-[#0D47A1] text-white hover:bg-[#17365D] text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                  title="Đăng nhập Google để đồng bộ dữ liệu lên Cloud SQL"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Đăng nhập</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Demo Mode Banner / Supabase Cloud Status Bar */}
        <div className="bg-[#E3F2FD]/80 border-t border-[#D7EAFE] px-4 lg:px-6 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-[#17365D]">
            <Database className="w-3.5 h-3.5 text-[#0D47A1]" />
            {state.isDemoMode ? (
              <span>
                Đang hiển thị <strong className="text-[#0D47A1]">DỮ LIỆU DEMO</strong> Lớp {currentClass?.name || '10A3'}.
              </span>
            ) : (
              <span>
                Đang làm việc với <strong className="text-[#16A34A]">DỮ LIỆU THỰC TẾ</strong> Lớp {currentClass?.name || '10A3'}.
              </span>
            )}
            <span aria-hidden="true">·</span>
            {supabaseStatus === 'CONNECTED' && (
              <span className="text-[#16A34A] font-bold">
                Supabase: Đã kết nối & Đồng bộ tự động
              </span>
            )}
            {supabaseStatus === 'CONNECTING' && (
              <span className="text-[#0D47A1] font-semibold">
                Supabase: Đang kết nối...
              </span>
            )}
            {supabaseStatus === 'NEEDS_TABLE_SETUP' && (
              <button
                type="button"
                onClick={() => setActiveModule('settings')}
                className="text-[#FF8A00] font-bold underline hover:text-[#0D47A1]"
              >
                Supabase: Đã kết nối máy chủ — Nhấn vào đây để lấy mã SQL tạo bảng lần đầu
              </button>
            )}
            {supabaseStatus === 'ERROR' && (
              <button
                type="button"
                onClick={() => setActiveModule('settings')}
                className="text-[#DC2626] font-bold underline"
              >
                Supabase: Kiểm tra cấu hình kết nối
              </button>
            )}
            {syncMessage && (
              <span className="text-[#0D47A1] font-semibold">· {syncMessage}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={syncNowWithSupabase}
              className="text-xs font-bold text-[#0D47A1] hover:underline"
              title="Đẩy dữ liệu hiện tại lên cơ sở dữ liệu Supabase ngay lập tức"
            >
              Đồng bộ Supabase ngay
            </button>
            {sessionRole.role === 'TO_TRUONG' && (
              <button
                type="button"
                onClick={() => handleSelectRole('GVCN')}
                className="text-xs font-bold text-[#0D47A1] underline hover:text-[#FF8A00]"
              >
                Quay lại quyền GVCN Nguyễn Tiến Dương
              </button>
            )}
            {state.isDemoMode && sessionRole.role !== 'TO_TRUONG' && (
              <button
                type="button"
                onClick={clearDemoData}
                className="text-xs font-bold text-[#DC2626] hover:underline"
              >
                Xóa sạch dữ liệu DEMO để nhập dữ liệu thật
              </button>
            )}
          </div>
        </div>
      </header>

      {/* BODY: SIDEBAR + MAIN CONTENT */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto flex relative">
        {/* LEFT SIDEBAR (Section 3.4.B) */}
        <aside
          className={`no-print w-68 shrink-0 bg-white border-r border-[#D7EAFE] p-4 flex flex-col justify-between transition-transform duration-200 z-20 ${
            mobileMenuOpen
              ? 'fixed inset-y-0 left-0 top-[72px] shadow-2xl block'
              : 'hidden lg:flex'
          }`}
        >
          <div className="space-y-1.5">
            <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#64748B]">
              {sessionRole.role === 'TO_TRUONG'
                ? 'CHỨC NĂNG TỔ TRƯỞNG TRỰC'
                : '8 PHÂN HỆ QUẢN LÝ LỚP'}
            </div>

            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setActiveModule(item.key);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-3 ${
                    isActive
                      ? 'bg-[#0D47A1] text-white shadow-xs font-bold'
                      : 'text-[#17365D] hover:bg-[#E3F2FD]/70'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? 'text-white' : 'text-[#0D47A1]'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{item.label}</div>
                    <div
                      className={`text-[11px] truncate ${
                        isActive ? 'text-[#E3F2FD]' : 'text-[#64748B]'
                      }`}
                    >
                      {item.shortDesc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Class Quick Card in Sidebar */}
          <div className="mt-6 pt-4 border-t border-[#D7EAFE]">
            <div className="rounded-xl bg-[#F4FAFF] border border-[#D7EAFE] p-3.5 text-xs space-y-1.5">
              <div className="font-bold text-[#0D47A1] text-sm">
                Lớp chủ nhiệm: {currentClass?.name || '10A3'}
              </div>
              <div className="text-[#17365D]">
                GVCN: <strong>{currentClass?.homeroomTeacher || 'Nguyễn Tiến Dương'}</strong>
              </div>
              <div className="text-[#64748B]">
                Sĩ số đang học:{' '}
                <strong className="text-[#17365D] tabular-nums">
                  {state.students.filter((s) => s.status === 'Đang học').length}
                </strong>{' '}
                học sinh / 4 tổ
              </div>
              <div className="text-[#64748B]">
                Năm học: <strong className="text-[#17365D]">{currentSchoolYear?.name}</strong>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN VIEWPORT (Section 3.4.C) */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-7 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* FOOTER (Section 3.4.D) */}
      <footer className="no-print bg-white border-t border-[#D7EAFE] py-3.5 px-6 text-center text-sm font-bold text-[#0D47A1]">
        TRƯỜNG THPT THANH HÒA - Đồng hành cùng sự phát triển của học sinh!
      </footer>
    </div>
  );
};
