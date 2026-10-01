# Bước 3 — Đề cương & kịch bản

Thư mục này chứa kiến thức app gửi cho AI ở bước này. **Sửa file ở đây thì chỉ bước này thay đổi.**

## File trong thư mục

- `30_tinh-cach.md` — 1.3 — Định tính cách nhân vật
- `31_chia-beat.md` — 1.4 — Viết kịch bản chia beat
- `32_dao-cu.md` — 1.5 — Liệt kê đạo cụ
- `33_bang-kiem.md` — 1.6 — Bảng kiểm kịch bản và dừng
- `34_cau-truc-xuat.md` — 1.7 — Cấu trúc kịch bản xuất ra
- `90_ra-soat.md` — RÀ SOÁT BƯỚC 3 — KỊCH BẢN (luật cho AI rà soát cuối bước)

## Mỗi tác vụ nạp gì (theo `_nap.json`)

**de-cuong** — Viết đề cương: tính cách (1.3), đạo cụ (1.5), chia hồi → scene
- File: `../chung/01_nguyen-tac-van-hanh.md`, `../chung/02_phan-0_tam-nguyen-nhan-goc.md`, `../buoc-1-y-tuong/11_khung-truyen.md`, `30_tinh-cach.md`, `31_chia-beat.md`, `32_dao-cu.md`
- Module: giới thiệu (dòng CHỈ ÁP DỤNG KHI), Veo mạnh/yếu, bảng rủi ro, khung truyện, luật riêng, style
- Kiểu kịch bản: mục 1, 2, 3, 4, 5, 6

**scene** — Viết beat cho một scene (1.4 → 1.6, xuất theo 1.7)
- File: `../chung/00_cach-dung.md`, `../chung/01_nguyen-tac-van-hanh.md`, `../chung/02_phan-0_tam-nguyen-nhan-goc.md`, `30_tinh-cach.md`, `31_chia-beat.md`, `32_dao-cu.md`, `33_bang-kiem.md`, `34_cau-truc-xuat.md`
- Module: giới thiệu (dòng CHỈ ÁP DỤNG KHI), Veo mạnh/yếu, bảng rủi ro, khung truyện, luật riêng, âm thanh
- Kiểu kịch bản: mục 1, 3, 4, 5, 6

**ra-soat** — AI rà soát độc lập một scene hoặc cả phim
- File: `../chung/02_phan-0_tam-nguyen-nhan-goc.md`, `31_chia-beat.md`, `32_dao-cu.md`, `33_bang-kiem.md`, `../buoc-5-beat/55_chia-shot.md`, `90_ra-soat.md`
- Module: giới thiệu (dòng CHỈ ÁP DỤNG KHI), Veo mạnh/yếu, bảng rủi ro, luật riêng
- Kiểu kịch bản: mục 3, 6

## Muốn thay đổi

- Sửa luật của bước → sửa file `.md` tương ứng (giữ nguyên dòng tiêu đề `## x.y — …`, các file khác có thể nhắc tới số mục).
- Muốn một tác vụ dùng thêm / bớt file, mục module hay mục kiểu kịch bản → sửa `_nap.json` (đường dẫn tính từ thư mục này; `../chung/…` là file dùng chung).
- Luật rà soát cuối bước → `90_ra-soat.md`.
