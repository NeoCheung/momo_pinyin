// pinyin-data.js — 汉语拼音知识库
// 每个条目 sound 字段用于喂给 TTS（无调号拼音 + 数字声调，绕过 iOS 对带调字符的误读）

window.PINYIN_DATA = (function () {
  // 声母
  const INITIALS = [
    { pinyin: "b", text: "b", example: "爸 bà", sound: "ba4" },
    { pinyin: "p", text: "p", example: "婆 pó", sound: "po2" },
    { pinyin: "m", text: "m", example: "妈 mā", sound: "ma1" },
    { pinyin: "f", text: "f", example: "发 fā", sound: "fa1" },
    { pinyin: "d", text: "d", example: "大 dà", sound: "da4" },
    { pinyin: "t", text: "t", example: "他 tā", sound: "ta1" },
    { pinyin: "n", text: "n", example: "你 nǐ", sound: "ni3" },
    { pinyin: "l", text: "l", example: "乐 lè", sound: "le4" },
    { pinyin: "g", text: "g", example: "哥 gē", sound: "ge1" },
    { pinyin: "k", text: "k", example: "卡 kǎ", sound: "ka3" },
    { pinyin: "h", text: "h", example: "花 huā", sound: "hua1" },
    { pinyin: "j", text: "j", example: "鸡 jī", sound: "ji1" },
    { pinyin: "q", text: "q", example: "七 qī", sound: "qi1" },
    { pinyin: "x", text: "x", example: "西 xī", sound: "xi1" },
    { pinyin: "zh", text: "zh", example: "猪 zhū", sound: "zhu1" },
    { pinyin: "ch", text: "ch", example: "吃 chī", sound: "chi1" },
    { pinyin: "sh", text: "sh", example: "书 shū", sound: "shu1" },
    { pinyin: "r", text: "r", example: "日 rì", sound: "ri4" },
    { pinyin: "z", text: "z", example: "字 zì", sound: "zi4" },
    { pinyin: "c", text: "c", example: "词 cí", sound: "ci2" },
    { pinyin: "s", text: "s", example: "四 sì", sound: "si4" },
    { pinyin: "y", text: "y", example: "一 yī", sound: "yi1" },
    { pinyin: "w", text: "w", example: "五 wǔ", sound: "wu3" },
  ];

  // 韵母
  const FINALS = [
    { pinyin: "a", text: "a", example: "啊 ā", sound: "a1" },
    { pinyin: "o", text: "o", example: "哦 ó", sound: "wo2" },
    { pinyin: "e", text: "e", example: "鹅 é", sound: "e2" },
    { pinyin: "i", text: "i", example: "衣 yī", sound: "yi1" },
    { pinyin: "u", text: "u", example: "乌 wū", sound: "wu1" },
    { pinyin: "ü", text: "ü", example: "鱼 yú", sound: "yu2" },
    { pinyin: "ai", text: "ai", example: "爱 ài", sound: "ai4" },
    { pinyin: "ei", text: "ei", example: "诶 ēi", sound: "ei1" },
    { pinyin: "ui", text: "ui", example: "水 shuǐ", sound: "shui3" },
    { pinyin: "ao", text: "ao", example: "猫 māo", sound: "mao1" },
    { pinyin: "ou", text: "ou", example: "欧 ōu", sound: "ou1" },
    { pinyin: "iu", text: "iu", example: "六 liù", sound: "liu4" },
    { pinyin: "ie", text: "ie", example: "蝶 dié", sound: "die2" },
    { pinyin: "üe", text: "üe", example: "月 yuè", sound: "yue4" },
    { pinyin: "er", text: "er", example: "儿 ér", sound: "er2" },
    { pinyin: "an", text: "an", example: "山 shān", sound: "shan1" },
    { pinyin: "en", text: "en", example: "人 rén", sound: "ren2" },
    { pinyin: "in", text: "in", example: "金 jīn", sound: "jin1" },
    { pinyin: "un", text: "un", example: "春 chūn", sound: "chun1" },
    { pinyin: "ün", text: "ün", example: "云 yún", sound: "yun2" },
    { pinyin: "ang", text: "ang", example: "羊 yáng", sound: "yang2" },
    { pinyin: "eng", text: "eng", example: "风 fēng", sound: "feng1" },
    { pinyin: "ing", text: "ing", example: "星 xīng", sound: "xing1" },
    { pinyin: "ong", text: "ong", example: "龙 lóng", sound: "long2" },
  ];

  // 整体认读音节
  const WHOLE = [
    { pinyin: "zhi", text: "zhi", example: "知 zhī", sound: "zhi1" },
    { pinyin: "chi", text: "chi", example: "吃 chī", sound: "chi1" },
    { pinyin: "shi", text: "shi", example: "师 shī", sound: "shi1" },
    { pinyin: "ri", text: "ri", example: "日 rì", sound: "ri4" },
    { pinyin: "zi", text: "zi", example: "字 zì", sound: "zi4" },
    { pinyin: "ci", text: "ci", example: "词 cí", sound: "ci2" },
    { pinyin: "si", text: "si", example: "思 sī", sound: "si1" },
    { pinyin: "yi", text: "yi", example: "衣 yī", sound: "yi1" },
    { pinyin: "wu", text: "wu", example: "五 wǔ", sound: "wu3" },
    { pinyin: "yu", text: "yu", example: "鱼 yú", sound: "yu2" },
    { pinyin: "ye", text: "ye", example: "叶 yè", sound: "ye4" },
    { pinyin: "yue", text: "yue", example: "月 yuè", sound: "yue4" },
    { pinyin: "yuan", text: "yuan", example: "圆 yuán", sound: "yuan2" },
    { pinyin: "yin", text: "yin", example: "音 yīn", sound: "yin1" },
    { pinyin: "yun", text: "yun", example: "云 yún", sound: "yun2" },
    { pinyin: "ying", text: "ying", example: "英 yīng", sound: "ying1" },
  ];

  // 常用汉字（用于拼读/游戏练习的例字）
  // { char, pinyin(tone-marked display), sound(tts) }
  const WORDS = [
    { char: "八", pinyin: "bā", sound: "ba1" },
    { char: "爸", pinyin: "bà", sound: "ba4" },
    { char: "妈", pinyin: "mā", sound: "ma1" },
    { char: "大", pinyin: "dà", sound: "da4" },
    { char: "他", pinyin: "tā", sound: "ta1" },
    { char: "你", pinyin: "nǐ", sound: "ni3" },
    { char: "我", pinyin: "wǒ", sound: "wo3" },
    { char: "一", pinyin: "yī", sound: "yi1" },
    { char: "二", pinyin: "èr", sound: "er4" },
    { char: "三", pinyin: "sān", sound: "san1" },
    { char: "四", pinyin: "sì", sound: "si4" },
    { char: "五", pinyin: "wǔ", sound: "wu3" },
    { char: "六", pinyin: "liù", sound: "liu4" },
    { char: "七", pinyin: "qī", sound: "qi1" },
    { char: "九", pinyin: "jiǔ", sound: "jiu3" },
    { char: "山", pinyin: "shān", sound: "shan1" },
    { char: "水", pinyin: "shuǐ", sound: "shui3" },
    { char: "花", pinyin: "huā", sound: "hua1" },
    { char: "鸟", pinyin: "niǎo", sound: "niao3" },
    { char: "鱼", pinyin: "yú", sound: "yu2" },
    { char: "月", pinyin: "yuè", sound: "yue4" },
    { char: "日", pinyin: "rì", sound: "ri4" },
    { char: "天", pinyin: "tiān", sound: "tian1" },
    { char: "地", pinyin: "dì", sound: "di4" },
    { char: "虫", pinyin: "chóng", sound: "chong2" },
    { char: "绿", pinyin: "lǜ", sound: "lv4" },
    { char: "书", pinyin: "shū", sound: "shu1" },
    { char: "笔", pinyin: "bǐ", sound: "bi3" },
    { char: "猫", pinyin: "māo", sound: "mao1" },
    { char: "狗", pinyin: "gǒu", sound: "gou3" },
    { char: "牛", pinyin: "niú", sound: "niu2" },
    { char: "羊", pinyin: "yáng", sound: "yang2" },
    { char: "龙", pinyin: "lóng", sound: "long2" },
    { char: "风", pinyin: "fēng", sound: "feng1" },
    { char: "云", pinyin: "yún", sound: "yun2" },
    { char: "星", pinyin: "xīng", sound: "xing1" },
  ];

  // 四声
  const TONES = [
    { tone: 1, name: "一声", desc: "平", mark: "¯", display: "ā" },
    { tone: 2, name: "二声", desc: "升", mark: "ˊ", display: "á" },
    { tone: 3, name: "三声", desc: "拐", mark: "ˇ", display: "ǎ" },
    { tone: 4, name: "四声", desc: "降", mark: "ˋ", display: "à" },
  ];

  return {
    INITIALS,
    FINALS,
    WHOLE,
    WORDS,
    TONES,
    // 所有可点击学习的条目
    ALL: { INITIALS, FINALS, WHOLE },
  };
})();
