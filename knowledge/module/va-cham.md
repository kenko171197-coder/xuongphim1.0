---
id: va-cham
ten: Va chạm, bị đập, bị đè, bị kẹp
dung-khi: Có vật hoặc nhân vật đập vào nhau, một nhân vật bị đè, bị đập, bị kẹp, bị tông.
dau-hieu: đập, đè, tông, trúng, đụng, kẹp, húc, va
---

# VA CHẠM

Model video vẽ va chạm rất kém: hai vật đụng nhau mà không có phản lực, xuyên qua nhau, hoặc nhảy
thẳng sang kết quả. **Không cho model vẽ khoảnh khắc chạm.** Cho thấy trước và sau, giấu điểm chạm ở lần cắt.

## Khi viết shot list

- **Giấu va chạm ở điểm cắt.** Shot trước: phần đầu của chuyển động, kết shot ngay lúc **mất thăng bằng**
  hoặc lúc vật **vừa rời khung về phía nạn nhân**. Shot sau: hậu quả **đã nằm yên**.
- **Shot kết quả chỉ chứa kết quả.** Không thêm hành động mới vào shot "đã tĩnh". Nạn nhân cần làm gì
  tiếp (đứng dậy, rượt theo) thì để sang shot hoặc clip riêng. Được phép cho nhân vật **khác** bước vào
  phản ứng, miễn là bước vào sau khi hậu quả đã yên.
- **Để lại dấu vết vật lý** trong shot sau: bụi đang lắng, ghế đổ nghiêng, giấy bay, vệt nước loang.
  Dấu vết cho khán giả biết va chạm đã xảy ra mà không cần thấy nó.
- **Số shot = số mắt xích.** Gạt đổ / đống đổ nát / nhân vật với lấy vũ khí là ba mắt xích → ba shot.
  Mỗi shot một chủ thể, một việc. Vật đang rơi và người sắp bị trúng không đứng chung một shot.
- **Khoảng cách phải khớp nhân quả.** Người ném đứng đủ gần để vật tới nạn nhân hợp lý; khi đó ở shot
  sau người ném phải có mặt gần như ngay.
- **Hậu quả cần chính xác tuyệt đối** (VD bị kẹp đúng vào mũi) → cân nhắc chế độ khung đầu + khung cuối,
  với khung cuối là ảnh hậu quả đã tĩnh.
- Khung cuối của shot "mất thăng bằng" **không dùng làm khung nối** sang clip sau (đang giữa chuyển động).

## Khi viết prompt

- Shot trước: tả rõ hướng và đà, kết bằng khoảnh khắc trước chạm: `…lunges toward the trap; the shot cuts
  just before contact.`
- Shot sau: mở bằng trạng thái đã xong: `From the very first frame of this shot, the box already lies
  upside down over @ti (the small grey mouse); dust is still settling.`
- Tiếng va chạm đặt đúng lúc cắt: `SFX: a heavy thud exactly at the cut.`
- Tả vật lý bằng quan hệ nhân quả (lực → phản ứng), không bằng tính từ ("dramatic crash").

## Ví dụ đúng / sai

- **Sai:** một shot 6 giây "mèo lao tới, đâm sầm vào tủ, tủ rung, bát đĩa rơi xuống đầu mèo".
  Bốn mắt xích trong một shot → model nhảy cóc, bát đĩa xuyên qua đầu.
- **Đúng:** Shot 1 (3s): mèo lao về phía tủ, cắt khi chân rời sàn. Shot 2 (3s): ngay khung đầu mèo đã
  nằm bẹp dưới chân tủ, bát đĩa vỡ quanh người, một chiếc bát còn lắc lư rồi dừng.
