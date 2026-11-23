(() => {
  const translations = {
    en: {
      skip: 'Skip to content', navigation: 'Main navigation', story: 'Our story', menu: 'The menu',
      visit: 'Visit us', reserve: 'Reserve a table', location: 'Greve in Chianti, Tuscany',
      exploreMenu: 'Explore the menu', scroll: 'Scroll to discover', gallery: 'Restaurant photographs',
      previous: 'Previous photograph', next: 'Next photograph', storyLine: 'It starts with', storyItalic: 'the embers.',
      storyBody: 'Before the first table is laid, oak logs are already burning in our hearth. On the workbench, sheets of pasta wait for the knife. This is how an evening at Brasca begins.',
      findTable: 'Find our table', roomCaption: 'La sala, before service', roomAlt: 'Linen-covered tables beside the glowing oven in the dining room',
      visitLine: 'An evening', visitItalic: 'in Chianti.', where: 'Where', region: 'Tuscany, Italy', dinner: 'Dinner',
      days: 'Wednesday to Sunday', top: 'Back to top', concept: 'A fictional restaurant concept',
      open: 'Open navigation', close: 'Close navigation', notebook: 'From the kitchen notebook',
      pastaBody: 'The ragù takes the afternoon. The ribbons take a knife, a floured board and a little practice. Here’s how we make the pasta.',
      pastaAlt: 'Wide ribbons of pappardelle dressed with slow-braised ragù', notes: 'Our pasta notes',
      yield: 'For two · 200 g tipo 00 flour · 2 large eggs',
      dough: 'Make a well in the flour and beat the eggs in the centre. Work in the flour, then knead until smooth, about 10 minutes.',
      rest: 'Cover and rest for 30 minutes. Divide in two and roll each piece into a thin sheet.',
      cut: 'Dust with flour, fold loosely and cut into ribbons about 2 cm wide. Unfold and cook in salted boiling water until just tender.'
    },
    it: {
      skip: 'Vai al contenuto', navigation: 'Navigazione principale', story: 'La storia', menu: 'Il menu',
      visit: 'Dove siamo', reserve: 'Prenota un tavolo', location: 'Greve in Chianti, Toscana',
      exploreMenu: 'Scopri il menu', scroll: 'Scorri per scoprire', gallery: 'Fotografie del ristorante',
      previous: 'Fotografia precedente', next: 'Fotografia successiva', storyLine: 'Si comincia', storyItalic: 'dalla brace.',
      storyBody: 'Prima di apparecchiare i tavoli, accendiamo la legna di quercia. Sul banco, le sfoglie di pasta aspettano il coltello. Da Brasca la sera comincia così.',
      findTable: 'Come trovarci', roomCaption: 'La sala, prima del servizio', roomAlt: 'Tavoli con tovaglie di lino accanto al forno acceso in sala',
      visitLine: 'Una sera', visitItalic: 'in Chianti.', where: 'Dove', region: 'Toscana, Italia', dinner: 'A cena',
      days: 'Da mercoledì a domenica', top: 'Torna in alto', concept: 'Un ristorante immaginario',
      open: 'Apri la navigazione', close: 'Chiudi la navigazione', notebook: 'Dal quaderno di cucina',
      pastaBody: 'Per il ragù ci vuole un pomeriggio. Per le pappardelle, un coltello, una spianatoia infarinata e un po’ di mestiere. Ecco come facciamo la sfoglia.',
      pastaAlt: 'Pappardelle larghe condite con ragù di cinghiale a cottura lenta', notes: 'Appunti sulla sfoglia',
      yield: 'Per due · 200 g di farina 00 · 2 uova grandi',
      dough: 'Disponete la farina a fontana e sbattete le uova al centro. Incorporate la farina e impastate per circa 10 minuti, fino a ottenere un panetto liscio.',
      rest: 'Coprite e lasciate riposare per 30 minuti. Dividete il panetto a metà e tirate due sfoglie sottili.',
      cut: 'Infarinate, ripiegate le sfoglie senza stringere e tagliate strisce larghe circa 2 cm. Apritele e cuocetele in acqua bollente salata finché saranno al dente.'
    }
  };
  const scenes = [
    {en: ['A table', 'by the fire.', 'Wood-fired Tuscan cooking, handmade pasta', 'and the quiet rhythm of the Chianti hills.', 'The hearth'],
      it: ['A tavola', 'con il fuoco.', 'Cucina toscana alla brace, pasta fatta a mano', 'e il ritmo lento delle colline del Chianti.', 'La brace']},
    {en: ['Flour, eggs', 'and hands.', 'Wide ribbons of pappardelle, cut fresh', 'for a ragù that simmers all afternoon.', 'La pasta'],
      it: ['Farina, uova', 'e mani.', 'Pappardelle tagliate al coltello per un ragù', 'che cuoce piano tutto il pomeriggio.', 'La pasta']},
    {en: ['Stay a', 'little longer.', 'A linen tablecloth, another glass of Chianti', 'and the last glow from the oven.', 'The room'],
      it: ['Ancora', 'un momento.', 'Una tovaglia di lino, un altro calice di Chianti', 'e l’ultimo bagliore del forno.', 'La sala']}
  ];
  const select = selector => document.querySelector(selector);
  const images = [...document.querySelectorAll('.scene')];
  const mobileNav = select('#mobile-nav');
  const hamburger = select('.hamburger');
  let language = 'en';
  let slide = 0;
  const showScene = () => {
    const [first, italic, line1, line2, name] = scenes[slide][language];
    select('#title-line').textContent = first;
    select('#title-italic').textContent = italic;
    const br = document.createElement('br');
    br.className = 'desktop-br';
    select('#hero-lead').replaceChildren(line1, br, ' ' + line2);
    select('#scene-name').textContent = name;
    select('#scene-num').textContent = String(slide + 1).padStart(2, '0');
    images.forEach((image, index) => image.classList.toggle('current', index === slide));
    select('.hero').classList.toggle('alt-scene', slide > 0);
  };
  const toggleMenu = open => {
    mobileNav.hidden = !open;
    hamburger.setAttribute('aria-expanded', String(open));
    hamburger.setAttribute('aria-label', translations[language][open ? 'close' : 'open']);
  };
  function setLanguage(next, persist) {
    language = next;
    document.documentElement.lang = next;
    const labels = translations[next];
    document.querySelectorAll('[data-t]').forEach(el => {el.textContent = labels[el.dataset.t]});
    document.querySelectorAll('[data-label]').forEach(el => {el.setAttribute('aria-label', labels[el.dataset.label])});
    document.querySelectorAll('[data-alt]').forEach(el => {el.alt = labels[el.dataset.alt]});
    select('#lang-en').classList.toggle('chosen', next === 'en');
    select('#lang-it').classList.toggle('chosen', next === 'it');
    select('#lang').setAttribute('aria-label', next === 'en' ? 'Passa all’italiano' : 'Switch to English');
    toggleMenu(!mobileNav.hidden);
    showScene();
    window.dispatchEvent(new CustomEvent('languagechange'));
    if (persist) {try {localStorage.setItem('brasca-lang', next)} catch {}}
  }
  try {if (localStorage.getItem('brasca-lang') === 'it') language = 'it'} catch {}
  setLanguage(language, false);
  select('#lang').addEventListener('click', () => setLanguage(language === 'en' ? 'it' : 'en', true));
  function changeScene(direction) {
    slide = (slide + direction + scenes.length) % scenes.length;
    showScene();
  }
  select('.prev').addEventListener('click', () => changeScene(-1));
  select('.next').addEventListener('click', () => changeScene(1));
  hamburger.addEventListener('click', () => toggleMenu(mobileNav.hidden));
  mobileNav.addEventListener('click', event => {if (event.target.closest('a,button')) toggleMenu(false)});
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !mobileNav.hidden) {toggleMenu(false); hamburger.focus()}
  });
  document.addEventListener('click', event => {if (!mobileNav.hidden && !event.target.closest('.mast')) toggleMenu(false)});
  matchMedia('(min-width:721px)').addEventListener('change', event => {if (event.matches) toggleMenu(false)});
})();
