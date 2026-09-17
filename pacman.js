"use strict";

// All durations use simulation time: overlays and hidden tabs freeze every timer.
const TILE = 32;
const STEP = 1 / 60;
const RULES = Object.freeze({power: 8, cherry: 10, respawn: 1.5, protection: 2, ghostRespawn: 3});
const DIR = {U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0]};
const OPPOSITE = {U: 'D', D: 'U', L: 'R', R: 'L'};
const KEYS = {ArrowUp:'U', KeyW:'U', ArrowDown:'D', KeyS:'D', ArrowLeft:'L', KeyA:'L', ArrowRight:'R', KeyD:'R'};
const SPRITES = {wall:'assets/wall.png', U:'assets/pacmanUp.png', D:'assets/pacmanDown.png', L:'assets/pacmanLeft.png', R:'assets/pacmanRight.png', b:'assets/blueGhost.png', o:'assets/orangeGhost.png', p:'assets/pinkGhost.png', r:'assets/redGhost.png', scared:'assets/scaredGhost.png', cherry:'assets/cherry.png'};
const images = {};
let state = 'loading', pausedState = null;
let score = 0, lives = 3, level = 1;
let pacman, ghosts = [], foods = new Map();
let powerLeft = 0, combo = 0, respawnLeft = 0, protectionLeft = 0;
let cherryLeft = 0, cherrySpawned = false, totalFood = 0;
let accumulator = 0, lastTime = null;
const board = document.getElementById('board');
const ctx = board.getContext('2d');
const ui = Object.fromEntries(['score','lives','level','pause','overlay','title','message','primary','restart','status'].map(id => [id, document.getElementById(id)]));

function walkable(c, r) {
    const cell = tileMap[r]?.[c];
    return cell !== undefined && cell !== 'X' && cell !== 'O';
}
function actor(c, r, kind) {
    return {x:c*TILE, y:r*TILE, startX:c*TILE, startY:r*TILE, kind, dir:'R', next:null, wait:0};
}
function loadMap() {
    if (tileMap.some(row => row.length !== 19) || tileMap.length !== 21) throw new Error('Kích thước bản đồ không hợp lệ');
    foods = new Map(); ghosts = [];
    tileMap.forEach((row, r) => [...row].forEach((cell, c) => {
        if (cell === 'P') pacman = actor(c, r, 'pacman');
        if ('bopr'.includes(cell)) ghosts.push(actor(c, r, cell));
        if (cell === ' ') foods.set(`${c},${r}`, {c, r, power:false});
    }));
    for (const key of ['1,1','17,1','1,19','17,19']) foods.get(key).power = true;
    totalFood = foods.size;
    cherrySpawned = false; cherryLeft = 0;
    resetPositions();
}
function resetPositions() {
    for (const a of [pacman, ...ghosts]) {
        a.x = a.startX; a.y = a.startY; a.dir = a.kind === 'pacman' ? null : 'U'; a.next = null; a.wait = 0;
    }
    powerLeft = 0; combo = 0; protectionLeft = RULES.protection;
}
function setState(next) {
    state = next; accumulator = 0;
    syncUI();
}
function startGame() {
    score = 0; lives = 3; level = 1; pausedState = null; respawnLeft = 0;
    document.querySelector('details').open = false;
    loadMap(); setState('playing');
}
function togglePause() {
    if (state === 'playing' || state === 'respawning') {
        pausedState = state; setState('paused');
    } else if (state === 'paused') {
        document.querySelector('details').open = false;
        setState(pausedState); pausedState = null;
    }
}
function primaryAction() {
    if (state === 'ready' || state === 'gameover') startGame();
    else if (state === 'paused') togglePause();
    else if (state === 'complete') {
        level++; loadMap(); setState('playing');
    }
}
function syncUI() {
    ui.score.textContent = score; ui.lives.textContent = lives; ui.level.textContent = level;
    ui.pause.disabled = !['playing','paused','respawning'].includes(state);
    ui.pause.textContent = state === 'paused' ? 'Tiếp tục' : 'Tạm dừng';
    ui.overlay.hidden = state === 'playing';
    ui.primary.disabled = ['loading','error','respawning'].includes(state);
    ui.primary.hidden = state === 'respawning' || state === 'error';
    ui.restart.hidden = !['paused','complete'].includes(state);
    const messages = {
        loading:['Đang tải…','Chuẩn bị mê cung','Đang tải'],
        ready:['Sẵn sàng chưa?','Ăn hết chấm, tránh những bóng ma.\nViên năng lượng giúp đảo ngược cuộc săn trong 8 giây.','Bắt đầu'],
        paused:['Tạm dừng','Mê cung và mọi bộ đếm đang dừng.','Tiếp tục'],
        respawning:['Thử lại nào!','Chuẩn bị hồi sinh…',''],
        complete:['Hoàn thành vòng '+level,'Điểm hiện tại: '+score+'\nTiếp tục với cùng mê cung và tốc độ.','Vòng tiếp theo'],
        gameover:['Kết thúc ván','Điểm của em: '+score+'\nSẵn sàng cho một lượt mới?','Chơi lại'],
        error:['Không tải được ảnh','Kiểm tra các file PNG nằm cùng thư mục với index.html rồi tải lại trang.','']
    };
    if (messages[state]) [ui.title.textContent, ui.message.textContent, ui.primary.textContent] = messages[state];
    ui.status.textContent = powerLeft > 0 ? `Ăn ma: ${powerLeft.toFixed(1)}s · Chuỗi ${combo}` : cherryLeft > 0 ? `Cherry tại điểm xuất phát: ${cherryLeft.toFixed(1)}s` : protectionLeft > 0 && state === 'playing' ? 'Đang được bảo vệ' : `Còn ${foods.size} chấm · Cherry +500 điểm`;
}
function aligned(a) { return a.x % TILE === 0 && a.y % TILE === 0; }
function canGo(a, direction) {
    if (!direction) return false;
    const [dx, dy] = DIR[direction];
    return walkable(a.x/TILE + dx, a.y/TILE + dy);
}
function moveActor(a, distance) {
    // Pixel substeps keep turns aligned and prevent crossing thin walls.
    for (let i = 0; i < distance; i++) {
        if (aligned(a)) {
            if (a.kind === 'pacman') {
                if (canGo(a, a.next)) a.dir = a.next;
            } else {
                const valid = Object.keys(DIR).filter(d => canGo(a, d));
                const forward = valid.filter(d => d !== OPPOSITE[a.dir]);
                const choices = forward.length ? forward : valid;
                if (choices.length) a.dir = choices[Math.floor(Math.random()*choices.length)];
            }
            if (!canGo(a, a.dir)) return;
        }
        if (!a.dir) return;
        a.x += DIR[a.dir][0]; a.y += DIR[a.dir][1];
    }
}
function touching(a, b, radius = 23) { return Math.hypot(a.x-b.x, a.y-b.y) < radius; }
function collectFood() {
    const c = Math.round(pacman.x/TILE), r = Math.round(pacman.y/TILE);
    const key = `${c},${r}`, food = foods.get(key);
    if (!food || !touching(pacman, {x:c*TILE,y:r*TILE}, 9)) return;
    foods.delete(key); score += food.power ? 50 : 10;
    if (food.power) { powerLeft = RULES.power; combo = 0; }
    if (!cherrySpawned && totalFood-foods.size >= Math.ceil(totalFood*.4)) {
        cherrySpawned = true; cherryLeft = RULES.cherry;
    }
}
function resolveGhosts() {
    for (const ghost of ghosts) {
        if (ghost.wait > 0 || !touching(pacman, ghost)) continue;
        if (powerLeft > 0) {
            score += 200 * 2 ** Math.min(combo, 3); combo++;
            ghost.x = ghost.startX; ghost.y = ghost.startY; ghost.dir = 'U'; ghost.wait = RULES.ghostRespawn;
        } else if (protectionLeft <= 0) {
            lives--; powerLeft = 0; combo = 0;
            if (lives === 0) setState('gameover');
            else { respawnLeft = RULES.respawn; setState('respawning'); }
            return true; // A pile of ghosts can only cost one life per collision.
        }
    }
    return false;
}
function tick(dt) {
    if (state === 'respawning') {
        respawnLeft = Math.max(0, respawnLeft-dt);
        if (respawnLeft === 0) { resetPositions(); setState('playing'); }
        return;
    }
    if (state !== 'playing') return;
    powerLeft = Math.max(0,powerLeft-dt);
    protectionLeft = Math.max(0,protectionLeft-dt);
    cherryLeft = Math.max(0,cherryLeft-dt);
    moveActor(pacman, 2);
    collectFood();
    if (cherryLeft > 0 && touching(pacman,{x:pacman.startX,y:pacman.startY},14)) { score += 500; cherryLeft = 0; }
    if (resolveGhosts()) return;
    for (const ghost of ghosts) {
        if (ghost.wait > 0) { ghost.wait = Math.max(0,ghost.wait-dt); continue; }
        moveActor(ghost, powerLeft > 0 ? 1 : 2);
    }
    if (resolveGhosts()) return;
    if (foods.size === 0) setState('complete');
}
function draw() {
    ctx.clearRect(0,0,board.width,board.height);
    tileMap.forEach((row,r) => [...row].forEach((cell,c) => {
        if (cell === 'X') ctx.drawImage(images.wall,c*TILE,r*TILE,TILE,TILE);
    }));
    for (const f of foods.values()) {
        ctx.fillStyle = f.power ? '#ffe35a' : '#ffe9d2'; ctx.beginPath();
        ctx.arc(f.c*TILE+16,f.r*TILE+16,f.power?7:2,0,Math.PI*2); ctx.fill();
    }
    if (cherryLeft > 0) ctx.drawImage(images.cherry,pacman.startX,pacman.startY,TILE,TILE);
    if (protectionLeft > 0) { ctx.strokeStyle='#ffe35a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(pacman.x+16,pacman.y+16,17,0,Math.PI*2);ctx.stroke(); }
    ctx.drawImage(images[pacman.dir || 'R'],pacman.x+2,pacman.y+2,28,28);
    for (const g of ghosts) {
        if (g.wait > 0) continue;
        const scared = powerLeft > 0 && (powerLeft > 2 || Math.floor(powerLeft*6)%2 === 0);
        ctx.drawImage(images[scared?'scared':g.kind],g.x+2,g.y+2,28,28);
    }
}
function frame(time) {
    const elapsed = lastTime === null ? 0 : Math.min((time-lastTime)/1000,.1);
    lastTime = time;
    if (state === 'playing' || state === 'respawning') {
        accumulator += elapsed;
        while (accumulator >= STEP) {
            accumulator -= STEP; tick(STEP);
            if (!['playing','respawning'].includes(state)) break;
        }
    } else accumulator = 0;
    if (pacman) draw();
    syncUI(); requestAnimationFrame(frame);
}
document.addEventListener('keydown', e => {
    if (KEYS[e.code]) {
        e.preventDefault();
        if (state === 'playing') pacman.next = KEYS[e.code];
    } else if (e.code === 'Escape' && !e.repeat) { e.preventDefault(); togglePause(); }
});
document.addEventListener('visibilitychange', () => {
    if (document.hidden && ['playing','respawning'].includes(state)) togglePause();
    lastTime = null;
});
document.querySelector('details').addEventListener('toggle', e => {
    if (e.target.open && ['playing','respawning'].includes(state)) togglePause();
});
ui.pause.addEventListener('click', togglePause);
ui.primary.addEventListener('click', primaryAction);
ui.restart.addEventListener('click', startGame);
Promise.all(Object.entries(SPRITES).map(([key,src]) => new Promise((resolve,reject) => {
    const img = new Image(); images[key] = img; img.onload = resolve; img.onerror = reject; img.src = src;
}))).then(() => { loadMap(); setState('ready'); requestAnimationFrame(frame); }).catch(() => setState('error'));
