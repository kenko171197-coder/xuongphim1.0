# Bước 1 — Ý tưởng

Thư mục này chứa kiến thức app gửi cho AI ở bước này. **Sửa file ở đây thì chỉ bước này thay đổi.**

## File trong thư mục

- `10_nhan-y-tuong.md` — BƯỚC 1: VIẾT KỊCH BẢN
- `11_khung-truyen.md` — 1.2a — Khung truyện
- `90_ra-soat.md` — RÀ SOÁT BƯỚC 1 — Ý TƯỞNG (luật cho AI rà soát cuối bước)

## Mỗi tác vụ nạp gì (theo `_nap.json`)

**y-tuong** — Sinh thẻ ý tưởng (Phòng Ý tưởng)
- File: `../chung/00_cach-dung.md`, `../chung/02_phan-0_tam-nguyen-nhan-goc.md`, `10_nhan-y-tuong.md`, `11_khung-truyen.md`
- Module: giới thiệu (dòng CHỈ ÁP DỤNG KHI), Veo mạnh/yếu, bảng rủi ro, khung truyện
- Kiểu kịch bản: cả file

**sua** — Sửa thẻ ý tưởng theo kết quả rà soát
- File: `../chung/02_phan-0_tam-nguyen-nhan-goc.md`, `10_nhan-y-tuong.md`, `11_khung-truyen.md`
- Module: giới thiệu (dòng CHỈ ÁP DỤNG KHI), Veo mạnh/yếu, bảng rủi ro, khung truyện
- Kiểu kịch bản: cả file

**ra-soat** — AI rà soát ý tưởng của dự án trước khi sang bước sau
- File: `../chung/02_phan-0_tam-nguyen-nhan-goc.md`, `11_khung-truyen.md`, `90_ra-soat.md`
- Module: giới thiệu (dòng CHỈ ÁP DỤNG KHI), Veo mạnh/yếu, bảng rủi ro, khung truyện
- Kiểu kịch bản: mục 1, 2, 3, 6

## Muốn thay đổi

- Sửa luật của bước → sửa file `.md` tương ứng (giữ nguyên dòng tiêu đề `## x.y — …`, các file khác có thể nhắc tới số mục).
- Muốn một tác vụ dùng thêm / bớt file, mục module hay mục kiểu kịch bản → sửa `_nap.json` (đường dẫn tính từ thư mục này; `../chung/…` là file dùng chung).
- Luật rà soát cuối bước → `90_ra-soat.md`.
