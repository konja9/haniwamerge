// パーティクル・数値ポップ・衝撃波リング・画面揺れ。
(function () {
  'use strict';

  const particles = [];
  const popups = [];
  const rings = [];
  let shake = 0;

  const CLAY = ['#c9804a', '#e7a773', '#9a5a2e', '#f3d2a8'];

  function burst(x, y, lv, unit) {
    const def = HM.LEVELS[lv - 1];
    const count = 14 + lv * 3;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = unit * (2 + Math.random() * 4) * (1 + lv * 0.06);
      particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - unit * 2,
        g: unit * 12,
        life: 0,
        max: 0.5 + Math.random() * 0.4,
        size: unit * (0.12 + Math.random() * 0.14),
        color: Math.random() < 0.5 ? def.glow : CLAY[(Math.random() * CLAY.length) | 0],
        star: Math.random() < 0.3,
        rot: Math.random() * 6,
      });
    }
    rings.push({ x, y, life: 0, max: 0.4, r0: unit * 0.3, r1: unit * (1.1 + lv * 0.05), color: def.glow });
  }

  function smoke(x, y, unit) {
    for (let i = 0; i < 5; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * unit * 0.4,
        y,
        vx: (Math.random() - 0.5) * unit * 0.6,
        vy: -unit * (0.8 + Math.random() * 0.8),
        g: 0,
        life: 0,
        max: 0.6 + Math.random() * 0.3,
        size: unit * (0.12 + Math.random() * 0.1),
        color: 'rgba(120,110,100,0.6)',
        grow: true,
      });
    }
  }

  function popup(x, y, text, color, big) {
    popups.push({ x, y, text, color: color || '#fff4e2', life: 0, max: big ? 1.4 : 0.9, big: !!big });
  }

  function addShake(px) {
    shake = Math.max(shake, px);
  }

  function update(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.max) { particles.splice(i, 1); continue; }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot = (p.rot || 0) + dt * 6;
    }
    for (let i = popups.length - 1; i >= 0; i--) {
      popups[i].life += dt;
      if (popups[i].life >= popups[i].max) popups.splice(i, 1);
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      rings[i].life += dt;
      if (rings[i].life >= rings[i].max) rings.splice(i, 1);
    }
    shake *= Math.pow(0.001, dt); // 約0.3秒で収まる減衰
    if (shake < 0.3) shake = 0;
  }

  function shakeOffset() {
    if (!shake) return [0, 0];
    return [(Math.random() * 2 - 1) * shake, (Math.random() * 2 - 1) * shake];
  }

  function drawStar(ctx, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * 0.45 : r;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }

  function draw(ctx, unit) {
    for (const r of rings) {
      const t = r.life / r.max;
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = unit * 0.12 * (1 - t) + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - t, 3)), 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const p of particles) {
      const t = p.life / p.max;
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = p.color;
      const s = p.grow ? p.size * (1 + t * 2) : p.size * (1 - t * 0.5);
      if (p.star) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        drawStar(ctx, s * 1.3);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const p of popups) {
      const t = p.life / p.max;
      const size = unit * (p.big ? 0.36 : 0.22);
      ctx.globalAlpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      ctx.font = `900 ${size}px system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif`;
      const y = p.y - unit * (p.big ? 0.8 : 0.5) * (1 - Math.pow(1 - t, 2));
      ctx.lineWidth = size * 0.22;
      ctx.strokeStyle = 'rgba(58,28,12,0.85)';
      ctx.strokeText(p.text, p.x, y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, y);
    }
    ctx.globalAlpha = 1;
  }

  function clear() {
    particles.length = popups.length = rings.length = 0;
    shake = 0;
  }

  HM.Effects = { burst, smoke, popup, addShake, update, draw, shakeOffset, clear };
})();
