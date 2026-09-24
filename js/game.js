// ゲーム本体: 状態管理・入力・更新・描画。
(function () {
  'use strict';

  const CFG = HM.CONFIG;
  const LEVELS = HM.LEVELS;
  const MAX_LV = LEVELS.length;
  const COLS = CFG.cols;
  const ROWS = CFG.rows;
  const N = COLS * ROWS;
  const FONT = 'system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const $ = (id) => document.getElementById(id);
  const ui = {
    hud: $('hud'),
    soil: $('soil'),
    rate: $('rate'),
    best: $('best'),
    toast: $('toast'),
    sound: $('btn-sound'),
    reset: $('btn-reset'),
    safe: $('safe-probe'),
  };

  // セル: { lv, t: 生産タイマー(0-1秒), fly: 移動アニメ, pop: 合体アニメ }
  const state = {
    soil: CFG.startSoil,
    spawns: 0,
    maxLevel: 1,
    board: new Array(N).fill(null),
  };

  let L = null;          // レイアウト
  let drag = null;       // ドラッグ中の情報
  let kilnPress = 0;     // 窯の押し込みアニメ
  let kilnDeny = 0;      // 押せなかったときの揺れ
  let time = 0;
  let dirty = false;
  let saveTimer = 0;

  // ---------- ユーティリティ ----------

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  function fmt(n) {
    n = Math.floor(n);
    const units = [[1e16, '京'], [1e12, '兆'], [1e8, '億'], [1e4, '万']];
    for (const [v, u] of units) {
      if (n >= v) {
        const x = n / v;
        return (x < 10 ? x.toFixed(2) : x < 100 ? x.toFixed(1) : Math.floor(x)) + u;
      }
    }
    return n.toLocaleString('ja-JP');
  }

  function vibrate(p) {
    try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* noop */ }
  }

  function toast(text, gold) {
    const el = document.createElement('div');
    el.className = 'toast-item' + (gold ? ' gold' : '');
    el.textContent = text;
    ui.toast.appendChild(el);
    while (ui.toast.children.length > 3) ui.toast.firstChild.remove();
    setTimeout(() => el.classList.add('out'), gold ? 2800 : 1800);
    setTimeout(() => el.remove(), gold ? 3300 : 2300);
  }

  function flashSoil(cls) {
    ui.soil.classList.remove(cls);
    void ui.soil.offsetWidth;
    ui.soil.classList.add(cls);
  }

  // ---------- 状態 ----------

  const makeCell = (lv) => ({ lv, t: Math.random(), fly: null, pop: null });

  function totalRate() {
    let r = 0;
    for (const c of state.board) if (c) r += LEVELS[c.lv - 1].rate;
    return r;
  }

  function emptyCells() {
    const out = [];
    for (let i = 0; i < N; i++) if (!state.board[i]) out.push(i);
    return out;
  }

  // 盤面が空で土も足りない場合は詰み防止で無料
  function kilnCost() {
    const cost = Math.floor(CFG.kilnBaseCost + state.spawns * CFG.kilnCostStep);
    if (state.soil < cost && state.board.every((c) => !c)) return 0;
    return cost;
  }

  function serialize() {
    return {
      v: 1,
      board: state.board.map((c) => (c ? c.lv : 0)),
      soil: Math.floor(state.soil),
      spawns: state.spawns,
      maxLevel: state.maxLevel,
      sound: HM.Audio.enabled,
      savedAt: Date.now(),
    };
  }

  function save() {
    HM.Storage.save(serialize());
    dirty = false;
    saveTimer = 0;
  }

  function load() {
    const d = HM.Storage.load();
    if (!d || !Array.isArray(d.board) || d.board.length !== N) return;
    state.board = d.board.map((lv) => {
      lv = lv | 0;
      return lv >= 1 && lv <= MAX_LV ? makeCell(lv) : null;
    });
    state.soil = Math.max(0, Number(d.soil) || 0);
    state.spawns = Math.max(0, d.spawns | 0);
    state.maxLevel = clamp(d.maxLevel | 0, 1, MAX_LV);
    HM.Audio.enabled = d.sound !== false;
    if (d.savedAt) grantOffline((Date.now() - d.savedAt) / 1000);
  }

  function grantOffline(sec) {
    if (!(sec > 10)) return;
    const gain = Math.floor(totalRate() * Math.min(sec, CFG.offlineMaxSec) * CFG.offlineRate);
    if (gain <= 0) return;
    state.soil += gain;
    dirty = true;
    toast(`留守のあいだに土 +${fmt(gain)}`);
  }

  function reset() {
    if (!confirm('最初からやり直しますか？（進行は消えます）')) return;
    HM.Storage.clear();
    state.soil = CFG.startSoil;
    state.spawns = 0;
    state.maxLevel = 1;
    state.board = new Array(N).fill(null);
    drag = null;
    HM.Effects.clear();
    save();
  }

  // ---------- レイアウト ----------

  function layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    const hudH = ui.hud.getBoundingClientRect().height;
    const safeB = ui.safe.getBoundingClientRect().height;
    const kilnH = clamp(H * 0.17, 100, 160);
    const pad = 12;
    const areaW = Math.min(W, 520) - pad * 2;
    const areaH = H - hudH - kilnH - safeB - pad * 2;
    const gap = 6;
    const cell = Math.floor(Math.min((areaW - gap * (COLS - 1)) / COLS, (areaH - gap * (ROWS - 1)) / ROWS, 100));
    const bw = cell * COLS + gap * (COLS - 1);
    const bh = cell * ROWS + gap * (ROWS - 1);
    const bx = Math.round((W - bw) / 2);
    const by = Math.round(hudH + pad + Math.max(0, (areaH - bh) / 2));

    const kw = Math.min(W - 32, 300);
    const kh = kilnH - 16;
    const kx = (W - kw) / 2;
    const ky = H - safeB - kilnH + 4;

    L = {
      W, H, dpr, cell, gap, bx, by, bw, bh,
      kiln: { x: kx, y: ky, w: kw, h: kh, cx: kx + kw / 2, cy: ky + kh * 0.45 },
    };
  }

  function cellRect(i) {
    const c = i % COLS;
    const r = (i / COLS) | 0;
    const x = L.bx + c * (L.cell + L.gap);
    const y = L.by + r * (L.cell + L.gap);
    return { x, y, cx: x + L.cell / 2, cy: y + L.cell / 2 };
  }

  function cellAt(px, py) {
    const step = L.cell + L.gap;
    const c = Math.floor((px - L.bx + L.gap / 2) / step);
    const r = Math.floor((py - L.by + L.gap / 2) / step);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return -1;
    return r * COLS + c;
  }

  function inKiln(px, py) {
    const k = L.kiln;
    return px >= k.x && px <= k.x + k.w && py >= k.y && py <= k.y + k.h;
  }

  // ---------- アクション ----------

  function spawn() {
    const empties = emptyCells();
    kilnPress = 1;
    if (!empties.length) {
      HM.Audio.error();
      kilnDeny = 1;
      toast('空きマスがありません');
      return;
    }
    const cost = kilnCost();
    if (state.soil < cost) {
      HM.Audio.error();
      kilnDeny = 1;
      flashSoil('deny');
      return;
    }
    state.soil -= cost;
    state.spawns++;
    const i = empties[(Math.random() * empties.length) | 0];
    const c = makeCell(1);
    c.fly = { fx: L.kiln.cx, fy: L.kiln.cy, t: 0, dur: 0.32, arc: true };
    state.board[i] = c;
    HM.Audio.spawn();
    HM.Effects.smoke(L.kiln.cx, L.kiln.y + L.kiln.h * 0.1, L.cell);
    vibrate(10);
    dirty = true;
  }

  function merge(from, to) {
    const lv = state.board[to].lv + 1;
    const def = LEVELS[lv - 1];
    const c = makeCell(lv);
    c.t = state.board[to].t;
    c.pop = { t: 0, dur: 0.6 };
    state.board[from] = null;
    state.board[to] = c;

    const r = cellRect(to);
    const final = lv === MAX_LV;
    HM.Effects.burst(r.cx, r.cy, lv, L.cell);
    if (final) {
      HM.Effects.burst(r.cx, r.cy, lv, L.cell * 1.6);
      HM.Effects.popup(r.cx, r.cy, def.name + '！', '#fff176', true);
    }
    HM.Effects.addShake(L.cell * (final ? 0.35 : 0.05 + lv * 0.012));
    HM.Audio.merge(lv);
    vibrate(final ? [60, 40, 60, 40, 160] : 15 + lv * 5);

    if (lv > state.maxLevel) {
      state.maxLevel = lv;
      if (final) {
        HM.Audio.fanfare();
        toast(`🎉 前方後円墳が完成！`, true);
      } else {
        HM.Audio.discover();
        toast(`新発見！ Lv${lv} ${def.name}`, lv >= 8);
      }
    } else if (final) {
      HM.Audio.fanfare();
    }
    save();
  }

  function flyFrom(cell, x, y, dur) {
    cell.fly = { fx: x, fy: y, t: 0, dur: dur || 0.14, arc: false };
  }

  function drop(px, py) {
    const from = drag.from;
    const a = state.board[from];
    const to = cellAt(px, py);
    drag = null;
    if (!a) return;
    if (to < 0 || to === from) {
      flyFrom(a, px, py);
      return;
    }
    const b = state.board[to];
    if (b && b.lv === a.lv && a.lv < MAX_LV) {
      merge(from, to);
      return;
    }
    const tr = cellRect(to);
    state.board[to] = a;
    state.board[from] = b;
    flyFrom(a, px, py);
    if (b) flyFrom(b, tr.cx, tr.cy, 0.18);
    HM.Audio.drop();
    dirty = true;
  }

  // ---------- 入力 ----------

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  canvas.addEventListener('pointerdown', (e) => {
    HM.Audio.unlock();
    if (drag) return;
    const [x, y] = pos(e);
    if (inKiln(x, y)) {
      spawn();
      return;
    }
    const i = cellAt(x, y);
    if (i < 0 || !state.board[i]) return;
    const r = cellRect(i);
    drag = { id: e.pointerId, from: i, x, y, ox: r.cx - x, oy: r.cy - y };
    state.board[i].fly = null;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    HM.Audio.pickup();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    [drag.x, drag.y] = pos(e);
  });

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const [x, y] = pos(e);
    drop(x, y);
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const a = state.board[drag.from];
    if (a) flyFrom(a, drag.x, drag.y);
    drag = null;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // iOS は touchend/click でないと AudioContext が起きないことがある
  ['touchend', 'click'].forEach((t) => document.addEventListener(t, HM.Audio.unlock, { passive: true }));

  ui.sound.addEventListener('click', () => {
    HM.Audio.enabled = !HM.Audio.enabled;
    updateSoundBtn();
    save();
  });
  ui.reset.addEventListener('click', reset);

  function updateSoundBtn() {
    ui.sound.textContent = HM.Audio.enabled ? '🔊' : '🔇';
    ui.sound.classList.toggle('off', !HM.Audio.enabled);
  }

  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', () => setTimeout(layout, 200));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) save();
  });
  window.addEventListener('pagehide', save);

  // ---------- 更新 ----------

  function update(dt) {
    time += dt;
    for (let i = 0; i < N; i++) {
      const c = state.board[i];
      if (!c) continue;
      c.t += dt;
      if (c.t >= 1) {
        c.t -= 1;
        const rate = LEVELS[c.lv - 1].rate;
        state.soil += rate;
        const r = cellRect(i);
        const onDrag = drag && drag.from === i;
        HM.Effects.popup(onDrag ? drag.x : r.cx, onDrag ? drag.y - L.cell * 0.3 : r.y + L.cell * 0.2, '+' + fmt(rate));
      }
      if (c.fly) {
        c.fly.t += dt;
        if (c.fly.t >= c.fly.dur) {
          c.fly = null;
          if (!c.pop) c.pop = { t: 0, dur: 0.3, soft: true };
        }
      }
      if (c.pop) {
        c.pop.t += dt;
        if (c.pop.t >= c.pop.dur) c.pop = null;
      }
    }
    kilnPress = Math.max(0, kilnPress - dt * 6);
    kilnDeny = Math.max(0, kilnDeny - dt * 3);
    HM.Effects.update(dt);

    saveTimer += dt;
    if (dirty && saveTimer >= 1) save();
    else if (saveTimer >= CFG.autosaveSec) save();
  }

  // ---------- 描画 ----------

  let lastHud = '';
  function drawHud() {
    const rate = totalRate();
    const best = LEVELS[state.maxLevel - 1];
    const key = `${Math.floor(state.soil)}|${rate}|${state.maxLevel}`;
    if (key === lastHud) return;
    lastHud = key;
    ui.soil.textContent = fmt(state.soil);
    ui.rate.textContent = `+${fmt(rate)}/秒`;
    ui.best.textContent = `最高 Lv${best.lv} ${best.name}`;
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, L.H);
    g.addColorStop(0, '#f6e7c8');
    g.addColorStop(1, '#e3c79b');
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, L.W + 40, L.H + 40);

    // 盤面
    const p = 8;
    roundRect(L.bx - p, L.by - p, L.bw + p * 2, L.bh + p * 2, 18);
    ctx.fillStyle = '#8a5a34';
    ctx.fill();
    roundRect(L.bx - p, L.by - p + 3, L.bw + p * 2, L.bh + p * 2 - 3, 18);
    ctx.fillStyle = '#a26b40';
    ctx.fill();
  }

  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawCells() {
    const dragLv = drag && state.board[drag.from] ? state.board[drag.from].lv : 0;
    const hover = drag ? cellAt(drag.x, drag.y) : -1;
    for (let i = 0; i < N; i++) {
      const r = cellRect(i);
      const c = state.board[i];
      roundRect(r.x, r.y, L.cell, L.cell, L.cell * 0.18);
      ctx.fillStyle = '#e9cfa3';
      ctx.fill();
      roundRect(r.x + 2, r.y + 2, L.cell - 4, L.cell - 4, L.cell * 0.16);
      ctx.fillStyle = (i + ((i / COLS) | 0)) % 2 ? '#f4dfb9' : '#f0d8ae';
      ctx.fill();

      const canMerge = dragLv && c && i !== drag.from && c.lv === dragLv && dragLv < MAX_LV;
      if (canMerge) {
        const a = 0.55 + 0.35 * Math.sin(time * 10);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.strokeStyle = LEVELS[dragLv - 1].glow;
        ctx.lineWidth = 4;
        ctx.shadowColor = LEVELS[dragLv - 1].glow;
        ctx.shadowBlur = 12;
        roundRect(r.x + 2, r.y + 2, L.cell - 4, L.cell - 4, L.cell * 0.16);
        ctx.stroke();
        ctx.restore();
      }
      if (drag && i === hover && i !== drag.from) {
        roundRect(r.x + 2, r.y + 2, L.cell - 4, L.cell - 4, L.cell * 0.16);
        ctx.fillStyle = canMerge ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.25)';
        ctx.fill();
      }
      if (c && c.lv >= 8) {
        ctx.save();
        ctx.globalAlpha = 0.25 + 0.1 * Math.sin(time * 2 + i);
        const g = ctx.createRadialGradient(r.cx, r.cy, 0, r.cx, r.cy, L.cell * 0.55);
        g.addColorStop(0, LEVELS[c.lv - 1].glow);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(r.x, r.y, L.cell, L.cell);
        ctx.restore();
      }
    }
  }

  function drawItem(lv, cx, cy, scale, badge) {
    HM.Sprites.draw(ctx, lv, cx, cy, L.cell * 0.84 * scale);
    if (!badge) return;
    const br = L.cell * 0.14;
    const bx = cx + L.cell * 0.34 * scale;
    const by = cy + L.cell * 0.34 * scale;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fillStyle = lv === MAX_LV ? '#e0b43c' : '#6b3d1f';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff4e2';
    ctx.stroke();
    ctx.fillStyle = lv === MAX_LV ? '#3a1c0c' : '#fff4e2';
    ctx.font = `800 ${br * 1.15}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(lv), bx, by + br * 0.06);
  }

  function drawItems() {
    for (let i = 0; i < N; i++) {
      const c = state.board[i];
      if (!c || (drag && drag.from === i)) continue;
      const r = cellRect(i);
      let x = r.cx;
      let y = r.cy;
      let s = 1 + 0.02 * Math.sin(time * 3 + i * 1.7);
      if (c.fly) {
        const p = clamp(c.fly.t / c.fly.dur, 0, 1);
        const e = easeOut(p);
        x = lerp(c.fly.fx, r.cx, e);
        y = lerp(c.fly.fy, r.cy, e);
        if (c.fly.arc) {
          y -= Math.sin(p * Math.PI) * L.cell * 1.2;
          s *= 0.4 + 0.6 * e;
        }
      }
      if (c.pop) {
        const p = c.pop.t / c.pop.dur;
        s *= c.pop.soft
          ? 1 + 0.15 * Math.sin(p * Math.PI) * (1 - p)
          : 1 + 0.55 * Math.exp(-5 * p) * Math.cos(p * 16);
      }
      drawItem(c.lv, x, y, s, true);
    }
    if (drag) {
      const c = state.board[drag.from];
      if (c) drawItem(c.lv, drag.x + drag.ox * 0.3, drag.y + drag.oy * 0.3 - L.cell * 0.25, 1.18, true);
    }
  }

  function drawKiln() {
    const k = L.kiln;
    const cost = kilnCost();
    const full = !state.board.some((c) => !c);
    const ok = !full && state.soil >= cost;
    const press = 1 - 0.07 * kilnPress;
    const dx = kilnDeny ? Math.sin(kilnDeny * 30) * 6 * kilnDeny : 0;

    ctx.save();
    ctx.translate(k.cx + dx, k.y + k.h);
    ctx.scale(press, press);
    ctx.translate(-k.cx, -(k.y + k.h));

    const domeW = Math.min(k.w * 0.62, k.h * 1.5);
    const domeH = k.h * 0.8;
    const baseY = k.y + k.h * 0.82;

    // 地面
    ctx.beginPath();
    ctx.ellipse(k.cx, baseY, domeW * 0.72, k.h * 0.12, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(90,50,20,0.25)';
    ctx.fill();

    // 煙突
    ctx.fillStyle = '#7a4424';
    roundRect(k.cx + domeW * 0.22, baseY - domeH * 1.02, domeW * 0.12, domeH * 0.4, 4);
    ctx.fill();

    // ドーム
    ctx.beginPath();
    ctx.ellipse(k.cx, baseY, domeW / 2, domeH, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    const g = ctx.createLinearGradient(k.cx - domeW / 2, 0, k.cx + domeW / 2, 0);
    g.addColorStop(0, ok ? '#b8703e' : '#9d8a7a');
    g.addColorStop(1, ok ? '#7a4424' : '#6d6158');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#4e2a14';
    ctx.stroke();

    // 焚き口
    const mw = domeW * 0.36;
    const mh = domeH * 0.52;
    ctx.beginPath();
    ctx.ellipse(k.cx, baseY, mw / 2, mh, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = '#2a1308';
    ctx.fill();
    if (ok) {
      const flick = 0.75 + 0.25 * Math.sin(time * 13) * Math.sin(time * 7.3);
      const fg = ctx.createRadialGradient(k.cx, baseY, 0, k.cx, baseY, mh);
      fg.addColorStop(0, `rgba(255,220,120,${flick})`);
      fg.addColorStop(0.5, `rgba(255,120,40,${0.8 * flick})`);
      fg.addColorStop(1, 'rgba(120,30,0,0)');
      ctx.fillStyle = fg;
      ctx.fill();
    }

    // 看板
    const sw = Math.min(k.w * 0.9, 220);
    const sh = k.h * 0.3;
    const sx = k.cx - sw / 2;
    const sy = baseY - sh * 0.35;
    roundRect(sx, sy + 3, sw, sh, sh / 2);
    ctx.fillStyle = '#4e2a14';
    ctx.fill();
    roundRect(sx, sy, sw, sh, sh / 2);
    ctx.fillStyle = ok ? '#fbeedb' : '#e2d6c8';
    ctx.fill();
    ctx.fillStyle = full ? '#b3261e' : ok ? '#3a1c0c' : '#8a7a6c';
    ctx.font = `900 ${sh * 0.5}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = full ? '満杯！ 合体させよう' : cost === 0 ? '窯を焚く（無料）' : `窯を焚く　土 ${fmt(cost)}`;
    ctx.fillText(label, k.cx, sy + sh / 2 + 1);

    ctx.restore();
  }

  function render() {
    ctx.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
    const [sx, sy] = HM.Effects.shakeOffset();
    ctx.translate(sx, sy);
    drawBackground();
    drawCells();
    drawKiln();
    drawItems();
    HM.Effects.draw(ctx, L.cell);
    drawHud();
  }

  // ---------- ループ ----------

  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 2) {
      // バックグラウンドから復帰: オフライン扱いでまとめて付与
      grantOffline(dt);
      dt = 0;
    }
    update(Math.min(dt, 0.1));
    render();
    requestAnimationFrame(frame);
  }

  // ---------- 起動 ----------

  HM.Sprites.load();
  load();
  updateSoundBtn();
  layout();
  requestAnimationFrame((t) => {
    last = t;
    frame(t);
  });

  // デバッグ用に公開
  HM.Game = { state, save, fmt, cellRect };
})();
