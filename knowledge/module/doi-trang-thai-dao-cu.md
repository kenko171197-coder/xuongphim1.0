---
id: doi-trang-thai-dao-cu
ten: Đạo cụ đổi trạng thái (bẫy sập, vỡ, cháy đen, bẹp)
dung-khi: Một đạo cụ hoặc nhân vật chuyển sang trạng thái khác và giữ trạng thái đó ở các clip sau.
dau-hieu: sập, bật, vỡ, cháy, bẹp, phồng, xẹp, đổi, biến thành
---

# ĐỔI TRẠNG THÁI

Model không vẽ được quá trình đổi trạng thái: nó nhảy phắt sang trạng thái sau, hoặc trộn hai trạng thái.

## Khi viết shot list

- **Cơ chế đúng như vật thật:** bẫy chuột sập thì thanh thép **quật xuống đế**, không bắn lên trời.
  Lò xo bật về phía được nén, cửa bật theo bản lề.
- **Bộ phận bị kẹp phải nằm sẵn trong lòng bẫy** từ shot trước (chóp mũi thò vào ngửi, ngón chạm lẫy).
- Shot trước cắt khi cơ chế **vừa bật** (phần đầu chuyển động). Shot sau mở bằng trạng thái **đã đổi**,
  kèm một chi tiết chứng minh nguồn gốc (đế gỗ treo dưới cằm).
- **Trạng thái sau là một tài sản riêng** có tag biến thể (`@baykep-sap`). Có hai cách tạo ảnh:
  sửa ảnh gốc bằng công cụ ảnh ("same trap, now sprung shut"), hoặc chụp từ video đã chạy.
- **Clip chứa khoảnh khắc đổi** nạp cả hai ảnh, ghi rõ shot nào dùng trạng thái nào.
- **Từ clip sau trở đi, không nạp ảnh trạng thái cũ** nữa (ảnh bẫy đang giương sẽ kéo bẫy mở ra).
- Ghi vào **thay đổi còn lưu** để mọi clip sau thấy đúng.
- Nhân vật đổi trạng thái hài (cháy đen, bẹp dí): phần đầu ở shot 1, trạng thái sau ở shot 2; trạng thái sau
  nên hết ở scene tiếp theo (thể loại: "không ai thật sự đau").

## Khi viết prompt

- Shot trước: `…the steel bar has just started to snap down; cut.`
- Shot sau: `From the very first frame, @baykep-sap (the sprung wooden snap trap) is already clamped across
  the nose of @muop (the orange tabby cat), its wooden base hanging under his chin.`
- Khối trạng thái: `Current state: the snap trap is sprung.`

## Ví dụ đúng / sai

- **Sai (lỗi đã gặp):** "thanh bẫy bung vút thẳng lên, biến mất khỏi mép trên khung", shot sau "bẫy đã kẹp
  ngang sống mũi". Model dựng cả chiếc bẫy rơi từ trên đầu xuống — vừa ngược cơ chế, vừa đúng theo hướng
  rời khung đã tả.
- **Đúng:** mũi mèo đã nằm trong lòng bẫy; thanh thép vừa quật xuống thì cắt; shot sau bẫy đã kẹp trên mũi,
  đế gỗ treo dưới cằm.
