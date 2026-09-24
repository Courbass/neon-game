{\rtf1\ansi\ansicpg1252\cocoartf2907
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 (() => \{\
  const canvas = document.getElementById('game');\
  const ctx = canvas.getContext('2d');\
  const W = 1080, H = 620;\
  const ui = \{\
    start: document.getElementById('startScreen'), pause: document.getElementById('pauseScreen'), over: document.getElementById('gameOverScreen'),\
    boost: document.getElementById('healthBar'), lives: document.getElementById('healthText'), score: document.getElementById('scoreText'), level: document.getElementById('levelText'), wave: document.getElementById('waveText'), kills: document.getElementById('killsText'), toast: document.getElementById('toast'), final: document.getElementById('finalScore')\
  \};\
  const keys = \{\};\
  let running=false, paused=false, last=0, elapsed=0, distance=0, spawnTimer=0, obstacleTimer=0, shotTimer=0, powerTimer=0, audioOn=false;\
  let player, enemies, obstacles, bullets, particles, powerups, score, kills, wave, lives, streak, bestStreak, rapidUntil, spreadUntil, shieldUntil, boost, boostUntil, bossForWave, bossDefeated;\
  const audio = new (window.AudioContext || window.webkitAudioContext)();\
  \
  // --- SISTEMA DE CONTROLES M\'d3VILES ---\
  const mobileControls = document.getElementById('mobile-controls');\
  const joystickBase = document.getElementById('joystick-base');\
  const joystickStick = document.getElementById('joystick-stick');\
  const fireButton = document.getElementById('fire-button');\
  let isTouchDevice = 'ontouchstart' in window;\
\
  if (isTouchDevice) \{\
    mobileControls.classList.remove('hidden');\
    document.getElementById('control-hint').textContent = "Usa el Joystick para moverte \'b7 Bot\'f3n Naranja para disparar";\
    document.getElementById('pause-hint').textContent = "Toca la pantalla para continuar";\
  \}\
\
  const handleJoystick = (event) => \{\
    event.preventDefault();\
    const touch = event.touches[0];\
    const rect = joystickBase.getBoundingClientRect();\
    const centerX = rect.left + rect.width / 2;\
    const centerY = rect.top + rect.height / 2;\
    const deltaX = touch.clientX - centerX;\
    const deltaY = touch.clientY - centerY;\
    const distance = Math.min(60, Math.hypot(deltaX, deltaY));\
    const angle = Math.atan2(deltaY, deltaX);\
\
    const stickX = Math.cos(angle) * distance;\
    const stickY = Math.sin(angle) * distance;\
    joystickStick.style.transform = `translate($\{stickX\}px, $\{stickY\}px)`;\
\
    // Mapeo de Joystick a Teclas\
    keys['arrowleft'] = deltaX < -20;\
    keys['arrowright'] = deltaX > 20;\
    keys['arrowup'] = deltaY < -20;\
    keys['arrowdown'] = deltaY > 20;\
    keys['a'] = keys['arrowleft'];\
    keys['d'] = keys['arrowright'];\
    keys['w'] = keys['arrowup'];\
    keys['s'] = keys['arrowdown'];\
  \};\
\
  joystickBase.addEventListener('touchstart', handleJoystick);\
  joystickBase.addEventListener('touchmove', handleJoystick);\
  joystickBase.addEventListener('touchend', () => \{\
    joystickStick.style.transform = `translate(0px, 0px)`;\
    keys['arrowleft'] = keys['arrowright'] = keys['arrowup'] = keys['arrowdown'] = false;\
    keys['a'] = keys['d'] = keys['w'] = keys['s'] = false;\
  \});\
\
  fireButton.addEventListener('touchstart', (e) => \{ e.preventDefault(); keys[' '] = true; \});\
  fireButton.addEventListener('touchend', () => \{ keys[' '] = false; \});\
\
  // --- L\'d3GICA DEL JUEGO (Copia exacta de tu original con ajustes) ---\
  const enemyTypes = \{\
    scout: \{name:'EXPLORADOR', hp:1, spd:112, r:12, score:55, boost:13, color:'#9c7cff'\},\
    dart: \{name:'ACECHADOR', hp:1, spd:82, r:14, score:75, boost:16, color:'#36e6ee', zigzag:true\},\
    shield: \{name:'CENTINELA', hp:3, spd:62, r:19, score:150, boost:25, color:'#ffce73'\},\
    tank: \{name:'TIT\'c1N', hp:6, spd:43, r:27, score:300, boost:42, color:'#ff805d'\}\
  \};\
  const scenes = [\
    \{name:'CIUDAD INDUSTRIAL', tint:'#142638', accent:'#36e6ee', obstacles:['concrete','roadblock','wreck']\},\
    \{name:'DESIERTO DE CHATARRA', tint:'#30241c', accent:'#ffb75e', obstacles:['duneRock','crater','wreck']\},\
    \{name:'ESTACI\'d3N ORBITAL', tint:'#1d1936', accent:'#a88cff', obstacles:['cargo','reactor','gate']\},\
    \{name:'RUINAS GLACIALES', tint:'#123647', accent:'#8feeff', obstacles:['iceShard','glacier','wreck']\},\
    \{name:'CA\'d1\'d3N VOLC\'c1NICO', tint:'#3a1718', accent:'#ff7654', obstacles:['lavaRock','magmaVent','wreck']\},\
    \{name:'FOSA ABISAL', tint:'#092b42', accent:'#54d5e8', obstacles:['coral','mine','wreck']\},\
    \{name:'BOSQUE DE NE\'d3N', tint:'#102d27', accent:'#75ff9d', obstacles:['tree','root','wreck']\},\
    \{name:'LLANURA CRISTALINA', tint:'#21325a', accent:'#83b1ff', obstacles:['crystal','monolith','wreck']\},\
    \{name:'LUNA CARMES\'cd', tint:'#3a142a', accent:'#ff79b7', obstacles:['asteroid','rift','wreck']\},\
    \{name:'N\'daCLEO DEL VAC\'cdO', tint:'#110d1e', accent:'#d18cff', obstacles:['voidRock','gate','reactor']\}\
  ];\
\
  function sound(freq,duration=.06,type='sine',volume=.04)\{ if(!audioOn) return; const o=audio.createOscillator(),g=audio.createGain(); o.type=type;o.frequency.value=freq;g.gain.value=volume;o.connect(g).connect(audio.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.stop(audio.currentTime+duration); \}\
  function reset()\{ player=\{x:190,y:H/2,r:15,angle:0,invulnUntil:0\}; enemies=[];obstacles=[];bullets=[];particles=[];powerups=[];score=0;kills=0;wave=1;lives=3;streak=0;bestStreak=0;boost=0;bossForWave=bossDefeated=false;rapidUntil=spreadUntil=shieldUntil=boostUntil=0;elapsed=distance=spawnTimer=shotTimer=0;obstacleTimer=3.5;powerTimer=7;updateUI(); \}\
  function start()\{ reset(); running=true;paused=false;ui.start.classList.add('hidden');ui.over.classList.add('hidden');requestAnimationFrame(loop); \}\
  function fmt(n)\{return String(n).padStart(6,'0')\}\
  function levelNumber()\{return Math.floor((wave-1)/2)+1\}\
  function sceneIndex()\{return Math.min(scenes.length-1,levelNumber()-1)\}\
  function scene()\{return scenes[sceneIndex()]\}\
  function boostActive()\{return elapsed<boostUntil\}\
  function updateUI()\{\
    ui.boost.style.width=(boostActive()?100:boost)+'%'; ui.boost.style.background=boostActive()?'linear-gradient(90deg,#ff805d,#ffe47a)':'linear-gradient(90deg,#36e6ee,#89f6e3)';\
    ui.lives.textContent='\uc0\u9679  '.repeat(lives).trimEnd() || '\'97'; ui.lives.style.color=lives===1?'#ff805d':'#cbe6e8'; ui.score.textContent=fmt(score);ui.level.textContent=String(levelNumber()).padStart(2,'0');ui.wave.textContent=`OLEADA $\{wave\}`;ui.kills.textContent=`$\{kills\} objetivos`;\
  \}\
  function toast(text)\{ui.toast.textContent=text;ui.toast.classList.add('visible');setTimeout(()=>ui.toast.classList.remove('visible'),1300)\}\
  function rand(a,b)\{return a+Math.random()*(b-a)\}\
  function chooseEnemy()\{const roll=Math.random();if(wave<2)return roll<.7?'scout':'dart';if(wave<4)return roll<.45?'scout':roll<.75?'dart':'shield';return roll<.27?'scout':roll<.52?'dart':roll<.82?'shield':'tank'\}\
  function spawnEnemy()\{const type=chooseEnemy(),s=enemyTypes[type],roll=Math.random(),behavior=roll<.34?'drift':roll<.7?'flank':'hunter';enemies.push(\{type,...s,x:W+45,y:rand(48,H-48),hp:s.hp,maxHp:s.hp,hit:0,phase:Math.random()*7,behavior,targetY:rand(60,H-60),turnDelay:rand(1.1,3.1),drift:rand(-1,1)\});\}\
  function spawnBoss()\{const hp=18+levelNumber()*6;enemies.push(\{type:'boss',name:`GUARDI\'c1N $\{levelNumber()\}`,x:W+78,y:H/2,r:42,spd:31,hp,maxHp:hp,score:1200,boost:100,color:'#ff4f86',hit:0,phase:0,behavior:'hunter',boss:true\});toast(`BOSS // GUARDI\'c1N $\{levelNumber()\} DETECTADO`);sound(95,.4,'sawtooth',.1);\}\
  function advanceWave()\{const previousLevel=levelNumber(),previousScene=sceneIndex();wave++;kills=0;if(levelNumber()>previousLevel)\{const gainedLife=lives<5;lives=Math.min(5,lives+1);toast(gainedLife?`BOSS DESTRUIDO // +1 VIDA // $\{scene().name\}`:`BOSS DESTRUIDO // VIDAS AL M\'c1XIMO`)\}else toast(sceneIndex()!==previousScene?`NUEVO ESCENARIO // $\{scene().name\}`:`OLEADA $\{wave\} // AMENAZA CRECIENTE`);sound(640,.2,'sine',.06);\}\
  function spawnObstacle()\{const kind=scene().obstacles[Math.floor(Math.random()*3)];const data=['roadblock','gate','cargo'].includes(kind)?\{w:kind==='cargo'?52:28,h:kind==='cargo'?42:88,r:0\}:kind==='reactor'?\{w:40,h:40,r:0\}:\{r:kind==='duneRock'?30:kind==='crater'?34:18\};obstacles.push(\{kind,x:W+45,y:rand(58,H-58),...data,spin:Math.random()*6\});\}\
  function shoot()\{const interval=boostActive()?.07:elapsed<rapidUntil?.095:.19;if(elapsed-shotTimer<interval)return;shotTimer=elapsed;let angles=boostActive()?[-.065,.065]:elapsed<spreadUntil?[-.19,0,.19]:[0];angles.forEach(a=>bullets.push(\{x:player.x+20,y:player.y,vx:Math.cos(a)*660,vy:Math.sin(a)*660,r:3,life:1.1\}));sound(boostActive()?360:220,.045,'square',.027);\}\
  function boom(x,y,color,count=10)\{for(let i=0;i<count;i++)\{const a=Math.random()*Math.PI*2,s=rand(40,210);particles.push(\{x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.2,.6),max:.6,color\});\}\}\
  function powerup()\{const types=['rapid','spread','shield','heal'];const type=types[Math.floor(Math.random()*types.length)];powerups.push(\{x:rand(W*.52,W-100),y:rand(80,H-80),type,r:12,life:12,pulse:0\});\}\
  function takeHit(cause)\{if(elapsed<player.invulnUntil||elapsed<shieldUntil)return;player.invulnUntil=elapsed+1.25;lives--;streak=0;boom(player.x,player.y,'#ff805d',20);sound(70,.14,'sawtooth',.09);toast(`$\{cause\} // VIDA PERDIDA`);if(lives<=0)gameOver();\}\
  function circleRect(x,y,r,o)\{const nx=Math.max(o.x-o.w/2,Math.min(x,o.x+o.w/2)),ny=Math.max(o.y-o.h/2,Math.min(y,o.y+o.h/2));return Math.hypot(x-nx,y-ny)<r;\}\
  function update(dt)\{\
    elapsed+=dt;distance+=dt*54;const speed=265*dt;const dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);if(dx||dy)\{const len=Math.hypot(dx,dy);player.x=Math.max(52,Math.min(W*.44,player.x+dx/len*speed));player.y=Math.max(30,Math.min(H-30,player.y+dy/len*speed));\}if(keys[' '])shoot();\
    if(!bossForWave&&enemies.length<4+wave*2&&spawnTimer<=0)\{spawnEnemy();spawnTimer=Math.max(.2,.78-wave*.035)\}spawnTimer-=dt;if(obstacleTimer<=0)\{spawnObstacle();obstacleTimer=rand(4.4,7.5)\}obstacleTimer-=dt;if(kills>=wave*10&&!bossForWave)\{if(wave%2===0)\{bossForWave=true;spawnBoss()\}else advanceWave()\}if(bossDefeated)\{bossDefeated=false;bossForWave=false;advanceWave()\}powerTimer-=dt;if(powerTimer<0)\{powerup();powerTimer=rand(8,14)\}\
    bullets.forEach(b=>\{b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt\});bullets=bullets.filter(b=>b.life>0&&b.x>-30&&b.x<W+30&&b.y>-30&&b.y<H+30);\
    enemies.forEach(e=>\{let vy=0;e.x=e.boss?Math.max(W*.58,e.x-(e.spd+54)*dt):e.x-(e.spd+54)*dt;if(e.behavior==='hunter')vy=(player.y-e.y)*.27;else if(e.behavior==='flank')\{e.turnDelay-=dt;vy=((e.turnDelay>0?e.targetY:player.y)-e.y)*(e.turnDelay>0?.52:.34)\}else vy=e.drift*38+Math.sin(elapsed*2.4+e.phase)*16;if(e.zigzag)vy+=Math.sin(elapsed*5+e.phase)*38;e.y=Math.max(28,Math.min(H-28,e.y+vy*dt));e.angle=Math.atan2(vy,-(e.spd+54));e.hit=Math.max(0,e.hit-dt);\});obstacles.forEach(o=>\{o.x-=108*dt;o.spin+=dt*1.5\});\
    for(const b of bullets)\{for(const e of enemies)\{if(!b.dead&&!e.dead&&Math.hypot(b.x-e.x,b.y-e.y)<b.r+e.r+2)\{b.dead=true;e.hp--;e.hit=.12;boom(b.x,b.y,e.color,4);if(e.hp<=0)\{e.dead=true;score+=e.score;kills++;streak++;bestStreak=Math.max(bestStreak,streak);if(e.boss)bossDefeated=true;boost=Math.min(100,boost+e.boost);boom(e.x,e.y,e.color,e.boss?46:e.type==='tank'?30:13);sound(e.boss?55:e.type==='tank'?80:130,.08,'sawtooth',.05);if(boost>=100)\{boost=0;boostUntil=elapsed+7;toast('BOOST DOBLE // 7 SEGUNDOS');sound(780,.22,'sine',.08)\}\}\}\}\}\
    bullets=bullets.filter(b=>!b.dead);enemies=enemies.filter(e=>!e.dead&&e.x>-60);obstacles=obstacles.filter(o=>!o.dead&&o.x>-80);\
    enemies.forEach(e=>\{if(Math.hypot(e.x-player.x,e.y-player.y)<e.r+player.r)\{if(!e.boss)e.dead=true;takeHit(e.boss?'BOSS':e.name);\}\});obstacles.forEach(o=>\{const hit=o.w?circleRect(player.x,player.y,player.r,o):Math.hypot(o.x-player.x,o.y-player.y)<player.r+o.r;if(hit)\{o.dead=true;takeHit('OBST\'c1CULO');boom(o.x,o.y,'#ff805d',18);\}\});enemies=enemies.filter(e=>!e.dead);obstacles=obstacles.filter(o=>!o.dead);\
    powerups.forEach(p=>\{p.life-=dt;p.pulse+=dt;if(Math.hypot(p.x-player.x,p.y-player.y)<p.r+player.r+5)\{p.got=true;if(p.type==='rapid')\{rapidUntil=elapsed+8;toast('R\'c1FAGA ACTIVADA // 8s')\}if(p.type==='spread')\{spreadUntil=elapsed+8;toast('TRIFUEGO ACTIVADO // 8s')\}if(p.type==='shield')\{shieldUntil=elapsed+7;toast('ESCUDO ACTIVADO // 7s')\}if(p.type==='heal')\{const repaired=lives<5;lives=Math.min(5,lives+1);toast(repaired?'VIDA REPARADA':'VIDAS AL M\'c1XIMO')\}score+=25;sound(500,.13,'sine',.06);boom(p.x,p.y,p.type==='heal'?'#8fffe8':'#ffe48d',18)\}\});powerups=powerups.filter(p=>p.life>0&&!p.got);particles.forEach(p=>\{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt\});particles=particles.filter(p=>p.life>0);updateUI();\
  \}\
  function line(x1,y1,x2,y2,color,width=1)\{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()\}\
  function drawObstacle(o)\{ctx.save();ctx.translate(o.x,o.y);ctx.lineWidth=2;\
    if(o.kind==='roadblock')\{ctx.fillStyle='#4e3542';ctx.strokeStyle='#ff805d';ctx.fillRect(-o.w/2,-o.h/2,o.w,o.h);ctx.strokeRect(-o.w/2,-o.h/2,o.w,o.h);for(let y=-o.h/2+12;y<o.h/2;y+=18)line(-o.w/2,y,o.w/2,y,'#ffb078',1)\}\
    else if(o.kind==='concrete')\{ctx.fillStyle='#566675';ctx.strokeStyle='#b5c7d6';ctx.fillRect(-o.r,-o.r*.65,o.r*2,o.r*1.3);ctx.strokeRect(-o.r,-o.r*.65,o.r*2,o.r*1.3);line(-o.r,o.r*.1,o.r,-o.r*.2,'#32404c',2)\}\
    else if(o.kind==='duneRock'||o.kind==='crater')\{ctx.rotate(o.spin);ctx.fillStyle=o.kind==='duneRock'?'#8b6546':'#38291f';ctx.strokeStyle=o.kind==='duneRock'?'#f3ba79':'#a5744f';ctx.beginPath();for(let i=0;i<7;i++)\{const a=i*Math.PI*2/7,r=o.r*(.75+(i%2)*.22);i?ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r):ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r)\}ctx.closePath();ctx.fill();ctx.stroke();if(o.kind==='crater')\{ctx.beginPath();ctx.arc(0,0,o.r*.48,0,Math.PI*2);ctx.stroke();\}\}\
    else if(o.kind==='cargo')\{ctx.fillStyle='#424d79';ctx.strokeStyle='#a88cff';ctx.fillRect(-o.w/2,-o.h/2,o.w,o.h);ctx.strokeRect(-o.w/2,-o.h/2,o.w,o.h);line(-o.w/2,0,o.w/2,0,'#a88cff',1);line(0,-o.h/2,0,o.h/2,'#a88cff',1)\}\
    else if(o.kind==='reactor')\{ctx.fillStyle='#322b53';ctx.strokeStyle='#b79aff';ctx.fillRect(-o.w/2,-o.h/2,o.w,o.h);ctx.strokeRect(-o.w/2,-o.h/2,o.w,o.h);ctx.fillStyle='#d7c7ff';ctx.beginPath();ctx.arc(0,0,7+Math.sin(elapsed*6)*2,0,Math.PI*2);ctx.fill()\}\
    else if(o.kind==='gate')\{ctx.strokeStyle='#b79aff';ctx.shadowBlur=12;ctx.shadowColor='#a88cff';ctx.strokeRect(-o.w/2,-o.h/2,o.w,o.h);line(-o.w/2,0,o.w/2,0,'#d9cbff',2)\}\
    else\{ctx.rotate(o.spin);ctx.fillStyle='#586271';ctx.strokeStyle='#9baec3';ctx.beginPath();for(let i=0;i<7;i++)\{const a=i*Math.PI*2/7,r=o.r*(.75+(i%2)*.22);i?ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r):ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r)\}ctx.closePath();ctx.fill();ctx.stroke();\}ctx.restore();\}\
  function drawSceneLandmarks()\{\
    const sceneId=sceneIndex(), scroll=distance;\
    ctx.save();\
    if(sceneId===0)\{\
      const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#1b4960');sky.addColorStop(.58,'#102435');sky.addColorStop(1,'#070e17');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);\
      ctx.fillStyle='#537986';ctx.globalAlpha=.22;ctx.beginPath();ctx.arc(W*.72,105,62,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#0a151f';ctx.fillRect(0,H-155,W,155);\
      for(let i=0;i<11;i++)\{const x=(i*130-scroll*.55)% (W+130)-60, building=65+(i%4)*33;ctx.fillStyle=i%2?'#111f2d':'#0d1925';ctx.fillRect(x,H-155-building,86,building);ctx.fillStyle='#4ad7db';ctx.globalAlpha=.6;for(let y=H-138-building;y<H-165;y+=18)\{ctx.fillRect(x+15,y,9,5);ctx.fillRect(x+47,y,9,5)\}ctx.globalAlpha=1;ctx.fillStyle='#193947';ctx.fillRect(x+68,H-166-building,3,12)\}\
      ctx.fillStyle='#245d6c';ctx.globalAlpha=.85;ctx.fillRect(0,H-76,W,4);ctx.fillRect(0,H-44,W,2);ctx.fillStyle='#86f3ef';ctx.fillRect((scroll*2)%W,H-76,46,4);\
    \} else if(sceneId===1)\{\
      const dusk=ctx.createLinearGradient(0,0,0,H);dusk.addColorStop(0,'#b8663f');dusk.addColorStop(.48,'#6f392b');dusk.addColorStop(1,'#20181b');ctx.fillStyle=dusk;ctx.fillRect(0,0,W,H);ctx.fillStyle='#ffd483';ctx.globalAlpha=.7;ctx.beginPath();ctx.arc(W*.76,108,50,0,Math.PI*2);ctx.fill();ctx.fillStyle='#3e291d';ctx.globalAlpha=1;ctx.fillRect(0,H-120,W,120);ctx.fillStyle='#72492d';\
      for(let x=-170;x<W+180;x+=190)\{ctx.beginPath();ctx.ellipse(x-(scroll*.55%190),H-48,128,72,0,0,Math.PI*2);ctx.fill();\}ctx.fillStyle='#bb7749';ctx.globalAlpha=.7;ctx.beginPath();ctx.ellipse(W*.58,H-42,260,46,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle='#ef9b5e';ctx.globalAlpha=.35;ctx.beginPath();ctx.moveTo(0,H-118);ctx.lineTo(W,H-118);ctx.stroke();\
    \} else if(sceneId===2) \{\
      const voidSky=ctx.createLinearGradient(0,0,W,H);voidSky.addColorStop(0,'#201648');voidSky.addColorStop(.55,'#0b102a');voidSky.addColorStop(1,'#050914');ctx.fillStyle=voidSky;ctx.fillRect(0,0,W,H);ctx.fillStyle='#d8ccff';\
      for(let i=0;i<46;i++)\{const x=(i*97-scroll*(.22+(i%3)*.07))%W,y=(i*53)%H;ctx.globalAlpha=.28+(i%3)*.2;ctx.fillRect(x,y,i%4?2:3,i%4?2:3)\}\
      ctx.globalAlpha=1;ctx.strokeStyle='#4f4383';ctx.lineWidth=20;ctx.beginPath();ctx.moveTo(0,82);ctx.lineTo(W,82);ctx.moveTo(0,H-82);ctx.lineTo(W,H-82);ctx.stroke();ctx.strokeStyle='#a88cff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,82);ctx.lineTo(W,82);ctx.moveTo(0,H-82);ctx.lineTo(W,H-82);ctx.stroke();\
    \} else if(sceneId===3)\{\
      const ice=ctx.createLinearGradient(0,0,0,H);ice.addColorStop(0,'#78cce7');ice.addColorStop(.55,'#245474');ice.addColorStop(1,'#102536');ctx.fillStyle=ice;ctx.fillRect(0,0,W,H);ctx.fillStyle='#e1fbff';ctx.globalAlpha=.5;ctx.beginPath();ctx.arc(W*.25,95,45,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#16394e';ctx.fillRect(0,H-115,W,115);for(let x=-50;x<W+90;x+=118)\{ctx.fillStyle='#8ce4f1';ctx.globalAlpha=.6;ctx.beginPath();ctx.moveTo(x-(scroll*.35%118),H-104);ctx.lineTo(x+36-(scroll*.35%118),H-250);ctx.lineTo(x+72-(scroll*.35%118),H-104);ctx.fill()\}ctx.globalAlpha=1;\
    \} else if(sceneId===4)\{\
      const lava=ctx.createLinearGradient(0,0,0,H);lava.addColorStop(0,'#5d1c26');lava.addColorStop(.55,'#30121c');lava.addColorStop(1,'#100b13');ctx.fillStyle=lava;ctx.fillRect(0,0,W,H);ctx.fillStyle='#1c1118';ctx.fillRect(0,H-145,W,145);ctx.fillStyle='#e64b36';ctx.globalAlpha=.7;for(let x=-120;x<W+130;x+=175)\{ctx.beginPath();ctx.ellipse(x-(scroll*.45%175),H-30,95,25,0,0,Math.PI*2);ctx.fill()\}ctx.globalAlpha=1;ctx.fillStyle='#a7352d';for(let i=0;i<4;i++)\{ctx.fillRect((i*280-scroll*.7)%W,H-120,8,120)\}\
    \} else if(sceneId===5)\{\
      const sea=ctx.createLinearGradient(0,0,0,H);sea.addColorStop(0,'#135f7b');sea.addColorStop(.6,'#0b314e');sea.addColorStop(1,'#071927');ctx.fillStyle=sea;ctx.fillRect(0,0,W,H);ctx.fillStyle='#77e9e6';for(let i=0;i<22;i++)\{ctx.globalAlpha=.12+(i%3)*.08;ctx.beginPath();ctx.arc((i*149-scroll*.25)%W,(i*77+scroll*.1)%H,3+(i%4),0,Math.PI*2);ctx.fill()\}ctx.globalAlpha=1;ctx.fillStyle='#092438';ctx.fillRect(0,H-90,W,90);for(let x=-40;x<W+70;x+=110)\{ctx.fillStyle='#2b8c87';ctx.beginPath();ctx.arc(x-(scroll*.4%110),H-90,24,Math.PI,0);ctx.fill()\}\
    \} else if(sceneId===6)\{\
      const forest=ctx.createLinearGradient(0,0,0,H);forest.addColorStop(0,'#0b4538');forest.addColorStop(.62,'#102820');forest.addColorStop(1,'#07120f');ctx.fillStyle=forest;ctx.fillRect(0,0,W,H);for(let i=0;i<14;i++)\{const x=(i*103-scroll*.3)%(W+100)-50;ctx.fillStyle=i%2?'#123d2f':'#0a2d24';ctx.fillRect(x,H-250,18,250);ctx.fillStyle='#3effa4';ctx.globalAlpha=.28;ctx.beginPath();ctx.arc(x+9,H-250,54+(i%3)*14,0,Math.PI*2);ctx.fill()\}ctx.globalAlpha=1;ctx.fillStyle='#142f23';ctx.fillRect(0,H-86,W,86);\
    \} else if(sceneId===7)\{\
      const crystal=ctx.createLinearGradient(0,0,W,H);crystal.addColorStop(0,'#496eaa');crystal.addColorStop(.55,'#253866');crystal.addColorStop(1,'#121a38');ctx.fillStyle=crystal;ctx.fillRect(0,0,W,H);ctx.fillStyle='#92c5ff';ctx.globalAlpha=.42;for(let i=0;i<12;i++)\{const x=(i*121-scroll*.32)%(W+120)-40;ctx.beginPath();ctx.moveTo(x,H-100);ctx.lineTo(x+27,H-270-(i%3)*25);ctx.lineTo(x+55,H-100);ctx.fill()\}ctx.globalAlpha=1;ctx.fillStyle='#19274c';ctx.fillRect(0,H-100,W,100);\
    \} else if(sceneId===8)\{\
      const crimson=ctx.createLinearGradient(0,0,0,H);crimson.addColorStop(0,'#651d48');crimson.addColorStop(.58,'#30112c');crimson.addColorStop(1,'#100c1b');ctx.fillStyle=crimson;ctx.fillRect(0,0,W,H);ctx.fillStyle='#ff9ec9';ctx.globalAlpha=.55;ctx.beginPath();ctx.arc(W*.74,125,100,0,Math.PI*2);ctx.fill();ctx.fillStyle='#7c244e';ctx.globalAlpha=1;for(let x=-100;x<W+120;x+=180)\{ctx.beginPath();ctx.ellipse(x-(scroll*.4%180),H-32,118,62,0,0,Math.PI*2);ctx.fill()\}\
    \} else \{\
      const core=ctx.createRadialGradient(W*.65,H*.5,10,W*.65,H*.5,520);core.addColorStop(0,'#613e89');core.addColorStop(.32,'#2a1d4b');core.addColorStop(1,'#090711');ctx.fillStyle=core;ctx.fillRect(0,0,W,H);ctx.strokeStyle='#d18cff';ctx.globalAlpha=.34;ctx.lineWidth=2;for(let i=0;i<8;i++)\{ctx.beginPath();ctx.moveTo(W*.65,H*.5);ctx.lineTo((i*173-scroll*.6)%W,(i*97)%H);ctx.stroke()\}ctx.globalAlpha=1;ctx.fillStyle='#120d20';ctx.fillRect(0,H-80,W,80);\
    \}\
    ctx.restore();\
  \}\
  function draw()\{\
    const currentScene=scene();drawSceneLandmarks();ctx.save();const gridOffset=-(distance%54);ctx.globalAlpha=.18;for(let x=gridOffset;x<W;x+=54)line(x,0,x,H,currentScene.accent);for(let y=0;y<H;y+=54)line(0,y,W,y,currentScene.accent);ctx.restore();ctx.strokeStyle=currentScene.accent;ctx.globalAlpha=.5;ctx.strokeRect(21,21,W-42,H-42);ctx.globalAlpha=1;\
    obstacles.forEach(drawObstacle);powerups.forEach(p=>\{const c=\{rapid:'#36e6ee',spread:'#ffce73',shield:'#9c7cff',heal:'#7ff6c6'\}[p.type];ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.pulse*1.8);ctx.strokeStyle=c;ctx.lineWidth=2;ctx.shadowBlur=16;ctx.shadowColor=c;ctx.strokeRect(-9,-9,18,18);ctx.rotate(-p.pulse*3.3);ctx.fillStyle=c;ctx.font='15px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(\{rapid:'\uc0\u9889 ',spread:'\u10022 ',shield:'\u9672 ',heal:'+'\}[p.type],0,1);ctx.restore()\});\
    particles.forEach(p=>\{ctx.globalAlpha=p.life/p.max;ctx.fillStyle=p.color;ctx.fillRect(p.x-2,p.y-2,4,4)\});ctx.globalAlpha=1;bullets.forEach(b=>\{ctx.fillStyle='#d5ffff';ctx.shadowBlur=12;ctx.shadowColor='#36e6ee';ctx.beginPath();ctx.arc(b.x,b.y,3,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0\});\
    enemies.forEach(e=>\{ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.angle??Math.PI);ctx.fillStyle=e.hit?'#fff':e.color;ctx.shadowBlur=e.boss?26:e.type==='tank'?18:9;ctx.shadowColor=e.color;ctx.beginPath();ctx.moveTo(e.r+3,0);ctx.lineTo(-e.r*.75,-e.r*.78);ctx.lineTo(-e.r*.45,0);ctx.lineTo(-e.r*.75,e.r*.78);ctx.closePath();ctx.fill();ctx.fillStyle='#101423';ctx.beginPath();ctx.arc(1,0,Math.max(3,e.r*.25),0,Math.PI*2);ctx.fill();if(e.maxHp>1)\{ctx.rotate(-(e.angle??Math.PI));ctx.fillStyle='#202c3d';ctx.fillRect(-e.r,-e.r-11,e.r*2,3);ctx.fillStyle=e.color;ctx.fillRect(-e.r,-e.r-11,e.r*2*(e.hp/e.maxHp),3)\}ctx.restore()\});\
    const activeBoss=enemies.find(e=>e.boss&&!e.dead);if(activeBoss)\{const barW=300,barX=(W-barW)/2;ctx.fillStyle='#090c17dd';ctx.fillRect(barX-8,104,barW+16,31);ctx.fillStyle='#273145';ctx.fillRect(barX,123,barW,6);ctx.fillStyle='#ff4f86';ctx.fillRect(barX,123,barW*(activeBoss.hp/activeBoss.maxHp),6);ctx.fillStyle='#ffd3e2';ctx.font='11px DM Mono, monospace';ctx.textAlign='center';ctx.fillText(`BOSS // $\{activeBoss.name\}`,W/2,116);\}\
    ctx.save();ctx.translate(player.x,player.y);ctx.rotate(player.angle);ctx.globalAlpha=elapsed<player.invulnUntil&&Math.floor(elapsed*12)%2?0.35:1;ctx.shadowBlur=boostActive()?28:elapsed<shieldUntil?24:12;ctx.shadowColor=boostActive()?'#ffcf63':elapsed<shieldUntil?'#9c7cff':'#36e6ee';ctx.fillStyle=boostActive()?'#ffcf63':'#36e6ee';ctx.beginPath();ctx.moveTo(21,0);ctx.lineTo(-12,-12);ctx.lineTo(-5,0);ctx.lineTo(-12,12);ctx.closePath();ctx.fill();ctx.fillStyle='#dffeff';ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.fill();ctx.restore();ctx.globalAlpha=1;if(elapsed<shieldUntil)\{ctx.strokeStyle='#9c7cff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(player.x,player.y,29+Math.sin(elapsed*6)*2,0,Math.PI*2);ctx.stroke();\}\
    const activeUpgrade=boostActive()?`BOOST DOBLE \'b7 $\{Math.ceil(boostUntil-elapsed)\}s`:elapsed<spreadUntil?`TRIFUEGO \'b7 $\{Math.ceil(spreadUntil-elapsed)\}s`:elapsed<rapidUntil?`R\'c1FAGA \'b7 $\{Math.ceil(rapidUntil-elapsed)\}s`:elapsed<shieldUntil?`ESCUDO \'b7 $\{Math.ceil(shieldUntil-elapsed)\}s`:`BOOST $\{Math.floor(boost)\}%`;ctx.fillStyle='#7e90a3';ctx.font='10px DM Mono, monospace';ctx.textAlign='right';ctx.fillText(`$\{currentScene.name\} // $\{Math.floor(distance)\} m`,W-36,H-38);ctx.textAlign='left';ctx.fillStyle=boostActive()?'#ffcf63':'#36e6ee';ctx.fillText(activeUpgrade,36,H-38);\
  \}\
  function loop(t)\{if(!running)return;const dt=Math.min(.035,(t-last)/1000||0);last=t;if(!paused)update(dt);draw();requestAnimationFrame(loop)\}\
  function gameOver()\{running=false;ui.final.textContent=`Puntuaci\'f3n final: $\{score.toLocaleString('es-ES')\} \'b7 $\{Math.floor(distance)\} m avanzados`;ui.over.classList.remove('hidden');\}\
\
  window.addEventListener('keydown',e=>\{keys[e.key.toLowerCase()]=true;if(e.key.toLowerCase()==='p'&&running)\{paused=!paused;ui.pause.classList.toggle('hidden',!paused)\}if(e.key===' ')\{e.preventDefault();keys[' ']=true\}\});\
  window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);\
  \
  // Soporte para pausa en m\'f3viles (Tocar pantalla)\
  window.addEventListener('touchstart', () => \{ if(running && paused) \{ paused=false; ui.pause.classList.add('hidden'); \} \});\
\
  document.getElementById('startButton').onclick=()=>\{audio.resume();start()\};\
  document.getElementById('restartButton').onclick=()=>\{audio.resume();start()\};\
  reset();\
  draw();\
\})();\
}