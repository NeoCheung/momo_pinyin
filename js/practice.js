// practice.js — 游戏化练习：听音选拼音 / 看拼音选汉字 / 看字拼拼音 / 声调

window.Practice = (function () {
  let mode = "listen"; // listen / pickChar / build / tone
  let current = null; // 当前题目
  let streak = 0; // 连击
  let answeredThisRound = 0;
  let selectedBtn = null; // 用户已点选但尚未提交的选项

  function render(container) {
    container.innerHTML = `
      <div class="practice-modes">
        <button class="mode-btn active" data-mode="listen">👂 听音选拼音</button>
        <button class="mode-btn" data-mode="pickChar">🔤 看拼音选字</button>
        <button class="mode-btn" data-mode="build">🔨 看字拼拼音</button>
        <button class="mode-btn" data-mode="tone">🎚️ 声调</button>
      </div>
      <div class="practice-area" id="practice-area">
        <div class="streak-bar">连击 <b id="streak">0</b> 🔥</div>
        <div class="streak-bar">今日正确 <b id="today-correct">${todayCorrect()}</b>/<b>${App.state.settings.dailyGoal}</b></div>
        <div id="practice-question"></div>
      </div>
    `;

    container.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        mode = btn.dataset.mode;
        container.querySelectorAll(".mode-btn").forEach((b) => b.classList.toggle("active", b === btn));
        answeredThisRound = 0;
        nextQuestion(container);
      });
    });

    nextQuestion(container);
  }

  function todayCorrect() {
    const c = App.state.checkins[App.todayStr()];
    const stats = App.state.stats;
    return c ? c.correct : (stats.byType[mode] ? stats.byType[mode].correct : 0);
  }

  // 随机工具
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ---------- 生成题目 ----------
  function makeListen() {
    const word = pick(PINYIN_DATA.WORDS);
    const options = shuffle(
      [word].concat(shuffle(PINYIN_DATA.WORDS.filter((w) => w !== word)).slice(0, 3))
    );
    return { q: word, type: "listen", options, prompt: "听一听，选对的拼音", speakOnShow: word };
  }

  function makePickChar() {
    const word = pick(PINYIN_DATA.WORDS);
    const options = shuffle(
      [word].concat(shuffle(PINYIN_DATA.WORDS.filter((w) => w !== word)).slice(0, 3))
    );
    return { q: word, type: "pickChar", options, prompt: `选和 ${word.pinyin} 对应的字` };
  }

  function makeBuild() {
    const word = pick(PINYIN_DATA.WORDS);
    return { q: word, type: "build", prompt: `拼一拼「${word.char}」` };
  }

  function makeTone() {
    const word = pick(PINYIN_DATA.WORDS);
    return { q: word, type: "tone", prompt: `「${word.char}」是几声？` };
  }

  // ---------- 渲染题目 ----------
  function nextQuestion(container) {
    // 立即停掉上一题可能还在播的发音
    if (PinyinTTS.stop) PinyinTTS.stop();
    selectedBtn = null;
    const area = container.querySelector("#practice-question");
    const q = (current = makeQuestion());

    if (current.speakOnShow) {
      setTimeout(() => PinyinTTS.speakChar(current.speakOnShow.char, current.speakOnShow.sound, 0.8), 50);
    }

    // 题干:听音题额外带一个重放按钮
    let promptHTML = `<div class="question-prompt">${q.prompt}`;
    if (q.type === "listen") {
      promptHTML += ` <button class="replay-btn" id="replay-btn" aria-label="重放">🔁 重放</button>`;
    }
    promptHTML += `</div>`;
    area.innerHTML = promptHTML;

    if (q.type === "listen" || q.type === "pickChar") {
      const opts = q.options.map((o) => {
        const label = q.type === "listen" ? o.pinyin : o.char;
        return `<button class="answer-btn" data-correct="${o.char === q.q.char}" data-label="${label}" data-char="${o.char}" data-sound="${o.sound}">${label}</button>`;
      });
      area.innerHTML += `<div class="answer-grid">${opts.join("")}</div>`;
    } else if (q.type === "build") {
      renderBuild(area, q.q);
    } else if (q.type === "tone") {
      const tones = [1, 2, 3, 4];
      area.innerHTML += `<div class="answer-grid">${tones
        .map((t) => `<button class="answer-btn tone-btn" data-tone="${t}">${t}声</button>`)
        .join("")}</div>`;
    }

    // 提交/下一题 按钮容器
    area.innerHTML += `<div class="action-row" id="action-row">
      <button class="submit-btn" id="submit-btn" disabled>提交</button>
    </div>`;

    // 绑定重放
    if (q.type === "listen") {
      const rb = area.querySelector("#replay-btn");
      rb.addEventListener("click", (e) => {
        e.stopPropagation();
        PinyinTTS.speakChar(q.q.char, q.q.sound, 0.8);
      });
    }

    bindAnswers(container, q);
  }

  function renderBuild(area, q) {
    const tones = [1, 2, 3, 4];
    area.innerHTML += `
      <div class="build-word"><b>${q.char}</b><span class="build-py">${q.pinyin}</span>
      <button class="mini-speak" data-sound="${q.sound}">🔊</button></div>
      <div class="answer-grid">
        ${tones.map((t) => `<button class="answer-btn tone-btn" data-tone="${t}" data-char="${q.char}">${t}声</button>`).join("")}
      </div>
    `;
    area.querySelector(".mini-speak").addEventListener("click", (e) => {
      e.stopPropagation();
      PinyinTTS.speakChar(q.char, q.sound, 0.8);
    });
  }

  function makeQuestion() {
    switch (mode) {
      case "pickChar": return makePickChar();
      case "build": return makeBuild();
      case "tone": return makeTone();
      default: return makeListen();
    }
  }

  // ---------- 绑定答案 ----------
  function bindAnswers(container, q) {
    const buttons = container.querySelectorAll(".answer-btn");
    const submitBtn = container.querySelector("#submit-btn");
    let submitted = false;

    // 选项:仅记录当前选中,可反复更换,不判定
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (submitted) return;
        selectedBtn = btn;
        buttons.forEach((b) => b.classList.toggle("selected", b === btn));
        submitBtn.disabled = false;
      });
    });

    // 提交:判定当前选中
    submitBtn.addEventListener("click", () => {
      if (submitted || !selectedBtn) return;
      submitted = true;
      submitBtn.disabled = true;

      let correct = false;
      if (q.type === "build" || q.type === "tone") {
        const tone = parseInt(selectedBtn.dataset.tone, 10);
        const expectedTone = parseInt(q.q.sound.slice(-1), 10);
        correct = tone === expectedTone;
      } else {
        correct = selectedBtn.dataset.correct === "true";
      }
      handleAnswer(container, selectedBtn, correct, q);
    });
  }

  function handleAnswer(container, btn, correct, q) {
    answeredThisRound++;
    const submitBtn = container.querySelector("#submit-btn");

    if (correct) {
      btn.classList.remove("selected");
      btn.classList.add("answer-correct");
      streak++;
      document.querySelector("#streak").textContent = streak;
      App.recordAnswer(true, mode, q.q.sound, q.q.pinyin);
      PinyinTTS.speakChar(q.q.char, q.q.sound, 0.9);
      showFeedback("✅ 太棒了！", true);
      // 答对:1.2 秒后自动进入下一题
      submitBtn.style.display = "none";
      setTimeout(() => {
        const fb = container.querySelector("#feedback");
        if (fb) fb.remove();
        nextQuestion(container);
      }, 1200);
    } else {
      btn.classList.remove("selected");
      btn.classList.add("answer-wrong");
      // 标出正确答案
      if (q.type !== "build" && q.type !== "tone") {
        container.querySelectorAll(".answer-btn").forEach((b) => {
          if (b.dataset.correct === "true") b.classList.add("correct-highlight");
        });
      }
      streak = 0;
      document.querySelector("#streak").textContent = "0";
      App.recordAnswer(false, mode, q.q.sound, q.q.pinyin);
      showFeedback("❌ 再听一次正确读音，然后点「下一题」", false);
      // 答错:播放正确答案读音,并把提交按钮换成"下一题"
      PinyinTTS.speakChar(q.q.char, q.q.sound, 0.85);
      submitBtn.textContent = "下一题 →";
      submitBtn.disabled = false;
      submitBtn.classList.add("next-btn");
      // 重置点击行为为进入下一题
      const newBtn = submitBtn.cloneNode(true);
      submitBtn.parentNode.replaceChild(newBtn, submitBtn);
      newBtn.addEventListener("click", () => {
        const fb = container.querySelector("#feedback");
        if (fb) fb.remove();
        nextQuestion(container);
      });
    }

    document.querySelector("#today-correct").textContent = todayCorrect();
    const stats = App.state.stats;
    App.setCheckin(stats.correct >= App.state.settings.dailyGoal, stats.correct, stats.total);
  }

  function showFeedback(text, ok) {
    let fb = document.querySelector("#feedback");
    if (!fb) {
      fb = document.createElement("div");
      fb.id = "feedback";
      document.querySelector("#practice-question").appendChild(fb);
    }
    fb.textContent = text;
    fb.className = "feedback " + (ok ? "ok" : "no");
  }

  return { render };
})();
