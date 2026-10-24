import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  List,
  Plus,
  Printer,
  Trash2,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import { ClassPlan, TaskItem } from '../../types/index.ts';
import {
  formatVietnameseDate,
  toISODate,
} from '../../utils/calculations.ts';

export const PlanningPage: React.FC = () => {
  const {
    state,
    addClassPlan,
    updateClassPlan,
    deleteClassPlan,
    addTaskItem,
    updateTaskItem,
    deleteTaskItem,
  } = useWorkspace();

  const today = toISODate(new Date());
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');
  const [filterPlanType, setFilterPlanType] = useState('ALL');

  // Plan Form States
  const [planTitle, setPlanTitle] = useState('');
  const [planType, setPlanType] =
    useState<ClassPlan['planType']>('Kế hoạch tuần');
  const [planStart, setPlanStart] = useState(today);
  const [planEnd, setPlanEnd] = useState(today);
  const [planObjectives, setPlanObjectives] = useState('');
  const [planActivities, setPlanActivities] = useState('');
  const [planNotes, setPlanNotes] = useState('');

  // Task Form States
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssigneeName, setTaskAssigneeName] = useState(
    'Nguyễn Ngọc Bảo Trâm'
  );
  const [taskAssigneeRole, setTaskAssigneeRole] = useState('Lớp trưởng');
  const [taskDueDate, setTaskDueDate] = useState(today);
  const [taskPriority, setTaskPriority] =
    useState<TaskItem['priority']>('Cao');
  const [taskNotes, setTaskNotes] = useState('');

  const filteredPlans = useMemo(() => {
    return state.plans.filter((p) =>
      filterPlanType === 'ALL' ? true : p.planType === filterPlanType
    );
  }, [state.plans, filterPlanType]);

  const classOfficers = useMemo(() => {
    return state.students.filter(
      (s) => s.status === 'Đang học' && s.position !== 'Thành viên'
    );
  }, [state.students]);

  const handleAddPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planTitle.trim()) return;
    addClassPlan({
      classId: state.currentClassId,
      title: planTitle.trim(),
      planType,
      startDate: planStart,
      endDate: planEnd,
      objectives: planObjectives.trim() || 'Đảm bảo mục tiêu nề nếp và học tập lớp 10A3',
      activities: planActivities.trim() || 'Triển khai trong giờ sinh hoạt lớp',
      status: 'Đang làm',
      notes: planNotes.trim(),
    });
    setPlanTitle('');
    setPlanObjectives('');
    setPlanActivities('');
    setPlanNotes('');
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    addTaskItem({
      classId: state.currentClassId,
      title: taskTitle.trim(),
      assigneeName: taskAssigneeName,
      assigneeRole: taskAssigneeRole,
      dueDate: taskDueDate,
      priority: taskPriority,
      status: 'Chưa làm',
      resultNotes: taskNotes.trim(),
    });
    setTaskTitle('');
    setTaskNotes('');
  };

  // Calendar days for current month
  const calendarDays = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days: {
      dayNum: number;
      dateStr: string;
      plans: ClassPlan[];
      tasks: TaskItem[];
    }[] = [];

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
        d
      ).padStart(2, '0')}`;
      const dayPlans = state.plans.filter(
        (p) => p.startDate <= dateStr && p.endDate >= dateStr
      );
      const dayTasks = state.tasks.filter((t) => t.dueDate === dateStr);
      days.push({
        dayNum: d,
        dateStr,
        plans: dayPlans,
        tasks: dayTasks,
      });
    }
    return days;
  }, [state.plans, state.tasks]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="crystal-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <div className="text-xs font-bold text-[#0D47A1] uppercase tracking-wider">
            PHÂN HỆ 7 · KẾ HOẠCH CHỦ NHIỆM, LỊCH SINH HOẠT & GIAO NHIỆM VỤ
          </div>
          <h2 className="text-2xl font-bold text-[#17365D] mt-1">
            Kế hoạch Công tác Chủ nhiệm Lớp 10A3 & Giao việc Cán bộ Lớp
          </h2>
          <p className="text-sm text-[#64748B] mt-0.5">
            Quản lý kế hoạch tuần, tháng, học kỳ, lịch sinh hoạt lớp, lịch kiểm tra, nhật ký chủ nhiệm và theo dõi tiến độ cán bộ lớp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('LIST')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
              viewMode === 'LIST'
                ? 'bg-[#0D47A1] text-white'
                : 'bg-white border border-[#D7EAFE] text-[#17365D]'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Xem theo Danh sách</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('CALENDAR')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
              viewMode === 'CALENDAR'
                ? 'bg-[#0D47A1] text-white'
                : 'bg-white border border-[#D7EAFE] text-[#17365D]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Xem theo Lịch tháng</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg bg-[#FF8A00] text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90"
          >
            <Printer className="w-4 h-4" />
            <span>In kế hoạch</span>
          </button>
        </div>
      </div>

      {viewMode === 'LIST' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 cols: Kế hoạch tuần / tháng / học kỳ / nhật ký chủ nhiệm */}
          <div className="lg:col-span-7 space-y-5">
            <form
              onSubmit={handleAddPlan}
              className="crystal-card rounded-2xl p-5 space-y-3 no-print text-xs"
            >
              <h3 className="text-base font-bold text-[#0D47A1] border-b border-[#D7EAFE] pb-2">
                Tạo Kế hoạch / Lịch sinh hoạt / Nhật ký chủ nhiệm mới
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#17365D] mb-1">
                    Tiêu đề kế hoạch / nội dung *
                  </label>
                  <input
                    type="text"
                    value={planTitle}
                    onChange={(e) => setPlanTitle(e.target.value)}
                    placeholder="VD: Kế hoạch sinh hoạt lớp tuần 8..."
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Loại kế hoạch
                  </label>
                  <select
                    value={planType}
                    onChange={(e) =>
                      setPlanType(e.target.value as ClassPlan['planType'])
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  >
                    <option value="Kế hoạch tuần">Kế hoạch tuần</option>
                    <option value="Kế hoạch tháng">Kế hoạch tháng</option>
                    <option value="Kế hoạch học kỳ">Kế hoạch học kỳ</option>
                    <option value="Lịch sinh hoạt lớp">Lịch sinh hoạt lớp</option>
                    <option value="Lịch kiểm tra">Lịch kiểm tra</option>
                    <option value="Hoạt động phong trào">
                      Hoạt động phong trào
                    </option>
                    <option value="Nhật ký chủ nhiệm">Nhật ký chủ nhiệm</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={planStart}
                    onChange={(e) => setPlanStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={planEnd}
                    onChange={(e) => setPlanEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Mục tiêu trọng tâm
                  </label>
                  <textarea
                    rows={2}
                    value={planObjectives}
                    onChange={(e) => setPlanObjectives(e.target.value)}
                    placeholder="Mục tiêu cần đạt..."
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Hoạt động triển khai cụ thể
                  </label>
                  <textarea
                    rows={2}
                    value={planActivities}
                    onChange={(e) => setPlanActivities(e.target.value)}
                    placeholder="Các bước thực hiện..."
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#0D47A1] text-white font-bold flex items-center gap-1.5 hover:bg-[#17365D]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Lưu Kế hoạch</span>
                </button>
              </div>
            </form>

            {/* Danh sách kế hoạch */}
            <div className="crystal-card rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold text-[#0D47A1]">
                  Danh sách Kế hoạch & Nhật ký Chủ nhiệm ({filteredPlans.length})
                </h3>
                <select
                  value={filterPlanType}
                  onChange={(e) => setFilterPlanType(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-[#D7EAFE] text-xs no-print"
                >
                  <option value="ALL">Tất cả loại kế hoạch</option>
                  <option value="Kế hoạch tuần">Kế hoạch tuần</option>
                  <option value="Kế hoạch tháng">Kế hoạch tháng</option>
                  <option value="Kế hoạch học kỳ">Kế hoạch học kỳ</option>
                  <option value="Lịch sinh hoạt lớp">Lịch sinh hoạt lớp</option>
                  <option value="Lịch kiểm tra">Lịch kiểm tra</option>
                  <option value="Hoạt động phong trào">
                    Hoạt động phong trào
                  </option>
                  <option value="Nhật ký chủ nhiệm">Nhật ký chủ nhiệm</option>
                </select>
              </div>

              <div className="space-y-3">
                {filteredPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="p-4 rounded-xl bg-[#F4FAFF] border border-[#D7EAFE] space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-[#0D47A1]">
                          [{plan.planType}]
                        </span>{' '}
                        <span className="text-xs text-[#64748B] tabular-nums">
                          · {formatVietnameseDate(plan.startDate)} đến{' '}
                          {formatVietnameseDate(plan.endDate)}
                        </span>
                        <h4 className="text-base font-bold text-[#17365D]">
                          {plan.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 no-print">
                        <select
                          value={plan.status}
                          onChange={(e) =>
                            updateClassPlan({
                              ...plan,
                              status: e.target.value as ClassPlan['status'],
                            })
                          }
                          className="px-2.5 py-1 rounded border border-[#D7EAFE] bg-white text-xs font-bold text-[#0D47A1]"
                        >
                          <option value="Chưa làm">Chưa làm</option>
                          <option value="Đang làm">Đang làm</option>
                          <option value="Hoàn thành">Hoàn thành</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => deleteClassPlan(plan.id)}
                          className="p-1.5 text-[#DC2626] hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-[#17365D] space-y-1">
                      <div>
                        <strong>Mục tiêu:</strong> {plan.objectives}
                      </div>
                      <div className="whitespace-pre-line">
                        <strong>Nội dung hoạt động:</strong> {plan.activities}
                      </div>
                      {plan.notes && (
                        <div className="text-[#64748B]">
                          <strong>Ghi chú kết quả:</strong> {plan.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right 5 cols: Giao nhiệm vụ cho cán bộ lớp */}
          <div className="lg:col-span-5 space-y-5">
            <form
              onSubmit={handleAddTask}
              className="crystal-card rounded-2xl p-5 space-y-3 no-print text-xs"
            >
              <h3 className="text-base font-bold text-[#0D47A1] border-b border-[#D7EAFE] pb-2">
                Giao Nhiệm vụ Cho Cán bộ Lớp 10A3
              </h3>

              <div>
                <label className="block font-bold text-[#17365D] mb-1">
                  Tên nhiệm vụ cần thực hiện *
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="VD: Kiểm tra vệ sinh & khăn trải bàn trước tiết 1..."
                  className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Cán bộ lớp phụ trách
                  </label>
                  <select
                    onChange={(e) => {
                      const officer = classOfficers.find(
                        (o) => o.id === e.target.value
                      );
                      if (officer) {
                        setTaskAssigneeName(
                          officer.fullName.replace(' (Demo)', '')
                        );
                        setTaskAssigneeRole(officer.position);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  >
                    {classOfficers.map((off) => (
                      <option key={off.id} value={off.id}>
                        {off.fullName.replace(' (Demo)', '')} ({off.position})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Hạn hoàn thành
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Mức độ ưu tiên
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) =>
                      setTaskPriority(e.target.value as TaskItem['priority'])
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  >
                    <option value="Cao">Ưu tiên Cao</option>
                    <option value="Trung bình">Trung bình</option>
                    <option value="Thấp">Thấp</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Ghi chú kết quả
                  </label>
                  <input
                    type="text"
                    value={taskNotes}
                    onChange={(e) => setTaskNotes(e.target.value)}
                    placeholder="Ghi chú hướng dẫn..."
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#16A34A] text-white font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Giao nhiệm vụ</span>
                </button>
              </div>
            </form>

            {/* Danh sách nhiệm vụ */}
            <div className="crystal-card rounded-2xl p-5 space-y-3">
              <h3 className="text-base font-bold text-[#0D47A1]">
                Bảng Theo Dõi Nhiệm Vụ Cán Bộ Lớp ({state.tasks.length})
              </h3>

              <div className="space-y-2.5">
                {state.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-xl bg-[#F4FAFF] border border-[#D7EAFE] space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-sm text-[#17365D]">
                        {task.title}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteTaskItem(task.id)}
                        className="text-[#DC2626] no-print"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-[#64748B]">
                      Cán bộ: <strong className="text-[#0D47A1]">{task.assigneeName}</strong> (
                      {task.assigneeRole}) · Hạn:{' '}
                      <strong className="tabular-nums">
                        {formatVietnameseDate(task.dueDate)}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <input
                        type="text"
                        value={task.resultNotes}
                        onChange={(e) =>
                          updateTaskItem({
                            ...task,
                            resultNotes: e.target.value,
                          })
                        }
                        placeholder="Cập nhật kết quả thực hiện..."
                        className="flex-1 px-2 py-1 rounded border border-[#D7EAFE] bg-white text-xs"
                      />

                      <select
                        value={task.status}
                        onChange={(e) =>
                          updateTaskItem({
                            ...task,
                            status: e.target.value as TaskItem['status'],
                          })
                        }
                        className={`px-2 py-1 rounded border text-xs font-bold ${
                          task.status === 'Hoàn thành'
                            ? 'bg-green-50 border-green-300 text-[#16A34A]'
                            : task.status === 'Đang làm'
                            ? 'bg-blue-50 border-blue-300 text-[#0D47A1]'
                            : 'bg-amber-50 border-amber-300 text-[#FF8A00]'
                        }`}
                      >
                        <option value="Chưa làm">Chưa làm</option>
                        <option value="Đang làm">Đang làm</option>
                        <option value="Hoàn thành">Hoàn thành</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* CALENDAR MONTH VIEW */
        <div className="crystal-card rounded-2xl p-5 space-y-4">
          <h3 className="text-lg font-bold text-[#0D47A1]">
            Lịch Công Tác Chủ Nhiệm Trong Tháng Hiện Tại
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {calendarDays.map((item) => (
              <div
                key={item.dateStr}
                className={`min-h-[110px] p-2.5 rounded-xl border text-xs flex flex-col justify-between ${
                  item.dateStr === today
                    ? 'border-[#0D47A1] bg-[#E3F2FD]/60'
                    : 'border-[#D7EAFE] bg-white'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-[#0D47A1]">
                  <span className="tabular-nums">Ngày {item.dayNum}</span>
                  {item.dateStr === today && (
                    <span className="text-[10px] text-[#FF8A00]">Hôm nay</span>
                  )}
                </div>

                <div className="space-y-1 mt-1.5">
                  {item.tasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-1 rounded bg-[#FFF8F0] border border-[#FFE0B2] text-[11px] text-[#17365D] truncate"
                      title={t.title}
                    >
                      NV: {t.title}
                    </div>
                  ))}
                  {item.plans.slice(0, 2).map((p) => (
                    <div
                      key={p.id}
                      className="p-1 rounded bg-[#F4FAFF] border border-[#D7EAFE] text-[11px] text-[#0D47A1] truncate"
                      title={p.title}
                    >
                      {p.planType}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
