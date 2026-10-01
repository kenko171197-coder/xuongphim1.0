// Style mẫu phổ biến cho Veo 3 / Gemini Omni Flash và ảnh (Nano Banana).
// Chuỗi tiếng Anh viết đúng dạng dòng "Style:" trong ô Script. Không dùng tên hãng phim hay nghệ sĩ có bản quyền.
import type { Project } from '../types';

export interface StylePreset {
  id: string;
  group: string;
  en: string;
  vi: string;
}

export const STYLE_PRESETS: StylePreset[] = [
  // ---------- Hoạt hình ----------
  { id: '2d-slapstick', group: 'Hoạt hình', en: '2D classic slapstick animation, hand-drawn look, clean bold outlines, vibrant vintage flat colors', vi: 'Hoạt hình 2D hài cổ điển, nét vẽ tay, viền đậm gọn, màu phẳng rực rỡ kiểu xưa' },
  { id: '3d-feature', group: 'Hoạt hình', en: '3D animated feature film style, soft rounded character design, warm cinematic lighting, gentle depth of field', vi: 'Hoạt hình 3D kiểu phim chiếu rạp, nhân vật tròn mềm, ánh sáng điện ảnh ấm, xoá phông nhẹ' },
  { id: '3d-cartoon', group: 'Hoạt hình', en: '3D cartoon animation, squash-and-stretch expressions, bright saturated colors, soft studio lighting', vi: 'Hoạt hình 3D vui nhộn, biểu cảm co giãn phóng đại, màu tươi đậm, ánh sáng studio mềm' },
  { id: 'anime', group: 'Hoạt hình', en: 'Japanese anime style, cel shading, crisp line art, vibrant colors, detailed painted backgrounds', vi: 'Anime Nhật, tô bóng cel, nét vẽ sắc, màu tươi, nền vẽ chi tiết' },
  { id: 'watercolor', group: 'Hoạt hình', en: '2D hand-painted animation, watercolor textures, soft pastel palette, cozy atmosphere', vi: 'Hoạt hình 2D vẽ tay chất liệu màu nước, bảng màu pastel dịu, không khí ấm cúng' },
  { id: 'claymation', group: 'Hoạt hình', en: 'claymation stop-motion, handmade clay textures, visible fingerprints, soft studio lighting, miniature set', vi: 'Hoạt hình đất sét stop-motion, chất đất nặn thủ công, còn dấu vân tay, ánh sáng studio mềm, bối cảnh mô hình' },
  { id: 'chibi-toy', group: 'Hoạt hình', en: '3D chibi cartoon, oversized heads, glossy toy-like materials, bright candy colors, soft lighting', vi: 'Chibi 3D đầu to, chất liệu bóng như đồ chơi, màu kẹo ngọt tươi, ánh sáng mềm' },
  { id: 'papercut', group: 'Hoạt hình', en: 'paper cut-out animation, layered craft paper textures, soft drop shadows, handmade look', vi: 'Hoạt hình cắt giấy, nhiều lớp giấy thủ công, bóng đổ mềm, cảm giác làm tay' },
  { id: 'comic', group: 'Hoạt hình', en: 'comic book style, bold ink outlines, halftone shading, punchy saturated colors', vi: 'Phong cách truyện tranh, viền mực đậm, chấm tram đổ bóng, màu đậm mạnh' },
  { id: 'ink-wash', group: 'Hoạt hình', en: 'Chinese ink wash painting animation, sumi-e brushstrokes, muted earthy tones, rice paper texture', vi: 'Hoạt hình tranh thuỷ mặc, nét cọ mực tàu, tông màu đất trầm, chất giấy dó' },
  { id: 'lacquer', group: 'Hoạt hình', en: 'Vietnamese lacquer painting style, gold and silver leaf accents, deep reds and blacks, glossy finish', vi: 'Phong cách tranh sơn mài Việt Nam, điểm vàng bạc thếp, đỏ son và đen sâu, mặt bóng' },
  { id: 'pixel', group: 'Hoạt hình', en: '16-bit pixel art animation, retro game look, limited color palette, crisp pixels', vi: 'Pixel art 16-bit, chất game cổ điển, bảng màu giới hạn, điểm ảnh sắc nét' },
  { id: 'low-poly', group: 'Hoạt hình', en: 'low-poly 3D style, flat shaded facets, minimalist color palette, clean geometric shapes', vi: '3D low-poly, mặt khối đổ bóng phẳng, bảng màu tối giản, hình khối gọn' },

  // ---------- Người thật / điện ảnh ----------
  { id: 'cinematic-drama', group: 'Người thật / điện ảnh', en: 'photorealistic cinematic drama, natural lighting, shallow depth of field, subtle film grain, muted color grade', vi: 'Điện ảnh chân thực, ánh sáng tự nhiên, xoá phông, hạt phim nhẹ, màu trầm' },
  { id: 'film-35mm', group: 'Người thật / điện ảnh', en: '35mm film look, warm analog color grade, soft highlights, natural film grain', vi: 'Chất phim nhựa 35mm, màu analog ấm, vùng sáng mềm, hạt phim tự nhiên' },
  { id: 'golden-hour', group: 'Người thật / điện ảnh', en: 'warm golden hour cinematography, soft backlight, gentle lens flare, realistic', vi: 'Điện ảnh giờ vàng, ngược sáng mềm, loé ống kính nhẹ, chân thực' },
  { id: 'vlog', group: 'Người thật / điện ảnh', en: 'handheld smartphone vlog footage, natural daylight, slight camera shake, authentic unpolished look', vi: 'Vlog quay điện thoại cầm tay, nắng tự nhiên, máy rung nhẹ, mộc và thật' },
  { id: 'documentary', group: 'Người thật / điện ảnh', en: 'documentary style footage, handheld camera, natural light, realistic, calm pacing', vi: 'Phong cách phim tài liệu, máy cầm tay, ánh sáng tự nhiên, chân thực, nhịp chậm rãi' },
  { id: 'sitcom', group: 'Người thật / điện ảnh', en: 'realistic sitcom look, bright even lighting, natural colors, clean framing', vi: 'Kiểu phim sitcom, sáng đều, màu tự nhiên, khung hình gọn' },
  { id: 'commercial', group: 'Người thật / điện ảnh', en: 'premium product commercial, studio lighting, soft reflections, clean minimal background, shallow depth of field', vi: 'Quảng cáo sản phẩm cao cấp, ánh sáng studio, phản chiếu mềm, nền tối giản, xoá phông' },
  { id: 'storybook', group: 'Người thật / điện ảnh', en: 'symmetrical storybook cinematography, centered framing, pastel color palette, whimsical set design', vi: 'Điện ảnh kiểu truyện cổ tích, bố cục đối xứng chính giữa, màu pastel, bối cảnh ngộ nghĩnh' },
  { id: 'vhs', group: 'Người thật / điện ảnh', en: 'vintage 1990s VHS home video, color bleeding, scan lines, soft focus, warm faded colors', vi: 'Băng video gia đình VHS thập niên 90, lem màu, vạch quét, hơi mờ, màu ấm bạc' },
  { id: 'noir', group: 'Người thật / điện ảnh', en: 'black and white film noir, high contrast, hard shadows, venetian blind light patterns', vi: 'Phim noir đen trắng, tương phản mạnh, bóng đổ gắt, vệt sáng rèm sáo' },
  { id: 'neon', group: 'Người thật / điện ảnh', en: 'moody neon night city, rain-soaked streets, teal and magenta reflections, cinematic haze', vi: 'Thành phố đêm neon, phố ướt mưa, phản chiếu xanh ngọc và hồng tím, khói mờ điện ảnh' },
  { id: 'fantasy', group: 'Người thật / điện ảnh', en: 'epic cinematic fantasy, volumetric light, atmospheric mist, rich detail, sweeping scale', vi: 'Giả tưởng sử thi, tia sáng xuyên khói, sương mờ, chi tiết dày, quy mô hoành tráng' },
  { id: 'horror', group: 'Người thật / điện ảnh', en: 'psychological horror film, low-key lighting, deep shadows, cold desaturated tones, subtle film grain', vi: 'Kinh dị tâm lý, ánh sáng tối, bóng sâu, tông lạnh nhạt màu, hạt phim nhẹ' },
  { id: 'nature', group: 'Người thật / điện ảnh', en: 'breathtaking nature documentary, ultra realistic, natural light, crisp detail, aerial cinematography', vi: 'Phim tài liệu thiên nhiên, siêu chân thực, ánh sáng tự nhiên, chi tiết sắc, quay flycam' },
  { id: 'cctv', group: 'Người thật / điện ảnh', en: 'grainy CCTV security camera footage, high angle, wide lens, low resolution, black and white night vision', vi: 'Camera an ninh nhiễu hạt, góc cao, ống kính rộng, độ phân giải thấp, hồng ngoại đen trắng' },
];

export const STYLE_GROUPS = Array.from(new Set(STYLE_PRESETS.map((s) => s.group)));

/** Style đang dùng cho phim: theo lựa chọn của người dùng, mặc định là style AI chọn theo module. */
export function effectiveStyle(p: Project): string {
  const c = p.styleChoice;
  if (c?.mode === 'preset') {
    const preset = STYLE_PRESETS.find((s) => s.id === c.presetId);
    if (preset) return preset.en;
  }
  if (c?.mode === 'image' && c.imageStyle?.trim()) return c.imageStyle.trim();
  return p.outline?.style || p.script?.style || '';
}

/** Style đã chốt (không phải AI tự chọn) để gửi kèm khi viết đề cương. */
export function fixedStyle(p: Project): string {
  return p.styleChoice && p.styleChoice.mode !== 'ai' ? effectiveStyle(p) : '';
}

/** Thay dòng "Style:" trong ô Script bằng style mới. */
export function replaceStyleLine(script: string, style: string): string {
  return /^Style:.*$/m.test(script) ? script.replace(/^Style:.*$/m, `Style: ${style}`) : `${script.trimEnd()}\nStyle: ${style}`;
}
