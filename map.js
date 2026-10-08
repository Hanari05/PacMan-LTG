// Mỗi hàng chỉ ghi nửa trái (10 ký tự, cột 0..9); nửa phải được lật gương tự động -> map luôn đối xứng, rộng 19 ô.
// X tường | O ngoài vùng chơi | ' ' chấm | * viên năng lượng | P Pac-Man | r ma đỏ (ngay trên cửa chuồng)
// G sàn chuồng ma (3 ô: ma xanh, hồng, cam) | - cửa chuồng | hàng có cả 2 đầu là ' ' = đường hầm xuyên biên.
const mirror = half => half + [...half].slice(0, -1).reverse().join('');
const flipBottom = top => top.slice(0, 9).reverse().map(r => r.replace('-', 'X').replace('r', ' '));
const pad = rows => rows.map(mirror);

const classic = pad([
    "XXXXXXXXXX", "X*       X", "X XX XXX X", "X         ", "X XX X XXX", "X    X    ",
    "XXXX XXXX ", "OOOX X   r", "XXXX X XX-", "       XGG", "XXXX X XXX", "OOOX X    ",
    "XXXX X XXX", "X        X", "X XX XXX X", "X  X     P", "XX X X XXX", "X    X   X",
    "X XXXXXX X", "X*        ", "XXXXXXXXXX"
]);
const topB = ["XXXXXXXXXX", "X*   X    ", "X XX X XX ", "X XX      ", "X    XXX X", "XXXX X    ",
    "OOOX X XXX", "OOOX     r", "OOOX X XX-", "       XGG", "OOOX X XXX", "OOOX      "];
const topC = ["XXXXXXXXXX", "X*    X   ", "X XXX X XX", "X     X   ", "X   X     ", "OOOXXXXX  ",
    "OOOX      ", "OOOX XXX r", "OOOX X XX-", "       XGG", "OOOX X XXX", "OOOX      "];
const vertical = top => pad([...top, ...flipBottom(top)].map((r, i) => i === 15 ? r.slice(0, 9) + 'P' : r));

const MAPS = [
    {name: 'Cổ điển', rows: classic},
    {name: 'Giao lộ', rows: vertical(topB)},
    {name: 'Hành lang', rows: vertical(topC)}
];
