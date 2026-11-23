(() => {
  const oven = document.getElementById('forno');
  if (!oven) return;

  oven.innerHTML = `
    <div class="lunaria-forno__scene" aria-hidden="true"><canvas></canvas></div>
    <div class="lunaria-forno__inner">
      <div class="lunaria-forno__copy">
        <p class="lunaria-forno__eyebrow">La cottura</p>
        <h2 class="lunaria-forno__title">Il forno <em>a legna.</em></h2>
        <ol class="lunaria-forno__steps" aria-label="Fasi della cottura" role="list">
          <li>Inforna</li><li>Gira</li><li>Sforna</li>
        </ol>
        <p class="lunaria-forno__message" role="status" aria-atomic="true"></p>
        <div class="lunaria-forno__actions">
          <button type="button" class="lunaria-forno__primary">Inforna la pizza</button>
          <button type="button" class="lunaria-forno__reset" hidden>Ricomincia</button>
        </div>
      </div>
    </div>`;

  const pizzas = {
    margherita: { name: 'Margherita Lunaria', source: './assets/margherita.webp' },
    oro: { name: 'Oro del Vesuvio', source: './assets/oro.webp' },
    selva: { name: 'Selva', source: './assets/selva.webp' },
  };
  const phases = [
    { label: 'Inforna la pizza', busy: 'La pala entra', duration: 1320 },
    { label: 'Gira la pizza', busy: 'La pizza gira', duration: 1260 },
    { label: 'Sforna la pizza', busy: 'La pizza esce', duration: 1180 },
    { label: 'Prenota un tavolo' },
  ];

  const scene = oven.querySelector('.lunaria-forno__scene');
  const canvas = scene.querySelector('canvas');
  const context = canvas.getContext('2d');
  const message = oven.querySelector('.lunaria-forno__message');
  const primary = oven.querySelector('.lunaria-forno__primary');
  const reset = oven.querySelector('.lunaria-forno__reset');
  const steps = Array.from(oven.querySelectorAll('.lunaria-forno__steps li'));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileLayout = window.matchMedia('(max-width: 760px)');
  const referenceWidth = 1750;
  const referenceHeight = 876;
  const flameRegion = { x: 1160, y: 0, width: 590, height: 535 };
  const flameLayer = document.createElement('canvas');
  flameLayer.width = 300;
  flameLayer.height = 270;
  const flameContext = flameLayer.getContext('2d');
  const spriteLayer = document.createElement('canvas');
  spriteLayer.width = 460;
  spriteLayer.height = 460;
  const spriteContext = spriteLayer.getContext('2d');

  let phase = 0;
  let animation = null;
  let selected = getSelectedPizza();
  let cleanPlate = null;
  let frame = 0;
  let visible = !('IntersectionObserver' in window);
  let lastPaint = -Infinity;
  let view = null;

  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const blend = (start, end, progress) => start + (end - start) * progress;
  const smooth = (progress) => {
    const p = clamp(progress, 0, 1);
    return p * p * (3 - 2 * p);
  };
  const camera = { start: { x: 1190, y: 698, w: 625, h: 278, angle: -.14 },
    floor: { x: 1181, y: 550, w: 582, h: 183, angle: -.05 },
    plate: { x: 1172, y: 660, w: 680, h: 327, angle: 2.8 } };
  const sparks = Array.from({ length: 19 }, (_, i) => ({
    period: 2.4 + (i * 13 % 19) / 6,
    offset: i * 1.849,
    x: 1350 + i * 91 % 375,
    y: 395 + i * 19 % 109,
    drift: 35 + i * 37 % 190,
    rise: 140 + i * 67 % 340,
    radius: .6 + i * 13 % 17 / 11,
  }));

  function getSelectedPizza() {
    return Object.hasOwn(pizzas, document.body.dataset.pizzaKey) ? document.body.dataset.pizzaKey : 'margherita';
  }

  function loadImage(source) {
    return new Promise((resolve) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = source;
    });
  }

  function updateControls() {
    oven.dataset.fase = ['inforna', 'gira', 'sforna', 'pronta'][phase];
    steps.forEach((step, index) => {
      step.toggleAttribute('data-done', index < phase);
      if (index === phase) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
    const title = pizzas[selected].name;
    const descriptions = [
      `<strong>${title}</strong> è sulla pala. Guidala sulla pietra calda.`,
      'Un lato del cornicione prende colore. Gira la pizza per cuocere anche l’altro.',
      'Il cornicione è dorato. Riprendi la pizza con la pala e portala fuori dal forno.',
      `<strong>${title}</strong>, appena sfornata. Il profumo dal vivo è tutta un’altra cosa.`,
    ];
    message.innerHTML = descriptions[phase];
    primary.textContent = phases[phase].label;
    primary.removeAttribute('aria-disabled');
    primary.toggleAttribute('data-prenota', phase === 3);
    reset.hidden = phase !== 3;
  }

  function finishMotion() {
    if (!animation) return;
    phase = animation.step + 1;
    animation = null;
    updateControls();
  }

  function updateView() {
    const width = scene.clientWidth;
    const height = scene.clientHeight;
    if (!width || !height) return;
    const density = Math.min(window.devicePixelRatio || 1, 1.65);
    const pixelWidth = Math.round(width * density);
    const pixelHeight = Math.round(height * density);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const scale = Math.max(pixelWidth / referenceWidth, pixelHeight / referenceHeight);
    const target = mobileLayout.matches ? .5 : .688;
    view = {
      scale,
      x: clamp(pixelWidth * target - camera.floor.x * scale, pixelWidth - referenceWidth * scale, 0),
      y: (pixelHeight - referenceHeight * scale) * .54,
    };
    requestPaint();
  }

  function paintFlame(time) {
    if (!flameContext) return;
    const { x, y, width, height } = flameRegion;
    const layerWidth = flameLayer.width;
    const layerHeight = flameLayer.height;
    const sourceScaleX = cleanPlate.naturalWidth / referenceWidth;
    const sourceScaleY = cleanPlate.naturalHeight / referenceHeight;

    flameContext.clearRect(0, 0, layerWidth, layerHeight);
    for (let line = 0; line < layerHeight; line += 9) {
      const depth = line / layerHeight;
      const offset = (Math.sin(time * 7 + depth * 18) * 1.6 + Math.sin(time * 11 + depth * 41) * .75) * (1 - depth * depth);
      const slice = Math.min(9, layerHeight - line);
      flameContext.drawImage(cleanPlate, x * sourceScaleX, (y + height * depth) * sourceScaleY,
        width * sourceScaleX, height * slice / layerHeight * sourceScaleY,
        offset, line, layerWidth, slice);
    }

    flameContext.globalCompositeOperation = 'destination-in';
    const mask = flameContext.createRadialGradient(layerWidth * .85, -30, 20, layerWidth * .85, -30, layerWidth * .95);
    mask.addColorStop(0, 'rgba(0,0,0,.94)');
    mask.addColorStop(.46, 'rgba(0,0,0,.76)');
    mask.addColorStop(1, 'rgba(0,0,0,0)');
    flameContext.fillStyle = mask;
    flameContext.fillRect(0, 0, layerWidth, layerHeight);
    flameContext.globalCompositeOperation = 'source-over';
    context.drawImage(flameLayer, x, y, width, height);

    const glow = context.createRadialGradient(1570, 358, 8, 1570, 358, 535);
    const intensity = .065 + .019 * Math.sin(time * 5) + .012 * Math.sin(time * 11);
    glow.addColorStop(0, `rgba(247,86,16,${intensity})`);
    glow.addColorStop(.45, `rgba(218,66,14,${intensity * .54})`);
    glow.addColorStop(1, 'rgba(205,62,9,0)');
    context.save();
    context.globalCompositeOperation = 'screen';
    context.fillStyle = glow;
    context.fillRect(1035, 0, 715, referenceHeight);
    context.restore();

    for (const spark of sparks) {
      const age = ((time + spark.offset) % spark.period) / spark.period;
      const sx = spark.x - spark.drift * age + Math.sin(age * 10 + spark.offset) * age * 14;
      const sy = spark.y - spark.rise * age;
      const light = Math.sin(Math.PI * age) ** 1.25 * (.54 + .39 * Math.sin(age * 29 + spark.offset) ** 2);
      context.strokeStyle = `rgba(246,119,31,${light * .56})`;
      context.lineWidth = spark.radius * 1.3;
      context.beginPath();
      context.moveTo(sx + spark.radius * 2, sy + spark.radius * 4);
      context.lineTo(sx, sy);
      context.stroke();
      context.fillStyle = `rgba(255,214,139,${light})`;
      context.beginPath();
      context.arc(sx, sy, spark.radius, 0, Math.PI * 2);
      context.fill();
    }
  }

  function mixPose(start, end, progress) {
    return {
      x: blend(start.x, end.x, progress), y: blend(start.y, end.y, progress),
      w: blend(start.w, end.w, progress), h: blend(start.h, end.h, progress),
      angle: blend(start.angle, end.angle, progress),
    };
  }

  function ovenPose(time) {
    const { start, floor, plate } = camera;
    const turned = { ...floor, angle: 2.8 };
    if (!animation) {
      const pizza = [start, floor, turned, plate][phase];
      return { pizza, peel: pizza, steel: phase === 0 || phase === 3 ? 1 : 0 };
    }

    const progress = clamp((time - animation.start) / phases[phase].duration, 0, 1);
    if (phase === 0) {
      const pizza = mixPose(start, floor, smooth(progress / .65));
      pizza.x -= Math.sin(smooth(progress / .65) * Math.PI) * 27;
      const pull = smooth((progress - .59) / .41);
      return { pizza, peel: { ...pizza, x: pizza.x + 100 * pull, y: pizza.y + 275 * pull }, steel: 1 - pull };
    }
    if (phase === 1) {
      const slide = progress < .50 ? smooth(progress / .34) : 1 - smooth((progress - .70) / .30);
      const turn = smooth((progress - .22) / .52);
      const lift = Math.sin(turn * Math.PI);
      const pizza = { ...floor, x: floor.x - lift * 24, y: floor.y - lift * 18, angle: blend(floor.angle, turned.angle, turn) };
      return { pizza, peel: { ...pizza, x: pizza.x + (1 - slide) * 125, y: pizza.y + (1 - slide) * 230 }, steel: slide };
    }

    const slide = smooth(progress / .35);
    const pull = smooth((progress - .32) / .68);
    const pizza = mixPose(turned, plate, pull);
    pizza.y -= 19 * slide * (1 - pull);
    return { pizza, peel: { ...pizza, x: pizza.x + (1 - slide) * 100, y: pizza.y + (1 - slide) * 270 }, steel: slide };
  }

  function paintPeel(pose, opacity) {
    if (opacity <= 0) return;
    context.save();
    context.translate(pose.x + pose.w * .038, pose.y + pose.h * .15);
    context.rotate(.035);
    context.scale(pose.w / 625, pose.h / 278);
    context.globalAlpha = opacity;

    const metal = context.createLinearGradient(173, 74, 143, 106);
    metal.addColorStop(0, '#503423');
    metal.addColorStop(.23, '#daa06f');
    metal.addColorStop(.49, '#705c4f');
    metal.addColorStop(.76, '#261813');
    metal.addColorStop(1, '#0e0807');
    context.strokeStyle = '#130b08';
    context.lineWidth = 41;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(136, 92);
    context.lineTo(526, 379);
    context.stroke();
    context.strokeStyle = metal;
    context.lineWidth = 31;
    context.stroke();

    const blade = context.createLinearGradient(-225, -78, 230, 136);
    blade.addColorStop(0, '#2e2420');
    blade.addColorStop(.31, '#927156');
    blade.addColorStop(.55, '#482f22');
    blade.addColorStop(.72, '#b08863');
    blade.addColorStop(1, '#533b2b');
    context.fillStyle = blade;
    context.strokeStyle = '#423024';
    context.lineWidth = 6;
    context.beginPath();
    context.moveTo(-283, 47);
    context.bezierCurveTo(-343, 11, -320, -66, -230, -91);
    context.bezierCurveTo(-113, -139, 130, -122, 252, -75);
    context.bezierCurveTo(361, -36, 331, 50, 235, 90);
    context.bezierCurveTo(105, 144, -157, 122, -283, 47);
    context.closePath();
    context.fill();
    context.stroke();

    context.save();
    context.clip();
    context.strokeStyle = 'rgba(236,177,128,.18)';
    context.lineWidth = 1.15;
    context.beginPath();
    for (let i = 0; i < 18; i++) {
      const y = -106 + i * 13;
      context.moveTo(-309 + i * 23 % 64, y);
      context.lineTo(298 - i * 61 % 103, y + 33);
    }
    context.stroke();
    context.restore();

    context.beginPath();
    context.moveTo(-295, 39);
    context.bezierCurveTo(-170, 114, 94, 141, 230, 87);
    context.strokeStyle = 'rgba(237,176,118,.65)';
    context.lineWidth = 2.5;
    context.stroke();
    context.restore();
  }

  function paintPizza(pose, steel) {
    const image = pizzas[selected].image;
    if (!spriteContext || !image) return;

    context.save();
    context.translate(pose.x, pose.y + pose.h * .27);
    context.scale(pose.w * .57, pose.h * .31);
    const shadow = context.createRadialGradient(0, 0, .34, 0, 0, 1);
    shadow.addColorStop(0, `rgba(22,8,4,${.72 - steel * .13})`);
    shadow.addColorStop(1, 'rgba(22,8,4,0)');
    context.fillStyle = shadow;
    context.fillRect(-1, -1, 2, 2);
    context.restore();

    const size = spriteLayer.width;
    spriteContext.clearRect(0, 0, size, size);
    spriteContext.save();
    spriteContext.translate(size / 2, size / 2);
    spriteContext.rotate(pose.angle);
    const margin = size * .025;
    spriteContext.drawImage(image, -size / 2 + margin, -size / 2 + margin, size - 2 * margin, size - 2 * margin);
    spriteContext.restore();

    const light = spriteContext.createLinearGradient(0, size * .65, size, size * .20);
    light.addColorStop(0, 'rgba(49,14,13,.57)');
    light.addColorStop(.45, 'rgba(92,29,16,.23)');
    light.addColorStop(.74, 'rgba(195,77,16,.17)');
    light.addColorStop(1, 'rgba(255,156,55,.32)');
    spriteContext.globalCompositeOperation = 'source-atop';
    spriteContext.fillStyle = light;
    spriteContext.fillRect(0, 0, size, size);
    spriteContext.globalCompositeOperation = 'source-over';
    context.drawImage(spriteLayer, pose.x - pose.w / 2, pose.y - pose.h / 2, pose.w, pose.h);
  }

  function requestPaint() {
    if (!frame && visible && !document.hidden && cleanPlate && context && view) {
      frame = requestAnimationFrame(paint);
    }
  }

  function paint(time) {
    frame = 0;
    if (!visible || document.hidden || !cleanPlate || !view) return;
    if (animation && (reduceMotion.matches || time - animation.start >= phases[phase].duration)) finishMotion();

    if (time - lastPaint >= 21 || reduceMotion.matches) {
      const { scale, x, y } = view;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(scale, 0, 0, scale, x, y);
      context.drawImage(cleanPlate, 0, 0, referenceWidth, referenceHeight);
      if (!reduceMotion.matches) paintFlame(time / 1000);
      const { pizza, peel, steel } = ovenPose(time);
      if (pizzas[selected].image) paintPeel(peel, steel);
      paintPizza(pizza, steel);
      lastPaint = time;
    }

    if (!reduceMotion.matches) requestPaint();
  }

  function checkVisibility() {
    if (!visible || document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      finishMotion();
    } else {
      requestPaint();
    }
  }

  primary.addEventListener('click', (event) => {
    if (phase === 3) return;
    // A motion-free extraction can expose the booking trigger during this click.
    event.stopPropagation();
    if (animation) return;
    animation = { step: phase, start: performance.now() };
    if (reduceMotion.matches || !cleanPlate || !context || !visible || document.hidden) {
      finishMotion();
    } else {
      primary.textContent = phases[phase].busy;
      primary.setAttribute('aria-disabled', 'true');
    }
    requestPaint();
  });

  reset.addEventListener('click', () => {
    phase = 0;
    updateControls();
    primary.focus();
    requestPaint();
  });

  document.addEventListener('lunaria:pizza', () => {
    const next = getSelectedPizza();
    if (next === selected) return;
    selected = next;
    phase = 0;
    animation = null;
    updateControls();
    requestPaint();
  });
  document.addEventListener('visibilitychange', checkVisibility);
  reduceMotion.addEventListener('change', () => {
    if (reduceMotion.matches) finishMotion();
    requestPaint();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      checkVisibility();
    }).observe(scene);
  }
  if ('ResizeObserver' in window) new ResizeObserver(updateView).observe(scene);
  window.addEventListener('resize', updateView, { passive: true });

  updateControls();
  updateView();
  loadImage('./assets/forno-vuoto.webp').then((image) => {
    cleanPlate = image;
    requestPaint();
  });
  for (const pizza of Object.values(pizzas)) {
    loadImage(pizza.source).then((image) => {
      pizza.image = image;
      requestPaint();
    });
  }
})();
