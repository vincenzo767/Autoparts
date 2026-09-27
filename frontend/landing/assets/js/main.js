/* Rovi Autoparts Surplus landing site: shared header/footer, curtain, reveals and cards. */
(function () {
  "use strict";

  // Mirrors SHOP in frontend/src/lib/format.js. Keep the two in sync.
  var SHOP = {
    name: "Rovi Autoparts Surplus",
    address: "Panganiban Street, Cebu City, Cebu 6000, Philippines",
    phones: ["0906 848 5956", "0999 470 7109"],
    phonesIntl: ["+639068485956", "+639994707109"],
    email: "vinceran2003@gmail.com",
    facebook: "https://www.facebook.com/share/19Jt1C5djN/",
  };

  var CATEGORIES = [
    ["ENGINES", "Engines"],
    ["TRANSMISSIONS", "Transmissions"],
    ["TIRES_WHEELS", "Tires & Wheels"],
    ["BEARINGS", "Bearings & Hubs"],
    ["SUSPENSION", "Suspension & Steering"],
    ["BRAKES", "Brakes"],
    ["ELECTRICAL", "Electrical"],
    ["BODY_PARTS", "Body & Lights"],
  ];

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var page = document.body.getAttribute("data-page") || "";

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  var ICONS = {
    heart: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
    bag: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.3H7.5V14h2.7v8h3.3Z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
  };

  var NAV_LEFT = [
    ["/app/shop", "Shop", "shop"],
    ["yardbook.html", "Yard Book", "yardbook"],
    ["about.html", "Our Story", "about"],
  ];

  function current(key) {
    return key === page ? ' aria-current="page"' : "";
  }

  // ---------- Header, menu, footer ----------

  function injectChrome() {
    var header = document.createElement("div");
    header.innerHTML =
      '<a href="#main" class="skip-link">Skip to content</a>' +
      '<div class="curtain is-intro" aria-hidden="true"><span class="curtain__mark">R·A</span></div>' +
      (page === "yardbook" ? '<div id="progress" class="progress" aria-hidden="true"></div>' : "") +
      '<header class="nav" id="nav">' +
      '<div class="nav__left">' +
      '<button type="button" class="burger" aria-expanded="false" aria-controls="menu" aria-label="Open menu"><span></span><span></span></button>' +
      '<nav class="nav__links" aria-label="Primary">' +
      NAV_LEFT.map(function (l) {
        return '<a href="' + l[0] + '"' + current(l[2]) + ">" + l[1] + "</a>";
      }).join("") +
      "</nav></div>" +
      '<a href="index.html" class="logo" aria-label="' + esc(SHOP.name) + ' home">' +
      '<span class="logo__main">Rovi <em>Autoparts</em></span><span class="logo__sub">Surplus · Cebu City</span></a>' +
      '<div class="nav__right">' +
      '<a href="/app/visit" class="nav__visit">Visit Us</a>' +
      '<a href="/app/auth" class="nav__discover">Discover</a>' +
      '<a href="/app/favorites" class="nav__icon" aria-label="Your favourites">' + ICONS.heart + "</a>" +
      '<a href="/app/cart" class="nav__icon" aria-label="Your bag">' + ICONS.bag + "</a>" +
      "</div></header>" +
      '<div class="menu" id="menu" aria-hidden="true">' +
      '<ol class="menu__list">' +
      [
        ["index.html", "Home", "home"],
        ["/app/shop", "Shop", "shop"],
        ["yardbook.html", "Yard Book", "yardbook"],
        ["about.html", "Our Story", "about"],
        ["/app/visit", "Visit Us", "visit"],
        ["/app/auth", "Discover", "discover"],
      ]
        .map(function (l, i) {
          return '<li><a href="' + l[0] + '"' + current(l[2]) + ' tabindex="-1"><span class="num">0' + (i + 1) + "</span>" + l[1] + "</a></li>";
        })
        .join("") +
      "</ol>" +
      '<div class="menu__foot"><p>' + esc(SHOP.address) + "</p><p>" +
      SHOP.phones.map(function (ph, i) {
        return '<a href="tel:' + SHOP.phonesIntl[i] + '" tabindex="-1">' + esc(ph) + "</a>";
      }).join(" · ") +
      "</p></div></div>";
    var frag = document.createDocumentFragment();
    while (header.firstChild) frag.appendChild(header.firstChild);
    document.body.insertBefore(frag, document.body.firstChild);

    var footer = document.createElement("footer");
    footer.className = "footer";
    footer.innerHTML =
      '<div class="container footer__grid">' +
      '<div class="footer__brand"><a href="index.html" class="logo logo--light"><span class="logo__main">Rovi <em>Autoparts</em></span><span class="logo__sub">Surplus · Cebu City</span></a>' +
      "<p>Quality surplus auto parts, Cebu City, since 1998.</p></div>" +
      '<div><h2 class="footer__title">Shop</h2><ul>' +
      CATEGORIES.map(function (c) {
        return '<li><a href="/app/shop?category=' + c[0] + '">' + esc(c[1]) + "</a></li>";
      }).join("") +
      "</ul></div>" +
      '<div><h2 class="footer__title">The Shop</h2><ul>' +
      '<li><a href="yardbook.html">Yard Book</a></li><li><a href="about.html">Our Story</a></li>' +
      '<li><a href="/app/visit">Visit &amp; directions</a></li><li><a href="/app/chat">Ask about a part</a></li></ul></div>' +
      '<div><h2 class="footer__title">Get in touch</h2><p class="footer__note">New stock, restocks and shop news on Facebook.</p><ul>' +
      '<li><a href="mailto:' + SHOP.email + '">' + esc(SHOP.email) + "</a></li>" +
      SHOP.phones.map(function (ph, i) {
        return '<li><a href="tel:' + SHOP.phonesIntl[i] + '">' + esc(ph) + "</a></li>";
      }).join("") +
      '</ul><a class="footer__social" href="' + SHOP.facebook + '" target="_blank" rel="noopener" aria-label="Rovi Autoparts Surplus on Facebook">' + ICONS.facebook + "</a></div>" +
      "</div>" +
      '<p class="footer__word" aria-hidden="true">Rovi <em>A</em>utoparts</p>' +
      '<p class="footer__legal container">© 2026 ' + esc(SHOP.name) + " · Panganiban Street, Cebu City 6000 · " +
      SHOP.phones.map(function (ph, i) {
        return '<a href="tel:' + SHOP.phonesIntl[i] + '">' + esc(ph) + "</a>";
      }).join(" · ") +
      ' · <a href="privacy.html">Privacy Policy</a> · <a href="terms.html">Terms of Service</a></p>';
    document.body.appendChild(footer);

    var toasts = document.createElement("div");
    toasts.className = "toasts";
    toasts.setAttribute("role", "status");
    toasts.setAttribute("aria-live", "polite");
    document.body.appendChild(toasts);
  }

  // ---------- Curtain & page transitions ----------

  function setupCurtain() {
    var curtain = document.querySelector(".curtain");
    if (!curtain) return;
    setTimeout(function () {
      curtain.classList.remove("is-intro");
    }, reduceMotion ? 0 : 350);

    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a) return;
      var href = a.getAttribute("href");
      if (!href || href.charAt(0) === "#" || /^(mailto:|tel:)/i.test(href)) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;
      var url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.hash) return;
      e.preventDefault();
      curtain.classList.add("is-leaving");
      setTimeout(function () {
        location.href = a.href;
      }, reduceMotion ? 0 : 550);
    });

    window.addEventListener("pageshow", function (e) {
      if (e.persisted) curtain.classList.remove("is-leaving", "is-intro");
    });
  }

  // ---------- Nav & menu ----------

  function setupNav() {
    var nav = document.getElementById("nav");
    var burger = document.querySelector(".burger");
    var menu = document.getElementById("menu");
    var last = window.scrollY;

    function onScroll() {
      var y = window.scrollY;
      nav.classList.toggle("is-scrolled", y > 40);
      var open = document.body.classList.contains("menu-open");
      nav.classList.toggle("is-hidden", !open && y > 400 && y > last);
      last = y;
      var bar = document.getElementById("progress");
      if (bar) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
      }
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    function setMenu(open) {
      document.body.classList.toggle("menu-open", open);
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.setAttribute("aria-hidden", String(!open));
      menu.querySelectorAll("a").forEach(function (a) {
        a.tabIndex = open ? 0 : -1;
      });
      if (open) nav.classList.remove("is-hidden");
    }
    burger.addEventListener("click", function () {
      setMenu(!document.body.classList.contains("menu-open"));
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.body.classList.contains("menu-open")) {
        setMenu(false);
        burger.focus();
      }
    });
  }

  // ---------- Images, reveals, parallax, counters ----------

  function watchImages(root) {
    (root || document).querySelectorAll(".frame img").forEach(function (img) {
      if (img.dataset.watched) return;
      img.dataset.watched = "1";
      var done = function () {
        img.classList.add("is-loaded");
      };
      if (img.complete && img.naturalWidth > 0) done();
      else {
        img.addEventListener("load", done);
        img.addEventListener("error", function () {
          img.classList.add("is-broken");
        });
      }
    });
  }

  var revealObserver = null;
  function observeReveals(root) {
    var items = (root || document).querySelectorAll("[data-reveal]:not(.is-in), .split-lines:not(.is-in), [data-count]:not(.is-counted)");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) {
        el.classList.add("is-in");
        if (el.hasAttribute("data-count")) countUp(el);
      });
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var el = entry.target;
            el.classList.add("is-in");
            if (el.hasAttribute("data-count")) countUp(el);
            revealObserver.unobserve(entry.target);
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
      );
    }
    items.forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  function countUp(el) {
    if (el.classList.contains("is-counted")) return;
    el.classList.add("is-counted");
    var target = Number(el.getAttribute("data-count")) || 0;
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduceMotion) {
      el.textContent = target + suffix;
      return;
    }
    var start = performance.now();
    var dur = 1600;
    function tick(now) {
      var t = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function setupParallax() {
    if (reduceMotion) return;
    var items = [].slice.call(document.querySelectorAll("[data-parallax]"));
    if (!items.length) return;
    var ticking = false;
    function update() {
      ticking = false;
      var vh = window.innerHeight;
      items.forEach(function (el) {
        var rect = el.parentElement.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > vh) return;
        var speed = Number(el.getAttribute("data-parallax")) || 0.12;
        var offset = (rect.top + rect.height / 2 - vh / 2) * -speed;
        el.style.transform = "translate3d(0," + offset.toFixed(1) + "px,0) scale(1.15)";
      });
    }
    window.addEventListener("scroll", function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  }

  // ---------- Cards & best sellers ----------

  var SAFE_IMG = /^(https:\/\/|\/api\/files\/)/;

  function cardHtml(p, href) {
    var imgs = (p.images || []).filter(function (u) {
      return SAFE_IMG.test(u);
    });
    var alt = p.brand ? p.name + " — " + p.brand : p.name;
    var price = window.RoviData ? window.RoviData.formatPrice(p.price) : "₱" + p.price;
    var label = window.RoviData ? window.RoviData.CATEGORY_LABELS[p.category] || "" : "";
    return (
      '<article class="pcard">' +
      '<a class="pcard__media" href="' + esc(href) + '">' +
      '<span class="frame pcard__frame">' + (imgs[0] ? '<img src="' + esc(imgs[0]) + '" alt="' + esc(alt) + '" loading="lazy" decoding="async">' : "") + "</span>" +
      (imgs[1] ? '<span class="frame pcard__frame pcard__frame--alt"><img src="' + esc(imgs[1]) + '" alt="" loading="lazy" decoding="async"></span>' : "") +
      (p.tag ? '<span class="pcard__tag">' + esc(p.tag) + "</span>" : "") +
      '<span class="pcard__quick">View in the shop</span>' +
      "</a>" +
      '<a class="pcard__heart" href="/app/favorites" aria-label="Save ' + esc(p.name) + ' to your favourites">' + ICONS.heart + "</a>" +
      '<div class="pcard__info"><p class="pcard__cat">' + esc(label) + "</p>" +
      '<h3 class="pcard__name"><a href="' + esc(href) + '">' + esc(p.name) + "</a></h3>" +
      '<p class="pcard__price">' + esc(price) + (p.inStock === false || p.stock === 0 ? ' <span class="pcard__out">Sold out</span>' : "") + "</p></div>" +
      "</article>"
    );
  }

  /** Static fallback card: links into the shop search. */
  function productCard(p) {
    return cardHtml(p, "/app/shop?q=" + encodeURIComponent(p.name));
  }

  /** Live card from the API: every value is escaped and only safe image URLs are used. */
  function liveCard(p) {
    var id = Number(p.id);
    if (!Number.isFinite(id)) return "";
    return cardHtml(p, "/app/product/" + id);
  }

  function setupBestSellers() {
    var rail = document.querySelector("[data-bestsellers]");
    if (!rail) return;

    function renderFallback() {
      var list = (window.RoviData ? window.RoviData.PRODUCTS : []).filter(function (p) {
        return p.featured;
      });
      rail.innerHTML = list.slice(0, 8).map(productCard).join("");
      watchImages(rail);
    }

    var controller = "AbortController" in window ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (controller) controller.abort();
    }, 6000);
    fetch("/api/public/featured", { credentials: "omit", signal: controller ? controller.signal : undefined })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (items) {
        clearTimeout(timer);
        if (!Array.isArray(items) || !items.length) return renderFallback();
        rail.innerHTML = items.map(liveCard).join("");
        watchImages(rail);
      })
      .catch(function () {
        clearTimeout(timer);
        renderFallback();
      });

    document.querySelectorAll("[data-rail-prev], [data-rail-next]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var card = rail.querySelector(".pcard");
        var gap = parseFloat(getComputedStyle(rail).columnGap) || 24;
        var step = (card ? card.offsetWidth : 300) + gap;
        rail.scrollBy({ left: btn.hasAttribute("data-rail-prev") ? -step : step, behavior: reduceMotion ? "auto" : "smooth" });
      });
    });
  }

  // ---------- Boot ----------

  injectChrome();
  setupCurtain();
  setupNav();
  watchImages();
  observeReveals();
  setupParallax();
  setupBestSellers();

  window.Rovi = { SHOP: SHOP, watchImages: watchImages, observeReveals: observeReveals, productCard: productCard, liveCard: liveCard };
})();
