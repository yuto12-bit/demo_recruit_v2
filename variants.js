/* ===== variants.js (generated) ===== */

/* --- sim-income.js --- */
// sim-income.js（scoped）
// - ルート（data-component="sim-income"）内だけを触る
// - ID/グローバル変数の衝突を避ける
(() => {
  const fmt = (n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return "0";
    return num.toLocaleString("ja-JP");
  };

  const calc = (root) => {
    const dailyWageEl = root.querySelector('[data-role="daily-wage"]');
    const weeklyDaysEl = root.querySelector('[data-role="weekly-days"]');
    const transportEl = root.querySelector('[data-role="transport"]');

    const dailyOut = root.querySelector('[data-role="display-daily"]');
    const weeklyOut = root.querySelector('[data-role="display-weekly"]');
    const transportOut = root.querySelector('[data-role="display-transport"]');

    const monthlyOut = root.querySelector('[data-role="result-monthly"]');
    const yearlyOut = root.querySelector('[data-role="result-yearly"]');

    if (!dailyWageEl || !weeklyDaysEl || !transportEl || !dailyOut || !weeklyOut || !transportOut || !monthlyOut || !yearlyOut) return;

    const daily = Number(dailyWageEl.value || 0);
    const weekly = Number(weeklyDaysEl.value || 0);
    const transport = Number(transportEl.value || 0);

    // 日給 × 週出勤日数 × 4週 ＋ 交通費（月額）
    const monthly = Math.max(0, daily * weekly * 4 + transport);
    const yearly = Math.max(0, monthly * 12);

    dailyOut.textContent = fmt(daily);
    weeklyOut.textContent = fmt(weekly);
    transportOut.textContent = fmt(transport);

    monthlyOut.textContent = fmt(monthly);
    yearlyOut.textContent = fmt(yearly);
  };

  const bind = (root) => {
    // 初期計算
    calc(root);

    // 入力監視
    root.querySelectorAll('input[type="range"]').forEach((el) => {
      el.addEventListener('input', () => calc(root));
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-component="sim-income"]').forEach(bind);
  });
})();

