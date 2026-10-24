import React, { useRef, useState } from 'react';
import {
  Building2,
  Database,
  Download,
  History,
  KeyRound,
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

export const SettingsPage: React.FC = () => {
  const {
    state,
    sessionRole,
    setSessionRole,
    firebaseUser,
    loginWithGoogle,
    logoutUser,
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

      {/* Row 2: Phân quyền 4 vai trò & Quản lý dữ liệu DEMO / Cloud SQL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="crystal-card rounded-2xl p-5 space-y-4 text-xs">
          <div className="flex items-center gap-2 border-b border-[#D7EAFE] pb-2.5">
            <Shield className="w-5 h-5 text-[#0D47A1]" />
            <h3 className="text-base font-bold text-[#0D47A1]">
              3. Phân quyền Người dùng (4 Vai trò Chuẩn THPT)
            </h3>
          </div>

          <p className="text-[#64748B]">
            Chọn vai trò bên dưới để kiểm tra phân quyền trực tiếp trên ứng dụng (Đặc biệt: Tổ trưởng chỉ được xem và chấm điểm tổ được phân trực).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() =>
                setSessionRole({
                  role: 'ADMIN',
                  actorName: 'Quản trị hệ thống THPT Thanh Hòa',
                })
              }
              className={`p-3 rounded-xl border text-left ${
                sessionRole.role === 'ADMIN'
                  ? 'bg-[#0D47A1] text-white border-[#0D47A1]'
                  : 'bg-[#F4FAFF] border-[#D7EAFE] text-[#17365D]'
              }`}
            >
              <div className="font-bold">1. Quản trị hệ thống</div>
              <div className="text-[11px] opacity-80 mt-0.5">
                Quản lý trường, năm học, sao lưu & phân quyền toàn trường
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setSessionRole({
                  role: 'GVCN',
                  actorName: 'Nguyễn Tiến Dương',
                })
              }
              className={`p-3 rounded-xl border text-left ${
                sessionRole.role === 'GVCN'
                  ? 'bg-[#0D47A1] text-white border-[#0D47A1]'
                  : 'bg-[#F4FAFF] border-[#D7EAFE] text-[#17365D]'
              }`}
            >
              <div className="font-bold">
                2. Giáo viên chủ nhiệm (Nguyễn Tiến Dương)
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">
                Toàn quyền quản lý 8 phân hệ của Lớp 10A3
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setSessionRole({
                  role: 'GV_PHAN_CONG',
                  actorName: 'Giáo viên bộ môn phối hợp',
                })
              }
              className={`p-3 rounded-xl border text-left ${
                sessionRole.role === 'GV_PHAN_CONG'
                  ? 'bg-[#0D47A1] text-white border-[#0D47A1]'
                  : 'bg-[#F4FAFF] border-[#D7EAFE] text-[#17365D]'
              }`}
            >
              <div className="font-bold">3. Giáo viên được phân công</div>
              <div className="text-[11px] opacity-80 mt-0.5">
                Phối hợp theo dõi chuyên cần, học tập và ghi nhận thi đua
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                const grp1 = state.groups[0];
                setSessionRole({
                  role: 'TO_TRUONG',
                  actorName: 'Lê Hoàng Minh Quân (Tổ trưởng Tổ 1)',
                  groupId: grp1?.id || 'group-1',
                });
              }}
              className={`p-3 rounded-xl border text-left ${
                sessionRole.role === 'TO_TRUONG'
                  ? 'bg-[#0D47A1] text-white border-[#0D47A1]'
                  : 'bg-[#F4FAFF] border-[#D7EAFE] text-[#17365D]'
              }`}
            >
              <div className="font-bold">
                4. Cán bộ lớp / Tổ trưởng trực thi đua
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">
                Chỉ hiển thị danh sách tổ được phân trực chấm & nút hoàn tác
              </div>
            </button>
          </div>
        </div>

        {/* Quản lý Dữ liệu DEMO & Xác thực tài khoản */}
        <div className="crystal-card rounded-2xl p-5 space-y-4 text-xs">
          <div className="flex items-center gap-2 border-b border-[#D7EAFE] pb-2.5">
            <Database className="w-5 h-5 text-[#0D47A1]" />
            <h3 className="text-base font-bold text-[#0D47A1]">
              4. Quản lý Chế độ Dữ liệu DEMO & Tài khoản Đám mây
            </h3>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F4FAFF] border border-[#D7EAFE] space-y-2">
            <div className="font-bold text-[#17365D]">
              Trạng thái tài khoản xác thực:
            </div>
            {firebaseUser ? (
              <div className="flex items-center justify-between">
                <span className="text-[#16A34A] font-bold">
                  Đã đăng nhập: {firebaseUser.email}
                </span>
                <button
                  type="button"
                  onClick={logoutUser}
                  className="px-3 py-1.5 rounded-lg border border-[#D7EAFE] bg-white font-bold text-[#DC2626] flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">
                  Chưa đăng nhập tài khoản Google (Đang lưu cục bộ trên trình duyệt)
                </span>
                <button
                  type="button"
                  onClick={loginWithGoogle}
                  className="px-3 py-1.5 rounded-lg bg-[#0D47A1] text-white font-bold flex items-center gap-1"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đăng nhập Google</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
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
