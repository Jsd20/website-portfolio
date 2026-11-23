(function () {
  const menus = {
    en: {
      season: 'Autumn / Winter',
      title: 'At the table',
      intro: 'Tuscan cooking, shaped by the season and finished over the embers.',
      tabLabel: 'Menus',
      dinner: {
        label: 'Dinner',
        groups: [
          {
            title: 'To begin',
            items: [
              ['Grilled sourdough', 'New-season olive oil, whipped white beans, rosemary', '8'],
              ['Charred winter squash', 'Sheep’s milk ricotta, chestnut honey, toasted hazelnuts', '14'],
              ['Chicken liver crostini', 'Vin santo, pickled shallot, grilled country bread', '13'],
            ],
          },
          {
            title: 'Pasta & hearth',
            items: [
              ['Hand-cut pappardelle', 'Slow-braised wild boar ragù, red wine, aged pecorino', '22'],
              ['Oak-fired winter vegetables', 'Celeriac, black kale, porcini butter, toasted farro', '23'],
              ['Wood-grilled lamb', 'Braised white beans, charred lemon, rosemary', '32'],
            ],
          },
        ],
        note: 'The menu changes with the harvest. Please tell us about any allergies when you book.',
      },
      tasting: {
        label: 'Tasting',
        groups: [
          {
            title: 'From the embers',
            items: [
              ['Grilled sourdough', 'Whipped white beans, rosemary, new-season olive oil'],
              ['Charred squash', 'Sheep’s milk ricotta, chestnut honey, hazelnuts'],
              ['Hand-cut pappardelle', 'Slow-braised wild boar ragù, aged pecorino'],
            ],
          },
          {
            title: 'To the last bite',
            items: [
              ['Wood-grilled lamb', 'Braised white beans, charred lemon, rosemary'],
              ['Chestnut cake', 'Rosemary, pine nuts, vin santo cream'],
            ],
          },
        ],
        note: 'Five courses €72 per person · Tuscan wine pairing €34 per person',
      },
      wine: {
        label: 'Wine',
        groups: [
          {
            title: 'Whites & bubbles',
            items: [
              ['Vernaccia di San Gimignano', 'Citrus peel, white flowers, a dry finish', '38'],
              ['Vermentino Toscana', 'Ripe pear, soft herbs, sea salt', '42'],
              ['Tuscan metodo classico', 'Fine bubbles, orchard fruit, toasted almond', '52'],
            ],
          },
          {
            title: 'Reds & dessert wine',
            items: [
              ['Chianti Classico', 'Sour cherry, violet, a savory finish', '46'],
              ['Brunello di Montalcino', 'Red plum, dried herbs, fine tannins', '82'],
              ['Vin Santo del Chianti Classico', 'Dried apricot, walnut, orange peel · by the glass', '12'],
            ],
          },
        ],
        note: 'Ask about wines by the glass and more bottles from our cellar.',
      },
    },
    it: {
      season: 'Autunno / Inverno',
      title: 'A tavola',
      intro: 'Cucina toscana, al ritmo delle stagioni e con il calore della brace.',
      tabLabel: 'Menu',
      dinner: {
        label: 'Cena',
        groups: [
          {
            title: 'Per cominciare',
            items: [
              ['Pane a lievitazione naturale alla griglia', 'Olio nuovo, crema di cannellini, rosmarino', '8'],
              ['Zucca alla brace', 'Ricotta di pecora, miele di castagno, nocciole tostate', '14'],
              ['Crostini di fegatini', 'Vin santo, scalogno in agrodolce, pane toscano alla griglia', '13'],
            ],
          },
          {
            title: 'Pasta e brace',
            items: [
              ['Pappardelle tagliate a mano', 'Ragù di cinghiale a cottura lenta, vino rosso, pecorino stagionato', '22'],
              ['Verdure d’inverno alla brace di quercia', 'Sedano rapa, cavolo nero, burro ai porcini, farro tostato', '23'],
              ['Agnello alla griglia', 'Cannellini in umido, limone alla brace, rosmarino', '32'],
            ],
          },
        ],
        note: 'Il menu segue il raccolto. Segnalateci eventuali allergie al momento della prenotazione.',
      },
      tasting: {
        label: 'Degustazione',
        groups: [
          {
            title: 'Dalla brace',
            items: [
              ['Pane a lievitazione naturale alla griglia', 'Crema di cannellini, rosmarino, olio nuovo'],
              ['Zucca alla brace', 'Ricotta di pecora, miele di castagno, nocciole'],
              ['Pappardelle tagliate a mano', 'Ragù di cinghiale a cottura lenta, pecorino stagionato'],
            ],
          },
          {
            title: 'Fino all’ultimo boccone',
            items: [
              ['Agnello alla griglia', 'Cannellini in umido, limone alla brace, rosmarino'],
              ['Castagnaccio', 'Rosmarino, pinoli, crema al vin santo'],
            ],
          },
        ],
        note: 'Cinque portate €72 a persona · Abbinamento di vini toscani €34 a persona',
      },
      wine: {
        label: 'Vini',
        groups: [
          {
            title: 'Bianchi e bollicine',
            items: [
              ['Vernaccia di San Gimignano', 'Scorza di agrumi, fiori bianchi, finale secco', '38'],
              ['Vermentino Toscana', 'Pera matura, erbe aromatiche, nota salina', '42'],
              ['Metodo classico toscano', 'Perlage fine, frutta matura, mandorla tostata', '52'],
            ],
          },
          {
            title: 'Rossi e passiti',
            items: [
              ['Chianti Classico', 'Amarena, viola, finale sapido', '46'],
              ['Brunello di Montalcino', 'Prugna rossa, erbe essiccate, tannini fini', '82'],
              ['Vin Santo del Chianti Classico', 'Albicocca secca, noce, scorza d’arancia · al calice', '12'],
            ],
          },
        ],
        note: 'Chiedeteci dei vini al calice e delle altre bottiglie in cantina.',
      },
    },
  };

  function initMenu() {
    const section = document.getElementById('menu');
    if (!section) return;

    const tabs = ['dinner', 'tasting', 'wine'];
    let selected = tabs[0];

    function renderGroup(group) {
      const items = group.items.map(([name, description, price]) => `
        <li class="brasca-menu__dish">
          <span class="brasca-menu__dish-name">${name}</span>
          ${price ? `<span class="brasca-menu__price">€${price}</span>` : ''}
          <span class="brasca-menu__description">${description}</span>
        </li>`).join('');

      return `<div><h3 class="brasca-menu__group-title">${group.title}</h3>
        <ul class="brasca-menu__dishes">${items}</ul></div>`;
    }

    function render() {
      const language = document.documentElement.lang.toLowerCase().split('-')[0];
      const copy = menus[language] || menus.en;
      const focusedTab = section.contains(document.activeElement) && document.activeElement.dataset.menuTab;

      section.classList.add('brasca-menu');
      section.setAttribute('aria-labelledby', 'brasca-menu-title');
      section.innerHTML = `
        <div class="brasca-menu__inner">
          <header class="brasca-menu__intro">
            <p class="brasca-menu__season">${copy.season}</p>
            <h2 id="brasca-menu-title">${copy.title}</h2>
            <p class="brasca-menu__lead">${copy.intro}</p>
          </header>
          <div class="brasca-menu__tabs" role="tablist" aria-label="${copy.tabLabel}">
            ${tabs.map(tab => `<button type="button" role="tab" id="brasca-tab-${tab}" data-menu-tab="${tab}"
              aria-controls="brasca-panel-${tab}" aria-selected="${tab === selected}" tabindex="${tab === selected ? 0 : -1}">
              ${copy[tab].label}
            </button>`).join('')}
          </div>
          ${tabs.map(tab => `
            <div class="brasca-menu__panel" role="tabpanel" id="brasca-panel-${tab}" aria-labelledby="brasca-tab-${tab}"
              tabindex="0" ${tab === selected ? '' : 'hidden'}>
              <div class="brasca-menu__groups">${copy[tab].groups.map(renderGroup).join('')}</div>
              <p class="brasca-menu__note">${copy[tab].note}</p>
            </div>`).join('')}
        </div>`;

      if (focusedTab) section.querySelector(`#brasca-tab-${focusedTab}`).focus();
    }

    function selectTab(tab, moveFocus = false) {
      if (tab !== selected) {
        const previous = section.querySelector(`#brasca-tab-${selected}`);
        previous.setAttribute('aria-selected', 'false');
        previous.tabIndex = -1;
        section.querySelector(`#brasca-panel-${selected}`).hidden = true;

        selected = tab;
        const current = section.querySelector(`#brasca-tab-${selected}`);
        current.setAttribute('aria-selected', 'true');
        current.tabIndex = 0;
        section.querySelector(`#brasca-panel-${selected}`).hidden = false;
      }

      if (moveFocus) section.querySelector(`#brasca-tab-${selected}`).focus();
    }

    section.addEventListener('click', event => {
      const tab = event.target.closest('[data-menu-tab]');
      if (tab) selectTab(tab.dataset.menuTab);
    });

    section.addEventListener('keydown', event => {
      const current = tabs.indexOf(event.target.dataset.menuTab);
      if (current < 0) return;

      const next = {
        ArrowLeft: (current + tabs.length - 1) % tabs.length,
        ArrowRight: (current + 1) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      }[event.key];
      if (next === undefined) return;

      event.preventDefault();
      selectTab(tabs[next], true);
    });

    window.addEventListener('languagechange', render);
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMenu, { once: true });
  } else {
    initMenu();
  }
}());
