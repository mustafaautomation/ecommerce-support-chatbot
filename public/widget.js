(function () {
  var script = document.currentScript || document.querySelector('script[src*="widget.js"]');
  var origin = script && script.src ? new URL(script.src).origin : window.location.origin;
  var title = (script && script.getAttribute("data-title")) || "Driftwood support";
  var position = (script && script.getAttribute("data-position")) === "left" ? "left" : "right";
  var nudgesNow = script && script.getAttribute("data-nudges") === "now";
  var teaserOn = script && script.getAttribute("data-teaser") === "1";
  var teaserKey = "driftwood-teaser-dismissed";
  var themeAttr = (script && script.getAttribute("data-theme")) || "system";
  var storageKey = "driftwood-nudges-hidden";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var style = document.createElement("style");
  style.textContent = [
    ".dw-launcher{position:fixed;z-index:2147483000;width:60px;height:60px;border:0;border-radius:999px;background:#1B3A32;color:#F6F1E7;box-shadow:0 8px 24px rgba(27,58,50,.35), inset 0 1px 0 rgba(255,255,255,.25);cursor:pointer;display:grid;place-items:center}",
    ".dw-launcher:hover{transform:scale(1.06)}",
    ".dw-launcher:active{transform:scale(.96)}",
    ".dw-launcher:focus-visible{outline:3px solid #1B3A32;outline-offset:3px}",
    "@media(max-width:639px){.dw-launcher{width:56px;height:56px}}",
    ".dw-panel{position:fixed;z-index:2147483000;width:400px;border-radius:24px;overflow:hidden;background:rgba(251,247,241,.86);backdrop-filter:blur(20px) saturate(1.35);border:1px solid rgba(221,210,194,.7);box-shadow:0 18px 50px rgba(15,18,22,.2),0 2px 8px rgba(15,18,22,.06)}",
    ".dw-panel iframe{width:100%;height:100%;border:0;background:transparent}",
    ".dw-nudges{position:fixed;z-index:2147483000;display:flex;flex-direction:column;gap:8px;align-items:flex-end}",
    ".dw-pill{height:36px;padding:0 14px;border-radius:999px;border:1px solid rgba(221,210,194,.8);background:rgba(251,247,241,.92);color:#142822;font:500 13px/36px Geist,ui-sans-serif,system-ui,sans-serif;cursor:pointer;box-shadow:0 8px 24px rgba(15,18,22,.08)}",
    ".dw-dismiss{width:24px;height:24px;border:0;border-radius:999px;background:transparent;color:#3E5248;cursor:pointer}",
    ".dw-teaser{position:fixed;z-index:2147483000;max-width:240px;padding:10px 12px;border-radius:16px;background:#FBF7F1;color:#142822;border:1px solid #DDD2C2;box-shadow:0 8px 24px rgba(15,18,22,.12);font:500 13px/18px Geist,ui-sans-serif,system-ui,sans-serif}",
    "@media(max-width:639px){.dw-panel.dw-open{inset:0;width:100dvw;height:100dvh;border-radius:0;box-shadow:none}.dw-launcher.dw-hidden{display:none}}",
    "@media(prefers-reduced-motion:reduce){.dw-launcher,.dw-panel,.dw-pill{transition:none!important;animation:none!important}}",
  ].join("");
  document.head.appendChild(style);

  var root = document.createElement("div");
  root.setAttribute("data-driftwood-widget", "true");

  var button = document.createElement("button");
  button.type = "button";
  button.className = "dw-launcher";
  button.setAttribute("data-testid", "chat-launcher");
  button.setAttribute("aria-label", "Open chat with Rowan");
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", "driftwood-support-panel");
  button.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 16.5c2.4-3.2 4.4-3.2 6.8 0s4.4 3.2 6.8 0 3.2-3.2 4.4-3.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 9.5 10.2 6l2.1 3.2L14.8 6 18 10.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var panel = document.createElement("div");
  panel.id = "driftwood-support-panel";
  panel.className = "dw-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", title);
  panel.hidden = true;

  var frame = document.createElement("iframe");
  frame.src = origin + "/embed";
  frame.title = title;
  panel.appendChild(frame);

  var nudges = document.createElement("div");
  nudges.className = "dw-nudges";
  nudges.hidden = true;
  var pills = [
    ["Track my order", "Track my order"],
    ["Start a return", "Start a return"],
  ];
  pills.forEach(function (pair) {
    var pill = document.createElement("button");
    pill.type = "button";
    pill.className = "dw-pill";
    pill.setAttribute("data-testid", "launcher-nudge");
    pill.textContent = pair[0];
    pill.addEventListener("click", function () {
      setOpen(true);
      frame.contentWindow.postMessage({ type: "driftwood-prompt", text: pair[1] }, origin);
      hideNudges();
    });
    nudges.appendChild(pill);
  });
  var dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "dw-dismiss";
  dismiss.setAttribute("aria-label", "Dismiss suggestions");
  dismiss.textContent = "×";
  dismiss.addEventListener("click", function () {
    try { sessionStorage.setItem(storageKey, "1"); } catch { /* private mode */ }
    hideNudges();
  });
  nudges.appendChild(dismiss);

  function place() {
    var mobile = window.innerWidth < 640;
    var pad = mobile ? "16px" : "24px";
    var side = position === "left" ? "left" : "right";
    var other = position === "left" ? "right" : "left";
    button.style[side] = pad;
    button.style[other] = "auto";
    button.style.bottom = pad;
    nudges.style[side] = pad;
    nudges.style[other] = "auto";
    nudges.style.bottom = mobile ? "84px" : "96px";
    if (mobile && !panel.hidden) {
      panel.style.inset = "0";
      panel.style.width = "100dvw";
      panel.style.height = "100dvh";
      panel.style.borderRadius = "0";
    } else {
      panel.style.inset = "auto";
      panel.style[side] = pad;
      panel.style[other] = "auto";
      panel.style.bottom = mobile ? "16px" : "100px";
      var height = Math.min(680, window.innerHeight - 24 - 60 - 16 - 24);
      panel.style.width = window.innerWidth < 1024 ? "380px" : "400px";
      panel.style.height = Math.max(320, height) + "px";
      if (window.innerWidth < 640) {
        panel.style.width = "100dvw";
        panel.style.height = "100dvh";
      }
    }
  }

  function hideNudges() {
    nudges.hidden = true;
  }

  function showNudges() {
    try { if (sessionStorage.getItem(storageKey) === "1") return; } catch { return; }
    if (!panel.hidden) return;
    nudges.hidden = false;
  }

  function postTheme() {
    var dark = document.documentElement.classList.contains("dark");
    var mode = themeAttr === "system" ? (dark ? "dark" : "light") : themeAttr;
    try { frame.contentWindow.postMessage({ type: "driftwood-theme", theme: mode }, origin); } catch { /* frame not ready */ }
  }

  function setOpen(open) {
    panel.hidden = !open;
    button.setAttribute("aria-expanded", open ? "true" : "false");
    button.setAttribute("aria-label", open ? "Close chat" : "Open chat with Rowan");
    button.classList.toggle("dw-hidden", open && window.innerWidth < 640);
    panel.classList.toggle("dw-open", open);
    if (open) {
      hideTeaser();
      button.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
      hideNudges();
      place();
      postTheme();
    } else {
      button.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 16.5c2.4-3.2 4.4-3.2 6.8 0s4.4 3.2 6.8 0 3.2-3.2 4.4-3.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 9.5 10.2 6l2.1 3.2L14.8 6 18 10.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      button.focus();
      place();
    }
  }

  button.addEventListener("click", function () {
    setOpen(panel.hidden);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !panel.hidden) setOpen(false);
  });
  window.addEventListener("message", function (event) {
    if (event.origin !== origin) return;
    if (event.data && event.data.type === "driftwood-close") setOpen(false);
    if (event.data && event.data.type === "driftwood-open") setOpen(true);
  });
  window.addEventListener("resize", place);
  frame.addEventListener("load", function () {
    postTheme();
    try {
      frame.contentWindow.addEventListener("keydown", function (event) {
        if (event.key === "Escape") setOpen(false);
      });
    } catch { /* cross-origin frame */ }
  });

  var teaser = document.createElement("button");
  teaser.type = "button";
  teaser.className = "dw-teaser";
  teaser.setAttribute("data-testid", "launcher-teaser");
  teaser.textContent = "Parcel running late? I can track DW-10482.";
  teaser.hidden = true;
  var teaserDismiss = document.createElement("button");
  teaserDismiss.type = "button";
  teaserDismiss.className = "dw-dismiss";
  teaserDismiss.setAttribute("aria-label", "Dismiss teaser");
  teaserDismiss.textContent = "×";
  teaserDismiss.hidden = true;
  function hideTeaser() {
    teaser.hidden = true;
    teaserDismiss.hidden = true;
  }
  teaser.addEventListener("click", function () {
    setOpen(true);
    frame.contentWindow.postMessage({ type: "driftwood-prompt", text: "Where is my order #DW-10482?" }, origin);
    try { localStorage.setItem(teaserKey, "1"); } catch { /* ignore */ }
    hideTeaser();
  });
  teaserDismiss.addEventListener("click", function () {
    try { localStorage.setItem(teaserKey, "1"); } catch { /* ignore */ }
    hideTeaser();
  });
  function showTeaser() {
    if (!teaserOn || !panel.hidden) return;
    try { if (localStorage.getItem(teaserKey) === "1") return; } catch { return; }
    teaser.hidden = false;
    teaserDismiss.hidden = false;
    var mobile = window.innerWidth < 640;
    var pad = mobile ? 16 : 24;
    var side = position === "left" ? "left" : "right";
    teaser.style[side] = (pad + 72) + "px";
    teaser.style.bottom = (pad + 8) + "px";
    teaserDismiss.style[side] = (pad + 72 + 210) + "px";
    teaserDismiss.style.bottom = (pad + 28) + "px";
    teaserDismiss.style.position = "fixed";
    teaserDismiss.style.zIndex = "2147483000";
  }
  root.appendChild(teaser);
  root.appendChild(teaserDismiss);
  root.appendChild(nudges);
  root.appendChild(panel);
  root.appendChild(button);
  document.body.appendChild(root);
  place();
  if (nudgesNow || reduced) showNudges();
  else window.setTimeout(showNudges, 1200);
  window.setTimeout(showTeaser, reduced ? 0 : 4000);
})();
