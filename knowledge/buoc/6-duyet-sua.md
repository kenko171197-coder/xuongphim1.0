---
id: 6-duyet-sua
ten: Duyệt và sửa clip
kich-ban-muc: [6]
module: khi-viet-prompt
mo-hinh: co
---

# BƯỚC 6 — DUYỆT VÀ SỬA

## Việc cần làm

Người dùng đã chạy clip trong Flow và gửi về: nhận xét bằng tiếng Việt, có thể kèm 1–3 ảnh chụp từ video
(thường là khung cuối). Bạn nhận thêm dữ liệu clip (shot list, prompt đã dùng, chế độ).

Trả về:

1. **ket-luan**: `dung-duoc` · `sua` · `chay-lai`.
2. **cau-sua**: nếu `sua` — danh sách câu sửa theo thứ tự nên làm, **mỗi câu một thay đổi**, theo mục 5
   của file mô hình. Tối đa 3; nhiều lỗi hơn thì chạy lại.
3. **sua-prompt**: nếu `chay-lai` — chỉ ra phải đổi gì trong shot list hoặc chế độ (tiếng Việt), không viết
   lại cả prompt. Người dùng sửa shot list, bước 5 sẽ biên dịch lại.
4. **cap-nhat**: nếu video khác kế hoạch mà **vẫn dùng được** — đề xuất sửa dữ liệu dự án theo video thật
   (vị trí thật của nhân vật, thay đổi còn lưu thật, khung cuối thật) để các clip sau nối đúng.
5. **khung-cuoi**: nếu có ảnh khung cuối và clip sau dùng chế độ khung đầu — chấm khung (mục dưới).

## Chọn sửa hay chạy lại

| Lỗi | Hướng |
|---|---|
| Chi tiết nhỏ: màu, một đồ vật thừa, hướng nhìn, một biểu cảm | Sửa |
| Một nhân vật đứng sai bên, sai chỗ nhưng bố cục chung đúng | Sửa |
| Sai số shot, tự thêm cắt cảnh | Chạy lại (thêm dòng kiểm soát cắt rõ hơn) |
| Bố cục tổng thể sai, bối cảnh sai | Chạy lại; cân nhắc đổi sang chế độ khung đầu |
| Nhân vật sai hình dạng nặng, lẫn hai nhân vật | Chạy lại; kiểm ảnh nạp và cụm mô tả |
| Thiếu hẳn hành động chính / vật lý hỏng (xuyên vật, trôi, nhảy cóc) | Chạy lại; xem lại module tình huống — thường phải tách shot hoặc giấu ở điểm cắt |

## Chấm khung cuối (khi dùng làm khung đầu của clip sau)

Mỗi tiêu chí 0–2 điểm:

| Tiêu chí | 2 điểm khi |
|---|---|
| Đúng khoảnh khắc | Đúng mô tả "Khung cuối" của shot list |
| Đứng được | Tư thế ổn định, không giữa chuyển động nhanh, không lơ lửng |
| Nhân vật và đạo cụ | Đủ, đúng hình dạng, rõ mặt |
| Bố cục | Trái/phải, gần/xa đúng khoá |
| Chất lượng hình | Nét, không nhoè, không vỡ hình |

Tổng dưới 6, hoặc có tiêu chí 0 điểm → chụp khung khác trong video, hoặc tạo khung bằng công cụ ảnh
(theo mục 6 của file mô hình).
