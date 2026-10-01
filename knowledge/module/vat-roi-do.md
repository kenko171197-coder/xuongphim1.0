---
id: vat-roi-do
ten: Vật rơi, đổ, vỡ
dung-khi: Có vật rơi từ trên cao, đồ vật đổ nghiêng, vỡ, sụp, hoặc vật cần đứng yên ở chỗ chênh vênh.
dau-hieu: rơi, đổ, vỡ, sụp, lật, trượt khỏi, chênh vênh, mép
---

# VẬT RƠI, ĐỔ, VỠ

Model hay cho vật trôi lơ lửng, rơi sai hướng, hoặc "biến hình" từ nguyên sang vỡ. Vỡ là **đổi trạng thái
vật chất** — model nhảy phắt sang trạng thái sau như phép thuật.

## Khi viết shot list

- **Rơi thẳng xuống ngay dưới mép rơi.** Nạn nhân phải đứng đúng dưới chỗ đó. Kiểm lại sơ đồ bối cảnh.
- **Vỡ = hai shot:** shot 1 vật còn nguyên, bắt đầu nghiêng / rơi, cắt trước khi chạm đất; shot 2 mảnh vỡ
  đã nằm yên. Không cho thấy khoảnh khắc vỡ.
- **Vật cần dừng ở chỗ bất ổn** (mép bàn, gờ tủ) → cho một bộ phận cơ thể **chủ động giữ** nó.
  Mép bàn, gờ, bậc không được tính là lực giữ.
- **Vật nhỏ trúng đích** → bỏ đường rơi, chỉ giữ hậu quả nhìn thấy được.
- Vỡ, đổ, bẩn là **thay đổi còn lưu**: ghi vào clip để các clip sau cùng bối cảnh thấy đúng.
- Trạng thái sau cần giống hệt nhau qua nhiều clip (bình hoa đã vỡ nằm trên sàn) → tạo tài sản trạng thái
  sau có ảnh riêng (xem module `doi-trang-thai-dao-cu`).

## Khi viết prompt

- `The vase tips over the table edge and falls straight down; the shot cuts before it reaches the floor.`
- `From the very first frame, the shards of the vase already lie still on the tiles.`
- Vật đứng yên: `…rests flat on the table and stays still.`
- Không viết "floating", "hovering" trừ khi đó là gag có chủ đích.

## Ví dụ đúng / sai

- **Sai:** "bàn ủi rơi từ nóc tủ trúng đầu mèo đang đứng giữa phòng" — mèo không đứng dưới mép tủ,
  model phải bẻ đường rơi → bàn ủi bay chéo.
- **Đúng:** mèo đứng sát chân tủ (ghi trong "Ai ở đâu"); shot 1 bàn ủi trượt khỏi mép, cắt; shot 2 ngay
  khung đầu mèo nằm bẹp, bàn ủi đè trên lưng.
