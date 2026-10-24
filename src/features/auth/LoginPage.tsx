import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogIn,
  ShieldCheck,
  Trophy,
  UserCheck,
  Users,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import { getDefaultAuthCredentials } from '../../services/demoData.ts';

export const LoginPage: React.FC = () => {
  const {
    state,
    loginWithCredentials,
    supabaseStatus,
    toastMessage,
  } = useWorkspace();

  const [loginTab, setLoginTab] = useState<'GVCN' | 'TO_TRUONG'>('GVCN');
  const [username, setUsername] = useState('gvcn');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentClass =
    state.classes.find((c) => c.id === state.currentClassId) || state.classes[0];
  const currentSchoolYear =
    state.schoolYears.find((y) => y.id === state.currentSchoolYearId) ||
    state.schoolYears[0];
  const creds = state.authCredentials || getDefaultAuthCredentials();

  const handleSwitchTab = (tab: 'GVCN' | 'TO_TRUONG') => {
    setLoginTab(tab);
    setErrorMsg(null);
    if (tab === 'GVCN') {
      setUsername(creds.gvcnUsername || 'gvcn');
      setPassword('');
    } else {
      const firstLeader = creds.groupLeaderAccounts[0];
      setUsername(firstLeader?.username || 'to1');
      setPassword('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu.');
      return;
    }
    const result = loginWithCredentials(loginTab, username, password);
    if (!result.ok) {
      setErrorMsg(result.error || 'Thông tin đăng nhập không hợp lệ.');
    }
  };

  const handleQuickSelectLeader = (groupUsername: string) => {
    setLoginTab('TO_TRUONG');
    setUsername(groupUsername);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F4FAFF] text-[#17365D]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md rounded-lg border border-[#D7EAFE] bg-white px-4 py-3 shadow-lg flex items-center gap-3">
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

      {/* Top Institutional Header */}
      <header className="bg-white border-b border-[#D7EAFE] px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0D47A1] to-[#42A5F5] p-0.5 shrink-0 flex items-center justify-center">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
                <svg
                  viewBox="0 0 64 64"
                  className="w-8 h-8"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
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
                  <path d="M29 25L32 36L35 25H29Z" fill="#0D47A1" />
                  <path
                    d="M32 6C32 6 41 13 38 20C36 24 28 24 26 20C23 13 32 6 32 6Z"
                    fill="#FF8A00"
                  />
                </svg>
              </div>
            </div>
            <div>
              <div className="text-xs font-bold tracking-wider text-[#0D47A1]">
                {state.school.name} · NĂM HỌC {currentSchoolYear?.name || '2026–2027'}
              </div>
              <div className="text-base sm:text-lg font-bold text-[#17365D]">
                THANH HÒA CLASS MANAGER
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <Database className="w-4 h-4 text-[#0D47A1]" />
            <span>
              Cơ sở dữ liệu Supabase:{' '}
              <strong
                className={
                  supabaseStatus === 'CONNECTED'
                    ? 'text-[#16A34A]'
                    : 'text-[#0D47A1]'
                }
              >
                {supabaseStatus === 'CONNECTED'
                  ? 'Đã kết nối trực tuyến'
                  : 'Sẵn sàng đồng bộ'}
              </strong>
            </span>
          </div>
        </div>
      </header>

      {/* Main Two-Column Login Portal */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: School & Role Guidance */}
          <div className="lg:col-span-5 rounded-2xl bg-gradient-to-br from-[#0D47A1] via-[#1565C0] to-[#1E88E5] text-white p-7 sm:p-8 flex flex-col justify-between shadow-lg">
            <div className="space-y-5">
              <div className="text-xs font-bold tracking-wider text-[#E3F2FD]">
                CỔNG ĐĂNG NHẬP PHÂN QUYỀN LỚP {currentClass?.name || '10A3'}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold leading-snug">
                Hệ thống Quản lý Lớp Chủ nhiệm, Thi đua & Tài chính Lớp học
              </h1>

              <p className="text-sm text-[#E3F2FD] leading-relaxed">
                Hệ thống phân tách quyền truy cập độc lập giữa Giáo viên chủ nhiệm và các Tổ trưởng trực thi đua nhằm đảm bảo tính minh bạch, chính xác và bảo mật dữ liệu lớp học.
              </p>

              <div className="space-y-3 pt-2 border-t border-white/20 text-xs">
                <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-xs space-y-1">
                  <div className="font-bold text-white flex items-center gap-2 text-sm">
                    <ShieldCheck className="w-4 h-4 text-[#FFB74D]" />
                    <span>1. Quyền Giáo viên Chủ nhiệm (GVCN)</span>
                  </div>
                  <p className="text-[#E3F2FD] leading-relaxed">
                    Đăng nhập vào thẳng <strong>Trang chủ Tổng quan</strong> và sử dụng toàn quyền 8 phân hệ (Học sinh, 4 Tổ thi đua, Chuyên cần, Tài chính, Báo cáo – Giấy khen, Kế hoạch, Cài đặt).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-xs space-y-1">
                  <div className="font-bold text-white flex items-center gap-2 text-sm">
                    <Trophy className="w-4 h-4 text-[#FFB74D]" />
                    <span>2. Quyền Tổ trưởng Trực Thi đua</span>
                  </div>
                  <p className="text-[#E3F2FD] leading-relaxed">
                    Đăng nhập vào thẳng <strong>Phân hệ Chấm trực thi đua</strong> của đúng Tổ được phân công trực chéo. Các phân hệ khác được khóa bảo mật hoàn toàn.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-white/20 text-xs text-[#E3F2FD] flex items-center justify-between">
              <span>GVCN: {currentClass?.homeroomTeacher || 'Nguyễn Tiến Dương'}</span>
              <span>Lớp {currentClass?.name || '10A3'} · {currentClass?.grade || 'Khối 10'}</span>
            </div>
          </div>

          {/* Right Column: 2-Option Login Form */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#D7EAFE] shadow-lg p-6 sm:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#0D47A1]">
                  Đăng nhập Hệ thống
                </h2>
                <p className="text-xs sm:text-sm text-[#64748B] mt-1">
                  Vui lòng chọn vai trò đăng nhập của bạn bên dưới và nhập thông tin tài khoản:
                </p>
              </div>

              {/* 2-Option Segmented Role Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1.5 rounded-xl bg-[#F4FAFF] border border-[#D7EAFE]">
                <button
                  type="button"
                  onClick={() => handleSwitchTab('GVCN')}
                  className={`py-3 px-4 rounded-lg text-left transition-all flex items-center gap-3 ${
                    loginTab === 'GVCN'
                      ? 'bg-[#0D47A1] text-white shadow-xs font-bold'
                      : 'text-[#17365D] hover:bg-[#E3F2FD]/60'
                  }`}
                >
                  <UserCheck
                    className={`w-5 h-5 shrink-0 ${
                      loginTab === 'GVCN' ? 'text-[#FFB74D]' : 'text-[#0D47A1]'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">
                      1. Giáo viên Chủ nhiệm
                    </div>
                    <div
                      className={`text-[11px] truncate ${
                        loginTab === 'GVCN' ? 'text-[#E3F2FD]' : 'text-[#64748B]'
                      }`}
                    >
                      Vào trực tiếp Trang chính (8 phân hệ)
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchTab('TO_TRUONG')}
                  className={`py-3 px-4 rounded-lg text-left transition-all flex items-center gap-3 ${
                    loginTab === 'TO_TRUONG'
                      ? 'bg-[#0D47A1] text-white shadow-xs font-bold'
                      : 'text-[#17365D] hover:bg-[#E3F2FD]/60'
                  }`}
                >
                  <Users
                    className={`w-5 h-5 shrink-0 ${
                      loginTab === 'TO_TRUONG' ? 'text-[#FFB74D]' : 'text-[#0D47A1]'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">
                      2. Tổ trưởng Trực Thi đua
                    </div>
                    <div
                      className={`text-[11px] truncate ${
                        loginTab === 'TO_TRUONG'
                          ? 'text-[#E3F2FD]'
                          : 'text-[#64748B]'
                      }`}
                    >
                      Vào thẳng trang Chấm điểm tổ trực
                    </div>
                  </div>
                </button>
              </div>

              {/* Quick Group Selector when on TO_TRUONG tab */}
              {loginTab === 'TO_TRUONG' && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[#17365D]">
                    Chọn nhanh Tổ trưởng đăng nhập (Phân công trực chéo hiện tại):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {state.groups.map((grp, idx) => {
                      const acc =
                        creds.groupLeaderAccounts.find(
                          (a) => a.groupId === grp.id
                        ) || {
                          groupId: grp.id,
                          username: `to${idx + 1}`,
                          password: '123456',
                        };
                      const targetGrp = state.groups.find(
                        (g) => g.id === grp.dutyTargetGroupId
                      );
                      const isSelected =
                        username.trim().toLowerCase() ===
                        acc.username.toLowerCase();
                      return (
                        <button
                          key={grp.id}
                          type="button"
                          onClick={() => handleQuickSelectLeader(acc.username)}
                          className={`p-2.5 rounded-xl border text-left transition-colors text-xs ${
                            isSelected
                              ? 'border-[#0D47A1] bg-[#E3F2FD] text-[#0D47A1] font-bold'
                              : 'border-[#D7EAFE] bg-[#F4FAFF] text-[#17365D] hover:bg-[#E3F2FD]/50'
                          }`}
                        >
                          <div className="font-bold">Tổ trưởng {grp.name}</div>
                          <div className="text-[11px] text-[#64748B] mt-0.5">
                            TK: <strong className="text-[#0D47A1] font-mono">{acc.username}</strong>
                          </div>
                          <div className="text-[11px] text-[#FF8A00] font-semibold mt-0.5">
                            Chấm: {targetGrp?.name || 'Tổ trực'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#17365D] mb-1.5">
                    {loginTab === 'GVCN'
                      ? 'Tài khoản Giáo viên chủ nhiệm'
                      : 'Tài khoản Tổ trưởng được phân quyền'}
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={
                        loginTab === 'GVCN'
                          ? 'Nhập tài khoản GVCN (VD: gvcn)'
                          : 'Nhập tài khoản Tổ trưởng (VD: to1, to2, to3, to4)'
                      }
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D7EAFE] bg-[#F4FAFF] focus:bg-white focus:border-[#0D47A1] outline-none text-sm font-semibold text-[#17365D]"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#17365D] mb-1.5">
                    Mật khẩu đăng nhập
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu..."
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#D7EAFE] bg-[#F4FAFF] focus:bg-white focus:border-[#0D47A1] outline-none text-sm font-semibold text-[#17365D]"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0D47A1]"
                      aria-label="Hiện hoặc ẩn mật khẩu"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 px-5 rounded-xl bg-[#0D47A1] hover:bg-[#17365D] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>
                    {loginTab === 'GVCN'
                      ? 'Đăng nhập vào Trang chính (GVCN)'
                      : 'Đăng nhập vào Phân hệ Quản lý 4 Tổ Thi đua'}
                  </span>
                </button>
              </form>
            </div>

            {/* Helpful Default Account Hint Box */}
            <div className="mt-6 pt-4 border-t border-[#D7EAFE] text-xs text-[#64748B] space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-[#17365D]">
                  Thông tin tài khoản mặc định (GVCN có thể đổi trong mục Cài đặt):
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (loginTab === 'GVCN') {
                      setUsername(creds.gvcnUsername);
                      setPassword(creds.gvcnPassword);
                    } else {
                      const matched =
                        creds.groupLeaderAccounts.find(
                          (a) =>
                            a.username.toLowerCase() ===
                            username.trim().toLowerCase()
                        ) || creds.groupLeaderAccounts[0];
                      if (matched) {
                        setUsername(matched.username);
                        setPassword(matched.password);
                      }
                    }
                    setErrorMsg(null);
                  }}
                  className="text-[#0D47A1] font-bold hover:underline"
                >
                  Điền nhanh mật khẩu mặc định
                </button>
              </div>
              {loginTab === 'GVCN' ? (
                <div>
                  • Tài khoản GVCN: <strong className="text-[#0D47A1] font-mono">{creds.gvcnUsername}</strong> · Mật khẩu mặc định: <strong className="text-[#0D47A1] font-mono">123456</strong>
                </div>
              ) : (
                <div>
                  • Tài khoản 4 Tổ trưởng: <strong className="text-[#0D47A1] font-mono">to1</strong>, <strong className="text-[#0D47A1] font-mono">to2</strong>, <strong className="text-[#0D47A1] font-mono">to3</strong>, <strong className="text-[#0D47A1] font-mono">to4</strong> · Mật khẩu mặc định: <strong className="text-[#0D47A1] font-mono">123456</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#D7EAFE] py-3.5 px-6 text-center text-sm font-bold text-[#0D47A1]">
        TRƯỜNG THPT THANH HÒA - Đồng hành cùng sự phát triển của học sinh!
      </footer>
    </div>
  );
};
