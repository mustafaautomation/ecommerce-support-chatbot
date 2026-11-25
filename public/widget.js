(function () {
  var script = document.currentScript || document.querySelector('script[src*="widget.js"]');
  var origin = script && script.src ? new URL(script.src).origin : window.location.origin;
  var title = (script && script.getAttribute("data-title")) || "Driftwood support";
  var root = document.createElement("div");
  root.setAttribute("data-driftwood-widget", "true");
  var button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", "Open Driftwood support chat");
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", "driftwood-support-panel");
  button.textContent = "Chat";
  button.style.cssText = [
    "position:fixed",
    "right:16px",
    "bottom:16px",
    "z-index:2147483000",
    "height:56px",
    "min-width:56px",
    "padding:0 16px",
    "border:0",
    "border-radius:999px",
    "background:#1b3a32",
    "color:#f6f1e7",
    "font:600 14px/1 Outfit,system-ui,sans-serif",
    "box-shadow:0 12px 30px rgba(27,58,50,.35)",
    "cursor:pointer",
  ].join(";");
  var panel = document.createElement("div");
  panel.id = "driftwood-support-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", title);
  panel.hidden = true;
  panel.style.cssText = [
    "position:fixed",
    "right:16px",
    "bottom:84px",
    "z-index:2147483000",
    "width:min(400px,calc(100vw - 24px))",
    "height:min(640px,calc(100dvh - 110px))",
    "border-radius:20px",
    "overflow:hidden",
    "box-shadow:0 24px 60px rgba(27,58,50,.35)",
    "background:#fbf7f1",
  ].join(";");
  var frame = document.createElement("iframe");
  frame.src = origin + "/embed";
  frame.title = title;
  function frameEscapeReady() {
    try {
      var doc = frame.contentDocument;
      return !!(doc && doc.documentElement && doc.documentElement.dataset.dwEscape === "1");
    } catch {
      return false;
    }
  }
  function bindFrameEscape() {
    try {
      var doc = frame.contentDocument;
      if (!doc || !doc.documentElement || doc.documentElement.dataset.dwEscape === "1") return;
      var href = doc.location && doc.location.href;
      if (!href || href === "about:blank") return;
      doc.documentElement.dataset.dwEscape = "1";
      doc.addEventListener(
        "keydown",
        function (event) {
          if (event.key === "Escape") setOpen(false);
        },
        true,
      );
      if (!panel.hidden) frame.focus();
    } catch {
      /* cross-origin frames keep the parent Escape listener */
    }
  }
  frame.addEventListener("load", bindFrameEscape);
  setInterval(bindFrameEscape, 50);
  frame.style.cssText = "width:100%;height:100%;border:0;background:#fbf7f1";
  panel.appendChild(frame);
  function setOpen(open) {
    panel.hidden = !open;
    button.setAttribute("aria-expanded", open ? "true" : "false");
    button.textContent = open ? "Close" : "Chat";
    if (open) {
      bindFrameEscape();
      if (frameEscapeReady()) frame.focus();
    } else button.focus();
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
  });
  root.appendChild(panel);
  root.appendChild(button);
  document.body.appendChild(root);
})();
