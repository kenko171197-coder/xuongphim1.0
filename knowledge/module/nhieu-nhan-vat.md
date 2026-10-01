---
id: nhieu-nhan-vat
ten: Nhiều nhân vật cùng khung, neo vị trí
dung-khi: Có từ hai nhân vật trở lên trong cùng một clip, nhất là khi có cắt cảnh hoặc không có ảnh khung đầu.
dau-hieu: cùng lúc, cả hai, đối mặt, đứng cạnh, nhìn nhau, bên trái, bên phải
---

# NHIỀU NHÂN VẬT

Nhân vật hay "dịch chuyển" chỗ đứng giữa các shot, đổi bên, nhân đôi, hoặc lẫn đặc điểm của nhau.

## Khi viết shot list

- **Tối đa 3 nhân vật có tag trong một clip.** Nhiều hơn → tách clip.
- **Khoá trái/phải** theo outline (VD @muop luôn bên phải, @ti bên trái). Mọi góc máy của bối cảnh nằm cùng
  một phía đường trục nên không lật bên. Chỉ đổi bên khi có shot cho thấy nhân vật di chuyển sang.
- **Shot neo:** clip chế độ nguyên liệu có ≥2 nhân vật và có cắt cảnh → mở bằng một shot toàn 0,5–1 giây
  cho thấy vị trí của mọi người. Khi dựng có thể cắt bỏ đoạn neo.
- **Mỗi nhân vật một hành động rõ.** Một nhân vật không làm hai ba việc cùng lúc. Người không phải chủ thể
  thì ghi rõ đang làm gì (đứng yên nhìn, nấp) — bỏ trống thì model tự cho họ cử động lung tung.
- **Nhân vật nhỏ ở xa dễ méo.** Nhân vật quan trọng của shot không nên chiếm dưới 1/10 chiều cao khung;
  cần thấy rõ thì thêm shot cận riêng.
- **Vai phụ xuất hiện một lần**: không cần tag, tả bằng chữ; ghi rõ "một nhân vật khác, không giống @…".
- **Đếm người**: dòng Khoá ghi đúng số nhân vật trong clip.

## Khi viết prompt

- Shot neo: `[0-1s] Wide establishing view: @muop (the orange tabby cat) on the right side by the table,
  @ti (the small grey mouse) on the left by the wall hole.`
- Mỗi shot nêu vị trí trước hành động: `On the right, …; on the left, …`
- Khoá: `Exactly two characters. @muop stays on the right side of the frame, @ti on the left.`

## Ví dụ đúng / sai

- **Sai:** 2 shot, không neo, shot 2 chỉ ghi "chuột nhìn mèo" → shot 2 chuột bên phải, mèo bên trái,
  hướng nhìn ngược.
- **Đúng:** shot neo 1 giây cho vị trí; mọi shot sau ghi lại bên của từng nhân vật; dòng Khoá nhắc lại.
