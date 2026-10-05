/* 리포트 PDF 자동 대체 열기 (2026-10-20, 사용자 요청: 깃허브가 막혀도 PDF가 자동으로 열리게)
 * 깃허브 PDF 링크(hw-pdf-arch-NNN, report-pdf)를 누르면 먼저 깃허브가 살아 있는지 확인하고,
 * 안 되면 2호기 미러(tailnet 안에서만 열림: Tailscale 이 켜진 내 기기에서만)로 연다.
 * 허브를 2호기 미러에서 직접 열었을 때는 처음부터 미러 주소로 연다.
 * 미러 PDF가 없는 행은 data-orig(원문 주소)로 마지막 대체. */
(function () {
  if (window.__pdfFallback) return; window.__pdfFallback = 1;
  var HOST = "win-prds3cnco9g.tailbbe13a.ts.net";
  var MIRROR_HTTPS = "https://" + HOST, MIRROR_HTTP = "http://" + HOST;
  var onMirror = location.hostname === HOST || location.hostname === "win-prds3cnco9g" || location.hostname === "127.0.0.1";
  function mirrorPath(u) {
    var m = u.match(/^https:\/\/woooty69\.github\.io\/hw-pdf-arch-(\d+)\/([^?#]+\.pdf)$/i);
    if (m) return "/arch/" + m[1] + "/" + m[2];
    m = u.match(/^https:\/\/woooty69\.github\.io\/report-pdf\/pdf\/([^?#]+\.pdf)$/i);
    if (m) return "/rpdf/" + m[1];
    return null;
  }
  function timed(p, ms) {
    return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error("timeout")); }, ms); })]);
  }
  function alive(url) {   // 같은 출처(github.io) 또는 CORS 허용(미러) — HEAD 로 생존 확인
    return timed(fetch(url, { method: "HEAD", cache: "no-store" }), 4000).then(function (r) { return r.ok; }, function () { return false; });
  }
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
    var a = e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    var mp = a.getAttribute("data-mirror") || mirrorPath(a.href);
    if (!mp) return;
    e.preventDefault();
    if (onMirror) { window.open(mp, "_blank"); return; }
    var w = window.open("about:blank", "_blank");   // 클릭 순간에 창을 열어야 팝업 차단을 피함
    var go = function (u) { if (w) w.location.href = u; else location.href = u; };
    var gh = mirrorPath(a.href) ? a.href : null;
    (gh ? alive(gh) : Promise.resolve(false)).then(function (ok) {
      if (ok) return go(gh);
      alive(MIRROR_HTTPS + mp).then(function (mok) {
        if (mok) return go(MIRROR_HTTPS + mp);
        var orig = a.getAttribute("data-orig");
        if (!gh && orig) return go(orig);     // 깃허브 링크가 아닌 행: 원문 우선
        go(MIRROR_HTTP + mp);                // HTTPS 미러가 아직 없으면 http 미러(tailnet 기기에서만 열림)
      });
    });
  }, true);
})();
