import { createClient } from '@supabase/supabase-js';
import { WorkspaceState } from '../types/index.ts';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://gdoxbonoiumnpiswqris.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_eYFPXHwHldj4nqSombGNaA_ZWDOZRON';

export const DEFAULT_WORKSPACE_ID = 'thanh_hoa_10a3_shared';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type SupabaseConnectionState =
  | 'CONNECTING'
  | 'CONNECTED'
  | 'NEEDS_TABLE_SETUP'
  | 'ERROR';

export interface SupabaseSyncResult {
  status: SupabaseConnectionState;
  message: string;
  updatedAt?: string;
}

/**
 * Kiểm tra kết nối và bảng dữ liệu trên Supabase
 */
export async function checkSupabaseConnection(): Promise<SupabaseSyncResult> {
  try {
    const { error } = await supabase
      .from('workspace_snapshots')
      .select('uid, updated_at')
      .limit(1);

    if (error) {
      // Mã lỗi PGRST205 hoặc 42P01 nghĩa là kết nối thành công tới Supabase nhưng bảng chưa được tạo
      if (
        error.code === 'PGRST205' ||
        error.code === '42P01' ||
        error.message?.includes('workspace_snapshots') ||
        error.message?.includes('schema cache')
      ) {
        return {
          status: 'NEEDS_TABLE_SETUP',
          message:
            'Đã kết nối tới Supabase! Cần chạy lệnh SQL khởi tạo bảng lần đầu trên Supabase SQL Editor.',
        };
      }
      return {
        status: 'ERROR',
        message: `Lỗi từ Supabase: ${error.message}`,
      };
    }

    return {
      status: 'CONNECTED',
      message: 'Đã kết nối và đồng bộ trực tiếp với cơ sở dữ liệu Supabase',
    };
  } catch (err: any) {
    return {
      status: 'ERROR',
      message: err?.message || 'Không thể kết nối tới máy chủ Supabase.',
    };
  }
}

/**
 * Tải toàn bộ dữ liệu lớp học từ Supabase
 */
export async function loadWorkspaceFromSupabase(
  workspaceId: string = DEFAULT_WORKSPACE_ID
): Promise<{
  state: WorkspaceState | null;
  status: SupabaseConnectionState;
  message: string;
  updatedAt?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('workspace_snapshots')
      .select('uid, email, state_json, updated_at')
      .eq('uid', workspaceId)
      .maybeSingle();

    if (error) {
      if (
        error.code === 'PGRST205' ||
        error.code === '42P01' ||
        error.message?.includes('workspace_snapshots') ||
        error.message?.includes('schema cache')
      ) {
        return {
          state: null,
          status: 'NEEDS_TABLE_SETUP',
          message:
            'Đã kết nối Supabase — Vui lòng chạy mã SQL tạo bảng trong phần Cài đặt.',
        };
      }
      return {
        state: null,
        status: 'ERROR',
        message: `Lỗi tải dữ liệu Supabase: ${error.message}`,
      };
    }

    if (data && data.state_json && typeof data.state_json === 'object') {
      return {
        state: data.state_json as WorkspaceState,
        status: 'CONNECTED',
        message: 'Đã tải dữ liệu lớp học từ Supabase',
        updatedAt: data.updated_at,
      };
    }

    return {
      state: null,
      status: 'CONNECTED',
      message: 'Kết nối Supabase sẵn sàng (chưa có bản ghi trước đó)',
    };
  } catch (err: any) {
    return {
      state: null,
      status: 'ERROR',
      message: err?.message || 'Không thể tải dữ liệu từ Supabase.',
    };
  }
}

/**
 * Lưu dữ liệu lớp học lên Supabase (cả bảng snapshot và các bảng chi tiết để xem trên Table Editor)
 */
export async function saveWorkspaceToSupabase(
  state: WorkspaceState,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
  email: string = 'tienduongbp2011@gmail.com'
): Promise<SupabaseSyncResult> {
  try {
    const nowIso = new Date().toISOString();

    const { error } = await supabase.from('workspace_snapshots').upsert(
      {
        uid: workspaceId,
        email,
        state_json: state,
        updated_at: nowIso,
      },
      { onConflict: 'uid' }
    );

    if (error) {
      if (
        error.code === 'PGRST205' ||
        error.code === '42P01' ||
        error.message?.includes('workspace_snapshots') ||
        error.message?.includes('schema cache')
      ) {
        return {
          status: 'NEEDS_TABLE_SETUP',
          message:
            'Chưa có bảng dữ liệu trên Supabase. Hãy mở mục Cài đặt để copy lệnh SQL tạo bảng.',
        };
      }
      return {
        status: 'ERROR',
        message: `Lỗi lưu Supabase: ${error.message}`,
      };
    }

    // Đồng bộ bất đồng bộ sang các bảng chi tiết (students, student_groups, competition_records, finance_transactions...)
    // để người dùng có thể xem trực tiếp từng bảng trong Table Editor của Supabase
    syncRelationalTablesToSupabase(state, workspaceId).catch((err) => {
      console.warn('Relational table sync notice:', err);
    });

    return {
      status: 'CONNECTED',
      message: 'Đã lưu dữ liệu lên Supabase',
      updatedAt: nowIso,
    };
  } catch (err: any) {
    return {
      status: 'ERROR',
      message: err?.message || 'Không thể lưu dữ liệu lên Supabase.',
    };
  }
}

/**
 * Đồng bộ dữ liệu ra các bảng quan hệ trên Supabase để tiện tra cứu trong Table Editor
 */
async function syncRelationalTablesToSupabase(
  state: WorkspaceState,
  ownerUid: string
) {
  // 1. Bảng tổ học sinh (student_groups)
  if (state.groups?.length) {
    await supabase.from('student_groups').upsert(
      state.groups.map((g) => ({
        id: g.id,
        owner_uid: ownerUid,
        class_id: g.classId || state.currentClassId,
        name: g.name,
        leader_student_id: g.leaderStudentId || null,
        duty_target_group_id: g.dutyTargetGroupId || null,
        slogan: g.slogan || null,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'id' }
    );
  }

  // 2. Bảng học sinh (students)
  if (state.students?.length) {
    await supabase.from('students').upsert(
      state.students.map((s) => ({
        id: s.id,
        owner_uid: ownerUid,
        class_id: s.classId || state.currentClassId,
        student_code: s.studentCode,
        full_name: s.fullName,
        dob: s.dob,
        gender: s.gender,
        group_id: s.groupId,
        position: s.position,
        parent_phone: s.parentPhone || null,
        initial_score: s.initialScore ?? 100,
        status: s.status,
        notes: s.notes || null,
        is_demo: Boolean(s.isDemo),
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'id' }
    );
  }

  // 3. Bảng tiêu chí thi đua (competition_criteria)
  if (state.criteria?.length) {
    await supabase.from('competition_criteria').upsert(
      state.criteria.map((c) => ({
        id: c.id,
        owner_uid: ownerUid,
        name: c.name,
        category: c.category,
        type: c.type,
        points: c.points,
        description: c.description || null,
        is_active: c.isActive,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'id' }
    );
  }

  // 4. Bảng ghi nhận chấm thi đua (competition_records)
  if (state.competitionRecords?.length) {
    await supabase.from('competition_records').upsert(
      state.competitionRecords.slice(0, 200).map((r) => ({
        id: r.id,
        owner_uid: ownerUid,
        class_id: r.classId || state.currentClassId,
        date: r.date,
        student_id: r.studentId,
        group_id: r.groupId,
        criteria_id: r.criteriaId,
        base_points: r.basePoints,
        multiplier: r.multiplier,
        total_points: r.totalPoints,
        subject_or_activity: r.subjectOrActivity || null,
        recorded_by: r.recordedBy,
        notes: r.notes || null,
        evidence: r.evidence || null,
        is_deleted: Boolean(r.isDeleted),
        edit_history: r.editHistory || [],
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'id' }
    );
  }

  // 5. Bảng giao dịch tài chính (finance_transactions)
  if (state.financeTransactions?.length) {
    await supabase.from('finance_transactions').upsert(
      state.financeTransactions.map((tx) => ({
        id: tx.id,
        owner_uid: ownerUid,
        class_id: tx.classId || state.currentClassId,
        transaction_code: tx.transactionCode,
        date: tx.date,
        type: tx.type,
        category_id: tx.categoryId,
        category_name: tx.categoryName,
        content: tx.content,
        amount: tx.amount,
        payer_or_receiver: tx.payerOrReceiver,
        recorded_by: tx.recordedBy,
        voucher_ref: tx.voucherRef || null,
        notes: tx.notes || null,
        reconcile_status: tx.reconcileStatus,
        is_cancelled: Boolean(tx.isCancelled),
        cancel_reason: tx.cancelReason || null,
        edit_history: tx.editHistory || [],
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'id' }
    );
  }
}

/**
 * Mã SQL chuẩn để người dùng dán vào Supabase SQL Editor khởi tạo toàn bộ bảng & quyền truy cập
 */
export const SUPABASE_SETUP_SQL = `-- =====================================================================
-- KỊCH BẢN KHỞI TẠO CƠ SỞ DỮ LIỆU SUPABASE CHO THANH HÒA CLASS MANAGER
-- Cách dùng: Mở Supabase Dashboard -> SQL Editor -> New Query -> Dán & nhấn RUN
-- =====================================================================

-- 1. Bảng lưu trữ đồng bộ toàn bộ trạng thái lớp học (Realtime Snapshot)
CREATE TABLE IF NOT EXISTS public.workspace_snapshots (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL DEFAULT 'tienduongbp2011@gmail.com',
  state_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng Tổ thi đua (student_groups)
CREATE TABLE IF NOT EXISTS public.student_groups (
  id TEXT PRIMARY KEY,
  owner_uid TEXT NOT NULL,
  class_id TEXT NOT NULL,
  name TEXT NOT NULL,
  leader_student_id TEXT,
  duty_target_group_id TEXT,
  slogan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bảng Danh sách Học sinh (students)
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  owner_uid TEXT NOT NULL,
  class_id TEXT NOT NULL,
  student_code TEXT NOT NULL,
  full_name TEXT NOT NULL,
  dob TEXT NOT NULL,
  gender TEXT NOT NULL,
  group_id TEXT NOT NULL,
  position TEXT NOT NULL,
  parent_phone TEXT,
  initial_score INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'Đang học',
  notes TEXT,
  is_demo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bảng Bộ tiêu chí thi đua (competition_criteria)
CREATE TABLE IF NOT EXISTS public.competition_criteria (
  id TEXT PRIMARY KEY,
  owner_uid TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  points INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Bảng Nhật ký chấm điểm thi đua (competition_records)
CREATE TABLE IF NOT EXISTS public.competition_records (
  id TEXT PRIMARY KEY,
  owner_uid TEXT NOT NULL,
  class_id TEXT NOT NULL,
  date TEXT NOT NULL,
  student_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  criteria_id TEXT NOT NULL,
  base_points INTEGER NOT NULL,
  multiplier INTEGER NOT NULL DEFAULT 1,
  total_points INTEGER NOT NULL,
  subject_or_activity TEXT,
  recorded_by TEXT NOT NULL,
  notes TEXT,
  evidence TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  edit_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Bảng Sổ quỹ & Giao dịch tài chính lớp (finance_transactions)
CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id TEXT PRIMARY KEY,
  owner_uid TEXT NOT NULL,
  class_id TEXT NOT NULL,
  transaction_code TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  category_id TEXT NOT NULL,
  category_name TEXT NOT NULL,
  content TEXT NOT NULL,
  amount INTEGER NOT NULL,
  payer_or_receiver TEXT NOT NULL,
  recorded_by TEXT NOT NULL,
  voucher_ref TEXT,
  notes TEXT,
  reconcile_status TEXT NOT NULL,
  is_cancelled BOOLEAN DEFAULT FALSE,
  cancel_reason TEXT,
  edit_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Cấu hình quyền truy cập (Row Level Security) cho phép ứng dụng đọc/ghi qua Publishable Anon Key
ALTER TABLE public.workspace_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access workspace_snapshots" ON public.workspace_snapshots;
CREATE POLICY "Allow public access workspace_snapshots" ON public.workspace_snapshots FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access student_groups" ON public.student_groups;
CREATE POLICY "Allow public access student_groups" ON public.student_groups FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access students" ON public.students;
CREATE POLICY "Allow public access students" ON public.students FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access competition_criteria" ON public.competition_criteria;
CREATE POLICY "Allow public access competition_criteria" ON public.competition_criteria FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access competition_records" ON public.competition_records;
CREATE POLICY "Allow public access competition_records" ON public.competition_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access finance_transactions" ON public.finance_transactions;
CREATE POLICY "Allow public access finance_transactions" ON public.finance_transactions FOR ALL USING (true) WITH CHECK (true);
`;
