// tts.js — 发音封装
// 主流:MP3 音频库(audio/pinyin/*.mp3, 音源 agj/mp3-chinese-pinyin-sound, Unlicense)
// 备用:Web Speech API(speechSynthesis)——找不到 MP3 或音频报错时兜底

window.PinyinTTS = (function () {
  // ============ 拼音拼读知识表 ============
  // 声母呼读音 → { han: 汉字, sound: 拼音 sound }
  // sound 用于放对应 MP3;han 用于 speechSynthesis 兜底
  const INITIAL_HU = {
    b: { han: "玻", sound: "bo1" }, p: { han: "坡", sound: "po1" }, m: { han: "摸", sound: "mo1" }, f: { han: "佛", sound: "fo1" },
    d: { han: "得", sound: "de1" }, t: { han: "特", sound: "te1" }, n: { han: "讷", sound: "ne4" }, l: { han: "勒", sound: "le4" },
    g: { han: "哥", sound: "ge1" }, k: { han: "科", sound: "ke1" }, h: { han: "喝", sound: "he1" },
    j: { han: "基", sound: "ji1" }, q: { han: "欺", sound: "qi1" }, x: { han: "希", sound: "xi1" },
    zh: { han: "知", sound: "zhi1" }, ch: { han: "吃", sound: "chi1" }, sh: { han: "诗", sound: "shi1" }, r: { han: "日", sound: "ri4" },
    z: { han: "资", sound: "zi1" }, c: { han: "雌", sound: "ci1" }, s: { han: "思", sound: "si1" },
    y: { han: "衣", sound: "yi1" }, w: { han: "乌", sound: "wu1" },
  };
  const INITIAL_ORDER = ["zh", "ch", "sh", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "r", "z", "c", "s", "y", "w"];

  // 韵母带声调 → { han, sound } 用于拼读时播放"啊/衣/乌"等标准音
  // sound 直接用带声调的音节文件;音库缺失时(如 o1/eng1)fallback 用近似音
  const FINAL_TONE_HAN = {
    a: { 1: { han: "啊", sound: "a1" }, 2: { han: "啊", sound: "a2" }, 3: { han: "啊", sound: "a3" }, 4: { han: "啊", sound: "a4" } },
    o: { 1: { han: "喔", sound: "wo1" }, 2: { han: "哦", sound: "wo2" }, 3: { han: "哦", sound: "wo3" }, 4: { han: "哦", sound: "wo4" } },
    e: { 1: { han: "阿", sound: "e1" }, 2: { han: "鹅", sound: "e2" }, 3: { han: "恶", sound: "e3" }, 4: { han: "饿", sound: "e4" } },
    i: { 1: { han: "衣", sound: "yi1" }, 2: { han: "姨", sound: "yi2" }, 3: { han: "椅", sound: "yi3" }, 4: { han: "亿", sound: "yi4" } },
    u: { 1: { han: "乌", sound: "wu1" }, 2: { han: "无", sound: "wu2" }, 3: { han: "五", sound: "wu3" }, 4: { han: "物", sound: "wu4" } },
    ü: { 1: { han: "迂", sound: "yu1" }, 2: { han: "鱼", sound: "yu2" }, 3: { han: "雨", sound: "yu3" }, 4: { han: "玉", sound: "yu4" } },
    ai: { 1: { han: "哀", sound: "ai1" }, 2: { han: "挨", sound: "ai2" }, 3: { han: "矮", sound: "ai3" }, 4: { han: "爱", sound: "ai4" } },
    ei: { 1: { han: "诶", sound: "ei1" }, 2: { han: "诶", sound: "ei2" }, 3: { han: "诶", sound: "ei3" }, 4: { han: "诶", sound: "ei4" } },
    ui: { 1: { han: "威", sound: "wei1" }, 2: { han: "围", sound: "wei2" }, 3: { han: "委", sound: "wei3" }, 4: { han: "喂", sound: "wei4" } },
    ao: { 1: { han: "熬", sound: "ao1" }, 2: { han: "熬", sound: "ao2" }, 3: { han: "袄", sound: "ao3" }, 4: { han: "奥", sound: "ao4" } },
    ou: { 1: { han: "欧", sound: "ou1" }, 2: { han: "藕", sound: "ou2" }, 3: { han: "藕", sound: "ou3" }, 4: { han: "偶", sound: "ou4" } },
    iu: { 1: { han: "优", sound: "you1" }, 2: { han: "游", sound: "you2" }, 3: { han: "有", sound: "you3" }, 4: { han: "又", sound: "you4" } },
    ie: { 1: { han: "耶", sound: "ye1" }, 2: { han: "爷", sound: "ye2" }, 3: { han: "也", sound: "ye3" }, 4: { han: "夜", sound: "ye4" } },
    üe: { 1: { han: "约", sound: "yue1" }, 2: { han: "岳", sound: "yue2" }, 3: { han: "月", sound: "yue3" }, 4: { han: "悦", sound: "yue4" } },
    ua: { 1: { han: "哇", sound: "wa1" }, 2: { han: "娃", sound: "wa2" }, 3: { han: "瓦", sound: "wa3" }, 4: { han: "袜", sound: "wa4" } },
    uo: { 1: { han: "窝", sound: "wo1" }, 2: { han: "我", sound: "wo2" }, 3: { han: "我", sound: "wo3" }, 4: { han: "握", sound: "wo4" } },
    ia: { 1: { han: "呀", sound: "ya1" }, 2: { han: "牙", sound: "ya2" }, 3: { han: "雅", sound: "ya3" }, 4: { han: "亚", sound: "ya4" } },
    iao: { 1: { han: "腰", sound: "yao1" }, 2: { han: "摇", sound: "yao2" }, 3: { han: "咬", sound: "yao3" }, 4: { han: "要", sound: "yao4" } },
    an: { 1: { han: "安", sound: "an1" }, 2: { han: "俺", sound: "an2" }, 3: { han: "俺", sound: "an3" }, 4: { han: "暗", sound: "an4" } },
    en: { 1: { han: "恩", sound: "en1" }, 2: { han: "嗯", sound: "en2" }, 3: { han: "嗯", sound: "en3" }, 4: { han: "嗯", sound: "en4" } },
    in: { 1: { han: "音", sound: "yin1" }, 2: { han: "银", sound: "yin2" }, 3: { han: "引", sound: "yin3" }, 4: { han: "印", sound: "yin4" } },
    un: { 1: { han: "温", sound: "wen1" }, 2: { han: "文", sound: "wen2" }, 3: { han: "吻", sound: "wen3" }, 4: { han: "问", sound: "wen4" } },
    ün: { 1: { han: "晕", sound: "yun1" }, 2: { han: "云", sound: "yun2" }, 3: { han: "允", sound: "yun3" }, 4: { han: "运", sound: "yun4" } },
    üan: { 1: { han: "冤", sound: "yuan1" }, 2: { han: "元", sound: "yuan2" }, 3: { han: "远", sound: "yuan3" }, 4: { han: "愿", sound: "yuan4" } },
    ang: { 1: { han: "肮", sound: "ang1" }, 2: { han: "昂", sound: "ang2" }, 3: { han: "昂", sound: "ang3" }, 4: { han: "盎", sound: "ang4" } },
    eng: { 1: { han: "鞥", sound: "beng1" }, 2: { han: "鞥", sound: "beng2" }, 3: { han: "鞥", sound: "beng3" }, 4: { han: "鞥", sound: "beng4" } },
    ing: { 1: { han: "英", sound: "ying1" }, 2: { han: "迎", sound: "ying2" }, 3: { han: "影", sound: "ying3" }, 4: { han: "应", sound: "ying4" } },
    ong: { 1: { han: "翁", sound: "dong1" }, 2: { han: "嗡", sound: "dong2" }, 3: { han: "翁", sound: "dong3" }, 4: { han: "瓮", sound: "dong4" } },
    uan: { 1: { han: "弯", sound: "wan1" }, 2: { han: "完", sound: "wan2" }, 3: { han: "晚", sound: "wan3" }, 4: { han: "万", sound: "wan4" } },
    uang: { 1: { han: "汪", sound: "wang1" }, 2: { han: "王", sound: "wang2" }, 3: { han: "网", sound: "wang3" }, 4: { han: "望", sound: "wang4" } },
    iong: { 1: { han: "雍", sound: "yong1" }, 2: { han: "庸", sound: "yong2" }, 3: { han: "永", sound: "yong3" }, 4: { han: "用", sound: "yong4" } },
    ian: { 1: { han: "烟", sound: "yan1" }, 2: { han: "盐", sound: "yan2" }, 3: { han: "眼", sound: "yan3" }, 4: { han: "燕", sound: "yan4" } },
    iang: { 1: { han: "央", sound: "yang1" }, 2: { han: "羊", sound: "yang2" }, 3: { han: "养", sound: "yang3" }, 4: { han: "样", sound: "yang4" } },
    uai: { 1: { han: "歪", sound: "wai1" }, 2: { han: "崴", sound: "wai2" }, 3: { han: "崴", sound: "wai3" }, 4: { han: "外", sound: "wai4" } },
  };

  // ============ MP3 播放 ============
  const AUDIO_BASE = "audio/pinyin/";
  // 把项目 sound(如 lv3) 映射到音库文件名(luu3):v→uu,ü→uu
  function soundToFile(sound) {
    return String(sound).replace(/ü/g, "uu").replace(/v/g, "uu");
  }
  function mp3Url(sound) {
    return `${AUDIO_BASE}${soundToFile(sound)}.mp3`;
  }

  // 缓存 Audio 对象,减少重复创建
  const audioCache = new Map();
  function getAudio(sound) {
    const url = mp3Url(sound);
    let a = audioCache.get(url);
    if (!a) {
      a = new Audio(url);
      a.preload = "auto";
      audioCache.set(url, a);
    }
    return a;
  }

  // 全局播放状态:切题时用来打断上一次尚未播完的音频
  let _currentAudio = null;
  let _sequenceToken = 0; // 每次开始新序列 +1;链条中途检测到 token 变化就 abort

  // 停掉一切当前正在发声的东西(MP3 + speechSynthesis)
  function stopAll() {
    if (_currentAudio) {
      try { _currentAudio.pause(); _currentAudio.currentTime = 0; } catch (e) {}
      _currentAudio = null;
    }
    if ("speechSynthesis" in window) {
      try { speechSynthesis.cancel(); } catch (e) {}
    }
    // 让所有在飞的 playSequence 链感知到 token 变化,提前退出
    _sequenceToken++;
  }

  // 播放单个 MP3;失败时 reject
  function playMp3(sound) {
    return new Promise((resolve, reject) => {
      // 关键:先停掉上一个正在播的
      if (_currentAudio && _currentAudio !== getAudio(sound)) {
        try { _currentAudio.pause(); _currentAudio.currentTime = 0; } catch (e) {}
      }
      const a = getAudio(sound);
      _currentAudio = a;
      a.currentTime = 0;
      const cleanup = () => {
        a.removeEventListener("ended", done);
        a.removeEventListener("error", fail);
        if (_currentAudio === a) _currentAudio = null;
      };
      const done = () => { cleanup(); resolve(); };
      const fail = (e) => { cleanup(); reject(e); };
      a.addEventListener("ended", done, { once: true });
      a.addEventListener("error", fail, { once: true });
      const p = a.play();
      if (p && p.catch) p.catch(fail);
    });
  }

  // 播放一段 MP3,失败自动回退到 speechSynthesis 读汉字
  function playSyllableWithFallback(sound, han, rate) {
    return playMp3(sound).catch(() => speakSingle(han || sound, rate));
  }

  // 顺序播放多个音节(声母呼读→韵母带调→完整字):MP3 优先,失败逐个 fallback
  // 段间 gap 用 setTimeout 控制,避免 iOS 上多个 audio 排队被吞
  // 中途若 stopAll() 被调用(_sequenceToken 变化),链条会提前退出
  function playSequence(items, rate = 1.0, gap = 120) {
    stopAll(); // 每次新序列开始前先把旧的停掉
    const myToken = _sequenceToken;
    const alive = () => myToken === _sequenceToken;
    let chain = Promise.resolve();
    items.forEach((item, i) => {
      chain = chain.then(() => { if (!alive()) return; return playSyllableWithFallback(item.sound, item.han, rate); });
      if (i < items.length - 1) {
        chain = chain.then(() => new Promise((r) => setTimeout(r, gap))).then(() => { if (!alive()) throw new Error("cancelled"); });
      }
    });
    return chain.catch((e) => { if (e && e.message !== "cancelled") throw e; });
  }

  // ============ Web Speech API 兜底 ============
  function pickZhVoice() {
    const voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    return voices.find((v) => (v.lang || "").toLowerCase().startsWith("zh-cn")) || null;
  }

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
    el.textContent = "TTS: (等待)";
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
    el.textContent = `MP3 音库(fallback: ${(pickZhVoice() || {}).name || "浏览器默认"})`;
    el.style.background = "rgba(20,120,40,.85)";
  }

  function speakSingle(text, rate = 0.8, onend) {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) {
        if (onend) onend();
        return resolve();
      }
      init();
      waitForVoices(() => {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "zh-CN";
        u.rate = rate;
        u.pitch = 1;
        const v = pickZhVoice();
        if (v) u.voice = v;
        const done = () => { if (onend) onend(); resolve(); };
        u.onend = done;
        u.onerror = done;
        speechSynthesis.speak(u);
      });
    });
  }

  function init() {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.getVoices();
    if (debugEnabledByURL()) {
      const attach = () => showDebugBadge();
      if (document.body) attach();
      else document.addEventListener("DOMContentLoaded", attach, { once: true });
    }
  }

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
        if (ini === "y" || ini === "w") return { initial: null, final: base };
        return { initial: ini, final: base.slice(ini.length) };
      }
    }
    return { initial: null, final: base };
  }

  // ============ 对外 API ============
  // 直接播一个汉字音节(单音):优先 MP3,失败读汉字
  function speak(text, rate = 0.8, onend) {
    stopAll();
    // 如果 text 是 sound(如 ba1),直接播 MP3
    if (/^[a-züv]+[1-5]?$/i.test(text)) {
      return playSyllableWithFallback(text, null, rate).then(() => onend && onend());
    }
    // 否则走 TTS
    return speakSingle(text, rate, onend);
  }

  // 拼读一个汉字音节:声母呼读音 → 韵母带调 → 完整字(三段)
  // 例:爸 ba1  →  bo1(玻) + a4(啊) + ba4(爸)
  // 用于学习场景;练习/错题请用 speakChar(单段)
  function spellWord(char, sound, rate = 1.0) {
    const toneMatch = String(sound).match(/(\d)$/);
    const tone = toneMatch ? Number(toneMatch[1]) : 1;
    const { initial, final } = splitSyllable(sound);

    const items = [];
    if (initial && INITIAL_HU[initial]) items.push(INITIAL_HU[initial]);
    if (final) {
      const fh = FINAL_TONE_HAN[final] && FINAL_TONE_HAN[final][tone];
      if (fh) items.push(fh);
    }
    // 完整字:sound 就是原样,han 就是 char
    if (!items.some((x) => x.sound === sound)) items.push({ sound, han: char });
    return playSequence(items, rate);
  }

  // 只播完整字单段;练习/错题场景用,不做拼读分段
  function speakChar(char, sound, rate = 1.0) {
    stopAll(); // 打断上一次未播完的音频
    return playSyllableWithFallback(sound, char, rate);
  }

  // 学习卡片朗读:
  //   initial → 声母呼读音 + 例字
  //   final   → 韵母带调音 + 例字
  //   whole   → y/w 呼读音 + 剩余韵母字母名 + 完整例字
  function speakPinyin(sound, type, example, rate = 1.0) {
    const exHan = pickFirstHan(example);
    const exSound = pickSoundFromExample(example) || sound;
    const toneMatch = String(sound).match(/(\d)$/);
    const tone = toneMatch ? Number(toneMatch[1]) : 1;
    const { initial, final } = splitSyllable(sound);

    if (type === "initial") {
      const hu = initial && INITIAL_HU[initial] ? INITIAL_HU[initial] : (final ? INITIAL_HU[final] : null);
      const items = [];
      if (hu) items.push(hu);
      if (exHan) items.push({ sound: exSound, han: exHan });
      return playSequence(items, rate);
    }
    if (type === "final") {
      // eng/ong/o/ing 等韵母无法独立成音节,只播例字避免误导;
      //   ing 独立时读 "英"(有),o 独立几乎无字,eng/ong 无独立字
      const NO_STANDALONE_SYLLABLE = new Set(["o", "eng", "ong"]);
      const items = [];
      if (!NO_STANDALONE_SYLLABLE.has(final)) {
        const fh = FINAL_TONE_HAN[final] && FINAL_TONE_HAN[final][tone];
        if (fh) items.push(fh); else items.push({ sound, han: final });
      }
      if (exHan) items.push({ sound: exSound, han: exHan });
      return playSequence(items, rate);
    }
    // whole 整体认读:三段
    const yToUmlaut = { u: "ü", ue: "üe", uan: "üan", un: "ün" };
    const items = [];
    let leader = null;
    let restFinal = final;
    if (final && final[0] === "y") {
      leader = INITIAL_HU["y"];
      restFinal = final.slice(1);
      if (yToUmlaut[restFinal]) restFinal = yToUmlaut[restFinal];
    } else if (final && final[0] === "w") {
      leader = INITIAL_HU["w"];
      restFinal = final.slice(1);
    }
    if (leader) items.push(leader);
    if (restFinal) {
      const fh = FINAL_TONE_HAN[restFinal] && FINAL_TONE_HAN[restFinal][1];
      if (fh) items.push(fh);
    }
    if (exHan) items.push({ sound: exSound, han: exHan });
    return playSequence(items, rate);
  }

  function pickFirstHan(example) {
    if (!example) return null;
    const m = example.match(/\p{Script=Han}/u);
    return m ? m[0] : null;
  }
  // 从 "爸 bà" 里没法直接拿数字 sound;example 里通常只有汉字+带调拼音,交给 caller 传原 sound 就够
  function pickSoundFromExample(example) { return null; }

  function supported() {
    return "speechSynthesis" in window || typeof Audio !== "undefined";
  }

  init();

  return { speak, speakPinyin, spellWord, speakChar, stop: stopAll, supported, init, showDebug: showDebugBadge, hideDebug: hideDebugBadge };
})();
