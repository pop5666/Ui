const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let score = 0;
let bestScore = localStorage.getItem('fruit_slice_best') || 0;
let lives = 3;
let gameOver = false;

document.getElementById('best-score').innerText = bestScore;

// ผลไม้และระเบิด
const FRUIT_TYPES = [
  { name: 'watermelon', color: '#2ed573', radius: 35, score: 10 },
  { name: 'apple', color: '#ff4757', radius: 25, score: 15 },
  { name: 'orange', color: '#ffa502', radius: 22, score: 20 },
  { name: 'bomb', color: '#2f3542', radius: 20, isBomb: true }
];

let items = [];
let particles = [];
let slicePath = [];

class Item {
  constructor() {
    const type = Math.random() < 0.25 ? FRUIT_TYPES[3] : FRUIT_TYPES[Math.floor(Math.random() * 3)];
    this.type = type;
    this.x = Math.random() * (canvas.width - 100) + 50;
    this.y = canvas.height + 40;
    this.vx = (Math.random() - 0.5) * 6;
    this.vy = -(Math.random() * 4 + 14);
    this.gravity = 0.35;
    this.radius = type.radius;
    this.sliced = false;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.type.color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fff';
    ctx.stroke();

    if (this.type.isBomb) {
      ctx.fillStyle = '#ff4757';
      ctx.font = '16px sans-serif';
      ctx.fillText('💣', this.x - 8, this.y + 6);
    }
  }
}

// การควบคุมการฟันหน้าจอ (Touch / Mouse)
let isSlashing = false;

function addSlicePoint(x, y) {
  slicePath.push({ x, y, time: Date.now() });
  checkSlice(x, y);
}

window.addEventListener('mousedown', e => { isSlashing = true; addSlicePoint(e.clientX, e.clientY); });
window.addEventListener('mousemove', e => { if (isSlashing) addSlicePoint(e.clientX, e.clientY); });
window.addEventListener('mouseup', () => { isSlashing = false; });

window.addEventListener('touchstart', e => {
  isSlashing = true;
  const touch = e.touches[0];
  addSlicePoint(touch.clientX, touch.clientY);
});
window.addEventListener('touchmove', e => {
  if (isSlashing) {
    const touch = e.touches[0];
    addSlicePoint(touch.clientX, touch.clientY);
  }
});
window.addEventListener('touchend', () => { isSlashing = false; });

function checkSlice(x, y) {
  if (gameOver) return;

  for (let i = items.length - 1; i >= 0; i--) {
    let item = items[i];
    if (!item.sliced) {
      let dist = Math.hypot(item.x - x, item.y - y);
      if (dist < item.radius + 10) {
        item.sliced = true;
        if (item.type.isBomb) {
          triggerGameOver();
        } else {
          score += item.type.score;
          document.getElementById('score').innerText = score;
          createParticles(item.x, item.y, item.type.color);
          items.splice(i, 1);
        }
      }
    }
  }
}

function createParticles(x, y, color) {
  for (let i = 0; i < 12; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      life: 1.0,
      color
    });
  }
}

function spawnItems() {
  if (gameOver) return;
  if (Math.random() < 0.04) {
    items.push(new Item());
  }
}

function triggerGameOver() {
  gameOver = true;
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('fruit_slice_best', bestScore);
    document.getElementById('best-score').innerText = bestScore;
  }
  document.getElementById('final-score').innerText = score;
  document.getElementById('game-over-modal').classList.remove('hidden');
}

function update() {
  spawnItems();

  // อัปเดตตำแหน่งไอเทม
  for (let i = items.length - 1; i >= 0; i--) {
    let item = items[i];
    item.update();

    // ตกจอ
    if (item.y > canvas.height + 50) {
      if (!item.sliced && !item.type.isBomb) {
        lives--;
        document.getElementById('lives').innerText = lives;
        if (lives <= 0) triggerGameOver();
      }
      items.splice(i, 1);
    }
  }

  // อัปเดตเอฟเฟกต์ชิ้นส่วน
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.03;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // ลบเส้นฟันเก่า
  const now = Date.now();
  slicePath = slicePath.filter(p => now - p.time < 150);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // วาดไอเทม
  items.forEach(item => item.draw());

  // วาดอนุภาค
  particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  });

  // วาดรอยฟัน
  if (slicePath.length > 1) {
    ctx.beginPath();
    ctx.moveTo(slicePath[0].x, slicePath[0].y);
    for (let i = 1; i < slicePath.length; i++) {
      ctx.lineTo(slicePath[i].x, slicePath[i].y);
    }
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

function loop() {
  if (!gameOver) {
    update();
    draw();
  }
  requestAnimationFrame(loop);
}

document.getElementById('restart-btn').addEventListener('click', () => {
  score = 0;
  lives = 3;
  items = [];
  particles = [];
  slicePath = [];
  gameOver = false;
  document.getElementById('score').innerText = 0;
  document.getElementById('lives').innerText = 3;
  document.getElementById('game-over-modal').classList.add('hidden');
});

loop();
