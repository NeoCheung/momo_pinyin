// mistakes.js — 错题本:回顾错题、答对即清除

window.Mistakes = (function () {
  let mode = "list"; // list | review | done
  let queue = [];     // 待改的错题(每次进入 review 时快照)
  let selectedBtn = null;

  function render(container) {
    if (mode === "review") return renderReview(container);
    return renderList(container);
  }

  // ---------- 列表页 ----------
  function renderList(container) {
    const items = App.getPendingMistakes();
    container.innerHTML = `
      <div class="view-title">📕 错题本</div>
      <div class="mistakes-panel">
        <div class="mistakes-header">
          <div class="mistakes-count-line">
            待改错 <b>${items.length}</b> 题 · 全部答对自动清空
          </div>
          <button class="submit-btn" id="start-review" ${items.length ? "" : "disabled"}>
            ▶ 开始改错 ${items.length ? `(${items.length})` : ""}
          </button>
        </div>
        ${items.length ? renderMistakeItems(items) : `
          <div class="mistakes-empty">🎉 没有错题，你太棒了！</div>
        `}
        ${items.length ? `
          <div class="mistakes-actions">
            <button class="ghost-btn" id="clear-mistakes">清空错题本(需家长密码)</button>
          </div>
        ` : ""}
      </div>
    `;

    const start = container.querySelector("#start-review");
    if (start) start.addEventListener("click", () => {
      if (!items.length) return;
      queue = items.slice();
      mode = "review";
      renderReview(container);
    });

    const clr = container.querySelector("#clear-mistakes");
    if (clr) clr.addEventListener("click", () => askPinAndClear(container));
  }

  function renderMistakeItems(items) {
    const typeLabel = { listen: "👂听音", pickChar: "🔤看拼音", build: "🔨拼拼音", tone: "🎚️声调" };
    return `<ul class="mistake-list">${items
      .map((m, i) => `
        <li>
          <span class="mistake-idx">${i + 1}</span>
          <span class="mistake-py">${m.pinyin}</span>
          <span class="mistake-char">${m.char}</span>
          <span class="mistake-count">❌${m.count}次</span>
          <span class="mistake-type">${typeLabel[m.type] || m.type}</span>
        </li>
      `)
      .join("")}</ul>`;
  }

  function askPinAndClear(container) {
    const pin = prompt("请输入家长密码以清空错题本:");
    if (pin === null) return;
    if (!App.verifyPin(pin)) return alert("密码错误");
    if (!confirm("确定清空当前账号的错题本?此操作不可恢复!")) return;
    App.clearAllMistakes();
    renderList(container);
  }

  // ---------- 改错模式 ----------
  function renderReview(container) {
    if (!queue.length) return renderDone(container);
    selectedBtn = null;
    const current = queue[0];
    const q = buildQuestion(current);

    // 展示音:进入题目时自动读一遍(仅 listen 类)
    if (q.speakOnShow) {
      setTimeout(() => PinyinTTS.spellWord(q.speakOnShow.char, q.speakOnShow.sound, 0.8), 50);
    }

    let promptHTML = `<div class="question-prompt">${q.prompt}`;
    if (q.type === "listen") {
      promptHTML += ` <button class="replay-btn" id="replay-btn" aria-label="重放">🔁 重放</button>`;
    }
    promptHTML += `</div>`;

    let bodyHTML = "";
    if (q.type === "listen" || q.type === "pickChar") {
      bodyHTML = `<div class="answer-grid">${q.options.map((o) => {
        const label = q.type === "listen" ? o.pinyin : o.char;
        return `<button class="answer-btn" data-correct="${o.char === q.q.char}" data-label="${label}">${label}</button>`;
      }).join("")}</div>`;
    } else if (q.type === "build") {
      const tones = [1, 2, 3, 4];
      bodyHTML = `
        <div class="build-word"><b>${q.q.char}</b><span class="build-py">${q.q.pinyin}</span>
        <button class="mini-speak" data-sound="${q.q.sound}">🔊</button></div>
        <div class="answer-grid">
          ${tones.map((t) => `<button class="answer-btn tone-btn" data-tone="${t}">${t}声</button>`).join("")}
        </div>
      `;
    } else if (q.type === "tone") {
      const tones = [1, 2, 3, 4];
      bodyHTML = `<div class="answer-grid">${tones
        .map((t) => `<button class="answer-btn tone-btn" data-tone="${t}">${t}声</button>`)
        .join("")}</div>`;
    }

    container.innerHTML = `
      <div class="view-title">📕 改错中 <span class="mistake-progress">剩余 ${queue.length} 题</span></div>
      <div class="practice-area">
        <div class="streak-bar">当前题目 <b>${q.q.pinyin} ${q.q.char}</b></div>
        <div id="mistake-question">
          ${promptHTML}
          ${bodyHTML}
          <div class="action-row">
            <button class="ghost-btn" id="exit-review">退出</button>
            <button class="submit-btn" id="submit-btn" disabled>提交</button>
          </div>
        </div>
      </div>
    `;

    if (q.type === "listen") {
      container.querySelector("#replay-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        PinyinTTS.spellWord(q.q.char, q.q.sound, 0.8);
      });
    }
    if (q.type === "build") {
      container.querySelector(".mini-speak").addEventListener("click", (e) => {
        e.stopPropagation();
        PinyinTTS.spellWord(q.q.char, q.q.sound, 0.8);
      });
    }

    container.querySelector("#exit-review").addEventListener("click", () => {
      mode = "list";
      renderList(container);
    });

    bindAnswers(container, q, current);
  }

  function bindAnswers(container, q, mistakeItem) {
    const buttons = container.querySelectorAll(".answer-btn");
    let submitBtn = container.querySelector("#submit-btn");
    let submitted = false;

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (submitted) return;
        selectedBtn = btn;
        buttons.forEach((b) => b.classList.toggle("selected", b === btn));
        submitBtn.disabled = false;
      });
    });

    submitBtn.addEventListener("click", () => {
      if (submitted || !selectedBtn) return;
      submitted = true;
      submitBtn.disabled = true;

      let correct = false;
      if (q.type === "build" || q.type === "tone") {
        const tone = parseInt(selectedBtn.dataset.tone, 10);
        const expected = parseInt(q.q.sound.slice(-1), 10);
        correct = tone === expected;
      } else {
        correct = selectedBtn.dataset.correct === "true";
      }
      handleAnswer(container, selectedBtn, correct, q, mistakeItem);
    });
  }

  function handleAnswer(container, btn, correct, q, mistakeItem) {
    // 无论对错都调用 App.recordAnswer:答对会自动从 mistakes 里删,答错会 count++
    App.recordAnswer(correct, q.type, q.q.sound, q.q.pinyin);
    document.getElementById("header-stars").textContent = App.state.stars;
    document.getElementById("header-trophies").textContent = App.state.trophies;

    const submitBtn = container.querySelector("#submit-btn");
    if (correct) {
      btn.classList.remove("selected");
      btn.classList.add("answer-correct");
      PinyinTTS.spellWord(q.q.char, q.q.sound, 0.9);
      showFeedback(container, "✅ 答对啦!这题从错题本移除", true);
      submitBtn.style.display = "none";
      // 从当前队列头移除,进入下一题
      queue.shift();
      setTimeout(() => {
        const fb = container.querySelector("#feedback");
        if (fb) fb.remove();
        renderReview(container);
      }, 1200);
    } else {
      btn.classList.remove("selected");
      btn.classList.add("answer-wrong");
      container.querySelectorAll(".answer-btn").forEach((b) => {
        if (b.dataset.correct === "true") b.classList.add("correct-highlight");
      });
      // 标记正确答案(tone/build 通过按钮 tone 匹配)
      if (q.type === "build" || q.type === "tone") {
        const expected = parseInt(q.q.sound.slice(-1), 10);
        container.querySelectorAll(".answer-btn.tone-btn").forEach((b) => {
          if (parseInt(b.dataset.tone, 10) === expected) b.classList.add("correct-highlight");
        });
      }
      PinyinTTS.spellWord(q.q.char, q.q.sound, 0.85);
      showFeedback(container, "❌ 再听一次正确读音,然后点「下一题」", false);
      submitBtn.textContent = "下一题 →";
      submitBtn.disabled = false;
      submitBtn.classList.add("next-btn");
      // 重新绑定 click:进入下一题;题目留在队尾稍后再考
      const newBtn = submitBtn.cloneNode(true);
      submitBtn.parentNode.replaceChild(newBtn, submitBtn);
      newBtn.addEventListener("click", () => {
        // 错题移到队尾,稍后再来一次
        const first = queue.shift();
        if (first) queue.push(first);
        const fb = container.querySelector("#feedback");
        if (fb) fb.remove();
        renderReview(container);
      });
    }
  }

  function showFeedback(container, text, ok) {
    let fb = container.querySelector("#feedback");
    if (!fb) {
      fb = document.createElement("div");
      fb.id = "feedback";
      container.querySelector("#mistake-question").appendChild(fb);
    }
    fb.textContent = text;
    fb.className = "feedback " + (ok ? "ok" : "no");
  }

  function renderDone(container) {
    mode = "list";
    container.innerHTML = `
      <div class="view-title">📕 错题本</div>
      <div class="mistakes-panel">
        <div class="mistakes-empty">🎉 错题本清空啦，太厉害!</div>
        <div class="action-row">
          <button class="submit-btn" id="back-list">返回错题本</button>
        </div>
      </div>
    `;
    container.querySelector("#back-list").addEventListener("click", () => renderList(container));
  }

  // ---------- 题目构造(和 practice.js 保持一致) ----------
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildQuestion(mistakeItem) {
    const word = mistakeItem.wordRef;
    const type = mistakeItem.type;
    if (type === "listen") {
      const options = shuffle([word].concat(shuffle(PINYIN_DATA.WORDS.filter((w) => w !== word)).slice(0, 3)));
      return { q: word, type, options, prompt: "听一听，选对的拼音", speakOnShow: word };
    }
    if (type === "pickChar") {
      const options = shuffle([word].concat(shuffle(PINYIN_DATA.WORDS.filter((w) => w !== word)).slice(0, 3)));
      return { q: word, type, options, prompt: `选和 ${word.pinyin} 对应的字` };
    }
    if (type === "build") {
      return { q: word, type, prompt: `拼一拼「${word.char}」` };
    }
    // tone / 默认
    return { q: word, type: "tone", prompt: `「${word.char}」是几声？` };
  }

  return { render };
})();
