---
id: dong-bo-boi-canh
ten: Đồng bộ bối cảnh qua các góc máy
dung-khi: Clip ở một bối cảnh đã dùng trước đó, có đổi góc máy, hoặc bối cảnh đã bị thay đổi (đổ vỡ, bừa bộn).
dau-hieu: góc ngược, quay sang, phía bên kia, cùng căn phòng, vẫn ở, bừa bộn, đổ vỡ
---

# ĐỒNG BỘ BỐI CẢNH

Mỗi góc nhìn mới, model phải tự vẽ phần chưa thấy: cửa sổ đổi chỗ, tường đổi màu, đồ đạc biến mất.

## Khi viết shot list

- **Chỉ dùng góc máy đã dựng sẵn** của bối cảnh (a, b, c…). Không tự nghĩ góc mới. Cần góc mới → ghi vào
  "tài sản còn thiếu".
- **Hướng sáng theo góc máy**, lấy từ dữ liệu góc máy, không tự suy. (VD góc a sáng từ trái khung, góc b ngược sáng.)
- **Nạp đúng ảnh của góc** mà shot dùng (`@bep-b` cho góc b). Clip có nhiều góc thì nạp ảnh của mọi góc dùng trong clip.
- **Đổi góc máy chỉ ở điểm cắt**, không cho máy tự xoay từ góc này sang góc kia trong một shot.
- **Mốc cố định** (cửa sổ, lỗ chuột, bếp lò) phải hiện đúng chỗ theo sơ đồ khi góc máy nhìn về phía đó.
- **Thay đổi còn lưu** (lọ muối đổ, bẫy đã sập) luôn có mặt ở mọi clip sau cùng bối cảnh.
- **Thời điểm trong ngày giữ nguyên** trong một scene. Đổi thời điểm = scene mới.
- **Tỉ lệ** theo sơ đồ: vị trí và kích thước của nhân vật so với đồ đạc không đổi giữa các clip.

## Khi viết prompt

- Ảnh bối cảnh trong chế độ nguyên liệu, khi góc máy của shot trùng với ảnh:
  `@bep-a (the sunny wooden kitchen, main view): location reference; match this view.`
- Khi shot nhìn từ hướng khác với ảnh nạp:
  `@bep-a (…): location reference only — use its architecture, materials and colors; do not copy its composition.`
- Hướng sáng theo góc: `Light comes from the window on the right side of the frame.`
- Trạng thái: `Current state: the salt shaker lies tipped over near the table edge.`

## Ví dụ đúng / sai

- **Sai:** clip 1 góc a (nắng từ trái khung), clip 2 nhìn sang phía cửa sổ nhưng prompt vẫn ghi "light from the left"
  → hai clip như hai căn phòng khác nhau.
- **Đúng:** clip 2 chọn góc b trong dữ liệu, code chép "backlight from the window behind the subjects", nạp `@bep-b`.
