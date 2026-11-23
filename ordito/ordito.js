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
  const wheel = one('.crank'), timeDisplay = one('.crank-time');
  const cuts = Array.from(film.querySelectorAll('[data-cut]'));
  const step = 1 / 25; // One frame of the local 25 fps master.
  let drag = null, frameRequest = 0, pendingPosition = null, deferredSeek = null;
  const length = () => Number.isFinite(player.duration) ? player.duration : 12;
  const clock = seconds => '00:' + String(Math.floor(seconds)).padStart(2, '0');
  function showPosition(time = pendingPosition ?? player.currentTime) {
    const position = Math.min(length(), Math.max(0, time));
    if (!motion.matches || player.paused) wheel.style.setProperty('--turn', (position * 90) + 'deg');
    const whole = Math.floor(position);
    if (timeDisplay.dataset.second !== String(whole)) {
      timeDisplay.dataset.second = whole;
      timeDisplay.textContent = clock(position) + ' / ' + clock(length());
      cuts.forEach((cut,index) => {
        if (index === Math.min(2, Math.floor(position/4))) cut.setAttribute('aria-current','true');
        else cut.removeAttribute('aria-current');
      });
    }
    if (player.paused || wheel.getAttribute('aria-valuenow') !== String(whole)) {
      const value = player.paused ? +position.toFixed(2) : whole;
      wheel.setAttribute('aria-valuenow', value);
      wheel.setAttribute('aria-valuetext', value.toLocaleString('it-IT') + ' secondi');
    }
  }
  function seek(time) {
    const position = Math.min(Math.max(0,length()-step), Math.max(0,time));
    pendingPosition = position;
    // Let the decoder finish its current seek; keep only the newest gesture.
    if (player.seeking) deferredSeek = position;
    else if (!player.readyState || Math.abs(player.currentTime-position)>.001) {
      deferredSeek = null;
      player.currentTime = position;
    } else pendingPosition = null;
    showPosition(position);
    return position;
  }
  function animateWheel() {
    cancelAnimationFrame(frameRequest);
    showPosition();
    if (film.open && !player.paused && !player.ended && !motion.matches && !document.hidden)
      frameRequest = requestAnimationFrame(animateWheel);
  }
  player.addEventListener('play',animateWheel);
  player.addEventListener('seeked',() => {
    if (player.seeking) return;
    if (deferredSeek !== null) {
      const target = deferredSeek;
      deferredSeek = null;
      seek(target);
      return;
    }
    pendingPosition=null;
    showPosition();
  });
  ['timeupdate','pause','loadedmetadata','ended'].forEach(event =>
    player.addEventListener(event,() => showPosition()));
  document.addEventListener('visibilitychange',animateWheel);
  motion.addEventListener('change',animateWheel);
  cuts.forEach(button => button.addEventListener('click',() => {
    seek(Number(button.dataset.cut));
    player.play().catch(() => {});
  }));
  function angleAt(e) {
    const b = wheel.getBoundingClientRect();
    const x = e.clientX-b.left-b.width/2, y = e.clientY-b.top-b.height/2;
    return Math.hypot(x,y) < b.width*.12 ? null : Math.atan2(y,x);
  }
  wheel.addEventListener('pointerdown', e => {
    if (!e.isPrimary || e.button !== 0 || drag) return;
    player.pause();
    drag = {id:e.pointerId, angle:angleAt(e), position:pendingPosition ?? player.currentTime};
    wheel.setPointerCapture(e.pointerId);
  });
  wheel.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return;
    const angle = angleAt(e);
    if (angle !== null && drag.angle !== null) {
      const raw = angle-drag.angle;
      const delta = Math.atan2(Math.sin(raw),Math.cos(raw));
      drag.position = seek(drag.position + delta*2/Math.PI);
    }
    drag.angle = angle;
  });
  wheel.addEventListener('lostpointercapture',() => {drag=null;});
  wheel.addEventListener('keydown', e => {
    const amount = e.shiftKey ? 1 : step;
    const keys = {ArrowRight:amount,ArrowUp:amount,ArrowLeft:-amount,ArrowDown:-amount,
      PageUp:4,PageDown:-4,Home:-length(),End:length()};
    if (!(e.key in keys)) return;
    e.preventDefault(); player.pause(); seek((pendingPosition ?? player.currentTime)+keys[e.key]);
  });
  playButton.addEventListener('click', () => {
    if (!film.open) film.showModal();
    seek(0);
    player.play().catch(() => {});
  });
  one('.close-film').addEventListener('click', () => film.close());
  film.addEventListener('click', e => {
    if(e.target!==film) return;
    const box=film.getBoundingClientRect();
    if(e.clientX<box.left || e.clientX>box.right || e.clientY<box.top || e.clientY>box.bottom) film.close();
  });
  film.addEventListener('close', () => {
    player.pause(); cancelAnimationFrame(frameRequest); drag=null;
    if (film.returnValue === 'menu') {
      const primi = one('#carta-tab-1');
      primi.click(); primi.focus({preventScroll:true});
      one('#carta').scrollIntoView({block:'start'});
    } else playButton.focus({preventScroll:true});
    film.returnValue = '';
  });
  one('.film-menu').addEventListener('click', e => {
    e.preventDefault();
    film.close('menu');
  });
})();
