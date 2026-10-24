import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  fullName: text('full_name').default('Nguyễn Tiến Dương'),
  role: text('role').default('GVCN'),
  assignedGroupId: text('assigned_group_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const profiles = pgTable('profiles', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role').notNull().default('GVCN'),
  schoolName: text('school_name').notNull().default('TRƯỜNG THPT THANH HÒA'),
  className: text('class_name').notNull().default('10A3'),
  schoolYear: text('school_year').notNull().default('2026–2027'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const schools = pgTable('schools', {
  id: text('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  principalName: text('principal_name'),
  motto: text('motto'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const schoolYears = pgTable('school_years', {
  id: text('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  name: text('name').notNull(),
  startDate: text('start_date'),
  endDate: text('end_date'),
  isCurrent: boolean('is_current').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const semesters = pgTable('semesters', {
  id: text('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  schoolYearId: text('school_year_id').notNull(),
  name: text('name').notNull(),
  startDate: text('start_date'),
  endDate: text('end_date'),
  isCurrent: boolean('is_current').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const classes = pgTable('classes', {
  id: text('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  schoolId: text('school_id').notNull(),
  schoolYearId: text('school_year_id').notNull(),
  name: text('name').notNull(),
  grade: text('grade').notNull(),
  homeroomTeacher: text('homeroom_teacher').notNull(),
  roomNumber: text('room_number'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const studentGroups = pgTable('student_groups', {
  id: text('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  classId: text('class_id').notNull(),
  name: text('name').notNull(),
  leaderStudentId: text('leader_student_id'),
  dutyTargetGroupId: text('duty_target_group_id'),
  slogan: text('slogan'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const students = pgTable('students', {
  id: text('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  classId: text('class_id').notNull(),
  studentCode: text('student_code').notNull(),
  fullName: text('full_name').notNull(),
  dob: text('dob').notNull(),
  gender: text('gender').notNull(),
  groupId: text('group_id').notNull(),
  position: text('position').notNull(),
  parentPhone: text('parent_phone'),
  initialScore: integer('initial_score').notNull().default(100),
  status: text('status').notNull().default('Đang học'),
  notes: text('notes'),
  isDemo: boolean('is_demo').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const studentGuardians = pgTable('student_guardians', {
  id: text('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  studentId: text('student_id').notNull(),
  fullName: text('full_name').notNull(),
  relationship: text('relationship').notNull(),
  phone: text('phone'),
  occupation: text('occupation'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const competitionCriteria = pgTable('competition_criteria', {
  id: text('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  type: text('type').notNull(),
  points: integer('points').notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const competitionRecords = pgTable('competition_records', {
  id: text('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  classId: text('class_id').notNull(),
  date: text('date').notNull(),
  studentId: text('student_id').notNull(),
  groupId: text('group_id').notNull(),
  criteriaId: text('criteria_id').notNull(),
  basePoints: integer('base_points').notNull(),
  multiplier: integer('multiplier').notNull().default(1),
  totalPoints: integer('total_points').notNull(),
  subjectOrActivity: text('subject_or_activity'),
  recordedBy: text('recorded_by').notNull(),
  notes: text('notes'),
  evidence: text('evidence'),
  isDeleted: boolean('is_deleted').default(false),
  editHistory: jsonb('edit_history').default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const competitionPeriods = pgTable('competition_periods', {
  id: text('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  classId: text('class_id').notNull(),
  name: text('name').notNull(),
  periodType: text('period_type').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  isLocked: boolean('is_locked').notNull().default(false),
  lockedAt: text('locked_at'),
  lockedBy: text('locked_by'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const competitionResults = pgTable('competition_results', {
  id: text('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  periodId: text('period_id').notNull(),
  snapshotData: jsonb('snapshot_data').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const attendanceRecords = pgTable('attendance_records', {
  id: text('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  classId: text('class_id').notNull(),
  date: text('date').notNull(),
  studentId: text('student_id').notNull(),
  groupId: text('group_id').notNull(),
  attendanceStatus: text('attendance_status').notNull(),
  uniformStatus: text('uniform_status').notNull(),
  hygieneStatus: text('hygiene_status').notNull(),
  orderStatus: text('order_status').notNull(),
  homeworkStatus: text('homework_status').notNull(),
  attitudeStatus: text('attitude_status').notNull(),
  activityStatus: text('activity_status').notNull(),
  reason: text('reason'),
  recordedBy: text('recorded_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const financeCategories = pgTable('finance_categories', {
  id: text('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const financePeriods = pgTable('finance_periods', {
  id: text('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  classId: text('class_id').notNull(),
  name: text('name').notNull(),
  openingBalance: integer('opening_balance').notNull().default(0),
  isLocked: boolean('is_locked').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const financeTransactions = pgTable('finance_transactions', {
  id: text('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  classId: text('class_id').notNull(),
  transactionCode: text('transaction_code').notNull(),
  date: text('date').notNull(),
  type: text('type').notNull(),
  categoryId: text('category_id').notNull(),
  categoryName: text('category_name').notNull(),
  content: text('content').notNull(),
  amount: integer('amount').notNull(),
  payerOrReceiver: text('payer_or_receiver').notNull(),
  recordedBy: text('recorded_by').notNull(),
  voucherRef: text('voucher_ref'),
  notes: text('notes'),
  reconcileStatus: text('reconcile_status').notNull(),
  isCancelled: boolean('is_cancelled').default(false),
  cancelReason: text('cancel_reason'),
  editHistory: jsonb('edit_history').default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const awardTemplates = pgTable('award_templates', {
  id: text('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  name: text('name').notNull(),
  orientation: text('orientation').notNull(),
  schoolName: text('school_name').notNull(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  signerTitle: text('signer_title').notNull(),
  signerName: text('signer_name').notNull(),
  borderStyle: text('border_style').default('classic'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const awards = pgTable('awards', {
  id: text('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  classId: text('class_id').notNull(),
  studentId: text('student_id').notNull(),
  studentName: text('student_name').notNull(),
  className: text('class_name').notNull(),
  title: text('title').notNull(),
  achievement: text('achievement').notNull(),
  periodName: text('period_name').notNull(),
  awardDate: text('award_date').notNull(),
  location: text('location').notNull(),
  signerName: text('signer_name').notNull(),
  status: text('status').notNull(),
  templateId: text('template_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const classPlans = pgTable('class_plans', {
  id: text('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  classId: text('class_id').notNull(),
  title: text('title').notNull(),
  planType: text('plan_type').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  objectives: text('objectives').notNull(),
  activities: text('activities').notNull(),
  status: text('status').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  classId: text('class_id').notNull(),
  planId: text('plan_id'),
  title: text('title').notNull(),
  assigneeName: text('assignee_name').notNull(),
  assigneeRole: text('assignee_role').notNull(),
  dueDate: text('due_date').notNull(),
  priority: text('priority').notNull(),
  status: text('status').notNull(),
  resultNotes: text('result_notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  ownerUid: text('owner_uid').notNull(),
  timestamp: text('timestamp').notNull(),
  actorName: text('actor_name').notNull(),
  actorRole: text('actor_role').notNull(),
  module: text('module').notNull(),
  action: text('action').notNull(),
  details: text('details').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const workspaceSnapshots = pgTable('workspace_snapshots', {
  uid: text('uid').primaryKey(),
  email: text('email').notNull(),
  stateJson: jsonb('state_json').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
