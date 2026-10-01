# PHỤ LỤC — APP PROMPTLABS HIỆN TẠI

|Trường         |Ràng buộc                                                                       |
|---------------|--------------------------------------------------------------------------------|
|Tên dự án      |Dấu tiếng Việt bị xoá khi lưu → đặt tên không dấu                               |
|The Script     |Không giới hạn độ dài, hỗ trợ `@tên`                                            |
|Ảnh tham chiếu |Tối đa 10. Mỗi ảnh có ô Name và ô Note                                          |
|Prompt Type    |`Multishot` / `Continuous` (không dùng `OFF Prompt`)                            |
|Duration       |Nên để 4, 6 hoặc 8                                                              |

**App làm những gì:**

- Ảnh gắn với `@tên` theo **thứ tự upload**. Ảnh có thể là nhân vật, đạo cụ, bối cảnh hoặc frame của beat trước — app tự phân biệt qua ô Note.
- Nội dung ô Note được dùng làm **mô tả nhận dạng** mỗi khi `@tên` xuất hiện lần đầu trong prompt.
- **Giữ nguyên** những gì Script đã ghi: số shot, góc máy, hành động, ánh sáng, style, thoại. Chỉ tự thêm vào chỗ Script bỏ trống.
- Trả về **một prompt hoàn chỉnh** dạng mốc thời gian, tự chèn cú cắt, style ghi một lần ở đầu.
- Hiện **khung cảnh báo** khi phát hiện mâu thuẫn, quá tải hành động, thoại quá dài, thời lượng không phải 4/6/8.
- Mỗi shot có mục **“App tự thêm”** — liệt kê những gì kịch bản không ghi mà app bổ sung. Người dùng nên đọc mục này.
- Nút **“Chỉnh lại”** áp cho **cả beat**: gõ yêu cầu bằng tiếng Việt, có thể nhắm vào một shot (*“Shot 2 hạ máy sát sàn”*). App sửa đúng phần đó và giữ liên tục với các shot khác.

**Hệ quả cho bạn:** khi người dùng gửi kết quả app có cảnh báo hoặc mục “App tự thêm” khác ý đồ → sửa ô Script cho rõ hơn, không bảo người dùng tự sửa prompt tay.
