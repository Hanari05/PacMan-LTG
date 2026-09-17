# Kiểm tra bản Giai đoạn 1

## Đã thực hiện

- `node --test tests/game.test.cjs`: 13/13 bài kiểm tra đạt.
- `node --check pacman.js` và `node --check map.js`: đạt.
- 11 đường dẫn ảnh dùng trong game đều tồn tại.
- Kiểm tra diff không có lỗi whitespace.

Các bài kiểm tra chạy logic JavaScript trong môi trường giả lập DOM tối thiểu. Bao gồm các handler bàn phím, hướng dẫn, chuyển tab; một vòng lặp duy nhất khi Restart; tốc độ mô phỏng ở 30 và 144 Hz; khả năng tiếp cận toàn bộ chấm; rẽ có lưu hướng; chặn biên/tường; Pause; ăn ma; hồi sinh; cherry; chuyển vòng và Game Over.

## Giới hạn

Chưa kiểm thử hình ảnh/giao diện và thao tác thực trên trình duyệt: tải trình duyệt thử nghiệm không thành công trong môi trường thực hiện. Cần playtest trên máy thật trước khi coi đây là bản phát hành ổn định.

## Checklist trên trình duyệt

- Mở index.html: ảnh hiển thị đầy đủ, thấy nút Bắt đầu, bàn chơi chưa chạy.
- Bấm Bắt đầu; dùng WASD và phím mũi tên; nhấn hướng rẽ sớm trước giao lộ.
- Va tường và đến cuối hành lang ngoài biên: nhân vật không xuyên ra ngoài.
- Ăn viên lớn: +50 điểm, ma sợ hãi 8 giây, có thể ăn ma lấy chuỗi điểm.
- Pause khi còn Power Pellet/cherry: chờ vài giây rồi tiếp tục; bộ đếm không bị trừ lúc pause.
- Mở hướng dẫn/chuyển tab: game tự pause, quay về bấm Tiếp tục.
- Chạm ma thường: chỉ mất một mạng, chờ hồi sinh 1,5 giây; được bảo vệ 2 giây sau hồi sinh.
- Ăn đủ 40% chấm: cherry xuất hiện tại điểm xuất phát, +500 điểm khi ăn, tự hết sau 10 giây chơi.
- Ăn hết chấm: xuất hiện Hoàn thành vòng; sang vòng mới vẫn giữ điểm/mạng.
- Mất đủ 3 mạng: Game Over. Phím di chuyển không tự restart; nút Chơi lại đặt lại toàn bộ ván.
- Tạm dừng → Chơi lại từ đầu nhiều lần: tốc độ không tăng bất thường.
