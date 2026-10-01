---
id: ruot-duoi
ten: Chạy, rượt đuổi, chuyển động nhanh
dung-khi: Nhân vật chạy, rượt nhau, lao vút, né tránh nhanh, hoặc hành động liên tục kéo dài hơn một clip.
dau-hieu: chạy, rượt, đuổi, lao, phóng, né, trốn, vút
---

# RƯỢT ĐUỔI

Model bỏ sót có hệ thống chuyển động nhanh; xoay tròn và lộn nhào làm méo nhân vật, mất nhận dạng.

## Khi viết shot list

- **Bỏ đoạn giữa của chuyển động nhanh:** clip hoặc shot trước lấy đà, shot sau là kết quả hoặc đã tới nơi.
- **Hướng màn hình nhất quán:** rượt từ phải sang trái thì mọi clip của cuộc rượt giữ phải → trái. Đổi hướng
  chỉ khi có một shot cho thấy nhân vật quay đầu.
- **Rượt dài hơn 10 giây** → chia thành nhiều clip, mỗi clip một chặng có một chuyển biến (vượt chướng ngại,
  suýt bị tóm, rẽ ngoặt). Nối bằng khung cuối → khung đầu (module `noi-clip`).
- **Máy**: đứng yên cho nhân vật chạy ngang qua khung, hoặc lia theo một nhân vật. Không vừa lia vừa đẩy vừa
  xoay máy trong cùng một shot.
- **Xoay tròn, lộn nhào** → giấu trong cuộn bụi, làn khói, tấm vải. **Lăn** → đổi thành **trượt**.
- Hai nhân vật cùng chạy: một người dẫn trước rõ ràng, khoảng cách giữa hai người ghi cụ thể (VD "cách nhau
  nửa chiều dài bàn").

## Khi viết prompt

- Tả **một** hướng chạy và **một** cách máy di chuyển cho mỗi shot: `Static wide shot. @ti (the small grey
  mouse) dashes from the right edge to the left edge along the floor; @muop (the orange tabby cat) follows
  half a table-length behind.`
- Tả cơ thể theo nhân quả: chân đạp đất, người chúi về trước, tai dựng ngược vì gió.
- Kết shot bằng vị trí rõ ràng: `…both exit through the left edge.`

## Ví dụ đúng / sai

- **Sai:** một clip 10 giây "mèo rượt chuột quanh bếp ba vòng, nhảy qua ghế, trượt trên sàn, lộn nhào".
- **Đúng:** C01 (6s) chuột phóng khỏi lỗ, mèo đuổi theo, cả hai ra mép trái. C02 (5s) góc khác: chuột lách
  dưới ghế, mèo đâm vào ghế (giấu va chạm ở điểm cắt). C03 (4s) mèo nằm bẹp dưới ghế đổ, chuột đã mất hút.
