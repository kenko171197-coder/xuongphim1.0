## 3.10 — Định dạng xuất mỗi beat

```
### BEAT [scene]-B[số] — [tên beat]

BẢNG KIỂM
- Module mượn: [không / M.. — lý do, VD "M09 — beat có đòn đánh"]
- Frame nguồn: @frame[n] — [cận/trung/rộng] · Shot đích: [cận/trung/rộng]
- Khả thi từ frame: [...]
- Đạo cụ chiều xuôi: @[tag] — lên hình lần đầu ở B[n] / CHƯA TỪNG
- Đạo cụ chiều ngược: [khung tới vùng nào · vùng đó có gì · đã @tag chưa]
- Quét vật lý: [kiểu # / không chạm] → [cách tránh]
- Hướng & đích qua điểm cắt: [vật] rời khung ở [mép nào] → shot sau vật ở [đâu] · [khớp / không khớp] · Cơ chế: [vật tự chuyển động nào — đúng cơ chế thật và chiều lực chưa / không có]
- Chuỗi nhân quả: [A] → [B] → … (từng mắt xích, kể cả cơ chế trung gian) = [n] tầng · [k] shot · Nguyên nhân đã lên hình ở: B[n]
- Số chuyển biến: [n]
- Bản đồ vị trí: [ai/vật — trái/giữa/phải — gần/xa — hướng — biết/không biết] · Trục 180: [không áp / A trái nhìn phải – B phải nhìn trái]
- Khoá cứng 3.5: [có rơi/va chạm không?] → Prompt Type: [...]
- Vùng nhìn mỗi shot: S1 [...] · S2 [...]
- Beat sau cần gì: [...]
- Điểm tựa frame cuối: [bộ phận nào chạm mặt nào]
- Đối chiếu: [nguyên nhân · hướng · nhận biết · góc máy · vị trí · đạo cụ — đã thành câu trong Script chưa]

Thiết lập: [n]s · [Prompt Type] · [Cinematic] · [Pacing] · Tỉ lệ: [16:9 / 9:16] · Góc: [từng shot]
Ảnh nạp + ô Note:
- @... — Note: "..."

[Dòng đọc frame — nếu dùng frame]

> [ô Script]
> Âm thanh: [...]
> Style: [...]

Lý do: [một câu]
Ghi chú hậu kỳ:
- @frameNa — [chụp gì, dùng cho beat nào]
- ⚠️ Không dùng @frameNb — [lý do, nếu có]
```

### Bảy ô chặn — không điền được nếu beat sai

|Ô                    |Hợp lệ khi                                  |Không đạt → xử lý                    |
|---------------------|--------------------------------------------|-------------------------------------|
|Chuỗi nhân quả       |= 1 tầng, chỉ ra được beat nguyên nhân      |Tách beat / cắt cơ chế / trồng shot  |
|Số chuyển biến       |= 1                                         |Tách beat                            |
|Đạo cụ chiều xuôi    |Mọi @tag chỉ ra được một beat               |Trồng ở beat trước hoặc bỏ           |
|Bản đồ vị trí        |Khoảng cách khớp thời gian, hướng giữ qua cắt|Sửa vị trí hoặc sửa thời điểm        |
|Khoá cứng 3.5        |Prompt Type khớp rủi ro                     |Đổi sang Multishot                   |
|Vùng nhìn mỗi shot   |Mỗi shot đúng một vùng                      |Tách shot                            |
|Điểm tựa frame cuối  |Nêu được bộ phận nào chạm mặt nào           |Chọn frame shot khác hoặc viết lại   |

