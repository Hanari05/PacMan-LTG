'use strict';

// All durations use simulation time: overlays and hidden tabs freeze every timer.
const TILE = 32;
const STEP = 1 / 60,
    W = 19,
    H = 21;
const RULES = Object.freeze({ power: 8, cherry: 10, respawn: 1.5, protection: 2, ghostRespawn: 3 });
const DIR = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
const HOUSE = 'G-',
    HOLD = { r: 0, p: 2, b: 5, o: 9 },
    BEST_KEY = 'pacman-ltg-best';
const OPPOSITE = { U: 'D', D: 'U', L: 'R', R: 'L' };
const KEYS = {
    ArrowUp: 'U',
    KeyW: 'U',
    ArrowDown: 'D',
    KeyS: 'D',
    ArrowLeft: 'L',
    KeyA: 'L',
    ArrowRight: 'R',
    KeyD: 'R',
};
const SPRITES = {
    U: 'assets/elements/pacmanUp.png',
    D: 'assets/elements/pacmanDown.png',
    L: 'assets/elements/pacmanLeft.png',
    R: 'assets/elements/pacmanRight.png',
    b: 'assets/elements/blueGhost.png',
    o: 'assets/elements/orangeGhost.png',
    p: 'assets/elements/pinkGhost.png',
    r: 'assets/elements/redGhost.png',
    scared: 'assets/elements/scaredGhost.png',
    cherry: 'assets/elements/cherry.png',
};
const images = {};
let state = 'loading',
    pausedState = null;
let tileMap = MAPS[0].rows,
    mapIndex = 0,
    tunnel = [],
    exitTile = [9, 7],
    corners = {};
let chasing = false,
    modeLeft = 7,
    best = 0,
    muted = false,
    uiKey = '',
    waka = false,
    audio = null,
    musicOn = true,
    bgm = null,
    bgmMap = -1,
    mazeLayer = null;
let score = 0,
    lives = 3,
    level = 1;
let pacman,
    ghosts = [],
    foods = new Map();
let powerLeft = 0,
    combo = 0,
    respawnLeft = 0,
    protectionLeft = 0;
let cherryLeft = 0,
    cherrySpawned = false,
    totalFood = 0;
let accumulator = 0,
    lastTime = null;
const board = document.getElementById('board');
const ctx = board.getContext('2d');
const ui = Object.fromEntries(
    [
        'score',
        'best',
        'lives',
        'level',
        'mute',
        'music',
        'mapsel',
        'dpad',
        'pause',
        'overlay',
        'title',
        'message',
        'primary',
        'restart',
        'status',
    ].map(id => [id, document.getElementById(id)]),
);

const store = {
    get(k) {
        try {
            return localStorage.getItem(k);
        } catch (e) {
            return null;
        }
    },
    set(k, v) {
        try {
            localStorage.setItem(k, v);
        } catch (e) {}
    },
};
best = +store.get(BEST_KEY) || 0;
muted = store.get('pacman-ltg-muted') === '1';
musicOn = store.get('pacman-ltg-music') !== '0';
const put = (el, key, value) => {
    if (el[key] !== value) el[key] = value;
};

// ---- Âm thanh: tổng hợp bằng WebAudio, không cần file ----
const SFX = {
    waka1: [[330, 0.05]],
    waka2: [[262, 0.05]],
    power: [
        [196, 0.08],
        [392, 0.12, 0.08],
    ],
    ghost: [
        [523, 0.08],
        [784, 0.12, 0.08],
    ],
    cherry: [
        [660, 0.08],
        [880, 0.08, 0.08],
        [1175, 0.12, 0.16],
    ],
    death: [
        [440, 0.15],
        [330, 0.15, 0.15],
        [220, 0.15, 0.3],
        [110, 0.3, 0.45],
    ],
    win: [
        [523, 0.1],
        [659, 0.1, 0.1],
        [784, 0.1, 0.2],
        [1047, 0.25, 0.3],
    ],
    start: [
        [262, 0.1],
        [392, 0.1, 0.1],
        [523, 0.2, 0.2],
    ],
};
function getAudio() {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    try {
        audio = audio || new AC();
        if (audio.state === 'suspended') audio.resume();
    } catch (e) {
        return null;
    }
    return audio;
}
function sfx(name) {
    if (muted) return;
    const ac = getAudio();
    if (!ac) return;
    try {
        for (const [freq, dur, delay = 0] of SFX[name]) {
            const o = ac.createOscillator(),
                g = ac.createGain(),
                t = ac.currentTime + delay;
            o.type = 'square';
            o.frequency.value = freq;
            g.gain.setValueAtTime(0.04, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + dur);
            o.connect(g);
            g.connect(ac.destination);
            o.start(t);
            o.stop(t + dur);
        }
    } catch (e) {}
}
// Nhạc nền: mỗi map một bài (MAPS[i].music), lặp lại; chỉ phát khi đang chơi, tự dừng lúc pause. Tải khi cần để không làm chậm lúc mở game.
function syncMusic() {
    const want = musicOn && ['playing', 'respawning'].includes(state);
    if (!want) {
        if (bgm && !bgm.paused) bgm.pause();
        return;
    }
    if (typeof Audio !== 'function') return;
    if (bgmMap !== mapIndex) {
        if (bgm) bgm.pause();
        bgm = new Audio(MAPS[mapIndex].music);
        bgm.loop = true;
        bgm.volume = 0.35;
        bgmMap = mapIndex;
    }
    if (bgm.paused) {
        const p = bgm.play();
        if (p && p.catch) p.catch(() => {});
    }
}
function addScore(n) {
    score += n;
    if (score > best) {
        best = score;
        store.set(BEST_KEY, best);
    }
}
const powerTime = () => Math.max(3, RULES.power - (level - 1));
const ghostSpeed = () => 2 * (1 + 0.05 * Math.min(level - 1, 4)) * (powerLeft > 0 ? 0.5 : 1);

// ---- Bản đồ: hàng đường hầm cho phép đi xuyên biên trái/phải ----
function cell(c, r) {
    const row = tileMap[r];
    if (!row) return undefined;
    if (c < 0 || c >= W) {
        if (!tunnel[r]) return undefined;
        c = (c + W) % W;
    }
    return row[c];
}
// Chuồng ma / cửa chỉ đi vào được khi đang đứng trong chuồng (ma đi ra); Pac-Man không bao giờ vào.
function walkable(c, r, inside = false) {
    const ch = cell(c, r);
    if (ch === undefined || ch === 'X' || ch === 'O') return false;
    return !HOUSE.includes(ch) || inside;
}
function actor(c, r, kind) {
    return {
        x: c * TILE,
        y: r * TILE,
        startX: c * TILE,
        startY: r * TILE,
        kind,
        dir: 'R',
        next: null,
        wait: 0,
        hold: 0,
        acc: 0,
    };
}
function loadMap() {
    tileMap = MAPS[mapIndex].rows;
    if (tileMap.some(row => row.length !== W) || tileMap.length !== H)
        throw new Error('Kích thước bản đồ không hợp lệ');
    tunnel = tileMap.map(row => row[0] === ' ' && row[W - 1] === ' ');
    foods = new Map();
    ghosts = [];
    const house = [];
    tileMap.forEach((row, r) =>
        [...row].forEach((ch, c) => {
            if (ch === 'P') pacman = actor(c, r, 'pacman');
            if (ch === 'r') {
                ghosts.push(actor(c, r, 'r'));
                exitTile = [c, r];
            }
            if (ch === 'G') house.push([c, r]);
            if (ch === ' ' || ch === '*') foods.set(`${c},${r}`, { c, r, power: ch === '*' });
        }),
    );
    ['b', 'p', 'o'].forEach((kind, i) => ghosts.push(actor(...house[i], kind)));
    corners = { r: [W - 2, 1], p: [1, 1], b: [W - 2, H - 2], o: [1, H - 2] };
    totalFood = foods.size;
    cherrySpawned = false;
    cherryLeft = 0;
    chasing = false;
    modeLeft = 7;
    renderMaze();
    applyTheme();
    resetPositions();
}
// keepNext = true: giữ phím đã bấm trong lúc hồi sinh
function resetPositions(keepNext = false) {
    const queued = pacman.next;
    for (const a of [pacman, ...ghosts]) {
        a.x = a.startX;
        a.y = a.startY;
        a.dir = a.kind === 'pacman' ? null : 'U';
        a.next = null;
        a.wait = 0;
        a.acc = 0;
        a.hold = HOLD[a.kind] ? HOLD[a.kind] * Math.max(0.4, 1 - 0.1 * (level - 1)) : 0;
    }
    if (keepNext) pacman.next = queued;
    powerLeft = 0;
    combo = 0;
    protectionLeft = RULES.protection;
}
// ---- Giao diện theo map: lớp mê cung dựng sẵn (nền + khối tường có họa tiết + viền sáng) ----
const PATTERNS = {
    // họa tiết vẽ theo toạ độ toàn cục nên liền mạch giữa các ô tường
    waves(g, x, y, th) {
        // sóng nước
        g.strokeStyle = th.pat;
        g.lineWidth = 1.5;
        for (const oy of [9, 23]) {
            g.beginPath();
            for (let i = 0; i <= TILE; i += 2) {
                const yy = y + oy + 3 * Math.sin((x + i) / 4.5 + oy);
                if (i) g.lineTo(x + i, yy);
                else g.moveTo(x + i, yy);
            }
            g.stroke();
        }
    },
    stripes(g, x, y, th) {
        // vạch chéo như vạch báo hiệu đường
        g.strokeStyle = th.pat;
        g.lineWidth = 5;
        for (let k = Math.ceil((x + y) / 16) * 16; k <= x + y + 2 * TILE; k += 16) {
            g.beginPath();
            g.moveTo(k - y, y);
            g.lineTo(k - y - TILE, y + TILE);
            g.stroke();
        }
    },
    leaves(g, x, y, th) {
        // lá cây
        g.fillStyle = th.pat;
        for (const [dx, dy, rot] of [
            [9, 9, -0.6],
            [23, 23, 0.6],
            [23, 7, 0.5],
            [8, 24, -0.5],
        ]) {
            g.beginPath();
            g.ellipse(x + dx, y + dy, 5, 2.4, rot, 0, Math.PI * 2);
            g.fill();
        }
    },
};
function renderMaze() {
    if (typeof document.createElement !== 'function') {
        mazeLayer = null;
        return;
    }
    const th = MAPS[mapIndex].theme,
        layer = document.createElement('canvas'),
        g = layer.getContext('2d');
    layer.width = W * TILE;
    layer.height = H * TILE;
    g.fillStyle = th.bg;
    g.fillRect(0, 0, layer.width, layer.height);
    const isOpen = (c, r) => {
        const ch = tileMap[r]?.[c];
        return ch !== undefined && ch !== 'X' && ch !== 'O';
    };
    tileMap.forEach((row, r) =>
        [...row].forEach((ch, c) => {
            const x = c * TILE,
                y = r * TILE;
            if (ch === '-') {
                g.fillStyle = th.door;
                g.fillRect(x, y + 13, TILE, 6);
            }
            if (ch !== 'X') return;
            g.save();
            g.beginPath();
            g.rect(x, y, TILE, TILE);
            g.clip();
            g.fillStyle = th.fill;
            g.fillRect(x, y, TILE, TILE);
            PATTERNS[th.pattern](g, x, y, th);
            g.restore();
        }),
    );
    g.strokeStyle = th.edge;
    g.lineWidth = 2;
    g.lineCap = 'round';
    g.shadowColor = th.edge;
    g.shadowBlur = 6;
    tileMap.forEach((row, r) =>
        [...row].forEach((ch, c) => {
            if (ch !== 'X') return;
            const x = c * TILE,
                y = r * TILE,
                side = (x1, y1, x2, y2) => {
                    g.beginPath();
                    g.moveTo(x1, y1);
                    g.lineTo(x2, y2);
                    g.stroke();
                };
            if (isOpen(c, r - 1)) side(x + 2, y + 1, x + TILE - 2, y + 1);
            if (isOpen(c, r + 1)) side(x + 2, y + TILE - 1, x + TILE - 2, y + TILE - 1);
            if (isOpen(c - 1, r)) side(x + 1, y + 2, x + 1, y + TILE - 2);
            if (isOpen(c + 1, r)) side(x + TILE - 1, y + 2, x + TILE - 1, y + TILE - 2);
        }),
    );
    mazeLayer = layer;
}
function applyTheme() {
    // đổi màu giao diện trang theo map
    const root = document.documentElement,
        th = MAPS[mapIndex].theme;
    if (root && root.style) {
        root.style.setProperty('--accent', th.accent);
        root.style.setProperty('--page', th.page);
    }
}
function setState(next) {
    state = next;
    accumulator = 0;
    if (next === 'complete') sfx('win');
    syncUI();
}
function startGame() {
    score = 0;
    lives = 3;
    level = 1;
    pausedState = null;
    respawnLeft = 0;
    mapIndex = Math.min(Math.max(+ui.mapsel.value || 0, 0), MAPS.length - 1);
    document.querySelector('details').open = false;
    bgmMap = -1; // bắt đầu ván mới: nhạc phát lại từ đầu
    loadMap();
    sfx('start');
    setState('playing');
}
function togglePause() {
    if (state === 'playing' || state === 'respawning') {
        pausedState = state;
        setState('paused');
    } else if (state === 'paused') {
        document.querySelector('details').open = false;
        setState(pausedState);
        pausedState = null;
    }
}
function primaryAction() {
    if (state === 'ready' || state === 'gameover') startGame();
    else if (state === 'paused') togglePause();
    else if (state === 'complete') {
        level++;
        mapIndex = (mapIndex + 1) % MAPS.length;
        loadMap();
        setState('playing');
    }
}
function messageFor(s) {
    return {
        loading: ['Đang tải…', 'Chuẩn bị mê cung', 'Đang tải'],
        ready: [
            'Sẵn sàng chưa?',
            'Ăn hết chấm, tránh những bóng ma.\nViên năng lượng giúp đảo ngược cuộc săn.\nChọn map rồi bấm Bắt đầu.',
            'Bắt đầu',
        ],
        paused: ['Tạm dừng', 'Mê cung và mọi bộ đếm đang dừng.', 'Tiếp tục'],
        respawning: ['Thử lại nào!', 'Chuẩn bị hồi sinh…', ''],
        complete: [
            'Hoàn thành vòng ' + level,
            'Điểm hiện tại: ' +
                score +
                '\nVòng sau: map "' +
                MAPS[(mapIndex + 1) % MAPS.length].name +
                '", ma nhanh hơn, viên năng lượng ngắn hơn.',
            'Vòng tiếp theo',
        ],
        gameover: [
            'Kết thúc ván',
            'Điểm của em: ' +
                score +
                (score >= best && score > 0 ? ' (kỷ lục mới!)' : '') +
                '\nSẵn sàng cho một lượt mới?',
            'Chơi lại',
        ],
        error: [
            'Không tải được ảnh',
            'Kiểm tra các file PNG nằm cùng thư mục với index.html rồi tải lại trang.',
            '',
        ],
    }[s];
}
function syncUI() {
    put(ui.score, 'textContent', score);
    put(ui.best, 'textContent', best);
    put(ui.lives, 'textContent', lives);
    put(ui.level, 'textContent', level);
    put(ui.pause, 'disabled', !['playing', 'paused', 'respawning'].includes(state));
    put(ui.pause, 'textContent', state === 'paused' ? 'Tiếp tục' : 'Tạm dừng');
    put(ui.mute, 'textContent', muted ? '🔇' : '🔊');
    put(ui.mute, 'className', muted ? 'off' : '');
    put(ui.music, 'className', musicOn ? '' : 'off');
    put(ui.overlay, 'hidden', state === 'playing');
    put(ui.primary, 'disabled', ['loading', 'error', 'respawning'].includes(state));
    put(ui.primary, 'hidden', state === 'respawning' || state === 'error');
    put(ui.restart, 'hidden', !['paused', 'complete'].includes(state));
    put(ui.mapsel, 'hidden', !['ready', 'gameover'].includes(state));
    const key = state + '|' + score + '|' + level + '|' + mapIndex;
    if (key !== uiKey) {
        // văn bản overlay chỉ dựng lại khi có thay đổi
        uiKey = key;
        const m = messageFor(state);
        if (m) [ui.title.textContent, ui.message.textContent, ui.primary.textContent] = m;
    }
    syncMusic();
    put(
        ui.status,
        'textContent',
        powerLeft > 0
            ? `Ăn ma: ${powerLeft.toFixed(1)}s · Chuỗi ${combo}`
            : cherryLeft > 0
              ? `Cherry tại điểm xuất phát: ${cherryLeft.toFixed(1)}s`
              : protectionLeft > 0 && state === 'playing'
                ? 'Đang được bảo vệ'
                : `Map ${mapIndex + 1}: ${MAPS[mapIndex].name} · Còn ${foods.size} chấm`,
    );
}
function aligned(a) {
    return a.x % TILE === 0 && a.y % TILE === 0;
}
const inHouse = a => HOUSE.includes(cell(a.x / TILE, a.y / TILE));
function canGo(a, direction) {
    if (!direction) return false;
    const [dx, dy] = DIR[direction],
        c = a.x / TILE,
        r = a.y / TILE;
    return walkable(c + dx, r + dy, HOUSE.includes(cell(c, r)));
}
const pacTile = () => [Math.round(pacman.x / TILE), Math.round(pacman.y / TILE)];
// Mỗi ma một cách săn: đỏ đuổi thẳng, hồng chặn đầu, xanh kẹp gọng với ma đỏ, cam đuổi khi xa và bỏ chạy khi gần. Chế độ phân tán: về góc riêng.
function ghostTarget(g) {
    if (inHouse(g)) return exitTile;
    if (!chasing) return corners[g.kind];
    const [pc, pr] = pacTile(),
        [dx, dy] = DIR[pacman.dir || 'L'];
    if (g.kind === 'p') return [pc + 4 * dx, pr + 4 * dy];
    if (g.kind === 'b') {
        const red = ghosts.find(x => x.kind === 'r') || g;
        return [2 * (pc + 2 * dx) - red.x / TILE, 2 * (pr + 2 * dy) - red.y / TILE];
    }
    if (g.kind === 'o' && Math.hypot(pc - g.x / TILE, pr - g.y / TILE) < 8) return corners.o;
    return [pc, pr];
}
function chooseGhostDir(a) {
    const valid = Object.keys(DIR).filter(d => canGo(a, d));
    const forward = valid.filter(d => d !== OPPOSITE[a.dir]);
    const choices = forward.length ? forward : valid;
    if (!choices.length) return;
    if (powerLeft > 0 && !inHouse(a))
        return void (a.dir = choices[Math.floor(Math.random() * choices.length)]);
    const [tx, ty] = ghostTarget(a),
        c = a.x / TILE,
        r = a.y / TILE;
    let bestDir = choices[0],
        bestDist = Infinity;
    for (const d of choices) {
        const dist = Math.hypot(c + DIR[d][0] - tx, r + DIR[d][1] - ty);
        if (dist < bestDist) {
            bestDist = dist;
            bestDir = d;
        }
    }
    a.dir = bestDir;
}
function moveActor(a, distance) {
    // Bước từng pixel để rẽ luôn khớp lưới và không xuyên tường mỏng.
    for (let i = 0; i < distance; i++) {
        if (aligned(a)) {
            if (a.kind === 'pacman') {
                if (canGo(a, a.next)) a.dir = a.next;
            } else chooseGhostDir(a);
            if (!canGo(a, a.dir)) return;
        }
        if (!a.dir) return;
        a.x += DIR[a.dir][0];
        a.y += DIR[a.dir][1];
        if (a.x <= -TILE) a.x += W * TILE;
        else if (a.x >= W * TILE) a.x -= W * TILE; // đường hầm
    }
}
const steps = (a, speed) => {
    a.acc += speed;
    const n = Math.floor(a.acc);
    a.acc -= n;
    return n;
};
function touching(a, b, radius = 18) {
    return Math.hypot(a.x - b.x, a.y - b.y) < radius;
}
function collectFood() {
    const c = Math.round(pacman.x / TILE),
        r = Math.round(pacman.y / TILE);
    const key = `${c},${r}`,
        food = foods.get(key);
    if (!food || !touching(pacman, { x: c * TILE, y: r * TILE }, 9)) return;
    foods.delete(key);
    addScore(food.power ? 50 : 10);
    if (food.power) {
        powerLeft = powerTime();
        combo = 0;
        sfx('power');
    } else {
        waka = !waka;
        sfx(waka ? 'waka1' : 'waka2');
    }
    if (!cherrySpawned && totalFood - foods.size >= Math.ceil(totalFood * 0.4)) {
        cherrySpawned = true;
        cherryLeft = RULES.cherry;
    }
}
function resolveGhosts() {
    for (const ghost of ghosts) {
        if (ghost.wait > 0 || !touching(pacman, ghost)) continue;
        if (powerLeft > 0) {
            addScore(200 * 2 ** Math.min(combo, 3));
            combo++;
            sfx('ghost');
            ghost.x = ghost.startX;
            ghost.y = ghost.startY;
            ghost.dir = 'U';
            ghost.wait = RULES.ghostRespawn;
            ghost.hold = 0;
            ghost.acc = 0;
        } else if (protectionLeft <= 0) {
            lives--;
            powerLeft = 0;
            combo = 0;
            sfx('death');
            if (lives === 0) setState('gameover');
            else {
                respawnLeft = RULES.respawn;
                setState('respawning');
            }
            return true; // Nhiều ma chồng lên nhau chỉ mất một mạng.
        }
    }
    return false;
}
function tick(dt) {
    if (state === 'respawning') {
        respawnLeft = Math.max(0, respawnLeft - dt);
        if (respawnLeft === 0) {
            resetPositions(true);
            setState('playing');
        }
        return;
    }
    if (state !== 'playing') return;
    powerLeft = Math.max(0, powerLeft - dt);
    protectionLeft = Math.max(0, protectionLeft - dt);
    cherryLeft = Math.max(0, cherryLeft - dt);
    if (powerLeft <= 0 && (modeLeft -= dt) <= 0) {
        chasing = !chasing;
        modeLeft = chasing ? 20 + 2 * Math.min(level, 5) : 7;
    }
    moveActor(pacman, 2);
    collectFood();
    if (cherryLeft > 0 && touching(pacman, { x: pacman.startX, y: pacman.startY }, 14)) {
        addScore(500);
        cherryLeft = 0;
        sfx('cherry');
    }
    if (resolveGhosts()) return;
    const speed = ghostSpeed();
    for (const ghost of ghosts) {
        if (ghost.wait > 0) {
            ghost.wait = Math.max(0, ghost.wait - dt);
            continue;
        }
        if (ghost.hold > 0) {
            ghost.hold = Math.max(0, ghost.hold - dt);
            continue;
        }
        moveActor(ghost, steps(ghost, speed));
    }
    if (resolveGhosts()) return;
    if (foods.size === 0) setState('complete');
}
function draw() {
    ctx.clearRect(0, 0, board.width, board.height);
    if (mazeLayer) ctx.drawImage(mazeLayer, 0, 0);
    for (const f of foods.values()) {
        ctx.fillStyle = f.power ? MAPS[mapIndex].theme.power : MAPS[mapIndex].theme.dot;
        ctx.beginPath();
        ctx.arc(f.c * TILE + 16, f.r * TILE + 16, f.power ? 7 : 2, 0, Math.PI * 2);
        ctx.fill();
    }
    if (cherryLeft > 0) ctx.drawImage(images.cherry, pacman.startX, pacman.startY, TILE, TILE);
    if (protectionLeft > 0) {
        ctx.strokeStyle = '#ffe35a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pacman.x + 16, pacman.y + 16, 17, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.drawImage(images[pacman.dir || 'R'], pacman.x + 2, pacman.y + 2, 28, 28);
    for (const g of ghosts) {
        if (g.wait > 0) continue;
        const scared = powerLeft > 0 && (powerLeft > 2 || Math.floor(powerLeft * 6) % 2 === 0);
        ctx.drawImage(images[scared ? 'scared' : g.kind], g.x + 2, g.y + 2, 28, 28);
    }
}
function frame(time) {
    const elapsed = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;
    if (state === 'playing' || state === 'respawning') {
        accumulator += elapsed;
        while (accumulator >= STEP) {
            accumulator -= STEP;
            tick(STEP);
            if (!['playing', 'respawning'].includes(state)) break;
        }
    } else accumulator = 0;
    if (pacman) draw();
    syncUI();
    requestAnimationFrame(frame);
}
function steer(d) {
    if (state === 'playing' || state === 'respawning') pacman.next = d;
}
document.addEventListener('keydown', e => {
    if (KEYS[e.code]) {
        e.preventDefault();
        steer(KEYS[e.code]);
    } else if (e.code === 'Escape' && !e.repeat) {
        e.preventDefault();
        togglePause();
    }
});
// Cảm ứng: vuốt trên mê cung hoặc dùng nút mũi tên (chỉ hiện trên thiết bị cảm ứng)
let touchStart = null;
board.addEventListener(
    'touchstart',
    e => {
        const t = e.touches[0];
        touchStart = { x: t.clientX, y: t.clientY };
    },
    { passive: true },
);
board.addEventListener(
    'touchend',
    e => {
        if (!touchStart) return;
        const t = e.changedTouches[0],
            dx = t.clientX - touchStart.x,
            dy = t.clientY - touchStart.y;
        touchStart = null;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : dy > 0 ? 'D' : 'U');
    },
    { passive: true },
);
ui.mapsel.addEventListener('change', () => {
    // xem trước giao diện map ngay ở màn hình bắt đầu
    if (!['ready', 'gameover'].includes(state)) return;
    mapIndex = Math.min(Math.max(+ui.mapsel.value || 0, 0), MAPS.length - 1);
    loadMap();
    syncUI();
});
ui.dpad.addEventListener('pointerdown', e => {
    const d = e.target.dataset && e.target.dataset.dir;
    if (d) {
        e.preventDefault();
        steer(d);
    }
});
ui.music.addEventListener('click', () => {
    musicOn = !musicOn;
    store.set('pacman-ltg-music', musicOn ? '1' : '0');
    syncUI();
});
ui.mute.addEventListener('click', () => {
    muted = !muted;
    store.set('pacman-ltg-muted', muted ? '1' : '0');
    syncUI();
});
document.addEventListener('visibilitychange', () => {
    if (document.hidden && ['playing', 'respawning'].includes(state)) togglePause();
    lastTime = null;
});
document.querySelector('details').addEventListener('toggle', e => {
    if (e.target.open && ['playing', 'respawning'].includes(state)) togglePause();
});
ui.pause.addEventListener('click', togglePause);
ui.primary.addEventListener('click', primaryAction);
ui.restart.addEventListener('click', startGame);
Promise.all(
    Object.entries(SPRITES).map(
        ([key, src]) =>
            new Promise((resolve, reject) => {
                const img = new Image();
                images[key] = img;
                img.onload = resolve;
                img.onerror = reject;
                img.src = src;
            }),
    ),
)
    .then(() => {
        ui.mapsel.innerHTML = MAPS.map(
            (m, i) => `<option value="${i}">Map ${i + 1}: ${m.name}</option>`,
        ).join('');
        loadMap();
        setState('ready');
        requestAnimationFrame(frame);
    })
    .catch(() => setState('error'));
