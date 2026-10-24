import React, { useMemo, useRef, useState } from 'react';
import {
  CheckSquare,
  Download,
  Edit3,
  FileSpreadsheet,
  History,
  Lock,
  Plus,
  Printer,
  RotateCcw,
  ShieldAlert,
  Shuffle,
  Trophy,
  Unlock,
  Upload,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import {
  CompetitionCriterion,
  CompetitionRecord,
  PeriodFilterType,
} from '../../types/index.ts';
import {
  calculateGroupRankings,
  calculateNextMultiplier,
  calculateStudentRankings,
  formatVietnameseDate,
  getPeriodDateRange,
  toISODate,
} from '../../utils/calculations.ts';
import {
  downloadCriteriaExcelTemplate,
  exportToExcelFile,
  parseCriteriaFromExcelFile,
} from '../../utils/exportUtils.ts';

type CompetitionSubTab =
  | 'RECORD'
  | 'RANKING'
  | 'GROUPS'
  | 'CRITERIA'
  | 'SNAPSHOTS';

export const CompetitionPage: React.FC = () => {
  const {
    state,
    sessionRole,
    setSessionRole,
    updateGroup,
    updateStudent,
    autoAssignStudentsToGroups,
    saveCriteriaList,
    toggleCriterionActive,
    deleteCriterion,
    addCompetitionRecordsBatch,
    updateCompetitionRecord,
    deleteOrUndoCompetitionRecord,
    setGroupScoringMode,
    lockCompetitionPeriod,
    unlockCompetitionPeriod,
  } = useWorkspace();

  const isLeaderMode = sessionRole.role === 'TO_TRUONG';
  const leaderGroup = state.groups.find((g) => g.id === sessionRole.groupId);
  const dutyTargetGroup = state.groups.find(
    (g) => g.id === leaderGroup?.dutyTargetGroupId
  );

  const [subTab, setSubTab] = useState<CompetitionSubTab>('RECORD');
  const today = toISODate(new Date());

  // Quick Record Form States
  const [recordDate, setRecordDate] = useState(today);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    isLeaderMode && dutyTargetGroup
      ? dutyTargetGroup.id
      : state.groups[0]?.id || 'group-1'
  );
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedCriteriaId, setSelectedCriteriaId] = useState<string>(
    state.criteria[0]?.id || 'crit-1'
  );
  const [subjectOrActivity, setSubjectOrActivity] = useState('Hoạt động học tập');
  const [recordNotes, setRecordNotes] = useState('');
  const [recordEvidence, setRecordEvidence] = useState('');

  // Ranking Filter States
  const [periodType, setPeriodType] = useState<PeriodFilterType>('WEEK');
  const [referenceDate, setReferenceDate] = useState(today);
  const [rankingGroupFilter, setRankingGroupFilter] = useState('ALL');
  const [rankingCriteriaFilter, setRankingCriteriaFilter] = useState('ALL');

  // Edit Record Modal State
  const [editingRecord, setEditingRecord] = useState<CompetitionRecord | null>(
    null
  );
  const [editCriteriaId, setEditCriteriaId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editEvidence, setEditEvidence] = useState('');
  const [editReason, setEditReason] = useState('');

  // Criteria Form State
  const [critName, setCritName] = useState('');
  const [critCode, setCritCode] = useState('');
  const [critCategory, setCritCategory] =
    useState<CompetitionCriterion['category']>('Học tập');
  const [critType, setCritType] = useState<'CONG' | 'TRU'>('CONG');
  const [critPoints, setCritPoints] = useState<number>(2);
  const [critDesc, setCritDesc] = useState('');
  const criteriaFileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync target group when switching to leader mode
  React.useEffect(() => {
    if (isLeaderMode && dutyTargetGroup) {
      setSelectedGroupId(dutyTargetGroup.id);
      setSelectedStudentIds([]);
      setSubTab('RECORD');
    }
  }, [isLeaderMode, dutyTargetGroup]);

  const criteriaMap = useMemo(
    () => new Map(state.criteria.map((c) => [c.id, c])),
    [state.criteria]
  );

  const periodRange = useMemo(
    () => getPeriodDateRange(periodType, referenceDate),
    [periodType, referenceDate]
  );

  // Allowed groups for current user:
  // Yêu cầu 6.1: "Chỉ hiển thị danh sách tổ được chấm thi đua ở tài khoản của tổ trưởng được phân trực"
  const allowedGroupsForRecording = useMemo(() => {
    if (isLeaderMode && dutyTargetGroup) {
      return [dutyTargetGroup];
    }
    return state.groups;
  }, [isLeaderMode, dutyTargetGroup, state.groups]);

  const activeGroupForRecording =
    allowedGroupsForRecording.find((g) => g.id === selectedGroupId) ||
    allowedGroupsForRecording[0];

  const studentsInSelectedGroup = useMemo(
    () =>
      state.students.filter(
        (s) =>
          s.status === 'Đang học' &&
          s.groupId === activeGroupForRecording?.id
      ),
    [state.students, activeGroupForRecording]
  );

  const activeCriteriaList = useMemo(
    () => state.criteria.filter((c) => c.isActive),
    [state.criteria]
  );

  const currentCriterion =
    activeCriteriaList.find((c) => c.id === selectedCriteriaId) ||
    activeCriteriaList[0];

  // Rankings calculation
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
          criteriaId: rankingCriteriaFilter,
        }
      ),
    [
      state.groups,
      state.students,
      state.competitionRecords,
      criteriaMap,
      state.groupScoringMode,
      periodRange,
      rankingCriteriaFilter,
    ]
  );

  const studentRankings = useMemo(
    () =>
      calculateStudentRankings(
        state.students,
        state.groups,
        state.competitionRecords,
        criteriaMap,
        {
          startDate: periodRange.startDate,
          endDate: periodRange.endDate,
          groupId: rankingGroupFilter,
          criteriaId: rankingCriteriaFilter,
        }
      ),
    [
      state.students,
      state.groups,
      state.competitionRecords,
      criteriaMap,
      periodRange,
      rankingGroupFilter,
      rankingCriteriaFilter,
    ]
  );

  // Recent competition records filtered for view
  const visibleRecords = useMemo(() => {
    return state.competitionRecords.filter((rec) => {
      if (isLeaderMode && dutyTargetGroup) {
        return rec.groupId === dutyTargetGroup.id;
      }
      return true;
    });
  }, [state.competitionRecords, isLeaderMode, dutyTargetGroup]);

  const toggleSelectStudent = (stId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(stId) ? prev.filter((id) => id !== stId) : [...prev, stId]
    );
  };

  // Nhấp nút chấm nhanh 1 học sinh (tự động cộng hệ số 1x, 2x, 3x... nếu lặp lại tiêu chí)
  const handleQuickScoreSingleStudent = (studentId: string) => {
    if (!currentCriterion) return;
    addCompetitionRecordsBatch({
      date: recordDate,
      studentIds: [studentId],
      criteriaId: currentCriterion.id,
      subjectOrActivity,
      notes: recordNotes,
      evidence: recordEvidence,
    });
  };

  // Ghi nhận hàng loạt cho nhiều học sinh được chọn
  const handleBatchRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCriterion || selectedStudentIds.length === 0) return;
    addCompetitionRecordsBatch({
      date: recordDate,
      studentIds: selectedStudentIds,
      criteriaId: currentCriterion.id,
      subjectOrActivity,
      notes: recordNotes,
      evidence: recordEvidence,
    });
    setSelectedStudentIds([]);
    setRecordNotes('');
    setRecordEvidence('');
  };

  const openEditRecordModal = (rec: CompetitionRecord) => {
    setEditingRecord(rec);
    setEditCriteriaId(rec.criteriaId);
    setEditDate(rec.date);
    setEditSubject(rec.subjectOrActivity);
    setEditNotes(rec.notes);
    setEditEvidence(rec.evidence);
    setEditReason('');
  };

  const handleSaveEditedRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !editReason.trim()) return;
    updateCompetitionRecord(editingRecord.id, {
      criteriaId: editCriteriaId,
      date: editDate,
      subjectOrActivity: editSubject,
      notes: editNotes,
      evidence: editEvidence,
      reason: editReason.trim(),
    });
    setEditingRecord(null);
  };

  const handleAddCriterion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!critName.trim()) return;
    const absPts = Math.abs(Number(critPoints)) || 2;
    const finalPoints = critType === 'TRU' ? -absPts : absPts;
    const newItem: CompetitionCriterion = {
      id: `crit-${Date.now()}`,
      code:
        critCode.trim() ||
        `TC${String(state.criteria.length + 1).padStart(2, '0')}`,
      name: critName.trim(),
      category: critCategory,
      type: critType,
      points: finalPoints,
      description: critDesc.trim() || critName.trim(),
      isActive: true,
    };
    saveCriteriaList([...state.criteria, newItem], false);
    setCritName('');
    setCritCode('');
    setCritDesc('');
  };

  // Yêu cầu 6.2: "Thêm tiêu chí từ file excel và xoá hết dữ liệu cũ khi import tiêu chí mới"
  const handleImportCriteriaExcel = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await parseCriteriaFromExcelFile(file);
      if (imported.length > 0) {
        saveCriteriaList(imported, true);
      }
    } catch (err) {
      console.error('Criteria import error:', err);
    } finally {
      e.target.value = '';
    }
  };

  const handleLockCurrentPeriod = () => {
    lockCompetitionPeriod({
      classId: state.currentClassId,
      name: `${periodRange.label}`,
      periodType,
      startDate: periodRange.startDate,
      endDate: periodRange.endDate,
      isLocked: true,
      lockedAt: new Date().toLocaleString('vi-VN'),
      lockedBy: sessionRole.actorName,
      scoringMode: state.groupScoringMode,
      groupRankings,
      studentRankings,
      unlockHistory: [],
    });
  };

  const handleExportRankingExcel = () => {
    const rows = studentRankings.map((st) => ({
      'Hạng': st.rank,
      'Mã HS': st.studentCode,
      'Họ và tên': st.fullName,
      'Tổ': st.groupName,
      'Chức vụ': st.position,
      'Điểm gốc': st.initialScore,
      'Tổng điểm cộng': st.bonusPoints,
      'Tổng điểm trừ': st.penaltyPoints,
      'Hiệu số trong kỳ': st.netPeriodPoints,
      'Tổng điểm cuối kỳ': st.finalScore,
      'Ghi chú lỗi vi phạm': st.violationSummary.join('; ') || 'Không vi phạm',
    }));
    exportToExcelFile(
      rows,
      'BangXepHangThiDua',
      `Bang_Xep_Hang_Thi_Dua_10A3_${periodType}.xlsx`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="crystal-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <div className="text-xs font-bold text-[#0D47A1] uppercase tracking-wider">
            PHÂN HỆ 3 · TRUNG TÂM QUẢN LÝ THI ĐUA 4 TỔ & CHẤM TRỰC CHÉO
          </div>
          <h2 className="text-2xl font-bold text-[#17365D] mt-1">
            {isLeaderMode
              ? `Giao diện Tổ trưởng Trực Thi đua: ${sessionRole.actorName} → Chấm ${
                  dutyTargetGroup?.name || 'Tổ được phân công'
                }`
              : 'Quản lý 4 Tổ Thi đua, Chấm điểm Hệ số (1x, 2x, 3x) & Bảng Xếp hạng'}
          </h2>
          <p className="text-sm text-[#64748B] mt-0.5">
            {isLeaderMode
              ? 'Tài khoản Tổ trưởng chỉ hiển thị danh sách học sinh thuộc tổ được phân công trực chấm. Có nút Hoàn tác/Xóa ngay nếu chấm nhầm.'
              : 'Tự động tăng hệ số 1x, 2x, 3x khi học sinh lặp lại tiêu chí; hỗ trợ phân công trực chéo 4 tổ và chốt kỳ thi đua.'}
          </p>
        </div>

        {/* Quick Role Tester for GVCN / Group Leaders */}
        <div className="flex flex-wrap items-center gap-2">
          {!isLeaderMode ? (
            <div className="flex flex-wrap items-center gap-1.5 bg-[#E3F2FD] p-1.5 rounded-xl border border-[#D7EAFE]">
              <span className="text-xs font-bold text-[#0D47A1] px-2">
                Chế độ xem thử Tổ trưởng:
              </span>
              {state.groups.map((grp) => {
                const target = state.groups.find(
                  (g) => g.id === grp.dutyTargetGroupId
                );
                return (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() => {
                      const leader = state.students.find(
                        (s) => s.id === grp.leaderStudentId
                      );
                      setSessionRole({
                        role: 'TO_TRUONG',
                        actorName: leader
                          ? `${leader.fullName.replace(' (Demo)', '')} (${grp.name})`
                          : `Tổ trưởng ${grp.name}`,
                        groupId: grp.id,
                      });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#0D47A1] hover:text-white text-xs font-bold text-[#0D47A1] transition-colors"
                    title={`Mở giao diện của Tổ trưởng ${grp.name} (chỉ được chấm ${target?.name})`}
                  >
                    TT {grp.name} (Chấm {target?.name})
                  </button>
                );
              })}
            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                setSessionRole({
                  role: 'GVCN',
                  actorName: 'Nguyễn Tiến Dương',
                })
              }
              className="px-4 py-2 rounded-lg bg-[#0D47A1] text-white text-xs font-bold hover:bg-[#17365D]"
            >
              Thoát chế độ Tổ trưởng · Về quyền GVCN Nguyễn Tiến Dương
            </button>
          )}
        </div>
      </div>

      {/* Sub-navigation Tabs (Hidden in restricted Leader Mode except RECORD) */}
      {!isLeaderMode && (
        <div className="flex flex-wrap items-center gap-2 no-print">
          {[
            {
              id: 'RECORD' as const,
              label: '1. Ghi nhận & Chấm điểm nhanh (1x, 2x, 3x)',
              icon: Zap,
            },
            {
              id: 'RANKING' as const,
              label: '2. Bảng xếp hạng Tổ & Cá nhân',
              icon: Trophy,
            },
            {
              id: 'GROUPS' as const,
              label: '3. Quản lý 4 Tổ & Phân công trực chéo',
              icon: Users,
            },
            {
              id: 'CRITERIA' as const,
              label: '4. Cấu hình Bộ tiêu chí & Import Excel',
              icon: CheckSquare,
            },
            {
              id: 'SNAPSHOTS' as const,
              label: `5. Kỳ thi đua đã chốt (${state.competitionSnapshots.length})`,
              icon: Lock,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors ${
                  active
                    ? 'bg-[#0D47A1] text-white shadow-xs'
                    : 'bg-white border border-[#D7EAFE] text-[#17365D] hover:bg-[#E3F2FD]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 1: GHI NHẬN THI ĐUA & CHẤM ĐIỂM HỆ SỐ 1x, 2x, 3x (Section 6.1 & 6.3) */}
      {/* ===================================================================== */}
      {subTab === 'RECORD' && (
        <div className="space-y-6">
          {isLeaderMode && (
            <div className="p-4 rounded-xl bg-[#FFF8F0] border border-[#FFE0B2] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-sm text-[#17365D]">
                <ShieldAlert className="w-5 h-5 text-[#FF8A00] shrink-0" />
                <div>
                  Bạn đang đăng nhập với quyền{' '}
                  <strong>{sessionRole.actorName}</strong>. Theo phân công của
                  GVCN Nguyễn Tiến Dương, bạn chỉ được phép xem và chấm thi đua
                  cho <strong>{dutyTargetGroup?.name}</strong>.
                </div>
              </div>
              <span className="text-xs font-bold text-[#0D47A1]">
                Chấm nhầm có thể nhấn nút "Hoàn tác / Xóa" ngay bên dưới
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Chọn Tiêu chí & Thông tin buổi chấm */}
            <div className="lg:col-span-5 crystal-card rounded-2xl p-5 space-y-4">
              <h3 className="text-base font-bold text-[#0D47A1] border-b border-[#D7EAFE] pb-2.5">
                Bước 1: Chọn Ngày, Tổ được chấm & Tiêu chí thi đua
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="block text-xs font-bold text-[#17365D] mb-1">
                    Ngày ghi nhận
                  </label>
                  <input
                    type="date"
                    value={recordDate}
                    onChange={(e) => setRecordDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE] bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#17365D] mb-1">
                    Tổ được chấm thi đua
                  </label>
                  <select
                    value={activeGroupForRecording?.id || ''}
                    onChange={(e) => {
                      setSelectedGroupId(e.target.value);
                      setSelectedStudentIds([]);
                    }}
                    disabled={isLeaderMode}
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE] bg-white font-bold text-[#0D47A1] disabled:bg-[#E3F2FD]/50"
                  >
                    {allowedGroupsForRecording.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17365D] mb-1.5">
                  Chọn Tiêu chí thi đua (Điểm cộng / Điểm trừ)
                </label>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {activeCriteriaList.map((crit) => {
                    const isSelected = currentCriterion?.id === crit.id;
                    return (
                      <button
                        key={crit.id}
                        type="button"
                        onClick={() => setSelectedCriteriaId(crit.id)}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-[#0D47A1] text-white border-[#0D47A1] font-bold shadow-xs'
                            : 'bg-white border-[#D7EAFE] text-[#17365D] hover:bg-[#F4FAFF]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm truncate">
                            {crit.code} · {crit.name}
                          </div>
                          <div
                            className={`text-[11px] truncate ${
                              isSelected ? 'text-[#E3F2FD]' : 'text-[#64748B]'
                            }`}
                          >
                            Nhóm: {crit.category}
                          </div>
                        </div>
                        <span
                          className={`text-sm font-bold tabular-nums shrink-0 ${
                            isSelected
                              ? 'text-white'
                              : crit.points > 0
                              ? 'text-[#16A34A]'
                              : 'text-[#DC2626]'
                          }`}
                        >
                          {crit.points > 0 ? `+${crit.points}đ` : `${crit.points}đ`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Môn học / Hoạt động
                  </label>
                  <input
                    type="text"
                    value={subjectOrActivity}
                    onChange={(e) => setSubjectOrActivity(e.target.value)}
                    placeholder="VD: Toán học, Truy bài đầu giờ..."
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Minh chứng (nếu có)
                  </label>
                  <input
                    type="text"
                    value={recordEvidence}
                    onChange={(e) => setRecordEvidence(e.target.value)}
                    placeholder="Sổ đầu bài / Sổ cờ đỏ..."
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17365D] mb-1">
                  Ghi chú bổ sung
                </label>
                <input
                  type="text"
                  value={recordNotes}
                  onChange={(e) => setRecordNotes(e.target.value)}
                  placeholder="Ghi chú chi tiết lượt chấm..."
                  className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE] text-xs"
                />
              </div>
            </div>

            {/* Right Column: Danh sách học sinh của Tổ & Chấm 1 chạm (kèm hệ số 1x, 2x, 3x...) */}
            <div className="lg:col-span-7 crystal-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D7EAFE] pb-2.5 mb-3">
                  <div>
                    <h3 className="text-base font-bold text-[#0D47A1]">
                      Bước 2: Chấm điểm Học sinh {activeGroupForRecording?.name}
                    </h3>
                    <p className="text-xs text-[#64748B]">
                      Nhấp nút <strong>"Chấm ngay"</strong> trên từng học sinh (Hệ số tự động tăng <strong>1x → 2x → 3x...</strong> nếu lặp lại tiêu chí đang chọn) hoặc tích chọn nhiều học sinh để chấm cùng lúc.
                    </p>
                  </div>

                  {selectedStudentIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBatchRecordSubmit}
                      className="px-4 py-2 rounded-lg bg-[#0D47A1] text-white text-xs font-bold hover:bg-[#17365D] shadow-xs"
                    >
                      Chấm cùng lúc {selectedStudentIds.length} HS đã chọn
                    </button>
                  )}
                </div>

                {currentCriterion && (
                  <div className="mb-3 p-2.5 rounded-xl bg-[#E3F2FD]/70 border border-[#D7EAFE] text-xs flex items-center justify-between">
                    <span>
                      Tiêu chí đang chọn:{' '}
                      <strong className="text-[#0D47A1]">
                        {currentCriterion.name}
                      </strong>{' '}
                      (Điểm gốc:{' '}
                      <strong>
                        {currentCriterion.points > 0
                          ? `+${currentCriterion.points}đ`
                          : `${currentCriterion.points}đ`}
                      </strong>
                      )
                    </span>
                    <span className="text-[#64748B]">
                      Người chấm: <strong>{sessionRole.actorName}</strong>
                    </span>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#E3F2FD] text-[#0D47A1] text-left">
                        <th className="py-2.5 px-2.5 w-8">
                          <input
                            type="checkbox"
                            checked={
                              studentsInSelectedGroup.length > 0 &&
                              selectedStudentIds.length ===
                                studentsInSelectedGroup.length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIds(
                                  studentsInSelectedGroup.map((s) => s.id)
                                );
                              } else {
                                setSelectedStudentIds([]);
                              }
                            }}
                          />
                        </th>
                        <th className="py-2.5 px-2.5 font-bold">Mã HS</th>
                        <th className="py-2.5 px-2.5 font-bold">Họ và tên</th>
                        <th className="py-2.5 px-2.5 font-bold">Chức vụ</th>
                        <th className="py-2.5 px-2.5 font-bold text-center">
                          Hệ số tiếp theo
                        </th>
                        <th className="py-2.5 px-2.5 font-bold text-right">
                          Chấm 1 chạm
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D7EAFE]">
                      {studentsInSelectedGroup.map((st) => {
                        const nextMult = currentCriterion
                          ? calculateNextMultiplier(
                              state.competitionRecords,
                              st.id,
                              currentCriterion.id
                            )
                          : 1;
                        const nextTotalPoints = currentCriterion
                          ? currentCriterion.points * nextMult
                          : 0;

                        return (
                          <tr key={st.id} className="hover:bg-[#F4FAFF]">
                            <td className="py-2.5 px-2.5">
                              <input
                                type="checkbox"
                                checked={selectedStudentIds.includes(st.id)}
                                onChange={() => toggleSelectStudent(st.id)}
                              />
                            </td>
                            <td className="py-2.5 px-2.5 font-bold text-[#0D47A1] text-xs tabular-nums">
                              {st.studentCode}
                            </td>
                            <td className="py-2.5 px-2.5 font-bold text-[#17365D]">
                              {st.fullName}
                            </td>
                            <td className="py-2.5 px-2.5 text-xs text-[#64748B]">
                              {st.position}
                            </td>
                            <td className="py-2.5 px-2.5 text-center tabular-nums">
                              <span
                                className={`text-xs font-bold ${
                                  nextMult > 1
                                    ? 'text-[#FF8A00]'
                                    : 'text-[#64748B]'
                                }`}
                              >
                                Lần {nextMult} (Hệ số {nextMult}x)
                              </span>
                            </td>
                            <td className="py-2.5 px-2.5 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuickScoreSingleStudent(st.id)
                                }
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-90 tabular-nums ${
                                  nextTotalPoints >= 0
                                    ? 'bg-[#16A34A]'
                                    : 'bg-[#DC2626]'
                                }`}
                              >
                                Chấm {nextMult}x ({nextTotalPoints > 0 ? `+${nextTotalPoints}` : nextTotalPoints}đ)
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Lịch sử chấm thi đua gần đây & Nút Hoàn tác / Xóa khi chấm nhầm */}
          <div className="crystal-card rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-base font-bold text-[#0D47A1]">
                  Nhật ký các lượt chấm thi đua gần đây (Có nút Hoàn tác / Xóa khi chấm nhầm & Lưu lịch sử sửa)
                </h3>
                <p className="text-xs text-[#64748B]">
                  Mọi thao tác sửa hoặc hoàn tác khi chấm nhầm đều được ghi nhận minh bạch kèm lý do.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#E3F2FD] text-[#0D47A1] text-left">
                    <th className="py-2.5 px-3 font-bold">Ngày</th>
                    <th className="py-2.5 px-3 font-bold">Học sinh</th>
                    <th className="py-2.5 px-3 font-bold">Tổ</th>
                    <th className="py-2.5 px-3 font-bold">Tiêu chí</th>
                    <th className="py-2.5 px-3 font-bold text-center">Hệ số</th>
                    <th className="py-2.5 px-3 font-bold text-right">Điểm</th>
                    <th className="py-2.5 px-3 font-bold">Môn / Ghi chú</th>
                    <th className="py-2.5 px-3 font-bold">Người chấm</th>
                    <th className="py-2.5 px-3 font-bold text-center">
                      Sửa / Hoàn tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D7EAFE]">
                  {visibleRecords.slice(0, 25).map((rec) => {
                    const st = state.students.find(
                      (s) => s.id === rec.studentId
                    );
                    const grp = state.groups.find((g) => g.id === rec.groupId);
                    return (
                      <tr
                        key={rec.id}
                        className={
                          rec.isDeleted
                            ? 'bg-slate-100 text-[#64748B] line-through'
                            : 'hover:bg-[#F4FAFF]'
                        }
                      >
                        <td className="py-2.5 px-3 text-xs tabular-nums">
                          {formatVietnameseDate(rec.date)}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-[#17365D]">
                          {st?.fullName || rec.studentId}
                        </td>
                        <td className="py-2.5 px-3 text-xs">
                          {grp?.name || rec.groupId}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#0D47A1]">
                          {rec.criteriaName}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-[#FF8A00] tabular-nums">
                          {rec.multiplier}x
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-bold tabular-nums ${
                            rec.totalPoints >= 0
                              ? 'text-[#16A34A]'
                              : 'text-[#DC2626]'
                          }`}
                        >
                          {rec.totalPoints > 0
                            ? `+${rec.totalPoints}đ`
                            : `${rec.totalPoints}đ`}
                        </td>
                        <td className="py-2.5 px-3 text-xs">
                          <div>{rec.subjectOrActivity}</div>
                          {rec.notes && (
                            <div className="text-[#64748B]">{rec.notes}</div>
                          )}
                          {rec.editHistory && rec.editHistory.length > 0 && (
                            <div className="text-[11px] text-[#0D47A1] mt-0.5">
                              Đã chỉnh sửa ({rec.editHistory.length} lần) – Lý do:{' '}
                              {rec.editHistory[0].reason}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-[#64748B]">
                          {rec.recordedBy}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {!rec.isDeleted ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditRecordModal(rec)}
                                className="px-2 py-1 rounded border border-[#D7EAFE] text-xs font-bold text-[#0D47A1] hover:bg-[#E3F2FD]"
                                title="Sửa bản ghi và lưu lịch sử"
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  deleteOrUndoCompetitionRecord(
                                    rec.id,
                                    'Chấm nhầm / Hoàn tác trực tiếp'
                                  )
                                }
                                className="px-2 py-1 rounded bg-red-50 border border-red-200 text-xs font-bold text-[#DC2626] hover:bg-red-100 flex items-center gap-1"
                                title="Hoàn tác hoặc xóa lượt chấm nhầm này"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Hoàn tác</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-[#DC2626] font-semibold">
                              Đã hoàn tác
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: BẢNG XẾP HẠNG TỔ & CÁ NHÂN (Section 6.4 & 6.5)                 */}
      {/* ===================================================================== */}
      {subTab === 'RANKING' && !isLeaderMode && (
        <div className="space-y-6">
          {/* Filter & Scoring Mode Toolbar */}
          <div className="crystal-card rounded-2xl p-4 no-print flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: 'DAY', label: 'Theo Ngày' },
                  { id: 'WEEK', label: 'Theo Tuần' },
                  { id: 'MONTH', label: 'Theo Tháng' },
                  { id: 'HK1', label: 'Học kỳ I' },
                  { id: 'HK2', label: 'Học kỳ II' },
                  { id: 'YEAR', label: 'Cả năm học' },
                ] as { id: PeriodFilterType; label: string }[]
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodType(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    periodType === p.id
                      ? 'bg-[#0D47A1] text-white'
                      : 'bg-[#F4FAFF] border border-[#D7EAFE] text-[#17365D] hover:bg-[#E3F2FD]'
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
                title="Chọn ngày tham chiếu cho kỳ"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={state.groupScoringMode}
                onChange={(e) =>
                  setGroupScoringMode(e.target.value as 'SUM' | 'AVERAGE')
                }
                className="px-3 py-1.5 rounded-lg border border-[#0D47A1] bg-[#E3F2FD]/60 text-xs font-bold text-[#0D47A1]"
              >
                <option value="SUM">Cách tính Tổ: Tổng điểm thành viên</option>
                <option value="AVERAGE">
                  Cách tính Tổ: Điểm bình quân theo sĩ số
                </option>
              </select>

              <button
                type="button"
                onClick={handleLockCurrentPeriod}
                className="px-3.5 py-1.5 rounded-lg bg-[#16A34A] text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Chốt kỳ thi đua này</span>
              </button>

              <button
                type="button"
                onClick={handleExportRankingExcel}
                className="px-3 py-1.5 rounded-lg border border-[#0D47A1] text-[#0D47A1] text-xs font-bold flex items-center gap-1 hover:bg-[#E3F2FD]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Excel</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-lg bg-[#FF8A00] text-white text-xs font-bold flex items-center gap-1 hover:opacity-90"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In bảng thi đua</span>
              </button>
            </div>
          </div>

          {/* Bảng xếp hạng 4 Tổ */}
          <div className="crystal-card rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-lg font-bold text-[#0D47A1]">
                  Bảng Xếp Hạng 4 Tổ Thi Đua – {periodRange.label}
                </h3>
                <p className="text-xs text-[#64748B]">
                  Công thức: Điểm thi đua cá nhân = Tổng điểm cộng hợp lệ - Tổng điểm trừ hợp lệ trong kỳ.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#E3F2FD] text-[#0D47A1] text-left">
                    <th className="py-2.5 px-3 font-bold">Xếp hạng</th>
                    <th className="py-2.5 px-3 font-bold">Tên Tổ</th>
                    <th className="py-2.5 px-3 font-bold">Tổ trưởng</th>
                    <th className="py-2.5 px-3 font-bold text-center">Sĩ số</th>
                    <th className="py-2.5 px-3 font-bold text-right">
                      Tổng điểm cộng
                    </th>
                    <th className="py-2.5 px-3 font-bold text-right">
                      Tổng điểm trừ
                    </th>
                    <th className="py-2.5 px-3 font-bold text-right">
                      Hiệu số kỳ
                    </th>
                    <th className="py-2.5 px-3 font-bold text-right">
                      Tổng điểm Tổ
                    </th>
                    <th className="py-2.5 px-3 font-bold text-right">
                      Điểm bình quân/HS
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D7EAFE]">
                  {groupRankings.map((grp) => (
                    <tr key={grp.groupId} className="hover:bg-[#F4FAFF]">
                      <td className="py-2.5 px-3 font-bold text-[#0D47A1] tabular-nums">
                        Hạng {grp.rank}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#17365D]">
                        {grp.groupName}
                      </td>
                      <td className="py-2.5 px-3 text-[#17365D]">
                        {grp.leaderName}
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums">
                        {grp.memberCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#16A34A] tabular-nums">
                        +{grp.totalBonusPoints}đ
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#DC2626] tabular-nums">
                        -{grp.totalPenaltyPoints}đ
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#17365D] tabular-nums">
                        {grp.netPeriodPoints >= 0
                          ? `+${grp.netPeriodPoints}`
                          : grp.netPeriodPoints}
                        đ
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#0D47A1] tabular-nums">
                        {grp.totalFinalScore}đ
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#FF8A00] tabular-nums">
                        {grp.averageFinalScore}đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bảng xếp hạng Cá nhân */}
          <div className="crystal-card rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h3 className="text-lg font-bold text-[#0D47A1]">
                Bảng Xếp Hạng Thi Đua Cá Nhân ({studentRankings.length} học sinh)
              </h3>
              <div className="flex items-center gap-2 no-print">
                <select
                  value={rankingGroupFilter}
                  onChange={(e) => setRankingGroupFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-[#D7EAFE] text-xs"
                >
                  <option value="ALL">Tất cả 4 tổ</option>
                  {state.groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <select
                  value={rankingCriteriaFilter}
                  onChange={(e) => setRankingCriteriaFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-[#D7EAFE] text-xs"
                >
                  <option value="ALL">Tất cả tiêu chí</option>
                  {state.criteria.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#E3F2FD] text-[#0D47A1] text-left">
                    <th className="py-2.5 px-3 font-bold">Hạng</th>
                    <th className="py-2.5 px-3 font-bold">Mã HS</th>
                    <th className="py-2.5 px-3 font-bold">Họ và tên</th>
                    <th className="py-2.5 px-3 font-bold">Tổ</th>
                    <th className="py-2.5 px-3 font-bold text-right">Điểm gốc</th>
                    <th className="py-2.5 px-3 font-bold text-right">Điểm cộng</th>
                    <th className="py-2.5 px-3 font-bold text-right">Điểm trừ</th>
                    <th className="py-2.5 px-3 font-bold text-right">
                      Điểm kỳ
                    </th>
                    <th className="py-2.5 px-3 font-bold text-right">
                      Tổng điểm
                    </th>
                    <th className="py-2.5 px-3 font-bold">
                      Ghi chú lỗi vi phạm (nếu có)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D7EAFE]">
                  {studentRankings.map((st) => (
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
                      <td className="py-2.5 px-3 text-right text-[#64748B] tabular-nums">
                        {st.initialScore}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#16A34A] tabular-nums">
                        +{st.bonusPoints}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#DC2626] tabular-nums">
                        -{st.penaltyPoints}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold tabular-nums">
                        {st.netPeriodPoints >= 0
                          ? `+${st.netPeriodPoints}`
                          : st.netPeriodPoints}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#0D47A1] tabular-nums">
                        {st.finalScore}đ
                      </td>
                      <td className="py-2.5 px-3 text-xs">
                        {st.violationSummary.length > 0 ? (
                          <span className="text-[#DC2626]">
                            {st.violationSummary.join('; ')}
                          </span>
                        ) : (
                          <span className="text-[#16A34A]">Không vi phạm</span>
                        )}
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
      {/* TAB 3: QUẢN LÝ 4 TỔ & PHÂN CÔNG TỔ TRƯỞNG TRỰC CHÉO (Section 6.1)      */}
      {/* ===================================================================== */}
      {subTab === 'GROUPS' && !isLeaderMode && (
        <div className="space-y-6">
          <div className="crystal-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-[#0D47A1]">
                Cấu hình 4 Tổ Thi Đua & Phương án Phân công Tổ trưởng Trực chéo
              </h3>
              <p className="text-xs text-[#64748B]">
                Giáo viên chủ nhiệm tùy chỉnh Tổ trưởng và phân công mỗi Tổ trưởng chấm trực một tổ khác.
              </p>
            </div>
            <button
              type="button"
              onClick={autoAssignStudentsToGroups}
              className="px-4 py-2 rounded-lg bg-[#0D47A1] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#17365D]"
            >
              <Shuffle className="w-4 h-4" />
              <span>Tự động chia đều học sinh từ danh sách vào 4 tổ</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {state.groups.map((grp) => {
              const members = state.students.filter(
                (s) => s.groupId === grp.id && s.status === 'Đang học'
              );
              const groupStat = groupRankings.find(
                (r) => r.groupId === grp.id
              );

              return (
                <div
                  key={grp.id}
                  className="crystal-card rounded-2xl p-5 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-[#D7EAFE] pb-3">
                    <div>
                      <input
                        type="text"
                        value={grp.name}
                        onChange={(e) =>
                          updateGroup({ ...grp, name: e.target.value })
                        }
                        className="text-lg font-bold text-[#0D47A1] bg-transparent border-b border-dashed border-[#42A5F5] focus:outline-none"
                      />
                      <div className="text-xs text-[#64748B] mt-0.5">
                        Sĩ số: <strong>{members.length}</strong> thành viên · Hạng hiện tại:{' '}
                        <strong className="text-[#FF8A00]">
                          #{groupStat?.rank ?? '-'} ({groupStat?.totalFinalScore ?? 0}đ)
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-[#17365D] mb-1">
                        Phân công Tổ trưởng {grp.name}:
                      </label>
                      <select
                        value={grp.leaderStudentId}
                        onChange={(e) =>
                          updateGroup({
                            ...grp,
                            leaderStudentId: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-2 rounded-lg border border-[#D7EAFE] bg-white font-bold text-[#0D47A1]"
                      >
                        <option value="">-- Chọn Tổ trưởng --</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.fullName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-[#FF8A00] mb-1">
                        Tổ trưởng {grp.name} trực chấm tổ nào?
                      </label>
                      <select
                        value={grp.dutyTargetGroupId}
                        onChange={(e) =>
                          updateGroup({
                            ...grp,
                            dutyTargetGroupId: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-2 rounded-lg border border-[#FFE0B2] bg-[#FFF8F0] font-bold text-[#17365D]"
                      >
                        {state.groups
                          .filter((other) => other.id !== grp.id)
                          .map((other) => (
                            <option key={other.id} value={other.id}>
                              Chấm trực {other.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Danh sách thành viên trong tổ */}
                  <div>
                    <div className="text-xs font-bold text-[#17365D] mb-2">
                      Danh sách thành viên ({members.length} học sinh):
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-[#D7EAFE] border border-[#D7EAFE] rounded-xl bg-white">
                      {members.map((m, idx) => (
                        <div
                          key={m.id}
                          className="px-3 py-2 text-xs flex items-center justify-between hover:bg-[#F4FAFF]"
                        >
                          <div>
                            <span className="text-[#64748B] mr-1.5 tabular-nums">
                              {idx + 1}.
                            </span>
                            <strong className="text-[#17365D]">
                              {m.fullName}
                            </strong>{' '}
                            <span className="text-[#64748B]">
                              ({m.position})
                            </span>
                          </div>
                          <select
                            value={m.groupId}
                            onChange={(e) =>
                              updateStudent({ ...m, groupId: e.target.value })
                            }
                            className="px-2 py-0.5 rounded border border-[#D7EAFE] text-[11px] text-[#0D47A1]"
                            title="Chuyển tổ cho học sinh"
                          >
                            {state.groups.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: CẤU HÌNH TIÊU CHÍ THI ĐUA & IMPORT EXCEL (Section 6.2)          */}
      {/* ===================================================================== */}
      {subTab === 'CRITERIA' && !isLeaderMode && (
        <div className="space-y-6">
          <div className="crystal-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-[#0D47A1]">
                Cấu hình Bộ Tiêu Chí Thi Đua Lớp 10A3 ({state.criteria.length} tiêu chí)
              </h3>
              <p className="text-xs text-[#64748B]">
                Khi Import bộ tiêu chí mới từ file Excel, hệ thống sẽ thay thế bộ tiêu chí mới và làm mới dữ liệu chấm cũ theo đúng yêu cầu.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={criteriaFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportCriteriaExcel}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => criteriaFileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-lg bg-[#16A34A] text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90"
              >
                <Upload className="w-4 h-4" />
                <span>Import Tiêu chí từ Excel (Xóa dữ liệu cũ)</span>
              </button>

              <button
                type="button"
                onClick={downloadCriteriaExcelTemplate}
                className="px-3 py-2 rounded-lg border border-[#D7EAFE] bg-white text-xs font-bold text-[#0D47A1] flex items-center gap-1.5 hover:bg-[#E3F2FD]"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Tải mẫu Excel Tiêu chí</span>
              </button>
            </div>
          </div>

          {/* Form thêm tiêu chí mới */}
          <form
            onSubmit={handleAddCriterion}
            className="crystal-card rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end text-xs"
          >
            <div>
              <label className="block font-bold text-[#17365D] mb-1">
                Mã tiêu chí
              </label>
              <input
                type="text"
                value={critCode}
                onChange={(e) => setCritCode(e.target.value)}
                placeholder="VD: TC09"
                className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-bold text-[#17365D] mb-1">
                Tên tiêu chí thi đua *
              </label>
              <input
                type="text"
                value={critName}
                onChange={(e) => setCritName(e.target.value)}
                placeholder="VD: Đạt giải phong trào cấp trường"
                className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-[#17365D] mb-1">
                Nhóm tiêu chí
              </label>
              <select
                value={critCategory}
                onChange={(e) =>
                  setCritCategory(
                    e.target.value as CompetitionCriterion['category']
                  )
                }
                className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
              >
                <option value="Học tập">Học tập</option>
                <option value="Nề nếp">Nề nếp</option>
                <option value="Phong trào">Phong trào</option>
                <option value="Vệ sinh & Hoạt động">Vệ sinh & Hoạt động</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#17365D] mb-1">
                Loại & Điểm số
              </label>
              <div className="flex gap-1.5">
                <select
                  value={critType}
                  onChange={(e) =>
                    setCritType(e.target.value as 'CONG' | 'TRU')
                  }
                  className="w-1/2 px-2 py-2 rounded-lg border border-[#D7EAFE]"
                >
                  <option value="CONG">Cộng (+)</option>
                  <option value="TRU">Trừ (-)</option>
                </select>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={critPoints}
                  onChange={(e) => setCritPoints(Number(e.target.value))}
                  className="w-1/2 px-2 py-2 rounded-lg border border-[#D7EAFE]"
                />
              </div>
            </div>
            <div>
              <button
                type="submit"
                className="w-full py-2 px-3 rounded-lg bg-[#0D47A1] text-white font-bold hover:bg-[#17365D] flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm tiêu chí</span>
              </button>
            </div>
          </form>

          {/* Danh sách tiêu chí */}
          <div className="crystal-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#E3F2FD] text-[#0D47A1] text-left">
                    <th className="py-3 px-3 font-bold">Mã</th>
                    <th className="py-3 px-3 font-bold">Tên tiêu chí</th>
                    <th className="py-3 px-3 font-bold">Nhóm</th>
                    <th className="py-3 px-3 font-bold">Loại</th>
                    <th className="py-3 px-3 font-bold text-right">Số điểm</th>
                    <th className="py-3 px-3 font-bold">Mô tả</th>
                    <th className="py-3 px-3 font-bold text-center">
                      Trạng thái
                    </th>
                    <th className="py-3 px-3 font-bold text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D7EAFE]">
                  {state.criteria.map((c) => (
                    <tr key={c.id} className="hover:bg-[#F4FAFF]">
                      <td className="py-2.5 px-3 font-bold text-[#0D47A1] tabular-nums">
                        {c.code}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#17365D]">
                        {c.name}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-[#64748B]">
                        {c.category}
                      </td>
                      <td className="py-2.5 px-3 text-xs font-bold">
                        {c.type === 'CONG' ? (
                          <span className="text-[#16A34A]">Điểm cộng</span>
                        ) : (
                          <span className="text-[#DC2626]">Điểm trừ</span>
                        )}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold tabular-nums ${
                          c.points >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                        }`}
                      >
                        {c.points > 0 ? `+${c.points}đ` : `${c.points}đ`}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-[#64748B]">
                        {c.description}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleCriterionActive(c.id)}
                          className={`px-2.5 py-1 rounded text-xs font-bold ${
                            c.isActive
                              ? 'bg-[#E3F2FD] text-[#0D47A1]'
                              : 'bg-slate-100 text-[#64748B]'
                          }`}
                        >
                          {c.isActive ? 'Đang áp dụng' : 'Tạm tắt'}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => deleteCriterion(c.id)}
                          className="text-xs font-bold text-[#DC2626] hover:underline"
                        >
                          Xóa
                        </button>
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
      {/* TAB 5: KỲ THI ĐUA ĐÃ CHỐT (Section 6.5)                               */}
      {/* ===================================================================== */}
      {subTab === 'SNAPSHOTS' && !isLeaderMode && (
        <div className="space-y-4">
          <div className="crystal-card rounded-2xl p-5">
            <h3 className="text-lg font-bold text-[#0D47A1]">
              Lịch sử Các Kỳ Thi Đua Đã Chốt Kết Quả
            </h3>
            <p className="text-xs text-[#64748B] mt-1">
              Khi kỳ thi đua đã chốt, kết quả được đóng băng để không bị thay đổi khi nhập dữ liệu kỳ mới. Việc mở khóa điều chỉnh phải ghi rõ lý do vào nhật ký.
            </p>
          </div>

          {state.competitionSnapshots.length === 0 ? (
            <div className="crystal-card rounded-2xl p-8 text-center text-sm text-[#64748B]">
              Chưa có kỳ thi đua nào được chốt. Hãy vào mục{' '}
              <strong>"2. Bảng xếp hạng Tổ & Cá nhân"</strong> và nhấn{' '}
              <strong>"Chốt kỳ thi đua này"</strong>.
            </div>
          ) : (
            <div className="space-y-4">
              {state.competitionSnapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="crystal-card rounded-2xl p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D7EAFE] pb-3">
                    <div>
                      <div className="text-base font-bold text-[#0D47A1]">
                        {snap.name}
                      </div>
                      <div className="text-xs text-[#64748B]">
                        Chốt lúc: {snap.lockedAt} · Người chốt: {snap.lockedBy} · Trạng thái:{' '}
                        <strong
                          className={
                            snap.isLocked ? 'text-[#16A34A]' : 'text-[#FF8A00]'
                          }
                        >
                          {snap.isLocked ? 'Đã khóa bảo toàn kết quả' : 'Đã mở khóa điều chỉnh'}
                        </strong>
                      </div>
                    </div>

                    {snap.isLocked && (
                      <button
                        type="button"
                        onClick={() =>
                          unlockCompetitionPeriod(
                            snap.id,
                            'GVCN Nguyễn Tiến Dương mở khóa kiểm tra bổ sung'
                          )
                        }
                        className="px-3 py-1.5 rounded-lg border border-[#FF8A00] text-[#FF8A00] text-xs font-bold flex items-center gap-1 hover:bg-[#FFF8F0]"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Mở khóa điều chỉnh (Lưu nhật ký)</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    {snap.groupRankings.map((g) => (
                      <div
                        key={g.groupId}
                        className="p-3 rounded-xl bg-[#F4FAFF] border border-[#D7EAFE]"
                      >
                        <div className="font-bold text-[#0D47A1]">
                          Hạng #{g.rank}: {g.groupName}
                        </div>
                        <div className="text-[#17365D] mt-0.5 tabular-nums">
                          Điểm: <strong>{g.displayScore}đ</strong> (Cộng +{g.totalBonusPoints} / Trừ -{g.totalPenaltyPoints})
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL CHỈNH SỬA BẢN GHI THI ĐUA (Section 6.3: Phải lưu lịch sử thay đổi, người thay đổi và lý do) */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl border border-[#D7EAFE] max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#D7EAFE] pb-3">
              <h3 className="text-base font-bold text-[#0D47A1]">
                Chỉnh sửa Bản ghi Thi đua (Lưu lịch sử kiểm toán)
              </h3>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="text-[#64748B] hover:text-[#17365D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedRecord} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#17365D] mb-1">
                  Ngày ghi nhận
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#17365D] mb-1">
                  Tiêu chí áp dụng
                </label>
                <select
                  value={editCriteriaId}
                  onChange={(e) => setEditCriteriaId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                >
                  {state.criteria.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.points > 0 ? `+${c.points}` : c.points}đ)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#17365D] mb-1">
                  Môn học / Hoạt động
                </label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#17365D] mb-1">
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#DC2626] mb-1">
                  Lý do chỉnh sửa bản ghi * (Bắt buộc lưu lịch sử)
                </label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="VD: Tổ trưởng chọn nhầm tiêu chí..."
                  className="w-full px-3 py-2 rounded-lg border border-red-300"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#D7EAFE]">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 rounded-lg border border-[#D7EAFE] font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#0D47A1] text-white font-bold"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
