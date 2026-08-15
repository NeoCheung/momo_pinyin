// learn.js — 学习模块：声母/韵母/整体认读卡片学习

window.Learn = (function () {
  let currentKind = "INITIALS"; // INITIALS / FINALS / WHOLE

  function render(container) {
    container.innerHTML = `
      <div class="learn-tabs">
        <button class="tab-btn ${currentKind === "INITIALS" ? "active" : ""}" data-kind="INITIALS">声母</button>
        <button class="tab-btn ${currentKind === "FINALS" ? "active" : ""}" data-kind="FINALS">韵母</button>
        <button class="tab-btn ${currentKind === "WHOLE" ? "active" : ""}" data-kind="WHOLE">整体认读</button>
      </div>
      <div class="learn-grid" id="learn-grid"></div>
    `;

    container.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentKind = btn.dataset.kind;
        render(container);
      });
    });

    renderGrid(container);
  }

  function renderGrid(container) {
    const grid = container.querySelector("#learn-grid");
    const data = PINYIN_DATA.ALL[currentKind];
    const kind = currentKind === "INITIALS" ? "initials" : "finals";

    grid.innerHTML = data
      .map((item) => {
        const learned = App.isLearned(kind, item.pinyin);
        return `
          <div class="card learn-card ${learned ? "learned" : ""}" data-pinyin="${item.pinyin}" data-sound="${item.sound}">
            <div class="card-big">${item.text}</div>
            <div class="card-example">${item.example}</div>
            <div class="card-check">${learned ? "✓ 已学" : ""}</div>
          </div>
        `;
      })
      .join("");

    grid.querySelectorAll(".learn-card").forEach((card) => {
      card.addEventListener("click", () => {
        const sound = card.dataset.sound;
        const example = card.querySelector(".card-example").textContent;
        // 按卡片类型拼读：声母=呼读音+例字，韵母=标准音+例字，整体认读=完整音
        const type = currentKind === "INITIALS" ? "initial" : currentKind === "FINALS" ? "final" : "whole";
        PinyinTTS.speakPinyin(sound, type, example, 0.8);
        App.markLearned(kind, card.dataset.pinyin);
        card.classList.add("learned");
        card.querySelector(".card-check").textContent = "✓ 已学";
        pop(card);
      });
    });
  }

  // 点击弹跳动画
  function pop(el) {
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  }

  return { render };
})();
