# Bước 4 — Nhân vật & đạo cụ

Thư mục này chứa kiến thức app gửi cho AI ở bước này. **Sửa file ở đây thì chỉ bước này thay đổi.**

## File trong thư mục

- `40_thiet-ke.md` — BƯỚC 2: THIẾT KẾ NHÂN VẬT & ĐẠO CỤ
- `90_ra-soat.md` — RÀ SOÁT BƯỚC 4 — NHÂN VẬT & ĐẠO CỤ (luật cho AI rà soát cuối bước)

## Mỗi tác vụ nạp gì (theo `_nap.json`)

**thiet-ke** — Thiết kế nhân vật và ★ đạo cụ, viết prompt ảnh và ô Note
- File: `40_thiet-ke.md`, `../buoc-5-beat/53_anh-tham-chieu.md`
- Module: giới thiệu (dòng CHỈ ÁP DỤNG KHI), thiết kế, style
- Kiểu kịch bản: mục 4, 6

**quet-anh** — Quét ảnh người dùng gửi, gán @tag
- File: `../buoc-5-beat/53_anh-tham-chieu.md`
- Module: không
- Kiểu kịch bản: không

**ra-soat** — AI rà soát thiết kế so với kịch bản
- File: `40_thiet-ke.md`, `../buoc-5-beat/53_anh-tham-chieu.md`, `90_ra-soat.md`
- Module: giới thiệu (dòng CHỈ ÁP DỤNG KHI), thiết kế
- Kiểu kịch bản: mục 4, 6

## Muốn thay đổi

- Sửa luật của bước → sửa file `.md` tương ứng (giữ nguyên dòng tiêu đề `## x.y — …`, các file khác có thể nhắc tới số mục).
- Muốn một tác vụ dùng thêm / bớt file, mục module hay mục kiểu kịch bản → sửa `_nap.json` (đường dẫn tính từ thư mục này; `../chung/…` là file dùng chung).
- Luật rà soát cuối bước → `90_ra-soat.md`.
