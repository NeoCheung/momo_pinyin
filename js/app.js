// app.js — 应用主逻辑:状态管理 + 每日打卡 + 家长数据 + 多账号(Profile)

window.App = (function () {
  const STORAGE_PREFIX = "pinyin_tool_state_v1"; // 每个 profile 存到 `${STORAGE_PREFIX}__${profileId}`
  const LEGACY_KEY = "pinyin_tool_state_v1";     // 老版本无 profile 后缀,升级时迁移
  const CURRENT_PROFILE_KEY = "pinyin_tool_current_profile_v1";

  // 内置账号(可扩展)。id 用于 storage 后缀,label 展示给用户
  const PROFILES = [
    { id: "default", label: "正式", icon: "👤" },
    { id: "test", label: "测试", icon: "🧪" },
  ];

  const DEFAULT_STATE = {
    checkins: {},
    stars: 0,
    trophies: 0,
    stats: { correct: 0, total: 0, byType: {} },
    mistakes: {},
    settings: { dailyGoal: 10, checkinGoal: 10, parentPin: "0426" },
    progress: { initials: [], finals: [] },
  };

  let currentProfile = loadCurrentProfile();
  migrateLegacy(); // 首次运行:把老 key 迁移到 default profile
  let state = load();

  function storageKeyFor(profileId) {
    return `${STORAGE_PREFIX}__${profileId}`;
  }

  function loadCurrentProfile() {
    try {
      const id = localStorage.getItem(CURRENT_PROFILE_KEY);
      if (id && PROFILES.some((p) => p.id === id)) return id;
    } catch (e) { /* ignore */ }
    return "default";
  }

  function saveCurrentProfile() {
    try { localStorage.setItem(CURRENT_PROFILE_KEY, currentProfile); }
    catch (e) { /* ignore */ }
  }

  function migrateLegacy() {
    try {
      const legacy = localStorage.getItem(LEGACY_KEY);
      const defaultKey = storageKeyFor("default");
      // 老 key 有内容 且 新 default key 还没数据 → 迁移
      if (legacy && !localStorage.getItem(defaultKey)) {
        localStorage.setItem(defaultKey, legacy);
      }
      // 迁移后清掉老 key(避免下次又冲掉新数据)
      if (legacy && localStorage.getItem(defaultKey)) {
        localStorage.removeItem(LEGACY_KEY);
      }
    } catch (e) { /* ignore */ }
  }

  function load() {
    try {
      const raw = localStorage.getItem(storageKeyFor(currentProfile));
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATE));
      const saved = JSON.parse(raw);
      return Object.assign({}, JSON.parse(JSON.stringify(DEFAULT_STATE)), saved);
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  function save() {
    try {
      localStorage.setItem(storageKeyFor(currentProfile), JSON.stringify(state));
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

  // ---------- 账号切换 ----------
  function listProfiles() { return PROFILES.slice(); }
  function getCurrentProfile() {
    return PROFILES.find((p) => p.id === currentProfile) || PROFILES[0];
  }
  function switchProfile(id) {
    if (!PROFILES.some((p) => p.id === id)) return false;
    if (id === currentProfile) return true;
    // 切换前先把当前 profile 落盘
    save();
    currentProfile = id;
    saveCurrentProfile();
    state = load();
    // 通知 UI 全量重渲染
    document.dispatchEvent(new CustomEvent("app:profile-changed", { detail: { profileId: id } }));
    return true;
  }

  // ---------- 打卡 ----------
  function recordAnswer(correct, type, pinyinKey, display) {
    if (correct) {
      state.stats.correct++;
      state.stars += 1;
    } else {
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

    while (state.stars >= 10) {
      state.stars -= 10;
      state.trophies++;
    }
    save();
  }

  function todayCheckin() {
    return state.checkins[todayStr()] || null;
  }
  function setCheckin(done, correct, total) {
    state.checkins[todayStr()] = { done, correct, total };
    save();
  }
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

  function navigate(view) {
    const evt = new CustomEvent("app:navigate", { detail: { view } });
    document.dispatchEvent(evt);
    window.scrollTo(0, 0);
  }

  return {
    get state() { return state; },
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
    // 账号
    listProfiles,
    getCurrentProfile,
    switchProfile,
    STORAGE_KEY: STORAGE_PREFIX,
  };
})();
