import React, { useMemo } from 'react';
import {
  Award,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Settings,
  TrendingUp,
  Trophy,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import {
  calculateAttendanceSummary,
  calculateFinanceMetrics,
  calculateGroupRankings,
  calculateStudentRankings,
  formatCurrencyVND,
  formatVietnameseDate,
  toISODate,
} from '../../utils/calculations.ts';
import { ModuleKey } from '../../types/index.ts';

export const DashboardPage: React.FC = () => {
  const { state, setActiveModule } = useWorkspace();
  const today = toISODate(new Date());

  const criteriaMap = useMemo(
    () => new Map(state.criteria.map((c) => [c.id, c])),
    [state.criteria]
  );

  const activeStudents = useMemo(
    () => state.students.filter((s) => s.status === 'Đang học'),
    [state.students]
  );

  const groupRankings = useMemo(
    () =>
      calculateGroupRankings(
        state.groups,
        state.students,
        state.competitionRecords,
        criteriaMap,
        state.groupScoringMode
      ),
    [
      state.groups,
      state.students,
      state.competitionRecords,
      criteriaMap,
      state.groupScoringMode,
    ]
  );

  const studentRankings = useMemo(
    () =>
      calculateStudentRankings(
        state.students,
        state.groups,
        state.competitionRecords,
        criteriaMap
      ),
    [state.students, state.groups, state.competitionRecords, criteriaMap]
  );

  const financeMetrics = useMemo(
    () =>
      calculateFinanceMetrics(
        state.financeOpeningBalance,
        state.financeTransactions
      ),
    [state.financeOpeningBalance, state.financeTransactions]
  );

  const todayAttendance = useMemo(
    () =>
      calculateAttendanceSummary(state.students, state.attendanceRecords, {
        startDate: today,
        endDate: today,
      }),
    [state.students, state.attendanceRecords, today]
  );

  const pendingTasks = useMemo(
    () => state.tasks.filter((t) => t.status !== 'Hoàn thành'),
    [state.tasks]
  );

  const topGroup = groupRankings[0];

  // Dữ liệu biểu đồ cột 4 tổ
  const groupBarData = useMemo(() => {
    return state.groups.map((grp) => {
      const ranked = groupRankings.find((r) => r.groupId === grp.id);
      return {
        name: grp.name,
        'Điểm tích lũy': ranked?.displayScore ?? 0,
        'Điểm cộng': ranked?.totalBonusPoints ?? 0,
        'Điểm trừ': ranked?.totalPenaltyPoints ?? 0,
      };
    });
  }, [state.groups, groupRankings]);

  // Dữ liệu biểu đồ đường điểm thi đua theo ngày
  const trendLineData = useMemo(() => {
    const days: string[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days.push(toISODate(d));
    }

    let runningNet = 0;
    return days.map((dateStr) => {
      const dayRecords = state.competitionRecords.filter(
        (r) => !r.isDeleted && r.date === dateStr
      );
      const dayBonus = dayRecords
        .filter((r) => r.totalPoints > 0)
        .reduce((a, b) => a + b.totalPoints, 0);
      const dayPenalty = dayRecords
        .filter((r) => r.totalPoints < 0)
        .reduce((a, b) => a + Math.abs(b.totalPoints), 0);
      runningNet += dayBonus - dayPenalty;
      return {
        date: formatVietnameseDate(dateStr).slice(0, 5),
        'Điểm cộng ngày': dayBonus,
        'Điểm trừ ngày': dayPenalty,
        'Hiệu số lũy kế': runningNet,
      };
    });
  }, [state.competitionRecords]);

  // Dữ liệu biểu đồ tròn tài chính
  const financePieData = useMemo(
    () => [
      {
        name: 'Đầu kỳ',
        value: Math.max(financeMetrics.openingBalance, 0),
        color: '#42A5F5',
      },
      {
        name: 'Tổng thu',
        value: Math.max(financeMetrics.totalIncome, 0),
        color: '#16A34A',
      },
      {
        name: 'Tổng chi',
        value: Math.max(financeMetrics.totalExpense, 0),
        color: '#FF8A00',
      },
    ],
    [financeMetrics]
  );

  const shortcutModules: {
    key: ModuleKey;
    title: string;
    desc: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    {
      key: 'dashboard',
      title: '1. Trang chủ',
      desc: 'Bảng điều khiển tổng hợp',
      icon: BarChart3,
    },
    {
      key: 'students',
      title: '2. Quản lý học sinh',
      desc: `${state.students.length} hồ sơ · Excel`,
      icon: Users,
    },
    {
      key: 'competition',
      title: '3. Thi đua 4 tổ',
      desc: 'Chấm chéo · Hệ số 1x, 2x',
      icon: Trophy,
    },
    {
      key: 'attendance',
      title: '4. Chuyên cần & Nề nếp',
      desc: 'Điểm danh ngày & kỳ',
      icon: CalendarCheck,
    },
    {
      key: 'finance',
      title: '5. Tài chính lớp',
      desc: 'Sổ quỹ & Đối chiếu',
      icon: Wallet,
    },
    {
      key: 'reports',
      title: '6. Báo cáo & Giấy khen',
      desc: 'In giấy khen A4 chuẩn',
      icon: Award,
    },
    {
      key: 'planning',
      title: '7. Kế hoạch chủ nhiệm',
      desc: 'Lịch tuần & Giao việc',
      icon: ClipboardList,
    },
    {
      key: 'settings',
      title: '8. Cài đặt & Quản trị',
      desc: 'Phân quyền & Sao lưu',
      icon: Settings,
    },
  ];

  const presentTodayCount =
    todayAttendance.onTimeCount + todayAttendance.lateCount;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="crystal-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-[#0D47A1] tracking-wider uppercase">
            PHÂN HỆ 1 · BẢNG ĐIỀU KHIỂN LỚP CHỦ NHIỆM 10A3
          </div>
          <h2 className="text-2xl font-bold text-[#17365D] mt-1">
            Tổng quan Tình hình Lớp 10A3 – GVCN Nguyễn Tiến Dương
          </h2>
          <p className="text-sm text-[#64748B] mt-0.5">
            Số liệu được tính toán trực tiếp theo thời gian thực từ hồ sơ học sinh, thi đua 4 tổ, chuyên cần và sổ quỹ lớp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveModule('competition')}
            className="px-4 py-2 rounded-lg bg-[#0D47A1] text-white text-sm font-bold hover:bg-[#17365D] transition-colors"
          >
            Chấm thi đua nhanh
          </button>
          <button
            type="button"
            onClick={() => setActiveModule('attendance')}
            className="px-4 py-2 rounded-lg border border-[#0D47A1] text-[#0D47A1] bg-white hover:bg-[#E3F2FD] text-sm font-bold transition-colors"
          >
            Điểm danh hôm nay
          </button>
          <button
            type="button"
            onClick={() => setActiveModule('reports')}
            className="px-4 py-2 rounded-lg bg-[#FF8A00] text-white text-sm font-bold hover:opacity-90 transition-opacity"
          >
            In giấy khen
          </button>
        </div>
      </div>

      {/* 6 STAT CARDS (Section 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Tổng số học sinh */}
        <div
          onClick={() => setActiveModule('students')}
          className="crystal-card rounded-xl p-4 cursor-pointer hover:border-[#42A5F5] transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] uppercase">
              1. Tổng số học sinh
            </span>
            <Users className="w-5 h-5 text-[#0D47A1]" />
          </div>
          <div className="text-2xl font-bold text-[#0D47A1] mt-2 tabular-nums">
            {activeStudents.length} học sinh
          </div>
          <div className="text-xs text-[#64748B] mt-1">
            Nam: {activeStudents.filter((s) => s.gender === 'Nam').length} · Nữ:{' '}
            {activeStudents.filter((s) => s.gender === 'Nữ').length} · Chia đều 4 tổ
          </div>
        </div>

        {/* Card 2: Sĩ số hiện tại */}
        <div
          onClick={() => setActiveModule('attendance')}
          className="crystal-card rounded-xl p-4 cursor-pointer hover:border-[#42A5F5] transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] uppercase">
              2. Sĩ số hiện tại ({formatVietnameseDate(today)})
            </span>
            <UserCheck className="w-5 h-5 text-[#16A34A]" />
          </div>
          <div className="text-2xl font-bold text-[#16A34A] mt-2 tabular-nums">
            {presentTodayCount}/{activeStudents.length} có mặt
          </div>
          <div className="text-xs text-[#64748B] mt-1">
            Đúng giờ: {todayAttendance.onTimeCount} · Đi muộn: {todayAttendance.lateCount} · Vắng có phép:{' '}
            {todayAttendance.excusedAbsentCount} · Chưa điểm danh: {todayAttendance.unrecordedCount}
          </div>
        </div>

        {/* Card 3: Tình hình thi đua 4 tổ */}
        <div
          onClick={() => setActiveModule('competition')}
          className="crystal-card rounded-xl p-4 cursor-pointer hover:border-[#42A5F5] transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] uppercase">
              3. Tình hình thi đua 4 tổ
            </span>
            <Trophy className="w-5 h-5 text-[#FF8A00]" />
          </div>
          <div className="text-2xl font-bold text-[#0D47A1] mt-2 tabular-nums">
            Hạng 1: {topGroup ? topGroup.groupName : 'Tổ 1'} ({topGroup?.displayScore ?? 0}đ)
          </div>
          <div className="text-xs text-[#64748B] mt-1">
            Chế độ tính:{' '}
            {state.groupScoringMode === 'AVERAGE'
              ? 'Điểm bình quân thành viên'
              : 'Tổng điểm thành viên'}{' '}
            · {state.competitionRecords.filter((r) => !r.isDeleted).length} lượt chấm
          </div>
        </div>

        {/* Card 4: Số dư quỹ lớp */}
        <div
          onClick={() => setActiveModule('finance')}
          className="crystal-card rounded-xl p-4 cursor-pointer hover:border-[#42A5F5] transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] uppercase">
              4. Số dư quỹ lớp hiện tại
            </span>
            <Wallet className="w-5 h-5 text-[#0D47A1]" />
          </div>
          <div className="text-2xl font-bold text-[#0D47A1] mt-2 tabular-nums">
            {formatCurrencyVND(financeMetrics.currentBalance)}
          </div>
          <div className="text-xs text-[#64748B] mt-1">
            Thu: {formatCurrencyVND(financeMetrics.totalIncome)} · Chi:{' '}
            {formatCurrencyVND(financeMetrics.totalExpense)} · Cần đối chiếu:{' '}
            {financeMetrics.pendingReconcileCount}
          </div>
        </div>

        {/* Card 5: Thành tích nổi bật */}
        <div
          onClick={() => setActiveModule('reports')}
          className="crystal-card rounded-xl p-4 cursor-pointer hover:border-[#42A5F5] transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] uppercase">
              5. Thành tích nổi bật
            </span>
            <Award className="w-5 h-5 text-[#FF8A00]" />
          </div>
          <div className="text-2xl font-bold text-[#17365D] mt-2 tabular-nums">
            {state.awards.length} danh hiệu khen thưởng
          </div>
          <div className="text-xs text-[#64748B] mt-1 truncate">
            Dẫn đầu cá nhân: {studentRankings[0]?.fullName || 'Chưa có'} (
            {studentRankings[0]?.finalScore ?? 100}đ)
          </div>
        </div>

        {/* Card 6: Công việc cần xử lý */}
        <div
          onClick={() => setActiveModule('planning')}
          className="crystal-card rounded-xl p-4 cursor-pointer hover:border-[#42A5F5] transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] uppercase">
              6. Công việc cần xử lý
            </span>
            <ClipboardList className="w-5 h-5 text-[#DC2626]" />
          </div>
          <div className="text-2xl font-bold text-[#17365D] mt-2 tabular-nums">
            {pendingTasks.length} nhiệm vụ đang thực hiện
          </div>
          <div className="text-xs text-[#64748B] mt-1">
            Hoàn thành: {state.tasks.filter((t) => t.status === 'Hoàn thành').length}/
            {state.tasks.length} nhiệm vụ · {state.plans.length} kế hoạch chủ nhiệm
          </div>
        </div>
      </div>

      {/* SHORTCUTS TO 8 MODULES */}
      <div className="crystal-card rounded-2xl p-4">
        <div className="text-sm font-bold text-[#0D47A1] mb-3">
          Phím tắt điều hướng nhanh tới 8 phân hệ quản lý
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {shortcutModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.key}
                type="button"
                onClick={() => setActiveModule(mod.key)}
                className="p-3 rounded-xl border border-[#D7EAFE] bg-[#F4FAFF] hover:bg-[#E3F2FD] text-left transition-colors flex flex-col justify-between"
              >
                <Icon className="w-5 h-5 text-[#0D47A1] mb-2" />
                <div>
                  <div className="text-xs font-bold text-[#17365D] leading-snug">
                    {mod.title}
                  </div>
                  <div className="text-[11px] text-[#64748B] mt-0.5 truncate">
                    {mod.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CHARTS SECTION (Bar + Line + Pie) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 1. Bar Chart: Điểm thi đua 4 tổ */}
        <div className="crystal-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-bold text-[#0D47A1]">
                Biểu đồ cột Điểm thi đua 4 tổ
              </h3>
              <p className="text-xs text-[#64748B]">
                So sánh điểm cộng và điểm trừ của 4 tổ trong kỳ
              </p>
            </div>
            <BarChart3 className="w-5 h-5 text-[#42A5F5]" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D7EAFE" />
                <XAxis dataKey="name" stroke="#17365D" fontSize={12} />
                <YAxis stroke="#17365D" fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Điểm cộng" fill="#16A34A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Điểm trừ" fill="#DC2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Line Chart: Xu hướng điểm thi đua theo thời gian */}
        <div className="crystal-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-bold text-[#0D47A1]">
                Biểu đồ đường Điểm thi đua theo thời gian
              </h3>
              <p className="text-xs text-[#64748B]">
                Diễn biến điểm thi đua 7 ngày gần nhất của lớp 10A3
              </p>
            </div>
            <TrendingUp className="w-5 h-5 text-[#0D47A1]" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendLineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D7EAFE" />
                <XAxis dataKey="date" stroke="#17365D" fontSize={12} />
                <YAxis stroke="#17365D" fontSize={12} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Hiệu số lũy kế"
                  stroke="#0D47A1"
                  strokeWidth={2.5}
                />
                <Line
                  type="monotone"
                  dataKey="Điểm cộng ngày"
                  stroke="#16A34A"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Pie Chart: Tình hình thu chi quỹ lớp */}
        <div className="crystal-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-bold text-[#0D47A1]">
                Biểu đồ tròn Thu – Chi quỹ lớp
              </h3>
              <p className="text-xs text-[#64748B]">
                Số dư hiện tại: {formatCurrencyVND(financeMetrics.currentBalance)}
              </p>
            </div>
            <Wallet className="w-5 h-5 text-[#FF8A00]" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={financePieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={78}
                  label={({ name, value }) =>
                    `${name}: ${(Number(value) / 1000).toLocaleString('vi-VN')}k`
                  }
                >
                  {financePieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => formatCurrencyVND(Number(val))}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TABLES & LISTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bảng xếp hạng 4 tổ */}
        <div className="crystal-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-[#0D47A1]">
              Bảng xếp hạng 4 tổ thi đua
            </h3>
            <button
              type="button"
              onClick={() => setActiveModule('competition')}
              className="text-xs font-bold text-[#0D47A1] hover:underline"
            >
              Xem chi tiết & Chấm điểm
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#E3F2FD] text-[#0D47A1] text-left">
                  <th className="py-2.5 px-3 font-bold">Hạng</th>
                  <th className="py-2.5 px-3 font-bold">Tổ</th>
                  <th className="py-2.5 px-3 font-bold">Tổ trưởng</th>
                  <th className="py-2.5 px-3 font-bold">Trực chấm</th>
                  <th className="py-2.5 px-3 font-bold text-right">Cộng/Trừ</th>
                  <th className="py-2.5 px-3 font-bold text-right">Tổng điểm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D7EAFE]">
                {groupRankings.map((g) => (
                  <tr key={g.groupId} className="hover:bg-[#F4FAFF]">
                    <td className="py-2.5 px-3 font-bold text-[#0D47A1] tabular-nums">
                      #{g.rank}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#17365D]">
                      {g.groupName} ({g.memberCount} HS)
                    </td>
                    <td className="py-2.5 px-3 text-[#17365D]">
                      {g.leaderName.replace(' (Demo)', '')}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-[#64748B]">
                      Chấm {g.dutyTargetGroupName}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      <span className="text-[#16A34A] font-bold">
                        +{g.totalBonusPoints}
                      </span>{' '}
                      /{' '}
                      <span className="text-[#DC2626] font-bold">
                        -{g.totalPenaltyPoints}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#0D47A1] tabular-nums">
                      {g.displayScore}đ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Danh sách học sinh tiêu biểu */}
        <div className="crystal-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-[#0D47A1]">
              Danh sách học sinh tiêu biểu dẫn đầu
            </h3>
            <button
              type="button"
              onClick={() => setActiveModule('reports')}
              className="text-xs font-bold text-[#0D47A1] hover:underline"
            >
              Đề xuất khen thưởng
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#E3F2FD] text-[#0D47A1] text-left">
                  <th className="py-2.5 px-3 font-bold">Hạng</th>
                  <th className="py-2.5 px-3 font-bold">Họ và tên</th>
                  <th className="py-2.5 px-3 font-bold">Tổ</th>
                  <th className="py-2.5 px-3 font-bold">Chức vụ</th>
                  <th className="py-2.5 px-3 font-bold text-right">Điểm kỳ</th>
                  <th className="py-2.5 px-3 font-bold text-right">Tổng điểm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D7EAFE]">
                {studentRankings.slice(0, 6).map((st) => (
                  <tr key={st.studentId} className="hover:bg-[#F4FAFF]">
                    <td className="py-2.5 px-3 font-bold text-[#FF8A00] tabular-nums">
                      #{st.rank}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#17365D]">
                      {st.fullName}
                    </td>
                    <td className="py-2.5 px-3 text-[#64748B]">{st.groupName}</td>
                    <td className="py-2.5 px-3 text-[#64748B]">{st.position}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#16A34A] tabular-nums">
                      {st.netPeriodPoints >= 0 ? `+${st.netPeriodPoints}` : st.netPeriodPoints}đ
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#0D47A1] tabular-nums">
                      {st.finalScore}đ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bảng tình hình chuyên cần & Giao dịch tài chính gần đây */}
        <div className="crystal-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-[#0D47A1]">
              Giao dịch tài chính lớp gần đây
            </h3>
            <button
              type="button"
              onClick={() => setActiveModule('finance')}
              className="text-xs font-bold text-[#0D47A1] hover:underline"
            >
              Mở sổ quỹ lớp
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#E3F2FD] text-[#0D47A1] text-left">
                  <th className="py-2 px-3 font-bold">Mã GD</th>
                  <th className="py-2 px-3 font-bold">Ngày</th>
                  <th className="py-2 px-3 font-bold">Nội dung</th>
                  <th className="py-2 px-3 font-bold text-right">Số tiền</th>
                  <th className="py-2 px-3 font-bold">Đối chiếu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D7EAFE]">
                {state.financeTransactions
                  .filter((t) => !t.isCancelled)
                  .slice(0, 5)
                  .map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#F4FAFF]">
                      <td className="py-2 px-3 font-bold text-[#0D47A1] tabular-nums">
                        {tx.transactionCode}
                      </td>
                      <td className="py-2 px-3 text-xs text-[#64748B] tabular-nums">
                        {formatVietnameseDate(tx.date)}
                      </td>
                      <td className="py-2 px-3 text-[#17365D] max-w-[200px] truncate">
                        {tx.content}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-bold tabular-nums ${
                          tx.type === 'THU' ? 'text-[#16A34A]' : 'text-[#DC2626]'
                        }`}
                      >
                        {tx.type === 'THU' ? '+' : '-'}
                        {formatCurrencyVND(tx.amount)}
                      </td>
                      <td className="py-2 px-3 text-xs">
                        <span
                          className={
                            tx.reconcileStatus === 'Cần đối chiếu'
                              ? 'text-[#FF8A00] font-bold'
                              : 'text-[#16A34A] font-semibold'
                          }
                        >
                          {tx.reconcileStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Danh sách công việc tuần này & Tình hình chuyên cần */}
        <div className="crystal-card rounded-2xl p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-[#0D47A1]">
                Danh sách công việc chủ nhiệm tuần này
              </h3>
              <button
                type="button"
                onClick={() => setActiveModule('planning')}
                className="text-xs font-bold text-[#0D47A1] hover:underline"
              >
                Quản lý kế hoạch
              </button>
            </div>
            <div className="space-y-2.5">
              {state.tasks.slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-xl bg-[#F4FAFF] border border-[#D7EAFE] flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-bold text-[#17365D]">
                      {task.title}
                    </div>
                    <div className="text-xs text-[#64748B] mt-0.5">
                      Phụ trách: <strong>{task.assigneeName}</strong> ({task.assigneeRole}) · Hạn:{' '}
                      <span className="tabular-nums">{formatVietnameseDate(task.dueDate)}</span>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold shrink-0 ${
                      task.status === 'Hoàn thành'
                        ? 'text-[#16A34A]'
                        : task.status === 'Đang làm'
                        ? 'text-[#0D47A1]'
                        : 'text-[#FF8A00]'
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tóm tắt chuyên cần theo trạng thái */}
          <div className="pt-3 border-t border-[#D7EAFE]">
            <div className="text-xs font-bold text-[#0D47A1] mb-2">
              Bảng tổng hợp nhanh chuyên cần hôm nay ({formatVietnameseDate(today)}):
            </div>
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-[#E3F2FD]/60 border border-[#D7EAFE]">
                <div className="font-bold text-[#16A34A] text-base tabular-nums">
                  {todayAttendance.onTimeCount}
                </div>
                <div className="text-[#17365D]">Đúng giờ</div>
              </div>
              <div className="p-2 rounded-lg bg-[#E3F2FD]/60 border border-[#D7EAFE]">
                <div className="font-bold text-[#FF8A00] text-base tabular-nums">
                  {todayAttendance.lateCount}
                </div>
                <div className="text-[#17365D]">Đi muộn</div>
              </div>
              <div className="p-2 rounded-lg bg-[#E3F2FD]/60 border border-[#D7EAFE]">
                <div className="font-bold text-[#0D47A1] text-base tabular-nums">
                  {todayAttendance.excusedAbsentCount}
                </div>
                <div className="text-[#17365D]">Có phép</div>
              </div>
              <div className="p-2 rounded-lg bg-[#E3F2FD]/60 border border-[#D7EAFE]">
                <div className="font-bold text-[#DC2626] text-base tabular-nums">
                  {todayAttendance.unexcusedAbsentCount}
                </div>
                <div className="text-[#17365D]">Không phép</div>
              </div>
              <div className="p-2 rounded-lg bg-[#E3F2FD]/60 border border-[#D7EAFE]">
                <div className="font-bold text-[#64748B] text-base tabular-nums">
                  {todayAttendance.unrecordedCount}
                </div>
                <div className="text-[#17365D]">Chưa điểm danh</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
