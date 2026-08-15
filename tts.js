// tts.js — 发音封装（Web Speech API）
// 兼容 iOS Safari 中文 TTS，规避 iOS 常见坑

window.PinyinTTS = (function () {
  // ============ 拼音拼读知识表 ============
  // 声母呼读音（用汉字发声，Web Speech 读汉字最准，且不依赖拼音识别）
  const INITIAL_HU = {
    b: "玻", p: "坡", m: "摸", f: "佛",
    d: "得", t: "特", n: "讷", l: "勒",
    g: "哥", k: "科", h: "喝",
    j: "基", q: "欺", x: "希",
    zh: "知", ch: "吃", sh: "诗", r: "日",
    z: "资", c: "雌", s: "思",
    y: "衣", w: "乌",
  };
  // 声母拆解顺序（复合声母 zh/ch/sh 优先，避免误拆成 z+h）
  const INITIAL_ORDER = ["zh", "ch", "sh", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "r", "z", "c", "s", "y", "w"];

  // 韵母带声调 → 代表汉字（用于拼读出韵母的标准音）
  // 只维护常见且声调明确的基础韵母；查不到时回退读 example 首字或韵母本身。
  // 带介音韵母（ua/uo/iao/ian...）也尽量维护，避免把韵母当英文字母读。
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

  // 从拼音音节中拆出声母（用于拼读示范）。返回 { initial, final }；零声母时 initial 为 null。
  function splitSyllable(base) {
    base = String(base).replace(/[0-9]/g, ""); // 去掉数字声调
    base = base.replace(/v/g, "ü"); // lv/nv 的 v 归一化为 ü
    for (const ini of INITIAL_ORDER) {
      if (base.startsWith(ini) && base.length > ini.length) {
        // 特例：完整 y/w 开头的整体认读音节（yi/wu/yu/ye/yue...）归零声母整体读
        if (ini === "y" || ini === "w") {
          return { initial: null, final: base };
        }
        return { initial: ini, final: base.slice(ini.length) };
      }
    }
    return { initial: null, final: base };
  }

  /**
   * 逐一连续朗读（模拟拼读过程，一段接一段）
   * 在 onend 里串起下一段，保证顺序且不被打断成同一个 utterance。
   */
  function speakSequence(parts, rate, tone) {
    return new Promise((resolve) => {
      speechSynthesis.cancel();
      let i = 0;
      const play = () => {
        if (i >= parts.length) return resolve();
        const seg = new SpeechSynthesisUtterance(parts[i]);
        seg.lang = "zh-CN";
        const v = getZhVoice();
        if (v) seg.voice = v;
        seg.rate = rate;
        seg.pitch = tone === 3 ? 1.05 : 1; // 三声稍微上扬，辅助
        seg.onend = () => {
          i++;
          // 段与段之间留 150ms 停顿，听清拼读过程
          setTimeout(play, i >= parts.length ? 0 : 150);
        };
        seg.onerror = () => {
          i++;
          setTimeout(play, 150);
        };
        speechSynthesis.speak(seg);
      };
      play();
    });
  }

  // 拼读一个完整汉字音节：声母呼读 → 韵母带调 → 完整汉字，再一次完整（方案③）
  // 返回 Promise，全部播完 resolve
  function spellCharacter(char, sound, rate) {
    const toneMatch = String(sound).match(/(\d)$/);
    const tone = toneMatch ? Number(toneMatch[1]) : 1;
    const { initial, final } = splitSyllable(sound);

    const parts = [];
    // 1) 声母呼读音（如有）
    if (initial && INITIAL_HU[initial]) parts.push(INITIAL_HU[initial]);
    // 2) 韵母带调（如有且能映射到汉字）——查不到时跳过，避免读拼音字母
    if (final) {
      const han = FINAL_TONE_HAN[final] && FINAL_TONE_HAN[final][tone];
      if (han) parts.push(han);
    }
    // 3) 完整汉字（拼到一起）。若上面没有任何拼读段（如整体认读音节），也保证读一遍 char
    if (final && !parts.some((p) => p === char)) parts.push(char);

    // 拼读过程 = 除最后完整段以外的段；最后再完整读一遍汉字
    const processParts = parts.slice(0, parts.length - 1);
    const speakProcess = processParts.length
      ? speakSequence(processParts, rate, tone)
      : Promise.resolve();
    return speakProcess.then(() => speakSingle(char, rate));
  }

  // 单段朗读（内部复用），返回 Promise，朗读结束 resolve
  function speakSingle(text, rate, onend) {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) {
        if (onend) onend();
        return resolve();
      }
      init();
      const doIt = () => {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "zh-CN";
        const nong = getZhVoice();
        if (nong) u.voice = nong;
        u.rate = rate;
        u.pitch = 1;
        const done = () => {
          if (onend) onend();
          resolve();
        };
        u.onend = done;
        u.onerror = done;
        speechSynthesis.speak(u);
      };
      if (getZhVoice()) doIt();
      else waitForVoices(() => doIt());
    });
  }

  // 获取中文普通话语音
  // 注意：必须严格限定普通话 zh-CN，不能回退到 zh-HK（粤语）/ zh-TW（台湾）。
  // iOS/iPad 上 getVoices() 可能只有 zh-HK，若直接回退会导致读出粤语。
  function getZhVoice() {
    const voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    const lower = (v) => (v && v.lang ? v.lang.toLowerCase() : "");

    // 明确排除粤语/台湾口音，只匹配普通话 zh-CN
    const isCantonese = (v) => lower(v).includes("hk") || lower(v).includes("cantonese");
    const isMainland = (v) => lower(v) === "zh-cn" || lower(v).includes("zh-cn");

    // 1) 优先：精确 zh-CN（普通话）
    let voice =
      voices.find((v) => isMainland(v) && !isCantonese(v)) ||
      // 2) 次优先：zh 且非粤语/非港/非台
      voices.find((v) => lower(v).startsWith("zh") && !isCantonese(v) && !lower(v).includes("tw") && !lower(v).includes("hant"));

    if (!voice) {
      // 3) 兜底：在 zh 语音中选一个明确非粤语的（最后手段）
      const zhVoices = voices.filter((v) => lower(v).startsWith("zh"));
      voice = zhVoices.find((v) => !isCantonese(v)) || null;
    }
    return voice;
  }

  // 等待语音列表加载完成（iOS 首次 getVoices() 可能为空，需等 voiceschanged）
  function waitForVoices(cb, attempts = 10) {
    if (getZhVoice()) return cb(true);
    if (attempts <= 0) return cb(false);
    let waited = 0;
    const tryOnce = () => {
      if (getZhVoice() || waited >= 1200) {
        cb(!!getZhVoice());
      } else {
        waited += 100;
        setTimeout(tryOnce, 100);
      }
    };
    tryOnce();
  }

  // 唤醒语音引擎（iOS 首次可能无声）
  function init() {
    if (!("speechSynthesis" in window)) return;
    // 主动触发加载，并监听 voiceschanged 确保语音列表就绪
    speechSynthesis.getVoices();
    if (!window.__voiceInitBound) {
      window.speechSynthesis.onvoiceschanged = function () {
        speechSynthesis.getVoices();
      };
      window.__voiceInitBound = true;
    }
  }

  /**
   * 朗读一段文本（中文，普通话）——兼容原有调用
   * @param {string} text 要朗读的文本
   * @param {number} rate 语速，默认 0.8
   * @param {Function} onend 朗读结束回调
   */
  function speak(text, rate = 0.8, onend) {
    speakSingle(text, rate, onend);
  }

  /**
   * 拼读一个汉字音节（方案③：先拼读过程，再读完整音节）
   * 例：spellWord("八", "ba1") → 玻 → 啊 → 八（过程）→ 八（完整）
   * @param {string} char 汉字
   * @param {string} sound 音节的 sound 字段（如 ba1、hua1）
   * @param {number} rate 语速
   */
  function spellWord(char, sound, rate = 0.8) {
    if (!("speechSynthesis" in window)) return Promise.resolve();
    init();
    if (getZhVoice()) {
      return spellCharacter(char, sound, rate);
    }
    return new Promise((resolve) => waitForVoices(() => resolve(spellCharacter(char, sound, rate))));
  }

  /**
   * 拼读声母/韵母/整体认读卡片。
   * type: 'initial' | 'final' | 'whole'
   * - initial(声母卡片)：读呼读音 → 例字
   * - final(韵母卡片)：读韵母标准音（带调）
   * - whole(整体认读)：读整体音节完整
   */
  function speakPinyin(sound, type, example, rate = 0.8) {
    if (!("speechSynthesis" in window)) return Promise.resolve();
    init();
    const run = () => {
      const toneMatch = String(sound).match(/(\d)$/);
      const tone = toneMatch ? Number(toneMatch[1]) : 1;
      const { initial, final } = splitSyllable(sound);

      if (type === "initial") {
        // 声母：呼读音 + 例字（example 首字），示范该声母的发音
        const hu = initial && INITIAL_HU[initial] ? INITIAL_HU[initial] : (final ? INITIAL_HU[final] : null);
        const parts = [];
        if (hu) parts.push(hu);
        const exHan = pickFirstHan(example);
        if (exHan && exHan !== hu) parts.push(exHan);
        return speakSequence(parts, rate, tone);
      }
      if (type === "final") {
        // 韵母：直接读韵母带调标准音；有例字则补一个例字
        const han = FINAL_TONE_HAN[final] && FINAL_TONE_HAN[final][tone];
        const parts = [];
        if (han) parts.push(han);
        else parts.push(final);
        const exHan = pickFirstHan(example);
        if (exHan && exHan !== han) parts.push(exHan);
        return speakSequence(parts, rate, tone);
      }
      // whole / 默认：读完整音节（例字）
      const exHan = pickFirstHan(example) || final;
      return speakSingle(exHan, rate);
    };
    if (getZhVoice()) return run();
    return new Promise((resolve) => waitForVoices(() => resolve(run())));
  }

  // 从 example 形如 "爸 bà" 的文本中取第一个汉字
  function pickFirstHan(example) {
    if (!example) return null;
    const m = example.match(/\p{Script=Han}/u);
    return m ? m[0] : null;
  }

  // 支持与否
  function supported() {
    return "speechSynthesis" in window;
  }

  // 初始化时预留一个空朗读唤醒（iOS 需要用户手势后才行，这里尽力而为）
  init();

  return { speak, speakPinyin, spellWord, supported, init };
})();
