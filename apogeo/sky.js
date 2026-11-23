(() => {
  "use strict";

  const consoleElement = document.getElementById("sky-console");
  const canvas = document.getElementById("sky");
  const context = canvas.getContext?.("2d");
  if (!context) return;

  const RAD = Math.PI / 180;
  const TAU = Math.PI * 2;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const vector = (yaw, pitch) => [
    Math.cos(pitch) * Math.cos(yaw),
    Math.sin(pitch),
    Math.cos(pitch) * Math.sin(yaw)
  ];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

  // Right ascension in hours and declination in degrees.
  const sections = {
    orione: {
      yaw: 5.59, pitch: 0, fov: 34,
      stars: [
        ["Betelgeuse", 5.92, 7.41, "La supergigante rossastra sulla spalla di Orione.", "253,170,136", [-1, -1]],
        ["Bellatrix", 5.42, 6.35, "L’altra spalla della figura, di luce bianco-azzurra.", "188,208,255", [1, -1]],
        ["Mintaka", 5.53, -.30],
        ["Alnilam", 5.60, -1.20],
        ["Alnitak", 5.68, -1.94],
        ["Saiph", 5.80, -9.67],
        ["Rigel", 5.24, -8.20, "La stella bianco-azzurra al piede di Orione.", "205,220,255", [1, 1]],
        ["Meissa", 5.59, 9.93]
      ],
      edges: [[7, 0], [7, 1], [0, 4], [1, 2], [2, 3], [3, 4], [4, 5], [2, 6], [5, 6], [0, 1]],
      featured: [0, 6, 1]
    },
    cigno: {
      yaw: 20.28, pitch: 39, fov: 43,
      stars: [
        ["Deneb", 20.69, 45.28, "La coda del Cigno e un vertice del Triangolo Estivo.", "206,222,255", [-1, -1]],
        ["Sadr", 20.37, 40.26, "Il punto in cui si incrociano le ali e l’asse del corpo.", "223,215,255", [1, -1]],
        ["Gienah", 20.77, 33.97],
        ["Delta Cygni", 19.75, 45.13],
        ["Albireo", 19.51, 27.96, "La stella dalla parte del becco. Al telescopio si separa in due luci di colore diverso.", "255,201,151", [1, 1]],
        ["Eta Cygni", 19.94, 35.08],
        ["Zeta Cygni", 21.22, 30.23],
        ["Iota Cygni", 19.50, 51.73]
      ],
      edges: [[0, 1], [1, 5], [5, 4], [3, 1], [1, 2], [2, 6], [3, 7]],
      featured: [0, 1, 4]
    },
    cassiopea: {
      yaw: 1.06, pitch: 60.6, fov: 26,
      stars: [
        ["Caph", .15, 59.15, "Una delle stelle alle estremità della W.", "216,225,255", [1, -1]],
        ["Schedar", .68, 56.54, "La stella aranciata in una delle due valli della W.", "255,198,149", [1, 1]],
        ["Gamma Cassiopeiae", .95, 60.72],
        ["Ruchbah", 1.43, 60.24, "Una stella bianca lungo il secondo tratto della W.", "212,227,255", [-1, 1]],
        ["Segin", 1.91, 63.67]
      ],
      edges: [[0, 1], [1, 2], [2, 3], [3, 4]],
      featured: [0, 1, 3]
    }
  };

  for (const section of Object.values(sections)) {
    section.view = { yaw: section.yaw * 15 * RAD, pitch: section.pitch * RAD, fov: section.fov };
    section.points = section.stars.map(([name, ra, dec, text, color, label], index) => ({
      name, position: vector(ra * 15 * RAD, dec * RAD), text, label, color: color ?? "182,200,255",
      featured: section.featured.includes(index)
    }));
  }

  let seed = 221973;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  function skyStar(position, band = false) {
    return {
      position,
      brightness: Math.pow(random(), 2.2) * (band ? .33 : .72) + .14,
      radius: Math.pow(random(), 4) * (band ? .74 : 1.23) + .27,
      tint: random() < .21 ? "181,183,254" : "211,224,255",
      phase: random() * TAU
    };
  }

  const background = Array.from({ length: 2350 }, () =>
    skyStar(vector(random() * TAU, Math.asin(random() * 2 - 1)))
  );
  const poleYaw = 12.85 * 15 * RAD;
  const polePitch = 27.1 * RAD;
  const galacticPole = vector(poleYaw, polePitch);
  const planeX = vector(poleYaw + Math.PI / 2, 0);
  const planeY = vector(poleYaw, polePitch - Math.PI / 2);

  for (let i = 0; i < 1550; i++) {
    const longitude = random() * TAU;
    const latitude = (random() + random() + random() - 1.5) * .26;
    const a = Math.cos(longitude) * Math.cos(latitude);
    const b = Math.sin(longitude) * Math.cos(latitude);
    const c = Math.sin(latitude);
    background.push(skyStar(planeX.map((axis, index) => axis * a + planeY[index] * b + galacticPole[index] * c), true));
  }

  const parallels = [];
  const meridians = [];
  for (let dec = -75; dec <= 75; dec += 15) {
    parallels.push(Array.from({ length: 91 }, (_, index) => vector(index * 4 * RAD, dec * RAD)));
  }
  for (let ra = 0; ra < 24; ra += 1) {
    meridians.push(Array.from({ length: 46 }, (_, index) => vector(ra * 15 * RAD, (-90 + index * 4) * RAD)));
  }
  const grid = parallels.concat(meridians);

  const coordinates = document.getElementById("coordinates");
  const info = document.getElementById("star-info");
  const guides = document.getElementById("guides");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const picks = [...document.querySelectorAll("[data-constellation]")];
  const pointers = new Map();
  const starButtons = new Map();
  const coordsFormat = new Intl.NumberFormat("it", { minimumIntegerDigits: 2, useGrouping: false });

  let active = "orione";
  let view = { ...sections.orione.view };
  let width = 0, height = 0, density = 1;
  let sceneVisible = false;
  let frame = 0, animation = null, twinkle = null;
  let hotspots = [], selectedStar = null, hoverPoint = null, pinchDistance = 0;

  function project(point, camera) {
    const depth = dot(point, camera.forward);
    if (depth <= .18) return null;
    return [
      width / 2 + dot(point, camera.right) * camera.focal / depth,
      height / 2 - dot(point, camera.up) * camera.focal / depth
    ];
  }

  function projector() {
    return {
      forward: vector(view.yaw, view.pitch),
      right: [Math.sin(view.yaw), 0, -Math.cos(view.yaw)],
      up: vector(view.yaw + Math.PI, Math.PI / 2 - view.pitch),
      focal: Math.min(width, height) / (2 * Math.tan(view.fov * RAD / 2))
    };
  }

  function drawGrid(camera) {
    context.lineWidth = .7;
    context.strokeStyle = "rgba(171,186,255,.12)";
    for (const line of grid) {
      let last = null;
      context.beginPath();
      for (const point of line) {
        const next = project(point, camera);
        if (next && last) context.lineTo(...next);
        else if (next) context.moveTo(...next);
        last = next;
      }
      context.stroke();
    }

    const x = width / 2, y = height / 2;
    const radius = Math.min(width, height) * .365;
    context.strokeStyle = "rgba(166,185,255,.15)";
    context.beginPath();
    context.arc(x, y, radius, 0, TAU);
    context.stroke();

    context.beginPath();
    context.strokeStyle = "rgba(176,196,255,.32)";
    for (let i = 0; i < 48; i++) {
      const theta = i / 48 * TAU;
      const outer = radius + (i % 6 === 0 ? 5 : 2);
      context.moveTo(x + Math.cos(theta) * radius, y + Math.sin(theta) * radius);
      context.lineTo(x + Math.cos(theta) * outer, y + Math.sin(theta) * outer);
    }
    context.stroke();
  }

  function glow(x, y, color, radius) {
    const light = context.createRadialGradient(x, y, 0, x, y, radius);
    light.addColorStop(0, "rgba(" + color + ",.43)");
    light.addColorStop(.28, "rgba(" + color + ",.21)");
    light.addColorStop(1, "rgba(" + color + ",0)");
    context.fillStyle = light;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function drawNames(star, x, y) {
    const [side, up] = star.label;
    const dx = side * 12;
    const dy = up * 10;
    context.lineWidth = .7;
    context.strokeStyle = "rgba(198,205,255,.52)";
    context.beginPath();
    context.moveTo(x + side * 5, y + up * 4);
    context.lineTo(x + dx, y + dy);
    context.lineTo(x + dx + side * 5, y + dy);
    context.stroke();

    context.font = (width > 420 ? "11" : "10") + "px Consolas, monospace";
    context.textAlign = side > 0 ? "left" : "right";
    context.textBaseline = "middle";
    context.fillStyle = "rgb(220,226,255)";
    context.fillText(star.name, x + dx + side * 8, y + dy);
  }

  function drawConstellation(camera) {
    hotspots = [];
    for (const [id, section] of Object.entries(sections)) {
      const focused = id === active;
      const positions = section.points.map(star => project(star.position, camera));
      if (guides.checked) {
        context.lineWidth = focused ? 1.15 : .7;
        context.strokeStyle = focused ? "rgba(160,179,254,.75)" : "rgba(137,151,216,.28)";
        context.beginPath();
        for (const [from, to] of section.edges) {
          if (positions[from] && positions[to]) {
            context.moveTo(...positions[from]);
            context.lineTo(...positions[to]);
          }
        }
        context.stroke();
      }

      positions.forEach((point, index) => {
        if (!point) return;
        const [x, y] = point;
        if (x < -20 || y < -20 || x > width + 20 || y > height + 20) return;
        const star = section.points[index];
        const important = focused && star.featured;
        glow(x, y, star.color, important ? 16 : 8);
        context.fillStyle = important ? "rgb(244,245,255)" : "rgba(" + star.color + ",.87)";
        context.beginPath();
        context.arc(x, y, important ? 2.3 : focused ? 1.62 : 1.06, 0, TAU);
        context.fill();

        if (important) {
          hotspots.push({ star, x, y });
          if (hoverPoint === star || selectedStar === star) {
            context.lineWidth = 1;
            context.strokeStyle = "rgba(222,224,255,.75)";
            context.beginPath();
            context.arc(x, y, 7, 0, TAU);
            context.stroke();
          }
          if (guides.checked || hoverPoint === star || selectedStar === star) drawNames(star, x, y);
        }
      });
    }
  }

  function updateReadout() {
    const minutes = Math.round(((view.yaw % TAU + TAU) % TAU) / TAU * 1440) % 1440;
    const dec = Math.round(view.pitch / RAD);
    coordinates.textContent = "AR " + coordsFormat.format(Math.floor(minutes / 60)) + "h " +
      coordsFormat.format(minutes % 60) + "m  ·  DEC " + (dec < 0 ? "−" : "+") +
      coordsFormat.format(Math.abs(dec)) + "°";
  }

  function draw(time) {
    frame = 0;
    if (animation) {
      const elapsed = clamp((time - animation.start) / animation.duration, 0, 1);
      const eased = elapsed < .5 ? 4 * elapsed ** 3 : 1 - (-2 * elapsed + 2) ** 3 / 2;
      const { from, to } = animation;
      view = {
        yaw: from.yaw + (to.yaw - from.yaw) * eased,
        pitch: from.pitch + (to.pitch - from.pitch) * eased,
        fov: from.fov + (to.fov - from.fov) * eased
      };
      if (elapsed === 1) animation = null;
    }

    if (width && height) {
      context.clearRect(0, 0, width, height);
      const camera = projector();
      if (guides.checked) drawGrid(camera);
      const glowTime = reducedMotion.matches ? 0 : time / 1100;
      for (const star of background) {
        const point = project(star.position, camera);
        if (!point) continue;
        const [x, y] = point;
        if (x < 0 || y < 0 || x > width || y > height) continue;
        const alpha = star.brightness * (.84 + .16 * Math.cos(glowTime + star.phase));
        context.fillStyle = "rgba(" + star.tint + "," + alpha.toFixed(2) + ")";
        context.beginPath();
        context.arc(x, y, star.radius, 0, TAU);
        context.fill();
      }
      drawConstellation(camera);
      updateReadout();
    }
    if (animation) requestRender();
  }

  function requestRender() {
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function synchronizeTwinkle() {
    if (twinkle) {
      clearInterval(twinkle);
      twinkle = null;
    }
    if (sceneVisible && !document.hidden && !reducedMotion.matches) {
      twinkle = setInterval(requestRender, 125);
    }
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    density = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * density);
    canvas.height = Math.round(height * density);
    context.setTransform(density, 0, 0, density, 0, 0);
    requestRender();
  }

  function moveTo(target, animate = true, duration = 1050) {
    if (reducedMotion.matches || !animate) {
      animation = null;
      view = { ...target };
    } else {
      const yawDelta = ((target.yaw - view.yaw + 3 * Math.PI) % TAU + TAU) % TAU - Math.PI;
      animation = {
        start: performance.now(), duration,
        from: { ...view },
        to: { ...target, yaw: view.yaw + yawDelta }
      };
    }
    requestRender();
  }

  function selectStar(star) {
    selectedStar = star;
    info.textContent = star ? star.name + " · " + star.text : "";
    for (const buttons of starButtons.values()) {
      for (const [point, button] of buttons) button.setAttribute("aria-pressed", String(star === point));
    }
    requestRender();
  }

  function choose(id, animate = true) {
    if (!sections[id]) return;
    active = id;
    selectStar(null);
    hoverPoint = null;
    canvas.classList.remove("over-star");
    for (const link of picks) {
      const selected = link.dataset.constellation === id;
      if (selected) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
      document.getElementById(link.dataset.constellation).hidden = !selected;
    }
    moveTo(sections[id].view, animate);
  }

  for (const link of picks) {
    const id = link.dataset.constellation;
    link.addEventListener("click", event => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      event.preventDefault();
      choose(id);
    });
    const panel = document.getElementById(id);
    const buttons = new Map();
    const row = document.createElement("div");
    row.className = "star-buttons";
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", "Stelle principali di " + panel.querySelector("h3").textContent);
    for (const index of sections[id].featured) {
      const star = sections[id].points[index];
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = star.name;
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => selectStar(selectedStar === star ? null : star));
      row.append(button);
      buttons.set(star, button);
    }
    panel.querySelector(".star-list").replaceWith(row);
    starButtons.set(id, buttons);
  }

  const sighting = document.querySelector("[data-sighting]");
  sighting.hash = "atlante";
  sighting.addEventListener("click", event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    choose(event.currentTarget.dataset.sighting, false);
  });

  function pan(dx, dy) {
    animation = null;
    const factor = view.fov * RAD / Math.min(width, height);
    view.yaw = (view.yaw + dx * factor / Math.max(.3, Math.cos(view.pitch)) + TAU) % TAU;
    view.pitch = clamp(view.pitch + dy * factor, -86 * RAD, 86 * RAD);
    requestRender();
  }

  function zoom(direction) {
    const target = animation?.to ?? view;
    const fov = clamp(target.fov * (direction > 0 ? .8 : 1.25), 11, 83);
    moveTo({ ...target, fov }, true, 200);
  }

  function pickStar(x, y) {
    const bounds = canvas.getBoundingClientRect();
    const localX = x - bounds.left;
    const localY = y - bounds.top;
    return hotspots.find(spot => Math.hypot(spot.x - localX, spot.y - localY) < 14)?.star ?? null;
  }

  function separation() {
    const [first, second] = pointers.values();
    return Math.hypot(first.x - second.x, first.y - second.y);
  }

  canvas.addEventListener("pointerdown", event => {
    if (event.button !== 0 || pointers.size === 2) return;
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, travel: 0 });
    if (pointers.size === 2) {
      pinchDistance = separation();
      for (const pointer of pointers.values()) pointer.travel = 10;
    }
    hoverPoint = null;
    canvas.classList.add("is-grabbing");
    animation = null;
  });

  canvas.addEventListener("pointermove", event => {
    const pointer = pointers.get(event.pointerId);
    if (!pointer) {
      hoverPoint = pickStar(event.clientX, event.clientY);
      canvas.classList.toggle("over-star", Boolean(hoverPoint));
      requestRender();
      return;
    }

    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.travel += Math.hypot(dx, dy);

    if (pointers.size === 2) {
      const distance = separation();
      if (pinchDistance > 0 && distance > 0) view.fov = clamp(view.fov * pinchDistance / distance, 11, 83);
      pinchDistance = distance;
      requestRender();
    } else if (pointer.travel > 4) {
      pan(dx, dy);
    }
  });

  function endPointer(event) {
    const pointer = pointers.get(event.pointerId);
    if (!pointer) return;
    pointers.delete(event.pointerId);
    if (!pointers.size) canvas.classList.remove("is-grabbing");
    if (event.type === "pointerup" && pointer.travel < 5) {
      const star = pickStar(event.clientX, event.clientY);
      if (star) selectStar(selectedStar === star ? null : star);
    }
  }

  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("lostpointercapture", endPointer);
  canvas.addEventListener("pointerleave", () => {
    hoverPoint = null;
    canvas.classList.remove("over-star");
    requestRender();
  });

  canvas.addEventListener("wheel", event => {
    if (document.activeElement !== canvas || event.ctrlKey || !event.deltaY) return;
    event.preventDefault();
    zoom(-Math.sign(event.deltaY));
  }, { passive: false });

  canvas.addEventListener("keydown", event => {
    const movement = {
      ArrowLeft: [24, 0], ArrowRight: [-24, 0], ArrowUp: [0, 24], ArrowDown: [0, -24]
    }[event.key];
    if (movement) pan(...movement);
    else if (event.key === "+" || event.key === "=") zoom(1);
    else if (event.key === "-" || event.key === "−") zoom(-1);
    else if (event.key === "Home" || event.key === "0") moveTo(sections[active].view);
    else return;
    event.preventDefault();
  });

  document.querySelectorAll("[data-zoom]").forEach(button => {
    button.addEventListener("click", () => zoom(Number(button.dataset.zoom)));
  });
  document.getElementById("recenter").addEventListener("click", () => moveTo(sections[active].view));
  guides.addEventListener("change", requestRender);
  document.addEventListener("visibilitychange", synchronizeTwinkle);
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches && animation) moveTo(animation.to, false);
    synchronizeTwinkle();
    requestRender();
  });

  canvas.hidden = false;
  document.getElementById("sky-fallback").hidden = true;
  consoleElement.classList.add("live-atlas");
  choose(Object.hasOwn(sections, location.hash.slice(1)) ? location.hash.slice(1) : active, false);
  resize();

  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener("resize", resize);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      sceneVisible = entry.isIntersecting;
      synchronizeTwinkle();
    }).observe(canvas);
  }
})();
