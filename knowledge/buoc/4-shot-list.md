---
id: 4-shot-list
ten: Shot list (scene → clip → shot)
kich-ban-muc: [5, 6, 7.3]
module: khi-viet-shot-list
mo-hinh: co
---

# BƯỚC 4 — SHOT LIST

## Việc cần làm

Chia **một scene** thành các clip, mỗi clip thành 1–3 shot. Đây là nơi quyết định **mọi thứ nhìn thấy
được**: ai ở đâu, máy đặt ở góc nào, hành động gì, âm thanh gì. Bước prompt sau này chỉ dịch lại, không
quyết định thêm. Người dùng đọc và sửa trực tiếp kết quả của bước này.

Đầu vào: outline, tài sản (tag, cụm mô tả, góc máy của bối cảnh, hướng sáng), clip cuối của scene trước
(để nối), mục lục module tình huống, file mô hình (độ dài clip, chế độ, giới hạn ảnh).

## Mỗi clip gồm

```
CLIP [scene]-C[số] · [giây] · chế độ: nguyên liệu | khung đầu | khung đầu + cuối · độ khó [1–5]/5
Chuyển biến: [một câu — clip này thay đổi điều gì]
Bối cảnh: @tag · Ảnh nạp: [CHỈ tài sản thật sự nhìn thấy trong khung của clip + ảnh góc máy mà các shot dùng. Vật không có trong khung thì KHÔNG nạp — mỗi ảnh nạp thừa là một thứ model vẽ bừa vào cảnh. Chế độ khung đầu: đây là các ảnh dùng để tạo ảnh khung đầu]
Tình huống: [id module, nếu có]
Khoá: [số nhân vật · ai bên trái / phải · ai cầm gì ở shot nào]
Khung đầu: [chỉ khi chế độ khung đầu — mô tả tư thế tĩnh của mọi thứ trong khung]
Shot 1 [a-bs] · góc [id] · [cỡ cảnh] · [chuyển động máy]
   Ai ở đâu: …
   Hành động: … (nhịp con có mốc giây nếu có nhiều thay đổi)
Shot 2 …
Âm thanh: [tiếng động theo thời điểm] · thoại: [có/không] · nhạc: [có/không]
Thay đổi còn lưu sau clip: [TOÀN BỘ trạng thái còn hiệu lực tính đến hết clip, cộng dồn từ các clip trước cùng bối cảnh; không có thì ghi "—"]
Khung cuối: [LUÔN có, mọi clip — tư thế đứng yên của mọi nhân vật và vật cuối clip, theo trái/phải, gần/xa. Clip sau bắt đầu đúng từ đây]
Rủi ro: [một dòng, nếu có]
```

Cuối scene trả thêm: **tài sản còn thiếu** (tag cần ảnh mà chưa có, góc máy cần thêm, trạng thái sau cần tạo).

## Luật chia clip

- **Một clip = một chuyển biến.** Clip không có chuyển biến là thừa; clip có hai chuyển biến phải tách.
- **Độ dài** trong khoảng của file mô hình (Omni Flash: 3–10 giây). Thường 5–7 giây. Tổng độ dài các clip
  của scene khớp ước tính ở outline.
- **1–3 shot mỗi clip**, mỗi shot tối thiểu 2 giây (trừ shot neo 0,5–1 giây). Mốc giây của các shot nối
  liền và cộng đúng độ dài clip.
- **Shot chỉ dùng góc máy có sẵn** của bối cảnh, ưu tiên góc đã có ảnh. Góc chưa có ảnh vẫn dùng được nhưng phải ghi vào "tài sản còn thiếu". Cỡ cảnh: toàn / trung / cận / đặc tả. Chuyển động máy:
  đứng yên (mặc định) / lia theo / đẩy chậm vào / kéo chậm ra. Mỗi shot tối đa một chuyển động máy.
- **Ai ở đâu** ghi cho mọi nhân vật và đạo cụ có trong shot, theo trái/phải, gần/xa của khung.
- **Người không phải chủ thể** thì ghi rõ đang làm gì (đứng yên nhìn, nấp) — bỏ trống thì model tự cho cử động.
- **Mỗi clip chọn các module tình huống liên quan** từ mục lục và tuân theo nửa "Khi viết shot list" của chúng.
- **Độ khó**: 1 = một nhân vật, máy đứng yên, cử động nhỏ · 3 = tương tác vật lý hoặc 2–3 nhân vật ·
  5 = chuỗi va chạm, chuyển động nhanh, nhiều nhân vật. Độ khó ≥4 → xem lại có tách hoặc giấu được không.

## Liền mạch trong một scene (quan trọng)

Mỗi clip Flow tạo ra độc lập; không có gì tự giữ phòng, vị trí đồ vật, trang phục từ clip này sang clip sau.
Nên liền mạch phải được **cài vào dữ liệu**:

- **Mọi clip có "Khung cuối"**. **Shot 1 của clip sau, mục "Ai ở đâu", chép đúng vị trí trong "Khung cuối" của clip trước**
  (cùng trái/phải, cùng chỗ đồ vật), rồi mới tới hành động mới. Không tự dựng lại cảnh từ đầu.
- **Mọi vật nhìn thấy trong khung đều ghi ở "Ai ở đâu" của shot đó**, kể cả vật không hoạt động (đĩa cá trên bàn, vòng keo).
  Không ghi thì model tự vẽ thứ khác vào chỗ đó. Shot không có vật nào trong số "Thay đổi còn lưu" thì ghi rõ vì sao (ngoài khung).
- **Shot kiểu "establishing" 0,5–1 giây ở đầu clip** chỉ dùng khi thật cần; shot ngắn như vậy model hay vẽ sai bố cục. Ưu tiên
  shot đầu ≥ 2 giây, rộng đủ thấy mọi nhân vật và vật chính.
- **Clip sau cùng scene, cùng góc máy, không có nhân vật mới vào khung → dùng chế độ khung đầu**, khung đầu là ảnh chụp
  khung cuối thật của clip trước. Có nhân vật hoặc vật mới vào khung, hoặc đổi góc → chế độ nguyên liệu; app tự nạp thêm
  khung cuối thật của clip trước làm ảnh tham chiếu liền mạch.
- Clip chạy theo thứ tự trong scene (C01 → C02 → …), để mỗi clip có khung cuối thật của clip trước.

## Chọn chế độ Flow cho từng clip

| Chế độ | Chọn khi | Điều kiện |
|---|---|---|
| **Nguyên liệu** (mặc định) | Hầu hết các clip | Ảnh nạp không vượt giới hạn của file mô hình. Shot đầu ghi đủ vị trí. Clip ≥2 nhân vật có cắt cảnh → cân nhắc shot neo. |
| **Khung đầu** | Gag cần vị trí chính xác; hoặc clip nối khớp khung từ clip trước | **Mọi nhân vật, đạo cụ xuất hiện trong clip phải có sẵn trong khung đầu.** Nên là một cảnh liền. Có cắt sang góc khác → ghi rủi ro. |
| **Khung đầu + cuối** | Clip phải kết thúc đúng một trạng thái | Cả hai khung chứa đủ nhân vật, đạo cụ; mô tả cả "Khung đầu" và "Khung cuối". |

Clip dùng chế độ khung đầu để nối từ clip trước → khung đầu **chính là khung cuối** của clip trước;
clip trước phải có dòng "Khung cuối" và khung đó phải đứng được (module `noi-clip`).

## Thay đổi còn lưu — ghi cộng dồn

Dòng này là **ảnh chụp trạng thái** của bối cảnh sau clip, không phải nhật ký. Clip sau đọc đúng một dòng này của clip
trước cùng bối cảnh. VD clip 2 bẫy sập, clip 4 lọ muối đổ → dòng của clip 4 ghi cả hai:
"@baykep-sap nằm trên mép bàn; lọ muối đổ nghiêng cạnh mép bàn".

## Âm thanh

- Ghi tiếng động gắn với thời điểm (VD "tiếng TÁCH đúng lúc cắt sang shot 2").
- Thoại và nhạc luôn ghi rõ có hay không. Theo mục 5 của file kịch bản.

## Kiểm trước khi trả

- Đọc liền "Chuyển biến" của các clip thấy câu chuyện của scene chạy đúng outline.
- Clip đầu nối đúng trạng thái cuối của scene trước; clip cuối đạt đúng trạng thái cuối của scene này.
- Không tag nào chưa có trong tài sản (trừ khi đã ghi vào "tài sản còn thiếu").
- Mỗi tag trong "Ảnh nạp" đều được nhắc ở "Ai ở đâu" hoặc "Khoá" của ít nhất một shot, và ngược lại.
- Shot 1 của clip sau khớp "Khung cuối" của clip trước.
- Khoá trái/phải không bị lật giữa các clip.
- Mọi "thay đổi còn lưu" từ clip trước có mặt ở clip sau.
- Trạng thái cũ của đạo cụ không bị nạp sau khi đạo cụ đã đổi trạng thái.
