(() => {
  'use strict';

  const storageKey = 'lunaria.tavolo.v1';
  const timeZone = 'Europe/Rome';
  const eveningSlots = ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30'];
  const dateLimit = 45;
  const naplesClock = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const italianDate = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });

  function naplesNow() {
    const parts = Object.fromEntries(naplesClock.formatToParts(new Date()).map(({ type, value }) => [type, value]));
    return { day: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
  }

  function asDate(day) {
    return new Date(`${day}T12:00:00Z`);
  }

  function after(day, days) {
    const date = asDate(day);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function isMonday(day) {
    return asDate(day).getUTCDay() === 1;
  }

  function formatDate(day) {
    const formatted = italianDate.format(asDate(day));
    return formatted[0].toLocaleUpperCase('it-IT') + formatted.slice(1);
  }

  function listTimes(day, now) {
    if (!day || day < now.day || day > after(now.day, dateLimit) || isMonday(day)) return [];
    return eveningSlots.filter((slot) => day !== now.day || slot > now.time);
  }

  function readTicket() {
    try {
      const item = JSON.parse(localStorage.getItem(storageKey));
      if (item && typeof item.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.day)
        && !Number.isNaN(asDate(item.day).getTime()) && eveningSlots.includes(item.time)
        && Number.isInteger(item.guests) && item.guests >= 1 && item.guests <= 8
        && /^LN-[A-Z0-9]{6}$/.test(item.number) && typeof item.pizza === 'string'
        && item.pizza.length <= 100 && typeof item.initials === 'string' && item.initials.length <= 10) return item;
    } catch {
      // The demo still works in memory when local storage is unavailable.
    }
    return null;
  }

  function remember(ticket) {
    try {
      if (ticket) localStorage.setItem(storageKey, JSON.stringify(ticket));
      else localStorage.removeItem(storageKey);
    } catch {
      // The current session can still open, cancel and download the ticket.
    }
  }

  function nextNumber() {
    const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const bytes = new Uint8Array(6);
    globalThis.crypto.getRandomValues(bytes);
    return `LN-${Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')}`;
  }

  function escapeXml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
    })[character]).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  }

  function downloadTicket(ticket) {
    const day = escapeXml(formatDate(ticket.day));
    const party = ticket.guests === 1 ? '1 ospite' : `${ticket.guests} ospiti`;
    const label = ticket.initials ? `${party} · ${escapeXml(ticket.initials)}` : party;
    const pizza = Array.from(ticket.pizza);
    const pizzaLine = escapeXml(pizza.length > 47 ? `${pizza.slice(0, 46).join('')}…` : ticket.pizza);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="600" viewBox="0 0 1080 600" role="img" aria-labelledby="title desc">
      <title id="title">Biglietto Lunaria ${ticket.number}</title>
      <desc id="desc">${day}, ore ${ticket.time}, ${label}. Pizza scelta ${pizzaLine}. Biglietto dimostrativo.</desc>
      <defs>
        <pattern id="paper" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".55" fill="#986347" opacity=".18" /></pattern>
        <mask id="cut"><rect width="1080" height="600" fill="white"/><circle cx="762" cy="29" r="16" fill="black"/><circle cx="762" cy="571" r="16" fill="black"/></mask>
      </defs>
      <rect width="1080" height="600" fill="#1e1b1a"/>
      <g mask="url(#cut)">
        <rect x="28" y="29" width="1024" height="542" rx="7" fill="#f2e4cd"/>
        <rect x="28" y="29" width="1024" height="542" rx="7" fill="url(#paper)"/>
        <rect x="47" y="48" width="986" height="504" rx="2" fill="none" stroke="#b19173"/>
        <path d="M762 41v518" stroke="#87684f" stroke-width="2" stroke-dasharray="5 9"/>
      </g>
      <g fill="#782f2d" font-family="monospace" font-size="16" letter-spacing="2">
        <text x="81" y="108">NAPOLI · PIZZERIA SERALE</text>
        <text x="83" y="275">BIGLIETTO DI SALA</text>
        <text x="83" y="408">PIZZA SCELTA</text>
        <text x="83" y="514" font-size="12">DEMO · NESSUNA RICHIESTA INVIATA</text>
        <text x="907" y="109" text-anchor="middle">PASS SERALE</text>
        <text x="907" y="499" text-anchor="middle" font-size="12" letter-spacing="1">CONSERVATO SU QUESTO DISPOSITIVO</text>
      </g>
      <g fill="#261c1b" font-family="Georgia, serif">
        <text x="76" y="218" font-size="116" letter-spacing="-7">Lunaria</text>
        <text x="81" y="336" font-size="38">${day}</text>
        <text x="83" y="371" font-family="sans-serif" font-size="20">${label}</text>
        <text x="83" y="449" font-size="32">${pizzaLine}</text>
        <text x="907" y="322" font-size="78" text-anchor="middle" letter-spacing="-5">${ticket.time}</text>
        <text x="907" y="368" font-family="monospace" font-size="20" text-anchor="middle">${ticket.number}</text>
      </g>
      <g fill="none" stroke="#782f2d" stroke-width="1.5">
        <circle cx="907" cy="203" r="56"/><circle cx="907" cy="203" r="49" stroke-dasharray="2 4"/>
        <path d="M925 171a34 34 0 1 0 17 50 30 30 0 0 1-17-50Z" fill="#782f2d" stroke="none"/>
        <path d="M941 185v16m-8-8h16M895 178v10m-5-5h10"/>
      </g>
    </svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `lunaria-${ticket.number.toLowerCase()}.svg`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function install() {
    if (document.querySelector('.tavolo')) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'tavolo';
    dialog.setAttribute('aria-labelledby', 'tavolo-title');
    dialog.innerHTML = `
      <div class="tavolo-sheet">
        <button type="button" class="tavolo-close" aria-label="Chiudi la finestra">×</button>
        <section class="tavolo-main">
          <p class="tavolo-kicker">Lunaria / Napoli</p>
          <div id="tavolo-form-panel">
            <h2 id="tavolo-title" tabindex="-1">Il tuo tavolo<span>.</span></h2>
            <p class="tavolo-intro">Scegli la tua serata, da martedì a domenica.</p>
            <form class="tavolo-form" novalidate>
              <label>Giorno <input name="day" type="date" required aria-describedby="tavolo-error"></label>
              <label>Ospiti <select name="guests" required aria-describedby="tavolo-error">
                <option value="1">1 ospite</option><option value="2" selected>2 ospiti</option><option value="3">3 ospiti</option><option value="4">4 ospiti</option>
                <option value="5">5 ospiti</option><option value="6">6 ospiti</option><option value="7">7 ospiti</option><option value="8">8 ospiti</option>
              </select></label>
              <label>Ora <select name="time" required aria-describedby="tavolo-error"></select></label>
              <label>Iniziali <span class="tavolo-optional">facoltative</span>
                <input name="initials" type="text" maxlength="10" placeholder="Es. A.M." autocomplete="off" aria-describedby="tavolo-error">
              </label>
              <p id="tavolo-error" class="tavolo-error" role="status" hidden></p>
              <button class="tavolo-action" type="submit">Crea il biglietto <span aria-hidden="true">↗</span></button>
            </form>
            <p class="tavolo-note">Demo. Il biglietto resta sul dispositivo e non viene inviata alcuna richiesta.</p>
          </div>
          <div id="tavolo-receipt-panel" hidden>
            <h2 id="tavolo-receipt-title" tabindex="-1">Il tuo biglietto<span>.</span></h2>
            <dl class="tavolo-details">
              <div><dt>Serata</dt><dd data-ticket="day"></dd></div>
              <div><dt>Ora</dt><dd data-ticket="time"></dd></div>
              <div><dt>Ospiti</dt><dd data-ticket="guests"></dd></div>
              <div><dt>Pizza scelta</dt><dd data-ticket="pizza"></dd></div>
            </dl>
            <div class="tavolo-receipt-actions">
              <button class="tavolo-action" type="button" data-download>Scarica il biglietto <span aria-hidden="true">↓</span></button>
              <button class="tavolo-cancel" type="button">Annulla il biglietto</button>
            </div>
            <p class="tavolo-note">Demo. Il biglietto resta sul dispositivo e non viene inviata alcuna richiesta.</p>
          </div>
        </section>
        <aside class="tavolo-stub" aria-label="Tagliando">
          <p class="tavolo-kicker">Pass serale</p>
          <span class="tavolo-seal" aria-hidden="true"><span class="tavolo-crescent"></span><span class="tavolo-star">✦</span></span>
          <p class="tavolo-stub-time" aria-hidden="true">19–23</p>
          <p class="tavolo-number">Mar – Dom</p>
        </aside>
      </div>`;
    document.body.append(dialog);

    const formPanel = dialog.querySelector('#tavolo-form-panel');
    const receiptPanel = dialog.querySelector('#tavolo-receipt-panel');
    const form = dialog.querySelector('form');
    const error = dialog.querySelector('#tavolo-error');
    const stubTime = dialog.querySelector('.tavolo-stub-time');
    const stubNumber = dialog.querySelector('.tavolo-number');
    const { day, time, guests, initials } = form.elements;
    let trigger;
    let ticket = readTicket();

    function showError(field, message, focus = false) {
      form.querySelector('[aria-invalid="true"]')?.removeAttribute('aria-invalid');
      error.textContent = message;
      error.hidden = !message;
      if (message) field.setAttribute('aria-invalid', 'true');
      if (message && focus) field.focus();
    }

    function problemForDay(now) {
      if (!day.value) return 'Scegli un giorno per la tua serata.';
      if (day.value < now.day) return 'Scegli oggi o un giorno futuro.';
      if (day.value > after(now.day, dateLimit)) return 'Puoi scegliere una data entro 45 giorni.';
      if (isMonday(day.value)) return 'Il lunedì Lunaria è chiusa. Scegli un altro giorno.';
      if (!listTimes(day.value, now).length) return 'Gli orari di oggi sono passati. Scegli un altro giorno.';
      return '';
    }

    function refreshTimes(now, report = true) {
      const previousTime = time.value;
      const slots = listTimes(day.value, now);
      time.replaceChildren(...(slots.length ? slots : ['']).map((slot) => new Option(slot || 'Nessun orario', slot)));
      time.disabled = !slots.length;
      if (slots.includes(previousTime)) time.value = previousTime;
      if (report) showError(day, problemForDay(now));
    }

    function showPanel() {
      const title = ticket ? 'tavolo-receipt-title' : 'tavolo-title';
      dialog.setAttribute('aria-labelledby', title);
      formPanel.hidden = Boolean(ticket);
      receiptPanel.hidden = !ticket;
      stubTime.textContent = ticket ? ticket.time : '19–23';
      stubNumber.textContent = ticket ? ticket.number : 'Mar – Dom';

      if (ticket) {
        const values = {
          day: formatDate(ticket.day),
          time: ticket.time,
          guests: `${ticket.guests}${ticket.initials ? ` · ${ticket.initials}` : ''}`,
          pizza: ticket.pizza,
        };
        for (const field of receiptPanel.querySelectorAll('[data-ticket]')) field.textContent = values[field.dataset.ticket];
      } else {
        const now = naplesNow();
        day.min = now.day;
        day.max = after(now.day, dateLimit);
        if (!listTimes(day.value, now).length) {
          let nextDay = now.day;
          while (!listTimes(nextDay, now).length) nextDay = after(nextDay, 1);
          day.value = nextDay;
        }
        refreshTimes(now, false);
        showError(day, '');
      }
      if (dialog.open) dialog.querySelector(`#${title}`).focus();
    }

    document.addEventListener('click', (event) => {
      const button = event.target.closest?.('[data-prenota]');
      if (!button || dialog.open) return;
      event.preventDefault();
      trigger = button;
      showPanel();
      dialog.showModal();
      document.documentElement.classList.add('tavolo-open');
      dialog.querySelector(`#${dialog.getAttribute('aria-labelledby')}`).focus();
    });

    function restorePage() {
      if (dialog.open) return;
      document.documentElement.classList.remove('tavolo-open');
      trigger?.focus({ preventScroll: true });
    }

    function closeDialog() {
      dialog.close();
      restorePage();
    }

    dialog.querySelector('.tavolo-close').addEventListener('click', closeDialog);
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) closeDialog();
    });
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeDialog();
    });

    day.addEventListener('change', () => refreshTimes(naplesNow()));
    initials.addEventListener('input', () => {
      if (initials.hasAttribute('aria-invalid')) showError(initials, '');
    });
    for (const field of [time, guests]) field.addEventListener('change', () => {
      if (field.hasAttribute('aria-invalid')) showError(field, '');
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const now = naplesNow();
      const dayProblem = problemForDay(now);
      if (dayProblem) {
        refreshTimes(now, false);
        showError(day, dayProblem, true);
        return;
      }
      if (!listTimes(day.value, now).includes(time.value)) {
        refreshTimes(now, false);
        showError(time, 'Quell’orario non è disponibile. Scegli un altro orario.', true);
        return;
      }
      const partySize = Number(guests.value);
      if (!Number.isInteger(partySize) || partySize < 1 || partySize > 8) {
        showError(guests, 'Scegli da 1 a 8 ospiti.', true);
        return;
      }
      const cleanedInitials = initials.value.trim();
      if (cleanedInitials && !/^\p{L}(?:[. ]?\p{L}){0,3}\.?$/u.test(cleanedInitials)) {
        showError(initials, 'Usa fino a quattro iniziali, per esempio A.M.', true);
        return;
      }
      ticket = {
        day: day.value,
        time: time.value,
        guests: partySize,
        initials: cleanedInitials,
        pizza: (document.body.dataset.pizza?.trim() || 'Da scegliere al tavolo').slice(0, 100),
        number: nextNumber(),
      };
      remember(ticket);
      showPanel();
    });

    dialog.querySelector('[data-download]').addEventListener('click', () => {
      if (ticket) downloadTicket(ticket);
    });
    dialog.querySelector('.tavolo-cancel').addEventListener('click', () => {
      ticket = null;
      remember(null);
      form.reset();
      showPanel();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
