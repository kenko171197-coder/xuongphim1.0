---
id: noi-clip
ten: Nối clip liền mạch
dung-khi: Clip này tiếp nối trực tiếp hành động hoặc tư thế của clip trước, cùng bối cảnh, không nhảy thời gian.
dau-hieu: tiếp tục, ngay sau đó, liền, vẫn đang, khung cuối, khung đầu
---

# NỐI CLIP

## Khi viết shot list

- **Hai cách nối:**
  1. **Nối khớp khung** (chế độ khung đầu): khung cuối của clip trước là khung đầu của clip sau. Dùng khi
     hành động liên tục ở cùng góc máy.
  2. **Nối qua cắt cảnh** (chế độ nguyên liệu): clip sau mở ở **góc máy khác**. Không cần khớp khung, nhưng
     phải giữ trục trái/phải, hướng chuyển động, hướng nhìn và trạng thái bối cảnh.
- **Khung cuối phải "đứng được"** nếu định dùng làm khung đầu: tư thế ổn định, không đang giữa chuyển động
  nhanh, không lơ lửng, không mờ nhoè, mọi nhân vật cần cho clip sau đều có mặt và rõ mặt.
- Clip có shot "mất thăng bằng" ở cuối → **không** dùng khung cuối đó để nối; nối từ shot kết quả.
- Ghi **"Khung cuối"** cho mọi clip mà clip sau dùng chế độ khung đầu. Mô tả đủ để tạo ảnh hoặc để chụp đúng
  khoảnh khắc từ video.
- **Âm thanh không bị cắt giữa chừng** ở điểm nối: tiếng động kết thúc trong clip trước, hoặc bắt đầu mới ở clip sau.
- **Thay đổi còn lưu** luôn được mang sang clip sau.

## Khi viết prompt

- Chế độ khung đầu: `Start from the provided first frame. Keep every character, object and the room exactly
  as they appear in it. The action continues: …` — không tả lại bố cục.
- Chế độ nguyên liệu nối qua cắt cảnh: nhắc lại vị trí và hướng: `@ti (the small grey mouse), still running
  from right to left, …`

## Ví dụ đúng / sai

- **Sai:** lấy khung cuối lúc mèo đang lơ lửng giữa cú nhảy làm khung đầu clip sau → clip sau mèo đứng
  khựng giữa không trung.
- **Đúng:** nối từ khung mèo đã tiếp đất, bốn chân chạm sàn, mặt quay về phía chuột.
