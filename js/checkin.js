// checkin.js — 每日打卡 + 日历

window.Checkin = (function () {
  function render(container) {
    const checkins = App.state.checkins;
    const today = App.todayStr();
    const goal = App.state.settings.dailyGoal;
    const stats = App.state.stats;

    // 生成最近 7 天的日历
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      const rec = checkins[key];
      days.push({ key, rec, isToday: key === today });
    }

    // 累计打卡天数
    const totalCheckins = Object.values(checkins).filter((c) => c.done).length;

    container.innerHTML = `
      <div class="checkin-header">
        <div class="checkin-stars">⭐ × ${App.state.stars}</div>
        <div class="checkin-trophies">🏆 × ${App.state.trophies}</div>
      </div>
      <div class="checkin-stats">
        <div class="stat-box"><b>${totalCheckins}</b><span>累计打卡</span></div>
        <div class="stat-box"><b>${stats.correct}</b><span>总答对数</span></div>
        <div class="stat-box"><b>${stats.total ? Math.round((stats.correct / stats.total) * 100) : 0}%</b><span>正确率</span></div>
      </div>
      <div class="calendar">
        ${days
          .map(
            (d) => `
              <div class="cal-day ${d.isToday ? "today" : ""} ${d.rec && d.rec.done ? "done" : ""}">
                <div class="cal-date">${d.key.slice(-5).replace("-", "/")}</div>
                <div class="cal-icon">${d.rec && d.rec.done ? "✅" : ""}</div>
              </div>
            `
          )
          .join("")}
      </div>
      <div class="checkin-goal">
        <div>今日目标：答对 <b>${goal}</b> 题</div>
        <div>已达 ${stats.correct} 题 ${stats.correct >= goal ? "🎉 已达标!" : ""}</div>
      </div>
      <div class="checkin-progress">
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100, (stats.correct / goal) * 100)}%"></div></div>
      </div>
    `;
  }

  return { render };
})();
