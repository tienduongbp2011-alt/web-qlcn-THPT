import React, { useRef, useState } from 'react';
import {
  Building2,
  Check,
  CloudUpload,
  Copy,
  Database,
  Download,
  History,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Trash2,
  Upload,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import { SUPABASE_SETUP_SQL, SUPABASE_URL } from '../../lib/supabase.ts';
import { getDefaultAuthCredentials } from '../../services/demoData.ts';

export const SettingsPage: React.FC = () => {
  const {
    state,
    sessionRole,
    setSessionRole,
    logoutSession,
    updateAuthCredentials,
    supabaseStatus,
    supabaseStatusDetail,
    lastSupabaseSyncAt,
    syncNowWithSupabase,
    pullFromSupabase,
    showToast,
    clearDemoData,
    resetDemoData,
    importFullWorkspaceJson,
    updateSchoolInfo,
    addOrUpdateClass,
    setCurrentClassId,
    addOrUpdateSchoolYear,
    addFinanceCategory,
  } = useWorkspace();

  const backupFileInputRef = useRef<HTMLInputElement | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(true);
  const [copiedSql, setCopiedSql] = useState(false);

  const initialCreds = state.authCredentials || getDefaultAuthCredentials();
  const [gvcnUsername, setGvcnUsername] = useState(initialCreds.gvcnUsername);
  const [gvcnPassword, setGvcnPassword] = useState(initialCreds.gvcnPassword);
  const [leaderAccounts, setLeaderAccounts] = useState(
    initialCreds.groupLeaderAccounts
  );

  // School Form
  const [schoolName, setSchoolName] = useState(state.school.name);
  const [schoolAddress, setSchoolAddress] = useState(state.school.address);
  const [schoolPrincipal, setSchoolPrincipal] = useState(
    state.school.principalName
  );
  const [schoolMotto, setSchoolMotto] = useState(state.school.motto);

  // New Class Form
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState('Khối 10');
  const [newClassTeacher, setNewClassTeacher] = useState('Nguyễn Tiến Dương');
  const [newClassRoom, setNewClassRoom] = useState('Phòng A204');

  // New School Year Form
  const [newYearName, setNewYearName] = useState('2027–2028');

  // New Finance Category Form
  const [newFinCatName, setNewFinCatName] = useState('');
  const [newFinCatType, setNewFinCatType] = useState<'THU' | 'CHI'>('CHI');

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    updateAuthCredentials({
      gvcnUsername: gvcnUsername.trim() || 'gvcn',
      gvcnPassword: gvcnPassword.trim() || '123456',
      groupLeaderAccounts: leaderAccounts.map((acc, idx) => ({
        groupId: acc.groupId,
        username: acc.username.trim() || `to${idx + 1}`,
        password: acc.password.trim() || '123456',
      })),
    });
  };

  const handleSaveSchool = (e: React.FormEvent) => {
    e.preventDefault();
    updateSchoolInfo({
      ...state.school,
      name: schoolName.trim() || 'TRƯỜNG THPT THANH HÒA',
      address: schoolAddress.trim(),
      principalName: schoolPrincipal.trim(),
      motto: schoolMotto.trim(),
    });
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    const newId = `class-${Date.now()}`;
    addOrUpdateClass({
      id: newId,
      schoolId: state.school.id,
      schoolYearId: state.currentSchoolYearId,
      name: newClassName.trim(),
      grade: newClassGrade,
      homeroomTeacher: newClassTeacher.trim() || 'Nguyễn Tiến Dương',
      roomNumber: newClassRoom.trim(),
    });
    setNewClassName('');
  };

  const handleExportBackupJson = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sao_Luu_Thanh_Hoa_Class_Manager_10A3_${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackupJson = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      importFullWorkspaceJson(parsed);
    } catch (err) {
      console.error('Invalid backup file:', err);
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="crystal-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-[#0D47A1] uppercase tracking-wider">
            PHÂN HỆ 8 · CÀI ĐẶT HỆ THỐNG, PHÂN QUYỀN, SAO LƯU & NHẬT KÝ HOẠT ĐỘNG
          </div>
          <h2 className="text-2xl font-bold text-[#17365D] mt-1">
            Quản trị Hệ thống THANH HÒA CLASS MANAGER
          </h2>
          <p className="text-sm text-[#64748B] mt-0.5">
            Quản lý thông tin Trường THPT Thanh Hòa, nhiều lớp và năm học, phân quyền 4 vai trò, sao lưu phục hồi dữ liệu và kiểm toán.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportBackupJson}
            className="px-3.5 py-2 rounded-lg bg-[#0D47A1] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#17365D]"
          >
            <Download className="w-4 h-4" />
            <span>Sao lưu toàn bộ dữ liệu (.JSON)</span>
          </button>

          <input
            ref={backupFileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportBackupJson}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => backupFileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-lg border border-[#0D47A1] bg-white text-[#0D47A1] text-xs font-bold flex items-center gap-1.5 hover:bg-[#E3F2FD]"
          >
            <Upload className="w-4 h-4" />
            <span>Phục hồi từ bản sao lưu</span>
          </button>
        </div>
      </div>

      {/* Row 1: Thông tin trường & Quản lý lớp / Năm học */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={handleSaveSchool}
          className="crystal-card rounded-2xl p-5 space-y-3.5 text-xs"
        >
          <div className="flex items-center gap-2 border-b border-[#D7EAFE] pb-2.5">
            <Building2 className="w-5 h-5 text-[#0D47A1]" />
            <h3 className="text-base font-bold text-[#0D47A1]">
              1. Thông tin Trường & Giáo viên Chủ nhiệm
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#17365D] mb-1">
                Tên trường THPT
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE] font-bold text-[#0D47A1]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#17365D] mb-1">
                Ban Giám hiệu / Hiệu trưởng
              </label>
              <input
                type="text"
                value={schoolPrincipal}
                onChange={(e) => setSchoolPrincipal(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#17365D] mb-1">
              Địa chỉ đơn vị
            </label>
            <input
              type="text"
              value={schoolAddress}
              onChange={(e) => setSchoolAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
            />
          </div>

          <div>
            <label className="block font-bold text-[#17365D] mb-1">
              Khẩu hiệu / Dòng chân trang (Footer)
            </label>
            <input
              type="text"
              value={schoolMotto}
              onChange={(e) => setSchoolMotto(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#0D47A1] text-white font-bold flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Lưu thông tin trường</span>
            </button>
          </div>
        </form>

        {/* Quản lý Danh sách Lớp & Năm học */}
        <div className="crystal-card rounded-2xl p-5 space-y-4 text-xs">
          <h3 className="text-base font-bold text-[#0D47A1] border-b border-[#D7EAFE] pb-2.5">
            2. Quản lý Danh sách Lớp, Năm học & Học kỳ
          </h3>

          <div className="space-y-2">
            <div className="font-bold text-[#17365D]">
              Các lớp đang quản lý ({state.classes.length} lớp):
            </div>
            <div className="flex flex-wrap gap-2">
              {state.classes.map((cls) => (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => setCurrentClassId(cls.id)}
                  className={`px-3 py-2 rounded-xl border text-left transition-colors ${
                    cls.id === state.currentClassId
                      ? 'bg-[#0D47A1] text-white border-[#0D47A1] font-bold'
                      : 'bg-[#F4FAFF] border-[#D7EAFE] text-[#17365D]'
                  }`}
                >
                  <div>Lớp {cls.name}</div>
                  <div
                    className={`text-[11px] ${
                      cls.id === state.currentClassId
                        ? 'text-[#E3F2FD]'
                        : 'text-[#64748B]'
                    }`}
                  >
                    GVCN: {cls.homeroomTeacher}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleCreateClass}
            className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-[#D7EAFE] items-end"
          >
            <div>
              <label className="block font-bold text-[#17365D] mb-1">
                Tên lớp mới
              </label>
              <input
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="VD: 10A4"
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#D7EAFE]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#17365D] mb-1">
                Khối
              </label>
              <select
                value={newClassGrade}
                onChange={(e) => setNewClassGrade(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#D7EAFE]"
              >
                <option value="Khối 10">Khối 10</option>
                <option value="Khối 11">Khối 11</option>
                <option value="Khối 12">Khối 12</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#17365D] mb-1">
                GV Chủ nhiệm
              </label>
              <input
                type="text"
                value={newClassTeacher}
                onChange={(e) => setNewClassTeacher(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#D7EAFE]"
              />
            </div>
            <button
              type="submit"
              className="py-1.5 px-3 rounded-lg bg-[#0D47A1] text-white font-bold flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm lớp</span>
            </button>
          </form>

          {/* Năm học & Danh mục tài chính */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#D7EAFE]">
            <div>
              <label className="block font-bold text-[#17365D] mb-1">
                Thêm Năm học mới:
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newYearName}
                  onChange={(e) => setNewYearName(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#D7EAFE]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newYearName.trim()) return;
                    addOrUpdateSchoolYear({
                      id: `sy-${Date.now()}`,
                      name: newYearName.trim(),
                      startDate: '2027-09-01',
                      endDate: '2028-05-31',
                      isCurrent: false,
                    });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#E3F2FD] text-[#0D47A1] font-bold"
                >
                  Thêm
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#17365D] mb-1">
                Thêm Danh mục Tài chính:
              </label>
              <div className="flex gap-1">
                <select
                  value={newFinCatType}
                  onChange={(e) =>
                    setNewFinCatType(e.target.value as 'THU' | 'CHI')
                  }
                  className="px-2 py-1.5 rounded-lg border border-[#D7EAFE]"
                >
                  <option value="THU">THU</option>
                  <option value="CHI">CHI</option>
                </select>
                <input
                  type="text"
                  value={newFinCatName}
                  onChange={(e) => setNewFinCatName(e.target.value)}
                  placeholder="Tên danh mục..."
                  className="flex-1 px-2 py-1.5 rounded-lg border border-[#D7EAFE]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newFinCatName.trim()) return;
                    addFinanceCategory({
                      name: newFinCatName.trim(),
                      type: newFinCatType,
                      description: newFinCatName.trim(),
                      isActive: true,
                    });
                    setNewFinCatName('');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#16A34A] text-white font-bold"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Quản lý Tài khoản & Mật khẩu Đăng nhập + Kết nối Supabase */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={handleSaveCredentials}
          className="crystal-card rounded-2xl p-5 space-y-4 text-xs"
        >
          <div className="flex items-center justify-between border-b border-[#D7EAFE] pb-2.5">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#0D47A1]" />
              <h3 className="text-base font-bold text-[#0D47A1]">
                3. Quản lý Tài khoản & Mật khẩu Đăng nhập (GVCN & 4 Tổ trưởng)
              </h3>
            </div>
            <button
              type="button"
              onClick={logoutSession}
              className="px-2.5 py-1 rounded-lg border border-[#D7EAFE] bg-white text-[#DC2626] font-bold hover:bg-[#FEF2F2]"
            >
              Mở Cửa sổ Đăng nhập
            </button>
          </div>

          <p className="text-[#64748B]">
            Cấp phát tên tài khoản và mật khẩu cho GVCN (vào thẳng Trang chính) và 4 Tổ trưởng trực thi đua (vào thẳng trang Chấm điểm tổ được phân trực).
          </p>

          {/* Tài khoản GVCN */}
          <div className="p-3 rounded-xl bg-[#F4FAFF] border border-[#D7EAFE] space-y-2">
            <div className="font-bold text-[#0D47A1]">
              1. Tài khoản Giáo viên Chủ nhiệm (Toàn quyền 8 phân hệ):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-[#17365D] mb-1">
                  Tên đăng nhập GVCN
                </label>
                <input
                  type="text"
                  value={gvcnUsername}
                  onChange={(e) => setGvcnUsername(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#D7EAFE] bg-white font-mono font-bold text-[#0D47A1]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#17365D] mb-1">
                  Mật khẩu GVCN
                </label>
                <input
                  type="text"
                  value={gvcnPassword}
                  onChange={(e) => setGvcnPassword(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#D7EAFE] bg-white font-mono font-bold text-[#17365D]"
                />
              </div>
            </div>
          </div>

          {/* 4 Tài khoản Tổ trưởng */}
          <div className="space-y-2">
            <div className="font-bold text-[#0D47A1]">
              2. Tài khoản 4 Tổ trưởng trực thi đua (Vào thẳng trang Chấm điểm tổ trực):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {state.groups.map((grp, idx) => {
                const acc =
                  leaderAccounts.find((a) => a.groupId === grp.id) || {
                    groupId: grp.id,
                    username: `to${idx + 1}`,
                    password: '123456',
                  };
                const targetGrp = state.groups.find(
                  (g) => g.id === grp.dutyTargetGroupId
                );
                return (
                  <div
                    key={grp.id}
                    className="p-2.5 rounded-xl bg-[#F4FAFF] border border-[#D7EAFE] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#17365D]">
                        Tổ trưởng {grp.name}
                      </span>
                      <span className="text-[11px] font-bold text-[#FF8A00]">
                        Chấm: {targetGrp?.name || 'Tổ trực'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="block text-[10px] text-[#64748B]">
                          Tài khoản
                        </label>
                        <input
                          type="text"
                          value={acc.username}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLeaderAccounts((prev) =>
                              prev.map((item) =>
                                item.groupId === grp.id
                                  ? { ...item, username: val }
                                  : item
                              )
                            );
                          }}
                          className="w-full px-2 py-1 rounded border border-[#D7EAFE] bg-white font-mono font-bold text-[#0D47A1]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#64748B]">
                          Mật khẩu
                        </label>
                        <input
                          type="text"
                          value={acc.password}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLeaderAccounts((prev) =>
                              prev.map((item) =>
                                item.groupId === grp.id
                                  ? { ...item, password: val }
                                  : item
                              )
                            );
                          }}
                          className="w-full px-2 py-1 rounded border border-[#D7EAFE] bg-white font-mono font-bold text-[#17365D]"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#D7EAFE]">
            <div className="text-[11px] text-[#64748B]">
              Tài khoản và mật khẩu sẽ được đồng bộ trực tiếp lên Supabase.
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#0D47A1] text-white font-bold flex items-center gap-1.5 hover:bg-[#17365D]"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Tài khoản & Mật khẩu</span>
            </button>
          </div>
        </form>

        {/* Quản lý Cơ sở dữ liệu Supabase & Dữ liệu DEMO */}
        <div className="crystal-card rounded-2xl p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-[#D7EAFE] pb-2.5">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-[#0D47A1]" />
              <h3 className="text-base font-bold text-[#0D47A1]">
                4. Kết nối Cơ sở dữ liệu Supabase & Dữ liệu DEMO
              </h3>
            </div>
            <span
              className={`font-bold ${
                supabaseStatus === 'CONNECTED'
                  ? 'text-[#16A34A]'
                  : supabaseStatus === 'NEEDS_TABLE_SETUP'
                  ? 'text-[#FF8A00]'
                  : 'text-[#0D47A1]'
              }`}
            >
              {supabaseStatus === 'CONNECTED'
                ? '● Đã kết nối Supabase'
                : supabaseStatus === 'NEEDS_TABLE_SETUP'
                ? '● Cần tạo bảng lần đầu'
                : supabaseStatus === 'CONNECTING'
                ? '● Đang kết nối...'
                : '● Lỗi kết nối'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F4FAFF] border border-[#D7EAFE] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-bold text-[#17365D]">
                  Máy chủ Supabase Project:
                </div>
                <div className="text-[#0D47A1] font-mono text-[11px] break-all">
                  {SUPABASE_URL}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={syncNowWithSupabase}
                  className="px-3 py-1.5 rounded-lg bg-[#0D47A1] text-white font-bold flex items-center gap-1.5 hover:bg-[#17365D]"
                >
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span>Đẩy dữ liệu lên Supabase</span>
                </button>
                <button
                  type="button"
                  onClick={pullFromSupabase}
                  className="px-3 py-1.5 rounded-lg border border-[#0D47A1] bg-white text-[#0D47A1] font-bold flex items-center gap-1.5 hover:bg-[#E3F2FD]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tải từ Supabase về</span>
                </button>
              </div>
            </div>

            <div className="text-[#17365D] pt-1 border-t border-[#D7EAFE]">
              Trạng thái: <strong>{supabaseStatusDetail}</strong>
              {lastSupabaseSyncAt && (
                <span className="text-[#64748B] ml-2">
                  (Đồng bộ lúc: {new Date(lastSupabaseSyncAt).toLocaleString('vi-VN')})
                </span>
              )}
            </div>

            {/* Hướng dẫn & Nút copy mã SQL tạo bảng trên Supabase */}
            <div className="pt-2 border-t border-[#D7EAFE] space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[#64748B]">
                  Nếu Project Supabase của bạn mới tạo và chưa có bảng dữ liệu:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
                      setCopiedSql(true);
                      showToast(
                        'Đã sao chép lệnh SQL! Hãy dán vào mục SQL Editor trên Supabase rồi nhấn RUN.',
                        'success'
                      );
                      setTimeout(() => setCopiedSql(false), 3000);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#16A34A] text-white font-bold flex items-center gap-1.5 hover:opacity-90"
                  >
                    {copiedSql ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {copiedSql
                        ? 'Đã chép lệnh SQL!'
                        : 'Sao chép mã SQL khởi tạo bảng Supabase'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSqlModal(!showSqlModal)}
                    className="px-2.5 py-1.5 rounded-lg border border-[#D7EAFE] bg-white text-[#0D47A1] font-bold hover:bg-[#E3F2FD]"
                  >
                    {showSqlModal ? 'Ẩn mã SQL' : 'Xem mã SQL'}
                  </button>
                </div>
              </div>

              {showSqlModal && (
                <div className="mt-2 space-y-1.5">
                  <div className="text-[11px] text-[#0D47A1] font-semibold">
                    Hướng dẫn: Vào trang quản trị Supabase &rarr; mục <strong>SQL Editor</strong> (menu trái) &rarr; nhấn <strong>New Query</strong> &rarr; Dán đoạn mã dưới đây vào và nhấn <strong>RUN</strong>:
                  </div>
                  <pre className="p-3 rounded-lg bg-[#0F172A] text-[#E2E8F0] font-mono text-[11px] max-h-56 overflow-y-auto whitespace-pre-wrap">
                    {SUPABASE_SETUP_SQL}
                  </pre>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={clearDemoData}
              className="px-4 py-2 rounded-lg bg-[#DC2626] text-white font-bold flex items-center gap-1.5 hover:opacity-90"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa sạch dữ liệu DEMO (Bắt đầu nhập dữ liệu thật)</span>
            </button>

            <button
              type="button"
              onClick={resetDemoData}
              className="px-4 py-2 rounded-lg border border-[#0D47A1] text-[#0D47A1] font-bold flex items-center gap-1.5 hover:bg-[#E3F2FD]"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Khôi phục dữ liệu mẫu DEMO Lớp 10A3</span>
            </button>
          </div>
        </div>
      </div>

      {/* Row 3: Nhật ký hoạt động kiểm toán (Audit Logs) */}
      <div className="crystal-card rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 border-b border-[#D7EAFE] pb-2.5">
          <History className="w-5 h-5 text-[#0D47A1]" />
          <h3 className="text-base font-bold text-[#0D47A1]">
            5. Nhật ký Hoạt động & Kiểm toán Hệ thống ({state.auditLogs.length} bản ghi)
          </h3>
        </div>

        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#E3F2FD] text-[#0D47A1] text-left">
                <th className="py-2 px-3 font-bold">Thời gian</th>
                <th className="py-2 px-3 font-bold">Người thực hiện</th>
                <th className="py-2 px-3 font-bold">Vai trò</th>
                <th className="py-2 px-3 font-bold">Phân hệ</th>
                <th className="py-2 px-3 font-bold">Hành động</th>
                <th className="py-2 px-3 font-bold">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D7EAFE]">
              {state.auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#F4FAFF]">
                  <td className="py-2 px-3 text-[#64748B] tabular-nums">
                    {log.timestamp}
                  </td>
                  <td className="py-2 px-3 font-bold text-[#17365D]">
                    {log.actorName}
                  </td>
                  <td className="py-2 px-3 font-semibold text-[#0D47A1]">
                    {log.actorRole}
                  </td>
                  <td className="py-2 px-3 text-[#17365D]">{log.module}</td>
                  <td className="py-2 px-3 font-bold text-[#0D47A1]">
                    {log.action}
                  </td>
                  <td className="py-2 px-3 text-[#64748B]">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
