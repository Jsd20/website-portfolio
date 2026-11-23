(() => {
  const root = document.getElementById('posti');
  if (!root) return;
  const tables = {
    finestra: { name: 'Alla finestra', seats: '2 persone', min: 2, max: 2, detail: 'La luce della strada, il viavai dei portici e un tavolo raccolto per due.' },
    cucina: { name: 'Vicino alla cucina', seats: '2–4 persone', min: 2, max: 4, detail: 'A pochi passi dai fuochi: arrivano i profumi prima ancora dei piatti.' },
    lungo: { name: 'Il tavolo lungo', seats: '5–8 persone', min: 5, max: 8, detail: 'Per le sere che si allungano, tra piatti da condividere e tante voci.' }
  };
  root.innerHTML = `<div class="posti-wrap">
    <div class="posti-intro"><p class="posti-kicker">La sala</p><h2>Scegli il tuo <em>posto.</em></h2><p>Ogni tavolo ha il suo modo di stare insieme. Trova quello giusto per la tua serata.</p></div>
    <div class="posti-grid"><div class="posti-plan-wrap"><div class="posti-plan-heading"><span>PIANTA DELLA SALA</span><span>BOLOGNA · PIANO TERRA</span></div>
      <div class="posti-plan" aria-label="Pianta della sala con tre tavoli selezionabili">
        <div class="posti-wall-label posti-window">FINESTRE / VIA</div><div class="posti-wall-label posti-kitchen">CUCINA</div><div class="posti-entry">INGRESSO ↗</div>
        <div class="posti-blueprint-line line-one"></div><div class="posti-blueprint-line line-two"></div>
        <button class="posti-table table-window" type="button" data-table="finestra" aria-pressed="true"><span class="posti-table-shape round"><i></i><i></i></span><span class="posti-table-label"><b>01</b> Alla finestra</span></button>
        <button class="posti-table table-kitchen" type="button" data-table="cucina" aria-pressed="false"><span class="posti-table-shape square"><i></i><i></i><i></i><i></i></span><span class="posti-table-label"><b>02</b> Vicino alla cucina</span></button>
        <button class="posti-table table-long" type="button" data-table="lungo" aria-pressed="false"><span class="posti-table-shape long"><i></i><i></i><i></i><i></i><i></i><i></i></span><span class="posti-table-label"><b>03</b> Il tavolo lungo</span></button>
        <span class="posti-compass" aria-hidden="true">N<br>↑</span>
      </div><div class="posti-plan-footer"><span>TOCCA UN TAVOLO PER SCOPRIRLO</span><span>ORDITO / BOLOGNA</span></div></div>
      <div class="posti-panel"><p class="posti-panel-index">IL TUO TAVOLO / <span data-index>01</span></p><h3 data-name>Alla finestra</h3><p class="posti-seats" data-seats>2 persone</p><p class="posti-detail" data-detail></p><div class="posti-rule"></div><p class="posti-book-title">Immagina la tua serata</p><p class="posti-note">Aperti da giovedì a lunedì, la sera. Il tuo tavolo ti aspetta alle 20:30.</p>
        <form class="posti-form">
          <div class="posti-form-item"><label for="posti-date">Data</label><span class="posti-field posti-date"><span class="posti-date-value" aria-hidden="true"></span><input id="posti-date" type="date" name="date" required></span></div>
          <div class="posti-form-item"><label for="posti-guests">Persone</label><span class="posti-field posti-party"><select id="posti-guests" name="guests" required></select></span></div>
          <p class="posti-error" role="alert" aria-live="polite"></p>
          <button class="posti-submit" type="submit">Prepara l’invito</button>
        </form>
        <p class="posti-demo">È un invito dimostrativo da salvare sul tuo dispositivo.</p>
      </div></div><div class="posti-result" hidden aria-live="polite"><div><p class="posti-kicker">UN PROMEMORIA PER TE</p><h3>Ci vediamo a tavola.</h3><p data-result></p><p>Puoi aggiungere questa serata immaginaria al tuo calendario.</p></div><button type="button" class="posti-download">Scarica il promemoria</button></div>
  </div>`;
  let selected = 'finestra';
  const form = root.querySelector('form');
  const date = form.elements.date;
  const guests = form.elements.guests;
  const error = root.querySelector('.posti-error');
  const result = root.querySelector('.posti-result');
  const pad = n => String(n).padStart(2, '0');
  const romeParts = d => Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Rome', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).formatToParts(d).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  const romeNow = () => { const p = romeParts(new Date()); return {day:`${p.year}-${p.month}-${p.day}`, minutes:Number(p.hour)*60+Number(p.minute)}; };
  const dayOfWeek = value => { const [y,m,d] = value.split('-').map(Number); return new Date(Date.UTC(y,m-1,d)).getUTCDay(); };
  const nextDay = value => { const [y,m,d] = value.split('-').map(Number); const x = new Date(Date.UTC(y,m-1,d+1)); return `${x.getUTCFullYear()}-${pad(x.getUTCMonth()+1)}-${pad(x.getUTCDate())}`; };
  const isAvailable = value => { const now = romeNow(); const weekday = dayOfWeek(value); return value >= now.day && weekday !== 2 && weekday !== 3 && !(value === now.day && now.minutes >= 20*60+30); };
  const firstAvailable = () => { let value = romeNow().day; while (!isAvailable(value)) value = nextDay(value); return value; };
  // Resolve a Rome wall-clock time using the zone offset on that date.
  const romeToUtc = (value, hour, minute) => { const [y,m,d] = value.split('-').map(Number); const wall = Date.UTC(y,m-1,d,hour,minute); let instant = wall; for (let i=0;i<3;i++) { const p = romeParts(new Date(instant)); const represented = Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute); instant += wall-represented; } return new Date(instant).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''); };
  date.min = romeNow().day; date.value = firstAvailable();
  const dateText = root.querySelector('.posti-date-value');
  const shortDate = new Intl.DateTimeFormat('it-IT', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
  });
  function displayDate() {
    dateText.textContent = date.value ? shortDate.format(new Date(date.value + 'T12:00:00Z')) : 'Scegli la data';
  }
  displayDate();
  window.addEventListener('pageshow', displayDate);
  function update(key) {
    selected = key; const t = tables[key];
    root.querySelectorAll('[data-table]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.table === key)));
    root.querySelector('[data-index]').textContent = ({finestra:'01', cucina:'02', lungo:'03'})[key];
    root.querySelector('[data-name]').textContent = t.name;
    root.querySelector('[data-seats]').textContent = t.seats;
    root.querySelector('[data-detail]').textContent = t.detail;
    guests.innerHTML = '';
    for (let n=t.min; n<=t.max; n++) guests.add(new Option(`${n} persone`, n));
    result.hidden = true; error.textContent = '';
  }
  root.querySelectorAll('[data-table]').forEach(button => button.addEventListener('click', () => update(button.dataset.table)));
  for (const event of ['input', 'change']) {
    date.addEventListener(event, () => { displayDate(); error.textContent = ''; result.hidden = true; });
  }
  guests.addEventListener('change', () => { result.hidden = true; });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const value = date.value;
    const parts = value.split('-').map(Number);
    const d = new Date(parts[0], parts[1]-1, parts[2]);
    if (!value || !isAvailable(value)) {
      error.textContent = 'Scegli una sera disponibile da giovedì a lunedì, prima delle 20:30 di oggi (ora di Bologna).'; date.focus(); return;
    }
    error.textContent = '';
    const formatted = new Intl.DateTimeFormat('it-IT', {weekday:'long', day:'numeric', month:'long', year:'numeric'}).format(d);
    root.querySelector('[data-result]').textContent = `${tables[selected].name} · ${guests.value} persone · ${formatted} · ore 20:30`;
    result.hidden = false; result.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'nearest'});
  });
  root.querySelector('.posti-download').addEventListener('click', () => {
    if (!isAvailable(date.value)) { result.hidden = true; error.textContent = 'Questa serata non è più disponibile. Scegli un’altra data.'; date.focus(); return; }
    const stamp = new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
    const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Ordito//Invito demo//IT','BEGIN:VEVENT',`UID:ordito-${Date.now()}@example.invalid`,`DTSTAMP:${stamp}`,`DTSTART:${romeToUtc(date.value,20,30)}`,`DTEND:${romeToUtc(date.value,22,30)}`,'SUMMARY:Una sera da Ordito (simulazione)',`DESCRIPTION:${tables[selected].name} - ${guests.value} persone. Questo promemoria non è una prenotazione.`,'END:VEVENT','END:VCALENDAR'];
    const url = URL.createObjectURL(new Blob([lines.join('\r\n')], {type:'text/calendar;charset=utf-8'}));
    const a = document.createElement('a'); a.href=url; a.download='invito-ordito.ics'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  update(selected);
})();
