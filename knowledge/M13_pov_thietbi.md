# M13 — POV THIẾT BỊ (CAMERA AN NINH, HÀNH TRÌNH, BODYCAM, MÁY QUAY CŨ)

> **MODULE NÀY CHỈ ÁP DỤNG KHI video giả lập hình ảnh ghi từ một thiết bị: camera an ninh, camera cửa, camera hành trình, camera gắn người, máy quay cầm tay cũ, điện thoại quay vội.**
> Module này lo **hình thức quay**. Nội dung hài → dùng kèm M01 (hoạt hình) hoặc M14 (người thật). Nội dung kinh dị → kèm M12. Thường dùng như **module phụ**.

-----

## 1. Veo mạnh và yếu ở thể loại này

**Mạnh:** hạt nhiễu, độ phân giải thấp, ống kính mắt cá, góc cao cố định, đen trắng hồng ngoại ban đêm, rung theo bước chân hay theo xe. Trào lưu camera an ninh ghi lại con vật hoặc nhân vật làm trò rất hợp với Veo.
**Yếu:**
- **Chữ in trên hình** (mốc giờ, chữ REC, số camera) — Veo vẽ chữ không ổn định, số có thể nhảy lung tung.
- Veo quen làm phim đẹp → máy dễ **tự lia, tự đổi góc, tự cắt** như điện ảnh, phá cảm giác thiết bị.
- Hành động nhỏ ở xa trong khung rộng dễ nhoè.

## 2. Bảng thiết bị — chọn một, ghi đủ dấu hiệu

|Thiết bị              |Vị trí máy                                        |Dấu hiệu hình ảnh                                       |Âm thanh                                   |
|----------------------|--------------------------------------------------|--------------------------------------------------------|-------------------------------------------|
|**Camera an ninh**    |Gắn cao ở góc trần, chếch xuống, **cố định tuyệt đối**|Góc rộng, mắt cá nhẹ, hạt nhiễu, độ phân giải thấp; ban đêm đen trắng hồng ngoại, mắt sáng trắng|Thường không có, hoặc tiếng lọt vào xa, rè|
|**Camera cửa**        |Ngang ngực, nhìn thẳng ra trước cửa               |Mắt cá **mạnh**, méo cong ở rìa, màu hơi bạc             |Tiếng ngoài hiên, lẫn gió vào micro        |
|**Camera hành trình** |Gắn kính lái, nhìn ra đường                       |Nắp capo ở mép dưới khung, rung nhẹ theo mặt đường       |Tiếng động cơ, tiếng lốp, tiếng người trong xe|
|**Bodycam**           |Gắn giữa ngực người đeo                           |Mắt cá, **rung theo từng bước**, tay người đeo thò vào khung|Tiếng thở, gió vào micro, tiếng bước chân |
|**Máy quay cầm tay cũ**|Cầm tay                                          |Rung, zoom giật cục, màu phai, vệt nhiễu ngang           |Tiếng người cầm máy nói, rè nhẹ            |

## Khung truyện (dùng cho 1.2a)

|Khung                                 |Móc                                   |Đẩy                                      |Lật                                         |Chốt                                         |
|--------------------------------------|--------------------------------------|-----------------------------------------|--------------------------------------------|---------------------------------------------|
|**Camera ghi lại điều không ai thấy** |Khung hình bình thường, trống         |Một chủ thể xuất hiện, làm điều lạ dần   |Sự việc bất ngờ nhất                        |Khung trở lại trống — hoặc chủ thể nhìn thẳng vào camera|
|**Khoảnh khắc ngẫu nhiên**            |Hoạt động thường ngày trong khung     |—                                        |Điều bất ngờ xảy ra (hài hoặc lạ)           |Phản ứng của người/vật trong khung           |
|**Chuỗi nhiều camera**                |CAM 1: chủ thể đi qua                 |CAM 2, CAM 3: lần theo đường đi          |Camera cuối: chủ thể biến mất hoặc làm điều lạ|Khung trống                                |

## 3. Luật riêng

### 3a. Máy của thiết bị không “làm phim”

`THAY LUẬT LÕI 3.5 (chọn Prompt Type)`: mặc định **`Continuous`, máy đứng yên** (camera an ninh, camera cửa) hoặc **chỉ rung theo vật mang nó** (xe, người đeo). Ghi rõ: *“máy cố định tuyệt đối, không lia, không zoom, không cắt cảnh”*.

Nhiều góc camera an ninh → `Multishot`, **mỗi shot là một camera khác**, câu mở đầu mỗi shot nêu vị trí gắn của camera đó. Vẫn áp khoá cứng 3.5 của lõi khi có rơi/va chạm.

### 3b. Mở đầu mỗi beat bằng câu nhận dạng thiết bị

```
Hình ảnh từ [thiết bị] gắn ở [vị trí], [góc nhìn], [dấu hiệu hình ảnh trong bảng mục 2].
```

VD: *“Hình ảnh từ camera an ninh gắn cao ở góc trần một cửa hàng tiện lợi, chếch xuống quầy thu ngân, góc rộng mắt cá nhẹ, đen trắng hồng ngoại, hạt nhiễu.”*

### 3c. Chữ trên hình: mốc giờ, REC, số camera

Theo thứ tự ưu tiên:
1. **Chèn ở hậu kỳ** — cách chắc chắn nhất. Script ghi *“không có chữ trên hình”*.
2. Cần Veo vẽ → giữ **ngắn và đơn giản**: *“góc trên bên phải có mốc giờ nhỏ và chấm đỏ REC”*. Không yêu cầu số giây chạy đúng. Chấp nhận có thể phải chạy lại.

### 3d. Chủ thể không biết có camera

Hành động diễn ra tự nhiên như không ai quan sát. Ghi rõ vị trí trong khung cố định và **đường vào – ra khung** (lõi 0.7): *“@meo đi vào từ mép trái, dừng giữa khung trước tủ lạnh”*. Gag “chủ thể nhìn thẳng vào camera” → để ở **Chốt**, ghi rõ *“quay mặt nhìn thẳng lên camera”*.

### 3e. Hành động đủ to trong khung rộng

Khung rộng làm chủ thể nhỏ. Hành động chính ở **khoảng giữa khung, không quá xa**, động tác rõ và chậm vừa. Chi tiết nhỏ (bàn tay lấy đồ) → đặt chủ thể gần camera hơn.

## 4. Âm thanh

Theo cột âm thanh của bảng mục 2. Âm thanh của thiết bị **kém hơn đời thật**: rè, xa, méo. Ghi rõ *“âm thanh thu từ micro nhỏ của camera, rè và xa”*. Không tả nhạc.

## 5. Thiết kế (Bước 2)

Theo module nội dung đi kèm (M12, M14, M01…). Nhân vật cần **nhận ra được ở độ phân giải thấp**: màu áo tương phản, dáng đặc trưng.

## 6. Style gợi ý

```
grainy CCTV security camera footage, high angle, wide lens, low resolution, black and white night vision
dashcam footage, wide angle, slight vibration, natural daylight, realistic
```

Module nội dung đi kèm vẫn quyết định phần còn lại của style (hoạt hình hay người thật).

## 7. Ví dụ ô Script đạt chuẩn

```
Hình ảnh từ camera an ninh gắn cao ở góc trần một gian bếp, chếch xuống, góc rộng mắt cá nhẹ, đen trắng hồng ngoại, hạt nhiễu, máy cố định tuyệt đối, không lia, không zoom. Tủ lạnh ở giữa khung. @gau đi vào từ mép trái khung, bước chậm, nhìn quanh, dừng trước tủ lạnh, dùng chân trước kéo cửa tủ mở ra. Ánh sáng trắng từ tủ lạnh hắt lên @gau. @gau đứng yên một nhịp, rồi quay mặt nhìn thẳng lên camera. Không có chữ trên hình.
Âm thanh: âm thanh thu từ micro nhỏ của camera, rè và xa; tiếng móng lạch cạch trên sàn gạch, tiếng cửa tủ lạnh bật mở, tiếng máy lạnh ù ù.
Style: grainy CCTV security camera footage, high angle, wide lens, low resolution, black and white night vision
```
