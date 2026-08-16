// tts.js — 发音封装（Web Speech API，普通话）
// 使用建议:请用 Safari 打开。Chrome for macOS 存在中文 voice 绑定 bug,
// 会把 zh-CN 语音渲染成粤语,与本代码逻辑无关。

window.PinyinTTS = (function () {
  // ============ 拼音拼读知识表 ============
  const INITIAL_HU = {
    b: "玻", p: "坡", m: "摸", f: "佛",
    d: "得", t: "特", n: "讷", l: "勒",
    g: "哥", k: "科", h: "喝",
    j: "基", q: "欺", x: "希",
    zh: "知", ch: "吃", sh: "诗", r: "日",
    z: "资", c: "雌", s: "思",
    y: "衣", w: "乌",
  };
  // 复合声母优先,避免把 zh 误拆成 z+h
  const INITIAL_ORDER = ["zh", "ch", "sh", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "r", "z", "c", "s", "y", "w"];

  const FINAL_TONE_HAN = {
    a: { 1: "啊", 2: "啊", 3: "啊", 4: "啊" },
    o: { 1: "喔", 2: "哦", 3: "哦", 4: "哦" },
    e: { 1: "阿", 2: "鹅", 3: "恶", 4: "饿" },
    i: { 1: "衣", 2: "姨", 3: "椅", 4: "亿" },
    u: { 1: "乌", 2: "无", 3: "五", 4: "物" },
    ü: { 1: "迂", 2: "鱼", 3: "雨", 4: "玉" },
    ai: { 1: "哀", 2: "挨", 3: "矮", 4: "爱" },
    ei: { 1: "诶", 2: "诶", 3: "诶", 4: "诶" },
    ui: { 1: "威", 2: "围", 3: "委", 4: "喂" },
    ao: { 1: "熬", 2: "熬", 3: "袄", 4: "奥" },
    ou: { 1: "欧", 2: "藕", 3: "藕", 4: "偶" },
    iu: { 1: "优", 2: "游", 3: "有", 4: "又" },
    ie: { 1: "耶", 2: "爷", 3: "也", 4: "夜" },
    üe: { 1: "约", 2: "岳", 3: "月", 4: "悦" },
    ua: { 1: "哇", 2: "娃", 3: "瓦", 4: "袜" },
    uo: { 1: "窝", 2: "我", 3: "我", 4: "握" },
    ia: { 1: "呀", 2: "牙", 3: "雅", 4: "亚" },
    iao: { 1: "腰", 2: "摇", 3: "咬", 4: "要" },
    an: { 1: "安", 2: "俺", 3: "俺", 4: "暗" },
    en: { 1: "恩", 2: "嗯", 3: "嗯", 4: "嗯" },
    in: { 1: "音", 2: "银", 3: "引", 4: "印" },
    un: { 1: "温", 2: "文", 3: "吻", 4: "问" },
    ün: { 1: "晕", 2: "云", 3: "允", 4: "运" },
    ang: { 1: "肮", 2: "昂", 3: "昂", 4: "盎" },
    eng: { 1: "鞥", 2: "嗯", 3: "嗯", 4: "嗯" },
    ing: { 1: "英", 2: "迎", 3: "影", 4: "应" },
    ong: { 1: "翁", 2: "嗡", 3: "翁", 4: "瓮" },
    uan: { 1: "弯", 2: "完", 3: "晚", 4: "万" },
    uang: { 1: "汪", 2: "王", 3: "网", 4: "望" },
    iong: { 1: "雍", 2: "庸", 3: "永", 4: "用" },
    ian: { 1: "烟", 2: "盐", 3: "眼", 4: "燕" },
    iang: { 1: "央", 2: "羊", 3: "养", 4: "样" },
    uai: { 1: "歪", 2: "崴", 3: "崴", 4: "外" },
  };

  // ============ 语音选择 ============
  // 只做一件事:找一个 zh-CN 的普通话语音。Safari/iOS 会自动挑到婷婷,不需要黑名单。
  function pickZhVoice() {
    const voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    return voices.find((v) => (v.lang || "").toLowerCase().startsWith("zh-cn")) || null;
  }

  // 页面右下角显示当前选中的语音,默认关闭。开启方式:
  //   1) URL 加 ?debug=tts        —— 例:https://...github.io?debug=tts
  //   2) Console 执行 PinyinTTS.showDebug()  —— 手动打开
  //   3) 再次执行 PinyinTTS.hideDebug()      —— 关闭
  let __debugOn = false;
  function debugEnabledByURL() {
    try {
      const u = new URL(window.location.href);
      return u.searchParams.get("debug") === "tts" || u.hash.includes("debug=tts");
    } catch (e) { return false; }
  }
  function showDebugBadge() {
    __debugOn = true;
    if (document.getElementById("__tts_badge")) return updateDebugBadge();
    const el = document.createElement("div");
    el.id = "__tts_badge";
    el.style.cssText = "position:fixed;right:8px;bottom:8px;z-index:99999;padding:6px 10px;background:rgba(0,0,0,.75);color:#fff;font:12px/1.4 -apple-system,sans-serif;border-radius:8px;max-width:70vw;pointer-events:auto;cursor:pointer;";
    el.textContent = "TTS: (等待语音就绪)";
    el.title = "点击关闭";
    el.addEventListener("click", hideDebugBadge);
    if (document.body) document.body.appendChild(el);
    else document.addEventListener("DOMContentLoaded", () => document.body.appendChild(el), { once: true });
    updateDebugBadge();
  }
  function hideDebugBadge() {
    __debugOn = false;
    const el = document.getElementById("__tts_badge");
    if (el) el.remove();
  }
  function updateDebugBadge() {
    const el = document.getElementById("__tts_badge");
    if (!el) return;
    const voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    const zhCN = voices.filter((v) => (v.lang || "").toLowerCase().startsWith("zh-cn"));
    const zhHK = voices.filter((v) => (v.lang || "").toLowerCase().startsWith("zh-hk"));
    const picked = pickZhVoice();
    if (picked) {
      el.textContent = `TTS ✓ ${picked.name} [${picked.lang}] | zh-CN:${zhCN.length} zh-HK:${zhHK.length}`;
      el.style.background = "rgba(20,120,40,.85)";
    } else if (zhHK.length && !zhCN.length) {
      el.textContent = `⚠️ 未装普通话!仅粤语 zh-HK×${zhHK.length}。设置→辅助功能→朗读内容→嗓音下载"婷婷"`;
      el.style.background = "rgba(180,30,30,.9)";
    } else {
      el.textContent = `⚠️ 未找到 zh-CN 语音 (共 ${voices.length} 个)`;
      el.style.background = "rgba(180,30,30,.9)";
    }
  }

  function init() {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.getVoices();
    // 只在 URL 显式要求时才自动挂徽章
    if (debugEnabledByURL()) {
      const attach = () => showDebugBadge();
      if (document.body) attach();
      else document.addEventListener("DOMContentLoaded", attach, { once: true });
    }
    if (!window.__voiceInitBound) {
      window.speechSynthesis.onvoiceschanged = function () {
        if (__debugOn) updateDebugBadge();
      };
      window.__voiceInitBound = true;
    }
  }

  // iOS Safari 首次 getVoices() 可能为空,等 voiceschanged 或超时兜底
  function waitForVoices(cb) {
    if (!("speechSynthesis" in window)) return cb();
    if (speechSynthesis.getVoices().length) return cb();
    let fired = false;
    const done = () => { if (!fired) { fired = true; cb(); } };
    speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1500);
  }

  // ============ 拼音拆解 ============
  function splitSyllable(base) {
    base = String(base).replace(/[0-9]/g, "").replace(/v/g, "ü");
    for (const ini of INITIAL_ORDER) {
      if (base.startsWith(ini) && base.length > ini.length) {
        // y/w 开头视为整体认读,零声母整体读
        if (ini === "y" || ini === "w") return { initial: null, final: base };
        return { initial: ini, final: base.slice(ini.length) };
      }
    }
    return { initial: null, final: base };
  }

  function pickFirstHan(example) {
    if (!example) return null;
    const m = example.match(/\p{Script=Han}/u);
    return m ? m[0] : null;
  }

  // ============ 核心朗读 ============
  function makeUtterance(text, rate) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN";
    u.rate = rate;
    u.pitch = 1;
    const v = pickZhVoice();
    if (v) u.voice = v;
    return u;
  }

  function speakSingle(text, rate, onend) {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) {
        if (onend) onend();
        return resolve();
      }
      init();
      waitForVoices(() => {
        speechSynthesis.cancel();
        const u = makeUtterance(text, rate);
        const done = () => { if (onend) onend(); resolve(); };
        u.onend = done;
        u.onerror = done;
        speechSynthesis.speak(u);
      });
    });
  }

  // 用顿号把多段拼到一个 utterance:iOS 对连续短 utterance 会读串,合并更稳
  function speakSegments(parts, rate) {
    return speakSingle(parts.join("、"), rate);
  }

  // 拼读一个汉字音节:声母呼读音 → 韵母带调 → 完整字 → 再完整读一遍
  function spellCharacter(char, sound, rate) {
    const toneMatch = String(sound).match(/(\d)$/);
    const tone = toneMatch ? Number(toneMatch[1]) : 1;
    const { initial, final } = splitSyllable(sound);

    const parts = [];
    if (initial && INITIAL_HU[initial]) parts.push(INITIAL_HU[initial]);
    if (final) {
      const han = FINAL_TONE_HAN[final] && FINAL_TONE_HAN[final][tone];
      if (han) parts.push(han);
    }
    if (final && !parts.includes(char)) parts.push(char);

    const processParts = parts.slice(0, -1);
    const speakProcess = processParts.length ? speakSegments(processParts, rate) : Promise.resolve();
    return speakProcess.then(
      () => new Promise((r) => setTimeout(() => r(speakSingle(char, rate)), 200))
    );
  }

  // ============ 对外 API ============
  function speak(text, rate = 0.8, onend) {
    speakSingle(text, rate, onend);
  }

  function spellWord(char, sound, rate = 0.8) {
    if (!("speechSynthesis" in window)) return Promise.resolve();
    init();
    return new Promise((resolve) => waitForVoices(() => resolve(spellCharacter(char, sound, rate))));
  }

  function speakPinyin(sound, type, example, rate = 0.8) {
    if (!("speechSynthesis" in window)) return Promise.resolve();
    init();
    return new Promise((resolve) => waitForVoices(() => {
      const toneMatch = String(sound).match(/(\d)$/);
      const tone = toneMatch ? Number(toneMatch[1]) : 1;
      const { initial, final } = splitSyllable(sound);

      if (type === "initial") {
        const hu = initial && INITIAL_HU[initial] ? INITIAL_HU[initial] : (final ? INITIAL_HU[final] : null);
        const parts = [];
        if (hu) parts.push(hu);
        const exHan = pickFirstHan(example);
        if (exHan && exHan !== hu) parts.push(exHan);
        resolve(speakSegments(parts, rate));
        return;
      }
      if (type === "final") {
        const han = FINAL_TONE_HAN[final] && FINAL_TONE_HAN[final][tone];
        const parts = [han || final];
        const exHan = pickFirstHan(example);
        if (exHan && exHan !== han) parts.push(exHan);
        resolve(speakSegments(parts, rate));
        return;
      }
      // whole:读完整音节(例字)
      resolve(speakSingle(pickFirstHan(example) || final, rate));
    }));
  }

  function supported() {
    return "speechSynthesis" in window;
  }

  init();

  return { speak, speakPinyin, spellWord, supported, init, showDebug: showDebugBadge, hideDebug: hideDebugBadge };
})();
