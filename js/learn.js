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
        // 右上角 × 用于取消"已学"标记(仅在 learned 时显示)
        return `
          <div class="card learn-card ${learned ? "learned" : ""}" data-pinyin="${item.pinyin}" data-sound="${item.sound}">
            ${learned ? '<button class="card-unlearn" title="取消已学" aria-label="取消已学">×</button>' : ''}
            <div class="card-big">${item.text}</div>
            <div class="card-example">${item.example}</div>
            <div class="card-check">${learned ? "✓ 已学" : ""}</div>
          </div>
        `;
      })
      .join("");

    grid.querySelectorAll(".learn-card").forEach((card) => {
      // 卡片主体:点击发音并标记已学
      card.addEventListener("click", (e) => {
        // 点到右上角 × 时,不发音也不标记,交给 unlearn 按钮处理
        if (e.target.closest(".card-unlearn")) return;
        const sound = card.dataset.sound;
        const example = card.querySelector(".card-example").textContent;
        const type = currentKind === "INITIALS" ? "initial" : currentKind === "FINALS" ? "final" : "whole";
        PinyinTTS.speakPinyin(sound, type, example, 0.8);

        // 首次点击 → 标记已学并显示 × 按钮
        if (!card.classList.contains("learned")) {
          App.markLearned(kind, card.dataset.pinyin);
          card.classList.add("learned");
          card.querySelector(".card-check").textContent = "✓ 已学";
          if (!card.querySelector(".card-unlearn")) {
            const x = document.createElement("button");
            x.className = "card-unlearn";
            x.title = "取消已学";
            x.setAttribute("aria-label", "取消已学");
            x.textContent = "×";
            x.addEventListener("click", (ev) => onUnlearn(ev, card, kind));
            card.appendChild(x);
          }
        }
        pop(card);
      });

      // 已有 × 按钮的绑定
      const unlearnBtn = card.querySelector(".card-unlearn");
      if (unlearnBtn) unlearnBtn.addEventListener("click", (e) => onUnlearn(e, card, kind));
    });
  }

  function onUnlearn(e, card, kind) {
    e.stopPropagation();
    App.unmarkLearned(kind, card.dataset.pinyin);
    card.classList.remove("learned");
    card.querySelector(".card-check").textContent = "";
    const btn = card.querySelector(".card-unlearn");
    if (btn) btn.remove();
  }

  function pop(el) {
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  }

  return { render };
})();
