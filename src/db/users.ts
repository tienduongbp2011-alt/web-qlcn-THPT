import { db } from './index.ts';
import {
  users,
  profiles,
  workspaceSnapshots,
  auditLogs,
} from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          updatedAt: new Date(),
        },
      })
      .returning();

    await db
      .insert(profiles)
      .values({
        uid,
        email,
        fullName: 'Nguyễn Tiến Dương',
        role: 'GVCN',
        schoolName: 'TRƯỜNG THPT THANH HÒA',
        className: '10A3',
        schoolYear: '2026–2027',
      })
      .onConflictDoNothing({
        target: profiles.uid,
      });

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Không thể đồng bộ thông tin tài khoản. Vui lòng thử lại sau.', {
      cause: error,
    });
  }
}

export async function getWorkspaceStateForUser(uid: string) {
  try {
    const rows = await db
      .select()
      .from(workspaceSnapshots)
      .where(eq(workspaceSnapshots.uid, uid));
    return rows[0]?.stateJson ?? null;
  } catch (error) {
    console.error('Database query failed in getWorkspaceStateForUser:', error);
    throw new Error('Không thể tải dữ liệu lớp học từ máy chủ.', {
      cause: error,
    });
  }
}

export async function saveWorkspaceStateForUser(
  uid: string,
  email: string,
  stateJson: unknown
) {
  try {
    const result = await db
      .insert(workspaceSnapshots)
      .values({
        uid,
        email,
        stateJson,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: workspaceSnapshots.uid,
        set: {
          email,
          stateJson,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query failed in saveWorkspaceStateForUser:', error);
    throw new Error('Không thể lưu dữ liệu lớp học lên máy chủ.', {
      cause: error,
    });
  }
}

export async function appendAuditLog(
  uid: string,
  logEntry: {
    id: string;
    timestamp: string;
    actorName: string;
    actorRole: string;
    module: string;
    action: string;
    details: string;
  }
) {
  try {
    await db
      .insert(auditLogs)
      .values({
        id: logEntry.id,
        ownerUid: uid,
        timestamp: logEntry.timestamp,
        actorName: logEntry.actorName,
        actorRole: logEntry.actorRole,
        module: logEntry.module,
        action: logEntry.action,
        details: logEntry.details,
      })
      .onConflictDoNothing({ target: auditLogs.id });
  } catch (error) {
    console.error('Database query failed in appendAuditLog:', error);
    throw new Error('Không thể ghi nhật ký kiểm toán.', { cause: error });
  }
}
