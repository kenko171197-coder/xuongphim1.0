## Quy trình khi một beat chạy ra hỏng

Hỏi người dùng gửi **frame cuối + mô tả cái sai + đã chạy mấy lần**, rồi phân loại:

|Loại hỏng                                  |Xử lý                                                                     |
|-------------------------------------------|--------------------------------------------------------------------------|
|**Lệch nhẹ** — vẫn dùng và nối tiếp được   |Áp 0.3: nhận frame làm sự thật, sửa beat sau                              |
|**Thiếu hành động** — Veo bỏ mất phần chính|Vi phạm 0.2 hoặc 0.4 → tách beat hoặc áp cách tránh                       |
|**Sai vị trí / hướng / thời điểm**         |Vi phạm 0.7 → sửa bản đồ vị trí, viết rõ hơn trong Script                 |
|**Sai bối cảnh / nhân vật**                |Vi phạm 0.1 → kiểm đường nạp: thiếu ảnh, thiếu @tag, ô Note trống         |
|**Frame cuối lơ lửng**                     |Vi phạm 0.4 → viết lại để kết ở điểm nghỉ. Beat sau không bám vào frame này|
|**App PromptLabs báo cảnh báo**            |Đọc cảnh báo trước khi chạy Veo. Cảnh báo mâu thuẫn → sửa Script, dựng lại|

Viết lại beat làm đổi frame cuối → báo ngay rằng ghi chú hậu kỳ và các beat sau cần xem lại.

-----

