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
            <div style="margin-top:12px;text-align:right;">
              <button class="ghost-btn" id="goto-mistakes">进入错题本改错 →</button>
            </div>
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
          <h3>💾 数据备份 / 恢复</h3>
          <p class="section-hint">代码更新时数据不会丢；但为防万一(比如误清 Safari 网站数据、换设备),
          建议定期把数据备份到文件。此外应用会自动把数据写到浏览器的 IndexedDB 备份区,
          即使 localStorage 被清也能自动恢复。</p>
          <div class="backup-actions">
            <button class="primary-btn" id="backup-current">💾 备份当前账号</button>
            <button class="primary-btn" id="backup-all">💾 备份所有账号</button>
            <button class="primary-btn secondary" id="restore-file">📥 从文件恢复</button>
            <input type="file" id="restore-input" accept="application/json,.json" hidden />
          </div>
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

    function downloadJSON(obj, filename) {
      const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    const dateStamp = App.todayStr();
    container.querySelector("#backup-current").addEventListener("click", () => {
      const p = App.getCurrentProfile();
      downloadJSON(App.exportData("current"), `拼音小达人_${p.label}_${dateStamp}.json`);
    });
    container.querySelector("#backup-all").addEventListener("click", () => {
      downloadJSON(App.exportData("all"), `拼音小达人_全部账号_${dateStamp}.json`);
    });
    container.querySelector("#restore-file").addEventListener("click", () => {
      container.querySelector("#restore-input").click();
    });
    container.querySelector("#restore-input").addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        if (!confirm(`即将从「${file.name}」恢复数据,当前账号数据会被覆盖。继续?`)) return;
        App.importData(json);
        alert("恢复成功!");
        render(container);
      } catch (err) {
        alert(`恢复失败:${err && err.message ? err.message : err}`);
      }
      e.target.value = ""; // 允许再次选同一文件
    });

    const gotoBtn = container.querySelector("#goto-mistakes");
    if (gotoBtn) gotoBtn.addEventListener("click", () => {
      document.getElementById("top-tab-mistakes").click();
    });
  }

  return { render };
})();
