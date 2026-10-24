import React, { useMemo, useRef, useState } from 'react';
import {
  Archive,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  Plus,
  Printer,
  Search,
  Shuffle,
  Trash2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import { Student, StudentStatus } from '../../types/index.ts';
import {
  calculateStudentRankings,
  formatVietnameseDate,
} from '../../utils/calculations.ts';
import {
  downloadStudentExcelTemplate,
  exportToExcelFile,
  parseStudentsFromExcelFile,
} from '../../utils/exportUtils.ts';

export const StudentsPage: React.FC = () => {
  const {
    state,
    addStudent,
    updateStudent,
    deleteOrArchiveStudent,
    importStudentsBatch,
    autoAssignStudentsToGroups,
  } = useWorkspace();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState('ALL');
  const [filterGender, setFilterGender] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState<'code' | 'name' | 'score'>('code');

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [confirmDeleteStudent, setConfirmDeleteStudent] =
    useState<Student | null>(null);

  // Form fields
  const [studentCode, setStudentCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('2011-05-15');
  const [gender, setGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [groupId, setGroupId] = useState(state.groups[0]?.id || 'group-1');
  const [position, setPosition] = useState('Thành viên');
  const [parentPhone, setParentPhone] = useState('');
  const [initialScore, setInitialScore] = useState<number>(100);
  const [status, setStatus] = useState<StudentStatus>('Đang học');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const criteriaMap = useMemo(
    () => new Map(state.criteria.map((c) => [c.id, c])),
    [state.criteria]
  );

  const rankingsMap = useMemo(() => {
    const ranked = calculateStudentRankings(
      state.students,
      state.groups,
      state.competitionRecords,
      criteriaMap
    );
    return new Map(ranked.map((r) => [r.studentId, r]));
  }, [state.students, state.groups, state.competitionRecords, criteriaMap]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = state.students.filter((st) => {
      if (
        q &&
        !st.fullName.toLowerCase().includes(q) &&
        !st.studentCode.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (filterGroup !== 'ALL' && st.groupId !== filterGroup) return false;
      if (filterGender !== 'ALL' && st.gender !== filterGender) return false;
      if (filterStatus !== 'ALL' && st.status !== filterStatus) return false;
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'name') {
        return a.fullName.localeCompare(b.fullName, 'vi');
      }
      if (sortBy === 'score') {
        const scoreA = rankingsMap.get(a.id)?.finalScore ?? a.initialScore;
        const scoreB = rankingsMap.get(b.id)?.finalScore ?? b.initialScore;
        return scoreB - scoreA;
      }
      return a.studentCode.localeCompare(b.studentCode, 'vi');
    });

    return list;
  }, [
    state.students,
    searchQuery,
    filterGroup,
    filterGender,
    filterStatus,
    sortBy,
    rankingsMap,
  ]);

  const openAddModal = () => {
    setEditingStudent(null);
    const nextIdx = state.students.length + 1;
    setStudentCode(`HS10A3-${String(nextIdx).padStart(2, '0')}`);
    setFullName('');
    setDob('2011-05-15');
    setGender('Nam');
    setGroupId(state.groups[0]?.id || 'group-1');
    setPosition('Thành viên');
    setParentPhone('');
    setInitialScore(100);
    setStatus('Đang học');
    setNotes('');
    setFormError('');
    setFormOpen(true);
  };

  const openEditModal = (st: Student) => {
    setEditingStudent(st);
    setStudentCode(st.studentCode);
    setFullName(st.fullName);
    setDob(st.dob);
    setGender(st.gender);
    setGroupId(st.groupId);
    setPosition(st.position);
    setParentPhone(st.parentPhone);
    setInitialScore(st.initialScore ?? 100);
    setStatus(st.status);
    setNotes(st.notes);
    setFormError('');
    setFormOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentCode.trim() || !fullName.trim()) {
      setFormError('Vui lòng nhập đầy đủ Mã học sinh và Họ và tên.');
      return;
    }

    if (editingStudent) {
      updateStudent({
        ...editingStudent,
        studentCode: studentCode.trim(),
        fullName: fullName.trim(),
        dob,
        gender,
        groupId,
        position: position.trim() || 'Thành viên',
        parentPhone: parentPhone.trim(),
        initialScore: Number(initialScore) || 100,
        status,
        notes: notes.trim(),
      });
    } else {
      addStudent({
        classId: state.currentClassId,
        studentCode: studentCode.trim(),
        fullName: fullName.trim(),
        dob,
        gender,
        groupId,
        position: position.trim() || 'Thành viên',
        parentPhone: parentPhone.trim(),
        initialScore: Number(initialScore) || 100,
        status,
        notes: notes.trim(),
        isDemo: false,
      });
    }
    setFormOpen(false);
  };

  const handleExcelFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseStudentsFromExcelFile(
        file,
        state.currentClassId,
        state.groups
      );
      importStudentsBatch(parsed);
    } catch (err) {
      console.error('Excel import error:', err);
    } finally {
      e.target.value = '';
    }
  };

  const handleExportExcel = () => {
    const rows = filteredStudents.map((st, idx) => {
      const grpName =
        state.groups.find((g) => g.id === st.groupId)?.name || st.groupId;
      const rankInfo = rankingsMap.get(st.id);
      return {
        STT: idx + 1,
        'Mã học sinh': st.studentCode,
        'Họ và tên': st.fullName,
        'Ngày sinh': formatVietnameseDate(st.dob),
        'Giới tính': st.gender,
        Lớp: '10A3',
        Tổ: grpName,
        'Chức vụ': st.position,
        'SĐT Phụ huynh': st.parentPhone,
        'Điểm ban đầu': st.initialScore,
        'Điểm cộng kỳ': rankInfo?.bonusPoints ?? 0,
        'Điểm trừ kỳ': rankInfo?.penaltyPoints ?? 0,
        'Tổng điểm thi đua': rankInfo?.finalScore ?? st.initialScore,
        'Trạng thái': st.status,
        'Ghi chú': st.notes,
      };
    });
    exportToExcelFile(
      rows,
      'DanhSachHocSinh10A3',
      `Danh_Sach_Hoc_Sinh_Lop_10A3_THPT_Thanh_Hoa.xlsx`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Action Toolbar */}
      <div className="crystal-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <div className="text-xs font-bold text-[#0D47A1] uppercase tracking-wider">
            PHÂN HỆ 2 · QUẢN LÝ HỒ SƠ HỌC SINH LỚP 10A3
          </div>
          <h2 className="text-2xl font-bold text-[#17365D] mt-1">
            Danh sách Học sinh & Phân bổ 4 Tổ Thi đua ({filteredStudents.length} học sinh)
          </h2>
          <p className="text-sm text-[#64748B] mt-0.5">
            Điểm thi đua khởi đầu mặc định: 100 điểm/học sinh. Hỗ trợ nhập/xuất Excel (.xlsx) và hồ sơ chi tiết từng em.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openAddModal}
            className="px-3.5 py-2 rounded-lg bg-[#0D47A1] text-white text-xs sm:text-sm font-bold hover:bg-[#17365D] flex items-center gap-1.5 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Thêm học sinh</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-lg bg-[#16A34A] text-white text-xs sm:text-sm font-bold hover:opacity-90 flex items-center gap-1.5 transition-opacity"
          >
            <Upload className="w-4 h-4" />
            <span>Nhập từ Excel</span>
          </button>

          <button
            type="button"
            onClick={downloadStudentExcelTemplate}
            className="px-3 py-2 rounded-lg border border-[#D7EAFE] bg-white hover:bg-[#E3F2FD] text-xs font-bold text-[#0D47A1] flex items-center gap-1.5 transition-colors"
            title="Tải file Excel mẫu để nhập học sinh"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Tải file mẫu</span>
          </button>

          <button
            type="button"
            onClick={autoAssignStudentsToGroups}
            className="px-3 py-2 rounded-lg border border-[#D7EAFE] bg-white hover:bg-[#E3F2FD] text-xs font-bold text-[#0D47A1] flex items-center gap-1.5 transition-colors"
            title="Tự động chia đều danh sách học sinh vào 4 tổ"
          >
            <Shuffle className="w-4 h-4" />
            <span>Chia đều 4 tổ</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-lg border border-[#0D47A1] bg-white hover:bg-[#E3F2FD] text-xs font-bold text-[#0D47A1] flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Excel</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-2 rounded-lg bg-[#FF8A00] text-white text-xs font-bold hover:opacity-90 flex items-center gap-1.5 transition-opacity"
          >
            <Printer className="w-4 h-4" />
            <span>In danh sách</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="crystal-card rounded-2xl p-4 no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo họ tên hoặc mã học sinh (VD: HS10A3-01)..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#D7EAFE] bg-white text-sm focus:outline-none focus:border-[#0D47A1]"
          />
        </div>

        <select
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#D7EAFE] bg-white text-sm text-[#17365D]"
        >
          <option value="ALL">Tất cả 4 tổ</option>
          {state.groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        <select
          value={filterGender}
          onChange={(e) => setFilterGender(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#D7EAFE] bg-white text-sm text-[#17365D]"
        >
          <option value="ALL">Tất cả giới tính</option>
          <option value="Nam">Nam</option>
          <option value="Nữ">Nữ</option>
        </select>

        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-1/2 px-2.5 py-2 rounded-lg border border-[#D7EAFE] bg-white text-sm text-[#17365D]"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="Đang học">Đang học</option>
            <option value="Chuyển lớp">Chuyển lớp</option>
            <option value="Bảo lưu">Bảo lưu</option>
            <option value="Đã lưu trữ">Đã lưu trữ</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'code' | 'name' | 'score')
            }
            className="w-1/2 px-2.5 py-2 rounded-lg border border-[#D7EAFE] bg-white text-sm text-[#17365D]"
          >
            <option value="code">Xếp: Mã HS</option>
            <option value="name">Xếp: Họ tên</option>
            <option value="score">Xếp: Điểm TĐ</option>
          </select>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print-only mb-4 text-center border-b-2 border-[#0D47A1] pb-3">
        <div className="text-base font-bold">{state.school.name}</div>
        <h2 className="text-xl font-bold mt-1">
          DANH SÁCH HỌC SINH LỚP 10A3 – NĂM HỌC 2026–2027
        </h2>
        <div className="text-sm mt-1">
          Giáo viên chủ nhiệm: Nguyễn Tiến Dương · Ngày in:{' '}
          {new Date().toLocaleDateString('vi-VN')}
        </div>
      </div>

      {/* Student Table */}
      <div className="crystal-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#E3F2FD] text-[#0D47A1] text-left">
                <th className="py-3 px-3 font-bold">STT</th>
                <th className="py-3 px-3 font-bold">Mã HS</th>
                <th className="py-3 px-3 font-bold">Họ và tên</th>
                <th className="py-3 px-3 font-bold">Ngày sinh</th>
                <th className="py-3 px-3 font-bold">Giới tính</th>
                <th className="py-3 px-3 font-bold">Tổ thi đua</th>
                <th className="py-3 px-3 font-bold">Chức vụ</th>
                <th className="py-3 px-3 font-bold">SĐT Phụ huynh</th>
                <th className="py-3 px-3 font-bold text-right">Điểm gốc</th>
                <th className="py-3 px-3 font-bold text-right">Điểm hiện tại</th>
                <th className="py-3 px-3 font-bold">Trạng thái</th>
                <th className="py-3 px-3 font-bold text-center no-print">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D7EAFE]">
              {filteredStudents.map((st, idx) => {
                const rankInfo = rankingsMap.get(st.id);
                const currentScore = rankInfo?.finalScore ?? st.initialScore;
                return (
                  <tr key={st.id} className="hover:bg-[#F4FAFF]">
                    <td className="py-2.5 px-3 text-[#64748B] tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#0D47A1] tabular-nums">
                      {st.studentCode}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#17365D]">
                      {st.fullName}
                    </td>
                    <td className="py-2.5 px-3 text-[#64748B] tabular-nums">
                      {formatVietnameseDate(st.dob)}
                    </td>
                    <td className="py-2.5 px-3 text-[#17365D]">{st.gender}</td>
                    <td className="py-2.5 px-3">
                      <select
                        value={st.groupId}
                        onChange={(e) =>
                          updateStudent({ ...st, groupId: e.target.value })
                        }
                        className="px-2 py-1 rounded border border-[#D7EAFE] bg-white text-xs font-bold text-[#0D47A1]"
                      >
                        {state.groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-3 text-[#17365D]">{st.position}</td>
                    <td className="py-2.5 px-3 text-xs text-[#64748B] tabular-nums">
                      {st.parentPhone || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#64748B] tabular-nums">
                      {st.initialScore}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#0D47A1] tabular-nums">
                      {currentScore}đ
                    </td>
                    <td className="py-2.5 px-3 text-xs font-semibold text-[#16A34A]">
                      {st.status}
                    </td>
                    <td className="py-2.5 px-3 no-print">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingStudent(st)}
                          className="p-1.5 rounded-lg border border-[#D7EAFE] text-[#0D47A1] hover:bg-[#E3F2FD]"
                          title="Xem hồ sơ chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(st)}
                          className="p-1.5 rounded-lg border border-[#D7EAFE] text-[#17365D] hover:bg-[#E3F2FD]"
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteStudent(st)}
                          className="p-1.5 rounded-lg border border-[#D7EAFE] text-[#DC2626] hover:bg-red-50"
                          title="Lưu trữ hoặc Xóa học sinh"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredStudents.length === 0 && (
                <tr>
                  <td
                    colSpan={12}
                    className="py-10 text-center text-[#64748B]"
                  >
                    Chưa có học sinh phù hợp bộ lọc. Hãy nhấn{' '}
                    <strong>"Thêm học sinh"</strong> hoặc{' '}
                    <strong>"Nhập từ Excel"</strong>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD / EDIT STUDENT */}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl border border-[#D7EAFE] max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#D7EAFE]">
              <h3 className="text-lg font-bold text-[#0D47A1]">
                {editingStudent
                  ? `Chỉnh sửa Hồ sơ: ${editingStudent.fullName}`
                  : 'Thêm Học sinh Mới vào Lớp 10A3'}
              </h3>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#17365D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-bold text-[#DC2626]">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveStudent} className="space-y-3.5 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#17365D] mb-1">
                    Mã học sinh *
                  </label>
                  <input
                    type="text"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#17365D] mb-1">
                    Họ và tên học sinh *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="VD: Nguyễn Minh An"
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#17365D] mb-1">
                    Ngày sinh
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#17365D] mb-1">
                    Giới tính
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'Nam' | 'Nữ')}
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#17365D] mb-1">
                    Tổ thi đua
                  </label>
                  <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  >
                    {state.groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#17365D] mb-1">
                    Chức vụ trong lớp
                  </label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="Thành viên / Tổ trưởng / Lớp trưởng..."
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#17365D] mb-1">
                    Số điện thoại phụ huynh (nếu có)
                  </label>
                  <input
                    type="text"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="09xx xxx xxx"
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#17365D] mb-1">
                    Điểm thi đua ban đầu (Mặc định: 100)
                  </label>
                  <input
                    type="number"
                    value={initialScore}
                    onChange={(e) => setInitialScore(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#17365D] mb-1">
                    Trạng thái học tập
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StudentStatus)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  >
                    <option value="Đang học">Đang học</option>
                    <option value="Chuyển lớp">Chuyển lớp</option>
                    <option value="Bảo lưu">Bảo lưu</option>
                    <option value="Đã lưu trữ">Đã lưu trữ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17365D] mb-1">
                  Ghi chú của Giáo viên chủ nhiệm
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi chú đặc điểm, năng khiếu, hoàn cảnh hoặc lưu ý phối hợp phụ huynh..."
                  className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#D7EAFE]">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#D7EAFE] text-[#17365D] font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#0D47A1] text-white font-bold hover:bg-[#17365D]"
                >
                  Lưu hồ sơ học sinh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: STUDENT FULL PROFILE VIEW (Section 5: Thông tin cơ bản, Lịch sử thi đua, Chuyên cần, Thành tích, Vi phạm, Ghi chú chủ nhiệm) */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl border border-[#D7EAFE] max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#D7EAFE]">
              <div>
                <div className="text-xs font-bold text-[#0D47A1]">
                  HỒ SƠ CÁ NHÂN HỌC SINH · LỚP 10A3
                </div>
                <h3 className="text-xl font-bold text-[#17365D]">
                  {viewingStudent.fullName} ({viewingStudent.studentCode})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingStudent(null)}
                className="p-1.5 rounded-lg border border-[#D7EAFE] text-[#64748B] hover:text-[#17365D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Thông tin cơ bản */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F4FAFF] p-4 rounded-xl border border-[#D7EAFE] text-xs">
              <div>
                <span className="text-[#64748B]">Ngày sinh:</span>
                <div className="font-bold text-[#17365D] mt-0.5 tabular-nums">
                  {formatVietnameseDate(viewingStudent.dob)}
                </div>
              </div>
              <div>
                <span className="text-[#64748B]">Giới tính / Tổ:</span>
                <div className="font-bold text-[#17365D] mt-0.5">
                  {viewingStudent.gender} ·{' '}
                  {state.groups.find((g) => g.id === viewingStudent.groupId)
                    ?.name || 'Tổ'}
                </div>
              </div>
              <div>
                <span className="text-[#64748B]">Chức vụ lớp:</span>
                <div className="font-bold text-[#0D47A1] mt-0.5">
                  {viewingStudent.position}
                </div>
              </div>
              <div>
                <span className="text-[#64748B]">Điểm thi đua hiện tại:</span>
                <div className="font-bold text-[#16A34A] text-sm mt-0.5 tabular-nums">
                  {rankingsMap.get(viewingStudent.id)?.finalScore ??
                    viewingStudent.initialScore}
                  đ (Gốc: {viewingStudent.initialScore}đ)
                </div>
              </div>
            </div>

            {/* 2. Thành tích & Vi phạm trong kỳ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-[#D7EAFE]">
                <h4 className="text-sm font-bold text-[#16A34A] mb-2">
                  Thành tích & Điểm cộng ghi nhận
                </h4>
                <div className="space-y-2 text-xs max-h-44 overflow-y-auto">
                  {state.competitionRecords
                    .filter(
                      (r) =>
                        !r.isDeleted &&
                        r.studentId === viewingStudent.id &&
                        r.totalPoints > 0
                    )
                    .map((rec) => (
                      <div
                        key={rec.id}
                        className="p-2 rounded bg-[#F4FAFF] border border-[#D7EAFE] flex justify-between"
                      >
                        <div>
                          <div className="font-bold text-[#17365D]">
                            {rec.criteriaName}{' '}
                            {rec.multiplier > 1 ? `(${rec.multiplier}x)` : ''}
                          </div>
                          <div className="text-[#64748B]">
                            {formatVietnameseDate(rec.date)} · {rec.subjectOrActivity}
                          </div>
                        </div>
                        <span className="font-bold text-[#16A34A] tabular-nums">
                          +{rec.totalPoints}đ
                        </span>
                      </div>
                    ))}
                  {state.competitionRecords.filter(
                    (r) =>
                      !r.isDeleted &&
                      r.studentId === viewingStudent.id &&
                      r.totalPoints > 0
                  ).length === 0 && (
                    <div className="text-[#64748B]">
                      Chưa có lượt điểm cộng nào trong kỳ.
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[#D7EAFE]">
                <h4 className="text-sm font-bold text-[#DC2626] mb-2">
                  Vi phạm & Điểm trừ ghi nhận
                </h4>
                <div className="space-y-2 text-xs max-h-44 overflow-y-auto">
                  {state.competitionRecords
                    .filter(
                      (r) =>
                        !r.isDeleted &&
                        r.studentId === viewingStudent.id &&
                        r.totalPoints < 0
                    )
                    .map((rec) => (
                      <div
                        key={rec.id}
                        className="p-2 rounded bg-red-50/50 border border-red-200 flex justify-between"
                      >
                        <div>
                          <div className="font-bold text-[#17365D]">
                            {rec.criteriaName}{' '}
                            {rec.multiplier > 1
                              ? `(Tái phạm lần ${rec.multiplier} - Hệ số ${rec.multiplier}x)`
                              : ''}
                          </div>
                          <div className="text-[#64748B]">
                            {formatVietnameseDate(rec.date)} · {rec.notes}
                          </div>
                        </div>
                        <span className="font-bold text-[#DC2626] tabular-nums">
                          {rec.totalPoints}đ
                        </span>
                      </div>
                    ))}
                  {state.competitionRecords.filter(
                    (r) =>
                      !r.isDeleted &&
                      r.studentId === viewingStudent.id &&
                      r.totalPoints < 0
                  ).length === 0 && (
                    <div className="text-[#16A34A] font-semibold">
                      Không có vi phạm nội quy nào.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Lịch sử chuyên cần & Ghi chú chủ nhiệm */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-[#D7EAFE]">
                <h4 className="text-sm font-bold text-[#0D47A1] mb-2">
                  Tình hình chuyên cần & Khen thưởng
                </h4>
                <div className="space-y-1.5 text-[#17365D]">
                  <div>
                    Số buổi đã điểm danh:{' '}
                    <strong>
                      {
                        state.attendanceRecords.filter(
                          (a) =>
                            a.studentId === viewingStudent.id &&
                            a.attendanceStatus !== 'CHUA_DIEM_DANH'
                        ).length
                      }
                    </strong>
                  </div>
                  <div>
                    Số danh hiệu khen thưởng:{' '}
                    <strong>
                      {
                        state.awards.filter(
                          (aw) => aw.studentId === viewingStudent.id
                        ).length
                      }
                    </strong>
                  </div>
                  <div>
                    Số điện thoại phụ huynh:{' '}
                    <strong>{viewingStudent.parentPhone || 'Chưa cập nhật'}</strong>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[#D7EAFE]">
                <h4 className="text-sm font-bold text-[#0D47A1] mb-2">
                  Ghi chú của Giáo viên chủ nhiệm Nguyễn Tiến Dương
                </h4>
                <p className="text-[#17365D] leading-relaxed">
                  {viewingStudent.notes || 'Chưa có ghi chú riêng.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#D7EAFE]">
              <button
                type="button"
                onClick={() => {
                  const st = viewingStudent;
                  setViewingStudent(null);
                  openEditModal(st);
                }}
                className="px-4 py-2 rounded-lg bg-[#0D47A1] text-white text-xs font-bold"
              >
                Chỉnh sửa hồ sơ này
              </button>
              <button
                type="button"
                onClick={() => setViewingStudent(null)}
                className="px-4 py-2 rounded-lg border border-[#D7EAFE] text-xs font-bold text-[#17365D]"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRM ARCHIVE OR DELETE (Section 5: Xóa hoặc lưu trữ học sinh theo quy trình xác nhận) */}
      {confirmDeleteStudent && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl border border-[#D7EAFE] max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-[#0D47A1]">
              Xác nhận Lưu trữ hoặc Xóa Học sinh
            </h3>
            <p className="text-sm text-[#17365D]">
              Bạn đang chọn xử lý hồ sơ của học sinh{' '}
              <strong>{confirmDeleteStudent.fullName}</strong> (Mã HS:{' '}
              <strong>{confirmDeleteStudent.studentCode}</strong>).
            </p>
            <p className="text-xs text-[#64748B]">
              Khuyến nghị chọn <strong>"Lưu trữ hồ sơ"</strong> để giữ nguyên lịch sử thi đua của lớp, hoặc chọn <strong>"Xóa vĩnh viễn"</strong> nếu nhập nhầm.
            </p>
            <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-[#D7EAFE]">
              <button
                type="button"
                onClick={() => setConfirmDeleteStudent(null)}
                className="px-3.5 py-2 rounded-lg border border-[#D7EAFE] text-xs font-bold text-[#17365D]"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteOrArchiveStudent(confirmDeleteStudent.id, 'ARCHIVE');
                  setConfirmDeleteStudent(null);
                }}
                className="px-3.5 py-2 rounded-lg bg-[#FF8A00] text-white text-xs font-bold flex items-center gap-1"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Lưu trữ hồ sơ</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteOrArchiveStudent(confirmDeleteStudent.id, 'DELETE');
                  setConfirmDeleteStudent(null);
                }}
                className="px-3.5 py-2 rounded-lg bg-[#DC2626] text-white text-xs font-bold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa vĩnh viễn</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
