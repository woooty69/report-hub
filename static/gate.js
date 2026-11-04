/* 리포트 허브 간단 잠금 (2026-11-09, Claude)
 * - 일반모드/관리자모드 비밀번호. 해시만 들어 있음(원문 비밀번호 없음).
 * - 이 파일은 tools\set_hub_password.py 가 tools\gate.template.js 로 만든다. 직접 고치지 말 것.
 * - 화면 가림 수준의 잠금이다(공개 GitHub Pages 이므로 소스·주소를 아는 사람은 우회 가능).
 */
(function () {
  "use strict";
  var CFG = { base: "/report-hub/", salt: "aa00349fdfed56b8024a5ca10b1c80cb", h: { general: "2dd8ce2f96e7f02d0a3f94e0eb04afd763733134a8b92aef97255e690dd22dbc", admin: "c596887f2fab4b6f9fdf8c1eeae551666cc7158b3d474aca6443a65c3db8003c" } };
  var KEY = "hwHubGate";
  // 일반모드에서 보이는 폴더(주소의 첫 경로, Quartz 슬러그)
  var ALLOW = ["dailymarketreport", "한국시장-리포트", "증권사-리포트-요약", "d램-가격-리포트",
               "유튜브-투자노트", "youtube-요약", "증권사리포트-검색"];
  var ALLOW_EXTRA = ["", "index", "404", "static/search"];
  var STATS_OK = ["US 마켓", "한국 마켓", "증권사 리포트", "DRAM", "유튜브 투자노트", "음성"];

  function readState() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
    if (!s) { try { s = JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) {} }
    if (s && s.m && CFG.h[s.m] && s.h === CFG.h[s.m]) return s.m;
    return null;
  }
  function saveState(m, remember) {
    var v = JSON.stringify({ m: m, h: CFG.h[m] });
    try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch (e) {}
    try { (remember ? localStorage : sessionStorage).setItem(KEY, v); } catch (e) {}
  }
  function clearState() {
    try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch (e) {}
  }
  function sha256hex(text) {
    var data = new TextEncoder().encode(text);
    return crypto.subtle.digest("SHA-256", data).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
    });
  }

  // 사이트 내부 경로 → 허용 여부 (외부 링크·다른 저장소는 null = 검사 안 함)
  function relOf(href) {
    var u;
    try { u = new URL(href, location.href); } catch (e) { return null; }
    if (u.origin !== location.origin) return null;
    var p = u.pathname;
    try { p = decodeURIComponent(p); } catch (e) {}
    if (p.indexOf(CFG.base) !== 0 && p + "/" !== CFG.base) return null;
    p = p.slice(CFG.base.length).replace(/\/+$/, "").replace(/ /g, "-");   // 원본 md 의 공백 경로 = Quartz 슬러그의 '-'
    var isPage = !/\.[a-z0-9]{2,5}$/i.test(p) || /\.html?$/i.test(p);
    p = p.replace(/\.html?$/i, "").replace(/\/index$/, "");
    return { rel: p, page: isPage };
  }
  // Quartz 의 data-slug(예: "youtube-요약/index") → rel. 한글 주소는 listen 스크립트가 주소창을
  // /s/코드 로 바꾸므로 현재 페이지 판정은 주소가 아니라 body 의 data-slug 를 우선 쓴다.
  function slugRel(s) {
    if (!s) return null;
    s = String(s).replace(/ /g, "-").replace(/\/index$/, "");
    if (s === "index") s = "";
    return { rel: s, page: true };
  }
  function curRel() {
    var b = document.body;
    return (b && slugRel(b.getAttribute("data-slug"))) || relOf(location.href);
  }
  function allowed(r) {
    if (!r) return true;
    if (ALLOW_EXTRA.indexOf(r.rel) >= 0) return true;
    var first = r.rel.split("/")[0];
    if (first === "static") return !r.page || r.rel === "static/search";
    if (!r.page) return true;
    return ALLOW.indexOf(first) >= 0;
  }

  var mode = readState();
  var css = document.createElement("style");
  css.textContent =
    "html.hwg-lock body>*:not(#hwg){display:none!important}" +
    "html.hwg-general .graph{display:none!important}" +
    "#hwg{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;" +
    "background:#f4f6fa;font-family:system-ui,'Malgun Gothic',sans-serif;padding:16px;box-sizing:border-box}" +
    "#hwg .bx{width:100%;max-width:340px;background:#fff;border:1px solid #e3e7ee;border-radius:12px;padding:22px 20px;box-shadow:0 6px 24px rgba(0,0,0,.08)}" +
    "#hwg h1{font-size:20px;margin:0 0 4px;color:#1f2937}#hwg p{margin:0 0 14px;font-size:13px;color:#6b7280}" +
    "#hwg input[type=password]{width:100%;box-sizing:border-box;font-size:16px;padding:10px 12px;border:1px solid #cfd6e0;border-radius:8px;margin:0 0 8px}" +
    "#hwg label{display:flex;align-items:center;gap:6px;font-size:13px;color:#4b5563;margin:0 0 10px}" +
    "#hwg button.go{width:100%;font-size:15px;padding:10px;border:0;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer}" +
    "#hwg .err{color:#dc2626;font-size:12px;min-height:16px;margin:6px 0 0}" +
    "#hwg .adm-link{display:block;margin:16px auto 0;background:none;border:0;color:#9ca3af;font-size:11px;cursor:pointer;text-decoration:underline}" +
    "#hwg .adm{display:none;margin-top:12px;padding-top:12px;border-top:1px dashed #e5e7eb}#hwg .adm.on{display:block}" +
    "#hwg .adm button.go{background:#374151}#hwg .home{display:block;text-align:center;margin-top:10px;font-size:12px;color:#2563eb}" +
    "#hwg-badge{position:fixed;right:8px;bottom:8px;z-index:2147482000;font:11px system-ui,'Malgun Gothic',sans-serif;" +
    "color:#9ca3af;background:rgba(255,255,255,.85);border:1px solid #e5e7eb;border-radius:10px;padding:2px 8px;cursor:pointer}" +
    "html[saved-theme=dark] #hwg{background:#111827}html[saved-theme=dark] #hwg .bx{background:#1f2937;border-color:#374151}" +
    "html[saved-theme=dark] #hwg h1{color:#f3f4f6}html[saved-theme=dark] #hwg input[type=password]{background:#111827;color:#f3f4f6;border-color:#4b5563}" +
    "html[saved-theme=dark] #hwg label{color:#d1d5db}html[saved-theme=dark] #hwg-badge{background:rgba(31,41,55,.85);border-color:#374151}";
  (document.head || document.documentElement).appendChild(css);

  function setMode(m) {
    mode = m;
    var c = document.documentElement.classList;
    c.toggle("hwg-general", m === "general");
    c.toggle("hwg-admin", m === "admin");
  }
  if (!mode) document.documentElement.classList.add("hwg-lock"); else setMode(mode);

  function closeGate() {
    var g = document.getElementById("hwg");
    if (g) g.remove();
    document.documentElement.classList.remove("hwg-lock");
  }

  // 잠금 화면. adminOnly=true 이면 '관리자 전용 페이지' 안내(일반모드에서 금지 페이지 접근 시)
  function showGate(adminOnly) {
    if (!document.body) { document.addEventListener("DOMContentLoaded", function () { showGate(adminOnly); }); return; }
    if (document.getElementById("hwg")) return;
    document.documentElement.classList.add("hwg-lock");
    var g = document.createElement("div");
    g.id = "hwg";
    g.innerHTML =
      '<div class="bx"><h1>리포트 허브</h1>' +
      (adminOnly
        ? '<p>관리자 전용 페이지입니다. 관리자 비밀번호를 입력하거나 홈으로 돌아가세요.</p>'
        : '<p>비밀번호를 입력해 주세요. 한 번 입력하면 이 기기에서 기억합니다.</p>' +
          '<form class="gen"><input type="password" autocomplete="current-password" placeholder="비밀번호">' +
          '<label><input type="checkbox" checked> 이 기기에서 기억하기</label>' +
          '<button class="go" type="submit">들어가기</button><div class="err"></div></form>' +
          '<button class="adm-link" type="button">관리자</button>') +
      '<div class="adm' + (adminOnly ? " on" : "") + '"><form class="admf">' +
      '<input type="password" autocomplete="current-password" placeholder="관리자 비밀번호">' +
      '<label><input type="checkbox" checked> 관리자 비밀번호 기억하기</label>' +
      '<button class="go" type="submit">관리자로 들어가기</button><div class="err"></div></form>' +
      (adminOnly ? '<a class="home" href="' + CFG.base + '">홈으로</a>' : "") +
      "</div></div>";
    document.body.appendChild(g);
    var link = g.querySelector(".adm-link");
    if (link) link.addEventListener("click", function () {
      var a = g.querySelector(".adm"); a.classList.toggle("on");
      if (a.classList.contains("on")) a.querySelector("input[type=password]").focus();
    });
    function bind(form, prefer) {
      if (!form) return;
      var pw = form.querySelector("input[type=password]"), rem = form.querySelector("input[type=checkbox]"), err = form.querySelector(".err");
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        if (!window.crypto || !crypto.subtle) { err.textContent = "이 브라우저에서는 확인할 수 없습니다(https 주소로 열어 주세요)."; return; }
        sha256hex(CFG.salt + ":" + pw.value).then(function (h) {
          var m = null;
          if (h === CFG.h.admin) m = "admin";
          else if (prefer === "general" && h === CFG.h.general) m = "general";
          if (!m) { err.textContent = "비밀번호가 맞지 않습니다."; pw.select(); return; }
          var prev = mode;
          saveState(m, rem.checked);
          if (prev) { location.reload(); return; }   // 일반→관리자 전환: 숨긴 항목을 되살리려면 새로고침
          setMode(m); closeGate(); start();
        });
      });
    }
    bind(g.querySelector("form.gen"), "general");
    bind(g.querySelector("form.admf"), "admin");
    var first = g.querySelector(adminOnly ? ".admf input[type=password]" : "form.gen input[type=password]");
    if (first) setTimeout(function () { first.focus(); }, 50);
  }

  function badge() {
    if (!document.body || !mode) return;
    var b = document.getElementById("hwg-badge");
    if (!b) {
      b = document.createElement("button"); b.id = "hwg-badge"; b.type = "button";
      b.addEventListener("click", function () {
        var msg = mode === "admin" ? "관리자모드입니다. 잠그고 비밀번호 화면으로 돌아갈까요?" : "일반모드입니다. 잠그고 비밀번호 화면으로 돌아갈까요?(관리자 전환 포함)";
        if (confirm(msg)) { clearState(); location.href = CFG.base; }
      });
      document.body.appendChild(b);
    }
    b.textContent = mode === "admin" ? "관리자모드" : "일반모드";
  }

  // 일반모드: 금지 폴더로 가는 링크·탐색기 항목을 숨기고, 금지 페이지면 관리자 안내
  var busy = false;
  function apply() {
    if (mode !== "general" || busy) return;
    busy = true;
    try {
      if (!allowed(curRel())) { showGate(true); }
      else if (document.getElementById("hwg") && document.querySelector("#hwg .home")) { closeGate(); }
      var links = document.querySelectorAll("a[href]");
      for (var i = 0; i < links.length; i++) {
        var a = links[i];
        if (a.closest("#hwg")) continue;
        var ds = a.getAttribute("data-slug");
        var bad = !allowed(ds ? slugRel(ds) : relOf(a.getAttribute("href")));
        var li = a.closest("li");
        var tgt = (li && li.querySelectorAll("a[href]").length === 1 && !a.classList.contains("hub-card")) ? li : a;
        if (bad) { tgt.setAttribute("data-hwg-hide", "1"); tgt.style.display = "none"; }
      }
      var folders = document.querySelectorAll("[data-folderpath]");
      for (var j = 0; j < folders.length; j++) {
        var fp = (folders[j].getAttribute("data-folderpath") || "").split("/")[0];
        try { fp = decodeURIComponent(fp); } catch (e) {}
        if (fp && ALLOW.indexOf(fp) < 0) { var fl = folders[j].closest("li") || folders[j]; fl.style.display = "none"; }
      }
      var stats = document.querySelectorAll(".hub-stats li");
      for (var k = 0; k < stats.length; k++) {
        var t = stats[k].textContent, ok = false;
        for (var q = 0; q < STATS_OK.length; q++) if (t.indexOf(STATS_OK[q]) >= 0) ok = true;
        if (!ok) stats[k].style.display = "none";
      }
      var sub = document.querySelector(".hub-sub");
      if (sub && !sub.getAttribute("data-hwg")) {
        sub.setAttribute("data-hwg", "1");
        sub.textContent = "미국·한국 증시 데일리 리포트, 증권사 리포트 요약, DRAM·NAND 현물가, 유튜브 투자 인사이트 — 매일 자동으로 수집·정리되어 갱신됩니다.";
      }
    } finally { busy = false; }
  }

  var observing = false;
  function start() {
    if (!mode) { showGate(false); return; }
    badge(); apply();
    if (observing) return;
    observing = true;
    var t = null;
    new MutationObserver(function () { if (t) return; t = setTimeout(function () { t = null; apply(); badge(); }, 60); })
      .observe(document.body, { childList: true, subtree: true });
  }
  document.addEventListener("nav", function () { apply(); badge(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
