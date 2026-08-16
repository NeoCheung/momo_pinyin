// app.js — 应用主逻辑：路由切换 + 状态管理 + 每日打卡 + 家长数据

window.App = (function () {
  const STORAGE_KEY = "pinyin_tool_state_v1";

  // 默认状态
  const DEFAULT_STATE = {
    // 每日打卡记录: { "2026-08-15": { done: true, correct: 20, total: 25 } }
    checkins: {},
    // 累计星星/奖杯
    stars: 0,
    trophies: 0,
    // 统计汇总（历史累计）
    stats: { correct: 0, total: 0, byType: {} },
    // 错题本: { "ba1": { count: 3, last: "2026-08-15", py: "bā" } }
    mistakes: {},
    // 家长设置
    settings: { dailyGoal: 10, checkinGoal: 10, parentPin: "0426" },
    // 当前学习进度
    progress: {
      initials: [], // 已学过的声母
      finals: [],   // 已学过的韵母
    },
  };

  let state = load();

  // ---------- 状态持久化 ----------
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATE));
      const saved = JSON.parse(raw);
      return Object.assign({}, JSON.parse(JSON.stringify(DEFAULT_STATE)), saved);
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("localStorage 写入失败", e);
    }
  }

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  }

  // ---------- 打卡 ----------
  function recordAnswer(correct, type, pinyinKey, display) {
    if (correct) {
      state.stats.correct++;
      // 加分
      state.stars += 1;
    } else {
      // 记错题
      if (!state.mistakes[pinyinKey]) {
        state.mistakes[pinyinKey] = { count: 0, last: todayStr(), py: display, type };
      }
      state.mistakes[pinyinKey].count++;
      state.mistakes[pinyinKey].last = todayStr();
      state.mistakes[pinyinKey].py = display;
    }
    state.stats.total++;
    state.stats.byType[type] = state.stats.byType[type] || { correct: 0, total: 0 };
    state.stats.byType[type].total++;
    if (correct) state.stats.byType[type].correct++;

    // 每 10 星换一枚奖杯
    while (state.stars >= 10) {
      state.stars -= 10;
      state.trophies++;
    }
    save();
  }

  // 今日打卡
  function todayCheckin() {
    const t = todayStr();
    return state.checkins[t] || null;
  }
  function setCheckin(done, correct, total) {
    const t = todayStr();
    state.checkins[t] = { done, correct, total };
    save();
  }

  // 今日是否已达标（正确数 >= 每日目标）
  function todayGoalMet() {
    const t = state.checkins[todayStr()];
    return t ? t.correct >= state.settings.dailyGoal : false;
  }

  // ---------- 学习进度 ----------
  function markLearned(kind, item) {
    const key = kind === "initials" ? "initials" : "finals";
    if (!state.progress[key].includes(item)) {
      state.progress[key].push(item);
      save();
    }
  }
  function unmarkLearned(kind, item) {
    const key = kind === "initials" ? "initials" : "finals";
    const i = state.progress[key].indexOf(item);
    if (i >= 0) {
      state.progress[key].splice(i, 1);
      save();
    }
  }
  function isLearned(kind, item) {
    const key = kind === "initials" ? "initials" : "finals";
    return state.progress[key].includes(item);
  }

  // ---------- 家长 ----------
  function verifyPin(pin) {
    return String(pin) === String(state.settings.parentPin);
  }

  function resetForDemo() {
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    save();
  }

  // ---------- 路由 ----------
  function navigate(view) {
    // 通知各模块渲染
    const evt = new CustomEvent("app:navigate", { detail: { view } });
    document.dispatchEvent(evt);
    window.scrollTo(0, 0);
  }

  return {
    get state() {
      return state;
    },
    save,
    todayStr,
    recordAnswer,
    todayCheckin,
    setCheckin,
    todayGoalMet,
    markLearned,
    unmarkLearned,
    isLearned,
    verifyPin,
    resetForDemo,
    navigate,
    STORAGE_KEY,
  };
})();
