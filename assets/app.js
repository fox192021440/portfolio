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

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && lb && !lb.hidden) close();
  });

  // reveal on scroll
  if ("IntersectionObserver" in window) {
    var reveal = document.querySelectorAll(".case, .skill, .hire-card, .note-card, .grid .shot");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    document.body.classList.add("io");
    Array.prototype.forEach.call(reveal, function (el) { io.observe(el); });
  }
})();
