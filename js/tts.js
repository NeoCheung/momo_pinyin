// tts.js — 发音封装（Web Speech API）
// 兼容 iOS Safari 中文 TTS，规避 iOS 常见坑

window.PinyinTTS = (function () {
  let initialized = false;

  // 获取中文语音
  function getZhVoice() {
    const voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    return (
      voices.find((v) => v.lang === "zh-CN") ||
      voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("zh")) ||
      null
    );
  }

  // 唤醒语音引擎（iOS 首次可能无声）
  function init() {
    if (initialized) return;
    if (!("speechSynthesis" in window)) return;
    // 触发 voiceschanged 以确保语音列表加载
    speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = function () {
      speechSynthesis.getVoices();
    };
    initialized = true;
  }

  /**
   * 朗读一段文本（中文）
   * @param {string} text 要朗读的文本
   * @param {number} rate 语速，默认 0.8（儿童友好偏慢）
   * @param {Function} onend 朗读结束回调
   */
  function speak(text, rate = 0.8, onend) {
    if (!("speechSynthesis" in window)) {
      console.warn("当前环境不支持语音合成");
      if (onend) onend();
      return;
    }
    init();
    // 打断上一次朗读，避免叠加
    speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN";
    const voice = getZhVoice();
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = 1;
    if (onend) {
      u.onend = onend;
      u.onerror = onend;
    }
    speechSynthesis.speak(u);
  }

  // 支持与否
  function supported() {
    return "speechSynthesis" in window;
  }

  // 初始化时预留一个空朗读唤醒（iOS 需要用户手势后才行，这里尽力而为）
  init();

  return { speak, supported, init };
})();
