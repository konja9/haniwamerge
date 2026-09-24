// localStorage への保存と読み込み。プライベートモード等で使えなくても落ちないようにする。
(function () {
  'use strict';

  const key = () => HM.CONFIG.saveKey;

  HM.Storage = {
    load() {
      try {
        const raw = localStorage.getItem(key());
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
    save(data) {
      try {
        localStorage.setItem(key(), JSON.stringify(data));
      } catch (e) { /* 保存できない環境では無視 */ }
    },
    clear() {
      try {
        localStorage.removeItem(key());
      } catch (e) { /* noop */ }
    },
  };
})();
