# KHO KIẾN THỨC — XƯỞNG PHIM 2.0 (Đợt 1)

Đây là toàn bộ "luật" mà app gửi cho Gemini. App không chứa luật viết cứng trong code:
muốn phim hay hơn thì sửa file ở đây, không cần sửa code.

## Bốn thư mục

| Thư mục | Chứa gì | Ai đọc |
|---|---|---|
| `buoc/` | Lời dặn cho từng bước của app + luật chung (`0-chung.md`) | Mọi bước |
| `kich-ban/` | Mỗi thể loại một file: kể chuyện gì, theo chất nào | Bước 1–5, mỗi bước chỉ nhận vài mục |
| `module/` | Mỗi file một **tình huống** hay hỏng khi làm phim AI (va chạm, vật rơi…) | Bước 4 (nửa "khi viết shot list"), bước 5 (nửa "khi viết prompt") |
| `mo-hinh/` | Luật riêng của model video (hiện tại: Gemini Omni Flash trong Google Flow) | Bước 5, 6 |

**Ranh giới — giữ đúng thì không bao giờ chồng chéo:**
- `kich-ban/` quyết định **kể gì**. Không chứa mẹo kỹ thuật model.
- `module/` quyết định **quay thế nào để khỏi hỏng**. Không chứa luật riêng của thể loại.
- `mo-hinh/` quyết định **viết prompt ra sao cho model này**. Đổi model thì chỉ thêm file ở đây.
- `buoc/` quyết định **mỗi bước làm việc gì, trả ra gì**.

Một luật chỉ được nằm ở **một** file. Thấy trùng thì xoá một bên.

## Quy trình 6 bước

| Bước | File | Kết quả |
|---|---|---|
| 1. Ý tưởng | `buoc/1-y-tuong.md` | Thẻ ý tưởng dạng logline |
| 2. Outline | `buoc/2-outline.md` | Nhân vật, bối cảnh, đạo cụ, danh sách scene |
| 3. Tài sản | `buoc/3-tai-san.md` | Style, prompt ảnh nhân vật / đạo cụ / bối cảnh (sơ đồ + góc máy), cụm mô tả của mọi tag |
| 4. Shot list | `buoc/4-shot-list.md` | Scene → clip (≤10 giây) → shot, chế độ Flow, thẻ tình huống |
| 5. Prompt | `buoc/5-prompt.md` | Prompt video 6 khối + prompt ảnh khung đầu/cuối (nếu cần) |
| 6. Duyệt & sửa | `buoc/6-duyet-sua.md` | Kết luận duyệt, câu sửa ngắn cho Omni, cập nhật trạng thái |

## App đọc file thế nào (quy ước cho code ở Đợt 2)

1. Mỗi file bắt đầu bằng khối thông tin giữa hai dòng `---`. App đọc khối này, **không dò chữ trong thân file**.
2. File `buoc/` khai báo mình cần gì trong khối đầu:
   - `kich-ban-muc`: danh sách mục của file kịch bản cần gửi (VD `[1, 2, 7.1]`). App cắt theo tiêu đề `## 1.`, `### 7.1`.
   - `module`: `khong` · `muc-luc` (mỗi module một dòng: tên + "dùng khi") · `khi-viet-shot-list` · `khi-viet-prompt`.
   - `mo-hinh`: `co` / `khong`.
3. `buoc/0-chung.md` luôn được gửi ở đầu mọi lần gọi.
4. File hoặc thư mục bắt đầu bằng `_` bị bỏ qua (dùng cho bản nháp).

## Thêm thể loại / module mới

- Thể loại: chép `kich-ban/meo-chuot.md`, đổi khối đầu, **giữ nguyên 7 tiêu đề mục** (app cắt theo số mục).
- Module: chép một file trong `module/`, giữ 3 tiêu đề `## Khi viết shot list`, `## Khi viết prompt`, `## Ví dụ đúng / sai`. Dòng `dung-khi` phải đủ rõ để AI chọn đúng chỉ từ một dòng đó.

## Test tay trước khi có app (rẻ nhất)

Mở Google AI Studio, dán lần lượt: `buoc/0-chung.md` → `buoc/1-y-tuong.md` → các mục 1, 2, 3, 6, 7.1 của `kich-ban/meo-chuot.md`, rồi gõ: *"Làm bước 1, chế độ gợi ý, thời lượng ngắn."*
Kết quả chưa hay thì sửa file kịch bản, dán lại, so sánh. Làm tương tự cho các bước sau.

## Các con số lấy từ thực tế của bạn (sửa khi Flow thay đổi)

- Ảnh nguyên liệu tối đa mỗi lần tạo: `mo-hinh/omni-flash.md` → `anh-nguyen-lieu-toi-da`.
- Flow không cho đặt khung đầu cùng lúc với ảnh nguyên liệu → ba chế độ tách riêng.
- Không dùng chế độ nối dài (extend).
