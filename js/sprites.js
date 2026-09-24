// はにわの見た目。
// HM.Sprites.draw(ctx, lv, cx, cy, size) だけが外部との接点。
// config.js の image に画像パスがあればその画像を、なければ下の SHAPES の図形を描く。
// 図形は中心(0,0)・一辺100の座標系で描く（-50〜50）。
(function () {
  'use strict';

  const C = {
    clay: '#c9804a',
    clayLight: '#e7a773',
    clayDark: '#9a5a2e',
    line: '#6e3a1a',
    hole: '#3a1c0c',
    red: '#b5553a',
    gold: '#e0b43c',
    jade: '#3fa38f',
  };

  const TAU = Math.PI * 2;

  // ---------- 描画ヘルパー ----------

  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function ellipse(ctx, x, y, rx, ry, rot) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU);
  }

  function poly(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
  }

  // 左から光が当たった素焼きっぽい塗り
  function clay(ctx, x0, x1, base) {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, C.clayLight);
    g.addColorStop(0.45, base || C.clay);
    g.addColorStop(1, C.clayDark);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = C.line;
    ctx.stroke();
  }

  function flat(ctx, color) {
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = C.line;
    ctx.stroke();
  }

  function hole(ctx, x, y, rx, ry) {
    ellipse(ctx, x, y, rx, ry);
    ctx.fillStyle = C.hole;
    ctx.fill();
  }

  // はにわ顔（目2つ＋口）
  function face(ctx, x, y, s) {
    s = s || 1;
    hole(ctx, x - 6 * s, y, 3 * s, 2 * s);
    hole(ctx, x + 6 * s, y, 3 * s, 2 * s);
    hole(ctx, x, y + 8 * s, 3.2 * s, 2.6 * s);
  }

  // 輪郭付きの太い線（腕・脚など）
  function limb(ctx, pts, w) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [color, width] of [[C.line, w + 4.8], [C.clay, w]]) {
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      if (pts.length === 6) ctx.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]);
      else ctx.lineTo(pts[2], pts[3]);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    }
  }

  function aura(ctx, color, r) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
  }

  // ---------- レベル別の図形 ----------

  const SHAPES = {
    // Lv1 粘土玉
    1(ctx) {
      ellipse(ctx, 0, 12, 30, 26);
      clay(ctx, -30, 30);
      ellipse(ctx, -10, 2, 8, 5, -0.5);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fill();
      ellipse(ctx, 8, 18, 6, 4, 0.3);
      ctx.fillStyle = 'rgba(110,58,26,0.35)';
      ctx.fill();
    },

    // Lv2 円筒埴輪
    2(ctx) {
      rr(ctx, -20, -34, 40, 76, 5);
      clay(ctx, -20, 20);
      for (const y of [-12, 14]) {
        rr(ctx, -23, y - 3, 46, 6, 3);
        clay(ctx, -23, 23);
      }
      hole(ctx, 0, 1, 5.5, 5.5);
      hole(ctx, 0, 28, 4.5, 4.5);
      ellipse(ctx, 0, -34, 20, 4);
      ctx.fillStyle = C.hole;
      ctx.fill();
    },

    // Lv3 朝顔形埴輪
    3(ctx) {
      rr(ctx, -17, -4, 34, 46, 5);
      clay(ctx, -17, 17);
      poly(ctx, [-11, -2, -12, -16, 12, -16, 11, -2]);
      clay(ctx, -12, 12);
      poly(ctx, [-12, -14, -34, -40, 34, -40, 12, -14]);
      clay(ctx, -34, 34);
      ellipse(ctx, 0, -40, 34, 6);
      clay(ctx, -34, 34);
      ellipse(ctx, 0, -40, 28, 4);
      ctx.fillStyle = C.hole;
      ctx.fill();
      rr(ctx, -20, 14, 40, 6, 3);
      clay(ctx, -20, 20);
      hole(ctx, 0, 5, 4.5, 4.5);
      hole(ctx, 0, 31, 4.5, 4.5);
    },

    // Lv4 家形埴輪
    4(ctx) {
      rr(ctx, -28, -6, 56, 48, 3);
      clay(ctx, -28, 28);
      poly(ctx, [-38, -2, -24, -36, 24, -36, 38, -2]);
      clay(ctx, -38, 38, '#b86f3c');
      rr(ctx, -30, -42, 60, 8, 3);
      clay(ctx, -30, 30);
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1.6;
      for (let x = -20; x <= 20; x += 10) {
        ctx.beginPath();
        ctx.moveTo(x, -34);
        ctx.lineTo(x * 1.45, -4);
        ctx.stroke();
      }
      rr(ctx, -8, 12, 16, 30, 2);
      ctx.fillStyle = C.hole;
      ctx.fill();
      hole(ctx, -19, 14, 4, 4);
      hole(ctx, 19, 14, 4, 4);
    },

    // Lv5 鶏形埴輪
    5(ctx) {
      rr(ctx, -11, 22, 22, 22, 3);
      clay(ctx, -11, 11);
      // 尾羽
      poly(ctx, [12, 6, 30, -26, 38, -18, 34, 10]);
      clay(ctx, 12, 38);
      // 胴
      ellipse(ctx, 4, 10, 26, 16, -0.15);
      clay(ctx, -22, 30);
      // 首と頭
      poly(ctx, [-20, 4, -24, -18, -10, -18, -6, 2]);
      clay(ctx, -24, -6);
      ellipse(ctx, -17, -22, 11, 10);
      clay(ctx, -28, -6);
      // とさか
      for (const [x, y] of [[-22, -32], [-16, -34], [-10, -31]]) {
        ellipse(ctx, x, y, 4, 5);
        flat(ctx, C.red);
      }
      poly(ctx, [-28, -22, -36, -19, -28, -17]);
      flat(ctx, C.gold);
      ellipse(ctx, -20, -8, 3.5, 5);
      flat(ctx, C.red);
      hole(ctx, -18, -24, 2.4, 2.4);
      // 羽の線
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-2, 6);
      ctx.quadraticCurveTo(10, 2, 20, 10);
      ctx.moveTo(0, 13);
      ctx.quadraticCurveTo(10, 9, 18, 16);
      ctx.stroke();
    },

    // Lv6 犬形埴輪
    6(ctx) {
      for (const x of [-14, -4, 14, 24]) limb(ctx, [x, 14, x, 40], 7);
      // しっぽ
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(30, -2, 8, Math.PI * 0.9, Math.PI * 2.3);
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 9;
      ctx.stroke();
      ctx.strokeStyle = C.clay;
      ctx.lineWidth = 5;
      ctx.stroke();
      ellipse(ctx, 6, 8, 28, 13);
      clay(ctx, -22, 34);
      // 首輪
      rr(ctx, -22, -2, 8, 16, 3);
      flat(ctx, C.red);
      // 頭
      ellipse(ctx, -24, -10, 12, 11);
      clay(ctx, -36, -12);
      ellipse(ctx, -35, -6, 7, 5);
      clay(ctx, -42, -28);
      hole(ctx, -41, -7, 1.8, 1.8);
      poly(ctx, [-30, -18, -26, -32, -18, -20]);
      clay(ctx, -30, -18);
      poly(ctx, [-20, -18, -12, -30, -10, -14]);
      clay(ctx, -20, -10);
      hole(ctx, -27, -12, 2.4, 2);
      hole(ctx, -19, -12, 2.4, 2);
    },

    // Lv7 馬形埴輪
    7(ctx) {
      for (const x of [-16, -6, 16, 26]) limb(ctx, [x, 12, x, 42], 7);
      ctx.lineCap = 'round';
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(32, 2);
      ctx.quadraticCurveTo(42, 12, 38, 26);
      ctx.stroke();
      ellipse(ctx, 6, 4, 30, 13);
      clay(ctx, -24, 36);
      // 首と頭
      poly(ctx, [-24, 6, -32, -26, -18, -30, -8, -4]);
      clay(ctx, -32, -8);
      ellipse(ctx, -32, -30, 13, 7, -0.6);
      clay(ctx, -44, -20);
      poly(ctx, [-24, -34, -22, -44, -16, -34]);
      clay(ctx, -24, -16);
      hole(ctx, -28, -32, 2.2, 2.2);
      hole(ctx, -41, -24, 1.8, 1.8);
      // たてがみ
      ctx.strokeStyle = C.clayDark;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-18, -30);
      ctx.lineTo(-8, -6);
      ctx.stroke();
      // 鞍と飾り
      rr(ctx, -4, -12, 22, 12, 4);
      flat(ctx, C.red);
      rr(ctx, -8, -3, 30, 5, 2);
      flat(ctx, C.clayDark);
      for (const x of [-12, 0, 24]) {
        ellipse(ctx, x, 12, 3.2, 3.2);
        flat(ctx, C.gold);
      }
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-38, -26);
      ctx.lineTo(-20, -18);
      ctx.stroke();
    },

    // Lv8 踊る埴輪
    8(ctx) {
      limb(ctx, [-12, -4, -24, -10, -26, -34], 8); // 上げた腕
      limb(ctx, [12, -2, 22, 6, 20, 22], 8);        // 下げた腕
      poly(ctx, [-13, -8, 13, -8, 17, 44, -17, 44]);
      clay(ctx, -17, 17);
      ellipse(ctx, 0, -8, 13, 4);
      clay(ctx, -13, 13);
      ellipse(ctx, 0, -24, 13, 16);
      clay(ctx, -13, 13);
      face(ctx, 0, -28, 1);
      hole(ctx, 0, 20, 4, 4);
    },

    // Lv9 巫女の埴輪
    9(ctx) {
      limb(ctx, [-12, 2, -22, 10, -14, 18], 7);
      limb(ctx, [12, 2, 22, 10, 14, 18], 7);
      poly(ctx, [-14, 10, 14, 10, 26, 44, -26, 44]);
      clay(ctx, -26, 26);
      rr(ctx, -13, -8, 26, 22, 6);
      clay(ctx, -13, 13);
      // たすき
      ctx.strokeStyle = C.red;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-12, -6);
      ctx.lineTo(12, 12);
      ctx.stroke();
      // 首飾り
      for (let i = -2; i <= 2; i++) {
        ellipse(ctx, i * 4.5, -5 + Math.abs(i) * -1.2 + 2, 2.3, 2.3);
        flat(ctx, C.jade);
      }
      ellipse(ctx, 0, -22, 12, 13);
      clay(ctx, -12, 12);
      // まげ
      rr(ctx, -16, -40, 32, 8, 4);
      clay(ctx, -16, 16, '#8f5530');
      rr(ctx, -6, -46, 12, 8, 3);
      clay(ctx, -6, 6, '#8f5530');
      face(ctx, 0, -25, 0.85);
      ellipse(ctx, -13, -18, 2.6, 3.6);
      flat(ctx, C.jade);
      ellipse(ctx, 13, -18, 2.6, 3.6);
      flat(ctx, C.jade);
    },

    // Lv10 挂甲の武人
    10(ctx) {
      aura(ctx, 'rgba(255, 213, 79, 0.55)', 50);
      limb(ctx, [-8, 28, -9, 44], 8);
      limb(ctx, [8, 28, 9, 44], 8);
      // 太刀
      rr(ctx, -30, -8, 5, 44, 2);
      flat(ctx, '#d9d2c3');
      rr(ctx, -32, -14, 9, 8, 2);
      flat(ctx, C.gold);
      limb(ctx, [16, -4, 24, 8, 18, 18], 7);
      limb(ctx, [-16, -4, -24, 2, -26, -8], 7);
      // 鎧
      rr(ctx, -18, -8, 36, 38, 6);
      clay(ctx, -18, 18);
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1.3;
      for (let y = -2; y < 28; y += 5) {
        ctx.beginPath();
        ctx.moveTo(-16, y);
        ctx.lineTo(16, y);
        ctx.stroke();
        for (let x = -16 + ((y / 5) % 2 ? 3 : 0); x < 16; x += 6) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + 5);
          ctx.stroke();
        }
      }
      rr(ctx, -19, 8, 38, 5, 2);
      flat(ctx, C.gold);
      ellipse(ctx, 0, -20, 11, 12);
      clay(ctx, -11, 11);
      face(ctx, 0, -20, 0.8);
      // 兜
      ctx.beginPath();
      ctx.arc(0, -26, 13, Math.PI, TAU);
      ctx.closePath();
      clay(ctx, -13, 13, '#8f5530');
      rr(ctx, -17, -28, 34, 5, 2);
      flat(ctx, C.gold);
      poly(ctx, [-2, -39, 0, -48, 2, -39]);
      flat(ctx, C.gold);
    },

    // Lv11 前方後円墳（上空から）
    11(ctx) {
      aura(ctx, 'rgba(255, 241, 118, 0.6)', 52);
      const keyhole = (s, color) => {
        ctx.save();
        ctx.scale(s, s);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, -12, 24, 0, TAU);
        ctx.fill();
        poly(ctx, [-11, 4, -26, 36, 26, 36, 11, 4]);
        ctx.fill();
        ctx.restore();
      };
      ctx.save();
      ctx.translate(0, 4);
      ctx.rotate(-0.2);
      ctx.scale(0.8, 0.8);
      keyhole(1.28, '#3f7fb0');
      keyhole(1.2, '#6fb8e0');
      keyhole(1.0, '#4d8f36');
      keyhole(0.78, '#6fae4a');
      keyhole(0.52, '#8cc867');
      // 木々
      for (const [x, y] of [[-8, -20], [6, -16], [-2, -6], [0, 18], [-8, 26], [10, 26]]) {
        ellipse(ctx, x, y, 3, 3);
        ctx.fillStyle = '#3b7a2a';
        ctx.fill();
      }
      ctx.restore();
    },
  };

  // ---------- 公開API ----------

  const images = {};

  function load() {
    for (const def of HM.LEVELS) {
      if (!def.image) continue;
      const img = new Image();
      img.onload = () => { images[def.lv] = img; };
      img.onerror = () => console.warn('[sprites] 画像を読み込めません:', def.image);
      img.src = def.image;
    }
  }

  function draw(ctx, lv, cx, cy, size) {
    const img = images[lv];
    if (img) {
      ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
      return;
    }
    const shape = SHAPES[lv];
    if (!shape) return;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(size / 100, size / 100);
    // 接地影
    if (lv < 11) {
      ellipse(ctx, 0, 44, 30, 6);
      ctx.fillStyle = 'rgba(58, 28, 12, 0.18)';
      ctx.fill();
    }
    shape(ctx);
    ctx.restore();
  }

  HM.Sprites = { load, draw, SHAPES };
})();
