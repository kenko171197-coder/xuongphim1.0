# PHẦN 0 — TÁM NGUYÊN NHÂN GỐC

> Mọi luật ở Bước 1 và Bước 3 đều là hệ quả của tám điều dưới đây. Gặp tình huống không có luật nào bao được, quay lại đây và suy ra.

## 0.1 — Veo không có trí nhớ

Mỗi lần chạy, Veo **dựng lại thế giới từ đầu**. Nó không biết beat trước có gì.

Thứ muốn thấy trên màn hình phải được đưa vào **mỗi lần chạy**, qua một trong ba đường:

|Đường                 |Dùng cho                                 |
|----------------------|-----------------------------------------|
|**Ảnh tham chiếu**    |Nhân vật, đạo cụ — giữ hình dáng         |
|**Frame nối**         |Bối cảnh, bố cục, vị trí — giữ khung hình|
|**Chữ trong ô Script**|Mọi thứ còn lại                          |

Thứ nào **không có đường nào** → Veo bịa ra, và mỗi beat bịa một kiểu.

→ Ô kiểm: `Đạo cụ chiều xuôi`, `Đạo cụ chiều ngược` (3.10).

## 0.2 — Veo mô phỏng HÌNH ẢNH, không mô phỏng VẬT LÝ

Veo được huấn luyện để **trông đúng**, không phải để **hành xử đúng**. Các bộ đo vật lý cho thấy mọi model tạo video đều yếu ở định luật cơ bản, và viết prompt khéo hơn chỉ sửa được vài lỗi đơn giản. **Chiến lược: TRÁNH, không SỬA.**

### Tám kiểu thất bại

|#|Kiểu                          |Biểu hiện                                                              |
|-|------------------------------|-----------------------------------------------------------------------|
|1|Ma sát                        |Vật trôi thay vì trượt, không dừng đúng chỗ                            |
|2|Va chạm & nảy                 |Đụng nhau không có phản lực                                            |
|3|Biến dạng vật liệu mềm        |Vật mềm không lún, không giãn                                          |
|4|Truyền lực qua chuỗi          |A đụng B làm B đụng C — Veo nhảy thẳng sang kết quả                    |
|5|Chuyển động nhanh             |Bị bỏ sót có hệ thống                                                  |
|6|Xoay tròn                     |Méo giữa cú quay, mất nhận dạng                                        |
|7|Nhiều hành động đồng thời     |Một chủ thể làm hai ba việc cùng lúc → chuyển động bất ổn              |
|8|Đổi trạng thái vật chất       |Nguyên → vỡ. Veo nhảy phắt sang trạng thái sau như biến hình           |

### Cách tránh chung

|Vấn đề                   |Cách tránh                                                                               |
|-------------------------|-----------------------------------------------------------------------------------------|
|Chuỗi truyền lực         |**Cắt bỏ cơ chế.** Shot nguyên nhân, cắt, shot kết quả                                   |
|Rơi / va chạm / vỡ       |**Giấu ở điểm cắt** (Multishot) hoặc **che khuất** (Continuous). Chi tiết ở module thể loại|
|Chuyển động nhanh        |Bỏ đoạn giữa: beat trước lấy đà, beat sau hậu quả                                        |
|Vật cần dừng ở chỗ bất ổn|Cho một bộ phận cơ thể **chủ động giữ**. Mép bàn, gờ, bậc không tính là lực cản          |

**Khi không có cách nào:** nói thẳng với người dùng beat này không khả thi, đề xuất viết lại. Đừng viết cho khéo rồi để họ tốn lượt chạy.

→ Ô kiểm: `Quét vật lý`, `Khoá cứng 3.5` (3.10).

## 0.3 — Kế hoạch viết trước, sự thật đến sau

Bảng beat viết khi **chưa có frame nào**. Frame Veo trả về **mới là sự thật**.

**Luật: ẢNH THẮNG KỊCH BẢN.** Lệch nhau → theo frame, sửa kịch bản.

- Không chốt frame và góc máy trong bảng beat. Chốt sau khi đọc frame.
- Mỗi beat hỏi: *hành động dự kiến có dựng được từ khung hình này không?*
- Mỗi beat hỏi: *frame cuối beat này phải cho thấy gì để beat sau quay được?*

→ Ô kiểm: `Khả thi từ frame`, `Beat sau cần gì` (3.10).

## 0.4 — Một beat chứa ĐÚNG một chuyển biến

**TRẦN.** Beat hợp lệ thoả đồng thời:
**(a)** đúng **một** chuyển biến cảm xúc, và
**(b)** đúng **một** tầng nhân quả trực tiếp (A đụng B được; A đụng B làm B đụng C thì không).

Quá tải → Veo tua nhanh hoặc lặng lẽ bỏ phần khó nhất.

**SÀN.** Veo không giữ được sự tĩnh. Mỗi beat phải có **ít nhất một sự kiện nhìn thấy được**: vật đổi vị trí, bộ phận cơ thể tác động lên thứ gì đó, người ra hoặc vào khung. Beat chỉ đổi biểu cảm là **beat rỗng** → rút 4s, gộp, hoặc thêm một hành động vật lý nhỏ.

**LUẬT GỘP.** Nhiều chuyển biến thuộc **cùng một cú** (mở ra → hụt hẫng → nổ) thì gộp một beat. Chỉ cắt beat khi hai nhịp tách rời về thời gian hoặc không gian.

**LUẬT CÚ NGÃ.** Một cú ngã, va chạm, truyền trọng lượng phải nằm **trọn trong một beat**. Ranh giới beat chỉ đặt ở điểm nghỉ: trước khi ngã, hoặc sau khi đã nằm yên. Frame nối là ảnh tĩnh, không mang vận tốc.

⚠️ Cách đếm tầng nhân quả: **viết ra chuỗi rồi đếm mũi tên**. `còi tàu → giật mình → hộp văng → hộp trúng Jerry` = 3 tầng, không phải 1.

→ Ô kiểm: cột `CB`, `NQ` (1.6) · `Chuỗi nhân quả`, `Số chuyển biến`, `Điểm tựa frame cuối` (3.10).

## 0.5 — Chỉ ô Script mới lên phim

Veo (qua app PromptLabs) **chỉ đọc ô The Script** và ô Note của ảnh. Bảng beat, bảng kiểm, lý do, ghi chú hậu kỳ chỉ để người dùng đọc.

**Mọi ý đồ đã quyết định phải được viết thành câu trong ô Script** — đặc biệt ba thứ hay bị bỏ quên:

1. **Nguyên nhân gắn với hành động**: *“còi tàu rú lên; @tom giật nảy mình”*, không phải tiếng còi nằm lẻ loi ở dòng Âm thanh.
1. **Hướng và đích**: *“hộp bay vút lên cao, thẳng về phía trên đầu @jerry”*, không phải *“hộp bay lên cao”*.
1. **Nhận biết**: *“@jerry quay lưng, không hề hay biết”* khi cú gag cần sự bất ngờ.

→ Ô kiểm: `Đối chiếu` (3.10).

## 0.6 — Khán giả không có trí nhớ về cái chưa thấy

**Mọi sự kiện phải có nguyên nhân ĐÃ LÊN HÌNH.**

1. **Mắt xích phải lên hình.** Chỉ ra được beat nào cho thấy nguyên nhân. Không chỉ được → trồng thêm shot.
1. **Hình ảnh nhắc.** Nguyên nhân và hậu quả cách nhau quá một beat → cần khung hình giữ mạch (vật chông chênh, dây căng dần).
1. **Đích đến phải từng lên hình.** Nhân vật lao về đâu, ném về hướng nào — nơi đó phải đã xuất hiện.
1. **Động cơ cũng là nguyên nhân.** Viết hành vi nhìn thấy được thể hiện động cơ, không viết suy nghĩ.

Không chấp nhận: *“cảm xúc của B03”*, *“động cơ nhân vật”*, *“khán giả tự hiểu”*.

→ Ô kiểm: cột `Nguyên nhân ở` (1.6) · `Nguyên nhân` (3.10).

## 0.7 — Bố cục không gian phải nhất quán

Veo không tự giữ được **ai đứng ở đâu, cách nhau bao xa, đi theo hướng nào** giữa các shot và các beat. Sai chỗ này thì nhân quả vỡ dù từng shot đều đẹp.

*Lỗi đã gặp: Tom phải đứng đủ gần để hất hộp trúng Jerry, nhưng lại phải đủ xa để tới muộn ở shot sau. Kịch bản đòi hai điều ngược nhau, Veo chọn bên nào cũng lộ chỗ vô lý.*

**Sáu luật:**

1. **Bản đồ vị trí.** Trước khi viết beat, ghi cho mỗi nhân vật/đạo cụ: trái – giữa – phải khung, gần – xa máy, quay mặt hướng nào.
1. **Khoảng cách phải khớp thời gian.** Nhân vật đứng xa thì cần thời gian để tới; nhân vật đứng gần thì phải có mặt ngay. Kiểm tra: *vị trí ở shot trước có giải thích được thời điểm xuất hiện ở shot sau không?*
1. **Hướng chuyển động giữ nguyên qua cú cắt.** Đi từ trái sang phải ở shot trước thì vào khung từ bên trái ở shot sau. Vật bay về phía ai thì shot sau vật rơi gần người đó.
1. **Chiều sâu viết bằng kích thước.** *“to, sát máy”* / *“nhỏ, ở tận cuối hành lang”* — Veo hiểu kích thước tốt hơn chữ *“phía sau”*.
1. **Trục 180 độ khi hai bên đối mặt.** Áp dụng mỗi khi hai nhân vật (hoặc nhân vật và một vật/sinh vật) **đối mặt nhau** và cảnh **cắt qua lại** giữa hai bên: nói chuyện, rình nhau, đối đầu, đánh nhau.
   - Kẻ một đường thẳng tưởng tượng nối hai bên. **Máy luôn đứng ở cùng một phía** của đường đó suốt cảnh.
   - Hệ quả: nếu A ở **bên trái** khung và nhìn **sang phải**, thì ở mọi shot quay riêng B, B phải nhìn **sang trái**. Cắt qua lại, khán giả thấy hai bên nhìn vào nhau.
   - Vượt trục (máy sang phía bên kia) → B cũng nhìn sang phải, trông như hai bên cùng quay một hướng. Khán giả thấy “sai sai” mà không hiểu vì sao.
   - **Ghi hướng nhìn trong ô Script ở mọi shot**, kể cả shot chỉ có một người: *“@tom ở bên trái khung, nhìn sang phải về phía @jerry ngoài khung”*. Veo không tự biết luật này — không ghi thì mỗi shot nó chọn hướng ngẫu nhiên.
   - Muốn đổi trục giữa cảnh → cần một **shot rộng thấy cả hai bên** (hoặc nhân vật di chuyển trong khung sang phía bên kia) trước khi cắt tiếp.
   - Với khung dọc 9:16: vẫn giữ luật, nhưng vì hai bên khó đứng cạnh nhau, ưu tiên tách thành các shot một người, mỗi shot ghi rõ hướng nhìn.
1. **Điểm rơi nằm ngay dưới điểm rời.** Vật rơi tự do rơi thẳng xuống ngay dưới chỗ nó rời. Ai bị trúng phải đứng **ngay dưới chỗ đó** — ghi trong Bản đồ vị trí. Muốn vật bay xa hơn thì phải có lực đẩy theo hướng rõ ràng (dây kéo, cú hất) và ghi hướng đó. Vật rời khung ở mép nào, Veo hiểu shot sau vật **quay lại từ phía đó** (rời mép trên → shot sau thành "rơi từ trên xuống").
   *Lỗi đã gặp: bàn ủi rơi thẳng đứng từ mép nóc tủ nhưng mèo đang đứng giữa sàn, cách tủ một đoạn.*

→ Ô kiểm: `Bản đồ vị trí` (3.10).

## 0.8 — Thứ tự ưu tiên khi các luật đánh nhau

```
0.2 (vật lý) > 0.4 (một chuyển biến) > 0.6 (nhân quả) = 0.7 (không gian)
             > 0.3 (ảnh thắng kịch bản) > 3.8 (nghệ thuật cắt)
```

**Vật lý thắng kịch tính.** Cú máy đẹp mà Veo dựng hỏng thì vô giá trị.

-----

## Ba giới hạn phải chấp nhận

**1. Một lần chạy chưa đủ để kết luận.** Veo có yếu tố ngẫu nhiên giữa các lần chạy. Beat hỏng → chạy lại **2–3 lần** trước khi kết luận. Lỗi **lặp lại ở mọi lần** là lỗi do cách viết → viết lại beat. Lỗi chỉ gặp một lần → có thể chỉ là may rủi, chọn bản tốt nhất.

**2. Không bản nào hoàn hảo.** Lấy đoạn tốt nhất từ vài bản rồi cắt ghép khi dựng.

**3. Sai lệch tích luỹ.** Lệch ở beat 3 truyền tới beat 4, 5, 6. Phát hiện lệch thì xử lý ngay.

