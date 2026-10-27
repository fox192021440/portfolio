(function () {
  "use strict";

  // year
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // lightbox
  var lb = document.getElementById("lightbox");
  var lbImg = lb ? lb.querySelector("img") : null;
  var lbClose = lb ? lb.querySelector(".lb-close") : null;
  var shots = document.querySelectorAll(".shot[data-full]");

  function open(src, alt) {
    if (!lb || !lbImg) return;
    lbImg.src = src;
    lbImg.alt = alt || "";
    lb.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function close() {
    if (!lb || !lbImg) return;
    lb.hidden = true;
    lbImg.removeAttribute("src");
    document.body.style.overflow = "";
  }

  Array.prototype.forEach.call(shots, function (el) {
    el.addEventListener("click", function () {
      var img = el.querySelector("img");
      open(el.getAttribute("data-full"), img ? img.alt : "");
    });
    el.setAttribute("tabindex", "0");
    el.setAttribute("role", "button");
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        var img = el.querySelector("img");
        open(el.getAttribute("data-full"), img ? img.alt : "");
      }
    });
  });

  if (lb) lb.addEventListener("click", close);
  if (lbClose) lbClose.addEventListener("click", function (e) { e.stopPropagation(); close(); });

  // copy wechat id
  var wx = document.getElementById("wx-copy");
  if (wx) {
    wx.addEventListener("click", function (e) {
      e.preventDefault();
      var id = wx.getAttribute("data-wx");
      var done = function () {
        var hint = document.getElementById("wx-hint");
        wx.textContent = "已复制：" + id;
        if (hint) hint.textContent = "去微信搜索粘贴添加，加我时说明来意和交期。";
        setTimeout(function () {
          wx.textContent = "复制微信号 " + id;
        }, 2600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(id).then(done).catch(function () {});
      } else {
        var ta = document.createElement("textarea");
        ta.value = id;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); done(); } catch (err) {}
        document.body.removeChild(ta);
      }
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && lb && !lb.hidden) close();
  });
})();
