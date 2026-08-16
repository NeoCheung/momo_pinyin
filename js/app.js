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
    // 同步写 IndexedDB 备份(异步不阻塞)
    idbBackup(currentProfile, state).catch(() => {});
  }

  // ---------- IndexedDB 备份层 ----------
  // 目的:localStorage 被清网站数据/换浏览器/隐私模式导致丢失时,可从 IDB 恢复
  const IDB_NAME = "pinyin_backup_v1";
  const IDB_STORE = "profiles";
  let idbPromise = null;
  function openIDB() {
    if (idbPromise) return idbPromise;
    idbPromise = new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) return reject(new Error("no idb"));
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(IDB_STORE, { keyPath: "profileId" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return idbPromise;
  }
  async function idbBackup(profileId, data) {
    try {
      const db = await openIDB();
      await new Promise((res, rej) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put({
          profileId,
          data,
          savedAt: new Date().toISOString(),
        });
        tx.oncomplete = res; tx.onerror = () => rej(tx.error);
      });
    } catch (e) { /* IDB 不可用就算了 */ }
  }
  async function idbRestore(profileId) {
    try {
      const db = await openIDB();
      return await new Promise((res, rej) => {
        const tx = db.transaction(IDB_STORE, "readonly");
        const req = tx.objectStore(IDB_STORE).get(profileId);
        req.onsuccess = () => res(req.result ? req.result.data : null);
        req.onerror = () => rej(req.error);
      });
    } catch (e) { return null; }
  }
  // 启动兜底:如果 localStorage 里当前 profile 是空的,但 IDB 有备份,自动恢复
  async function autoRestoreFromIDB() {
    if (localStorage.getItem(storageKeyFor(currentProfile))) return; // 有 LS 数据不动
    const backup = await idbRestore(currentProfile);
    if (backup) {
      state = Object.assign({}, JSON.parse(JSON.stringify(DEFAULT_STATE)), backup);
      try { localStorage.setItem(storageKeyFor(currentProfile), JSON.stringify(state)); } catch (e) {}
      console.info(`[App] 已从 IndexedDB 备份恢复账号「${currentProfile}」的数据`);
      // 通知 UI 全量重渲(星星/打卡/学习进度都需要刷新)
      document.dispatchEvent(new CustomEvent("app:state-changed"));
      document.dispatchEvent(new CustomEvent("app:profile-changed", { detail: { profileId: currentProfile, restored: true } }));
    }
  }
  // 页面加载即触发一次(异步,不阻塞初始化)
  autoRestoreFromIDB().catch(() => {});

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
      // 策略 A:答对就从错题本移除该条
      if (state.mistakes[pinyinKey]) {
        delete state.mistakes[pinyinKey];
      }
    } else {
      if (!state.mistakes[pinyinKey]) {
        state.mistakes[pinyinKey] = {
          count: 0,
          last: todayStr(),
          added: todayStr(),
          py: display,
          type,
        };
      }
      state.mistakes[pinyinKey].count++;
      state.mistakes[pinyinKey].last = todayStr();
      state.mistakes[pinyinKey].py = display;
      state.mistakes[pinyinKey].type = type;
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
    // 通知 UI 刷新顶栏(星星/奖杯/错题 badge)
    document.dispatchEvent(new CustomEvent("app:state-changed"));
    // 兜底:如果 index.html 挂了全局 renderAppHeader,直接调
    if (typeof window.renderAppHeader === "function") window.renderAppHeader();
  }

  // ---------- 错题本 ----------
  // 返回待改错列表:反查 PINYIN_DATA.WORDS 补齐 char;找不到的脏数据顺手清掉
  function getPendingMistakes() {
    const list = [];
    let dirty = false;
    for (const key of Object.keys(state.mistakes)) {
      const m = state.mistakes[key];
      const word = (window.PINYIN_DATA ? PINYIN_DATA.WORDS : []).find((w) => w.sound === key);
      if (!word) {
        delete state.mistakes[key];
        dirty = true;
        continue;
      }
      list.push({
        sound: key,
        char: word.char,
        pinyin: word.pinyin,
        wordRef: word,
        count: m.count || 0,
        last: m.last || "",
        added: m.added || m.last || "",
        type: m.type || "listen",
        py: m.py || word.pinyin,
      });
    }
    if (dirty) save();
    // 错次多、最近错的排前面
    list.sort((a, b) => (b.count - a.count) || (b.last > a.last ? 1 : -1));
    return list;
  }

  function mistakesCount() {
    return Object.keys(state.mistakes).length;
  }

  function clearAllMistakes() {
    state.mistakes = {};
    save();
    document.dispatchEvent(new CustomEvent("app:state-changed"));
    if (typeof window.renderAppHeader === "function") window.renderAppHeader();
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

  // ---------- 导出/导入(整个账号或全部) ----------
  // 导出:返回当前账号或所有账号数据的对象
  function exportData(scope) {
    if (scope === "all") {
      const all = {};
      PROFILES.forEach((p) => {
        try {
          const raw = localStorage.getItem(storageKeyFor(p.id));
          if (raw) all[p.id] = JSON.parse(raw);
        } catch (e) { /* ignore */ }
      });
      return { format: "pinyin-tool-backup-v1", scope: "all", exportedAt: new Date().toISOString(), profiles: all };
    }
    return { format: "pinyin-tool-backup-v1", scope: "current", exportedAt: new Date().toISOString(), profileId: currentProfile, data: JSON.parse(JSON.stringify(state)) };
  }
  // 导入:回填数据到 localStorage 并触发重渲
  function importData(json) {
    if (!json || json.format !== "pinyin-tool-backup-v1") throw new Error("文件格式不正确");
    if (json.scope === "all" && json.profiles) {
      Object.keys(json.profiles).forEach((pid) => {
        if (PROFILES.some((p) => p.id === pid)) {
          localStorage.setItem(storageKeyFor(pid), JSON.stringify(json.profiles[pid]));
        }
      });
    } else if (json.data) {
      const pid = json.profileId && PROFILES.some((p) => p.id === json.profileId) ? json.profileId : currentProfile;
      localStorage.setItem(storageKeyFor(pid), JSON.stringify(json.data));
    } else {
      throw new Error("文件内容为空");
    }
    // 重新加载当前 profile 的 state
    state = load();
    save(); // 触发 IDB 备份
    document.dispatchEvent(new CustomEvent("app:state-changed"));
    document.dispatchEvent(new CustomEvent("app:profile-changed", { detail: { profileId: currentProfile, restored: true } }));
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
    // 错题本
    getPendingMistakes,
    mistakesCount,
    clearAllMistakes,
    // 账号
    listProfiles,
    getCurrentProfile,
    switchProfile,
    // 备份/恢复
    exportData,
    importData,
    idbRestore,
    STORAGE_KEY: STORAGE_PREFIX,
  };
})();
