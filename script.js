  const STORAGE_KEY = 'year-tracker-v2';

  const MONTHS = [
    'Janvier', 'Février', 'Mars', 'Avril',
    'Mai', 'Juin', 'Juillet', 'Août',
    'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const currentYear = new Date().getFullYear();

  const defaultActivities = [
    { id: 'running', name: 'Running', color: '#21a366' },
    { id: 'swimming', name: 'Natation', color: '#3b82f6' },
    { id: 'cycling', name: 'Vélo', color: '#f59e0b' },
    { id: 'hiking', name: 'Randonnée', color: '#a855f7' }
  ];

  const sampleEntries = {
    [`${currentYear}-01-05`]: ['running'],
    [`${currentYear}-01-09`]: ['running', 'swimming'],
    [`${currentYear}-01-18`]: ['swimming'],
    [`${currentYear}-02-03`]: ['running'],
    [`${currentYear}-02-14`]: ['hiking'],
    [`${currentYear}-03-07`]: ['running'],
    [`${currentYear}-03-08`]: ['running'],
    [`${currentYear}-04-12`]: ['swimming'],
    [`${currentYear}-05-01`]: ['hiking'],
    [`${currentYear}-05-02`]: ['hiking'],
    [`${currentYear}-06-17`]: ['running'],
    [`${currentYear}-07-28`]: ['hiking'],
    [`${currentYear}-07-29`]: ['hiking'],
    [`${currentYear}-08-03`]: ['running'],
    [`${currentYear}-09-10`]: ['swimming'],
    [`${currentYear}-10-06`]: ['running'],
    [`${currentYear}-10-07`]: ['running', 'swimming'],
    [`${currentYear}-11-18`]: ['swimming'],
    [`${currentYear}-12-24`]: ['hiking'],
    [`${currentYear}-12-25`]: ['hiking']
  };

  const state = {
    year: currentYear,
    selectedActivity: 'running',
    activities: [...defaultActivities],
    entries: { ...sampleEntries }
  };

  loadSavedState();

  const $ = (selector) => document.querySelector(selector);

  function loadSavedState() {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed.activities) && parsed.activities.length) {
        state.activities = parsed.activities;
      }

      if (parsed.entries && typeof parsed.entries === 'object') {
        state.entries = parsed.entries;
      }
    } catch (_) {
      // Ignore invalid local storage data and keep the defaults.
    }
  }

  function persist() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activities: state.activities,
        entries: state.entries
      })
    );
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function dateKey(year, month, day) {
    return `${year}-${pad(month + 1)}-${pad(day)}`;
  }

  function getMondayFirstDay(year, month) {
    const day = new Date(year, month, 1).getDay();
    return (day + 6) % 7;
  }

  function daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function activityById(id) {
    return state.activities.find(activity => activity.id === id);
  }

  function renderToolbar() {
    const toolbar = $('#toolbar');
    toolbar.innerHTML = '';

    const allButton = document.createElement('button');
    allButton.className =
      `activity-button ${state.selectedActivity === 'all' ? 'active' : ''}`;
    allButton.textContent = 'Toutes';

    allButton.addEventListener('click', () => {
      state.selectedActivity = 'all';
      render();
    });

    toolbar.appendChild(allButton);

    state.activities.forEach(activity => {
      const button = document.createElement('button');

      button.className =
        `activity-button ${state.selectedActivity === activity.id ? 'active' : ''}`;

      button.style.setProperty('--activity-color', activity.color);

      const dot = document.createElement('span');
      dot.className = 'activity-dot';

      button.appendChild(dot);
      button.appendChild(document.createTextNode(activity.name));

      button.addEventListener('click', () => {
        state.selectedActivity = activity.id;
        render();
      });

      toolbar.appendChild(button);
    });

    const add = document.createElement('button');
    add.className = 'add-button';
    add.textContent = '+';
    add.setAttribute('aria-label', 'Ajouter une activité');
    add.addEventListener('click', openModal);

    toolbar.appendChild(add);
  }

  function renderCalendar() {
    const calendar = $('#calendar');
    calendar.innerHTML = '';

    const today = new Date();

    MONTHS.forEach((monthName, month) => {
      const monthElement = document.createElement('article');
      monthElement.className = 'month';

      const title = document.createElement('h2');
      title.className = 'month-title';
      title.textContent = monthName;
      monthElement.appendChild(title);

      const weekdays = document.createElement('div');
      weekdays.className = 'weekdays';

      WEEKDAYS.forEach(day => {
        const weekday = document.createElement('div');
        weekday.className = 'weekday';
        weekday.textContent = day;
        weekdays.appendChild(weekday);
      });

      monthElement.appendChild(weekdays);

      const days = document.createElement('div');
      days.className = 'days';

      const offset = getMondayFirstDay(state.year, month);
      const count = daysInMonth(state.year, month);

      for (let i = 0; i < offset; i++) {
        const empty = document.createElement('div');
        empty.className = 'day empty';
        days.appendChild(empty);
      }

      for (let dayNumber = 1; dayNumber <= count; dayNumber++) {
        const key = dateKey(state.year, month, dayNumber);
        const entryIds = state.entries[key] || [];

        const visibleIds =
          state.selectedActivity === 'all'
            ? entryIds
            : entryIds.filter(id => id === state.selectedActivity);

        const day = document.createElement('button');
        day.className = 'day';
        day.textContent = dayNumber;
        day.setAttribute(
          'aria-label',
          `${dayNumber} ${monthName} ${state.year}`
        );

        if (
          today.getFullYear() === state.year &&
          today.getMonth() === month &&
          today.getDate() === dayNumber
        ) {
          day.classList.add('today');
        }

        if (state.selectedActivity === 'all' && entryIds.length > 0) {
          day.classList.add('marked');

          day.style.background =
            entryIds.length === 1
              ? activityById(entryIds[0])?.color || '#999'
              : createGradient(entryIds);

          if (entryIds.length > 1) {
            day.classList.add('multi');
          }
        } else if (
          state.selectedActivity !== 'all' &&
          visibleIds.length
        ) {
          day.classList.add('marked');

          const activity = activityById(state.selectedActivity);
          day.style.background = activity?.color || '#999';
        }

        day.addEventListener('click', () => toggleEntry(key));
        days.appendChild(day);
      }

      monthElement.appendChild(days);
      calendar.appendChild(monthElement);
    });
  }

  function createGradient(ids) {
    const colors = ids
      .map(id => activityById(id)?.color)
      .filter(Boolean);

    if (!colors.length) return '#999';
    if (colors.length === 1) return colors[0];

    const step = 100 / colors.length;

    return `linear-gradient(135deg, ${colors
      .map(
        (color, index) =>
          `${color} ${index * step}%, ${color} ${(index + 1) * step}%`
      )
      .join(', ')})`;
  }

  function toggleEntry(key) {
    if (state.selectedActivity === 'all') return;

    const activityId = state.selectedActivity;
    const entries = new Set(state.entries[key] || []);

    if (entries.has(activityId)) {
      entries.delete(activityId);
    } else {
      entries.add(activityId);
    }

    if (entries.size) {
      state.entries[key] = [...entries];
    } else {
      delete state.entries[key];
    }

    persist();
    renderCalendar();
    renderLegend();
  }

  function renderLegend() {
    const legend = $('#legend');
    legend.innerHTML = '';

    state.activities.forEach(activity => {
      const count = Object.values(state.entries)
        .filter(ids => ids.includes(activity.id))
        .length;

      const item = document.createElement('span');
      item.className = 'legend-item';

      const dot = document.createElement('span');
      dot.className = 'legend-dot';
      dot.style.background = activity.color;

      item.appendChild(dot);
      item.appendChild(
        document.createTextNode(`${activity.name} · ${count}`)
      );

      legend.appendChild(item);
    });
  }

  function render() {
    $('#yearTitle').textContent = state.year;
    $('#yearLabel').textContent = state.year;

    renderToolbar();
    renderCalendar();
    renderLegend();
  }

  function openModal() {
    $('#modalBackdrop').classList.add('open');
    $('#activityName').focus();
  }

  function closeModal() {
    $('#modalBackdrop').classList.remove('open');
    $('#activityForm').reset();
  }

  $('#prevYear').addEventListener('click', () => {
    state.year -= 1;
    render();
  });

  $('#nextYear').addEventListener('click', () => {
    state.year += 1;
    render();
  });

  $('#cancelModal').addEventListener('click', closeModal);

  $('#modalBackdrop').addEventListener('click', event => {
    if (event.target === $('#modalBackdrop')) {
      closeModal();
    }
  });

  $('#activityForm').addEventListener('submit', event => {
    event.preventDefault();

    const name = $('#activityName').value.trim();
    const color = $('#activityColor').value;

    if (!name) return;

    const id = `${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}-${Date.now()}`;

    state.activities.push({
      id,
      name,
      color
    });

    state.selectedActivity = id;

    persist();
    closeModal();
    render();
  });

  render();
