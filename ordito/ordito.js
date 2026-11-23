(() => {
  const shots = [
    { file:'gesto', first:'Una sera', last:'da Ordito.', text:'Prima che si apra la porta, sul banco c’è già il rumore del coltello.', alt:'Mani di sfoglina tagliano le tagliatelle sul banco infarinato.' },
    { file:'brodo', first:'Piano,', last:'il brodo.', text:'Nina avvicina la pentola al piatto. Il primo mestolo scalda la ceramica, il secondo sommerge i tortellini.', alt:'Brodo ambrato versato da una pentola di rame sui tortellini.' },
    { file:'tavola', first:'Stringiamoci', last:'un po’.', text:'Il vassoio passa di mano in mano. Sotto i portici si accendono i lampioni e qui si versa un altro dito di vino.', alt:'Un vassoio di tagliatelle passa tra gli ospiti della tavola a quadri blu.' }
  ];
  const one = selector => document.querySelector(selector);
  const buttons = Array.from(document.querySelectorAll('.chapter'));
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const loom = one('.loom');
  const image = one('#scene-photo');
  const heroCopy = one('.hero-copy');
  const threads = Array.from({length:18}, () => loom.appendChild(document.createElement('i')));
  let selected = 0;
  let painted = 0;
  let run = 0;
  let transition;

  function paint(index) {
    const next = shots[index];
    one('.cinema-frame').dataset.chapter = String(index);
    image.src = 'assets/' + next.file + '.webp';
    image.alt = next.alt;
    one('#heading-first').textContent = next.first;
    one('#heading-last').textContent = next.last;
    one('#scene-detail').textContent = next.text;
    painted = index;
  }
  function select(index, immediately = false) {
    if (selected === index && !immediately) return;
    selected = index;
    const revision = ++run;
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === index)));
    transition?.pause();
    const anime = window.anime;
    if (!anime || motion.matches || immediately) {
      if (anime) { anime.remove([image, heroCopy]); anime.set([image, heroCopy], {scale:1,translateY:0,opacity:1}); anime.set(threads, {scaleY:0}); }
      paint(index);
      return;
    }
    anime.remove([image, heroCopy]);
    anime.set(threads, {scaleY:0});
    transition = anime.timeline({autoplay:false})
      .add({targets:threads,scaleY:[0,1.04],duration:235,delay:anime.stagger(6,{from:'center'}),easing:'easeInCubic'},0)
      .add({targets:threads,scaleY:[1.04,0],duration:390,delay:anime.stagger(6,{from:'center'}),easing:'easeOutCubic',
        begin:() => {if (revision === run && painted !== index) paint(index);}},300)
      .add({targets:image,scale:[1.045,1],duration:1350,easing:'easeOutCubic'},295)
      .add({targets:heroCopy,translateY:[18,0],opacity:[.12,1],duration:530,easing:'easeOutQuad'},315);
    transition.play();
  }
  buttons.forEach((button,index) => {
    button.addEventListener('click',() => select(index));
    button.addEventListener('keydown', e => {
      let next;
      if (e.key === 'ArrowRight') next = (index+1)%buttons.length;
      if (e.key === 'ArrowLeft') next = (index+buttons.length-1)%buttons.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = buttons.length-1;
      if (next === undefined) return;
      e.preventDefault(); buttons[next].focus(); select(next);
    });
  });
  motion.addEventListener('change',() => select(selected,true));
  const frame = one('.cinema-frame');
  let start;
  frame.addEventListener('touchstart', e => {
    if (e.target.closest('button') || e.touches.length !== 1) return;
    start = [e.touches[0].clientX,e.touches[0].clientY];
  },{passive:true});
  frame.addEventListener('touchcancel',() => {start=null;});
  frame.addEventListener('touchend', e => {
    if (!start) return;
    const dx=e.changedTouches[0].clientX-start[0],dy=e.changedTouches[0].clientY-start[1];
    start=null;
    if (Math.abs(dx)>60 && Math.abs(dx)>Math.abs(dy)*1.6) select((selected+(dx<0?1:2))%3);
  },{passive:true});

  const slider = one('.time-slider');
  slider.addEventListener('input', () => {
    one('.archive').style.setProperty('--split',slider.value+'%');
    one('.photo-year.first').hidden = Number(slider.value)<13;
    one('.photo-year.last').hidden = Number(slider.value)>87;
    slider.setAttribute('aria-valuetext',slider.value+' per cento di foto storica');
  });
  const film = one('#film'), player = film.querySelector('video'), playButton = one('.film-trigger');
  playButton.addEventListener('click', () => {
    if (!film.open) film.showModal();
    player.currentTime=0;
    player.play().catch(() => {});
  });
  one('.close-film').addEventListener('click', () => film.close());
  film.addEventListener('click', e => {
    if(e.target!==film) return;
    const box=film.getBoundingClientRect();
    if(e.clientX<box.left || e.clientX>box.right || e.clientY<box.top || e.clientY>box.bottom) film.close();
  });
  film.addEventListener('close', () => {player.pause(); playButton.focus({preventScroll:true});});
})();
