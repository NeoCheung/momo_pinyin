// practice.js — 游戏化练习：听音选拼音 / 看拼音选汉字 / 看字拼拼音 / 声调

window.Practice = (function () {
  let mode = "listen"; // listen / pickChar / build / tone
  let current = null; // 当前题目
  let streak = 0; // 连击
  let answeredThisRound = 0;

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
    // 听一个拼音，选正确的拼音文字
    const word = pick(PINYIN_DATA.WORDS);
    const options = shuffle(
      [word].concat(shuffle(PINYIN_DATA.WORDS.filter((w) => w !== word)).slice(0, 3))
    );
    return { q: word, type: "listen", options, prompt: "听一听，选对的拼音", speakOnShow: word };
  }

  function makePickChar() {
    // 显示拼音，选正确的汉字
    const word = pick(PINYIN_DATA.WORDS);
    const options = shuffle(
      [word].concat(shuffle(PINYIN_DATA.WORDS.filter((w) => w !== word)).slice(0, 3))
    );
    return { q: word, type: "pickChar", options, prompt: `选和 ${word.pinyin} 对应的字` };
  }

  function makeBuild() {
    // 显示汉字，从声母/韵母/声调组装
    const word = pick(PINYIN_DATA.WORDS);
    return { q: word, type: "build", prompt: `拼一拼「${word.char}」` };
  }

  function makeTone() {
    const word = pick(PINYIN_DATA.WORDS);
    return { q: word, type: "tone", prompt: `「${word.char}」是几声？` };
  }

  // ---------- 渲染题目 ----------
  function nextQuestion(container) {
    const area = container.querySelector("#practice-question");
    const q = (current = makeQuestion());

    if (current.speakOnShow) {
      setTimeout(() => PinyinTTS.speak(current.speakOnShow.sound, 0.8), 50);
    }

    area.innerHTML = `<div class="question-prompt">${q.prompt}</div>`;

    if (q.type === "listen" || q.type === "pickChar") {
      // 选项按钮
      const opts = q.options.map((o) => {
        const label = q.type === "listen" ? o.pinyin : o.char;
        return `<button class="answer-btn" data-correct="${o.char === q.q.char}" data-label="${label}">${label}</button>`;
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

    bindAnswers(container, q);
  }

  function renderBuild(area, q) {
    // 组装：声母 + 韵母 + 声调
    // 简化：从 WORDS 里选几个候选音节，选对 声母/韵母/声调
    // 这里简化为"选出正确的声调"（便于 6 岁孩子）
    const tones = [1, 2, 3, 4];
    area.innerHTML = `
      <div class="build-word"><b>${q.char}</b><span class="build-py">${q.pinyin}</span>
      <button class="mini-speak" data-sound="${q.sound}">🔊</button></div>
      <div class="answer-grid">
        ${tones.map((t) => `<button class="answer-btn tone-btn" data-tone="${t}" data-char="${q.char}">${t}声</button>`).join("")}
      </div>
    `;
    area.querySelector(".mini-speak").addEventListener("click", (e) => {
      e.stopPropagation();
      PinyinTTS.speak(q.sound, 0.8);
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
    let locked = false;

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (locked) return;
        let correct = false;

        if (q.type === "build" || q.type === "tone") {
          const tone = parseInt(btn.dataset.tone, 10);
          // 从 sound 末尾解析声调数字
          const expectedTone = parseInt(q.q.sound.slice(-1), 10);
          correct = tone === expectedTone;
        } else {
          correct = btn.dataset.correct === "true";
        }

        locked = true;
        handleAnswer(container, btn, correct, q);
      });
    });
  }

  function handleAnswer(container, btn, correct, q) {
    answeredThisRound++;
    if (correct) {
      // 答对：选中的选项标绿
      btn.style.background = "#4CAF50";
      btn.style.color = "#fff";
      streak++;
      document.querySelector("#streak").textContent = streak;
      App.recordAnswer(true, mode, q.q.sound, q.q.pinyin);
      // 正确提示音
      PinyinTTS.speak(q.q.char, 0.9);
      showFeedback("✅ 太棒了！", true);
    } else {
      // 答错
      btn.style.background = "#F44336";
      btn.style.color = "#fff";
      // 标出正确答案
      if (q.type !== "build" && q.type !== "tone") {
        container.querySelectorAll(".answer-btn").forEach((b) => {
          if (b.dataset.correct === "true") b.classList.add("correct-highlight");
        });
      }
      streak = 0;
      document.querySelector("#streak").textContent = "0";
      App.recordAnswer(false, mode, q.q.sound, q.q.pinyin);
      showFeedback("❌ 再试试~", false);
    }

    document.querySelector("#today-correct").textContent = todayCorrect();

    // 更新今日打卡
    const stats = App.state.stats;
    App.setCheckin(stats.correct >= App.state.settings.dailyGoal, stats.correct, stats.total);

    // 稍后进入下一题
    setTimeout(() => {
      container.querySelector("#feedback") && container.querySelector("#feedback").remove();
      nextQuestion(container);
    }, 1200);
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
