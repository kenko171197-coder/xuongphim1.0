## 1.6 — Bảng kiểm kịch bản và dừng

### Phần A — Rà từng beat (không bỏ beat nào)

```
Beat | Mức | Sự kiện | CB | NQ (viết chuỗi)          | Kiểu thất bại | Nguyên nhân ở | Không gian
-----|-----|---------|----|--------------------------|---------------|---------------|-----------
B01  |  1  |   có    | 1  | còi → giật mình = 1      | sạch          | mở phim       | ổn
```

|Cột          |Hợp lệ khi                                                            |
|-------------|----------------------------------------------------------------------|
|Sự kiện      |= có. “KHÔNG” là beat rỗng                                            |
|CB           |= 1                                                                   |
|NQ           |Viết TỪNG mắt xích, kể cả cơ chế trung gian — không gộp. Đếm mũi tên = 1; nhiều hơn chỉ hợp lệ khi mỗi tầng thêm có **shot riêng** (cắt bỏ cơ chế, 3.8) — ghi số shot. VD `đuôi giật dây → bàn ủi trượt → rơi = 2 tầng · 3 shot`|
|Kiểu thất bại|Rà đủ 8 kiểu, ghi `sạch` nếu không chạm — không bỏ trống              |
|Nguyên nhân ở|Chỉ ra một beat cụ thể                                                |
|Không gian   |`ổn` hoặc ghi mâu thuẫn vị trí/khoảng cách/hướng/trục 180 (0.7)       |

### Phần B — Toàn phim

```
KIỂM TRA KỊCH BẢN
Module: [M.. + M.. nếu có] · Tỉ lệ khung: [...] · Hướng: [...] · Cấu trúc: [...]
Khung truyện: Móc ở B[n] — 2 giây đầu thấy/nghe: [...] · Lật ở B[n] · Chốt: [khung cuối]
  → Móc có được trả lời không? [có, ở B[n] / KHÔNG]
Thời lượng: mong muốn [x]s — kịch bản [m] beat ([y]s) → [chênh lệch, đề xuất, KHÔNG tự cắt]
Thời lượng beat: [mọi beat đều 4/6/8s?]

NHỊP PHIM
Beat rỗng: [n]/[N] ([z]%)          → quá 25% = lê thê
Beat dài nhất: B[n] — [có phải nhịp đắt nhất không?]
Cú punch nằm ở: B[n] — trải [k] beat → quá 2 = mất đột ngột

VẤN ĐỀ
Beat nặng (0.4): ...
Beat rỗng (0.4): ...
Mắt xích hụt (0.6): ...
Mắt xích nhiều hơn shot (0.2 #4): ...
Mâu thuẫn không gian (0.7): ...
Rủi ro kỹ thuật (0.2): B[n] — kiểu [#] · [cao/trung bình] · [cách tránh]
Cú ngã vắt beat (0.4): ...
Thoại ngoài khung (3.7): ...
Đạo cụ đổi hình dáng (1.5): ...
Nhịp bị lược so với ý tưởng gốc: [nhịp nào] — [có giữ được bằng cắt shot không?]

Ước tính: ~[n] lượt chạy
```

⚠️ **Báo, không tự sửa.** Người dùng quyết.

**Cổng chặn:** beat rủi ro cao, mắt xích hụt, mắt xích nhiều hơn số shot, mâu thuẫn không gian, cú ngã vắt beat, hoặc beat rỗng quá 25% → **không sang Bước 3** khi chưa chốt hướng xử lý. Người dùng chọn: (1) đổi động tác · (2) tách/gộp beat · (3) chấp nhận rủi ro → ghi `[đã miễn trừ]`.

**Luật không lược im lặng:** nhịp trong ý tưởng gốc bị bỏ vì lý do kỹ thuật → phải báo. **Cắt bỏ CƠ CHẾ, không cắt bỏ BEAT CÂU CHUYỆN.**

