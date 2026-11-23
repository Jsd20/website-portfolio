(() => {
  'use strict';

  const copy = {
    en: {
      reservation: 'Reservations', choose: 'Find your table', guestTitle: 'Who’s joining us?',
      saved: 'Your table is saved', cancelTitle: 'Cancel your reservation?',
      preview: 'This is a demo. Your reservation is saved on this device only.',
      temporary: 'This browser cannot save the demo reservation. It will last until you leave this page.',
      hours: 'Wednesday–Sunday · 19:00–22:00', date: 'Date', guests: 'Guests', time: 'Time',
      select: 'Choose a time', next: 'Continue', back: 'Back', guest: 'guest', plural: 'guests',
      name: 'Name or initials', placeholder: 'e.g. Alex', save: 'Save reservation',
      cancel: 'Cancel reservation', keep: 'Keep reservation', confirm: 'Yes, cancel',
      cancelDetail: 'This will remove the demo reservation from this device.',
      done: 'Done', close: 'Close', closed: 'We’re closed on Mondays and Tuesdays. Please choose another date.',
      past: 'Please choose today or a future date.', exhausted: 'There are no more seatings tonight. Please choose another date.',
      invalid: 'Please choose an evening date.', needed: 'Please enter a name or initials.',
      step: 'Step', of: 'of', chooseTime: 'Please choose an available time.', deleted: 'Reservation canceled.'
    },
    it: {
      reservation: 'Prenotazioni', choose: 'Scegli il tuo tavolo', guestTitle: 'A che nome prenotiamo?',
      saved: 'Prenotazione salvata', cancelTitle: 'Annullare la prenotazione?',
      preview: 'Questa è una demo. La prenotazione viene salvata solo su questo dispositivo.',
      temporary: 'Il browser non può salvare la prenotazione demo. Resterà disponibile finché questa pagina è aperta.',
      hours: 'Mercoledì–domenica · 19:00–22:00', date: 'Data', guests: 'Ospiti', time: 'Orario',
      select: 'Scegli un orario', next: 'Continua', back: 'Indietro', guest: 'ospite', plural: 'ospiti',
      name: 'Nome o iniziali', placeholder: 'es. Alex', save: 'Salva prenotazione',
      cancel: 'Annulla prenotazione', keep: 'Mantieni prenotazione', confirm: 'Sì, annulla',
      cancelDetail: 'La prenotazione demo verrà rimossa da questo dispositivo.',
      done: 'Chiudi', close: 'Chiudi', closed: 'Siamo chiusi il lunedì e il martedì. Scegli un’altra data.',
      past: 'Scegli oggi o una data futura.', exhausted: 'Per stasera non ci sono altri orari. Scegli un’altra data.',
      invalid: 'Scegli una data per la cena.', needed: 'Inserisci un nome o le iniziali.',
      step: 'Passaggio', of: 'di', chooseTime: 'Scegli un orario disponibile.', deleted: 'Prenotazione annullata.'
    }
  };
  const slots = ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'];
  const key = 'brasca.demoReservation.v1';
  const clock = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const language = () => document.documentElement.lang.toLowerCase().startsWith('it') ? 'it' : 'en';
  const words = () => copy[language()];
  const escape = value => String(value).replace(/[&<>"']/g, ch =>
    ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));
  function localNow() {
    const parts = Object.fromEntries(clock.formatToParts(new Date()).map(p => [p.type, p.value]));
    return { day: parts.year + '-' + parts.month + '-' + parts.day, time: parts.hour + ':' + parts.minute };
  }
  function evening(day) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
    const date = new Date(day + 'T12:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day ? date : null;
  }
  function availability(day, now = localNow()) {
    const date = evening(day);
    if (!date) return { error: 'invalid' };
    if (day < now.day) return { error: 'past' };
    if ([1, 2].includes(date.getUTCDay())) return { error: 'closed' };
    const times = day === now.day ? slots.filter(slot => slot > now.time) : slots;
    return times.length ? { times } : { error: 'exhausted' };
  }
  function defaultDay() {
    const now = localNow();
    const day = evening(now.day);
    while (true) {
      const iso = day.toISOString().slice(0, 10);
      if (availability(iso, now).times) return iso;
      day.setUTCDate(day.getUTCDate() + 1);
    }
  }
  function validRecord(record) {
    return record && evening(record.day) && slots.includes(record.time) &&
      Number.isInteger(record.party) && record.party >= 1 && record.party <= 8 &&
      typeof record.name === 'string' && record.name.trim() && record.name.length <= 60;
  }
  let temporary = false;
  let memory = null;
  function read() {
    if (temporary) return memory;
    try {
      const item = JSON.parse(localStorage.getItem(key));
      memory = validRecord(item) ? item : null;
    } catch { temporary = true; }
    return memory;
  }
  function save(record) {
    memory = record;
    try {
      if (record) localStorage.setItem(key, JSON.stringify(record));
      else localStorage.removeItem(key);
      temporary = false;
    } catch { temporary = true; }
  }

  const dialog = document.createElement('dialog');
  dialog.className = 'br-book';
  dialog.setAttribute('aria-labelledby', 'br-book-title');
  document.body.append(dialog);
  let panel, draft, record, opener, notice;
  const arrow = '<svg aria-hidden="true" width="17" height="15" viewBox="0 0 17 15" fill="none"><path d="M1 7.5h14m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.45"/></svg>';
  const x = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="m3 3 12 12M15 3 3 15" stroke="currentColor" stroke-width="1.5"/></svg>';
  function partyLabel(number) {
    return number + ' ' + (number === 1 ? words().guest : words().plural);
  }
  function summary(data, includeName) {
    const day = new Intl.DateTimeFormat(language() === 'it' ? 'it-IT' : 'en-GB',
      { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(evening(data.day));
    return '<div class="br-book__summary">' + (includeName ? '<strong>' + escape(data.name) + '</strong>' : '') +
      '<span>' + day + '</span><span>' + data.time + ' <i aria-hidden="true">·</i> ' + partyLabel(data.party) + '</span></div>';
  }
  function button(action, label, primary = false, icon = false) {
    const type = action === 'submit' ? 'submit' : 'button';
    return '<button class="br-book__' + (primary ? 'primary' : 'text') + '" type="' + type +
      '" data-br-action="' + action + '">' + label + (icon ? arrow : '') + '</button>';
  }
  function reset() {
    draft = { day: defaultDay(), party: 2, time: '', name: '' };
    panel = 'choose';
  }
  function timesMarkup() {
    const t = words();
    const { times = [], error } = availability(draft.day);
    if (!times.includes(draft.time)) draft.time = '';
    return '<fieldset class="br-book__times"><legend>' + t.time + '</legend>' +
      (error ? '<p class="br-book__error" role="status">' + t[error] + '</p>' :
      '<div class="br-book__slots">' + times.map(time =>
        '<label><input type="radio" name="br-time" required value="' + time + '"' +
        (time === draft.time ? ' checked' : '') + '><span>' + time + '</span></label>').join('') + '</div>') + '</fieldset>';
  }
  function render(focus = true) {
    const t = words();
    const creating = panel === 'choose' || panel === 'details';
    const title = ({ choose: t.choose, details: t.guestTitle, saved: t.saved, cancel: t.cancelTitle })[panel];
    let html = '';
    if (panel === 'choose') {
      html = '<p class="br-book__hours">' + t.hours + '</p><div class="br-book__row">' +
        '<label>' + t.date + '<input required id="br-book-day" type="date" min="' + localNow().day + '" value="' +
        escape(draft.day) + '"></label><label>' + t.guests + '<select id="br-book-party">' +
        Array.from({length: 8}, (_, i) => i + 1).map(n => '<option value="' + n + '"' +
        (n === draft.party ? ' selected' : '') + '>' + partyLabel(n) + '</option>').join('') +
        '</select></label></div><div id="br-book-times">' + timesMarkup() + '</div>' +
        '<div class="br-book__actions">' + button('submit', t.next, true, true) + '</div>';
    } else if (panel === 'details') {
      html = summary(draft, false) + '<label>' + t.name + '<input id="br-book-name" required type="text" maxlength="60" autocomplete="off" placeholder="' +
        t.placeholder + '" value="' + escape(draft.name) + '"></label><div class="br-book__actions">' +
        button('back', t.back) + button('submit', t.save, true, true) + '</div>';
    } else {
      html = (panel === 'cancel' ? '<p class="br-book__hours">' + t.cancelDetail + '</p>' : '') + summary(record, true) +
        '<div class="br-book__actions">' + (panel === 'saved' ? button('cancel', t.cancel) + button('close', t.done, true) :
        button('remove', t.confirm) + button('keep', t.keep, true)) + '</div>';
    }
    dialog.innerHTML = '<div class="br-book__body"><button data-br-action="close" class="br-book__close" type="button" aria-label="' + t.close + '">' + x +
      '</button><div class="br-book__eyebrow"><span aria-hidden="true"></span>' + t.reservation + '</div><h2 tabindex="-1" id="br-book-title">' + title +
      '</h2>' + (notice ? '<div class="br-book__notice" role="status">' + t[notice] + '</div>' : '') +
      '<form novalidate>' + html + '</form><div class="br-book__foot">' +
      (creating ? '<span>' + t.step + ' ' + (panel === 'choose' ? '1' : '2') + ' ' + t.of + ' 2</span>' : '') +
      '<p>' + (temporary ? t.temporary : t.preview) + '</p></div></div>';
    if (focus) dialog.querySelector('#br-book-title').focus({preventScroll: true});
  }
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-book]');
    if (!trigger || dialog.open) return;
    event.preventDefault();
    opener = trigger;
    record = read();
    notice = '';
    reset();
    if (record) panel = 'saved';
    render(false);
    dialog.showModal();
    document.documentElement.classList.add('br-book-open');
    dialog.querySelector('#br-book-title').focus({preventScroll: true});
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('br-book-open');
    const returnTarget = opener?.getClientRects().length ? opener : document.querySelector('.hamburger');
    returnTarget?.focus({preventScroll: true});
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) { dialog.close(); return; }
    const action = event.target.closest('[data-br-action]')?.dataset.brAction;
    if (!action || action === 'submit') return;
    if (action === 'close') { dialog.close(); return; }
    notice = '';
    if (action === 'back') panel = 'choose';
    if (action === 'cancel') panel = 'cancel';
    if (action === 'keep') panel = 'saved';
    if (action === 'remove') { save(null); record = null; reset(); notice = 'deleted'; }
    render();
  });
  dialog.addEventListener('input', ({target}) => {
    if (target.id === 'br-book-name') { draft.name = target.value; target.setCustomValidity(''); }
    if (target.name === 'br-time') draft.time = target.value;
    if (target.id === 'br-book-party') draft.party = Number(target.value);
  });
  dialog.addEventListener('change', ({target}) => {
    if (target.id !== 'br-book-day') return;
    draft.day = target.value;
    target.setCustomValidity('');
    dialog.querySelector('#br-book-times').innerHTML = timesMarkup();
  });
  dialog.addEventListener('submit', event => {
    event.preventDefault();
    notice = '';
    const { error, times = [] } = availability(draft.day);
    if (error || !times.includes(draft.time)) {
      panel = 'choose';
      render(false);
      const field = dialog.querySelector(error ? '#br-book-day' : '[name="br-time"]');
      field.focus();
      field.setCustomValidity(words()[error || 'chooseTime']);
      field.reportValidity();
      field.setCustomValidity('');
      return;
    }
    if (panel === 'choose') { panel = 'details'; render(); return; }
    if (panel !== 'details') return;
    draft.name = dialog.querySelector('#br-book-name').value.trim();
    if (!draft.name) {
      const name = dialog.querySelector('#br-book-name');
      name.setCustomValidity(words().needed);
      name.reportValidity();
      return;
    }
    record = { ...draft };
    save(record);
    panel = 'saved';
    render();
  });
  window.addEventListener('languagechange', () => { if (dialog.open) render(); });
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    record = read();
    if (!dialog.open) return;
    if (record) panel = 'saved';
    else if (panel === 'saved' || panel === 'cancel') reset();
    render();
  });
})();
