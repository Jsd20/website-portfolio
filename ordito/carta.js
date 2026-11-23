(() => {
  const carta = document.querySelector('#carta');
  if (!carta) return;

  const menu = [
    {
      title: 'Antipasti',
      lead: 'Da dividere, mentre arriva il vino.',
      dishes: [
        ['Crescentine fritte', 'Mortadella, squacquerone e giardiniera di casa.', 11],
        ['Friggione alla bolognese', 'Cipolle bianche e pomodoro cotti piano, pane abbrustolito.', 9],
        ['Radicchio alla brace', 'Robiola, noci tostate e saba.', 10],
      ],
    },
    {
      title: 'Primi',
      lead: 'La sfoglia al mattarello, tirata ogni mattina.',
      dishes: [
        ['Tagliatelle al ragù', 'Sfoglia all’uovo e ragù di manzo e maiale, cotto piano.', 16],
        ['Tortellini in brodo', 'Piegati a mano, in brodo di cappone e manzo.', 18],
        ['Balanzoni verdi', 'Ricotta, mortadella e Parmigiano, al burro e salvia.', 17],
      ],
    },
    {
      title: 'Dolci',
      lead: 'Il tempo di un altro cucchiaio.',
      dishes: [
        ['Torta di riso', 'Mandorle, cedro candito e un profumo di liquore.', 7],
        ['Zuppa inglese', 'Crema, cioccolato fondente e savoiardi all’Alchermes.', 8],
        ['Fiordilatte al caramello', 'Latte intero, vaniglia e caramello ambrato.', 7],
      ],
    },
  ];

  const folio = (index) => String(index + 1).padStart(2, '0');
  const number = (index) => `${folio(index)} / ${folio(menu.length - 1)}`;
  const arrow = '<svg aria-hidden="true" viewBox="0 0 24 16" width="24" height="16" fill="none"><path d="M1 8h20M15 2l6 6-6 6" stroke="currentColor" stroke-width="1.4"/></svg>';

  carta.innerHTML = `
    <div class="carta-wrap">
      <header class="carta-heading">
        <h2>La <em>carta</em></h2>
        <p>La sfoglia si tira ogni giorno. Il resto lo decide la stagione.</p>
      </header>
      <div class="carta-tabs" role="tablist" aria-label="Sezioni della carta">
        ${menu.map(({ title }, index) => `
          <button type="button" id="carta-tab-${index}" role="tab" aria-controls="carta-panel-${index}" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}">${title}</button>
        `).join('')}
      </div>
      <div class="carta-book">
        ${menu.map(({ title, lead, dishes }, index) => `
          <div class="carta-spread" id="carta-panel-${index}" role="tabpanel" aria-labelledby="carta-tab-${index}" tabindex="0"${index === 0 ? '' : ' hidden inert'}>
            <div class="carta-leaf carta-left">
              <span class="carta-kicker" aria-hidden="true">Osteria Ordito &nbsp;·&nbsp; Bologna</span>
              <h3>${title}</h3>
              <p>${lead}</p>
              <span class="carta-impress" aria-hidden="true"></span>
              <span class="carta-paper-folio" aria-hidden="true">${number(index)}</span>
            </div>
            <div class="carta-leaf carta-right">
              <ul aria-label="Piatti e prezzi">
                ${dishes.map(([name, description, price]) => `
                  <li>
                    <div class="carta-dish"><strong>${name}</strong><span>${price} €</span></div>
                    <p>${description}</p>
                    ${name === 'Tagliatelle al ragù' ? '<button type="button" class="recipe-open" aria-haspopup="dialog">La ricetta della sfoglia</button>' : ''}
                  </li>
                `).join('')}
              </ul>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="carta-controls">
        <button type="button" class="carta-prev" aria-disabled="true">${arrow}<span>Indietro</span></button>
        <span class="carta-counter" aria-hidden="true">${number(0)}</span>
        <button type="button" class="carta-next"><span>Avanti</span>${arrow}</button>
      </div>
      <p class="carta-status" aria-live="polite" aria-atomic="true"></p>
    </div>
  `;

  const book = carta.querySelector('.carta-book');
  const recipe = document.querySelector('#ricetta');
  const recipeButton = book.querySelector('.recipe-open');
  recipeButton.addEventListener('click', () => recipe.showModal());
  recipe.querySelector('.recipe-close').addEventListener('click', () => recipe.close());
  recipe.addEventListener('close', () => recipeButton.focus({preventScroll:true}));
  const portionButtons = [...recipe.querySelectorAll('[data-portions]')];
  const save = recipe.querySelector('.recipe-save');
  for (const button of portionButtons) button.addEventListener('click', () => {
    const n = Number(button.dataset.portions);
    for (const choice of portionButtons) choice.setAttribute('aria-pressed',String(choice===button));
    recipe.querySelector('[data-flour]').textContent = (100*n)+' g';
    recipe.querySelector('[data-eggs]').textContent = n+' uova';
    save.href = 'assets/tagliatelle-'+n+'.pdf';
    save.querySelector('small').textContent = 'PDF · '+n+' persone';
  });
  const controls = carta.querySelector('.carta-controls');
  const previous = controls.querySelector('.carta-prev');
  const next = controls.querySelector('.carta-next');
  const counter = controls.querySelector('.carta-counter');
  const status = carta.querySelector('.carta-status');
  const tabs = [...carta.querySelectorAll('[role="tab"]')];
  const panels = [...carta.querySelectorAll('[role="tabpanel"]')];
  const narrow = matchMedia('(max-width: 670px)');
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0;
  let turn = null;
  let drag = null;

  function refresh(index, announce) {
    const focusedOnPaper = panels[active].contains(document.activeElement);
    tabs[active].tabIndex = -1;
    tabs[active].setAttribute('aria-selected', 'false');
    panels[active].hidden = true;
    panels[active].inert = true;

    active = index;
    tabs[active].tabIndex = 0;
    tabs[active].setAttribute('aria-selected', 'true');
    panels[active].hidden = false;
    panels[active].inert = false;
    if (focusedOnPaper) panels[active].focus({ preventScroll: true });
    previous.setAttribute('aria-disabled', String(active === 0));
    next.setAttribute('aria-disabled', String(active === menu.length - 1));
    counter.textContent = number(active);
    status.textContent = announce ? `${menu[active].title}, pagina ${active + 1} di ${menu.length}` : '';
  }

  function copy(panel, selector) {
    const original = selector ? panels[panel].querySelector(selector) : panels[panel];
    const leaf = original.cloneNode(true);
    leaf.removeAttribute('id');
    leaf.removeAttribute('hidden');
    leaf.removeAttribute('inert');
    leaf.removeAttribute('role');
    leaf.removeAttribute('aria-labelledby');
    leaf.removeAttribute('tabindex');
    return leaf;
  }

  function clearTurn() {
    if (!turn) return;
    turn.animation?.cancel();
    turn.layer.remove();
    turn = null;
  }

  function makeTurn(index) {
    const mobile = narrow.matches;
    const forward = index > active;
    const layer = document.createElement('div');
    layer.className = `carta-turn ${forward ? 'carta-forward' : 'carta-backward'}`;
    layer.setAttribute('aria-hidden', 'true');
    layer.inert = true;
    const under = document.createElement('div');
    under.className = 'carta-under';
    const flap = document.createElement('div');
    flap.className = 'carta-flap';
    if (mobile) {
      under.append(copy(index));
      const front = copy(active);
      front.classList.add('carta-front');
      flap.append(front);
    } else {
      const front = copy(active, forward ? '.carta-right' : '.carta-left');
      const back = copy(index, forward ? '.carta-left' : '.carta-right');
      front.classList.add('carta-front');
      back.classList.add('carta-back');
      under.append(copy(forward ? active : index, '.carta-left'), copy(forward ? index : active, '.carta-right'));
      flap.append(front, back);
    }
    layer.append(under, flap);
    book.append(layer);
    turn = { index, layer, flap, angle: 0, end: (mobile ? 96 : 180) * (forward ? -1 : 1) };
  }

  function pose(angle) {
    turn.angle = angle;
    turn.flap.style.transform = `rotateY(${angle}deg)`;
    turn.flap.style.setProperty('--carta-turn-shade', String(Math.sin(Math.abs(angle) * Math.PI / 180) * .18));
  }

  function finishTurn(commit, announce = true) {
    const current = turn;
    const end = commit ? current.end : 0;
    if (commit) refresh(current.index, announce);
    current.animation = current.flap.animate(
      [
        { transform: `rotateY(${current.angle}deg)`, '--carta-turn-shade': current.flap.style.getPropertyValue('--carta-turn-shade') || '0' },
        { offset: .52, '--carta-turn-shade': '.13' },
        { transform: `rotateY(${end}deg)`, '--carta-turn-shade': '0' },
      ],
      { duration: commit ? Math.max(240, 680 * (1 - Math.abs(current.angle / current.end))) : 240,
        easing: commit ? 'cubic-bezier(.21,.61,.28,1)' : 'ease-out', fill: 'forwards' },
    );
    current.animation.finished.then(() => {
      if (turn === current) clearTurn();
    }).catch(() => {});
  }

  function select(index, announce) {
    if (index < 0 || index >= menu.length || index === active) return;
    drag = null;
    clearTurn();
    if (still.matches || !book.animate) {
      refresh(index, announce);
      return;
    }
    makeTurn(index);
    finishTurn(true, announce);
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index, false));
    tab.addEventListener('keydown', (event) => {
      let target;
      switch (event.key) {
        case 'ArrowRight': target = (index + 1) % menu.length; break;
        case 'ArrowLeft': target = (index + menu.length - 1) % menu.length; break;
        case 'Home': target = 0; break;
        case 'End': target = menu.length - 1; break;
        default: return;
      }
      event.preventDefault();
      select(target, false);
      tabs[target].focus({ preventScroll: true });
    });
  });
  previous.addEventListener('click', () => select(active - 1, true));
  next.addEventListener('click', () => select(active + 1, true));

  book.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0 || !book.animate || event.target.closest('button')) return;
    clearTurn();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, target: null };
  });
  book.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const x = event.clientX - drag.x;
    const y = event.clientY - drag.y;
    if (drag.target === null) {
      if (Math.abs(y) > 14 && Math.abs(y) > Math.abs(x)) {
        drag = null;
        return;
      }
      if (Math.abs(x) < 13 || Math.abs(x) < Math.abs(y) * 1.35) return;
      const index = active + (x < 0 ? 1 : -1);
      if (index < 0 || index >= menu.length) {
        drag = null;
        return;
      }
      drag.target = index;
      book.setPointerCapture(event.pointerId);
      if (!still.matches) makeTurn(index);
    }
    const travel = x * Math.sign(active - drag.target);
    const width = book.clientWidth * (narrow.matches ? .78 : .44);
    if (turn) pose(turn.end * Math.max(0, Math.min(.94, travel / width)));
  });
  book.addEventListener('pointerup', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const { target, x } = drag;
    drag = null;
    if (target === null) return;
    const accepted = (event.clientX - x) * Math.sign(active - target) > 48;
    if (turn) finishTurn(accepted);
    else if (accepted) select(target, true);
  });
  function cancelDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    drag = null;
    if (turn) finishTurn(false);
  }
  book.addEventListener('pointercancel', cancelDrag);
  book.addEventListener('lostpointercapture', (event) => {
    if (event.target === book) cancelDrag(event);
  });
  [narrow, still].forEach((query) => query.addEventListener('change', () => {
    drag = null;
    clearTurn();
  }));
})();
