// parents.js — 家长模式：进度报告 / 错题本 / 设置

window.Parents = (function () {
  let unlocked = false;

  function render(container) {
    if (!unlocked) {
      container.innerHTML = `
        <div class="parent-lock">
          <div class="lock-title">🔒 家长模式</div>
          <input type="password" id="pin-input" placeholder="输入家长密码" class="pin-input" />
          <button class="primary-btn" id="pin-submit">进入</button>
          <div id="pin-error" class="pin-error"></div>
        </div>
      `;
      container.querySelector("#pin-submit").addEventListener("click", () => {
        const pin = container.querySelector("#pin-input").value;
        if (App.verifyPin(pin)) {
          unlocked = true;
          render(container);
        } else {
          container.querySelector("#pin-error").textContent = "密码错误，请重试";
        }
      });
      return;
    }

    const stats = App.state.stats;
    const mistakes = App.state.mistakes;
    const settings = App.state.settings;
    const checkins = Object.values(App.state.checkins).filter((c) => c.done).length;

    // 薄弱音节排序
    const weak = Object.entries(mistakes).sort((a, b) => b[1].count - a[1].count).slice(0, 8);

    container.innerHTML = `
      <div class="parent-panel">
        <div class="parent-title">👨‍👩‍👦 家长模式</div>

        <div class="parent-section">
          <h3>📊 学习报告</h3>
          <div class="parent-grid">
            <div class="pstat"><b>${checkins}</b>天累计打卡</div>
            <div class="pstat"><b>${stats.correct}</b>总答对</div>
            <div class="pstat"><b>${stats.total}</b>总答题</div>
            <div class="pstat"><b>${stats.total ? Math.round((stats.correct / stats.total) * 100) : 0}%</b>正确率</div>
            <div class="pstat"><b>⭐${App.state.stars}</b>星星</div>
            <div class="pstat"><b>🏆${App.state.trophies}</b>奖杯</div>
          </div>
        </div>

        <div class="parent-section">
          <h3>❌ 错题本（薄弱拼音）</h3>
          ${weak.length ? `
            <ul class="mistake-list">
              ${weak
                .map(
                  ([k, v]) => `<li><span class="mistake-py">${v.py}</span> 错 <b>${v.count}</b> 次 (${v.last})</li>`
                )
                .join("")}
            </ul>
          ` : `<p class="empty">暂无错题，很棒！🎉</p>`}
        </div>

        <div class="parent-section">
          <h3>⚙️ 设置</h3>
          <label class="setting-row">每日目标题数
            <input type="number" id="daily-goal" value="${settings.dailyGoal}" min="1" max="50" />
          </label>
          <label class="setting-row">家长密码
            <input type="text" id="parent-pin" value="${settings.parentPin}" />
          </label>
          <button class="primary-btn" id="save-settings">保存设置</button>
          <button class="ghost-btn" id="reset-data">重置数据</button>
        </div>

        <div class="parent-section">
          <button class="ghost-btn" id="export-data">导出数据(JSON)</button>
        </div>
      </div>
    `;

    container.querySelector("#save-settings").addEventListener("click", () => {
      settings.dailyGoal = parseInt(container.querySelector("#daily-goal").value, 10) || 10;
      settings.parentPin = container.querySelector("#parent-pin").value || "0426";
      App.save();
      alert("设置已保存");
    });

    container.querySelector("#reset-data").addEventListener("click", () => {
      const p = App.getCurrentProfile();
      if (confirm(`确定重置「${p.label}」账号的所有数据？此操作不可恢复!`)) {
        App.resetForDemo();
        alert("已重置");
        render(container);
      }
    });

    container.querySelector("#export-data").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(App.state, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "pinyin-data.json";
      a.click();
    });
  }

  return { render };
})();
