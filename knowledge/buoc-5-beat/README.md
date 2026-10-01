# Bước 5 — Từng beat → prompt

Thư mục này chứa kiến thức app gửi cho AI ở bước này. **Sửa file ở đây thì chỉ bước này thay đổi.**

## File trong thư mục

- `50_vai-tro-khoi-dong.md` — BƯỚC 3: VIẾT ĐẦU VÀO CHO PROMPTLABS
- `51_quy-trinh-beat.md` — 3.4 — Quy trình viết từng beat
- `52_thiet-lap.md` — 3.5 — Bốn thiết lập PromptLabs
- `53_anh-tham-chieu.md` — 3.6 — Quản lý ảnh tham chiếu
- `54_viet-o-script.md` — 3.7 — Cách viết ô The Script
- `55_chia-shot.md` — 3.8 — Chia shot: khi nào cắt, khi nào giữ
- `56_dao-cu-buoc-3.md` — 3.9 — Đạo cụ trong Bước 3
- `57_dinh-dang-xuat.md` — 3.10 — Định dạng xuất mỗi beat
- `58_giu-nguyen-goc.md` — 3.11 — Bốn thứ giữ nguyên gốc
- `59_phu-luc-promptlabs.md` — PHỤ LỤC — APP PROMPTLABS HIỆN TẠI
- `5A_quy-trinh-khi-hong.md` — Quy trình khi một beat chạy ra hỏng
- `90_ra-soat.md` — RÀ SOÁT BƯỚC 5 — ĐẦU VÀO MỘT BEAT (trước khi tạo prompt) (luật cho AI rà soát cuối bước)

## Mỗi tác vụ nạp gì (theo `_nap.json`)

**beat** — Viết đầu vào PromptLabs cho một beat (3.4 → 3.10)
- File: `../chung/00_cach-dung.md`, `../chung/01_nguyen-tac-van-hanh.md`, `../chung/02_phan-0_tam-nguyen-nhan-goc.md`, `50_vai-tro-khoi-dong.md`, `51_quy-trinh-beat.md`, `52_thiet-lap.md`, `53_anh-tham-chieu.md`, `54_viet-o-script.md`, `55_chia-shot.md`, `56_dao-cu-buoc-3.md`, `57_dinh-dang-xuat.md`, `58_giu-nguyen-goc.md`, `59_phu-luc-promptlabs.md`
- Module: giới thiệu (dòng CHỈ ÁP DỤNG KHI), Veo mạnh/yếu, bảng rủi ro, luật riêng, âm thanh, ví dụ ô Script
- Kiểu kịch bản: mục 5, 6

**doc-frame** — Đọc + chấm frame người dùng chụp từ video
- File: `53_anh-tham-chieu.md`
- Module: không
- Kiểu kịch bản: không

**chan-doan** — Frame kém → chẩn đoán theo quy trình khi beat chạy ra hỏng
- File: `../chung/02_phan-0_tam-nguyen-nhan-goc.md`, `5A_quy-trinh-khi-hong.md`, `54_viet-o-script.md`
- Module: giới thiệu (dòng CHỈ ÁP DỤNG KHI), bảng rủi ro, luật riêng
- Kiểu kịch bản: mục 5, 6

**ra-soat** — AI rà soát đầu vào của một beat trước khi tạo prompt
- File: `../chung/02_phan-0_tam-nguyen-nhan-goc.md`, `51_quy-trinh-beat.md`, `54_viet-o-script.md`, `55_chia-shot.md`, `56_dao-cu-buoc-3.md`, `90_ra-soat.md`
- Module: giới thiệu (dòng CHỈ ÁP DỤNG KHI), bảng rủi ro, luật riêng
- Kiểu kịch bản: mục 5, 6

## Muốn thay đổi

- Sửa luật của bước → sửa file `.md` tương ứng (giữ nguyên dòng tiêu đề `## x.y — …`, các file khác có thể nhắc tới số mục).
- Muốn một tác vụ dùng thêm / bớt file, mục module hay mục kiểu kịch bản → sửa `_nap.json` (đường dẫn tính từ thư mục này; `../chung/…` là file dùng chung).
- Luật rà soát cuối bước → `90_ra-soat.md`.
