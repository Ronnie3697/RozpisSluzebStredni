/**
 * Rozpis služeb | Byt Střední
 * Interactive Schedule Generator & State Manager
 */

(function () {
  'use strict';

  // Base setup
  const START_DATE = new Date(2026, 9, 5); // Monday, October 5, 2026 (Month is 0-indexed: 9 = Oct)
  const TOTAL_WEEKS = 52;
  const COMMON_CHORES = ["Schody", "Kuchyň", "Odpadky", "Předsíň"];

  // Icons for chores
  const CHORE_ICONS = {
    "Schody": "🧹",
    "Kuchyň": "🍳",
    "Odpadky": "🗑️",
    "Předsíň": "🛋️"
  };

  const SANITARY_ICONS = {
    "Koupelna": "🚿",
    "WC": "🚽"
  };

  // Helper date formatting
  function formatDate(d) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}.`;
  }

  function formatFullDate(d) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  }

  // Calculate standard ISO Week Number (1-53)
  function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  // Generate Week Data
  function generateWeekData(w) {
    const weekStart = new Date(START_DATE.getTime() + w * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    const isoWeek = getISOWeek(weekStart);

    // Common chores rotation
    const p1Comm = COMMON_CHORES[((0 - w) % 4 + 4) % 4];
    const p2Comm = COMMON_CHORES[((1 - w) % 4 + 4) % 4];
    const p3Comm = COMMON_CHORES[((2 - w) % 4 + 4) % 4];
    const p4Comm = COMMON_CHORES[((3 - w) % 4 + 4) % 4];

    // Sanitary rotation
    let p1San, p2San, p3San, p4San;
    if (w % 2 === 0) {
      p1San = "Koupelna";
      p2San = "WC";
      p3San = "Koupelna";
      p4San = "WC";
    } else {
      p1San = "WC";
      p2San = "Koupelna";
      p3San = "WC";
      p4San = "Koupelna";
    }

    return {
      weekIndex: w,
      isoWeek: isoWeek,
      startDate: weekStart,
      endDate: weekEnd,
      dateRangeStr: `${formatDate(weekStart)} – ${formatDate(weekEnd)}`,
      rooms: {
        1: { common: p1Comm, sanitary: p1San },
        2: { common: p2Comm, sanitary: p2San },
        3: { common: p3Comm, sanitary: p3San },
        4: { common: p4Comm, sanitary: p4San },
      }
    };
  }

  // Build all 52 weeks
  const weeks = [];
  for (let i = 0; i < TOTAL_WEEKS; i++) {
    weeks.push(generateWeekData(i));
  }

  // Determine current week index
  const now = new Date();
  let currentWeekIndex = 0;

  for (let i = 0; i < weeks.length; i++) {
    const w = weeks[i];
    const start = new Date(w.startDate.getFullYear(), w.startDate.getMonth(), w.startDate.getDate(), 0, 0, 0);
    const end = new Date(w.endDate.getFullYear(), w.endDate.getMonth(), w.endDate.getDate(), 23, 59, 59);

    if (now >= start && now <= end) {
      currentWeekIndex = i;
      break;
    } else if (now < start && i === 0) {
      currentWeekIndex = 0;
      break;
    } else if (i === weeks.length - 1 && now > end) {
      currentWeekIndex = i;
    }
  }

  // Elements
  const spotlightTitle = document.getElementById('spotlightTitle');
  const spotlightDates = document.getElementById('spotlightDates');
  const countdownText = document.getElementById('countdownText');
  const spotlightGrid = document.getElementById('spotlightGrid');
  const roomsTableBody = document.getElementById('roomsTableBody');
  const servicesTableBody = document.getElementById('servicesTableBody');

  // Render Spotlight Banner for Current Week
  function renderSpotlight(wIdx) {
    const cw = weeks[wIdx];
    spotlightTitle.textContent = `Týden ${cw.isoWeek}`;
    spotlightDates.textContent = `Termín: ${formatFullDate(cw.startDate)} – ${formatFullDate(cw.endDate)}`;

    // Calculate days remaining until Sunday 23:59:59
    const weekEndSunday = new Date(cw.endDate.getFullYear(), cw.endDate.getMonth(), cw.endDate.getDate(), 23, 59, 59);
    const diffMs = weekEndSunday.getTime() - now.getTime();
    if (diffMs > 0) {
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
      countdownText.textContent = diffDays > 0 ? `Zbývá ${diffDays} dní a ${diffHours} hod.` : `Zbývá ${diffHours} hodin!`;
    } else {
      countdownText.textContent = `Týden ukončen`;
    }

    spotlightGrid.innerHTML = '';
    for (let r = 1; r <= 4; r++) {
      const roomDuty = cw.rooms[r];
      const card = document.createElement('div');
      card.className = `spotlight-room-card room-${r}`;
      card.innerHTML = `
        <div>
          <div class="card-room-badge">Pokoj ${r}</div>
          <div class="duties-list">
            <div class="duty-tag">
              <span>${CHORE_ICONS[roomDuty.common] || '🧹'}</span>
              <span><strong>${roomDuty.common}</strong></span>
            </div>
            <div class="duty-tag duty-tag-sanitary">
              <span>${SANITARY_ICONS[roomDuty.sanitary] || '🚿'}</span>
              <span>${roomDuty.sanitary} (${r <= 2 ? 'P1+P2' : 'P3+P4'})</span>
            </div>
          </div>
        </div>
      `;
      spotlightGrid.appendChild(card);
    }
  }

  // Render Tab 1: Rooms Table
  function renderRoomsTable() {
    roomsTableBody.innerHTML = '';

    weeks.forEach((w) => {
      const tr = document.createElement('tr');
      tr.id = `week-row-${w.weekIndex}`;

      if (w.weekIndex === currentWeekIndex) {
        tr.classList.add('is-current-week');
      } else if (w.weekIndex < currentWeekIndex) {
        tr.classList.add('is-past-week');
      }

      tr.innerHTML = `
        <td class="col-week">
          ${w.weekIndex === currentWeekIndex ? '⭐ ' : ''}Týden ${w.isoWeek}
        </td>
        <td class="col-date">${w.dateRangeStr}</td>
        <td class="col-room col-room-1">
          <div class="duty-cell">
            <span class="duty-main">${CHORE_ICONS[w.rooms[1].common]} ${w.rooms[1].common}</span>
            <span class="duty-sub">${SANITARY_ICONS[w.rooms[1].sanitary]} ${w.rooms[1].sanitary}</span>
          </div>
        </td>
        <td class="col-room col-room-2">
          <div class="duty-cell">
            <span class="duty-main">${CHORE_ICONS[w.rooms[2].common]} ${w.rooms[2].common}</span>
            <span class="duty-sub">${SANITARY_ICONS[w.rooms[2].sanitary]} ${w.rooms[2].sanitary}</span>
          </div>
        </td>
        <td class="col-room col-room-3">
          <div class="duty-cell">
            <span class="duty-main">${CHORE_ICONS[w.rooms[3].common]} ${w.rooms[3].common}</span>
            <span class="duty-sub">${SANITARY_ICONS[w.rooms[3].sanitary]} ${w.rooms[3].sanitary}</span>
          </div>
        </td>
        <td class="col-room col-room-4">
          <div class="duty-cell">
            <span class="duty-main">${CHORE_ICONS[w.rooms[4].common]} ${w.rooms[4].common}</span>
            <span class="duty-sub">${SANITARY_ICONS[w.rooms[4].sanitary]} ${w.rooms[4].sanitary}</span>
          </div>
        </td>
      `;

      roomsTableBody.appendChild(tr);
    });
  }

  // Render Tab 2: Services Table
  function renderServicesTable() {
    servicesTableBody.innerHTML = '';

    weeks.forEach((w) => {
      const tr = document.createElement('tr');
      if (w.weekIndex === currentWeekIndex) {
        tr.classList.add('is-current-week');
      } else if (w.weekIndex < currentWeekIndex) {
        tr.classList.add('is-past-week');
      }

      // Invert chores to find which room has which chore
      const choreMap = {};
      for (let r = 1; r <= 4; r++) {
        choreMap[w.rooms[r].common] = r;
      }

      // Sanitary rooms
      const p12Bath = w.rooms[1].sanitary === "Koupelna" ? 1 : 2;
      const p12WC = w.rooms[1].sanitary === "WC" ? 1 : 2;
      const p34Bath = w.rooms[3].sanitary === "Koupelna" ? 3 : 4;
      const p34WC = w.rooms[3].sanitary === "WC" ? 3 : 4;

      tr.innerHTML = `
        <td class="col-week">${w.weekIndex === currentWeekIndex ? '⭐ ' : ''}Týden ${w.isoWeek}</td>
        <td class="col-date">${w.dateRangeStr}</td>
        <td><span class="room-badge badge-r${choreMap['Schody']}">Pokoj ${choreMap['Schody']}</span></td>
        <td><span class="room-badge badge-r${choreMap['Kuchyň']}">Pokoj ${choreMap['Kuchyň']}</span></td>
        <td><span class="room-badge badge-r${choreMap['Odpadky']}">Pokoj ${choreMap['Odpadky']}</span></td>
        <td><span class="room-badge badge-r${choreMap['Předsíň']}">Pokoj ${choreMap['Předsíň']}</span></td>
        <td><span class="room-badge badge-r${p12Bath}">Pokoj ${p12Bath}</span></td>
        <td><span class="room-badge badge-r${p12WC}">Pokoj ${p12WC}</span></td>
        <td><span class="room-badge badge-r${p34Bath}">Pokoj ${p34Bath}</span></td>
        <td><span class="room-badge badge-r${p34WC}">Pokoj ${p34WC}</span></td>
      `;

      servicesTableBody.appendChild(tr);
    });
  }

  // Setup Past Weeks Toggle Buttons
  function setupPastWeeksToggle() {
    const pastCount = currentWeekIndex;
    const toggleBtns = [
      document.getElementById('btnTogglePastRooms'),
      document.getElementById('btnTogglePastServices')
    ];

    if (pastCount > 0) {
      toggleBtns.forEach(btn => {
        if (btn) {
          btn.style.display = 'inline-flex';
          const countSpan = btn.querySelector('.past-count');
          if (countSpan) countSpan.textContent = pastCount;
        }
      });
    }

    toggleBtns.forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          const isShown = document.body.classList.toggle('show-past');
          toggleBtns.forEach(b => {
            if (b) {
              const textSpan = b.querySelector('.toggle-text');
              if (textSpan) {
                textSpan.textContent = isShown ? 'Skrýt předchozí týdny' : 'Zobrazit předchozí týdny';
              }
            }
          });
        });
      }
    });
  }

  // Tab navigation
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');

      tabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      document.getElementById(targetId).classList.add('active');
    });
  });

  // Room Filter Pills
  const filterPills = document.querySelectorAll('.room-filter-pills .pill-btn');
  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const selectedRoom = pill.getAttribute('data-room');
      applyRoomFilter(selectedRoom);
    });
  });

  function applyRoomFilter(room) {
    const table = document.getElementById('roomsTable');
    const allRoomCells = table.querySelectorAll('.col-room');

    if (room === 'all') {
      allRoomCells.forEach(cell => {
        cell.classList.remove('dimmed');
        cell.classList.remove('highlighted-column');
      });
    } else {
      allRoomCells.forEach(cell => {
        if (cell.classList.contains(`col-room-${room}`)) {
          cell.classList.remove('dimmed');
          cell.classList.add('highlighted-column');
        } else {
          cell.classList.add('dimmed');
          cell.classList.remove('highlighted-column');
        }
      });
    }
  }

  // Jump to Current Week button
  document.getElementById('btnCurrentWeek').addEventListener('click', () => {
    const tab1Btn = document.querySelector('[data-tab="tab-rooms"]');
    tab1Btn.click();

    const targetRow = document.getElementById(`week-row-${currentWeekIndex}`);
    if (targetRow) {
      targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetRow.style.transition = 'background-color 0.5s';
      targetRow.style.backgroundColor = '#fde68a';
      setTimeout(() => {
        targetRow.style.backgroundColor = '';
      }, 1500);
    }
  });

  // Print button
  document.getElementById('btnPrint').addEventListener('click', () => {
    window.print();
  });

  // Initialize
  renderSpotlight(currentWeekIndex);
  renderRoomsTable();
  renderServicesTable();
  setupPastWeeksToggle();

})();
