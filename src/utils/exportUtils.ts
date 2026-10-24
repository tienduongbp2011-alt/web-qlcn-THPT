import * as XLSX from 'xlsx';
import {
  CompetitionCriterion,
  Student,
  StudentGroup,
} from '../types/index.ts';

/**
 * Xuất mảng đối tượng ra file Excel (.xlsx) thực tế
 */
export function exportToExcelFile(
  rows: Record<string, string | number>[],
  sheetName: string,
  fileName: string
) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
}

/**
 * Tạo file Excel mẫu danh sách học sinh để giáo viên tải về và nhập liệu
 */
export function downloadStudentExcelTemplate() {
  const sampleRows = [
    {
      'Mã học sinh': 'HS10A3-25',
      'Họ và tên': 'Nguyễn Minh Khôi (Mẫu)',
      'Ngày sinh': '2011-05-14',
      'Giới tính': 'Nam',
      'Tổ': 'Tổ 1',
      'Chức vụ': 'Thành viên',
      'SĐT Phụ huynh': '0912000111',
      'Điểm ban đầu': 100,
      'Ghi chú': 'Học sinh nhập từ Excel',
    },
    {
      'Mã học sinh': 'HS10A3-26',
      'Họ và tên': 'Trần Ngọc Ánh (Mẫu)',
      'Ngày sinh': '2011-08-22',
      'Giới tính': 'Nữ',
      'Tổ': 'Tổ 2',
      'Chức vụ': 'Tổ phó',
      'SĐT Phụ huynh': '0912000222',
      'Điểm ban đầu': 100,
      'Ghi chú': 'Tích cực văn nghệ',
    },
  ];
  exportToExcelFile(
    sampleRows,
    'DanhSachHocSinh',
    'Mau_Nhap_Hoc_Sinh_10A3_THPT_Thanh_Hoa.xlsx'
  );
}

/**
 * Đọc file Excel danh sách học sinh và chuyển thành danh sách Student
 */
export async function parseStudentsFromExcelFile(
  file: File,
  classId: string,
  groups: StudentGroup[]
): Promise<Student[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, {
    defval: '',
  });

  const groupMapByName = new Map(
    groups.map((g) => [g.name.trim().toLowerCase(), g.id])
  );

  const importedStudents: Student[] = [];

  rawRows.forEach((row, index) => {
    const fullName = String(
      row['Họ và tên'] || row['Ho va ten'] || row['Họ tên'] || row['FullName'] || ''
    ).trim();
    if (!fullName) return;

    const studentCode =
      String(
        row['Mã học sinh'] || row['Ma hoc sinh'] || row['Mã HS'] || ''
      ).trim() || `HS10A3-EX${String(index + 1).padStart(2, '0')}`;

    const rawGroup = String(row['Tổ'] || row['To'] || 'Tổ 1').trim();
    const matchedGroupId =
      groupMapByName.get(rawGroup.toLowerCase()) ||
      groups[index % Math.max(groups.length, 1)]?.id ||
      'group-1';

    const rawGender = String(row['Giới tính'] || row['Gioi tinh'] || 'Nam').trim();
    const gender: 'Nam' | 'Nữ' =
      rawGender.toLowerCase() === 'nữ' || rawGender.toLowerCase() === 'nu'
        ? 'Nữ'
        : 'Nam';

    const initialScoreNum = Number(row['Điểm ban đầu'] || row['Diem ban dau'] || 100);

    importedStudents.push({
      id: `st-excel-${Date.now()}-${index}`,
      classId,
      studentCode,
      fullName,
      dob: String(row['Ngày sinh'] || row['Ngay sinh'] || '2011-01-01').trim(),
      gender,
      groupId: matchedGroupId,
      position: String(row['Chức vụ'] || row['Chuc vu'] || 'Thành viên').trim(),
      parentPhone: String(
        row['SĐT Phụ huynh'] || row['SDT Phu huynh'] || row['SĐT'] || ''
      ).trim(),
      initialScore: Number.isFinite(initialScoreNum) ? initialScoreNum : 100,
      status: 'Đang học',
      notes: String(row['Ghi chú'] || row['Ghi chu'] || '').trim(),
      isDemo: false,
    });
  });

  return importedStudents;
}

/**
 * Tạo file Excel mẫu bộ tiêu chí thi đua
 */
export function downloadCriteriaExcelTemplate() {
  const sampleRows = [
    {
      'Mã tiêu chí': 'TC01',
      'Tên tiêu chí': 'Phát biểu xây dựng bài tích cực',
      'Nhóm tiêu chí': 'Học tập',
      'Loại điểm': 'Điểm cộng',
      'Số điểm': 2,
      'Mô tả': 'Giơ tay phát biểu đúng và xây dựng bài học trên lớp',
    },
    {
      'Mã tiêu chí': 'TC02',
      'Tên tiêu chí': 'Đi học muộn quá 5 phút',
      'Nhóm tiêu chí': 'Nề nếp',
      'Loại điểm': 'Điểm trừ',
      'Số điểm': -2,
      'Mô tả': 'Đến lớp sau trống báo vào tiết',
    },
  ];
  exportToExcelFile(
    sampleRows,
    'BoTieuChiThiDua',
    'Mau_Bo_Tieu_Chi_Thi_Dua_THPT_Thanh_Hoa.xlsx'
  );
}

/**
 * Đọc file Excel bộ tiêu chí thi đua
 * Yêu cầu 6.2: "Thêm tiêu chí từ file excel và xoá hết dữ liệu cũ khi import tiêu chí mới"
 */
export async function parseCriteriaFromExcelFile(
  file: File
): Promise<CompetitionCriterion[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, {
    defval: '',
  });

  const criteriaList: CompetitionCriterion[] = [];

  rawRows.forEach((row, index) => {
    const name = String(
      row['Tên tiêu chí'] || row['Ten tieu chi'] || row['Tiêu chí'] || ''
    ).trim();
    if (!name) return;

    const rawPoints = Number(row['Số điểm'] || row['So diem'] || row['Điểm'] || 0);
    const rawType = String(row['Loại điểm'] || row['Loai diem'] || '').toLowerCase();
    const isPenalty = rawType.includes('trừ') || rawType.includes('tru') || rawPoints < 0;
    const absPoints = Math.abs(rawPoints) || 2;
    const points = isPenalty ? -absPoints : absPoints;

    const rawCat = String(row['Nhóm tiêu chí'] || row['Nhom tieu chi'] || 'Học tập').trim();
    const validCategories = ['Học tập', 'Nề nếp', 'Phong trào', 'Vệ sinh & Hoạt động'] as const;
    const category = (validCategories.find((c) => c === rawCat) ||
      'Học tập') as CompetitionCriterion['category'];

    criteriaList.push({
      id: `crit-excel-${Date.now()}-${index}`,
      code:
        String(row['Mã tiêu chí'] || row['Ma tieu chi'] || '').trim() ||
        `TC${String(index + 1).padStart(2, '0')}`,
      name,
      category,
      type: isPenalty ? 'TRU' : 'CONG',
      points,
      description: String(row['Mô tả'] || row['Mo ta'] || name).trim(),
      isActive: true,
    });
  });

  return criteriaList;
}
