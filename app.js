/* Rozpis služeb – byt Střední
 *
 * Rotace funguje jako papírové kolo: vnější prstenec jsou pokoje (pevně),
 * vnitřní kotouč se službami se každé pondělí pootočí o jeden dílek po směru
 * hodinových ručiček. Rozpis tak běží donekonečna, žádná tabulka na 52 týdnů.
 */
(function () {
  'use strict';

  // První týden rozpisu (pondělí). Měsíc je od nuly: 9 = říjen.
  const START = { y: 2026, m: 9, d: 5 };
  const DAY_MS = 86400000;

  const CHORES = {
    schody:   { name: 'Schody',   lower: 'schody',   icon: 'i-schody' },
    kuchyn:   { name: 'Kuchyň',   lower: 'kuchyň',   icon: 'i-kuchyn' },
    odpadky:  { name: 'Odpadky',  lower: 'odpadky',  icon: 'i-odpadky' },
    predsin:  { name: 'Předsíň',  lower: 'předsíň',  icon: 'i-predsin' },
    koupelna: { name: 'Koupelna', lower: 'koupelna', icon: 'i-koupelna' },
    zachod:   { name: 'Záchod',   lower: 'záchod',   icon: 'i-zachod' }
  };

  // Dílky kotouče po směru hodinových ručiček. Těžší společná služba jde se záchodem,
  // lehčí s koupelnou. Sousední dílky se střídají, takže pokoje 1+2 i 3+4 mají
  // každý týden jeden koupelnu a druhý záchod.
  const SLICES = [
    ['kuchyn', 'zachod'],
    ['predsin', 'koupelna'],
    ['schody', 'zachod'],
    ['odpadky', 'koupelna']
  ];

  const ROOMS = [1, 2, 3, 4];
  const ZONES = [[1, 2], [3, 4]];
  const COMMON_ORDER = ['schody', 'kuchyn', 'odpadky', 'predsin'];

  const MONTHS_GEN = ['ledna', 'února', 'března', 'dubna', 'května', 'června',
    'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
  const MONTHS_NOM = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
    'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];
  const DAY_ABBR = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

  const NBSP = ' ';
  const STORE_ROOM = 'rozpisSluzeb.mujPokoj';
  const STORE_MODE = 'rozpisSluzeb.pohled';

  // ---------- Datum a týdny ----------

  const mod = (a, n) => ((a % n) + n) % n;

  // Počítá se s kalendářními dny přes UTC, aby přechod na letní/zimní čas neposunul týdny.
  const startUtc = Date.UTC(START.y, START.m, START.d);
  const dayIndex = (date) =>
    Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - startUtc) / DAY_MS);

  const weekStart = (off) => new Date(START.y, START.m, START.d + off * 7);
  const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);

  function isoWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / DAY_MS + 1) / 7);
  }

  // Pro kontrolu jiného dne: index.html?dnes=2026-11-03
  function resolveToday() {
    const q = new URLSearchParams(location.search).get('dnes');
    const m = q && /^(\d{4})-(\d{2})-(\d{2})$/.exec(q);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date();
  }

  const today = resolveToday();
  const todayIdx = dayIndex(today);
  const currentOff = Math.floor(todayIdx / 7);
  const weekday = mod(todayIdx, 7); // 0 = pondělí
  const firstOff = Math.max(currentOff, 0);

  const dm = (d) => `${d.getDate()}.${NBSP}${MONTHS_GEN[d.getMonth()]}`;

  function rangeLong(start) {
    const end = addDays(start, 6);
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}.–${end.getDate()}.${NBSP}${MONTHS_GEN[end.getMonth()]} ${end.getFullYear()}`;
    }
    if (start.getFullYear() === end.getFullYear()) {
      return `${dm(start)} – ${dm(end)} ${end.getFullYear()}`;
    }
    return `${dm(start)} ${start.getFullYear()} – ${dm(end)} ${end.getFullYear()}`;
  }

  function rangeShort(start) {
    const end = addDays(start, 6);
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}.–${end.getDate()}.${NBSP}${end.getMonth() + 1}.`;
    }
    return `${start.getDate()}.${NBSP}${start.getMonth() + 1}.–${end.getDate()}.${NBSP}${end.getMonth() + 1}.`;
  }

  const plural = (n, one, few, many) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);

  // ---------- Rotace ----------

  const sliceIndex = (room, off) => mod(room - 1 - off, 4);
  const dutyOf = (room, off) => SLICES[sliceIndex(room, off)];

  function roomWithCommon(chore, off) {
    return ROOMS.find((r) => dutyOf(r, off)[0] === chore);
  }

  function roomWithSanitary(chore, zone, off) {
    return zone.find((r) => dutyOf(r, off)[1] === chore);
  }

  // ---------- Stav ----------

  function readStore(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function writeStore(key, value) {
    try {
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) { /* bez úložiště to funguje taky, jen si nic nepamatuje */ }
  }

  const storedRoom = parseInt(readStore(STORE_ROOM), 10);

  const state = {
    viewOff: firstOff,
    myRoom: ROOMS.includes(storedRoom) ? storedRoom : null,
    mode: readStore(STORE_MODE) === 'chores' ? 'chores' : 'rooms',
    showPast: false,
    count: 16
  };

  const $ = (sel) => document.querySelector(sel);
  const icon = (key, cls) =>
    `<svg class="${cls || 'ico'}" aria-hidden="true"><use href="#${CHORES[key].icon}"></use></svg>`;

  // ---------- Kolo ----------

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const C = 200;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function svgEl(name, attrs, parent) {
    const node = document.createElementNS(SVG_NS, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  // Úhel ve stupních po směru hodinových ručiček od dvanácté.
  function polar(r, deg) {
    const a = (deg * Math.PI) / 180;
    return [+(C + r * Math.sin(a)).toFixed(2), +(C - r * Math.cos(a)).toFixed(2)];
  }

  function annular(r1, r2, a1, a2) {
    const [x1, y1] = polar(r2, a1);
    const [x2, y2] = polar(r2, a2);
    const [x3, y3] = polar(r1, a2);
    const [x4, y4] = polar(r1, a1);
    return `M${x1} ${y1}A${r2} ${r2} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 0 0 ${x4} ${y4}Z`;
  }

  function arc(r, a1, a2, sweep) {
    const [x1, y1] = polar(r, a1);
    const [x2, y2] = polar(r, a2);
    return `M${x1} ${y1}A${r} ${r} 0 0 ${sweep} ${x2} ${y2}`;
  }

  // Pozice p = 0..3: vlevo nahoře, vpravo nahoře, vpravo dole, vlevo dole.
  const posAngle = (p) => -45 + 90 * p;

  const wheel = {
    svg: $('#wheel'),
    disc: null,
    labels: [],
    slices: [],
    rings: [],
    hubNum: null,
    angle: 0,
    raf: 0
  };

  function buildWheel() {
    const svg = wheel.svg;
    const defs = svgEl('defs', {}, svg);

    ROOMS.forEach((room, p) => {
      const a = posAngle(p);
      const g = svgEl('g', { class: `ring r${room}` }, svg);
      svgEl('path', { class: 'ring__seg', d: annular(159, 197, a - 44, a + 44) }, g);

      // Horní popisky jdou po oblouku zleva doprava, dolní obráceně, aby se daly číst.
      const top = p < 2;
      svgEl('path', {
        id: `ringPath${p}`,
        d: top ? arc(178, a - 40, a + 40, 1) : arc(178, a + 40, a - 40, 0)
      }, defs);
      const text = svgEl('text', { class: 'ring__label', 'dominant-baseline': 'central' }, g);
      const tp = svgEl('textPath', { href: `#ringPath${p}`, startOffset: '50%', 'text-anchor': 'middle' }, text);
      tp.textContent = `Pokoj ${room}`;
      wheel.rings.push(g);
    });

    const disc = svgEl('g', { class: 'disc' }, svg);
    svgEl('circle', { class: 'disc__bg', cx: C, cy: C, r: 153 }, disc);

    SLICES.forEach(([common, sanitary], k) => {
      const a = posAngle(k);
      wheel.slices.push(svgEl('path', { class: 'disc__slice', d: annular(42, 153, a - 45, a + 45) }, disc));

      const [x, y] = polar(97, a);
      const holder = svgEl('g', { transform: `translate(${x} ${y})` }, disc);
      const label = svgEl('g', {}, holder);
      svgEl('use', { href: `#${CHORES[common].icon}`, class: 'disc__icon', x: -15, y: -42, width: 30, height: 30 }, label);
      svgEl('text', { class: 'disc__name', y: 8 }, label).textContent = CHORES[common].name;
      svgEl('text', { class: 'disc__plus', y: 28 }, label).textContent = `a ${CHORES[sanitary].lower}`;
      wheel.labels.push(label);
    });

    svgEl('circle', { class: 'hub__bg', cx: C, cy: C, r: 38 }, svg);
    wheel.hubNum = svgEl('text', { class: 'hub__num', x: C, y: C + 6 }, svg);
    svgEl('text', { class: 'hub__cap', x: C, y: C + 22 }, svg).textContent = 'týden';

    wheel.disc = disc;
  }

  function applyAngle(angle) {
    wheel.angle = angle;
    wheel.disc.setAttribute('transform', `rotate(${angle} ${C} ${C})`);
    // Popisky se točí zpátky, aby zůstaly rovně.
    wheel.labels.forEach((l) => l.setAttribute('transform', `rotate(${-angle})`));
  }

  // Lehký přejezd přes cíl, jako když kolo cvakne do zarážky.
  const easeOutBack = (t) => {
    const c1 = 1.1;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  function rotateTo(target, animate) {
    cancelAnimationFrame(wheel.raf);
    if (!animate || reduceMotion.matches) {
      applyAngle(target);
      return;
    }
    const from = wheel.angle;
    const dist = Math.abs(target - from);
    const duration = Math.min(1100, 520 + dist * 1.6);
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      applyAngle(from + (target - from) * easeOutBack(t));
      if (t < 1) wheel.raf = requestAnimationFrame(step);
    };
    wheel.raf = requestAnimationFrame(step);
  }

  // ---------- Hero ----------

  function relativeLabel(diff) {
    if (diff === 1) return 'Příští týden';
    if (diff === -1) return 'Minulý týden';
    if (diff > 1) return `Za ${diff} ${plural(diff, 'týden', 'týdny', 'týdnů')}`;
    return `Před ${-diff} týdny`;
  }

  function renderStatus() {
    const box = $('#weekStatus');
    const off = state.viewOff;
    const parts = [];

    if (off === currentOff) {
      const days = DAY_ABBR.map((d, i) => {
        const cls = i < weekday ? 'is-past' : i === weekday ? 'is-today' : '';
        return `<span class="day ${cls}">${d}</span>`;
      }).join('');
      parts.push(`<span class="days" aria-hidden="true">${days}</span>`);
      parts.push(weekday === 6
        ? '<span>Kolo se otočí zítra.</span>'
        : `<span>Kolo se otočí v pondělí ${dm(weekStart(off + 1))}.</span>`);
    } else if (off === 0 && currentOff < 0) {
      parts.push(`<span>Rozpis začíná v pondělí ${dm(weekStart(0))}.</span>`);
    } else {
      parts.push(`<span>${relativeLabel(off - currentOff)}</span>`);
    }

    if (off !== firstOff) {
      const back = currentOff >= 0 ? 'Zpět na tento týden' : 'Zpět na první týden';
      parts.push(`<button type="button" class="link-btn" data-action="today">${back}</button>`);
    }

    box.innerHTML = parts.join('');
  }

  function renderDuties() {
    const off = state.viewOff;
    $('#dutyList').innerHTML = ROOMS.map((r) => {
      const [common, sanitary] = dutyOf(r, off);
      const mine = state.myRoom === r ? ' is-mine' : '';
      return `<li class="duty r${r}${mine}">
          <span><span class="tag">Pokoj ${r}</span></span>
          <span class="duty__task">
            ${icon(common)}
            <span><span class="duty__name">${CHORES[common].name}</span>
            <span class="duty__plus">a ${CHORES[sanitary].lower}</span></span>
          </span>
        </li>`;
    }).join('');
  }

  function renderWheelState() {
    const off = state.viewOff;
    wheel.hubNum.textContent = isoWeek(weekStart(off));

    wheel.rings.forEach((g, i) => g.classList.toggle('is-mine', state.myRoom === i + 1));
    wheel.slices.forEach((s, k) => {
      s.setAttribute('class', 'disc__slice');
      if (state.myRoom && sliceIndex(state.myRoom, off) === k) {
        s.setAttribute('class', `disc__slice is-mine r${state.myRoom}`);
      }
    });

    const desc = ROOMS.map((r) => {
      const [c, s] = dutyOf(r, off);
      return `pokoj ${r} ${CHORES[c].lower} a ${CHORES[s].lower}`;
    }).join(', ');
    wheel.svg.setAttribute('aria-label', `Kolo služeb, týden ${isoWeek(weekStart(off))}: ${desc}.`);
  }

  function renderHero() {
    const start = weekStart(state.viewOff);
    $('#weekTitle').textContent = `Týden ${isoWeek(start)}`;
    $('#weekDates').textContent = rangeLong(start);
    $('#prevWeek').disabled = state.viewOff <= 0;
    renderStatus();
    renderDuties();
    renderWheelState();
  }

  function goToWeek(off, animate) {
    state.viewOff = Math.max(0, off);
    renderHero();
    rotateTo(state.viewOff * 90, animate);
  }

  // ---------- Tabulka ----------

  function weekCell(off) {
    const start = weekStart(off);
    // Na úzkém displeji se ukáže jen pondělí, celý rozsah by sloupec zbytečně roztáhl.
    return `<th scope="row" class="c-week"><span class="wk">${isoWeek(start)}</span>` +
      `<span class="dt dt--full">${rangeShort(start)}</span>` +
      `<span class="dt dt--short">od ${start.getDate()}.${NBSP}${start.getMonth() + 1}.</span></th>`;
  }

  function rowsFor(colCount, cells) {
    const from = state.showPast ? 0 : firstOff;
    const to = firstOff + state.count - 1;
    let lastMonth = -1;
    let html = '';

    for (let off = from; off <= to; off++) {
      const start = weekStart(off);
      const monthKey = start.getFullYear() * 12 + start.getMonth();
      if (monthKey !== lastMonth) {
        lastMonth = monthKey;
        html += `<tr class="month"><th colspan="${colCount}" scope="colgroup">${MONTHS_NOM[start.getMonth()]} ${start.getFullYear()}</th></tr>`;
      }
      const cls = off === currentOff ? 'is-current' : off < currentOff ? 'is-past' : '';
      const current = off === currentOff ? ' aria-current="date"' : '';
      html += `<tr class="${cls}"${current}>${weekCell(off)}${cells(off)}</tr>`;
    }
    return html;
  }

  function tableByRooms() {
    const head = ROOMS.map((r) => {
      const mine = state.myRoom === r ? ' is-mine' : '';
      return `<th scope="col" class="r${r}${mine}"><span class="tag"><span class="tag__word">Pokoj </span>${r}</span></th>`;
    }).join('');

    const body = rowsFor(5, (off) => ROOMS.map((r) => {
      const [common, sanitary] = dutyOf(r, off);
      const mine = state.myRoom === r ? ' is-mine' : '';
      return `<td class="r${r}${mine}"><span class="t">${icon(common)}${CHORES[common].name}</span><span class="p">a ${CHORES[sanitary].lower}</span></td>`;
    }).join(''));

    return `<thead><tr><th scope="col" class="c-week">Týden</th>${head}</tr></thead><tbody>${body}</tbody>`;
  }

  function chip(room) {
    const mine = state.myRoom === room ? ' is-mine' : '';
    return `<span class="chip r${room}${mine}"><span class="vh">Pokoj </span>${room}</span>`;
  }

  function tableByChores() {
    const colHead = (key, groupStart, zoneLabel) =>
      `<th scope="col" class="col-ico${groupStart ? ' gs' : ''}">${icon(key)}<span class="lbl">${CHORES[key].name}</span>${zoneLabel ? `<span class="vh"> pro pokoje ${zoneLabel}</span>` : ''}</th>`;

    const head =
      `<tr><th scope="col" rowspan="2" class="c-week">Týden</th>` +
      `<th scope="colgroup" colspan="4" class="grp">Společné prostory</th>` +
      `<th scope="colgroup" colspan="2" class="grp gs">Pokoje 1${NBSP}a${NBSP}2</th>` +
      `<th scope="colgroup" colspan="2" class="grp gs">Pokoje 3${NBSP}a${NBSP}4</th></tr>` +
      `<tr>${COMMON_ORDER.map((k) => colHead(k, false)).join('')}` +
      ZONES.map((z) => colHead('koupelna', true, `${z[0]} a ${z[1]}`) + colHead('zachod', false, `${z[0]} a ${z[1]}`)).join('') +
      `</tr>`;

    const body = rowsFor(9, (off) =>
      COMMON_ORDER.map((k) => `<td>${chip(roomWithCommon(k, off))}</td>`).join('') +
      ZONES.map((z) =>
        `<td class="gs">${chip(roomWithSanitary('koupelna', z, off))}</td>` +
        `<td>${chip(roomWithSanitary('zachod', z, off))}</td>`
      ).join('')
    );

    return `<thead>${head}</thead><tbody>${body}</tbody>`;
  }

  function renderTable() {
    const table = $('#rota');
    const chores = state.mode === 'chores';
    table.className = `rota${chores ? ' is-chores' : ''}${state.myRoom ? ' has-mine' : ''}`;
    table.innerHTML = chores ? tableByChores() : tableByRooms();

    document.querySelectorAll('.seg__btn').forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode)));

    const pastCount = Math.max(0, currentOff);
    const toggle = $('#togglePast');
    toggle.hidden = pastCount === 0;
    toggle.textContent = state.showPast
      ? 'Skrýt uplynulé týdny'
      : `Ukázat uplynulé týdny (${pastCount})`;

    const from = state.showPast ? 0 : firstOff;
    const to = firstOff + state.count - 1;
    $('#printTitle').textContent =
      `Byt Střední, týdny ${isoWeek(weekStart(from))}–${isoWeek(weekStart(to))} ` +
      `(${dm(weekStart(from))} ${weekStart(from).getFullYear()} – ${dm(addDays(weekStart(to), 6))} ${addDays(weekStart(to), 6).getFullYear()})`;
  }

  // ---------- Můj pokoj ----------

  function renderMine() {
    document.querySelectorAll('.mine__btn').forEach((b) =>
      b.setAttribute('aria-pressed', String(+b.dataset.room === state.myRoom)));
  }

  function setMyRoom(room) {
    state.myRoom = state.myRoom === room ? null : room;
    writeStore(STORE_ROOM, state.myRoom);
    renderMine();
    renderHero();
    renderTable();
  }

  // ---------- Události ----------

  function bind() {
    $('#prevWeek').addEventListener('click', () => goToWeek(state.viewOff - 1, true));
    $('#nextWeek').addEventListener('click', () => goToWeek(state.viewOff + 1, true));

    $('#weekStatus').addEventListener('click', (e) => {
      if (e.target.closest('[data-action="today"]')) goToWeek(firstOff, true);
    });

    document.addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowLeft' && state.viewOff > 0) goToWeek(state.viewOff - 1, true);
      if (e.key === 'ArrowRight') goToWeek(state.viewOff + 1, true);
    });

    document.querySelectorAll('.mine__btn').forEach((b) =>
      b.addEventListener('click', () => setMyRoom(+b.dataset.room)));

    document.querySelectorAll('.seg__btn').forEach((b) =>
      b.addEventListener('click', () => {
        state.mode = b.dataset.mode;
        writeStore(STORE_MODE, state.mode);
        renderTable();
      }));

    $('#togglePast').addEventListener('click', () => {
      state.showPast = !state.showPast;
      renderTable();
    });

    $('#moreWeeks').addEventListener('click', () => {
      state.count += 12;
      renderTable();
    });

    $('#printBtn').addEventListener('click', () => window.print());
  }

  // ---------- Start ----------

  buildWheel();
  renderMine();
  renderTable();
  bind();

  // Při načtení kolo dojede z minulého týdne na ten aktuální.
  renderHero();
  applyAngle((state.viewOff - 1) * 90);
  setTimeout(() => rotateTo(state.viewOff * 90, true), 350);
})();
