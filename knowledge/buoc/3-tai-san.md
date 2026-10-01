---
id: 3-tai-san
ten: Tài sản (style, nhân vật, đạo cụ, bối cảnh)
kich-ban-muc: [4, 6]
module: khong
mo-hinh: khong
---

# BƯỚC 3 — TÀI SẢN

## Việc cần làm

Từ outline, viết mọi thứ cần để người dùng tạo ảnh tham chiếu (bằng Nano Banana hoặc công cụ ảnh khác),
rồi nạp ảnh về app gắn đúng tag. Gồm bốn phần: style, nhân vật, đạo cụ, bối cảnh.

**Chỉ làm tài sản cho thứ xuất hiện từ 2 clip trở lên** hoặc có hình dạng quan trọng cho hành động.
Vai phụ xuất hiện một lần thì không cần tài sản, tả bằng chữ ở shot list.

## 1. Style của phim

- Một dòng tiếng Anh, dùng nguyên văn trong **mọi** prompt ảnh và video của phim.
- Nguồn: `style-mac-dinh` của thể loại, hoặc style mẫu người dùng chọn, hoặc style đọc từ ảnh tham chiếu.
- Mọi ảnh tài sản dùng **cùng một style**, để model ghép chúng mượt khi dùng làm nguyên liệu.

## 2. Nhân vật

Mỗi nhân vật:

```
@tag
Cụm mô tả (EN): 3–6 chữ, chỉ hình dáng — VD "the orange tabby cat". Dùng mãi mãi, không đổi.
Tuổi · Tính cách (chép từ outline)
Ngoại hình · Trang phục · Biểu cảm mặc định · Tỉ lệ so với nhân vật khác
Mô tả ngắn cho ô Note (VN): 1–2 câu, chỉ đặc điểm nhìn thấy được. Bắt buộc.
```

**Standard Image Prompt** (EN): một góc chính, có style của phim, nền trắng.

**Character Reference Sheet Prompt** — app ghép mẫu cố định dưới đây với phần mô tả nhân vật.
**Không chép lại mẫu**, chỉ viết phần `Character details` (toàn bộ mô tả nhân vật bằng tiếng Anh):

```
A professional character reference sheet, 4x2 grid layout, pure white background, high resolution. The subject is a single consistent character in all panels. Studio lighting, sharp focus, no text.
Top Row: 1. Front view of the head. 2. Side profile of the head. 3. Back view of the head. 4. Top-down view of the head.
Bottom Row: 1. Full-body front view. 2. Full-body side view. 3. Full-body back view. 4. Close-up of both hands and forearms.
Character details: [mô tả nhân vật]
```

Luật:
- Phong cách thiết kế theo thể loại (hoạt hình thiết kế theo tính cách; người thật mô tả như hồ sơ casting).
- Nhân vật có tỉ lệ kích thước với nhau thì ghi rõ trong mô tả.
- Màu nhận dạng của các nhân vật chính khác hẳn nhau và khác màu nền bối cảnh.
- Mọi prompt ghi tag theo dạng `@tag (cụm mô tả)`.

## 3. Đạo cụ

Tạo ảnh **trạng thái gốc** cho mọi đạo cụ chính.

```
@tag
Cụm mô tả (EN): VD "the small wooden snap trap"
Mô tả: hình dáng, chất liệu, màu, kích thước NEO VÀO CƠ THỂ nhân vật (VD dài bằng bàn chân trước của @muop)
Mô tả ngắn cho ô Note (VN): 1 câu
Prompt tạo ảnh (EN): nền trắng, ánh sáng studio, sắc nét,
  kết bằng đúng cụm: no text, no letters, no logos, no engraving or writing on the surface
```

- **Không có chữ trên thân vật** — model chép lại mọi chữ nhìn thấy.
- **Hình dáng phải cho phép hành động trong outline.** Cần hộp úp trùm lên nhân vật mà ảnh là hộp đóng kín
  → mâu thuẫn. Sửa ảnh (hộp mở nắp) hoặc báo để sửa hành động.
- **Trạng thái sau** (`@baykep-sap`): viết prompt **sửa từ ảnh gốc** — "Same object as the reference image,
  now [trạng thái]. Keep shape, material, color and size identical." Người dùng cũng có thể chụp từ video sau.

## 4. Bối cảnh

Mỗi bối cảnh gồm **sơ đồ** và **2–4 góc máy dựng sẵn**. Shot list chỉ được chọn trong các góc này.
Làm theo **hai lượt**, vì góc phụ chỉ viết đúng được khi đã nhìn thấy căn phòng thật:

- **Lượt 1 (khi tạo tài sản):** sơ đồ dự kiến + prompt ảnh **góc a** + **kế hoạch** các góc phụ
  (vị trí máy, hướng nhìn, thấy gì, hướng sáng). **Chưa viết prompt góc phụ.**
- **Lượt 2 (sau khi người dùng nạp ảnh góc a):** đọc ảnh góc a, **sửa sơ đồ theo ảnh thật**, rồi mới viết prompt
  các góc phụ, gọi tên đúng những đồ vật có trong ảnh.

```
@tag
Cụm mô tả (EN): VD "the sunny wooden kitchen"
Mô tả ngắn cho ô Note (VN): 1–2 câu
SƠ ĐỒ
- Mốc cố định và vị trí của chúng, tính theo một điểm nhìn cố định (VD "đứng ở cửa ra vào nhìn vào": tường trái, tường trong cùng…).
- Nguồn sáng chính (cửa sổ, đèn) nằm ở đâu, thời điểm trong ngày.
- Tỉ lệ: kích thước mốc so với nhân vật (VD lỗ chuột vừa lọt @ti; @ti cao bằng nửa lọ muối).
GÓC MÁY — mỗi góc:
- id: a, b, c… → tag ảnh: @tag-a, @tag-b…
- Mô tả (VN) và mô tả (EN): máy đặt ở đâu, cao bao nhiêu, nhìn về phía nào, thấy những mốc nào.
- Hướng sáng trong khung (EN): VD "light from the window on the left side of the frame".
- Prompt tạo ảnh (EN): góc a ở lượt 1, góc phụ ở lượt 2.
```

### Chọn góc phụ — ưu tiên góc dễ tạo

Công cụ sửa ảnh **bám rất chặt bố cục của ảnh tham chiếu**. Góc càng xa góc a, ảnh càng dễ hỏng
(máy không dời, chỉ dán thêm đồ vật vào tiền cảnh; phần tường chưa thấy bị vẽ bừa).

| Loại góc | Độ khó | Dùng khi |
|---|---|---|
| **Đẩy vào một khu vực đã thấy trong góc a** (cận bàn, cận lỗ chuột, cận bếp lò) | Dễ | Mặc định — hầu hết gag diễn ra ở vài khu vực |
| **Hạ máy thấp** ngang sàn / ngang mặt bàn, cùng hướng góc a | Dễ – vừa | Góc nhìn của nhân vật nhỏ |
| **Xoay máy sang một bức tường đã thấy** trong góc a | Vừa | Cần thấy trọn một bức tường |
| **Nhìn ngược về phía cửa ra vào** (phần chưa từng thấy) | Khó | Chỉ khi truyện bắt buộc; phải tả đầy đủ bức tường đó |

Chỉ chọn góc mà truyện thật sự cần. Hai góc tốt hơn bốn góc hỏng.

### Prompt góc a (lượt 1)

- Tả đủ mọi mốc cố định với **vị trí trong khung** (trái / giữa / phải, gần / xa), chất liệu, màu.
- **Không nhắc tag đạo cụ** trong prompt bối cảnh. Đồ nội thất cố định tả bằng lời thường.
  (Nhắc "red checkered tablecloth" trong prompt bối cảnh từng làm mọc thêm cả tấm thảm caro dưới sàn.)
- Tả rõ bề mặt: "bare tiled floor", "plain wall" — những chỗ muốn trống thì nói rõ là trống.
- Ghi tỉ lệ khung của phim (VD "Vertical 9:16").

### Prompt góc phụ (lượt 2) — phải ép đổi góc máy

Viết theo khuôn dưới đây, **đủ cả năm phần**:

```
{style}. {Vertical 9:16}.
NEW CAMERA ANGLE of the same room shown in the reference image. Use the reference ONLY for the room's
design (walls, floor, furniture, materials, colors, style). Do NOT reuse its framing or camera position.
CAMERA: placed {ở đâu}, at {độ cao}, facing {hướng}, {cỡ cảnh: wide / medium / close}.
FRAME LAYOUT: left side: {…}; center: {…}; right side: {…}; foreground: {…}; background: {…}.
OUT OF FRAME: {những mốc của góc a không còn thấy — VD "the window is out of frame to the left"}.
LIGHT: {hướng sáng trong khung mới, suy ra từ vị trí cửa sổ}.
Every object keeps the same size and position in the room as in the reference image; nothing is added.
Empty room, no characters, no text.
```

- Mọi đồ vật gọi đúng như **thấy trong ảnh góc a** (VD ảnh có bếp lò trắng, bồn rửa, kệ gia vị gỗ → gọi đúng tên đó).
- FRAME LAYOUT phải **khác rõ** bố cục góc a; nếu gần giống thì góc đó thừa.
- Đồ vật ở tiền cảnh chỉ được là thứ **đã có trong phòng**, đúng kích thước. Không phóng to đồ vật để "tạo tiền cảnh".

## Ví dụ bối cảnh

```
@bep · Cụm mô tả: the sunny wooden kitchen
SƠ ĐỒ (hướng tính khi đứng ở cửa ra vào nhìn vào bếp)
- Tường trái: cửa sổ lớn; lỗ chuột ở chân tường trái, gần góc trong cùng.
- Tường trong cùng: bếp lò. Bàn gỗ giữa phòng, lệch về phía tường phải; lọ muối và bình hoa trên bàn.
- Buổi sáng, nắng vào từ cửa sổ tường trái.
- Trục: @muop thường ở phía bàn, @ti ở phía lỗ chuột. Máy luôn đứng ở nửa phòng phía cửa ra vào
  → @muop luôn bên phải khung, @ti bên trái.
- Tỉ lệ: @ti cao bằng nửa lọ muối; lỗ chuột vừa lọt @ti; @muop đứng thẳng thì đầu cao hơn mặt bàn.
GÓC a — góc chính 3/4, từ cửa ra vào nhìn vào: cửa sổ và lỗ chuột bên trái khung, bàn bên phải, bếp lò phía sau.
        Light: from the window on the left side of the frame.
GÓC b — cận lỗ chuột, máy thấp ngang sàn, cùng hướng góc a (loại dễ: đẩy vào khu vực đã thấy).
        Light: from the left side of the frame.
GÓC c — sát mặt bàn, cùng hướng góc a: lọ muối, bình hoa, mép bàn (loại dễ: hạ máy).
        Light: from the left side of the frame.
```
### Ví dụ prompt góc phụ (lượt 2, viết từ ảnh góc a thật)

Ảnh góc a cho thấy: cửa sổ và kệ gia vị gỗ ở tường trái; bếp lò trắng và bồn rửa ở tường trong cùng; lỗ chuột
hình vòm ở chân tường, bên phải tủ bồn rửa; bàn caro đỏ và hai ghế gỗ giữa phòng. Góc cận lỗ chuột:

```
2D classic slapstick cartoon, hand-drawn look, clean bold outlines, vibrant flat colors. Vertical 9:16.
NEW CAMERA ANGLE of the same kitchen shown in the reference image. Use the reference ONLY for the room's
design (walls, floor, furniture, materials, colors, style). Do NOT reuse its framing or camera position.
CAMERA: placed on the floor two tiles in front of the small arched mouse hole at the base of the back wall,
right of the sink cabinet, at floor level, facing the mouse hole, close shot.
FRAME LAYOUT: left side: the lower wooden door of the sink cabinet; center: the small black arched mouse hole
in the cream wall above the white baseboard; right side: the lower drawers of the right-hand counter;
foreground: large cream and pale-blue floor tiles seen from very low; background: the cream wall rising out of frame.
OUT OF FRAME: the window, the spice shelf, the dining table and chairs, the stove.
LIGHT: soft morning light from the left side of the frame, a pale sunbeam across the floor tiles.
Every object keeps the same size and position in the room as in the reference image; nothing is added.
Empty room, no characters, no text.
```
