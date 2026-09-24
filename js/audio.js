// WebAudio で合成する効果音。音声ファイルは使わない。
(function () {
  'use strict';

  let ac = null;
  let master = null;
  let noiseBuf = null;
  let enabled = true;

  function unlock() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.5;
      master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
  }

  function ready() {
    return enabled && ac && ac.state === 'running';
  }

  function tone(freq, dur, opt) {
    if (!ready()) return;
    opt = opt || {};
    const t0 = ac.currentTime + (opt.at || 0);
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = opt.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opt.slide) osc.frequency.exponentialRampToValueAtTime(opt.slide, t0 + dur);
    const vol = opt.vol == null ? 0.25 : opt.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + (opt.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, opt) {
    if (!ready()) return;
    opt = opt || {};
    const t0 = ac.currentTime + (opt.at || 0);
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = opt.freq || 800;
    const g = ac.createGain();
    g.gain.setValueAtTime(opt.vol == null ? 0.2 : opt.vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.05);
  }

  // ペンタトニックでレベルごとに音程を上げる
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26];
  const note = (lv) => 392 * Math.pow(2, SCALE[Math.min(lv - 1, SCALE.length - 1)] / 12);

  HM.Audio = {
    unlock,
    get enabled() { return enabled; },
    set enabled(v) { enabled = !!v; },

    spawn() {
      noise(0.12, { freq: 1500, vol: 0.18 });
      tone(260, 0.14, { type: 'triangle', slide: 520, vol: 0.2 });
    },
    pickup() {
      tone(600, 0.07, { slide: 800, vol: 0.12 });
    },
    drop() {
      noise(0.06, { freq: 700, vol: 0.15 });
      tone(300, 0.09, { type: 'triangle', slide: 200, vol: 0.16 });
    },
    merge(lv) {
      const f = note(lv);
      noise(0.18, { freq: 500, vol: 0.35 });
      tone(f, 0.2, { type: 'triangle', vol: 0.25 });
      tone(f * 1.5, 0.22, { type: 'sine', vol: 0.18, at: 0.06 });
      tone(f * 2, 0.35, { type: 'sine', vol: 0.15, at: 0.12 });
    },
    discover() {
      [0, 4, 7, 12].forEach((s, i) =>
        tone(784 * Math.pow(2, s / 12), 0.25, { type: 'triangle', vol: 0.14, at: 0.25 + i * 0.07 }));
    },
    fanfare() {
      const seq = [[523, 0], [659, 0.14], [784, 0.28], [1047, 0.42], [784, 0.62], [1047, 0.76]];
      seq.forEach(([f, at], i) => {
        const last = i === seq.length - 1;
        tone(f, last ? 0.9 : 0.2, { type: 'square', vol: 0.08, at });
        tone(f / 2, last ? 0.9 : 0.2, { type: 'triangle', vol: 0.16, at });
      });
      noise(0.6, { freq: 3000, vol: 0.08, at: 0.76 });
    },
    error() {
      tone(180, 0.16, { type: 'square', slide: 120, vol: 0.07 });
    },
  };
})();
