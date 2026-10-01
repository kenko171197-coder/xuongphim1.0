---
id: 5-prompt
ten: Prompt (biên dịch clip sang prompt cho Flow)
kich-ban-muc: [6]
module: khi-viet-prompt
mo-hinh: co
---

# BƯỚC 5 — PROMPT

## Việc cần làm

Biên dịch **một clip** của shot list (đã được người dùng duyệt) sang tiếng Anh theo file mô hình.
Đây là bước **dịch**, không phải bước sáng tạo: mọi quyết định về bố cục, hành động, âm thanh đã nằm trong
shot list. Không thêm, không bớt, không đổi ý.

App tự ghép các khối [1] [2] [3] [5] [6] và phần đầu mỗi shot từ dữ liệu. **Bạn viết:**

1. **Thân của từng shot** trong khối [4] — theo mục 4 của file mô hình.
2. **Thân prompt ảnh khung đầu** (và khung cuối) — chỉ khi chế độ của clip cần. Tả tư thế tĩnh của mọi thứ
   trong khung theo dòng "Khung đầu" / "Khung cuối" của shot list.
3. **Dịch sát sang tiếng Anh** (không thêm ý): trạng thái bối cảnh trước clip, dòng Khoá, âm thanh, thoại, nhạc.
   Giữ `@tag (cụm mô tả)` khi nhắc tài sản. Rỗng thì trả rỗng.
4. **them-vao**: danh sách mọi chi tiết bạn buộc phải thêm mà shot list không có (VD "thêm hướng quay mặt của
   @ti ở shot 2"). Không thêm gì thì để trống.
5. **canh-bao**: vấn đề phát hiện khi tự kiểm (mục dưới), mỗi dòng một vấn đề, tiếng Việt.

## Theo các module của clip

Clip có thẻ tình huống nào thì tuân theo nửa **"Khi viết prompt"** của module đó (gửi kèm).

## Tự kiểm trước khi trả

- Mỗi tag trong thân shot đều nằm trong "Ảnh nạp" (chế độ nguyên liệu) hoặc trong "Khung đầu" (chế độ khung đầu).
  Chế độ khung đầu mà nhắc tới tag không có trong khung → cảnh báo.
- Cụm mô tả chép đúng từng chữ.
- Thân shot không mâu thuẫn với khối Khoá (số nhân vật, trái/phải, ai cầm gì).
- Không tả lại bố cục khi chế độ là khung đầu.
- Không có hành động nào của shot kết quả trước khi hậu quả đã nằm yên.
- Hành động mỗi shot vừa với số giây của shot (2 giây ≈ một cử động rõ; 4 giây ≈ hai đến ba cử động).
- Không có chữ, biển hiệu, phụ đề nếu shot list không yêu cầu.

## Ví dụ — thân shot (chế độ nguyên liệu)

Shot list: *"Shot 1 [0-3s] · góc c · cận · đứng yên. Ai ở đâu: @baykep giữa khung, đang giương; mặt @muop
cúi từ bên phải vào. Hành động: @muop dí sát mũi vào lòng bẫy, khịt khịt. Ở giây cuối, thanh thép vừa bật lên."*

Thân shot:
```
@baykep (the small wooden snap trap) sits in the center of the frame, set and ready. The face of @muop
(the orange tabby cat) leans in from the right and pushes his nose into the trap, sniffing twice.
(2.5-3s) The steel bar has just started to snap down; cut.
```
