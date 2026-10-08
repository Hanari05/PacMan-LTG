# ᗧ · · · ⍩⃝ PacMan - Update Version

Game Pac-Man chạy trên trình duyệt, viết bằng **JavaScript thuần + HTML5 Canvas** (không dùng thư viện hay framework nào). Bản này phát triển từ code mẫu trong video hướng dẫn của Kenny Yip, được mở rộng thành một game hoàn chỉnh hơn: 3 map với giao diện và nhạc riêng, ma có trí tuệ nhân tạo, đường hầm, chuồng ma, độ khó tăng dần, âm thanh, kỷ lục và điều khiển cảm ứng.

- Code gốc tham khảo: [Kenny Yip Coding](https://github.com/ImKennyYip/pacman.git)
- Nhạc nền trong map thuộc: *Geometry Dash Music*
- Phát triển tiếp bởi: **Hanari05**

---

## Mục lục

1. [Chạy game](#1-chạy-game)
2. [Cách chơi](#2-cách-chơi)
3. [Luật chơi và cơ chế](#3-luật-chơi-và-cơ-chế)
4. [Ba map](#4-ba-map)
5. [Những thay đổi so với bản gốc](#5-những-thay-đổi-so-với-bản-gốc)
6. [Cấu trúc dự án](#6-cấu-trúc-dự-án)
7. [Thiết kế kỹ thuật](#7-thiết-kế-kỹ-thuật)
8. [Kiểm thử](#8-kiểm-thử)
9. [Tùy chỉnh và mở rộng](#9-tùy-chỉnh-và-mở-rộng)
10. [Hạn chế đã biết](#10-hạn-chế-đã-biết)

---

## 1. Chạy game

Không cần cài đặt hay build. Chỉ cần phục vụ thư mục dự án bằng một web server tĩnh bất kỳ, rồi mở `index.html`:

- **VS Code:** cài tiện ích *Live Server*, bấm chuột phải `index.html` → *Open with Live Server*.
- **Python:** `python -m http.server 5500` rồi mở `http://127.0.0.1:5500`.
- **Node:** `npx serve .`

Trình duyệt chỉ cho phát âm thanh sau khi người chơi bấm hoặc nhấn phím, nên nhạc nền bắt đầu khi bạn bấm **Bắt đầu**.

Chạy bộ kiểm thử (cần Node 18 trở lên):

```
node --test tests/game.test.cjs
```

---

## 2. Cách chơi

### Điều khiển

| Hành động | Bàn phím | Cảm ứng |
|---|---|---|
| Di chuyển | `W A S D` hoặc phím mũi tên | Vuốt trên mê cung, hoặc dùng 4 nút mũi tên |
| Tạm dừng / tiếp tục | `Esc` hoặc nút **Tạm dừng** | Nút **Tạm dừng** |
| Bật/tắt nhạc nền | Nút 🎵 | Nút 🎵 |
| Bật/tắt hiệu ứng âm thanh | Nút 🔊 | Nút 🔊 |

Nút mũi tên cảm ứng chỉ hiện trên thiết bị có màn hình cảm ứng. Có thể bấm hướng trước khi tới ngã rẽ, Pac-Man sẽ rẽ ngay khi đường mở ra. Hướng bấm trong lúc chờ hồi sinh cũng được giữ lại.

### Mục tiêu

Ăn hết mọi chấm trong mê cung để qua vòng, tránh bốn con ma. Ăn viên năng lượng để đảo ngược tình thế và săn lại bọn chúng. Mất cả 3 mạng là kết thúc ván.

### Giao diện

- **Cột trái:** tiêu đề, các nút âm thanh và tạm dừng, bảng điểm (Điểm, Kỷ lục, Mạng, Vòng).
- **Giữa:** mê cung, tự co theo chiều cao màn hình nên không phải cuộn trang.
- **Cột phải:** thanh trạng thái (đếm ngược ăn ma, cherry, bảo vệ…), phím điều khiển, hướng dẫn chi tiết.
- Trên điện thoại hoặc cửa sổ hẹp, các phần xếp dọc, mê cung vẫn vừa màn hình.
- Ô chọn map có ở màn hình bắt đầu, màn hình kết thúc và cả khung **Tạm dừng**. Chọn đến đâu thấy giao diện của map đó ngay. Đổi map khi đang tạm dừng sẽ chơi lại vòng hiện tại trên map mới, giữ nguyên điểm, số mạng và số vòng; nhạc nền cũng đổi theo.

---

## 3. Luật chơi và cơ chế

### Điểm số

| Sự kiện | Điểm |
|---|---|
| Chấm nhỏ | 10 |
| Viên năng lượng | 50 |
| Ăn ma khi đang sợ hãi | 200 → 400 → 800 → 1600 (chuỗi liên tiếp trong một lần năng lượng) |
| Cherry | 500 |

Kỷ lục được lưu trong trình duyệt (`localStorage`) và giữ nguyên sau khi tải lại trang.

### Viên năng lượng và chuỗi ăn ma

Ăn viên năng lượng (4 viên ở bốn góc) thì ma chuyển sang trạng thái **sợ hãi**: đổi sprite, đi chậm đi một nửa và đi ngẫu nhiên thay vì săn. Thời gian sợ hãi là **8 giây ở vòng 1**, giảm 1 giây mỗi vòng, tối thiểu 3 giây. Ăn nhiều ma trong cùng một lần năng lượng thì điểm nhân đôi dần (200, 400, 800, 1600). Ma bị ăn biến mất 3 giây rồi xuất hiện lại trong chuồng và đi ra như ban đầu. Khi hết thời gian, ma trở lại nguy hiểm.

### Cherry

Khi ăn đủ **40% số chấm** của vòng, một quả cherry xuất hiện ở điểm xuất phát của Pac-Man, tồn tại **10 giây**. Ăn được cộng 500 điểm. Mỗi vòng chỉ xuất hiện một lần.

### Mạng, hồi sinh và bảo vệ

- Có **3 mạng**. Chạm ma khi ma đang nguy hiểm thì mất 1 mạng.
- Nhiều ma chồng lên nhau cùng lúc chỉ tính mất **một** mạng.
- Sau khi mất mạng có 1,5 giây chờ hồi sinh; mọi nhân vật về vị trí xuất phát, chấm đã ăn vẫn giữ nguyên.
- Sau mỗi lần bắt đầu hoặc hồi sinh, Pac-Man được **bảo vệ 2 giây** (ma không gây hại).
- Điểm và số mạng được giữ khi qua vòng. Chạm ma được kiểm tra bằng khoảng cách 18 px (ô lưới là 32 px).

### Trí tuệ nhân tạo của ma

Ma quyết định hướng đi tại **mỗi ngã rẽ** (không quay đầu trừ khi cụt đường). Ở chế độ đuổi, mỗi con có mục tiêu riêng:

| Ma | Cách săn |
|---|---|
| 🔴 Đỏ | Đuổi thẳng vào ô Pac-Man đang đứng |
| 🩷 Hồng | Chặn đầu: nhắm vào ô cách Pac-Man 4 ô theo hướng đang đi |
| 🔵 Xanh | Kẹp gọng: nhắm điểm đối xứng của ma đỏ qua vị trí phía trước Pac-Man |
| 🟠 Cam | Đuổi khi ở xa, nhưng khi tới gần (dưới 8 ô) thì bỏ chạy về góc của mình |

Ma **luân phiên hai chế độ**: *phân tán* (7 giây, mỗi con về một góc của mê cung) rồi *đuổi* (22 giây ở vòng 1, tăng dần tới 30 giây). Đồng hồ chế độ dừng lại khi Pac-Man đang ăn năng lượng. Ma luôn chọn hướng làm giảm khoảng cách tới mục tiêu.

### Chuồng ma

Ma xanh, hồng, cam xuất phát trong chuồng (giữa mê cung ở map 1 và 2, gần đỉnh ở map 3), ma đỏ đứng ngay trên cửa. Chúng rời chuồng lần lượt: **đỏ ngay lập tức, hồng sau 2 giây, xanh sau 5 giây, cam sau 9 giây**. Đã ra ngoài thì không vào lại được. Pac-Man không bao giờ vào được chuồng.

### Đường hầm

Mỗi map có hàng đường hầm với hai lối mở ở biên trái và phải (map Hành lang có hai hàng như vậy). Đi hết một đầu sẽ xuất hiện ở đầu bên kia. Cả Pac-Man và ma đều dùng được.

### Độ khó theo vòng

| Vòng | Thay đổi |
|---|---|
| 2 trở đi | Ma nhanh hơn 5% mỗi vòng (tối đa +20% từ vòng 5) |
| Mỗi vòng | Thời gian sợ hãi ngắn dần (8 → tối thiểu 3 giây) |
| Mỗi vòng | Ma rời chuồng sớm hơn (đến tối đa giảm 60% thời gian chờ) |
| Mỗi vòng | Pha đuổi dài hơn |

Mỗi khi hoàn thành một vòng, game chuyển sang map kế tiếp (Cổ điển → Giao lộ → Hành lang → quay lại Cổ điển).

### Tạm dừng thông minh

Mọi bộ đếm của game (năng lượng, cherry, hồi sinh, bảo vệ, chế độ ma, chờ chuồng) dùng thời gian mô phỏng, nên **đóng băng hoàn toàn khi tạm dừng**. Game tự tạm dừng khi bạn nhấn `Esc`, mở phần hướng dẫn, hoặc chuyển sang tab khác.

---

## 4. Ba map

Mỗi map có bố cục, giao diện và nhạc nền riêng. Bạn chọn map bắt đầu ở màn hình chính; từ đó các vòng sau xoay sang map kế tiếp.

| | Cổ điển | Giao lộ | Hành lang |
|---|---|---|---|
| Màu chủ đạo | 🔵 Xanh nước | 🟡 Vàng | 🟢 Xanh lá |
| Họa tiết tường | Sóng nước | Vạch chéo (như vạch báo hiệu đường) | Lá cây |
| Bố cục | Map gốc của bản mẫu, thêm chuồng ma và đường hầm | Đối xứng trên/dưới, nhiều ngã tư và ô vuông nhỏ, đường thông thoáng, không còn khoảng trống hai bên | Thiết kế riêng, **không đối xứng trên/dưới**; chuồng ma đặt cao gần đỉnh, Pac-Man xuất phát ở dưới |
| Đường hầm | 1 (hàng giữa) | 1 (hàng giữa) | **2** (hàng 4 và hàng 14), ma và Pac-Man có thể vòng qua lại giữa hai nửa mê cung |
| Số chấm | 183 | 199 | 206 |
| Nhạc nền | `co_dien.mp3` | `giao_lo.mp3` | `hanh_lang.mp3` |

Tường được vẽ bằng code với viền phát sáng, họa tiết liền mạch giữa các khối. Giao diện cả trang (viền khung, nút, điểm số, màu nền) cũng đổi theo màu của map.

---

## 5. Những thay đổi so với bản gốc

### Tổng quan

| | Bản gốc (video hướng dẫn) | Bản hiện tại |
|---|---|---|
| Quy mô code | 1 file JS ~350 dòng, 1 map | `pacman.js` + `map.js` + test, 3 map |
| Vòng lặp game | `setTimeout` 50 ms (20 FPS), phụ thuộc máy | Bước thời gian cố định 1/60 giây, tách khỏi tốc độ hiển thị |
| Di chuyển | Mỗi bước 8 px, dò va chạm với **toàn bộ** khối tường | Từng pixel trên lưới ô, tra bản đồ trực tiếp, rẽ khớp chính xác |
| AI của ma | Ngẫu nhiên, chỉ đổi hướng khi đụng tường | Đuổi/phân tán, mục tiêu riêng cho từng con, quyết định ở mỗi ngã rẽ |
| Luật | Chỉ ăn chấm, mất mạng khi chạm ma | Năng lượng, ăn ma, cherry, bảo vệ, độ khó tăng dần |
| Trạng thái game | Chỉ có `gameOver` | Máy trạng thái (tải, sẵn sàng, chơi, tạm dừng, hồi sinh, qua vòng, kết thúc, lỗi) |
| Giao diện | Một canvas đen, điểm vẽ trong canvas | HUD bằng HTML, overlay thông báo, bố cục 3 cột, theme theo map |
| Âm thanh | Không | Hiệu ứng tổng hợp + nhạc nền theo map |
| Kiểm thử | Không | 24 bài test tự động |

### Những gợi ý "bài tập về nhà" của bản gốc đã được thực hiện

Tác giả bản gốc đề xuất vài hướng phát triển; bản này đã làm đủ:

- ✅ **Tự thiết kế map:** có 3 map, thêm map mới chỉ cần ghi nửa trái của hàng.
- ✅ **Viên năng lượng để Pac-Man ăn ma.**
- ✅ **Đường hầm hai bên:** trước đây Pac-Man đi ra ngoài màn hình, giờ xuất hiện ở phía đối diện.
- ✅ **Ma di chuyển thông minh hơn:** trước đây chỉ đổi hướng khi đụng tường nên có khu vực ít khi tới được; giờ ma chọn đường ở mọi ngã rẽ và có chiến thuật săn.

### Chi tiết từng nhóm thay đổi

**Lõi game**
- Thay `setTimeout` bằng vòng lặp `requestAnimationFrame` kèm bộ cộng dồn thời gian (fixed timestep), giới hạn bước nhảy tối đa 0,1 giây để không bị "nhảy cóc" khi lag. Tốc độ game như nhau ở 30 Hz hay 144 Hz.
- Bỏ lớp `Block` và việc dò va chạm AABB với từng viên tường. Thay bằng bản đồ dạng lưới và hàm `walkable`, di chuyển từng pixel, chỉ đổi hướng khi nhân vật căn đúng ô, nên không còn lỗi kẹt tường hay rẽ lệch.
- Pac-Man nhớ hướng bấm sớm và rẽ ở ngã rẽ hợp lệ đầu tiên.
- Bỏ mẹo gán cứng `ghost.y == tileSize*9` cho ma ra khỏi chuồng, thay bằng chuồng ma thật.

**Luật chơi:** viên năng lượng, chuỗi ăn ma, cherry, 3 mạng với hồi sinh và 2 giây bảo vệ, chuyển vòng, độ khó tăng dần (tốc độ ma, thời gian sợ hãi, thời gian rời chuồng, độ dài pha đuổi).

**Trí tuệ nhân tạo:** chế độ đuổi và phân tán xen kẽ, bốn chiến thuật săn khác nhau, ma sợ hãi đi ngẫu nhiên và chậm hơn, ma bị ăn hồi sinh trong chuồng.

**Bản đồ:** hệ thống map định nghĩa bằng chuỗi ký tự (`X`, `O`, `*`, `P`, `r`, `G`, `-`), mỗi hàng chỉ ghi nửa trái và tự lật gương để map luôn đối xứng. Có kiểm tra tự động rằng mọi chấm đều đi tới được.

**Giao diện:** HUD và overlay bằng HTML/CSS, bố cục vừa màn hình (3 cột trên máy tính, xếp dọc trên điện thoại), tường vẽ bằng code theo theme, mê cung dựng sẵn thành một lớp ảnh để vẽ nhanh, cập nhật giao diện chỉ khi có thay đổi.

**Âm thanh:** hiệu ứng (ăn chấm, năng lượng, ăn ma, cherry, mất mạng, qua vòng, bắt đầu) được tổng hợp bằng WebAudio, không cần file. Nhạc nền là file MP3 riêng cho từng map, lặp lại, tự dừng khi tạm dừng. Có nút bật/tắt riêng cho hiệu ứng và nhạc, và nhớ lựa chọn.

**Tiện ích:** kỷ lục lưu trong `localStorage`, vuốt và nút mũi tên cảm ứng, tạm dừng tự động khi chuyển tab, xử lý lỗi khi không tải được ảnh, chống chạy nhiều vòng lặp khi chơi lại.

**Tổ chức mã nguồn:** ảnh chuyển vào `assets/`, nhạc vào `assets/music/`, logic và dữ liệu map tách file, định dạng bằng Prettier (`.prettierrc`), có `TESTING.md` ghi lại cách kiểm thử.

---

## 6. Cấu trúc dự án

```
PacMan-LTG/
├── index.html            # Khung trang: HUD, canvas, overlay, hướng dẫn
├── pacman.css            # Giao diện, bố cục 3 cột / xếp dọc, màu theo map
├── map.js                # Bản đồ, theme màu/họa tiết, đường dẫn nhạc của từng map
├── pacman.js             # Toàn bộ logic: vòng lặp, di chuyển, AI, luật, âm thanh, vẽ
├── assets/
│   ├── *.png             # Sprite Pac-Man, bốn con ma, ma sợ hãi, cherry
│   └── music/
│       ├── co_dien.mp3
│       ├── giao_lo.mp3
│       └── hanh_lang.mp3
├── tests/
│   └── game.test.cjs     # 24 bài kiểm thử tự động
├── TESTING.md            # Ghi chú kiểm thử và checklist chơi thử
├── .prettierrc           # Cấu hình định dạng code
└── README.md
```

---

## 7. Thiết kế kỹ thuật

### Máy trạng thái

```
loading → ready → playing ⇄ paused
                    │  ↑
                    ▼  │
               respawning
                    │
        playing → complete (qua vòng) → playing (map kế tiếp)
                → gameover → playing (ván mới)
(loading → error nếu không tải được ảnh)
```

### Vòng lặp

`requestAnimationFrame` đo thời gian thực, cộng dồn vào `accumulator`, mỗi `1/60` giây chạy một `tick`. Khi không ở trạng thái `playing` hoặc `respawning` thì bộ cộng dồn bị bỏ, nên mọi bộ đếm đóng băng đúng cách.

### Mỗi tick (đang chơi)

1. Giảm các bộ đếm (năng lượng, bảo vệ, cherry, chế độ ma).
2. Di chuyển Pac-Man 2 px, ăn chấm, ăn cherry.
3. Xử lý va chạm với ma (ăn ma hoặc mất mạng).
4. Di chuyển từng con ma (tích lũy tốc độ thập phân để tốc độ tăng theo vòng vẫn mượt), xử lý va chạm lần nữa.
5. Hết chấm thì chuyển sang `complete`.

### Mô hình bản đồ

Mỗi ô 32×32 px, lưới 19×21. Ký tự trong `map.js`:

| Ký tự | Ý nghĩa |
|---|---|
| `X` | Tường |
| `O` | Ngoài vùng chơi |
| ` ` (khoảng trắng) | Chấm nhỏ |
| `*` | Viên năng lượng |
| `P` | Điểm xuất phát của Pac-Man |
| `r` | Ma đỏ (ngay trên cửa chuồng) |
| `G` | Sàn chuồng ma (3 ô: ma xanh, hồng, cam) |
| `-` | Cửa chuồng |

Một hàng có cả hai đầu là khoảng trắng được hiểu là **hàng đường hầm**.

---

## 8. Kiểm thử

Bộ test chạy bằng `node --test`, mô phỏng trình duyệt bằng DOM giả trong `node:vm`, gồm **24 bài** bao phủ:

- Mọi chấm và 4 viên năng lượng đều đi tới được (kiểm tra cả 3 map).
- Đường hầm, chuồng ma (ma ra theo thứ tự, không vào lại), AI đuổi/phân tán, mục tiêu riêng từng ma.
- Ăn ma và chuỗi điểm, cherry, mất mạng, hồi sinh, bảo vệ, qua vòng, game over, chơi lại.
- Tạm dừng đóng băng mọi bộ đếm; tạm dừng bằng bàn phím, hướng dẫn và chuyển tab.
- Độ khó tăng theo vòng, map xoay vòng, phím lưu qua hồi sinh, kỷ lục.
- Theme và nhạc của từng map; nhạc phát đúng bài và dừng khi tạm dừng.
- Bot tự chơi ngẫu nhiên 3 phút mô phỏng trên mỗi map, kiểm tra không có vị trí hay trạng thái sai.

Bộ test kiểm tra logic, **chưa thay thế việc chơi thử trên trình duyệt thật**. Checklist chơi thử có trong `TESTING.md`.

---

## 9. Tùy chỉnh và mở rộng

### Thêm một map mới

Trong `map.js`, viết nửa trái của 21 hàng (10 ký tự, cột 0 đến 9) rồi gọi `pad([...])`, và thêm một mục vào `MAPS`:

```js
{ name: 'Tên map', music: 'assets/music/ten_file.mp3', theme: THEMES.water, rows: pad([ /* 21 hàng */ ]) }
```

Map cần có đúng một `P`, một `r`, ba ô `G` (sàn chuồng) và một cửa `-` nằm ngay dưới ô `r`. Chạy `node --test tests/game.test.cjs` để kiểm tra mọi chấm đi tới được.

### Thêm một theme hoặc họa tiết

Thêm một mục vào `THEMES` (màu nền, màu tường, viền, họa tiết, chấm, cửa, màu giao diện). Muốn kiểu họa tiết mới thì thêm một hàm vào `PATTERNS` trong `pacman.js` (ví dụ gạch, tuyết, dung nham).

### Cân bằng độ khó

| Muốn chỉnh | Sửa ở |
|---|---|
| Thời gian sợ hãi, cherry, hồi sinh, bảo vệ | `RULES` trong `pacman.js` |
| Thời gian ma rời chuồng | `HOLD` |
| Tốc độ ma theo vòng | `ghostSpeed()` |
| Độ dài pha đuổi/phân tán | `tick()` (phần chế độ ma) |
| Âm lượng nhạc nền | `bgm.volume` trong `syncMusic()` |

### Dung lượng nhạc

Ba file MP3 nặng khoảng 18 MB (320 kbps). Nếu đưa game lên web, nên nén xuống 128 kbps cho nhẹ hơn:

```
ffmpeg -i co_dien.mp3 -b:a 128k co_dien_small.mp3
```

---

## Game chỉ phục vụ mục đích học tập, không liên quan đến bản quyền sản phẩm gốc hay giá trị thương mại.
