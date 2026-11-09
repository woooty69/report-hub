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
    var m = u.match(/^https:\/\/woooty69\.github\.io\/hw-pdf-arch-(\d+)\/([^?#]+\.pdf)(#page=\d+)?$/i);   // 11-12: #page= 붙은 산업 발췌도 대체 열기
    if (m) return "/arch/" + m[1] + "/" + m[2] + (m[3] || "");
    m = u.match(/^https:\/\/woooty69\.github\.io\/report-pdf\/pdf\/([^?#]+\.pdf)(#page=\d+)?$/i);
    if (m) return "/rpdf/" + m[1] + (m[2] || "");
    return null;
  }
  function timed(p, ms) {
    return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error("timeout")); }, ms); })]);
  }
  function alive(url, ms) {   // 같은 출처(github.io) 또는 CORS 허용(미러) — HEAD 로 생존 확인
    return timed(fetch(url, { method: "HEAD", cache: "no-store" }), ms || 4000).then(function (r) { return r.ok; }, function () { return false; });
  }
  // 2026-11-12: 응답이 '없다(404 등)'인지 '늦다(시간 초과·네트워크 오류)'인지 구분 — 늦은 경우엔 깃허브를 그대로 연다.
  //   (이전엔 휴대폰 등 느린 망에서 4초를 넘기면 tailnet 밖 기기에서 열리지 않는 2호기 http 주소로 보내 '불러오지 못함'이 났음)
  function probe(url, ms) {
    return timed(fetch(url, { method: "HEAD", cache: "no-store" }), ms).then(function (r) { return r.ok ? "ok" : "missing"; }, function () { return "slow"; });
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
    (gh ? probe(gh, 6000) : Promise.resolve("none")).then(function (st) {
      if (st === "ok") return go(gh);
      alive(MIRROR_HTTPS + mp, 4000).then(function (mok) {
        if (mok) return go(MIRROR_HTTPS + mp);
        if (gh && st === "slow") return go(gh);   // 깃허브가 느렸을 뿐 — 미러가 안 되면 깃허브로
        var orig = a.getAttribute("data-orig");
        if (orig && orig !== gh) return go(orig); // 원문 사이트(네이버·한경·증권사)
        if (gh) return go(gh);
        go(MIRROR_HTTP + mp);                // 마지막: http 미러(tailnet 기기에서만 열림)
      });
    });
  }, true);
})();
