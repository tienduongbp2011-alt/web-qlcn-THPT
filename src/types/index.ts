export type ModuleKey =
  | 'dashboard'
  | 'students'
  | 'competition'
  | 'attendance'
  | 'finance'
  | 'reports'
  | 'planning'
  | 'settings';

export type UserRole = 'ADMIN' | 'GVCN' | 'GV_PHAN_CONG' | 'TO_TRUONG';

export interface ActiveSessionRole {
  role: UserRole;
  actorName: string;
  groupId?: string; // If role === 'TO_TRUONG', the group of the leader
}

export interface SchoolInfo {
  id: string;
  name: string;
  address: string;
  phone: string;
  principalName: string;
  motto: string;
  logoUrl?: string;
}

export interface SchoolYearInfo {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface SemesterInfo {
  id: string;
  schoolYearId: string;
  name: string;
  code: 'HK1' | 'HK2';
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface ClassInfo {
  id: string;
  schoolId: string;
  schoolYearId: string;
  name: string;
  grade: string;
  homeroomTeacher: string;
  roomNumber: string;
}

export interface StudentGroup {
  id: string;
  classId: string;
  name: string;
  leaderStudentId: string;
  dutyTargetGroupId: string; // Tổ được phân công chấm thi đua
  slogan: string;
}

export type StudentStatus = 'Đang học' | 'Chuyển lớp' | 'Bảo lưu' | 'Đã lưu trữ';

export interface Student {
  id: string;
  classId: string;
  studentCode: string;
  fullName: string;
  dob: string;
  gender: 'Nam' | 'Nữ';
  groupId: string;
  position: string;
  parentPhone: string;
  initialScore: number; // Mặc định 100
  status: StudentStatus;
  notes: string;
  isDemo?: boolean;
}

export interface StudentGuardian {
  id: string;
  studentId: string;
  fullName: string;
  relationship: string;
  phone: string;
  occupation: string;
  notes: string;
}

export interface CompetitionCriterion {
  id: string;
  code: string;
  name: string;
  category: 'Học tập' | 'Nề nếp' | 'Phong trào' | 'Vệ sinh & Hoạt động';
  type: 'CONG' | 'TRU';
  points: number; // Dương cho điểm cộng, âm cho điểm trừ
  description: string;
  isActive: boolean;
}

export interface RecordEditHistoryItem {
  editedAt: string;
  editedBy: string;
  reason: string;
  previousSummary: string;
}

export interface CompetitionRecord {
  id: string;
  classId: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  groupId: string;
  criteriaId: string;
  criteriaName: string;
  type: 'CONG' | 'TRU';
  basePoints: number; // Điểm gốc của tiêu chí (+2, -2, ...)
  multiplier: number; // 1, 2, 3... (1x, 2x, 3x...)
  totalPoints: number; // basePoints * multiplier
  subjectOrActivity: string;
  recordedBy: string;
  recordedByRole: UserRole;
  notes: string;
  evidence: string;
  isDeleted?: boolean;
  deletedReason?: string;
  editHistory: RecordEditHistoryItem[];
}

export type PeriodFilterType = 'DAY' | 'WEEK' | 'MONTH' | 'HK1' | 'HK2' | 'YEAR';

export interface CompetitionPeriodSnapshot {
  id: string;
  classId: string;
  name: string;
  periodType: PeriodFilterType;
  startDate: string;
  endDate: string;
  isLocked: boolean;
  lockedAt: string;
  lockedBy: string;
  scoringMode: 'SUM' | 'AVERAGE';
  groupRankings: GroupRankingItem[];
  studentRankings: StudentRankingItem[];
  unlockHistory: {
    unlockedAt: string;
    unlockedBy: string;
    reason: string;
  }[];
}

export interface StudentRankingItem {
  studentId: string;
  studentCode: string;
  fullName: string;
  groupId: string;
  groupName: string;
  position: string;
  initialScore: number;
  bonusPoints: number;
  penaltyPoints: number;
  netPeriodPoints: number; // Điểm thi đua cá nhân = Tổng điểm cộng hợp lệ - Tổng điểm trừ hợp lệ
  finalScore: number; // initialScore + netPeriodPoints
  bonusCount: number;
  violationCount: number;
  bonusSummary?: string[];
  violationSummary: string[];
  rank: number;
}

export interface GroupRankingItem {
  groupId: string;
  groupName: string;
  leaderName: string;
  dutyTargetGroupName: string;
  memberCount: number;
  totalInitialScore: number;
  totalBonusPoints: number;
  totalPenaltyPoints: number;
  netPeriodPoints: number;
  totalFinalScore: number;
  averagePeriodPoints: number;
  averageFinalScore: number;
  displayScore: number;
  rank: number;
}

export type AttendanceStatus =
  | 'CHUA_DIEM_DANH'
  | 'DUNG_GIO'
  | 'DI_MUON'
  | 'NGHI_CO_PHEP'
  | 'NGHI_KHONG_PHEP';

export type DisciplineLevel = 'Tốt' | 'Đạt' | 'Chưa đạt';

export interface AttendanceRecord {
  id: string;
  classId: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  groupId: string;
  attendanceStatus: AttendanceStatus;
  uniformStatus: DisciplineLevel;
  hygieneStatus: DisciplineLevel;
  orderStatus: DisciplineLevel;
  homeworkStatus: DisciplineLevel;
  attitudeStatus: DisciplineLevel;
  activityStatus: DisciplineLevel;
  reason: string;
  recordedBy: string;
}

export interface FinanceCategory {
  id: string;
  name: string;
  type: 'THU' | 'CHI';
  description: string;
  isActive: boolean;
}

export type ReconcileStatus = 'Đã đối chiếu' | 'Cần đối chiếu' | 'Đã điều chỉnh';

export interface FinanceTransaction {
  id: string;
  classId: string;
  transactionCode: string;
  date: string; // YYYY-MM-DD
  type: 'THU' | 'CHI';
  categoryId: string;
  categoryName: string;
  content: string;
  amount: number;
  payerOrReceiver: string;
  recordedBy: string;
  voucherRef: string;
  notes: string;
  reconcileStatus: ReconcileStatus;
  isLocked: boolean;
  isCancelled: boolean;
  cancelReason?: string;
  editHistory: RecordEditHistoryItem[];
}

export interface AwardTemplate {
  id: string;
  name: string;
  orientation: 'landscape' | 'portrait';
  schoolName: string;
  title: string;
  subtitle: string;
  signerTitle: string;
  signerName: string;
  borderStyle: 'classic' | 'modern';
}

export interface AwardRecord {
  id: string;
  classId: string;
  studentId: string;
  studentName: string;
  className: string;
  groupName: string;
  title: string;
  achievement: string;
  periodName: string;
  awardDate: string;
  location: string;
  signerName: string;
  status: 'Đề xuất' | 'Đã duyệt' | 'Đã in giấy khen';
  templateId: string;
}

export interface ClassPlan {
  id: string;
  classId: string;
  title: string;
  planType:
    | 'Kế hoạch tuần'
    | 'Kế hoạch tháng'
    | 'Kế hoạch học kỳ'
    | 'Lịch sinh hoạt lớp'
    | 'Lịch kiểm tra'
    | 'Hoạt động phong trào'
    | 'Nhật ký chủ nhiệm';
  startDate: string;
  endDate: string;
  objectives: string;
  activities: string;
  status: 'Chưa làm' | 'Đang làm' | 'Hoàn thành';
  notes: string;
}

export interface TaskItem {
  id: string;
  classId: string;
  planId?: string;
  title: string;
  assigneeName: string;
  assigneeRole: string;
  dueDate: string;
  priority: 'Cao' | 'Trung bình' | 'Thấp';
  status: 'Chưa làm' | 'Đang làm' | 'Hoàn thành';
  resultNotes: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  module: string;
  action: string;
  details: string;
}

export interface RoleAccountCredentials {
  gvcnUsername: string;
  gvcnPassword: string;
  groupLeaderAccounts: {
    groupId: string;
    username: string;
    password: string;
  }[];
}

export interface WorkspaceState {
  isDemoMode: boolean;
  authCredentials?: RoleAccountCredentials;
  school: SchoolInfo;
  schoolYears: SchoolYearInfo[];
  semesters: SemesterInfo[];
  classes: ClassInfo[];
  currentClassId: string;
  currentSchoolYearId: string;
  currentSemesterId: string;
  groupScoringMode: 'SUM' | 'AVERAGE';
  groups: StudentGroup[];
  students: Student[];
  guardians: StudentGuardian[];
  criteria: CompetitionCriterion[];
  competitionRecords: CompetitionRecord[];
  competitionSnapshots: CompetitionPeriodSnapshot[];
  attendanceRecords: AttendanceRecord[];
  financeOpeningBalance: number;
  financeCategories: FinanceCategory[];
  financeTransactions: FinanceTransaction[];
  awardTemplates: AwardTemplate[];
  awards: AwardRecord[];
  plans: ClassPlan[];
  tasks: TaskItem[];
  auditLogs: AuditLogEntry[];
}

