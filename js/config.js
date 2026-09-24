// ゲーム全体の設定値とレベル定義。
// バランス調整や画像差し替えは基本的にこのファイルだけで完結する。
window.HM = window.HM || {};

HM.CONFIG = {
  cols: 5,
  rows: 7,
  saveKey: 'haniwamerge.save.v1',
  autosaveSec: 5,

  startSoil: 30,
  // 窯のコスト = floor(kilnBaseCost + 累計生成数 * kilnCostStep)
  kilnBaseCost: 5,
  kilnCostStep: 0.25,

  // オフライン中の生産: 最大 offlineMaxSec 秒まで、通常の offlineRate 倍
  offlineMaxSec: 8 * 60 * 60,
  offlineRate: 0.5,
};

// image に画像パス（例: 'assets/lv01.png'）を入れると、図形描画の代わりにその画像を使う。
// 画像は正方形・透過PNG推奨。読み込みに失敗した場合は図形描画にフォールバックする。
// rate: 毎秒の土の生産量 / glow: 合体エフェクトやハイライトの色
HM.LEVELS = [
  { lv: 1,  name: '粘土玉',       rate: 1,     glow: '#e8b98a', image: null },
  { lv: 2,  name: '円筒埴輪',     rate: 3,     glow: '#f0a868', image: null },
  { lv: 3,  name: '朝顔形埴輪',   rate: 9,     glow: '#f59e8b', image: null },
  { lv: 4,  name: '家形埴輪',     rate: 27,    glow: '#e9c46a', image: null },
  { lv: 5,  name: '鶏形埴輪',     rate: 81,    glow: '#f4845f', image: null },
  { lv: 6,  name: '犬形埴輪',     rate: 243,   glow: '#9ccc65', image: null },
  { lv: 7,  name: '馬形埴輪',     rate: 729,   glow: '#4fc3f7', image: null },
  { lv: 8,  name: '踊る埴輪',     rate: 2187,  glow: '#ba68c8', image: null },
  { lv: 9,  name: '巫女の埴輪',   rate: 6561,  glow: '#4db6ac', image: null },
  { lv: 10, name: '挂甲の武人',   rate: 19683, glow: '#ffd54f', image: null },
  { lv: 11, name: '前方後円墳',   rate: 59049, glow: '#fff176', image: null },
];
