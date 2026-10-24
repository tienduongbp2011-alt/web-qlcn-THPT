import {
  AttendanceRecord,
  CompetitionCriterion,
  CompetitionRecord,
  FinanceTransaction,
  GroupRankingItem,
  PeriodFilterType,
  Student,
  StudentGroup,
  StudentRankingItem,
} from '../types/index.ts';

/**
 * Kiểm tra ngày có nằm trong khoảng thời gian [startDate, endDate] hay không
 */
export function isDateInRange(
  dateStr: string,
  startDate?: string,
  endDate?: string
): boolean {
  if (!dateStr) return false;
  if (startDate && dateStr < startDate) return false;
  if (endDate && dateStr > endDate) return false;
  return true;
}

/**
 * Lấy khoảng ngày mặc định theo loại kỳ thi đua dựa trên ngày tham chiếu
 */
export function getPeriodDateRange(
  periodType: PeriodFilterType,
  referenceDateStr: string
): { startDate: string; endDate: string; label: string } {
  const ref = new Date(referenceDateStr + 'T00:00:00');
  const year = ref.getFullYear();
  const month = ref.getMonth();

  if (periodType === 'DAY') {
    return {
      startDate: referenceDateStr,
      endDate: referenceDateStr,
      label: `Ngày ${formatVietnameseDate(referenceDateStr)}`,
    };
  }

  if (periodType === 'WEEK') {
    const dayOfWeek = ref.getDay(); // 0 (CN) -> 6 (T7)
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(ref);
    monday.setDate(ref.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const start = toISODate(monday);
    const end = toISODate(sunday);
    return {
      startDate: start,
      endDate: end,
      label: `Tuần (${formatVietnameseDate(start)} – ${formatVietnameseDate(end)})`,
    };
  }

  if (periodType === 'MONTH') {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return {
      startDate: toISODate(firstDay),
      endDate: toISODate(lastDay),
      label: `Tháng ${month + 1}/${year}`,
    };
  }

  if (periodType === 'HK1') {
    return {
      startDate: '2026-09-01',
      endDate: '2027-01-15',
      label: 'Học kỳ I (2026–2027)',
    };
  }

  if (periodType === 'HK2') {
    return {
      startDate: '2027-01-16',
      endDate: '2027-05-31',
      label: 'Học kỳ II (2026–2027)',
    };
  }

  return {
    startDate: '2026-09-01',
    endDate: '2027-05-31',
    label: 'Cả năm học 2026–2027',
  };
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatVietnameseDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatCurrencyVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
}

/**
 * Tính hệ số nhân (1x, 2x, 3x...) khi cùng 1 học sinh tái phạm / lặp lại cùng 1 tiêu chí
 * Yêu cầu 6.3: "Học sinh nếu 1 tiêu chí được lặp lại từ 2 lần trở lên thì hệ số sẽ cộng 1x, 2x, 3x... sau mỗi lần tổ trưởng nhấp nút chấm điểm tiêu chí cho cá nhân"
 */
export function calculateNextMultiplier(
  existingRecords: CompetitionRecord[],
  studentId: string,
  criteriaId: string,
  startDate?: string,
  endDate?: string
): number {
  const validOccurrences = existingRecords.filter(
    (r) =>
      !r.isDeleted &&
      r.studentId === studentId &&
      r.criteriaId === criteriaId &&
      isDateInRange(r.date, startDate, endDate)
  ).length;
  return validOccurrences + 1;
}

/**
 * Tính bảng xếp hạng cá nhân theo khoảng thời gian
 * Công thức 6.4: Điểm thi đua cá nhân = Tổng điểm cộng hợp lệ - Tổng điểm trừ hợp lệ trong kỳ.
 * Điểm tích lũy = Điểm ban đầu (100) + Điểm thi đua cá nhân trong kỳ.
 */
export function calculateStudentRankings(
  students: Student[],
  groups: StudentGroup[],
  records: CompetitionRecord[],
  criteriaMap: Map<string, CompetitionCriterion>,
  options?: {
    startDate?: string;
    endDate?: string;
    groupId?: string;
    criteriaId?: string;
  }
): StudentRankingItem[] {
  const groupNameMap = new Map(groups.map((g) => [g.id, g.name]));
  const activeStudents = students.filter(
    (s) =>
      s.status === 'Đang học' &&
      (!options?.groupId || options.groupId === 'ALL' || s.groupId === options.groupId)
  );

  const filteredRecords = records.filter((r) => {
    if (r.isDeleted) return false;
    if (!isDateInRange(r.date, options?.startDate, options?.endDate)) return false;
    if (options?.criteriaId && options.criteriaId !== 'ALL' && r.criteriaId !== options.criteriaId) {
      return false;
    }
    const crit = criteriaMap.get(r.criteriaId);
    if (crit && !crit.isActive) return false;
    return true;
  });

  const items: StudentRankingItem[] = activeStudents.map((st) => {
    const stRecords = filteredRecords.filter((r) => r.studentId === st.id);
    let bonusPoints = 0;
    let penaltyPoints = 0;
    let bonusCount = 0;
    let violationCount = 0;
    const violationSummary: string[] = [];

    for (const rec of stRecords) {
      if (rec.totalPoints >= 0) {
        bonusPoints += rec.totalPoints;
        bonusCount += 1;
      } else {
        const absPenalty = Math.abs(rec.totalPoints);
        penaltyPoints += absPenalty;
        violationCount += 1;
        violationSummary.push(
          `${rec.criteriaName} (${rec.multiplier > 1 ? `${rec.multiplier}x: ` : ''}${rec.totalPoints}đ - ${formatVietnameseDate(rec.date)})`
        );
      }
    }

    const netPeriodPoints = bonusPoints - penaltyPoints;
    const finalScore = (st.initialScore ?? 100) + netPeriodPoints;

    return {
      studentId: st.id,
      studentCode: st.studentCode,
      fullName: st.fullName,
      groupId: st.groupId,
      groupName: groupNameMap.get(st.groupId) || st.groupId,
      position: st.position,
      initialScore: st.initialScore ?? 100,
      bonusPoints,
      penaltyPoints,
      netPeriodPoints,
      finalScore,
      bonusCount,
      violationCount,
      violationSummary,
      rank: 0,
    };
  });

  items.sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    if (b.bonusPoints !== a.bonusPoints) return b.bonusPoints - a.bonusPoints;
    if (a.violationCount !== b.violationCount) return a.violationCount - b.violationCount;
    return a.fullName.localeCompare(b.fullName, 'vi');
  });

  return items.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
}

/**
 * Tính bảng xếp hạng 4 tổ theo khoảng thời gian
 * Hỗ trợ 2 chế độ: SUM (Tổng điểm các thành viên) và AVERAGE (Điểm bình quân theo số thành viên)
 */
export function calculateGroupRankings(
  groups: StudentGroup[],
  students: Student[],
  records: CompetitionRecord[],
  criteriaMap: Map<string, CompetitionCriterion>,
  scoringMode: 'SUM' | 'AVERAGE',
  options?: {
    startDate?: string;
    endDate?: string;
    criteriaId?: string;
  }
): GroupRankingItem[] {
  const studentRankings = calculateStudentRankings(students, groups, records, criteriaMap, {
    startDate: options?.startDate,
    endDate: options?.endDate,
    criteriaId: options?.criteriaId,
  });

  const studentById = new Map(students.map((s) => [s.id, s]));
  const groupById = new Map(groups.map((g) => [g.id, g]));

  const groupItems: GroupRankingItem[] = groups.map((grp) => {
    const members = studentRankings.filter((sr) => sr.groupId === grp.id);
    const memberCount = members.length;

    const totalInitialScore = members.reduce((acc, m) => acc + m.initialScore, 0);
    const totalBonusPoints = members.reduce((acc, m) => acc + m.bonusPoints, 0);
    const totalPenaltyPoints = members.reduce((acc, m) => acc + m.penaltyPoints, 0);
    const netPeriodPoints = totalBonusPoints - totalPenaltyPoints;
    const totalFinalScore = totalInitialScore + netPeriodPoints;

    const averagePeriodPoints =
      memberCount > 0 ? Number((netPeriodPoints / memberCount).toFixed(2)) : 0;
    const averageFinalScore =
      memberCount > 0 ? Number((totalFinalScore / memberCount).toFixed(2)) : 0;

    const leader = studentById.get(grp.leaderStudentId);
    const targetGroup = groupById.get(grp.dutyTargetGroupId);

    const displayScore =
      scoringMode === 'AVERAGE' ? averageFinalScore : totalFinalScore;

    return {
      groupId: grp.id,
      groupName: grp.name,
      leaderName: leader ? leader.fullName : 'Chưa phân công',
      dutyTargetGroupName: targetGroup ? targetGroup.name : 'Chưa phân công',
      memberCount,
      totalInitialScore,
      totalBonusPoints,
      totalPenaltyPoints,
      netPeriodPoints,
      totalFinalScore,
      averagePeriodPoints,
      averageFinalScore,
      displayScore,
      rank: 0,
    };
  });

  groupItems.sort((a, b) => {
    if (b.displayScore !== a.displayScore) return b.displayScore - a.displayScore;
    return b.netPeriodPoints - a.netPeriodPoints;
  });

  return groupItems.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
}

/**
 * Tính toán các chỉ số tài chính lớp
 * Công thức 8.1: Số dư cuối kỳ = Số dư đầu kỳ + Tổng thu - Tổng chi
 */
export function calculateFinanceMetrics(
  openingBalance: number,
  transactions: FinanceTransaction[],
  options?: {
    startDate?: string;
    endDate?: string;
    categoryId?: string;
  }
) {
  const validTransactions = transactions.filter((t) => {
    if (t.isCancelled) return false;
    if (!isDateInRange(t.date, options?.startDate, options?.endDate)) return false;
    if (
      options?.categoryId &&
      options.categoryId !== 'ALL' &&
      t.categoryId !== options.categoryId
    ) {
      return false;
    }
    return true;
  });

  let totalIncome = 0;
  let totalExpense = 0;
  let pendingReconcileCount = 0;
  let pendingReconcileAmount = 0;

  for (const tx of validTransactions) {
    if (tx.type === 'THU') {
      totalIncome += tx.amount;
    } else {
      totalExpense += tx.amount;
    }
    if (tx.reconcileStatus === 'Cần đối chiếu') {
      pendingReconcileCount += 1;
      pendingReconcileAmount += tx.amount;
    }
  }

  const currentBalance = openingBalance + totalIncome - totalExpense;

  return {
    openingBalance,
    totalIncome,
    totalExpense,
    currentBalance,
    transactionCount: validTransactions.length,
    pendingReconcileCount,
    pendingReconcileAmount,
  };
}

/**
 * Tổng hợp chuyên cần theo khoảng thời gian
 * Lưu ý mục 7: Phân biệt trạng thái chưa điểm danh với có mặt và vắng học.
 */
export function calculateAttendanceSummary(
  students: Student[],
  attendanceRecords: AttendanceRecord[],
  options?: {
    startDate?: string;
    endDate?: string;
    groupId?: string;
  }
) {
  const activeStudents = students.filter(
    (s) =>
      s.status === 'Đang học' &&
      (!options?.groupId || options.groupId === 'ALL' || s.groupId === options.groupId)
  );

  const filtered = attendanceRecords.filter((r) =>
    isDateInRange(r.date, options?.startDate, options?.endDate)
  );

  let onTimeCount = 0;
  let lateCount = 0;
  let excusedAbsentCount = 0;
  let unexcusedAbsentCount = 0;
  let unrecordedCount = 0;

  const byStudent = activeStudents.map((st) => {
    const stRecs = filtered.filter((r) => r.studentId === st.id);
    const onTime = stRecs.filter((r) => r.attendanceStatus === 'DUNG_GIO').length;
    const late = stRecs.filter((r) => r.attendanceStatus === 'DI_MUON').length;
    const excused = stRecs.filter((r) => r.attendanceStatus === 'NGHI_CO_PHEP').length;
    const unexcused = stRecs.filter((r) => r.attendanceStatus === 'NGHI_KHONG_PHEP').length;
    const unrecorded = stRecs.filter((r) => r.attendanceStatus === 'CHUA_DIEM_DANH').length;
    const disciplineIssues = stRecs.filter(
      (r) =>
        r.uniformStatus === 'Chưa đạt' ||
        r.hygieneStatus === 'Chưa đạt' ||
        r.orderStatus === 'Chưa đạt' ||
        r.homeworkStatus === 'Chưa đạt' ||
        r.attitudeStatus === 'Chưa đạt'
    ).length;

    onTimeCount += onTime;
    lateCount += late;
    excusedAbsentCount += excused;
    unexcusedAbsentCount += unexcused;
    unrecordedCount += unrecorded;

    return {
      studentId: st.id,
      studentCode: st.studentCode,
      fullName: st.fullName,
      groupId: st.groupId,
      onTime,
      late,
      excused,
      unexcused,
      unrecorded,
      disciplineIssues,
      totalRecordedDays: onTime + late + excused + unexcused,
    };
  });

  return {
    onTimeCount,
    lateCount,
    excusedAbsentCount,
    unexcusedAbsentCount,
    unrecordedCount,
    byStudent,
  };
}
