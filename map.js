// Mỗi hàng chỉ ghi nửa trái (10 ký tự, cột 0..9); nửa phải được lật gương tự động -> map luôn đối xứng, rộng 19 ô.
// X tường | O ngoài vùng chơi | ' ' chấm | * viên năng lượng | P Pac-Man | r ma đỏ (ngay trên cửa chuồng)
// G sàn chuồng ma (3 ô: ma xanh, hồng, cam) | - cửa chuồng | hàng có cả 2 đầu là ' ' = đường hầm xuyên biên.
const mirror = half => half + [...half].slice(0, -1).reverse().join('');
const flipBottom = top =>
    top
        .slice(0, 9)
        .reverse()
        .map(r => r.replace('-', 'X').replace('r', ' '));
const pad = rows => rows.map(mirror);

const classic = pad([
    'XXXXXXXXXX',
    'X*       X',
    'X XX XXX X',
    'X         ',
    'X XX X XXX',
    'X    X    ',
    'XXXX XXXX ',
    'OOOX X   r',
    'XXXX X XX-',
    '       XGG',
    'XXXX X XXX',
    'OOOX X    ',
    'XXXX X XXX',
    'X        X',
    'X XX XXX X',
    'X  X     P',
    'XX X X XXX',
    'X    X   X',
    'X XXXXXX X',
    'X*        ',
    'XXXXXXXXXX',
]);
const topB = [
    'XXXXXXXXXX',
    'X*   X    ',
    'X XX X XX ',
    'X XX      ',
    'X    XXX X',
    'XXXX X    ',
    'OOOX X XXX',
    'OOOX     r',
    'OOOX X XX-',
    '       XGG',
    'OOOX X XXX',
    'OOOX      ',
];
const topC = [
    'XXXXXXXXXX',
    'X*    X   ',
    'X XXX X XX',
    'X     X   ',
    'X   X     ',
    'OOOXXXXX  ',
    'OOOX      ',
    'OOOX XXX r',
    'OOOX X XX-',
    '       XGG',
    'OOOX X XXX',
    'OOOX      ',
];
const vertical = top => pad([...top, ...flipBottom(top)].map((r, i) => (i === 15 ? r.slice(0, 9) + 'P' : r)));

// Theme: bg nền | fill màu khối tường | edge viền phát sáng | pat màu họa tiết | dot/power màu chấm | door cửa chuồng | accent/page màu giao diện
const THEMES = {
    water: {
        pattern: 'waves',
        bg: '#02061a',
        fill: '#0d2a7a',
        edge: '#5aa9ff',
        pat: 'rgba(120,190,255,.38)',
        dot: '#d6ecff',
        power: '#9fe6ff',
        door: '#7fd4ff',
        accent: '#5aa9ff',
        page: '#090e20',
    },
    road: {
        pattern: 'stripes',
        bg: '#120d00',
        fill: '#4d3800',
        edge: '#ffd23f',
        pat: 'rgba(255,210,63,.30)',
        dot: '#fff3c4',
        power: '#ff9f1c',
        door: '#ffd23f',
        accent: '#ffd23f',
        page: '#15110a',
    },
    garden: {
        pattern: 'leaves',
        bg: '#021208',
        fill: '#0b4a26',
        edge: '#4ee07f',
        pat: 'rgba(130,255,170,.34)',
        dot: '#d8ffe3',
        power: '#c6ff3d',
        door: '#8dffb0',
        accent: '#4ee07f',
        page: '#07130c',
    },
};
const MAPS = [
    { name: 'Cổ điển', music: 'assets/music/co_dien.wav', theme: THEMES.water, rows: classic },
    { name: 'Giao lộ', music: 'assets/music/giao_lo.wav', theme: THEMES.road, rows: vertical(topB) },
    { name: 'Hành lang', music: 'assets/music/hanh_lang.wav', theme: THEMES.garden, rows: vertical(topC) },
];
