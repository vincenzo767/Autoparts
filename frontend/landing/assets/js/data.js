/* Static fallback catalogue for the landing site. Mirrors the 24 starter parts. */
(function () {
  "use strict";

  function IMG(url, w) {
    if (url.indexOf("images.unsplash.com") === -1) return url;
    return url.replace(/([?&])w=\d+/, "$1w=" + (w || 900));
  }

  var U = function (id) {
    return "https://images.unsplash.com/photo-" + id + "?auto=format&fit=crop&w=900&q=80";
  };

  var CATEGORY_LABELS = {
    ENGINES: "Engines",
    TRANSMISSIONS: "Transmissions",
    TIRES_WHEELS: "Tires & Wheels",
    BEARINGS: "Bearings & Hubs",
    SUSPENSION: "Suspension & Steering",
    BRAKES: "Brakes",
    ELECTRICAL: "Electrical",
    BODY_PARTS: "Body & Lights",
  };

  function p(id, name, category, tag, brand, price, stock, featured, images) {
    return { id: id, name: name, category: category, tag: tag, brand: brand, price: price, stock: stock, featured: featured, images: images.map(U) };
  }

  var PRODUCTS = [
    p("toyota-2kd-ftv-engine", "Toyota 2KD-FTV 2.5 Diesel Engine Assembly", "ENGINES", "Best Seller", "Toyota", 145000, 2, true, ["1486262715619-67b85e0b08d3", "1778757949657-615fe09f063b"]),
    p("mitsubishi-4d56-engine", "Mitsubishi 4D56 Turbo Diesel Engine", "ENGINES", "Japan Surplus", "Mitsubishi", 98000, 3, true, ["1777900201609-ad2f57813ab8", "1763836393413-3b79e6b4560a"]),
    p("hyundai-d4cb-engine", "Hyundai D4CB 2.5 CRDi Engine", "ENGINES", "New", "Hyundai", 115000, 1, false, ["1778183228182-82ec2bb3db26", "1544692414-636611c6ae73"]),
    p("hilux-5-speed-manual", "Toyota Hilux 5-Speed Manual Transmission", "TRANSMISSIONS", null, "Toyota", 42000, 2, true, ["1711199694531-e982a79ea381", "1614447428943-52ec0bdbc7aa"]),
    p("crv-automatic-transmission", "Honda CR-V Automatic Transmission", "TRANSMISSIONS", null, "Honda", 38000, 1, false, ["1567093322102-6bdd32fba67d", "1606128031531-52ae98c9707a"]),
    p("crosswind-5-speed-manual", "Isuzu Crosswind 5-Speed Manual Transmission", "TRANSMISSIONS", null, "Isuzu", 28000, 2, false, ["1604910119803-eafa3ef816ce", "1567093322102-6bdd32fba67d"]),
    p("bridgestone-surplus-tire", "Bridgestone Surplus Tire", "TIRES_WHEELS", "Japan Surplus", "Bridgestone", 2200, 16, true, ["1578844251758-2f71da64c96f", "1559674697-aea453b06ea9"]),
    p("yokohama-all-terrain-tire", "Yokohama All-Terrain Surplus Tire", "TIRES_WHEELS", null, "Yokohama", 3800, 8, false, ["1571335746824-742511d49bce", "1657307913178-97cb5a4d0cd7"]),
    p("15-inch-alloy-mags", "15-inch Alloy Mag Wheels, Set of 4", "TIRES_WHEELS", "Set of 4", "Japan OEM", 12500, 2, true, ["1591117728047-2dc00780492c", "1614212680663-20d8675d8900"]),
    p("front-wheel-hub-bearing", "Front Wheel Hub Bearing Assembly", "BEARINGS", null, "Koyo", 1800, 10, false, ["1656597631672-9a3bc4d3c72f", "1643933871541-090062935680"]),
    p("rear-wheel-bearing", "Rear Wheel Bearing", "BEARINGS", null, "NSK", 1200, 12, false, ["1643933871541-090062935680", "1683308743837-e6ba8cdeb60a"]),
    p("clutch-release-bearing", "Clutch Release Bearing", "BEARINGS", null, "Koyo", 950, 6, false, ["1683308743789-4910c3d16dae", "1643933871541-090062935680"]),
    p("front-shock-absorbers-pair", "Front Shock Absorbers, Pair", "SUSPENSION", "Pair", "KYB", 3500, 4, true, ["1785338215401-51c15e4037b8", "1772308005714-976160554238"]),
    p("lower-control-arm", "Lower Control Arm", "SUSPENSION", null, "Mitsubishi OEM", 2800, 3, false, ["1760317890359-4e6bb111e501", "1537462715879-360eeb61a0ad"]),
    p("power-steering-rack", "Power Steering Rack", "SUSPENSION", null, "Toyota OEM", 7500, 1, false, ["1742741592138-d61129e7fd97", "1702146713870-8cdd7ab983fb"]),
    p("front-brake-caliper", "Front Brake Caliper", "BRAKES", null, "Toyota OEM", 3200, 4, false, ["1696494561430-de087dd0bd69", "1760317890322-364a810cd4da"]),
    p("brake-master-cylinder", "Brake Master Cylinder with Booster", "BRAKES", null, "Hyundai OEM", 4500, 2, false, ["1786028924516-b24200948a52", "1685914375421-1dbc66e5941f"]),
    p("abs-pump-module", "ABS Pump Module", "BRAKES", "Tested", "Honda OEM", 6800, 0, false, ["1702146713870-8cdd7ab983fb", "1775285157647-73f29f910216"]),
    p("alternator-12v-80a", "Alternator 12V 80A", "ELECTRICAL", "Best Seller", "Denso", 4500, 5, true, ["1786028924516-b24200948a52", "1749223673543-3c9c9100c172"]),
    p("starter-motor", "Starter Motor", "ELECTRICAL", null, "Mitsubishi Electric", 3800, 3, false, ["1597304317953-b5959920cef7", "1653491887161-aaf72d4514f3"]),
    p("engine-control-unit", "Engine Control Unit (ECU)", "ELECTRICAL", null, "Denso", 6500, 1, false, ["1517373116369-9bdb8cdc9f62", "1761507320645-b11a00bfcc34"]),
    p("headlight-assembly", "Headlight Assembly", "BODY_PARTS", null, "Koito", 4200, 4, true, ["1549207107-2704df6b92ab", "1515569067071-ec3b51335dd0"]),
    p("power-folding-side-mirror", "Power-Folding Side Mirror", "BODY_PARTS", null, "Hyundai OEM", 2500, 3, false, ["1494211448697-0e4cdf52f2af", "1471412601832-f360947f6d68"]),
    p("front-door-shell", "Front Door Shell (bare)", "BODY_PARTS", null, "Isuzu OEM", 6500, 2, false, ["1782207085087-a0a1dda3daa4", "1771402485816-c65e2ec12c8c"]),
  ];

  var peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });

  function formatPrice(n) {
    return peso.format(Number(n || 0));
  }

  function getProduct(id) {
    for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i];
    return null;
  }

  window.RoviData = { IMG: IMG, PRODUCTS: PRODUCTS, CATEGORY_LABELS: CATEGORY_LABELS, formatPrice: formatPrice, getProduct: getProduct };
})();
