# Xưởng phim 2 — bản 3.0 (đủ 6 bước)

Từ ý tưởng tới prompt cho Google Flow (Gemini Omni Flash): Ý tưởng → Outline → Tài sản → Shot list → Prompt → Duyệt và sửa.

## Mới ở bản 3.0 (Đợt 3)

- **Bước 4 · Shot list** — chạy theo từng scene. Mỗi clip (3–10 giây, lấy từ `knowledge/mo-hinh/omni-flash.md`) có chế độ Flow,
  độ khó, ảnh nạp, tình huống, khoá, 1–4 shot (góc máy chọn trong các góc của bối cảnh), âm thanh, trạng thái cộng dồn.
  Sửa trực tiếp từng clip (đổi số giây của shot, mốc thời gian tự tính lại), hoặc sửa cả scene theo góp ý. Gợi ý thứ tự chạy: clip khó trước.
  App tự kiểm: góc máy không có, tag chưa có tài sản, vượt giới hạn ảnh, clip khung đầu có nhân vật không nằm trong khung.
- **Bước 5 · Prompt** — code ghép khung 6 khối; AI chỉ viết thân từng shot và dịch sát trạng thái / khoá / âm thanh.
  Mỗi clip: danh sách ảnh cần nạp (ô đỏ nếu chưa có ảnh), prompt video, prompt ảnh khung đầu / cuối (chỉ nạp tài sản có trong khung đó).
  Clip sửa sau khi biên dịch sẽ báo "Shot list đã sửa sau khi biên dịch".
- **Bước 6 · Duyệt và sửa** — ghi nhận xét + tối đa 3 ảnh chụp từ video → AI kết luận dùng được / sửa / chạy lại, viết câu sửa ngắn cho Omni
  (kết bằng "Keep everything else the same."), chấm khung cuối 5 tiêu chí (server tự tính điểm), lưu ảnh làm khung nối cho clip sau.
  Trạng thái từng clip, tải danh sách clip ra CSV để ghép phim.
- Luật sửa: "Thay đổi còn lưu sau clip" ghi **cộng dồn** (`buoc/4-shot-list.md`); bước 5 được dịch sát một số dòng (`buoc/5-prompt.md`).

## Thay đổi ở bản 2.1

- **Key miễn phí trước** (mặc định, đổi ở Cài đặt): thử mọi model bằng key miễn phí (Flash rồi Flash-Lite) trước khi dùng key trả phí.
  Bậc miễn phí của Flash chỉ ~20 lượt/ngày, Flash-Lite ~500 lượt/ngày; giới hạn tính theo project, không theo key.
- **Kiểm tra key theo từng model** (3.8 Flash, 3.1 Flash-Lite, 3.1 Pro) và dòng báo ở thanh bên: lần gọi vừa rồi chạy bằng model nào, key miễn phí hay trả phí.
- **Chọn số thẻ ý tưởng 1–10** mỗi lần.
- **Bối cảnh làm hai lượt**: lượt 1 chỉ viết prompt góc a; nạp ảnh góc a xong mới bấm "Viết prompt góc phụ" — AI đọc ảnh thật,
  sửa sơ đồ theo ảnh, viết prompt góc phụ theo khuôn ép đổi vị trí máy (CAMERA / FRAME LAYOUT / OUT OF FRAME / LIGHT).
  Luật chọn góc: ưu tiên đẩy vào một khu vực đã thấy hoặc hạ máy thấp; tránh góc nhìn ngược. Xem `knowledge/buoc/3-tai-san.md` mục 4.



## Chạy

Trên AI Studio: nạp thư mục này như cách đã nạp bản cũ (app dùng `server.ts` + Vite, cổng 3000).
Trên máy: `npm install` rồi `npm run dev`, mở http://localhost:3000.

Lần đầu: vào **Cài đặt** → thêm Gemini API key → bấm **Kiểm tra**. Mục **Kho kiến thức** phải báo "Kho đầy đủ, không có lỗi".

## Luật nằm ở đâu

Toàn bộ luật gửi cho Gemini nằm trong `knowledge/` (xem `knowledge/README.md`). Code chỉ lo ghép và kiểm dữ liệu.
Mỗi file `knowledge/buoc/*.md` tự khai báo ở khối đầu file cần mục nào của file thể loại, có cần module hay file mô hình không.
Sửa file → server đọc lại sau tối đa 30 giây → lần bấm sau đã dùng luật mới.

Một lần gọi gồm, theo thứ tự: luật chung → lời dặn của bước → các mục thể loại đã khai báo → (module) → (mô hình) → dữ liệu dự án → việc lần này.
Mỗi bước 1–3 gửi khoảng 10–12 nghìn ký tự luật (bản cũ khoảng 40 nghìn).

## Cấu trúc code

| File | Việc |
|---|---|
| `server.ts` | Route: `/api/knowledge`, `/api/ideas`, `/api/outline`, `/api/assets`, `/api/match-images`, `/api/style-from-image`, `/api/test-key` |
| `server/ai.ts` | Giữ nguyên bản cũ: xoay key miễn phí → trả phí, lùi model, đếm token, cache |
| `server/knowledge.ts` | Đọc kho: khối đầu file, cắt mục theo số, mục lục module, báo lỗi kho |
| `server/prompt.ts` | Ghép prompt từng bước; viết dữ liệu dự án thành chữ |
| `server/steps.ts` | Bước 1–3: khuôn JSON, lời giao việc, chuẩn hoá kết quả |
| `server/production.ts` | Bước 4–6: shot list, ghép prompt 6 khối, duyệt và chấm khung |
| `shared/types.ts` | Kiểu dữ liệu dự án — Đợt 3 dựa trên đây |
| `src/components/` | Ý tưởng, Outline, Tài sản, Shot list, Prompt, Duyệt và sửa, Cài đặt |

Dữ liệu dự án lưu trong trình duyệt (localStorage), ảnh lưu ở IndexedDB (`xuong-phim-2`). Không trộn với dữ liệu bản cũ.

## Danh sách test

1. Cài đặt: thêm key, Kiểm tra báo "Dùng được"; Kho kiến thức không có lỗi.
2. Ý tưởng: Gợi ý cho tôi → 6 thẻ, mỗi thẻ một công thức. Loại vài thẻ rồi tạo lại → AI tránh ý đã loại.
3. Ý tưởng: Từ ý của tôi → có đoạn nhận xét + 3 thẻ giữ lõi ý. Xem biến thể trên một thẻ.
4. Tạo dự án → Outline: đủ nhân vật, bối cảnh (có mốc cố định), đạo cụ (có trạng thái sau nếu cần), khoá trái/phải, scene.
5. Sửa outline theo góp ý → chỉ chỗ được góp ý thay đổi; Hoàn tác trả lại bản trước.
6. Tài sản: style mặc định của thể loại đã điền sẵn; thử Đọc style từ ảnh.
7. Tạo tài sản → mỗi nhân vật có cụm mô tả tiếng Anh, prompt một góc, Character Reference Sheet (mẫu cũ giữ nguyên);
   đạo cụ có câu kết "no text…"; trạng thái sau có prompt "Same object as the reference image…";
   bối cảnh có sơ đồ + 2–4 góc; chỉ góc a có prompt, góc phụ ghi "Mới là kế hoạch".
8. Mọi prompt nhắc tài sản theo dạng `@tag (cụm mô tả)`.
9. Tạo ảnh ở Nano Banana → Nạp nhiều ảnh → AI gán @tag → duyệt → Gán. Nạp lẻ từng ô, Tải về, Xoá ảnh.
10. Sửa cụm mô tả ngay cạnh @tag → tải lại trang vẫn giữ.
11. Sửa outline thêm một nhân vật → bước Tài sản báo "Outline có thêm tag mới".
12. Tải file prompt → file .txt chứa mọi prompt ảnh theo thứ tự tạo.
13. Nạp ảnh góc a → "Viết prompt góc phụ" → sơ đồ đổi sang "(đã sửa theo ảnh góc a)", có dòng "AI thấy trong ảnh góc a",
    prompt góc phụ có đủ CAMERA / FRAME LAYOUT / OUT OF FRAME / LIGHT. Tạo ảnh góc phụ ở Nano Banana (nạp ảnh góc a làm tham chiếu)
    → so với góc a: máy phải đứng chỗ khác thật sự.
14. Cài đặt → Kiểm tra key: thấy kết quả riêng cho từng model. Sau mỗi lần gọi, thanh bên báo model và loại key vừa dùng.

Ghi lại chỗ nào kết quả chưa hay: phần lớn sẽ sửa bằng file trong `knowledge/`, không phải code.

### Test Đợt 3

15. Shot list: chọn S1 → Viết shot list. Mỗi clip 3–10 giây, mốc giây các shot nối liền; góc máy chỉ là a/b/c… của bối cảnh.
16. Sửa một clip: đổi số giây một shot → mốc thời gian và tổng giây tự tính lại. Lưu. Sang bước Prompt: clip đó báo đã sửa sau khi biên dịch.
17. Viết shot list S2 sau S1 → clip đầu S2 nối từ clip cuối S1; dòng "Thay đổi còn lưu" cộng dồn.
18. Prompt: "Biên dịch … clip" → prompt video đủ 6 khối, mọi tài sản dạng `@tag (cụm mô tả)`; dòng "Exactly N shots, hard cuts at …".
19. Clip chế độ khung đầu: có prompt ảnh khung đầu, chỉ nạp tài sản có trong khung; nút "Dùng khung cuối của clip trước" nếu có.
20. Chạy thật trong Flow (Omni Flash). Ghi lại: Omni có giữ đúng số shot không, có vẽ chữ "@tag" lên hình không, shot neo có giữ vị trí không
    (mục 7 của `knowledge/mo-hinh/omni-flash.md`).
21. Duyệt: gửi nhận xét + ảnh → câu sửa ngắn; chép câu sửa vào Flow sửa trên video. Chấm khung cuối → "Lưu ảnh cuối làm khung nối".
22. Tải danh sách clip (CSV) → mở bằng Excel/Google Sheets, tiếng Việt hiển thị đúng.
