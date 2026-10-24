import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import {
  DEFAULT_WORKSPACE_ID,
  loadWorkspaceFromSupabase,
  saveWorkspaceToSupabase,
  supabase,
  SupabaseConnectionState,
} from '../lib/supabase.ts';
import {
  ActiveSessionRole,
  AttendanceRecord,
  AuditLogEntry,
  AwardRecord,
  AwardTemplate,
  ClassInfo,
  ClassPlan,
  CompetitionCriterion,
  CompetitionPeriodSnapshot,
  CompetitionRecord,
  FinanceCategory,
  FinanceTransaction,
  ModuleKey,
  RoleAccountCredentials,
  SchoolInfo,
  SchoolYearInfo,
  SemesterInfo,
  Student,
  StudentGroup,
  TaskItem,
  WorkspaceState,
} from '../types/index.ts';
import {
  createDemoWorkspaceState,
  createEmptyRealWorkspaceState,
  getDefaultAuthCredentials,
} from '../services/demoData.ts';
import { calculateNextMultiplier, toISODate } from '../utils/calculations.ts';

interface WorkspaceContextValue {
  state: WorkspaceState;
  isAuthenticated: boolean;
  loginWithCredentials: (
    mode: 'GVCN' | 'TO_TRUONG',
    username: string,
    password: string
  ) => { ok: boolean; error?: string };
  logoutSession: () => void;
  updateAuthCredentials: (creds: RoleAccountCredentials) => void;
  activeModule: ModuleKey;
  setActiveModule: (mod: ModuleKey) => void;
  sessionRole: ActiveSessionRole;
  setSessionRole: (role: ActiveSessionRole) => void;
  firebaseUser: User | null;
  authLoading: boolean;
  syncMessage: string | null;
  supabaseStatus: SupabaseConnectionState;
  supabaseStatusDetail: string;
  lastSupabaseSyncAt: string | null;
  syncNowWithSupabase: () => Promise<void>;
  pullFromSupabase: () => Promise<void>;
  toastMessage: { text: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  loginWithGoogle: () => Promise<void>;
  logoutUser: () => Promise<void>;
  // Audit helper
  addAuditLog: (moduleName: string, action: string, details: string) => void;
  // Demo / Reset / Backup
  clearDemoData: () => void;
  resetDemoData: () => void;
  importFullWorkspaceJson: (jsonState: WorkspaceState) => void;
  // Module 2: Students
  addStudent: (student: Omit<Student, 'id'>) => void;
  updateStudent: (student: Student) => void;
  deleteOrArchiveStudent: (studentId: string, mode: 'ARCHIVE' | 'DELETE') => void;
  importStudentsBatch: (students: Student[]) => void;
  autoAssignStudentsToGroups: () => void;
  // Module 3: Competition & 4 Groups
  updateGroup: (group: StudentGroup) => void;
  saveCriteriaList: (criteria: CompetitionCriterion[], replaceAll?: boolean) => void;
  toggleCriterionActive: (criterionId: string) => void;
  deleteCriterion: (criterionId: string) => void;
  addCompetitionRecordsBatch: (params: {
    date: string;
    studentIds: string[];
    criteriaId: string;
    subjectOrActivity: string;
    notes: string;
    evidence: string;
  }) => CompetitionRecord[];
  updateCompetitionRecord: (
    recordId: string,
    updates: {
      criteriaId: string;
      date: string;
      subjectOrActivity: string;
      notes: string;
      evidence: string;
      reason: string;
    }
  ) => void;
  deleteOrUndoCompetitionRecord: (recordId: string, reason: string) => void;
  setGroupScoringMode: (mode: 'SUM' | 'AVERAGE') => void;
  lockCompetitionPeriod: (snapshot: Omit<CompetitionPeriodSnapshot, 'id'>) => void;
  unlockCompetitionPeriod: (snapshotId: string, reason: string) => void;
  // Module 4: Attendance
  upsertAttendanceRecordsForDate: (date: string, records: AttendanceRecord[]) => void;
  // Module 5: Finance
  setFinanceOpeningBalance: (amount: number) => void;
  addFinanceTransaction: (
    tx: Omit<FinanceTransaction, 'id' | 'editHistory' | 'isCancelled' | 'isLocked'>
  ) => void;
  updateFinanceTransaction: (
    txId: string,
    updates: Partial<FinanceTransaction>,
    reason: string
  ) => void;
  cancelFinanceTransaction: (txId: string, reason: string) => void;
  addFinanceCategory: (cat: Omit<FinanceCategory, 'id'>) => void;
  // Module 6: Awards & Templates
  addAwardRecord: (award: Omit<AwardRecord, 'id'>) => void;
  updateAwardRecord: (award: AwardRecord) => void;
  deleteAwardRecord: (awardId: string) => void;
  updateAwardTemplate: (tpl: AwardTemplate) => void;
  // Module 7: Planning & Tasks
  addClassPlan: (plan: Omit<ClassPlan, 'id'>) => void;
  updateClassPlan: (plan: ClassPlan) => void;
  deleteClassPlan: (planId: string) => void;
  addTaskItem: (task: Omit<TaskItem, 'id'>) => void;
  updateTaskItem: (task: TaskItem) => void;
  deleteTaskItem: (taskId: string) => void;
  // Module 8: Settings
  updateSchoolInfo: (school: SchoolInfo) => void;
  addOrUpdateClass: (cls: ClassInfo) => void;
  setCurrentClassId: (classId: string) => void;
  addOrUpdateSchoolYear: (sy: SchoolYearInfo) => void;
  addOrUpdateSemester: (sem: SemesterInfo) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'thanh_hoa_class_manager_v1';
const SESSION_AUTH_KEY = 'thanh_hoa_auth_session_v1';

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<WorkspaceState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.school && Array.isArray(parsed.students)) {
          return {
            ...parsed,
            authCredentials:
              parsed.authCredentials || getDefaultAuthCredentials(),
          };
        }
      }
    } catch (e) {
      console.warn('Could not load saved local state:', e);
    }
    return createDemoWorkspaceState();
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_AUTH_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Boolean(parsed?.isAuthenticated);
      }
    } catch {
      // ignore
    }
    return false;
  });

  const [activeModule, setActiveModuleState] = useState<ModuleKey>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_AUTH_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.sessionRole?.role === 'TO_TRUONG') {
          return 'competition';
        }
      }
    } catch {
      // ignore
    }
    return 'dashboard';
  });

  const [sessionRole, setSessionRoleState] = useState<ActiveSessionRole>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_AUTH_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.sessionRole) {
          return parsed.sessionRole;
        }
      }
    } catch {
      // ignore
    }
    return {
      role: 'GVCN',
      actorName: 'Nguyễn Tiến Dương',
    };
  });

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [supabaseStatus, setSupabaseStatus] =
    useState<SupabaseConnectionState>('CONNECTING');
  const [supabaseStatusDetail, setSupabaseStatusDetail] = useState<string>(
    'Đang kết nối tới cơ sở dữ liệu Supabase...'
  );
  const [lastSupabaseSyncAt, setLastSupabaseSyncAt] = useState<string | null>(
    null
  );
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const isInitialCloudLoadDone = useRef(false);
  const isApplyingRemoteUpdate = useRef(false);

  const showToast = (
    text: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 3800);
  };

  // Kiểm soát phân quyền khi đổi vai trò sang Tổ trưởng:
  // Yêu cầu 6.1: "Chỉ hiển thị danh sách tổ được chấm thi đua ở tài khoản của tổ trưởng được phân trực, các chức năng phân hệ khác tổ trưởng không được quyền xem"
  const setSessionRole = (newRole: ActiveSessionRole) => {
    setSessionRoleState(newRole);
    try {
      sessionStorage.setItem(
        SESSION_AUTH_KEY,
        JSON.stringify({ isAuthenticated: true, sessionRole: newRole })
      );
    } catch {
      // ignore
    }
    if (newRole.role === 'TO_TRUONG') {
      setActiveModuleState('competition');
      showToast(
        `Đã chuyển sang giao diện Tổ trưởng (${newRole.actorName}) – Chỉ mở phân hệ Chấm trực thi đua.`,
        'info'
      );
    } else {
      showToast(`Đã chuyển vai trò làm việc: ${newRole.actorName} (${newRole.role})`, 'info');
    }
  };

  const loginWithCredentials = (
    mode: 'GVCN' | 'TO_TRUONG',
    username: string,
    password: string
  ): { ok: boolean; error?: string } => {
    const creds = state.authCredentials || getDefaultAuthCredentials();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (mode === 'GVCN') {
      if (
        cleanUser === creds.gvcnUsername.trim().toLowerCase() &&
        cleanPass === creds.gvcnPassword
      ) {
        const currentClass =
          state.classes.find((c) => c.id === state.currentClassId) ||
          state.classes[0];
        const roleObj: ActiveSessionRole = {
          role: 'GVCN',
          actorName: currentClass?.homeroomTeacher || 'Nguyễn Tiến Dương',
        };
        setSessionRoleState(roleObj);
        setActiveModuleState('dashboard');
        setIsAuthenticated(true);
        try {
          sessionStorage.setItem(
            SESSION_AUTH_KEY,
            JSON.stringify({ isAuthenticated: true, sessionRole: roleObj })
          );
        } catch {
          // ignore
        }
        showToast(
          `Xin chào GVCN ${roleObj.actorName}! Đã đăng nhập vào hệ thống quản lý lớp học.`,
          'success'
        );
        return { ok: true };
      }
      return {
        ok: false,
        error: 'Tài khoản hoặc mật khẩu Giáo viên chủ nhiệm không chính xác.',
      };
    } else {
      const matched = creds.groupLeaderAccounts.find(
        (acc) =>
          acc.username.trim().toLowerCase() === cleanUser &&
          acc.password === cleanPass
      );
      if (matched) {
        const grp = state.groups.find((g) => g.id === matched.groupId);
        const targetGrp = state.groups.find(
          (g) => g.id === grp?.dutyTargetGroupId
        );
        const leader = state.students.find(
          (s) => s.id === grp?.leaderStudentId
        );
        const actorLabel = leader
          ? `${leader.fullName.replace(' (Demo)', '')} (Tổ trưởng ${grp?.name || ''})`
          : `Tổ trưởng ${grp?.name || ''}`;
        const roleObj: ActiveSessionRole = {
          role: 'TO_TRUONG',
          actorName: actorLabel,
          groupId: matched.groupId,
        };
        setSessionRoleState(roleObj);
        setActiveModuleState('competition');
        setIsAuthenticated(true);
        try {
          sessionStorage.setItem(
            SESSION_AUTH_KEY,
            JSON.stringify({ isAuthenticated: true, sessionRole: roleObj })
          );
        } catch {
          // ignore
        }
        showToast(
          `Đăng nhập thành công: ${actorLabel} — Chấm trực thi đua ${
            targetGrp?.name || 'Tổ được phân công'
          }!`,
          'success'
        );
        return { ok: true };
      }
      return {
        ok: false,
        error: 'Tài khoản hoặc mật khẩu Tổ trưởng trực thi đua không chính xác.',
      };
    }
  };

  const logoutSession = () => {
    setIsAuthenticated(false);
    try {
      sessionStorage.removeItem(SESSION_AUTH_KEY);
    } catch {
      // ignore
    }
    showToast('Đã đăng xuất khỏi phiên làm việc.', 'info');
  };

  const updateAuthCredentials = (newCreds: RoleAccountCredentials) => {
    const log = createLogItem(
      'Cài đặt & Quản trị',
      'Cập nhật tài khoản & mật khẩu đăng nhập',
      'GVCN cập nhật thông tin tài khoản đăng nhập của GVCN và 4 Tổ trưởng trực thi đua'
    );
    setState((prev) => ({
      ...prev,
      authCredentials: newCreds,
      auditLogs: [log, ...prev.auditLogs],
    }));
    showToast(
      'Đã lưu cấu hình tài khoản & mật khẩu đăng nhập và đồng bộ lên Supabase!',
      'success'
    );
  };

  const setActiveModule = (mod: ModuleKey) => {
    if (sessionRole.role === 'TO_TRUONG' && mod !== 'competition') {
      showToast(
        'Tài khoản Tổ trưởng trực thi đua chỉ được phép truy cập phân hệ Chấm thi đua tổ được phân công.',
        'error'
      );
      setActiveModuleState('competition');
      return;
    }
    setActiveModuleState(mod);
  };

  // 1. Kết nối và tải dữ liệu từ Supabase ngay khi mở ứng dụng
  useEffect(() => {
    let isMounted = true;

    async function initSupabaseSync() {
      setSupabaseStatus('CONNECTING');
      setSupabaseStatusDetail('Đang kiểm tra kết nối Supabase...');

      const loaded = await loadWorkspaceFromSupabase(DEFAULT_WORKSPACE_ID);
      if (!isMounted) return;

      setSupabaseStatus(loaded.status);
      setSupabaseStatusDetail(loaded.message);

      if (loaded.status === 'CONNECTED') {
        if (loaded.state && loaded.state.school && Array.isArray(loaded.state.students)) {
          isApplyingRemoteUpdate.current = true;
          setState(loaded.state);
          if (loaded.updatedAt) {
            setLastSupabaseSyncAt(loaded.updatedAt);
          }
          showToast('Đã đồng bộ dữ liệu lớp học từ Supabase!', 'info');
        } else {
          // Chưa có dữ liệu trên bảng Supabase -> Đẩy dữ liệu hiện tại lên lần đầu
          const pushed = await saveWorkspaceToSupabase(
            state,
            DEFAULT_WORKSPACE_ID,
            firebaseUser?.email || 'tienduongbp2011@gmail.com'
          );
          if (isMounted) {
            setSupabaseStatus(pushed.status);
            setSupabaseStatusDetail(pushed.message);
            if (pushed.updatedAt) {
              setLastSupabaseSyncAt(pushed.updatedAt);
            }
          }
        }
      }

      isInitialCloudLoadDone.current = true;
    }

    initSupabaseSync();

    // Lắng nghe thay đổi Realtime từ Supabase (khi Tổ trưởng hoặc máy khác cập nhật)
    const channel = supabase
      .channel('supabase_workspace_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_snapshots',
          filter: `uid=eq.${DEFAULT_WORKSPACE_ID}`,
        },
        (payload: any) => {
          const newRecord = payload?.new;
          if (
            newRecord &&
            newRecord.state_json &&
            newRecord.state_json.school
          ) {
            isApplyingRemoteUpdate.current = true;
            setState(newRecord.state_json as WorkspaceState);
            setLastSupabaseSyncAt(newRecord.updated_at || new Date().toISOString());
            setSupabaseStatus('CONNECTED');
            setSupabaseStatusDetail('Đã cập nhật dữ liệu thời gian thực từ Supabase');
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Listen to Firebase Auth state (tùy chọn bổ sung)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const token = await user.getIdToken();
          setAuthToken(token);
        } catch (err) {
          console.error('Failed to get token:', err);
        }
      } else {
        setAuthToken(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Tự động lưu vào localStorage và đồng bộ lên Supabase mỗi khi dữ liệu thay đổi
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save state to localStorage:', e);
    }

    if (!isInitialCloudLoadDone.current) return;

    if (isApplyingRemoteUpdate.current) {
      isApplyingRemoteUpdate.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      setSyncMessage('Đang đồng bộ lên Supabase...');
      const res = await saveWorkspaceToSupabase(
        state,
        DEFAULT_WORKSPACE_ID,
        firebaseUser?.email || 'tienduongbp2011@gmail.com'
      );
      setSupabaseStatus(res.status);
      setSupabaseStatusDetail(res.message);

      if (res.status === 'CONNECTED') {
        if (res.updatedAt) setLastSupabaseSyncAt(res.updatedAt);
        setSyncMessage('Đã lưu trên Supabase');
        setTimeout(() => setSyncMessage(null), 2200);
      } else {
        setSyncMessage(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [state, firebaseUser]);

  const syncNowWithSupabase = async () => {
    setSyncMessage('Đang đẩy dữ liệu lên Supabase...');
    const res = await saveWorkspaceToSupabase(
      state,
      DEFAULT_WORKSPACE_ID,
      firebaseUser?.email || 'tienduongbp2011@gmail.com'
    );
    setSupabaseStatus(res.status);
    setSupabaseStatusDetail(res.message);
    if (res.status === 'CONNECTED') {
      if (res.updatedAt) setLastSupabaseSyncAt(res.updatedAt);
      setSyncMessage('Đã lưu trên Supabase');
      showToast('Đã đồng bộ toàn bộ dữ liệu lớp học lên Supabase thành công!', 'success');
      setTimeout(() => setSyncMessage(null), 2500);
    } else if (res.status === 'NEEDS_TABLE_SETUP') {
      setSyncMessage(null);
      showToast(
        'Kết nối Supabase thành công! Hãy chạy lệnh SQL khởi tạo bảng lần đầu trong mục Cài đặt.',
        'info'
      );
    } else {
      setSyncMessage(null);
      showToast(res.message, 'error');
    }
  };

  const pullFromSupabase = async () => {
    setSyncMessage('Đang tải dữ liệu từ Supabase...');
    const loaded = await loadWorkspaceFromSupabase(DEFAULT_WORKSPACE_ID);
    setSupabaseStatus(loaded.status);
    setSupabaseStatusDetail(loaded.message);
    setSyncMessage(null);

    if (loaded.status === 'CONNECTED') {
      if (loaded.state && loaded.state.school) {
        isApplyingRemoteUpdate.current = true;
        setState(loaded.state);
        if (loaded.updatedAt) setLastSupabaseSyncAt(loaded.updatedAt);
        showToast('Đã tải dữ liệu mới nhất từ Supabase về máy!', 'success');
      } else {
        showToast('Kết nối Supabase thành công nhưng chưa có bản lưu nào trên đám mây.', 'info');
      }
    } else {
      showToast(loaded.message, loaded.status === 'NEEDS_TABLE_SETUP' ? 'info' : 'error');
    }
  };

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
      showToast('Đăng nhập tài khoản Giáo viên thành công!', 'success');
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      showToast(
        'Đăng nhập chưa hoàn tất hoặc cửa sổ xác thực đã đóng.',
        'error'
      );
    }
  };

  const logoutUser = async () => {
    try {
      await signOut(auth);
      showToast('Đã đăng xuất tài khoản.', 'info');
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };

  const createLogItem = (
    moduleName: string,
    action: string,
    details: string
  ): AuditLogEntry => {
    const now = new Date();
    const formatted = `${toISODate(now)} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    return {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: formatted,
      actorName: sessionRole.actorName,
      actorRole: sessionRole.role,
      module: moduleName,
      action,
      details,
    };
  };

  const addAuditLog = (moduleName: string, action: string, details: string) => {
    const entry = createLogItem(moduleName, action, details);
    setState((prev) => ({
      ...prev,
      auditLogs: [entry, ...prev.auditLogs.slice(0, 199)],
    }));
  };

  const clearDemoData = () => {
    setState((prev) => createEmptyRealWorkspaceState(prev));
    showToast('Đã xóa sạch dữ liệu DEMO. Hệ thống sẵn sàng nhập dữ liệu thật!', 'success');
  };

  const resetDemoData = () => {
    const demo = createDemoWorkspaceState();
    setState(demo);
    showToast('Đã khôi phục bộ dữ liệu mẫu DEMO của lớp 10A3.', 'info');
  };

  const importFullWorkspaceJson = (jsonState: WorkspaceState) => {
    if (!jsonState || !jsonState.school || !Array.isArray(jsonState.students)) {
      showToast('File sao lưu không hợp lệ.', 'error');
      return;
    }
    setState(jsonState);
    showToast('Đã phục hồi toàn bộ dữ liệu lớp học từ bản sao lưu!', 'success');
  };

  // --- MODULE 2: STUDENTS ---
  const addStudent = (studentData: Omit<Student, 'id'>) => {
    const newStudent: Student = {
      ...studentData,
      id: `st-${Date.now()}`,
      initialScore: studentData.initialScore ?? 100,
    };
    const log = createLogItem(
      'Quản lý học sinh',
      'Thêm học sinh',
      `Thêm học sinh ${newStudent.fullName} (${newStudent.studentCode}) vào ${
        state.groups.find((g) => g.id === newStudent.groupId)?.name || 'Tổ'
      }`
    );
    setState((prev) => ({
      ...prev,
      isDemoMode: false,
      students: [...prev.students, newStudent],
      auditLogs: [log, ...prev.auditLogs],
    }));
    showToast(`Đã thêm học sinh ${newStudent.fullName} (Điểm ban đầu: 100).`, 'success');
  };

  const updateStudent = (updated: Student) => {
    const log = createLogItem(
      'Quản lý học sinh',
      'Cập nhật hồ sơ học sinh',
      `Chỉnh sửa thông tin học sinh ${updated.fullName} (${updated.studentCode})`
    );
    setState((prev) => ({
      ...prev,
      students: prev.students.map((s) => (s.id === updated.id ? updated : s)),
      auditLogs: [log, ...prev.auditLogs],
    }));
    showToast(`Đã cập nhật thông tin học sinh ${updated.fullName}.`, 'success');
  };

  const deleteOrArchiveStudent = (
    studentId: string,
    mode: 'ARCHIVE' | 'DELETE'
  ) => {
    const target = state.students.find((s) => s.id === studentId);
    if (!target) return;

    const log = createLogItem(
      'Quản lý học sinh',
      mode === 'ARCHIVE' ? 'Lưu trữ hồ sơ học sinh' : 'Xóa học sinh',
      `${mode === 'ARCHIVE' ? 'Lưu trữ' : 'Xóa'} học sinh ${target.fullName} (${
        target.studentCode
      })`
    );

    setState((prev) => ({
      ...prev,
      students:
        mode === 'ARCHIVE'
          ? prev.students.map((s) =>
              s.id === studentId ? { ...s, status: 'Đã lưu trữ' } : s
            )
          : prev.students.filter((s) => s.id !== studentId),
      auditLogs: [log, ...prev.auditLogs],
    }));

    showToast(
      mode === 'ARCHIVE'
        ? `Đã chuyển hồ sơ học sinh ${target.fullName} vào kho lưu trữ.`
        : `Đã xóa học sinh ${target.fullName} khỏi danh sách.`,
      'info'
    );
  };

  const importStudentsBatch = (imported: Student[]) => {
    if (!imported.length) {
      showToast('Không tìm thấy dữ liệu học sinh hợp lệ trong file Excel.', 'error');
      return;
    }
    const log = createLogItem(
      'Quản lý học sinh',
      'Nhập danh sách từ Excel',
      `Nhập thành công ${imported.length} học sinh từ file Excel vào lớp`
    );
    setState((prev) => ({
      ...prev,
      isDemoMode: false,
      students: [...prev.students, ...imported],
      auditLogs: [log, ...prev.auditLogs],
    }));
    showToast(`Đã nhập thành công ${imported.length} học sinh từ file Excel!`, 'success');
  };

  // Yêu cầu 6.1: "Tự động đưa học sinh vào tổ dựa vào danh sách học sinh ở mục quản lý học sinh"
  const autoAssignStudentsToGroups = () => {
    setState((prev) => {
      const activeGroups = prev.groups;
      if (!activeGroups.length) return prev;
      const sortedStudents = [...prev.students].sort((a, b) =>
        a.fullName.localeCompare(b.fullName, 'vi')
      );
      const reassigned = sortedStudents.map((st, idx) => ({
        ...st,
        groupId: activeGroups[idx % activeGroups.length].id,
      }));
      const log = createLogItem(
        'Quản lý 4 tổ',
        'Tự động phân bổ học sinh vào 4 tổ',
        `Đã tự động chia đều ${reassigned.length} học sinh vào 4 tổ thi đua`
      );
      return {
        ...prev,
        students: reassigned,
        auditLogs: [log, ...prev.auditLogs],
      };
    });
    showToast('Đã tự động phân bổ đều danh sách học sinh vào 4 tổ!', 'success');
  };

  // --- MODULE 3: COMPETITION & 4 GROUPS ---
  const updateGroup = (updatedGroup: StudentGroup) => {
    const log = createLogItem(
      'Thi đua 4 tổ',
      'Cập nhật cấu hình tổ & phân công trực',
      `Cập nhật ${updatedGroup.name}: Tổ trưởng ID=${updatedGroup.leaderStudentId}, Trực chấm ID=${updatedGroup.dutyTargetGroupId}`
    );
    setState((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => (g.id === updatedGroup.id ? updatedGroup : g)),
      auditLogs: [log, ...prev.auditLogs],
    }));
    showToast(`Đã lưu cấu hình ${updatedGroup.name}.`, 'success');
  };

  // Yêu cầu 6.2: "Thêm tiêu chí từ file excel và xoá hết dữ liệu cũ khi import tiêu chí mới"
  const saveCriteriaList = (
    newCriteria: CompetitionCriterion[],
    replaceAll = false
  ) => {
    const log = createLogItem(
      'Thi đua 4 tổ',
      replaceAll ? 'Import tiêu chí mới & Xóa dữ liệu cũ' : 'Cập nhật bộ tiêu chí',
      replaceAll
        ? `Import ${newCriteria.length} tiêu chí thi đua từ Excel và làm mới dữ liệu chấm cũ`
        : `Cập nhật danh sách tiêu chí thi đua (${newCriteria.length} tiêu chí)`
    );
    setState((prev) => ({
      ...prev,
      criteria: newCriteria,
      competitionRecords: replaceAll ? [] : prev.competitionRecords,
      auditLogs: [log, ...prev.auditLogs],
    }));
    showToast(
      replaceAll
        ? `Đã nhập ${newCriteria.length} tiêu chí mới từ Excel và xóa dữ liệu chấm cũ!`
        : 'Đã cập nhật bộ tiêu chí thi đua.',
      'success'
    );
  };

  const toggleCriterionActive = (criterionId: string) => {
    setState((prev) => ({
      ...prev,
      criteria: prev.criteria.map((c) =>
        c.id === criterionId ? { ...c, isActive: !c.isActive } : c
      ),
    }));
    showToast('Đã cập nhật trạng thái áp dụng của tiêu chí.', 'info');
  };

  const deleteCriterion = (criterionId: string) => {
    setState((prev) => ({
      ...prev,
      criteria: prev.criteria.filter((c) => c.id !== criterionId),
    }));
    showToast('Đã xóa tiêu chí thi đua.', 'info');
  };

  // Yêu cầu 6.3: Ghi nhận thi đua (có thể nhập nhiều học sinh 1 lần, tự động tăng hệ số 1x, 2x, 3x... khi lặp lại tiêu chí)
  const addCompetitionRecordsBatch = (params: {
    date: string;
    studentIds: string[];
    criteriaId: string;
    subjectOrActivity: string;
    notes: string;
    evidence: string;
  }): CompetitionRecord[] => {
    const crit = state.criteria.find((c) => c.id === params.criteriaId);
    if (!crit || !params.studentIds.length) return [];

    const createdRecords: CompetitionRecord[] = [];

    setState((prev) => {
      const runningRecords = [...prev.competitionRecords];

      params.studentIds.forEach((stId, index) => {
        const st = prev.students.find((s) => s.id === stId);
        if (!st) return;

        const multiplier = calculateNextMultiplier(
          runningRecords,
          st.id,
          crit.id
        );
        const basePoints = crit.points;
        const totalPoints = basePoints * multiplier;

        const newRec: CompetitionRecord = {
          id: `rec-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 5)}`,
          classId: prev.currentClassId,
          date: params.date,
          studentId: st.id,
          groupId: st.groupId,
          criteriaId: crit.id,
          criteriaName: crit.name,
          type: crit.type,
          basePoints,
          multiplier,
          totalPoints,
          subjectOrActivity: params.subjectOrActivity || 'Hoạt động trên lớp',
          recordedBy: `${sessionRole.actorName} (${
            sessionRole.role === 'TO_TRUONG' ? 'Tổ trưởng trực' : 'GVCN'
          })`,
          recordedByRole: sessionRole.role,
          notes:
            params.notes ||
            (multiplier > 1
              ? `Lặp lại lần ${multiplier} (Hệ số ${multiplier}x)`
              : ''),
          evidence: params.evidence || '',
          isDeleted: false,
          editHistory: [],
        };

        runningRecords.unshift(newRec);
        createdRecords.push(newRec);
      });

      const log = createLogItem(
        'Thi đua 4 tổ',
        'Ghi nhận điểm thi đua',
        `Chấm tiêu chí "${crit.name}" cho ${createdRecords.length} học sinh (${createdRecords
          .map((r) => `${r.multiplier}x=${r.totalPoints > 0 ? '+' : ''}${r.totalPoints}đ`)
          .join(', ')})`
      );

      return {
        ...prev,
        competitionRecords: runningRecords,
        auditLogs: [log, ...prev.auditLogs],
      };
    });

    const hasMultiplier = createdRecords.some((r) => r.multiplier > 1);
    showToast(
      hasMultiplier
        ? `Đã chấm điểm cho ${createdRecords.length} học sinh (Áp dụng hệ số lặp lại ${createdRecords
            .map((r) => `${r.multiplier}x`)
            .join(', ')})!`
        : `Đã ghi nhận điểm thi đua cho ${createdRecords.length} học sinh!`,
      'success'
    );

    return createdRecords;
  };

  const updateCompetitionRecord = (
    recordId: string,
    updates: {
      criteriaId: string;
      date: string;
      subjectOrActivity: string;
      notes: string;
      evidence: string;
      reason: string;
    }
  ) => {
    const crit = state.criteria.find((c) => c.id === updates.criteriaId);
    if (!crit) return;

    setState((prev) => {
      const updatedList = prev.competitionRecords.map((rec) => {
        if (rec.id !== recordId) return rec;
        const nowStr = new Date().toLocaleString('vi-VN');
        const historyEntry = {
          editedAt: nowStr,
          editedBy: `${sessionRole.actorName} (${sessionRole.role})`,
          reason: updates.reason || 'Điều chỉnh thông tin chấm điểm',
          previousSummary: `${rec.criteriaName} (${rec.multiplier}x = ${rec.totalPoints}đ) ngày ${rec.date}`,
        };
        const newTotal = crit.points * rec.multiplier;
        return {
          ...rec,
          date: updates.date,
          criteriaId: crit.id,
          criteriaName: crit.name,
          type: crit.type,
          basePoints: crit.points,
          totalPoints: newTotal,
          subjectOrActivity: updates.subjectOrActivity,
          notes: updates.notes,
          evidence: updates.evidence,
          editHistory: [historyEntry, ...(rec.editHistory || [])],
        };
      });

      const log = createLogItem(
        'Thi đua 4 tổ',
        'Chỉnh sửa bản ghi thi đua',
        `Sửa bản ghi ${recordId}. Lý do: ${updates.reason}`
      );

      return {
        ...prev,
        competitionRecords: updatedList,
        auditLogs: [log, ...prev.auditLogs],
      };
    });

    showToast('Đã cập nhật bản ghi thi đua và lưu lịch sử thay đổi.', 'success');
  };

  // Yêu cầu: "nhật ký các lượt chấm thi đua gần đây nếu hoàn tác thì không ghi vào nhật ký, chỉ có sửa mới ghi vào nhật ký"
  const deleteOrUndoCompetitionRecord = (recordId: string, _reason: string) => {
    setState((prev) => {
      const target = prev.competitionRecords.find((r) => r.id === recordId);
      if (!target) return prev;

      // Xóa hẳn lượt chấm nhầm khỏi danh sách nhật ký chấm thi đua
      const remaining = prev.competitionRecords.filter((r) => r.id !== recordId);

      // Cập nhật lại hệ số (1x, 2x, 3x...) theo thứ tự cho các lượt chấm còn lại của cùng học sinh & cùng tiêu chí
      const matchingChronological = remaining
        .filter(
          (r) =>
            !r.isDeleted &&
            !/^rec-\d+$/.test(r.id) &&
            r.studentId === target.studentId &&
            r.criteriaId === target.criteriaId
        )
        .slice()
        .reverse();

      const multMap = new Map<string, number>();
      matchingChronological.forEach((r, idx) => {
        multMap.set(r.id, idx + 1);
      });

      const recalculated = remaining.map((r) => {
        const newMult = multMap.get(r.id);
        if (!newMult || newMult === r.multiplier) return r;
        return {
          ...r,
          multiplier: newMult,
          totalPoints: r.basePoints * newMult,
        };
      });

      return {
        ...prev,
        competitionRecords: recalculated,
      };
    });
    showToast('Đã hoàn tác lượt chấm và cập nhật lại điểm số.', 'info');
  };

  const setGroupScoringMode = (mode: 'SUM' | 'AVERAGE') => {
    setState((prev) => ({
      ...prev,
      groupScoringMode: mode,
    }));
    showToast(
      mode === 'AVERAGE'
        ? 'Đã chuyển sang chế độ tính Điểm bình quân theo sĩ số tổ.'
        : 'Đã chuyển sang chế độ tính Tổng điểm các thành viên trong tổ.',
      'info'
    );
  };

  const lockCompetitionPeriod = (
    snapshotData: Omit<CompetitionPeriodSnapshot, 'id'>
  ) => {
    const newSnapshot: CompetitionPeriodSnapshot = {
      ...snapshotData,
      id: `snap-${Date.now()}`,
    };
    const log = createLogItem(
      'Thi đua 4 tổ',
      'Chốt kỳ thi đua',
      `Đã chốt kết quả kỳ thi đua: ${newSnapshot.name} (${newSnapshot.startDate} đến ${newSnapshot.endDate})`
    );
    setState((prev) => ({
      ...prev,
      competitionSnapshots: [newSnapshot, ...prev.competitionSnapshots],
      auditLogs: [log, ...prev.auditLogs],
    }));
    showToast(`Đã chốt kỳ thi đua "${newSnapshot.name}" và lưu trữ lịch sử!`, 'success');
  };

  const unlockCompetitionPeriod = (snapshotId: string, reason: string) => {
    if (sessionRole.role !== 'GVCN' && sessionRole.role !== 'ADMIN') {
      showToast('Chỉ Giáo viên chủ nhiệm hoặc Quản trị viên mới có quyền mở khóa kỳ đã chốt.', 'error');
      return;
    }
    const log = createLogItem(
      'Thi đua 4 tổ',
      'Mở khóa điều chỉnh kỳ thi đua đã chốt',
      `Mở khóa kỳ thi đua ID=${snapshotId}. Lý do: ${reason}`
    );
    setState((prev) => ({
      ...prev,
      competitionSnapshots: prev.competitionSnapshots.map((s) =>
        s.id === snapshotId
          ? {
              ...s,
              isLocked: false,
              unlockHistory: [
                {
                  unlockedAt: new Date().toLocaleString('vi-VN'),
                  unlockedBy: sessionRole.actorName,
                  reason,
                },
                ...(s.unlockHistory || []),
              ],
            }
          : s
      ),
      auditLogs: [log, ...prev.auditLogs],
    }));
    showToast('Đã mở khóa kỳ thi đua và ghi nhận nhật ký kiểm toán.', 'info');
  };

  // --- MODULE 4: ATTENDANCE ---
  const upsertAttendanceRecordsForDate = (
    date: string,
    recordsForDate: AttendanceRecord[]
  ) => {
    const log = createLogItem(
      'Chuyên cần & Nề nếp',
      'Lưu bảng điểm danh & nề nếp',
      `Cập nhật điểm danh và nề nếp ngày ${date} cho ${recordsForDate.length} học sinh`
    );
    setState((prev) => {
      const others = prev.attendanceRecords.filter((r) => r.date !== date);
      return {
        ...prev,
        attendanceRecords: [...others, ...recordsForDate],
        auditLogs: [log, ...prev.auditLogs],
      };
    });
    showToast(`Đã lưu dữ liệu chuyên cần và nề nếp ngày ${date}!`, 'success');
  };

  // --- MODULE 5: FINANCE ---
  const setFinanceOpeningBalance = (amount: number) => {
    const log = createLogItem(
      'Tài chính lớp',
      'Cập nhật số dư đầu kỳ',
      `Điều chỉnh số dư đầu kỳ quỹ lớp thành ${amount.toLocaleString('vi-VN')} ₫`
    );
    setState((prev) => ({
      ...prev,
      financeOpeningBalance: amount,
      auditLogs: [log, ...prev.auditLogs],
    }));
    showToast('Đã cập nhật số dư đầu kỳ quỹ lớp.', 'success');
  };

  const addFinanceTransaction = (
    txData: Omit<
      FinanceTransaction,
      'id' | 'editHistory' | 'isCancelled' | 'isLocked'
    >
  ) => {
    const newTx: FinanceTransaction = {
      ...txData,
      id: `tx-${Date.now()}`,
      isLocked: false,
      isCancelled: false,
      editHistory: [],
    };
    const log = createLogItem(
      'Tài chính lớp',
      `Thêm phiếu ${newTx.type === 'THU' ? 'thu' : 'chi'}`,
      `Mã GD ${newTx.transactionCode}: ${newTx.content} (${newTx.amount.toLocaleString(
        'vi-VN'
      )} ₫)`
    );
    setState((prev) => ({
      ...prev,
      financeTransactions: [newTx, ...prev.financeTransactions],
      auditLogs: [log, ...prev.auditLogs],
    }));
    showToast(`Đã ghi nhận giao dịch ${newTx.transactionCode} vào sổ quỹ lớp.`, 'success');
  };

  const updateFinanceTransaction = (
    txId: string,
    updates: Partial<FinanceTransaction>,
    reason: string
  ) => {
    setState((prev) => {
      const updated = prev.financeTransactions.map((tx) => {
        if (tx.id !== txId) return tx;
        return {
          ...tx,
          ...updates,
          reconcileStatus:
            updates.reconcileStatus || ('Đã điều chỉnh' as const),
          editHistory: [
            {
              editedAt: new Date().toLocaleString('vi-VN'),
              editedBy: sessionRole.actorName,
              reason,
              previousSummary: `${tx.type} ${tx.amount.toLocaleString('vi-VN')}₫ - ${tx.content}`,
            },
            ...(tx.editHistory || []),
          ],
        };
      });
      const log = createLogItem(
        'Tài chính lớp',
        'Điều chỉnh giao dịch quỹ lớp',
        `Điều chỉnh GD ${txId}. Lý do: ${reason}`
      );
      return {
        ...prev,
        financeTransactions: updated,
        auditLogs: [log, ...prev.auditLogs],
      };
    });
    showToast('Đã cập nhật giao dịch và lưu lịch sử kiểm toán.', 'success');
  };

  const cancelFinanceTransaction = (txId: string, reason: string) => {
    setState((prev) => {
      const target = prev.financeTransactions.find((t) => t.id === txId);
      if (!target) return prev;
      const log = createLogItem(
        'Tài chính lớp',
        'Hủy giao dịch có kiểm toán',
        `Hủy giao dịch ${target.transactionCode} (${target.amount.toLocaleString(
          'vi-VN'
        )}₫). Lý do: ${reason}`
      );
      return {
        ...prev,
        financeTransactions: prev.financeTransactions.map((t) =>
          t.id === txId
            ? {
                ...t,
                isCancelled: true,
                cancelReason: reason,
                editHistory: [
                  {
                    editedAt: new Date().toLocaleString('vi-VN'),
                    editedBy: sessionRole.actorName,
                    reason: `Hủy giao dịch: ${reason}`,
                    previousSummary: `${t.transactionCode} - ${t.amount.toLocaleString('vi-VN')}₫`,
                  },
                  ...(t.editHistory || []),
                ],
              }
            : t
        ),
        auditLogs: [log, ...prev.auditLogs],
      };
    });
    showToast('Đã hủy giao dịch và lưu lý do vào nhật ký kiểm toán.', 'info');
  };

  const addFinanceCategory = (cat: Omit<FinanceCategory, 'id'>) => {
    const newCat: FinanceCategory = {
      ...cat,
      id: `fcat-${Date.now()}`,
    };
    setState((prev) => ({
      ...prev,
      financeCategories: [...prev.financeCategories, newCat],
    }));
    showToast(`Đã thêm danh mục tài chính "${newCat.name}".`, 'success');
  };

  // --- MODULE 6: AWARDS ---
  const addAwardRecord = (award: Omit<AwardRecord, 'id'>) => {
    const newAward: AwardRecord = {
      ...award,
      id: `aw-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    };
    const log = createLogItem(
      'Báo cáo & Khen thưởng',
      'Thêm danh hiệu khen thưởng',
      `Khen thưởng HS ${newAward.studentName}: ${newAward.title}`
    );
    setState((prev) => ({
      ...prev,
      awards: [newAward, ...prev.awards],
      auditLogs: [log, ...prev.auditLogs],
    }));
    showToast(`Đã thêm khen thưởng cho học sinh ${newAward.studentName}.`, 'success');
  };

  const updateAwardRecord = (award: AwardRecord) => {
    setState((prev) => ({
      ...prev,
      awards: prev.awards.map((a) => (a.id === award.id ? award : a)),
    }));
    showToast(`Đã cập nhật trạng thái khen thưởng của ${award.studentName}.`, 'success');
  };

  const deleteAwardRecord = (awardId: string) => {
    setState((prev) => ({
      ...prev,
      awards: prev.awards.filter((a) => a.id !== awardId),
    }));
    showToast('Đã xóa bản ghi đề xuất khen thưởng.', 'info');
  };

  const updateAwardTemplate = (tpl: AwardTemplate) => {
    setState((prev) => ({
      ...prev,
      awardTemplates: prev.awardTemplates.map((t) =>
        t.id === tpl.id ? tpl : t
      ),
    }));
    showToast('Đã lưu mẫu giấy khen.', 'success');
  };

  // --- MODULE 7: PLANNING & TASKS ---
  const addClassPlan = (plan: Omit<ClassPlan, 'id'>) => {
    const newPlan: ClassPlan = {
      ...plan,
      id: `plan-${Date.now()}`,
    };
    const log = createLogItem(
      'Kế hoạch chủ nhiệm',
      'Tạo kế hoạch mới',
      `Tạo ${newPlan.planType}: ${newPlan.title}`
    );
    setState((prev) => ({
      ...prev,
      plans: [newPlan, ...prev.plans],
      auditLogs: [log, ...prev.auditLogs],
    }));
    showToast(`Đã thêm "${newPlan.title}".`, 'success');
  };

  const updateClassPlan = (plan: ClassPlan) => {
    setState((prev) => ({
      ...prev,
      plans: prev.plans.map((p) => (p.id === plan.id ? plan : p)),
    }));
    showToast('Đã cập nhật kế hoạch chủ nhiệm.', 'success');
  };

  const deleteClassPlan = (planId: string) => {
    setState((prev) => ({
      ...prev,
      plans: prev.plans.filter((p) => p.id !== planId),
    }));
    showToast('Đã xóa kế hoạch.', 'info');
  };

  const addTaskItem = (task: Omit<TaskItem, 'id'>) => {
    const newTask: TaskItem = {
      ...task,
      id: `task-${Date.now()}`,
    };
    const log = createLogItem(
      'Kế hoạch chủ nhiệm',
      'Giao nhiệm vụ cán bộ lớp',
      `Giao nhiệm vụ "${newTask.title}" cho ${newTask.assigneeName}`
    );
    setState((prev) => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
      auditLogs: [log, ...prev.auditLogs],
    }));
    showToast(`Đã giao nhiệm vụ cho ${newTask.assigneeName}.`, 'success');
  };

  const updateTaskItem = (task: TaskItem) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === task.id ? task : t)),
    }));
    showToast('Đã cập nhật tiến độ nhiệm vụ.', 'success');
  };

  const deleteTaskItem = (taskId: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
    }));
    showToast('Đã xóa nhiệm vụ.', 'info');
  };

  // --- MODULE 8: SETTINGS ---
  const updateSchoolInfo = (school: SchoolInfo) => {
    const log = createLogItem(
      'Cài đặt & Quản trị',
      'Cập nhật thông tin trường',
      `Cập nhật thông tin ${school.name}`
    );
    setState((prev) => ({
      ...prev,
      school,
      auditLogs: [log, ...prev.auditLogs],
    }));
    showToast('Đã lưu thông tin trường học.', 'success');
  };

  const addOrUpdateClass = (cls: ClassInfo) => {
    setState((prev) => {
      const exists = prev.classes.some((c) => c.id === cls.id);
      return {
        ...prev,
        classes: exists
          ? prev.classes.map((c) => (c.id === cls.id ? cls : c))
          : [...prev.classes, cls],
      };
    });
    showToast(`Đã lưu thông tin lớp ${cls.name}.`, 'success');
  };

  const setCurrentClassId = (classId: string) => {
    setState((prev) => ({
      ...prev,
      currentClassId: classId,
    }));
    showToast('Đã chuyển lớp làm việc.', 'info');
  };

  const addOrUpdateSchoolYear = (sy: SchoolYearInfo) => {
    setState((prev) => {
      const exists = prev.schoolYears.some((y) => y.id === sy.id);
      return {
        ...prev,
        schoolYears: exists
          ? prev.schoolYears.map((y) => (y.id === sy.id ? sy : y))
          : [...prev.schoolYears, sy],
      };
    });
    showToast(`Đã lưu năm học ${sy.name}.`, 'success');
  };

  const addOrUpdateSemester = (sem: SemesterInfo) => {
    setState((prev) => {
      const exists = prev.semesters.some((s) => s.id === sem.id);
      return {
        ...prev,
        semesters: exists
          ? prev.semesters.map((s) => (s.id === sem.id ? sem : s))
          : [...prev.semesters, sem],
      };
    });
    showToast(`Đã lưu học kỳ ${sem.name}.`, 'success');
  };

  return (
    <WorkspaceContext.Provider
      value={{
        state,
        isAuthenticated,
        loginWithCredentials,
        logoutSession,
        updateAuthCredentials,
        activeModule,
        setActiveModule,
        sessionRole,
        setSessionRole,
        firebaseUser,
        authLoading,
        syncMessage,
        supabaseStatus,
        supabaseStatusDetail,
        lastSupabaseSyncAt,
        syncNowWithSupabase,
        pullFromSupabase,
        toastMessage,
        showToast,
        loginWithGoogle,
        logoutUser,
        addAuditLog,
        clearDemoData,
        resetDemoData,
        importFullWorkspaceJson,
        addStudent,
        updateStudent,
        deleteOrArchiveStudent,
        importStudentsBatch,
        autoAssignStudentsToGroups,
        updateGroup,
        saveCriteriaList,
        toggleCriterionActive,
        deleteCriterion,
        addCompetitionRecordsBatch,
        updateCompetitionRecord,
        deleteOrUndoCompetitionRecord,
        setGroupScoringMode,
        lockCompetitionPeriod,
        unlockCompetitionPeriod,
        upsertAttendanceRecordsForDate,
        setFinanceOpeningBalance,
        addFinanceTransaction,
        updateFinanceTransaction,
        cancelFinanceTransaction,
        addFinanceCategory,
        addAwardRecord,
        updateAwardRecord,
        deleteAwardRecord,
        updateAwardTemplate,
        addClassPlan,
        updateClassPlan,
        deleteClassPlan,
        addTaskItem,
        updateTaskItem,
        deleteTaskItem,
        updateSchoolInfo,
        addOrUpdateClass,
        setCurrentClassId,
        addOrUpdateSchoolYear,
        addOrUpdateSemester,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return ctx;
}
