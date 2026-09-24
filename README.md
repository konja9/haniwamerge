# はにわマージ

スマホの縦持ちで遊ぶブラウザ向けマージゲームです。HTML / JS / Canvas だけで作っていて、ビルドはいりません。

## 遊び方

- 下の **窯** をタップすると、盤面（5×7）の空いているマスに Lv1 の「粘土玉」が出ます。窯を焚くには土を使います。
- 同じレベルのはにわをドラッグして重ねると合体し、レベルが1つ上がります。全部で11段階あり、Lv11 は **前方後円墳** です。
- はにわは毎秒、レベルに応じた量の土を作ります。
- 進行は自動で localStorage に保存されます。ゲームを閉じていた間も、土が半分の速さで最大8時間ぶんたまります。

## ローカルで動かす

`index.html` を直接開いても遊べます。スマホの実機で確かめるときは、静的サーバーを立てると便利です。

```sh
npx http-server -p 8080 .
# または
python3 -m http.server 8080
```

## GitHub Pages で公開する

リポジトリの Settings → Pages で「Deploy from a branch」を選び、公開したいブランチの `/ (root)` を指定します。

## ファイル構成

| ファイル | 役割 |
| --- | --- |
| `index.html` | 画面の骨組み（Canvas と HUD） |
| `css/style.css` | HUD・トーストの見た目 |
| `js/config.js` | **レベル定義・バランス調整・画像パス** |
| `js/sprites.js` | はにわの描画（画像があれば画像、なければ図形） |
| `js/audio.js` | WebAudio で合成する効果音 |
| `js/storage.js` | localStorage への保存と読み込み |
| `js/effects.js` | パーティクル、数値ポップ、画面揺れ |
| `js/game.js` | 盤面・入力・更新・描画のメインループ |

## 絵を画像に差し替える

1. `assets/` に正方形の透過PNGを置きます（例: `assets/lv01.png`）。
2. `js/config.js` で、そのレベルの `image` に画像のパスを書きます。

```js
{ lv: 1, name: '粘土玉', rate: 1, glow: '#e8b98a', image: 'assets/lv01.png' },
```

`image` が `null` のレベルや、読み込みに失敗した画像は、これまでどおり図形で描かれます。なので1枚ずつ差し替えられます。画像はマスの約84%の大きさで、マスの中央に描かれます。

図形の絵そのものを直したいときは、`js/sprites.js` の `SHAPES[レベル]` を編集してください。図形は中心が (0,0)、一辺が100の座標で描いています。

## バランス調整

`js/config.js` の `HM.CONFIG` で変えられます。

- `startSoil` … 最初に持っている土
- `kilnBaseCost` / `kilnCostStep` … 窯のコスト。計算式は `floor(base + 累計生成数 × step)`
- `offlineMaxSec` / `offlineRate` … 閉じている間の生産の上限時間と倍率
- 各レベルの `rate` … 毎秒の生産量。初期値では、合体するたびに合計の生産量が1.5倍になります。
