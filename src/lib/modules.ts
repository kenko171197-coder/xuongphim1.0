import type { ModuleCode, LengthKey, IdeaSettings, DurationKey } from '../types';

export interface ModuleInfo {
  code: ModuleCode;
  name: string;
  /** Cột "Dùng khi" trong bảng module của LÕI */
  when: string;
  group: string;
  /** Hình thức gần như cố định của module (nếu có) */
  form?: 'hoathinh' | 'nguoithat';
}

// Lấy từ bảng "CÁCH DÙNG BỘ TÀI LIỆU NÀY" trong LÕI.
export const MODULES: ModuleInfo[] = [
  { code: 'M01', name: 'Hoạt hình slapstick', when: 'Hoạt hình hài hành động, rượt đuổi, gag va chạm (kiểu Tom & Jerry)', group: 'Hoạt hình', form: 'hoathinh' },
  { code: 'M02', name: 'Hoạt hình cảm xúc / gia đình', when: 'Hoạt hình ấm áp, chữa lành, tình cảm, ít va chạm', group: 'Hoạt hình', form: 'hoathinh' },
  { code: 'M03', name: 'Drama người thật', when: 'Phim người thật có cốt truyện, thoại, cảm xúc', group: 'Người thật', form: 'nguoithat' },
  { code: 'M14', name: 'Hài người thật / tiểu phẩm', when: 'Hài người thật, cái hài nằm ở thoại, biểu cảm, nhịp', group: 'Người thật', form: 'nguoithat' },
  { code: 'M06', name: 'Phỏng vấn / testimonial', when: 'Người nói vào máy, phỏng vấn đường phố, review', group: 'Người thật' },
  { code: 'M11', name: 'Vlog đời thường', when: 'Nhân vật vừa đi vừa nói, cầm máy selfie, nhiều hoạt động', group: 'Người thật' },
  { code: 'M04', name: 'Quảng cáo / TVC sản phẩm', when: 'Video giới thiệu sản phẩm, thương hiệu', group: 'Sản phẩm & kiến thức' },
  { code: 'M07', name: 'ASMR / cận cảnh thao tác tay', when: 'Nấu ăn, thủ công, mở hộp, tiếng động là trọng tâm', group: 'Sản phẩm & kiến thức' },
  { code: 'M10', name: 'Giáo dục / tài liệu có voice-over', when: 'Giải thích, minh hoạ theo lời dẫn', group: 'Sản phẩm & kiến thức' },
  { code: 'M05', name: 'Thiên nhiên / phong cảnh', when: 'Cảnh thiên nhiên, không có nhân vật nói', group: 'Thế giới & không khí' },
  { code: 'M08', name: 'Giả tưởng / khoa học viễn tưởng', when: 'Thế giới phi thực, tập trung dựng bối cảnh', group: 'Thế giới & không khí' },
  { code: 'M09', name: 'Hành động / rượt đuổi', when: 'Hành động nghiêm túc, căng thẳng (không hài)', group: 'Thế giới & không khí' },
  { code: 'M12', name: 'Kinh dị / hồi hộp', when: 'Rùng rợn, bí ẩn, nỗi sợ đến từ không khí và điều chưa biết', group: 'Thế giới & không khí' },
  { code: 'M13', name: 'POV thiết bị', when: 'Camera an ninh, camera cửa, hành trình, bodycam, máy quay cũ — thường là module phụ', group: 'Thế giới & không khí' },
];

export const MODULE_GROUPS = Array.from(new Set(MODULES.map((m) => m.group)));

export function moduleInfo(code: ModuleCode | ''): ModuleInfo | undefined {
  return MODULES.find((m) => m.code === code);
}

export const LENGTH_OPTIONS: { key: LengthKey; label: string; hint: string }[] = [
  { key: '1beat', label: '1 beat', hint: '4–8 giây, một ý duy nhất' },
  { key: '2-3beat', label: '2–3 beat', hint: 'Móc → Lật → Chốt' },
  { key: '4-8beat', label: '4–8 beat', hint: 'Có đoạn Đẩy leo thang' },
  { key: '8plus', label: 'Trên 8 beat', hint: 'Chia 2–3 hồi' },
  { key: 'series', label: 'Series', hint: 'Nhiều tập, nhân vật cố định' },
];

export const DURATION_OPTIONS: { key: DurationKey; label: string; hint: string }[] = [
  { key: 'ngan', label: 'Ngắn', hint: 'dưới 2 phút' },
  { key: 'trung-binh', label: 'Trung bình', hint: '2–8 phút' },
  { key: 'dai', label: 'Dài', hint: 'trên 8 phút' },
];

export const lengthLabel = (k: string) =>
  DURATION_OPTIONS.find((d) => d.key === k)?.label || LENGTH_OPTIONS.find((l) => l.key === k)?.label || k;

export const DIALOGUE_OPTIONS: { key: IdeaSettings['dialogue']; label: string }[] = [
  { key: 'auto', label: 'Để AI chọn' },
  { key: 'co', label: 'Có thoại' },
  { key: 'khong', label: 'Không thoại' },
];

export const FORM_OPTIONS: { key: IdeaSettings['form']; label: string }[] = [
  { key: 'auto', label: 'Để AI chọn' },
  { key: 'hoathinh', label: 'Hoạt hình' },
  { key: 'nguoithat', label: 'Người thật' },
];

export const VEO_LEVEL: Record<'de' | 'vua' | 'kho', { label: string; className: string }> = {
  de: { label: 'Veo dựng dễ', className: 'bg-green-100 text-green-800' },
  vua: { label: 'Veo dựng vừa', className: 'bg-primary-100 text-primary-800' },
  kho: { label: 'Veo dựng khó', className: 'bg-red-100 text-red-700' },
};

export const DEFAULT_SETTINGS: IdeaSettings = {
  module: 'M01',
  secondary: '',
  length: '2-3beat',
  aspect: '9:16',
  dialogue: 'auto',
  form: 'auto',
  extra: '',
};
