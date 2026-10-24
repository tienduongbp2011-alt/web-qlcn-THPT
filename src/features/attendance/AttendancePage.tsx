import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Download,
  Printer,
  Save,
  Users,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import {
  AttendanceRecord,
  AttendanceStatus,
  DisciplineLevel,
} from '../../types/index.ts';
import {
  calculateAttendanceSummary,
  formatVietnameseDate,
  toISODate,
} from '../../utils/calculations.ts';
import { exportToExcelFile } from '../../utils/exportUtils.ts';

export const AttendancePage: React.FC = () => {
  const { state, sessionRole, upsertAttendanceRecordsForDate } = useWorkspace();
  const today = toISODate(new Date());

  const [selectedDate, setSelectedDate] = useState(today);
  const [filterGroup, setFilterGroup] = useState('ALL');
  const [viewMode, setViewMode] = useState<'DAILY' | 'SUMMARY'>('DAILY');
  const [summaryStartDate, setSummaryStartDate] = useState('2026-09-01');
  const [summaryEndDate, setSummaryEndDate] = useState(today);

  const activeStudents = useMemo(
    () => state.students.filter((s) => s.status === 'Đang học'),
    [state.students]
  );

  // Local editable rows for selectedDate
  const [dailyRows, setDailyRows] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    const existingMap = new Map(
      state.attendanceRecords
        .filter((r) => r.date === selectedDate)
        .map((r) => [r.studentId, r])
    );

    const rows: AttendanceRecord[] = activeStudents.map((st) => {
      const found = existingMap.get(st.id);
      if (found) return found;
      // Mặc định cho ngày chưa điểm danh là CHUA_DIEM_DANH (không coi là vắng học)
      return {
        id: `att-${selectedDate}-${st.id}`,
        classId: state.currentClassId,
        date: selectedDate,
        studentId: st.id,
        groupId: st.groupId,
        attendanceStatus: 'CHUA_DIEM_DANH',
        uniformStatus: 'Tốt',
        hygieneStatus: 'Tốt',
        orderStatus: 'Tốt',
        homeworkStatus: 'Tốt',
        attitudeStatus: 'Tốt',
        activityStatus: 'Tốt',
        reason: '',
        recordedBy: sessionRole.actorName,
      };
    });
    setDailyRows(rows);
  }, [
    selectedDate,
    activeStudents,
    state.attendanceRecords,
    state.currentClassId,
    sessionRole.actorName,
  ]);

  const filteredDailyRows = useMemo(() => {
    return dailyRows.filter((r) =>
      filterGroup === 'ALL' ? true : r.groupId === filterGroup
    );
  }, [dailyRows, filterGroup]);

  const updateSingleRow = (
    studentId: string,
    patch: Partial<AttendanceRecord>
  ) => {
    setDailyRows((prev) =>
      prev.map((row) =>
        row.studentId === studentId ? { ...row, ...patch } : row
      )
    );
  };

  const markAllPresentOnTime = () => {
    setDailyRows((prev) =>
      prev.map((row) =>
        filterGroup === 'ALL' || row.groupId === filterGroup
          ? {
              ...row,
              attendanceStatus: 'DUNG_GIO',
              uniformStatus: 'Tốt',
              hygieneStatus: 'Tốt',
              orderStatus: 'Tốt',
              homeworkStatus: 'Tốt',
              attitudeStatus: 'Tốt',
              activityStatus: 'Tốt',
            }
          : row
      )
    );
  };

  const handleSaveDailyAttendance = () => {
    upsertAttendanceRecordsForDate(selectedDate, dailyRows);
  };

  const summaryData = useMemo(
    () =>
      calculateAttendanceSummary(state.students, state.attendanceRecords, {
        startDate: summaryStartDate,
        endDate: summaryEndDate,
        groupId: filterGroup,
      }),
    [state.students, state.attendanceRecords, summaryStartDate, summaryEndDate, filterGroup]
  );

  // Thống kê theo 4 tổ
  const groupSummary = useMemo(() => {
    return state.groups.map((grp) => {
      const rows = summaryData.byStudent.filter((s) => s.groupId === grp.id);
      return {
        groupId: grp.id,
        groupName: grp.name,
        memberCount: rows.length,
        onTime: rows.reduce((a, b) => a + b.onTime, 0),
        late: rows.reduce((a, b) => a + b.late, 0),
        excused: rows.reduce((a, b) => a + b.excused, 0),
        unexcused: rows.reduce((a, b) => a + b.unexcused, 0),
        unrecorded: rows.reduce((a, b) => a + b.unrecorded, 0),
        disciplineIssues: rows.reduce((a, b) => a + b.disciplineIssues, 0),
      };
    });
  }, [state.groups, summaryData]);

  const handleExportAttendanceExcel = () => {
    const rows = summaryData.byStudent.map((item, idx) => ({
      STT: idx + 1,
      'Mã HS': item.studentCode,
      'Họ và tên': item.fullName,
      'Tổ': state.groups.find((g) => g.id === item.groupId)?.name || '',
      'Đi học đúng giờ': item.onTime,
      'Đi muộn': item.late,
      'Nghỉ có phép': item.excused,
      'Nghỉ không phép': item.unexcused,
      'Chưa điểm danh': item.unrecorded,
      'Nhắc nhở nề nếp': item.disciplineIssues,
    }));
    exportToExcelFile(
      rows,
      'ChuyenCanNeNep10A3',
      `Bao_Cao_Chuyen_Can_10A3_${selectedDate}.xlsx`
    );
  };

  const statusLabels: { value: AttendanceStatus; label: string }[] = [
    { value: 'CHUA_DIEM_DANH', label: 'Chưa điểm danh' },
    { value: 'DUNG_GIO', label: 'Đi học đúng giờ' },
    { value: 'DI_MUON', label: 'Đi muộn' },
    { value: 'NGHI_CO_PHEP', label: 'Nghỉ có phép' },
    { value: 'NGHI_KHONG_PHEP', label: 'Nghỉ không phép' },
  ];

  const disciplineOptions: DisciplineLevel[] = ['Tốt', 'Đạt', 'Chưa đạt'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="crystal-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <div className="text-xs font-bold text-[#0D47A1] uppercase tracking-wider">
            PHÂN HỆ 4 · THEO DÕI CHUYÊN CẦN VÀ NỀ NẾP HỌC SINH
          </div>
          <h2 className="text-2xl font-bold text-[#17365D] mt-1">
            Sổ Điểm danh Ngày & Đánh giá Nề nếp Lớp 10A3
          </h2>
          <p className="text-sm text-[#64748B] mt-0.5">
            Phân biệt rõ trạng thái <strong>"Chưa điểm danh"</strong> với <strong>"Có mặt"</strong> và <strong>"Vắng học"</strong>. Theo dõi đồng phục, vệ sinh, trật tự, chuẩn bị bài và ý thức học tập.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('DAILY')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
              viewMode === 'DAILY'
                ? 'bg-[#0D47A1] text-white'
                : 'bg-white border border-[#D7EAFE] text-[#17365D]'
            }`}
          >
            1. Điểm danh theo ngày
          </button>
          <button
            type="button"
            onClick={() => setViewMode('SUMMARY')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
              viewMode === 'SUMMARY'
                ? 'bg-[#0D47A1] text-white'
                : 'bg-white border border-[#D7EAFE] text-[#17365D]'
            }`}
          >
            2. Tổng hợp theo Tổ / Kỳ
          </button>
          <button
            type="button"
            onClick={handleExportAttendanceExcel}
            className="px-3 py-2 rounded-lg border border-[#0D47A1] text-[#0D47A1] text-xs font-bold flex items-center gap-1 hover:bg-[#E3F2FD]"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Excel</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-2 rounded-lg bg-[#FF8A00] text-white text-xs font-bold flex items-center gap-1 hover:opacity-90"
          >
            <Printer className="w-4 h-4" />
            <span>In báo cáo</span>
          </button>
        </div>
      </div>

      {viewMode === 'DAILY' ? (
        <div className="space-y-4">
          {/* Toolbar điểm danh ngày */}
          <div className="crystal-card rounded-2xl p-4 no-print flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[#17365D]">
                  Chọn ngày điểm danh:
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-[#D7EAFE] text-sm font-bold text-[#0D47A1]"
                />
              </div>

              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-[#D7EAFE] text-sm text-[#17365D]"
              >
                <option value="ALL">Tất cả 4 tổ</option>
                {state.groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={markAllPresentOnTime}
                className="px-3.5 py-2 rounded-lg border border-[#16A34A] text-[#16A34A] bg-white hover:bg-green-50 text-xs font-bold flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Nhập nhanh: Tất cả Đúng giờ & Nề nếp Tốt</span>
              </button>

              <button
                type="button"
                onClick={handleSaveDailyAttendance}
                className="px-4 py-2 rounded-lg bg-[#0D47A1] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 hover:bg-[#17365D]"
              >
                <Save className="w-4 h-4" />
                <span>Lưu điểm danh ngày {formatVietnameseDate(selectedDate)}</span>
              </button>
            </div>
          </div>

          {/* Bảng điểm danh chi tiết */}
          <div className="crystal-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-[#E3F2FD] text-[#0D47A1] text-left">
                    <th className="py-3 px-2.5 font-bold">STT</th>
                    <th className="py-3 px-2.5 font-bold">Họ và tên</th>
                    <th className="py-3 px-2.5 font-bold">Tổ</th>
                    <th className="py-3 px-2.5 font-bold">Chuyên cần</th>
                    <th className="py-3 px-2 font-bold">Đồng phục</th>
                    <th className="py-3 px-2 font-bold">Vệ sinh</th>
                    <th className="py-3 px-2 font-bold">Trật tự</th>
                    <th className="py-3 px-2 font-bold">Chuẩn bị bài</th>
                    <th className="py-3 px-2 font-bold">Ý thức HT</th>
                    <th className="py-3 px-2 font-bold">Hoạt động</th>
                    <th className="py-3 px-2.5 font-bold">Ghi chú lý do</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D7EAFE]">
                  {filteredDailyRows.map((row, idx) => {
                    const st = state.students.find(
                      (s) => s.id === row.studentId
                    );
                    const grp = state.groups.find((g) => g.id === row.groupId);
                    return (
                      <tr key={row.studentId} className="hover:bg-[#F4FAFF]">
                        <td className="py-2 px-2.5 text-[#64748B] tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2.5 font-bold text-[#17365D]">
                          {st?.fullName}
                        </td>
                        <td className="py-2 px-2.5 text-xs text-[#64748B]">
                          {grp?.name}
                        </td>
                        <td className="py-2 px-2.5">
                          <select
                            value={row.attendanceStatus}
                            onChange={(e) =>
                              updateSingleRow(row.studentId, {
                                attendanceStatus:
                                  e.target.value as AttendanceStatus,
                              })
                            }
                            className={`px-2 py-1 rounded border text-xs font-bold ${
                              row.attendanceStatus === 'DUNG_GIO'
                                ? 'border-green-300 bg-green-50 text-[#16A34A]'
                                : row.attendanceStatus === 'DI_MUON'
                                ? 'border-amber-300 bg-amber-50 text-[#FF8A00]'
                                : row.attendanceStatus === 'NGHI_CO_PHEP'
                                ? 'border-blue-300 bg-blue-50 text-[#0D47A1]'
                                : row.attendanceStatus === 'NGHI_KHONG_PHEP'
                                ? 'border-red-300 bg-red-50 text-[#DC2626]'
                                : 'border-[#D7EAFE] bg-white text-[#64748B]'
                            }`}
                          >
                            {statusLabels.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {(
                          [
                            'uniformStatus',
                            'hygieneStatus',
                            'orderStatus',
                            'homeworkStatus',
                            'attitudeStatus',
                            'activityStatus',
                          ] as const
                        ).map((fieldKey) => (
                          <td key={fieldKey} className="py-2 px-2">
                            <select
                              value={row[fieldKey]}
                              onChange={(e) =>
                                updateSingleRow(row.studentId, {
                                  [fieldKey]: e.target.value as DisciplineLevel,
                                })
                              }
                              className={`px-1.5 py-1 rounded border text-xs ${
                                row[fieldKey] === 'Chưa đạt'
                                  ? 'border-red-300 text-[#DC2626] font-bold'
                                  : 'border-[#D7EAFE] text-[#17365D]'
                              }`}
                            >
                              {disciplineOptions.map((lvl) => (
                                <option key={lvl} value={lvl}>
                                  {lvl}
                                </option>
                              ))}
                            </select>
                          </td>
                        ))}

                        <td className="py-2 px-2.5">
                          <input
                            type="text"
                            value={row.reason}
                            onChange={(e) =>
                              updateSingleRow(row.studentId, {
                                reason: e.target.value,
                              })
                            }
                            placeholder="Ghi chú lý do..."
                            className="w-full min-w-[130px] px-2 py-1 rounded border border-[#D7EAFE] text-xs"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW 2: SUMMARY BY GROUP & STUDENT */
        <div className="space-y-6">
          <div className="crystal-card rounded-2xl p-4 no-print flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-[#17365D]">Từ ngày:</span>
              <input
                type="date"
                value={summaryStartDate}
                onChange={(e) => setSummaryStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-[#D7EAFE]"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-[#17365D]">Đến ngày:</span>
              <input
                type="date"
                value={summaryEndDate}
                onChange={(e) => setSummaryEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-[#D7EAFE]"
              />
            </div>
            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#D7EAFE] text-xs"
            >
              <option value="ALL">Tất cả 4 tổ</option>
              {state.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tổng hợp theo 4 tổ */}
          <div className="crystal-card rounded-2xl p-5">
            <h3 className="text-base font-bold text-[#0D47A1] mb-3">
              Tổng hợp Chuyên cần & Nề nếp theo 4 Tổ
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#E3F2FD] text-[#0D47A1] text-left">
                    <th className="py-2.5 px-3 font-bold">Tổ</th>
                    <th className="py-2.5 px-3 font-bold text-center">Sĩ số</th>
                    <th className="py-2.5 px-3 font-bold text-right">
                      Đúng giờ
                    </th>
                    <th className="py-2.5 px-3 font-bold text-right">
                      Đi muộn
                    </th>
                    <th className="py-2.5 px-3 font-bold text-right">
                      Nghỉ có phép
                    </th>
                    <th className="py-2.5 px-3 font-bold text-right">
                      Nghỉ không phép
                    </th>
                    <th className="py-2.5 px-3 font-bold text-right">
                      Chưa điểm danh
                    </th>
                    <th className="py-2.5 px-3 font-bold text-right">
                      Nhắc nhở nề nếp
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D7EAFE]">
                  {groupSummary.map((gs) => (
                    <tr key={gs.groupId} className="hover:bg-[#F4FAFF]">
                      <td className="py-2.5 px-3 font-bold text-[#0D47A1]">
                        {gs.groupName}
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums">
                        {gs.memberCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#16A34A] tabular-nums">
                        {gs.onTime}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#FF8A00] tabular-nums">
                        {gs.late}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#0D47A1] tabular-nums">
                        {gs.excused}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#DC2626] tabular-nums">
                        {gs.unexcused}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#64748B] tabular-nums">
                        {gs.unrecorded}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#DC2626] tabular-nums">
                        {gs.disciplineIssues}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tổng hợp theo từng học sinh */}
          <div className="crystal-card rounded-2xl p-5">
            <h3 className="text-base font-bold text-[#0D47A1] mb-3">
              Tổng hợp Chuyên cần theo Học sinh
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#E3F2FD] text-[#0D47A1] text-left">
                    <th className="py-2.5 px-3 font-bold">Mã HS</th>
                    <th className="py-2.5 px-3 font-bold">Họ và tên</th>
                    <th className="py-2.5 px-3 font-bold text-right">
                      Đúng giờ
                    </th>
                    <th className="py-2.5 px-3 font-bold text-right">
                      Đi muộn
                    </th>
                    <th className="py-2.5 px-3 font-bold text-right">
                      Nghỉ có phép
                    </th>
                    <th className="py-2.5 px-3 font-bold text-right">
                      Nghỉ không phép
                    </th>
                    <th className="py-2.5 px-3 font-bold text-right">
                      Chưa điểm danh
                    </th>
                    <th className="py-2.5 px-3 font-bold text-right">
                      Chưa đạt nề nếp
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D7EAFE]">
                  {summaryData.byStudent.map((st) => (
                    <tr key={st.studentId} className="hover:bg-[#F4FAFF]">
                      <td className="py-2 px-3 font-bold text-[#0D47A1] text-xs tabular-nums">
                        {st.studentCode}
                      </td>
                      <td className="py-2 px-3 font-bold text-[#17365D]">
                        {st.fullName}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-[#16A34A] tabular-nums">
                        {st.onTime}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-[#FF8A00] tabular-nums">
                        {st.late}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-[#0D47A1] tabular-nums">
                        {st.excused}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-[#DC2626] tabular-nums">
                        {st.unexcused}
                      </td>
                      <td className="py-2 px-3 text-right text-[#64748B] tabular-nums">
                        {st.unrecorded}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-[#DC2626] tabular-nums">
                        {st.disciplineIssues}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
