---
id: omni-flash
ten: Gemini Omni Flash (trong Google Flow)
clip-toi-thieu: 3
clip-toi-da: 10
ti-le: ["9:16", "16:9"]
anh-nguyen-lieu-toi-da: 10
che-do: [nguyen-lieu, khung-dau, khung-dau-cuoi]
che-do-mac-dinh: nguyen-lieu
ngon-ngu-prompt: en
---

# GEMINI OMNI FLASH — LUẬT VIẾT PROMPT

Các con số ở khối đầu file là cài đặt. `anh-nguyen-lieu-toi-da` lấy theo thực tế người dùng đã chạy trong
Flow; Flow đổi thì sửa ở đây.

## 1. Đặc điểm của model cần nhớ

- Clip 3–10 giây, có âm thanh tạo cùng lúc (tiếng động, nhạc, thoại).
- **Mặc định tự dựng một câu chuyện nhỏ nhiều shot.** Không ghi rõ số shot thì model tự thêm cắt cảnh.
- Hiểu mốc thời gian dạng `[0-3s]` và câu tự nhiên ("after 3 seconds…").
- **Viết phủ định được** ngay trong prompt ("No dialogue", "Do not…"). Không có ô negative prompt riêng.
- Dựa nhiều vào hiểu biết chung về thế giới: **không cần** chồng tính từ hay tả kỹ thuật máy quay quá mức.
  Tập trung vào: vị trí, quan hệ nhân quả vật lý, thời điểm, âm thanh.
- Tiếng Anh được hỗ trợ đầy đủ; ngôn ngữ khác chạy được nhưng không ổn định.
- Trong Flow: ba chế độ tách riêng — **nguyên liệu**, **khung đầu**, **khung đầu + cuối**. Không kết hợp
  khung đầu với ảnh nguyên liệu. Không dùng nối dài (extend).
- Sửa được video vừa tạo bằng một câu lệnh ngắn (xem mục 5).

## 2. Khung prompt video — 6 khối

App ghép prompt theo đúng thứ tự dưới đây. **AI chỉ viết phần thân của khối [4].** Các khối còn lại
app ghép từ dữ liệu đã duyệt (style, tài sản, shot list).

```
[1] STYLE    {style của phim}. {Vertical 9:16 | Horizontal 16:9}.
[2] SETTING  Location: @bep (the sunny wooden kitchen). Morning.
             Current state: {thay đổi còn lưu, nếu có}.
[3] REFS     (theo chế độ — mục 3)
[4] SHOTS    {dòng kiểm soát cắt cảnh}
             [0-1s] {đầu shot do app ghép: cỡ cảnh, góc máy (EN), chuyển động máy, hướng sáng}. {thân shot: AI viết}
             [1-5s] …
[5] LOCKS    Exactly {n} characters: {@tag (mô tả) …} ← app đếm. {Khoá của shot list, AI dịch sát sang tiếng Anh}.
[6] AUDIO    Audio: {tiếng động theo thời điểm}. {No dialogue. | Dialogue: …} {No music. | Music: …}
             No on-screen text, no subtitles.
```

**Dòng kiểm soát cắt cảnh** (đầu khối [4]):
- 1 shot: `Single continuous shot, no scene cuts.`
- N shot: `Exactly {N} shots, hard cuts at {x}s{ and y s}; no other cuts.`

**Đầu shot do app ghép** từ dữ liệu góc máy: `Medium shot, eye level from the kitchen doorway, static camera,
light from the window on the left side of the frame.`

## 3. Khối [3] theo chế độ

**Nguyên liệu** — mỗi ảnh nạp một dòng, đánh số theo **đúng thứ tự người dùng nạp vào Flow** (nhân vật → đạo cụ →
trạng thái sau → bối cảnh → khung cuối thật của clip trước, nếu có), ghi vai trò:
```
Image 1 — @muop (the orange tabby cat): character reference.
Image 2 — @baykep (the small wooden snap trap): prop reference.
Image 3 — @bep-a (the sunny wooden kitchen, main view): location reference; match this view.
Image 4 — @bep-b (the sunny wooden kitchen, view toward the window): location reference only — use its architecture,
  materials and colors; do not copy its composition.
Image 5 — @s1-c01-cuoi (the final frame of the previous clip): continuity reference — keep the room, object positions
  and character designs exactly as shown; this clip continues from that moment.
Use the given images as references for the video. They are not the first frame.
```
- Khung cuối thật của clip trước chỉ có khi người dùng đã lưu ở bước Duyệt và sửa; cùng bối cảnh với clip này.
- Chỉ nạp tài sản **nhìn thấy trong khung**; ảnh nạp thừa làm model vẽ bừa.
- Ảnh góc máy trùng với góc của shot → `match this view`. Khác → `location reference only…`.
- Clip chứa khoảnh khắc đổi trạng thái nạp cả hai ảnh, ghi vai trò theo shot:
  `@baykep (…): the trap before it snaps, shot 1 only.` · `@baykep-sap (…): the same trap after it snaps, shot 2 only.`
  Các clip sau chỉ nạp ảnh trạng thái mới.

**Khung đầu:**
```
Start from the provided first frame. Keep every character, object and the room exactly as they appear in it.
```

**Khung đầu + cuối:**
```
Start from the provided first frame and end exactly on the provided last frame. Keep every character,
object and the room exactly as they appear in the frames.
```

## 4. Cách viết thân shot (phần AI viết)

- Mọi tài sản viết `@tag (cụm mô tả)` — đúng từng chữ của cụm mô tả.
- **Chế độ nguyên liệu**: mở thân shot bằng vị trí (`On the right, …; far in the background on the left, …`),
  rồi mới tới hành động.
- **Chế độ khung đầu / khung đầu + cuối**: không tả lại bố cục; chỉ tả chuyển động từ khung.
- Hành động viết bằng **quan hệ nhân quả vật lý**: lực → phản ứng, trọng lượng, tiếp xúc. VD `lowers the trap
  and sets it flat on the table edge; it stays there`, không phải `places the trap dramatically`.
- Biểu cảm viết bằng **thay đổi nhìn thấy** (mắt, miệng, tai), không bằng tên cảm xúc.
- Nhịp con có mốc giây khi shot có nhiều thay đổi: `(1-2s) …; (2-4s) …`.
- Shot kết quả mở bằng `From the very first frame of this shot, … already …`.
- Không thêm nhân vật, đồ vật, hành động không có trong shot list. Nếu phải thêm để câu văn hợp lý, liệt kê
  vào `them-vao` để app cho người dùng thấy.
- Câu ngắn, thì hiện tại, mỗi câu một việc.

## 5. Prompt sửa (sửa trên video vừa tạo)

- Một lần sửa **một** thay đổi. Nhiều lỗi → sửa nhiều lượt.
- Câu ngắn, kết bằng `Keep everything else the same.`
- Vẫn dùng `@tag (cụm mô tả)`.
- VD: `Make @ti (the small grey mouse) stand on the left side of the salt shaker instead of the right.
  Keep everything else the same.`
- **Không sửa mà chạy lại** khi: sai số shot, sai bố cục tổng thể, nhân vật sai hình dạng nặng, thiếu hẳn
  một hành động chính. Khi đó sửa prompt gốc hoặc đổi chế độ.

## 6. Prompt ảnh khung đầu / khung cuối (cho công cụ ảnh)

```
{style}. {Vertical 9:16}. {mô tả góc máy (EN)}, {hướng sáng}.
{Ai ở đâu, tư thế tĩnh — AI viết từ dòng "Khung đầu" / "Khung cuối" của shot list}.
{Current state: …}
Use the attached images of @muop (the orange tabby cat), … and @bep-a (…) as references; keep their
designs identical. A single still frame, no motion blur, no text.
```

## 7. Những điều cần thử thực tế (cập nhật sau khi chạy)

- Omni có giữ đúng số shot khi ghi `Exactly N shots` không, hay vẫn tự thêm cắt.
- Chữ `@tag` trong prompt có bị vẽ thành chữ trên hình không (hiện chưa gặp).
- Shot neo 0,5–1 giây có giữ được vị trí nhân vật qua các shot sau không.
- Mốc giây ngắn (dưới 2 giây) có được tôn trọng không.
- Dòng `Image N —` có giúp Omni gắn đúng ảnh với @tag không, hay chỉ cần cụm mô tả là đủ.
- Ảnh khung cuối clip trước nạp làm nguyên liệu có giữ liền mạch phòng và vị trí đồ vật không.
