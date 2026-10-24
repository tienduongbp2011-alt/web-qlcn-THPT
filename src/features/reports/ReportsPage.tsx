import React, { useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Download,
  FileText,
  Printer,
  Sparkles,
  Trophy,
  Upload,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import {
  AwardRecord,
  PeriodFilterType,
} from '../../types/index.ts';
import {
  calculateAttendanceSummary,
  calculateFinanceMetrics,
  calculateGroupRankings,
  calculateStudentRankings,
  formatCurrencyVND,
  formatVietnameseDate,
  getPeriodDateRange,
  toISODate,
} from '../../utils/calculations.ts';
import { exportToExcelFile } from '../../utils/exportUtils.ts';

type ReportTabType =
  | 'OVERVIEW_REPORT'
  | 'EXCELLENT_INDIVIDUALS'
  | 'VIOLATION_REPORT'
  | 'AWARD_PROPOSALS'
  | 'CERTIFICATE_DESIGNER';

export const ReportsPage: React.FC = () => {
  const {
    state,
    addAwardRecord,
    updateAwardRecord,
    deleteAwardRecord,
    showToast,
  } = useWorkspace();

  const today = toISODate(new Date());
  const [activeTab, setActiveTab] = useState<ReportTabType>(
    'EXCELLENT_INDIVIDUALS'
  );
  const [periodType, setPeriodType] = useState<PeriodFilterType>('WEEK');
  const [referenceDate, setReferenceDate] = useState(today);
  const [filterGroupId, setFilterGroupId] = useState('ALL');

  // Certificate Designer States
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>(
    'landscape'
  );
  const [certSchoolName, setCertSchoolName] = useState(state.school.name);
  const [certHeaderTitle, setCertHeaderTitle] = useState('KHEN THƯỞNG');
  const [certStudentName, setCertStudentName] = useState(
    'Nguyễn Ngọc Bảo Trâm'
  );
  const [certClassName, setCertClassName] = useState('10A3');
  const [certAchievement, setCertAchievement] = useState(
    'Đạt danh hiệu Học sinh Xuất sắc dẫn đầu phong trào thi đua học tập và rèn luyện'
  );
  const [certPeriodText, setCertPeriodText] = useState(
    'Học kỳ I – Năm học 2026–2027'
  );
  const [certLocationDate, setCertLocationDate] = useState(
    `Thanh Hòa, ngày ${new Date().getDate()} tháng ${
      new Date().getMonth() + 1
    } năm ${new Date().getFullYear()}`
  );
  const [certSignerTitle, setCertSignerTitle] = useState(
    'GIÁO VIÊN CHỦ NHIỆM'
  );
  const [certSignerName, setCertSignerName] = useState('Nguyễn Tiến Dương');
  const [customLogoDataUrl, setCustomLogoDataUrl] = useState<string>('');
  const [batchPrintMode, setBatchPrintMode] = useState(false);

  const criteriaMap = useMemo(
    () => new Map(state.criteria.map((c) => [c.id, c])),
    [state.criteria]
  );

  const periodRange = useMemo(
    () => getPeriodDateRange(periodType, referenceDate),
    [periodType, referenceDate]
  );

  const groupRankings = useMemo(
    () =>
      calculateGroupRankings(
        state.groups,
        state.students,
        state.competitionRecords,
        criteriaMap,
        state.groupScoringMode,
        {
          startDate: periodRange.startDate,
          endDate: periodRange.endDate,
        }
      ),
    [
      state.groups,
      state.students,
      state.competitionRecords,
      criteriaMap,
      state.groupScoringMode,
      periodRange,
    ]
  );

  // Yêu cầu 9: "Danh sách cá nhân xuất sắc sắp xếp theo thứ tự từ điểm cao đến thấp kèm theo ghi chú lỗi vi phạm nếu có"
  const sortedStudents = useMemo(
    () =>
      calculateStudentRankings(
        state.students,
        state.groups,
        state.competitionRecords,
        criteriaMap,
        {
          startDate: periodRange.startDate,
          endDate: periodRange.endDate,
          groupId: filterGroupId,
        }
      ),
    [
      state.students,
      state.groups,
      state.competitionRecords,
      criteriaMap,
      periodRange,
      filterGroupId,
    ]
  );

  const attendanceSummary = useMemo(
    () =>
      calculateAttendanceSummary(state.students, state.attendanceRecords, {
        startDate: periodRange.startDate,
        endDate: periodRange.endDate,
        groupId: filterGroupId,
      }),
    [state.students, state.attendanceRecords, periodRange, filterGroupId]
  );

  const financeMetrics = useMemo(
    () =>
      calculateFinanceMetrics(
        state.financeOpeningBalance,
        state.financeTransactions,
        {
          startDate: periodRange.startDate,
          endDate: periodRange.endDate,
        }
      ),
    [state.financeOpeningBalance, state.financeTransactions, periodRange]
  );

  // Tự động đề xuất học sinh khen thưởng dựa trên điểm thi đua & phong trào
  const handleAutoProposeAwards = () => {
    const topCandidates = sortedStudents.slice(0, 5);
    let createdCount = 0;
    topCandidates.forEach((cand) => {
      const alreadyExists = state.awards.some(
        (a) =>
          a.studentId === cand.studentId && a.periodName === periodRange.label
      );
      if (!alreadyExists) {
        addAwardRecord({
          classId: state.currentClassId,
          studentId: cand.studentId,
          studentName: cand.fullName.replace(' (Demo)', ''),
          className: '10A3',
          groupName: cand.groupName,
          title:
            cand.rank === 1
              ? 'Quán quân Thi đua Lớp 10A3'
              : 'Học sinh Xuất sắc Tiêu biểu',
          achievement: `Đạt ${cand.finalScore} điểm thi đua (Hạng #${cand.rank}) trong ${periodRange.label}`,
          periodName: periodRange.label,
          awardDate: today,
          location: 'Thanh Hòa',
          signerName: 'Nguyễn Tiến Dương',
          status: 'Đề xuất',
          templateId: 'tpl-landscape-1',
        });
        createdCount += 1;
      }
    });
    if (createdCount === 0) {
      showToast(
        'Top học sinh xuất sắc của kỳ này đã có trong danh sách đề xuất.',
        'info'
      );
    }
  };

  const handleLoadAwardIntoCertificate = (aw: AwardRecord) => {
    setCertStudentName(aw.studentName.replace(' (Demo)', ''));
    setCertClassName(aw.className);
    setCertAchievement(aw.achievement);
    setCertPeriodText(aw.periodName);
    setCertSignerName(aw.signerName);
    setBatchPrintMode(false);
    setActiveTab('CERTIFICATE_DESIGNER');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomLogoDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExportReportExcel = () => {
    const rows = sortedStudents.map((st) => ({
      'Thứ hạng': st.rank,
      'Mã học sinh': st.studentCode,
      'Họ và tên': st.fullName,
      'Tổ': st.groupName,
      'Chức vụ': st.position,
      'Điểm ban đầu': st.initialScore,
      'Tổng điểm cộng': st.bonusPoints,
      'Tổng điểm trừ': st.penaltyPoints,
      'Hiệu số kỳ': st.netPeriodPoints,
      'Tổng điểm cuối kỳ': st.finalScore,
      'Ghi chú lỗi vi phạm (nếu có)':
        st.violationSummary.length > 0
          ? st.violationSummary.join('; ')
          : 'Không có vi phạm',
    }));
    exportToExcelFile(
      rows,
      'DanhSachCaNhanXuatSac',
      `Bao_Cao_Thi_Dua_Ca_Nhan_10A3_${periodType}.xlsx`
    );
  };

  const approvedAwards = state.awards.filter(
    (a) => a.status === 'Đã duyệt' || a.status === 'Đã in giấy khen'
  );

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="crystal-card rounded-2xl p-5 space-y-4 no-print">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-[#0D47A1] uppercase tracking-wider">
              PHÂN HỆ 6 · TRUNG TÂM BÁO CÁO, THỐNG KÊ VÀ IN GIẤY KHEN A4
            </div>
            <h2 className="text-2xl font-bold text-[#17365D] mt-1">
              Báo cáo Tổng hợp Chủ nhiệm & Thiết kế Giấy khen Lớp 10A3
            </h2>
            <p className="text-sm text-[#64748B] mt-0.5">
              Hỗ trợ xuất Excel, xuất PDF / in trực tiếp giấy khen A4 Ngang & Dọc với phông chữ Times New Roman chuẩn mực.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportReportExcel}
              className="px-3.5 py-2 rounded-lg border border-[#0D47A1] bg-white text-[#0D47A1] text-xs font-bold flex items-center gap-1.5 hover:bg-[#E3F2FD]"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Excel Báo cáo</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-lg bg-[#FF8A00] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 hover:opacity-90"
            >
              <Printer className="w-4 h-4" />
              <span>In / Xuất PDF trang hiện tại</span>
            </button>
          </div>
        </div>

        {/* Period & Group Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#D7EAFE]">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'WEEK', label: 'Tuần' },
                { id: 'MONTH', label: 'Tháng' },
                { id: 'HK1', label: 'Học kỳ I' },
                { id: 'HK2', label: 'Học kỳ II' },
                { id: 'YEAR', label: 'Cả năm học' },
              ] as { id: PeriodFilterType; label: string }[]
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriodType(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  periodType === p.id
                    ? 'bg-[#0D47A1] text-white'
                    : 'bg-[#F4FAFF] border border-[#D7EAFE] text-[#17365D]'
                }`}
              >
                {p.label}
              </button>
            ))}

            <input
              type="date"
              value={referenceDate}
              onChange={(e) => setReferenceDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-[#D7EAFE] text-xs"
            />

            <select
              value={filterGroupId}
              onChange={(e) => setFilterGroupId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#D7EAFE] text-xs font-bold text-[#0D47A1]"
            >
              <option value="ALL">Lọc: Tất cả 4 tổ</option>
              {state.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              {
                id: 'EXCELLENT_INDIVIDUALS' as const,
                label: '1. DS Cá nhân & Ghi chú lỗi',
              },
              {
                id: 'OVERVIEW_REPORT' as const,
                label: '2. Báo cáo Chủ nhiệm Tổng hợp',
              },
              {
                id: 'AWARD_PROPOSALS' as const,
                label: `3. Đề xuất & Duyệt Khen thưởng (${state.awards.length})`,
              },
              {
                id: 'CERTIFICATE_DESIGNER' as const,
                label: '4. Mẫu Giấy Khen A4 (Ngang/Dọc)',
              },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === t.id
                    ? 'bg-[#0D47A1] text-white'
                    : 'bg-white border border-[#D7EAFE] text-[#17365D] hover:bg-[#E3F2FD]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: DANH SÁCH CÁ NHÂN XUẤT SẮC TỪ CAO ĐẾN THẤP KÈM GHI CHÚ LỖI     */}
      {/* ===================================================================== */}
      {activeTab === 'EXCELLENT_INDIVIDUALS' && (
        <div className="crystal-card rounded-2xl p-6 space-y-4">
          <div className="text-center border-b border-[#D7EAFE] pb-4">
            <div className="text-sm font-bold text-[#0D47A1]">
              {state.school.name} · LỚP CHỦ NHIỆM 10A3
            </div>
            <h3 className="text-xl font-bold text-[#17365D] mt-1">
              BẢNG TỔNG HỢP XẾP HẠNG CÁ NHÂN TỪ ĐIỂM CAO ĐẾN THẤP & GHI CHÚ VI PHẠM
            </h3>
            <div className="text-xs text-[#64748B] mt-1">
              Kỳ báo cáo: <strong>{periodRange.label}</strong> · Giáo viên chủ nhiệm: <strong>Nguyễn Tiến Dương</strong> · Ngày lập: {formatVietnameseDate(today)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#E3F2FD] text-[#0D47A1] text-left">
                  <th className="py-2.5 px-3 font-bold">Hạng</th>
                  <th className="py-2.5 px-3 font-bold">Mã HS</th>
                  <th className="py-2.5 px-3 font-bold">Họ và tên học sinh</th>
                  <th className="py-2.5 px-3 font-bold">Tổ</th>
                  <th className="py-2.5 px-3 font-bold">Chức vụ</th>
                  <th className="py-2.5 px-3 font-bold text-right">Điểm gốc</th>
                  <th className="py-2.5 px-3 font-bold text-right">Điểm cộng</th>
                  <th className="py-2.5 px-3 font-bold text-right">Điểm trừ</th>
                  <th className="py-2.5 px-3 font-bold text-right">Tổng điểm</th>
                  <th className="py-2.5 px-3 font-bold">
                    Ghi chú lỗi vi phạm (nếu có)
                  </th>
                  <th className="py-2.5 px-3 font-bold text-center no-print">
                    Giấy khen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D7EAFE]">
                {sortedStudents.map((st) => (
                  <tr key={st.studentId} className="hover:bg-[#F4FAFF]">
                    <td className="py-2.5 px-3 font-bold text-[#0D47A1] tabular-nums">
                      #{st.rank}
                    </td>
                    <td className="py-2.5 px-3 text-xs font-bold text-[#64748B] tabular-nums">
                      {st.studentCode}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#17365D]">
                      {st.fullName}
                    </td>
                    <td className="py-2.5 px-3 text-xs">{st.groupName}</td>
                    <td className="py-2.5 px-3 text-xs text-[#64748B]">
                      {st.position}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#64748B] tabular-nums">
                      {st.initialScore}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#16A34A] tabular-nums">
                      +{st.bonusPoints}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#DC2626] tabular-nums">
                      -{st.penaltyPoints}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#0D47A1] tabular-nums">
                      {st.finalScore}đ
                    </td>
                    <td className="py-2.5 px-3 text-xs">
                      {st.violationSummary.length > 0 ? (
                        <span className="text-[#DC2626] font-semibold">
                          {st.violationSummary.join('; ')}
                        </span>
                      ) : (
                        <span className="text-[#16A34A]">
                          Không có lỗi vi phạm
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center no-print">
                      <button
                        type="button"
                        onClick={() => {
                          setCertStudentName(
                            st.fullName.replace(' (Demo)', '')
                          );
                          setCertClassName('10A3');
                          setCertAchievement(
                            `Đạt hạng #${st.rank} thi đua lớp 10A3 (${st.finalScore} điểm) trong ${periodRange.label}`
                          );
                          setBatchPrintMode(false);
                          setActiveTab('CERTIFICATE_DESIGNER');
                        }}
                        className="px-2.5 py-1 rounded bg-[#E3F2FD] text-[#0D47A1] hover:bg-[#0D47A1] hover:text-white text-xs font-bold transition-colors"
                      >
                        Tạo giấy khen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: BÁO CÁO CHỦ NHIỆM TỔNG HỢP (4 TỔ + CHUYÊN CẦN + THU CHI)       */}
      {/* ===================================================================== */}
      {activeTab === 'OVERVIEW_REPORT' && (
        <div className="crystal-card rounded-2xl p-6 space-y-6">
          <div className="text-center border-b border-[#D7EAFE] pb-4">
            <div className="text-sm font-bold text-[#0D47A1]">
              {state.school.name}
            </div>
            <h3 className="text-xl font-bold text-[#17365D] mt-1">
              BÁO CÁO TỔNG HỢP CÔNG TÁC CHỦ NHIỆM LỚP 10A3
            </h3>
            <div className="text-xs text-[#64748B] mt-1">
              Kỳ báo cáo: {periodRange.label} · GVCN: Nguyễn Tiến Dương
            </div>
          </div>

          {/* 1. Tổng hợp thi đua 4 tổ */}
          <div>
            <h4 className="text-base font-bold text-[#0D47A1] mb-2">
              I. Tổng hợp kết quả thi đua 4 tổ
            </h4>
            <table className="w-full text-sm border-collapse border border-[#D7EAFE]">
              <thead>
                <tr className="bg-[#E3F2FD] text-[#0D47A1] text-left">
                  <th className="py-2 px-3 border border-[#D7EAFE]">Hạng</th>
                  <th className="py-2 px-3 border border-[#D7EAFE]">Tổ</th>
                  <th className="py-2 px-3 border border-[#D7EAFE]">
                    Tổ trưởng
                  </th>
                  <th className="py-2 px-3 border border-[#D7EAFE] text-right">
                    Điểm cộng
                  </th>
                  <th className="py-2 px-3 border border-[#D7EAFE] text-right">
                    Điểm trừ
                  </th>
                  <th className="py-2 px-3 border border-[#D7EAFE] text-right">
                    Tổng điểm Tổ
                  </th>
                  <th className="py-2 px-3 border border-[#D7EAFE] text-right">
                    Bình quân/HS
                  </th>
                </tr>
              </thead>
              <tbody>
                {groupRankings.map((g) => (
                  <tr key={g.groupId}>
                    <td className="py-2 px-3 border border-[#D7EAFE] font-bold">
                      #{g.rank}
                    </td>
                    <td className="py-2 px-3 border border-[#D7EAFE] font-bold">
                      {g.groupName}
                    </td>
                    <td className="py-2 px-3 border border-[#D7EAFE]">
                      {g.leaderName}
                    </td>
                    <td className="py-2 px-3 border border-[#D7EAFE] text-right text-[#16A34A] font-bold tabular-nums">
                      +{g.totalBonusPoints}
                    </td>
                    <td className="py-2 px-3 border border-[#D7EAFE] text-right text-[#DC2626] font-bold tabular-nums">
                      -{g.totalPenaltyPoints}
                    </td>
                    <td className="py-2 px-3 border border-[#D7EAFE] text-right font-bold text-[#0D47A1] tabular-nums">
                      {g.totalFinalScore}đ
                    </td>
                    <td className="py-2 px-3 border border-[#D7EAFE] text-right font-bold tabular-nums">
                      {g.averageFinalScore}đ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 2. Tổng hợp chuyên cần & Tài chính */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-[#D7EAFE] bg-[#F4FAFF]">
              <h4 className="text-base font-bold text-[#0D47A1] mb-2">
                II. Tình hình chuyên cần & nề nếp
              </h4>
              <ul className="space-y-1.5 text-sm text-[#17365D]">
                <li>
                  • Tổng lượt đi học đúng giờ:{' '}
                  <strong className="tabular-nums">
                    {attendanceSummary.onTimeCount}
                  </strong>
                </li>
                <li>
                  • Tổng lượt đi học muộn:{' '}
                  <strong className="text-[#FF8A00] tabular-nums">
                    {attendanceSummary.lateCount}
                  </strong>
                </li>
                <li>
                  • Nghỉ có phép:{' '}
                  <strong className="tabular-nums">
                    {attendanceSummary.excusedAbsentCount}
                  </strong>{' '}
                  · Nghỉ không phép:{' '}
                  <strong className="text-[#DC2626] tabular-nums">
                    {attendanceSummary.unexcusedAbsentCount}
                  </strong>
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl border border-[#D7EAFE] bg-[#F4FAFF]">
              <h4 className="text-base font-bold text-[#0D47A1] mb-2">
                III. Báo cáo thu – chi quỹ lớp
              </h4>
              <ul className="space-y-1.5 text-sm text-[#17365D]">
                <li>
                  • Số dư đầu kỳ:{' '}
                  <strong className="tabular-nums">
                    {formatCurrencyVND(financeMetrics.openingBalance)}
                  </strong>
                </li>
                <li>
                  • Tổng thu trong kỳ:{' '}
                  <strong className="text-[#16A34A] tabular-nums">
                    +{formatCurrencyVND(financeMetrics.totalIncome)}
                  </strong>
                </li>
                <li>
                  • Tổng chi trong kỳ:{' '}
                  <strong className="text-[#DC2626] tabular-nums">
                    -{formatCurrencyVND(financeMetrics.totalExpense)}
                  </strong>
                </li>
                <li>
                  • Số dư quỹ lớp hiện tại:{' '}
                  <strong className="text-[#0D47A1] tabular-nums">
                    {formatCurrencyVND(financeMetrics.currentBalance)}
                  </strong>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: TỰ ĐỘNG ĐỀ XUẤT & XÁC NHẬN KHEN THƯỞNG (Section 9.1)           */}
      {/* ===================================================================== */}
      {activeTab === 'AWARD_PROPOSALS' && (
        <div className="space-y-4">
          <div className="crystal-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 no-print">
            <div>
              <h3 className="text-lg font-bold text-[#0D47A1]">
                Danh sách Đề xuất & Phê duyệt Khen thưởng Học sinh
              </h3>
              <p className="text-xs text-[#64748B]">
                Hệ thống tự động đề xuất học sinh xuất sắc. Giáo viên chủ nhiệm xem xét và nhấn <strong>"Duyệt khen thưởng"</strong> trước khi in giấy khen.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAutoProposeAwards}
                className="px-4 py-2 rounded-lg bg-[#0D47A1] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#17365D]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Tự động đề xuất Top 5 HS xuất sắc kỳ này</span>
              </button>

              {approvedAwards.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setBatchPrintMode(true);
                    setActiveTab('CERTIFICATE_DESIGNER');
                  }}
                  className="px-4 py-2 rounded-lg bg-[#FF8A00] text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90"
                >
                  <Printer className="w-4 h-4" />
                  <span>
                    In hàng loạt ({approvedAwards.length} giấy khen đã duyệt)
                  </span>
                </button>
              )}
            </div>
          </div>

          <div className="crystal-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#E3F2FD] text-[#0D47A1] text-left">
                    <th className="py-3 px-3 font-bold">Học sinh</th>
                    <th className="py-3 px-3 font-bold">Tổ</th>
                    <th className="py-3 px-3 font-bold">Danh hiệu</th>
                    <th className="py-3 px-3 font-bold">Thành tích ghi nhận</th>
                    <th className="py-3 px-3 font-bold">Kỳ khen thưởng</th>
                    <th className="py-3 px-3 font-bold">Trạng thái</th>
                    <th className="py-3 px-3 font-bold text-center no-print">
                      Phê duyệt & In
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D7EAFE]">
                  {state.awards.map((aw) => (
                    <tr key={aw.id} className="hover:bg-[#F4FAFF]">
                      <td className="py-2.5 px-3 font-bold text-[#17365D]">
                        {aw.studentName}
                      </td>
                      <td className="py-2.5 px-3 text-xs">{aw.groupName}</td>
                      <td className="py-2.5 px-3 font-bold text-[#0D47A1]">
                        {aw.title}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-[#17365D]">
                        {aw.achievement}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-[#64748B]">
                        {aw.periodName}
                      </td>
                      <td className="py-2.5 px-3 text-xs font-bold">
                        {aw.status === 'Đề xuất' ? (
                          <span className="text-[#FF8A00]">Chờ GVCN duyệt</span>
                        ) : (
                          <span className="text-[#16A34A]">{aw.status}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          {aw.status === 'Đề xuất' && (
                            <button
                              type="button"
                              onClick={() =>
                                updateAwardRecord({
                                  ...aw,
                                  status: 'Đã duyệt',
                                })
                              }
                              className="px-2.5 py-1 rounded bg-[#16A34A] text-white text-xs font-bold"
                            >
                              Duyệt
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleLoadAwardIntoCertificate(aw)}
                            className="px-2.5 py-1 rounded bg-[#0D47A1] text-white text-xs font-bold"
                          >
                            Xem & In giấy khen
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteAwardRecord(aw.id)}
                            className="px-2 py-1 rounded border border-red-200 text-[#DC2626] text-xs font-bold"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: THIẾT KẾ & IN GIẤY KHEN A4 NGANG VÀ DỌC (Section 9.2)          */}
      {/* ===================================================================== */}
      {activeTab === 'CERTIFICATE_DESIGNER' && (
        <div className="space-y-6">
          {/* Controls (hidden when printing) */}
          <div className="crystal-card rounded-2xl p-5 no-print space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D7EAFE] pb-3">
              <div>
                <h3 className="text-lg font-bold text-[#0D47A1]">
                  Trình Thiết Kế & Xem Trước Giấy Khen A4 (Phông Times New Roman)
                </h3>
                <p className="text-xs text-[#64748B]">
                  Chọn khổ A4 Ngang hoặc A4 Dọc, tùy chỉnh nội dung, thay logo minh họa bằng logo trường nếu có, in đơn lẻ hoặc in hàng loạt.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    orientation === 'landscape'
                      ? 'bg-[#0D47A1] text-white'
                      : 'border border-[#D7EAFE] text-[#17365D]'
                  }`}
                >
                  Mẫu A4 Ngang
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    orientation === 'portrait'
                      ? 'bg-[#0D47A1] text-white'
                      : 'border border-[#D7EAFE] text-[#17365D]'
                  }`}
                >
                  Mẫu A4 Dọc
                </button>

                <button
                  type="button"
                  onClick={() => setBatchPrintMode(!batchPrintMode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    batchPrintMode
                      ? 'bg-[#16A34A] text-white'
                      : 'border border-[#0D47A1] text-[#0D47A1]'
                  }`}
                >
                  {batchPrintMode
                    ? `Đang bật: In hàng loạt (${approvedAwards.length} giấy)`
                    : 'Chuyển sang In hàng loạt'}
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-lg bg-[#FF8A00] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 hover:opacity-90"
                >
                  <Printer className="w-4 h-4" />
                  <span>In Giấy Khen / Xuất PDF</span>
                </button>
              </div>
            </div>

            {!batchPrintMode && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Chọn nhanh học sinh lớp 10A3:
                  </label>
                  <select
                    onChange={(e) => {
                      const st = sortedStudents.find(
                        (s) => s.studentId === e.target.value
                      );
                      if (st) {
                        setCertStudentName(
                          st.fullName.replace(' (Demo)', '')
                        );
                        setCertAchievement(
                          `Đạt thành tích Xuất sắc trong học tập và rèn luyện (Hạng #${st.rank} – ${st.finalScore} điểm)`
                        );
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  >
                    {sortedStudents.map((s) => (
                      <option key={s.studentId} value={s.studentId}>
                        #{s.rank} - {s.fullName} ({s.finalScore}đ)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Họ và tên học sinh trên giấy khen:
                  </label>
                  <input
                    type="text"
                    value={certStudentName}
                    onChange={(e) => setCertStudentName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE] font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Tiêu đề giấy khen:
                  </label>
                  <input
                    type="text"
                    value={certHeaderTitle}
                    onChange={(e) => setCertHeaderTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Tải logo trường (tùy chọn):
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="w-full text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#17365D] mb-1">
                    Nội dung thành tích khen thưởng:
                  </label>
                  <input
                    type="text"
                    value={certAchievement}
                    onChange={(e) => setCertAchievement(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Thời gian / Kỳ khen thưởng:
                  </label>
                  <input
                    type="text"
                    value={certPeriodText}
                    onChange={(e) => setCertPeriodText(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Người ký (GVCN):
                  </label>
                  <input
                    type="text"
                    value={certSignerName}
                    onChange={(e) => setCertSignerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* CERTIFICATE PREVIEW & PRINT AREA */}
          <div className="space-y-8 flex flex-col items-center">
            {(batchPrintMode && approvedAwards.length > 0
              ? approvedAwards.map((aw) => ({
                  id: aw.id,
                  studentName: aw.studentName.replace(' (Demo)', ''),
                  className: aw.className,
                  achievement: aw.achievement,
                  periodText: aw.periodName,
                  signerName: aw.signerName,
                }))
              : [
                  {
                    id: 'single-preview',
                    studentName: certStudentName,
                    className: certClassName,
                    achievement: certAchievement,
                    periodText: certPeriodText,
                    signerName: certSignerName,
                  },
                ]
            ).map((certItem) => (
              <div
                key={certItem.id}
                className={`bg-white shadow-xl mx-auto p-4 sm:p-8 border-8 border-double border-[#0D47A1] relative ${
                  orientation === 'landscape'
                    ? 'w-full max-w-[980px] min-h-[660px]'
                    : 'w-full max-w-[720px] min-h-[960px]'
                }`}
              >
                {/* Inner decorative gold & blue border (Section 9.2: Đường viền trang trí xanh dương và vàng nhạt) */}
                <div className="border-4 border-[#FFE082] bg-gradient-to-b from-[#FFFFFF] via-[#F4FAFF]/40 to-[#FFFDF5] p-6 sm:p-10 h-full flex flex-col justify-between text-center">
                  {/* Top Header */}
                  <div className="space-y-2">
                    <div className="text-xs sm:text-sm font-bold text-[#17365D] uppercase tracking-wider">
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-[#17365D] underline underline-offset-4">
                      Độc lập - Tự do - Hạnh phúc
                    </div>

                    {/* Emblem / Custom Logo */}
                    <div className="pt-3 flex justify-center">
                      {customLogoDataUrl ? (
                        <img
                          src={customLogoDataUrl}
                          alt="Logo Trường"
                          className="h-16 w-16 object-contain"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full border-2 border-[#0D47A1] bg-[#E3F2FD] flex items-center justify-center">
                          <Award className="w-9 h-9 text-[#FF8A00]" />
                        </div>
                      )}
                    </div>

                    <div className="text-base sm:text-lg font-bold text-[#0D47A1] tracking-wide pt-1">
                      {certSchoolName}
                    </div>
                    <div className="text-xs font-bold text-[#64748B]">
                      BAN CHỦ NHIỆM LỚP {certItem.className} · NĂM HỌC 2026–2027
                    </div>
                  </div>

                  {/* Center Main Title & Student Info */}
                  <div className="my-6 space-y-4">
                    <h2 className="text-3xl sm:text-5xl font-bold text-[#0D47A1] tracking-widest uppercase">
                      {certHeaderTitle}
                    </h2>

                    <div className="text-base sm:text-lg text-[#17365D]">
                      Giáo viên chủ nhiệm Lớp {certItem.className} –{' '}
                      <strong>{certSchoolName}</strong> trao tặng:
                    </div>

                    <div className="py-2">
                      <span className="text-base text-[#64748B] block">
                        Học sinh:
                      </span>
                      <div className="text-2xl sm:text-4xl font-bold text-[#DC2626] mt-1">
                        {certItem.studentName}
                      </div>
                      <div className="text-base sm:text-lg font-bold text-[#0D47A1] mt-1">
                        Lớp: {certItem.className} – {certSchoolName}
                      </div>
                    </div>

                    <div className="max-w-2xl mx-auto px-4">
                      <div className="text-sm sm:text-base text-[#64748B]">
                        Đã có thành tích xuất sắc:
                      </div>
                      <div className="text-lg sm:text-xl font-bold text-[#17365D] mt-1 leading-relaxed">
                        “{certItem.achievement}”
                      </div>
                      <div className="text-sm font-semibold text-[#0D47A1] mt-2">
                        Thời gian khen thưởng: {certItem.periodText}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Signature Area */}
                  <div className="pt-6 grid grid-cols-2 items-end text-sm sm:text-base">
                    <div className="text-left pl-4 text-xs sm:text-sm text-[#64748B]">
                      <div>Sổ khen thưởng Lớp {certItem.className}</div>
                      <div>Năm học: 2026–2027</div>
                    </div>

                    <div className="text-center space-y-12">
                      <div>
                        <div className="italic text-[#17365D] text-xs sm:text-sm">
                          {certLocationDate}
                        </div>
                        <div className="font-bold text-[#0D47A1] uppercase mt-1">
                          {certSignerTitle}
                        </div>
                      </div>
                      <div className="font-bold text-lg text-[#17365D]">
                        {certItem.signerName}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
