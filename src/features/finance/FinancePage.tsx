import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Download,
  Edit3,
  FileText,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import {
  FinanceTransaction,
  ReconcileStatus,
} from '../../types/index.ts';
import {
  calculateFinanceMetrics,
  formatCurrencyVND,
  formatVietnameseDate,
  isDateInRange,
  toISODate,
} from '../../utils/calculations.ts';
import { exportToExcelFile } from '../../utils/exportUtils.ts';

export const FinancePage: React.FC = () => {
  const {
    state,
    sessionRole,
    setFinanceOpeningBalance,
    addFinanceTransaction,
    updateFinanceTransaction,
    cancelFinanceTransaction,
  } = useWorkspace();

  const today = toISODate(new Date());

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'THU' | 'CHI'>('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Add/Edit Transaction Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<FinanceTransaction | null>(null);
  const [txCode, setTxCode] = useState('');
  const [txDate, setTxDate] = useState(today);
  const [txType, setTxType] = useState<'THU' | 'CHI'>('THU');
  const [txCategoryId, setTxCategoryId] = useState(
    state.financeCategories[0]?.id || 'fcat-1'
  );
  const [txContent, setTxContent] = useState('');
  const [txAmount, setTxAmount] = useState<number>(200000);
  const [txPayerReceiver, setTxPayerReceiver] = useState('');
  const [txVoucher, setTxVoucher] = useState('');
  const [txReconcile, setTxReconcile] =
    useState<ReconcileStatus>('Đã đối chiếu');
  const [txNotes, setTxNotes] = useState('');
  const [editReason, setEditReason] = useState('');

  // Cancel Modal
  const [cancellingTx, setCancellingTx] = useState<FinanceTransaction | null>(
    null
  );
  const [cancelReason, setCancelReason] = useState('');

  // Opening balance inline edit
  const [openingInput, setOpeningInput] = useState<number>(
    state.financeOpeningBalance
  );

  const metrics = useMemo(
    () =>
      calculateFinanceMetrics(
        state.financeOpeningBalance,
        state.financeTransactions,
        {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          categoryId: filterCategory,
        }
      ),
    [
      state.financeOpeningBalance,
      state.financeTransactions,
      startDate,
      endDate,
      filterCategory,
    ]
  );

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return state.financeTransactions.filter((tx) => {
      if (filterType !== 'ALL' && tx.type !== filterType) return false;
      if (filterCategory !== 'ALL' && tx.categoryId !== filterCategory) {
        return false;
      }
      if (!isDateInRange(tx.date, startDate || undefined, endDate || undefined)) {
        return false;
      }
      if (
        q &&
        !tx.content.toLowerCase().includes(q) &&
        !tx.transactionCode.toLowerCase().includes(q) &&
        !tx.payerOrReceiver.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [
    state.financeTransactions,
    filterType,
    filterCategory,
    startDate,
    endDate,
    searchQuery,
  ]);

  const openAddTxModal = (defaultType: 'THU' | 'CHI') => {
    setEditingTx(null);
    const nextCount = state.financeTransactions.length + 1;
    setTxCode(
      `${defaultType === 'THU' ? 'PT' : 'PC'}-2026-${String(nextCount).padStart(
        3,
        '0'
      )}`
    );
    setTxDate(today);
    setTxType(defaultType);
    const matchingCat =
      state.financeCategories.find((c) => c.type === defaultType) ||
      state.financeCategories[0];
    setTxCategoryId(matchingCat?.id || 'fcat-1');
    setTxContent('');
    setTxAmount(200000);
    setTxPayerReceiver('');
    setTxVoucher('');
    setTxReconcile('Đã đối chiếu');
    setTxNotes('');
    setEditReason('');
    setModalOpen(true);
  };

  const openEditTxModal = (tx: FinanceTransaction) => {
    setEditingTx(tx);
    setTxCode(tx.transactionCode);
    setTxDate(tx.date);
    setTxType(tx.type);
    setTxCategoryId(tx.categoryId);
    setTxContent(tx.content);
    setTxAmount(tx.amount);
    setTxPayerReceiver(tx.payerOrReceiver);
    setTxVoucher(tx.voucherRef);
    setTxReconcile(tx.reconcileStatus);
    setTxNotes(tx.notes);
    setEditReason('');
    setModalOpen(true);
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txContent.trim() || txAmount <= 0) return;
    const cat = state.financeCategories.find((c) => c.id === txCategoryId);

    if (editingTx) {
      if (!editReason.trim()) return;
      updateFinanceTransaction(
        editingTx.id,
        {
          transactionCode: txCode.trim(),
          date: txDate,
          type: txType,
          categoryId: txCategoryId,
          categoryName: cat?.name || 'Danh mục khác',
          content: txContent.trim(),
          amount: Number(txAmount),
          payerOrReceiver: txPayerReceiver.trim(),
          voucherRef: txVoucher.trim(),
          reconcileStatus: txReconcile,
          notes: txNotes.trim(),
        },
        editReason.trim()
      );
    } else {
      addFinanceTransaction({
        classId: state.currentClassId,
        transactionCode: txCode.trim(),
        date: txDate,
        type: txType,
        categoryId: txCategoryId,
        categoryName: cat?.name || 'Danh mục khác',
        content: txContent.trim(),
        amount: Number(txAmount),
        payerOrReceiver: txPayerReceiver.trim() || 'Tập thể lớp 10A3',
        recordedBy: sessionRole.actorName,
        voucherRef: txVoucher.trim(),
        notes: txNotes.trim(),
        reconcileStatus: txReconcile,
      });
    }
    setModalOpen(false);
  };

  const handleExportFinanceExcel = () => {
    const rows = filteredTransactions.map((tx, idx) => ({
      STT: idx + 1,
      'Mã giao dịch': tx.transactionCode,
      'Ngày': formatVietnameseDate(tx.date),
      'Loại': tx.type === 'THU' ? 'Thu quỹ' : 'Chi quỹ',
      'Danh mục': tx.categoryName,
      'Nội dung': tx.content,
      'Số tiền (VNĐ)': tx.type === 'THU' ? tx.amount : -tx.amount,
      'Người nộp / Người nhận': tx.payerOrReceiver,
      'Người ghi nhận': tx.recordedBy,
      'Tham chiếu chứng từ': tx.voucherRef,
      'Trạng thái đối chiếu': tx.isCancelled
        ? `Đã hủy (${tx.cancelReason})`
        : tx.reconcileStatus,
      'Ghi chú': tx.notes,
    }));
    exportToExcelFile(
      rows,
      'SoQuyLop10A3',
      `So_Quy_Lop_10A3_THPT_Thanh_Hoa.xlsx`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="crystal-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <div className="text-xs font-bold text-[#0D47A1] uppercase tracking-wider">
            PHÂN HỆ 5 · QUẢN LÝ TÀI CHÍNH & SỔ QUỸ LỚP 10A3
          </div>
          <h2 className="text-2xl font-bold text-[#17365D] mt-1">
            Sổ Quỹ Lớp Minh Bạch, Đối chiếu Chứng từ & Nhật ký Kiểm toán
          </h2>
          <p className="text-sm text-[#64748B] mt-0.5">
            Công thức chuẩn: <strong>Số dư cuối kỳ = Số dư đầu kỳ + Tổng thu - Tổng chi</strong>. Không tự ý xóa âm thầm giao dịch đã ghi nhận; mọi điều chỉnh/hủy đều lưu lịch sử kiểm toán.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openAddTxModal('THU')}
            className="px-3.5 py-2 rounded-lg bg-[#16A34A] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            <span>Lập Phiếu Thu</span>
          </button>
          <button
            type="button"
            onClick={() => openAddTxModal('CHI')}
            className="px-3.5 py-2 rounded-lg bg-[#0D47A1] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 hover:bg-[#17365D]"
          >
            <Plus className="w-4 h-4" />
            <span>Lập Phiếu Chi</span>
          </button>
          <button
            type="button"
            onClick={handleExportFinanceExcel}
            className="px-3 py-2 rounded-lg border border-[#0D47A1] text-[#0D47A1] text-xs font-bold flex items-center gap-1 hover:bg-[#E3F2FD]"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Excel Sổ quỹ</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-2 rounded-lg bg-[#FF8A00] text-white text-xs font-bold flex items-center gap-1 hover:opacity-90"
          >
            <Printer className="w-4 h-4" />
            <span>In Sổ quỹ</span>
          </button>
        </div>
      </div>

      {/* 6 FINANCIAL INDICATORS (Section 8.1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
        <div className="crystal-card rounded-xl p-4">
          <div className="text-xs font-bold text-[#64748B]">1. Số dư đầu kỳ</div>
          <div className="text-lg font-bold text-[#0D47A1] mt-1 tabular-nums">
            {formatCurrencyVND(metrics.openingBalance)}
          </div>
          <div className="mt-2 flex items-center gap-1 no-print">
            <input
              type="number"
              value={openingInput}
              onChange={(e) => setOpeningInput(Number(e.target.value))}
              className="w-24 px-2 py-0.5 text-xs border border-[#D7EAFE] rounded"
            />
            <button
              type="button"
              onClick={() => setFinanceOpeningBalance(openingInput)}
              className="px-2 py-0.5 text-[11px] bg-[#E3F2FD] text-[#0D47A1] font-bold rounded"
            >
              Lưu
            </button>
          </div>
        </div>

        <div className="crystal-card rounded-xl p-4">
          <div className="text-xs font-bold text-[#64748B]">2. Tổng thu</div>
          <div className="text-lg font-bold text-[#16A34A] mt-1 tabular-nums">
            +{formatCurrencyVND(metrics.totalIncome)}
          </div>
          <div className="text-[11px] text-[#64748B] mt-1">
            Khoản đóng góp & tài trợ hợp lệ
          </div>
        </div>

        <div className="crystal-card rounded-xl p-4">
          <div className="text-xs font-bold text-[#64748B]">3. Tổng chi</div>
          <div className="text-lg font-bold text-[#DC2626] mt-1 tabular-nums">
            -{formatCurrencyVND(metrics.totalExpense)}
          </div>
          <div className="text-[11px] text-[#64748B] mt-1">
            Chi hoạt động học tập & khen thưởng
          </div>
        </div>

        <div className="crystal-card rounded-xl p-4 bg-[#E3F2FD]/40">
          <div className="text-xs font-bold text-[#0D47A1]">4. Số dư hiện tại</div>
          <div className="text-xl font-bold text-[#0D47A1] mt-1 tabular-nums">
            {formatCurrencyVND(metrics.currentBalance)}
          </div>
          <div className="text-[11px] text-[#17365D] mt-1">
            = Đầu kỳ + Tổng thu - Tổng chi
          </div>
        </div>

        <div className="crystal-card rounded-xl p-4">
          <div className="text-xs font-bold text-[#64748B]">
            5. Số giao dịch hợp lệ
          </div>
          <div className="text-lg font-bold text-[#17365D] mt-1 tabular-nums">
            {metrics.transactionCount} giao dịch
          </div>
          <div className="text-[11px] text-[#64748B] mt-1">
            Có mã chứng từ tham chiếu
          </div>
        </div>

        <div className="crystal-card rounded-xl p-4">
          <div className="text-xs font-bold text-[#FF8A00]">
            6. Khoản cần đối chiếu
          </div>
          <div className="text-lg font-bold text-[#FF8A00] mt-1 tabular-nums">
            {metrics.pendingReconcileCount} khoản ({formatCurrencyVND(metrics.pendingReconcileAmount)})
          </div>
          <div className="text-[11px] text-[#64748B] mt-1">
            Chờ kiểm tra hóa đơn chứng từ
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="crystal-card rounded-2xl p-4 no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã GD, nội dung, người nộp/nhận..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#D7EAFE] text-sm"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) =>
            setFilterType(e.target.value as 'ALL' | 'THU' | 'CHI')
          }
          className="px-3 py-2 rounded-lg border border-[#D7EAFE] text-sm"
        >
          <option value="ALL">Tất cả Thu & Chi</option>
          <option value="THU">Chỉ khoản Thu (+)</option>
          <option value="CHI">Chỉ khoản Chi (-)</option>
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#D7EAFE] text-sm"
        >
          <option value="ALL">Tất cả danh mục</option>
          {state.financeCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-1/2 px-2 py-2 rounded-lg border border-[#D7EAFE] text-xs"
            title="Từ ngày"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-1/2 px-2 py-2 rounded-lg border border-[#D7EAFE] text-xs"
            title="Đến ngày"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="crystal-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#E3F2FD] text-[#0D47A1] text-left">
                <th className="py-3 px-3 font-bold">Mã GD</th>
                <th className="py-3 px-3 font-bold">Ngày</th>
                <th className="py-3 px-3 font-bold">Loại</th>
                <th className="py-3 px-3 font-bold">Danh mục & Nội dung</th>
                <th className="py-3 px-3 font-bold text-right">Số tiền</th>
                <th className="py-3 px-3 font-bold">Người nộp / nhận</th>
                <th className="py-3 px-3 font-bold">Chứng từ</th>
                <th className="py-3 px-3 font-bold">Trạng thái đối chiếu</th>
                <th className="py-3 px-3 font-bold text-center no-print">
                  Điều chỉnh / Hủy
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D7EAFE]">
              {filteredTransactions.map((tx) => (
                <tr
                  key={tx.id}
                  className={
                    tx.isCancelled
                      ? 'bg-slate-100 text-[#64748B] line-through'
                      : 'hover:bg-[#F4FAFF]'
                  }
                >
                  <td className="py-2.5 px-3 font-bold text-[#0D47A1] tabular-nums">
                    {tx.transactionCode}
                  </td>
                  <td className="py-2.5 px-3 text-xs tabular-nums">
                    {formatVietnameseDate(tx.date)}
                  </td>
                  <td className="py-2.5 px-3 text-xs font-bold">
                    {tx.type === 'THU' ? (
                      <span className="text-[#16A34A]">THU</span>
                    ) : (
                      <span className="text-[#DC2626]">CHI</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-[#17365D]">{tx.content}</div>
                    <div className="text-xs text-[#64748B]">
                      Danh mục: {tx.categoryName} · Ghi nhận: {tx.recordedBy}
                    </div>
                    {tx.notes && (
                      <div className="text-xs text-[#64748B] italic">
                        Ghi chú: {tx.notes}
                      </div>
                    )}
                    {tx.editHistory && tx.editHistory.length > 0 && (
                      <div className="text-[11px] text-[#0D47A1] mt-0.5">
                        Lịch sử kiểm toán ({tx.editHistory.length} lần):{' '}
                        {tx.editHistory[0].reason} ({tx.editHistory[0].editedAt})
                      </div>
                    )}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-bold tabular-nums ${
                      tx.type === 'THU' ? 'text-[#16A34A]' : 'text-[#DC2626]'
                    }`}
                  >
                    {tx.type === 'THU' ? '+' : '-'}
                    {formatCurrencyVND(tx.amount)}
                  </td>
                  <td className="py-2.5 px-3 text-xs text-[#17365D]">
                    {tx.payerOrReceiver}
                  </td>
                  <td className="py-2.5 px-3 text-xs text-[#64748B] tabular-nums">
                    {tx.voucherRef || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-xs font-bold">
                    {tx.isCancelled ? (
                      <span className="text-[#DC2626]">
                        Đã hủy ({tx.cancelReason})
                      </span>
                    ) : tx.reconcileStatus === 'Cần đối chiếu' ? (
                      <span className="text-[#FF8A00]">Cần đối chiếu</span>
                    ) : (
                      <span className="text-[#16A34A]">
                        {tx.reconcileStatus}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center no-print">
                    {!tx.isCancelled && (
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditTxModal(tx)}
                          className="px-2 py-1 rounded border border-[#D7EAFE] text-xs font-bold text-[#0D47A1] hover:bg-[#E3F2FD]"
                        >
                          Điều chỉnh
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCancellingTx(tx);
                            setCancelReason('');
                          }}
                          className="px-2 py-1 rounded bg-red-50 border border-red-200 text-xs font-bold text-[#DC2626] hover:bg-red-100"
                        >
                          Hủy GD
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL ADD / EDIT TRANSACTION */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl border border-[#D7EAFE] max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#D7EAFE] pb-3">
              <h3 className="text-lg font-bold text-[#0D47A1]">
                {editingTx
                  ? `Điều chỉnh Giao dịch ${editingTx.transactionCode}`
                  : txType === 'THU'
                  ? 'Lập Phiếu Thu Quỹ Lớp 10A3'
                  : 'Lập Phiếu Chi Quỹ Lớp 10A3'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-[#64748B] hover:text-[#17365D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Mã giao dịch *
                  </label>
                  <input
                    type="text"
                    value={txCode}
                    onChange={(e) => setTxCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Ngày giao dịch *
                  </label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Loại giao dịch
                  </label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as 'THU' | 'CHI')}
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  >
                    <option value="THU">Khoản Thu (+)</option>
                    <option value="CHI">Khoản Chi (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Số tiền (VNĐ) *
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={txAmount}
                    onChange={(e) => setTxAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE] font-bold text-[#0D47A1]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#17365D] mb-1">
                  Danh mục thu / chi
                </label>
                <select
                  value={txCategoryId}
                  onChange={(e) => setTxCategoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                >
                  {state.financeCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.type}] {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#17365D] mb-1">
                  Nội dung diễn giải chi tiết *
                </label>
                <input
                  type="text"
                  value={txContent}
                  onChange={(e) => setTxContent(e.target.value)}
                  placeholder="VD: Mua phần thưởng thi đua tuần cho Tổ 1..."
                  className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Người nộp / Người nhận *
                  </label>
                  <input
                    type="text"
                    value={txPayerReceiver}
                    onChange={(e) => setTxPayerReceiver(e.target.value)}
                    placeholder="VD: Ngô Minh Châu (Thủ quỹ)"
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Tham chiếu chứng từ / Hóa đơn
                  </label>
                  <input
                    type="text"
                    value={txVoucher}
                    onChange={(e) => setTxVoucher(e.target.value)}
                    placeholder="VD: HD-0012 / Biên lai 01"
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Trạng thái đối chiếu
                  </label>
                  <select
                    value={txReconcile}
                    onChange={(e) =>
                      setTxReconcile(e.target.value as ReconcileStatus)
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  >
                    <option value="Đã đối chiếu">Đã đối chiếu</option>
                    <option value="Cần đối chiếu">Cần đối chiếu</option>
                    <option value="Đã điều chỉnh">Đã điều chỉnh</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#17365D] mb-1">
                    Ghi chú
                  </label>
                  <input
                    type="text"
                    value={txNotes}
                    onChange={(e) => setTxNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE]"
                  />
                </div>
              </div>

              {editingTx && (
                <div>
                  <label className="block font-bold text-[#DC2626] mb-1">
                    Lý do điều chỉnh giao dịch * (Bắt buộc lưu kiểm toán)
                  </label>
                  <input
                    type="text"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="VD: Cập nhật bổ sung số hóa đơn bán lẻ..."
                    className="w-full px-3 py-2 rounded-lg border border-red-300"
                    required
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#D7EAFE]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#D7EAFE] font-bold"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#0D47A1] text-white font-bold"
                >
                  Lưu giao dịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CANCEL TRANSACTION WITH AUDIT REASON */}
      {cancellingTx && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl border border-[#D7EAFE] max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#DC2626]">
              Hủy Giao dịch Có Lưu Nhật ký Kiểm toán
            </h3>
            <p className="text-xs text-[#17365D]">
              Giao dịch <strong>{cancellingTx.transactionCode}</strong> (
              {formatCurrencyVND(cancellingTx.amount)}) sẽ được đánh dấu hủy (không bị xóa âm thầm khỏi sổ quỹ) và tự động trừ khỏi số dư.
            </p>
            <div>
              <label className="block text-xs font-bold text-[#17365D] mb-1">
                Nhập lý do hủy giao dịch *
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="VD: Nhập trùng phiếu chi..."
                className="w-full px-3 py-2 rounded-lg border border-[#D7EAFE] text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancellingTx(null)}
                className="px-4 py-2 rounded-lg border border-[#D7EAFE] text-xs font-bold"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!cancelReason.trim()) return;
                  cancelFinanceTransaction(
                    cancellingTx.id,
                    cancelReason.trim()
                  );
                  setCancellingTx(null);
                }}
                className="px-4 py-2 rounded-lg bg-[#DC2626] text-white text-xs font-bold"
              >
                Xác nhận hủy giao dịch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
