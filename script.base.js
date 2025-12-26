// ==============================
// Safe Helpers
// ==============================
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ==============================
// Mobile Menu
// ==============================
(() => {
  const toggle = $(".header__toggle");
  const nav = $(".header__nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  // メニュー内リンククリックで閉じる（#リンクのみ）
  nav.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link) return;

    const href = link.getAttribute("href") || "";
    if (!href.startsWith("#")) return;

    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  });
})();

// ==============================
// FAQ Accordion
// ==============================
(() => {
  const faqItems = $$(".faq__item");
  if (!faqItems.length) return;

  faqItems.forEach((item) => {
    const q = $(".faq__q", item);
    if (!q) return;

    q.addEventListener("click", () => {
      const isOpen = item.classList.toggle("is-open");
      q.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  });
})();

// ==============================
// ==============================
// GA4 Event Tracking（イベントデリゲート）
// - 追加されたボタン/棚（variant）も漏れなく拾う
// - schema: data-event / data-event-label / data-event-loc（label/locは未指定なら自動推定）
// ==============================
(() => {
  const PAGE_ID = document.body?.dataset?.pageId || "";

  const inferLoc = (el) => {
    const sec = el.closest("[data-section], section, main, header, footer");
    if (!sec) return window.location.pathname || "";
    return sec.getAttribute("data-section") || sec.id || sec.className || window.location.pathname || "";
  };

  const inferLabel = (el) => {
    return (
      el.dataset.eventLabel ||
      el.dataset.label ||
      el.getAttribute("aria-label") ||
      el.getAttribute("href") ||
      (el.textContent || "").trim().slice(0, 60) ||
      window.location.pathname
    );
  };

  const track = (name, el) => {
    if (typeof gtag !== "function" || !name) return;

    const label = inferLabel(el);
    const loc = el.dataset.eventLoc || inferLoc(el);

    gtag("event", name, {
      event_category: "lp",
      event_label: label,
      event_loc: loc,
      page_id: PAGE_ID,
    });
  };

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-event], a, button");
    if (!el) return;

    // 1) 明示イベント
    const name = el.dataset && el.dataset.event;
    if (name) track(name, el);

    // 2) 必須イベント（hrefから自動付与）
    const href = (el.getAttribute && el.getAttribute("href")) || "";
    if (href.startsWith("tel:")) track("click_tel", el);
    if (/line\.me|lin\.ee/i.test(href)) track("click_line", el);
  });
})();




// ==============================
// Contact Form Submit（固定版）
// - anti double submit
// - minimal validation
// - honeypot
// - UA send
// - timeout (AbortController)
// ==============================
const GA_MEASUREMENT_ID = "{{GA_MEASUREMENT_ID}}";

// GA4 client_id を取得してGASへ渡す（広告流入→CVの紐付けを切らない）
// - 1st: gtag('get', MEASUREMENT_ID, 'client_id', cb)
// - 2nd: _ga cookie fallback（gtag未準備/ブロック時の保険）
const readGaClientIdFromCookie = () => {
  try {
    const m = document.cookie.match(/(?:^|; )_ga=([^;]+)/);
    if (!m) return "";
    const v = decodeURIComponent(m[1]);
    const parts = v.split(".");
    // GA1.1.1234567890.1234567890 -> 1234567890.1234567890
    if (parts.length >= 4 && /^\d+$/.test(parts[2]) && /^\d+$/.test(parts[3])) {
      return `${parts[2]}.${parts[3]}`;
    }
    const last2 = parts.slice(-2);
    if (last2.length === 2 && last2.every((x) => /^\d+$/.test(x))) {
      return `${last2[0]}.${last2[1]}`;
    }
    return "";
  } catch (_) {
    return "";
  }
};

const getGaClientId = (timeoutMs = 1500) => {
  return new Promise((resolve) => {
    const cookieCid = readGaClientIdFromCookie();

    if (typeof gtag !== "function" || !GA_MEASUREMENT_ID) return resolve(cookieCid);

    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      resolve(cookieCid);
    }, timeoutMs);

    try {
      gtag("get", GA_MEASUREMENT_ID, "client_id", (cid) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(cid || cookieCid || "");
      });
    } catch (e) {
      clearTimeout(timer);
      resolve(cookieCid);
    }
  });
};

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  if (!form) return;

  // 多重バインド防止
  if (form.dataset.bound === "1") return;
  form.dataset.bound = "1";

  // ▼案件ごとにここだけ差し替え
  const scriptURL =
    "{{GAS_EXEC_URL}}";
  const thanksPage = "{{THANKS_PAGE}}";
  // ▲▲▲

  const TIMEOUT_MS = 15000;

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn ? submitBtn.textContent : "送信する";

  function setSubmitting(isSubmitting) {
    if (!submitBtn) return;
    submitBtn.disabled = isSubmitting;
    submitBtn.textContent = isSubmitting ? "送信中..." : originalText;
  }

  function validateForm({ name, email, phone, message }) {
    const errors = [];
    if (!name || name.trim().length < 1) errors.push("お名前は必須です。");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.push("メールアドレスの形式が正しくありません。");
    const digits = (phone || "").replace(/[^\d]/g, "");
    if (!digits || digits.length < 10)
      errors.push("電話番号を正しく入力してください。");
    if (!message || message.trim().length < 1)
      errors.push("メッセージは必須です。");
    return errors;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 二重送信防止（連打・ラグ対策）
    if (form.dataset.submitting === "1") return;
    form.dataset.submitting = "1";
    setSubmitting(true);

    const formData = new FormData(form);

    // honeypot：値が入ってたらボット扱いで終了（黙って捨てる）
    if (formData.get("honeypot")) {
      form.dataset.submitting = "0";
      setSubmitting(false);
      return;
    }

    // UAを送ってerrorsで端末特定できるようにする
    formData.append("ua", navigator.userAgent);

    // どのLPから来たか（案件ID）
    formData.append("page_id", document.body?.dataset?.pageId || "");

    // GA4 client_id を渡す（サーバー側GA4送信で attribution を切らない）
    const clientId = await getGaClientId();
    if (clientId) formData.append("client_id", clientId);

    // 最低限バリデーション（no-corsで成功判定できないため、ここで弾く）
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      message: formData.get("message"),
    };
    const errors = validateForm(payload);
    if (errors.length) {
      alert(errors[0]);
      form.dataset.submitting = "0";
      setSubmitting(false);
      return;
    }

    // タイムアウト（弱電波で固まるのを防ぐ）
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(new Error("timeout")),
      TIMEOUT_MS
    );

    try {
      await fetch(scriptURL, {
        method: "POST",
        body: formData,
        mode: "no-cors",
        signal: controller.signal,
        cache: "no-store",
        keepalive: true,
      });

      // no-cors運用：到達した前提でthanksへ
      window.location.href = thanksPage;
    } catch (err) {
      console.error("Send Error:", err);
      alert(
        "送信に失敗しました。電波状況をご確認のうえ、時間を置いて再度お試しください。"
      );
      form.dataset.submitting = "0";
      setSubmitting(false);
    } finally {
      clearTimeout(timer);
    }
  });
});
