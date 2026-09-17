// Run: node --test tests/game.test.cjs (Node 18+). No dependencies.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function game() {
    const elements = new Map();
    const events = {};
    let frames = 0;
    const get = id => {
        if (!elements.has(id)) elements.set(id,{
            textContent:'',hidden:false,open:false,
            addEventListener(type,fn){events[id+':'+type]=fn;},
            getContext(){return {clearRect(){},drawImage(){},beginPath(){},arc(){},fill(){},stroke(){}};}
        });
        return elements.get(id);
    };
    const document = {getElementById:get,querySelector:get,addEventListener(type,fn){events[type]=fn;}};
    const context = vm.createContext({document, Image: class {}, requestAnimationFrame(){frames++;}, console});
    for (const name of ['map.js','pacman.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),context);
    const run = code => vm.runInContext(code,context);
    run.event = (type,e={}) => events[type](e);
    run.document = document;
    run.frames = () => frames;
    run('startGame()'); return run;
}
test('all pellets and four power pellets are reachable',()=>{
    const g=game();
    assert.equal(g('[...foods.values()].filter(f=>f.power).length'),4);
    assert.equal(g(`(() => {const seen=new Set(), q=[[9,15]]; while(q.length){const [c,r]=q.shift(),key=c+','+r;if(seen.has(key)||!walkable(c,r))continue;seen.add(key);for(const [dx,dy] of Object.values(DIR))q.push([c+dx,r+dy]);}return [...foods.keys()].every(k=>seen.has(k));})()`),true);
});
test('keyboard, help and hidden-tab events pause and resume through real handlers',()=>{
    const g=game();let prevented=false;
    g.event('keydown',{code:'ArrowLeft',preventDefault(){prevented=true;}});
    assert.equal(prevented,true);assert.equal(g('pacman.next'),'L');
    g.event('keydown',{code:'Escape',repeat:false,preventDefault(){}});assert.equal(g('state'),'paused');
    g.event('primary:click');assert.equal(g('state'),'playing');
    g.event('details:toggle',{target:{open:true}});assert.equal(g('state'),'paused');
    g.event('pause:click');g.document.hidden=true;g.event('visibilitychange');assert.equal(g('state'),'paused');
});
test('restart does not spawn loops; fixed-step movement is independent of display refresh',()=>{
    const g=game();g('frame(0)');const count=g.frames();g('for(let i=0;i<20;i++)startGame()');assert.equal(g.frames(),count);
    const travel=hz=>{
        const run=game();run("ghosts=[];pacman=actor(1,3,'pacman');pacman.next='R';protectionLeft=0;frame(0)");
        run(`for(let i=1;i<=${hz};i++)frame(i*1000/${hz})`);return run('pacman.x');
    };
    assert.ok(Math.abs(travel(30)-travel(144))<=2);
});
test('blocked early turn is buffered until next valid intersection',()=>{
    const g=game();
    g("pacman=actor(1,1,'pacman');pacman.dir='R';pacman.next='D';moveActor(pacman,32)");
    // At (1,1), down is open. A separate blocked turn at (2,1) must wait until col 4.
    g("pacman=actor(2,1,'pacman');pacman.dir='R';pacman.next='D';moveActor(pacman,64)");
    assert.equal(g('pacman.x'),128);assert.equal(g('pacman.y'),32);
    g('moveActor(pacman,2)');assert.equal(g('pacman.y'),34);
});
test('wall and outside cells cannot be entered; key request does not move player',()=>{
    const g=game();g("pacman=actor(1,1,'pacman');pacman.next='U';moveActor(pacman,100)");
    assert.equal(g('pacman.y'),32);
    g("pacman=actor(1,9,'pacman');pacman.next='L';moveActor(pacman,100)");assert.equal(g('pacman.x'),32);
});
test('pause freezes positions, effects, cherry and ghost return timers',()=>{
    const g=game();g("powerLeft=5;cherryLeft=7;ghosts[0].wait=2;pacman.next='L';togglePause()");
    const before=g('JSON.stringify([pacman,ghosts,powerLeft,cherryLeft,protectionLeft,score])');
    g('for(let i=0;i<600;i++)tick(STEP)');
    assert.equal(g('JSON.stringify([pacman,ghosts,powerLeft,cherryLeft,protectionLeft,score])'),before);
    g('togglePause();tick(STEP)');assert.ok(g('powerLeft')<5);
});
test('power pellet scores once and enables ghost combo; eaten ghost is temporarily absent',()=>{
    const g=game();g("pacman=actor(1,1,'pacman');collectFood();collectFood()");assert.equal(g('score'),50);assert.equal(g('powerLeft'),8);
    g('for(const ghost of ghosts){ghost.x=pacman.x;ghost.y=pacman.y}resolveGhosts()');
    assert.equal(g('score'),3050);assert.equal(g('lives'),3);assert.equal(g('ghosts.every(g=>g.wait===3)'),true);
    g('resolveGhosts()');assert.equal(g('score'),3050);
});
test('multiple overlapping ghosts cost one life; paused respawn remains frozen',()=>{
    const g=game();g('protectionLeft=0;for(const ghost of ghosts){ghost.x=pacman.x;ghost.y=pacman.y}resolveGhosts()');
    assert.equal(g('lives'),2);assert.equal(g('state'),'respawning');
    g('togglePause();for(let i=0;i<300;i++)tick(STEP)');assert.equal(g('respawnLeft'),1.5);
    g('togglePause();for(let i=0;i<91;i++)tick(STEP)');assert.equal(g('state'),'playing');assert.ok(g('protectionLeft')>1.9);
});
test('power expiry restores lethal collision',()=>{
    const g=game();g('powerLeft=STEP/2;protectionLeft=0;ghosts[0].x=pacman.x;ghosts[0].y=pacman.y;tick(STEP)');assert.equal(g('lives'),2);
});
test('cherry unlocks at 40%, awards once and expires with gameplay time',()=>{
    const g=game();g('const amount=Math.ceil(totalFood*.4);for(const f of [...foods.values()].slice(0,amount)){pacman.x=f.c*TILE;pacman.y=f.r*TILE;collectFood()}');
    assert.equal(g('cherrySpawned'),true);assert.equal(g('cherryLeft'),10);
    g('ghosts=[];pacman.x=pacman.startX;pacman.y=pacman.startY;pacman.dir=null;pacman.next=null');const score=g('score');
    g('tick(STEP);tick(STEP)');assert.equal(g('score'),score+500);assert.equal(g('cherryLeft'),0);
    g('cherryLeft=STEP/2;pacman.x=32;pacman.y=32;tick(STEP)');assert.equal(g('cherryLeft'),0);
});
test('last pellet completes level; next round preserves lives and score',()=>{
    const g=game();g("ghosts=[];foods=new Map([['9,15',{c:9,r:15,power:false}]]);cherrySpawned=true;score=100;lives=2;tick(STEP)");
    assert.equal(g('state'),'complete');assert.equal(g('score'),110);
    g('primaryAction()');assert.equal(g('level'),2);assert.equal(g('lives'),2);assert.equal(g('score'),110);assert.ok(g('foods.size')>1);
});
test('game over stays stopped and explicit restart resets all round state',()=>{
    const g=game();g('lives=1;protectionLeft=0;ghosts[0].x=pacman.x;ghosts[0].y=pacman.y;tick(STEP)');
    assert.equal(g('state'),'gameover');g('tick(STEP)');assert.equal(g('lives'),0);
    g('primaryAction()');assert.equal(g('state'),'playing');assert.equal(g('lives'),3);assert.equal(g('score'),0);assert.equal(g('powerLeft'),0);assert.equal(g('cherrySpawned'),false);
});
test('random movement keeps ghosts on traversable corridors for 2 simulated minutes',()=>{
    const g=game();assert.equal(g(`(() => {for(let i=0;i<7200;i++)for(const a of ghosts){moveActor(a,2);if(!walkable(Math.floor(a.x/TILE),Math.floor(a.y/TILE))||!walkable(Math.ceil(a.x/TILE),Math.ceil(a.y/TILE)))return false;}return true;})()`),true);
});
