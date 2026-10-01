# Bước 2 — Hướng khai thác (tuỳ chọn)

Thư mục này chứa kiến thức app gửi cho AI ở bước này. **Sửa file ở đây thì chỉ bước này thay đổi.**

## File trong thư mục

- `20_ba-huong.md` — 1.2 — Khai thác ý tưởng: đưa 3 hướng, dừng lại hỏi
- `90_ra-soat.md` — RÀ SOÁT BƯỚC 2 — HƯỚNG ĐÃ CHỌN (luật cho AI rà soát cuối bước)

## Mỗi tác vụ nạp gì (theo `_nap.json`)

**cau-hoi** — Câu hỏi đào sâu
- File: `../buoc-1-y-tuong/10_nhan-y-tuong.md`, `../buoc-1-y-tuong/11_khung-truyen.md`, `20_ba-huong.md`
- Module: giới thiệu (dòng CHỈ ÁP DỤNG KHI), Veo mạnh/yếu, bảng rủi ro, khung truyện
- Kiểu kịch bản: mục 1, 2, 3, 6

**huong** — Đưa 3 hướng khai thác
- File: `../chung/02_phan-0_tam-nguyen-nhan-goc.md`, `../buoc-1-y-tuong/11_khung-truyen.md`, `20_ba-huong.md`
- Module: giới thiệu (dòng CHỈ ÁP DỤNG KHI), Veo mạnh/yếu, bảng rủi ro, khung truyện
- Kiểu kịch bản: mục 1, 2, 3, 6

**sua** — Sửa hướng đã chọn theo kết quả rà soát
- File: `../chung/02_phan-0_tam-nguyen-nhan-goc.md`, `../buoc-1-y-tuong/11_khung-truyen.md`, `20_ba-huong.md`
- Module: giới thiệu (dòng CHỈ ÁP DỤNG KHI), Veo mạnh/yếu, bảng rủi ro, khung truyện
- Kiểu kịch bản: mục 1, 2, 3, 6

**ra-soat** — AI rà soát hướng đã chọn
- File: `../buoc-1-y-tuong/11_khung-truyen.md`, `20_ba-huong.md`, `90_ra-soat.md`
- Module: giới thiệu (dòng CHỈ ÁP DỤNG KHI), bảng rủi ro, khung truyện
- Kiểu kịch bản: mục 1, 3, 6

## Muốn thay đổi

- Sửa luật của bước → sửa file `.md` tương ứng (giữ nguyên dòng tiêu đề `## x.y — …`, các file khác có thể nhắc tới số mục).
- Muốn một tác vụ dùng thêm / bớt file, mục module hay mục kiểu kịch bản → sửa `_nap.json` (đường dẫn tính từ thư mục này; `../chung/…` là file dùng chung).
- Luật rà soát cuối bước → `90_ra-soat.md`.
