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
    { id: 'hiking', name: 'Randonnée', color: '#a855f7' },
    { id: 'strength', name: 'Musculation', color: '#ef4444' },
    { id: 'conditioning', name: 'Renfo', color: '#14b8a6' }
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
    selectedActivities: defaultActivities.map(activity => activity.id),
    activities: [...defaultActivities],
    entries: { ...sampleEntries }
  };

  loadSavedState();

  const $ = (selector) => document.querySelector(selector);

  function loadSavedState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.activities)) {
        state.activities = parsed.activities;
        // Add new defaults once without restoring activities deleted later.
        if (!parsed.schemaVersion) {
          for (const activity of defaultActivities.slice(4)) {
            if (!state.activities.some(item => item.id === activity.id)) state.activities.push({...activity});
          }
        }
      }
      if (parsed.entries && typeof parsed.entries === 'object' && !Array.isArray(parsed.entries)) state.entries = parsed.entries;
      if (Array.isArray(parsed.selectedActivities)) state.selectedActivities = parsed.selectedActivities;
      state.selectedActivities = state.selectedActivities.filter(id => state.activities.some(activity => activity.id === id));
    } catch (_) {
      // Keep the defaults when storage is unavailable or invalid.
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      schemaVersion: 3,
      activities: state.activities,
      entries: state.entries,
      selectedActivities: state.selectedActivities
    }));
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
    toolbar.replaceChildren();
    const all = document.createElement('button');
    const allSelected = state.activities.length > 0 && state.selectedActivities.length === state.activities.length;
    all.className = `activity-button ${allSelected ? 'active' : ''}`;
    all.textContent = 'Toutes';
    all.setAttribute('aria-pressed', String(state.activities.length > 0 && state.selectedActivities.length === state.activities.length));
    all.addEventListener('click', () => {
      state.selectedActivities = allSelected ? [] : state.activities.map(activity => activity.id);
      persist(); render();
    });
    toolbar.append(all);
    state.activities.forEach(activity => {
      const label = document.createElement('button');
      label.type = 'button';
      label.className = 'activity-button activity-choice';
      label.style.setProperty('--activity-color', activity.color);
      const selected = state.selectedActivities.includes(activity.id);
      label.classList.toggle('active', selected);
      label.setAttribute('aria-pressed', String(selected));
      const dot = document.createElement('span'); dot.className = 'activity-dot';
      label.append(dot, document.createTextNode(activity.name));
      label.addEventListener('click', () => {
        state.selectedActivities = !selected
          ? [...state.selectedActivities, activity.id]
          : state.selectedActivities.filter(id => id !== activity.id);
        persist(); render();
      });
      toolbar.append(label);
    });
    const add = document.createElement('button');
    add.className = 'add-button'; add.textContent = '+';
    add.setAttribute('aria-label', 'Ajouter une activité');
    add.addEventListener('click', openModal); toolbar.append(add);

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

        const visibleIds = entryIds.filter(id => state.selectedActivities.includes(id));

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

        if (visibleIds.length) {
          day.classList.add('marked');
          day.style.background = createGradient(visibleIds);
          if (visibleIds.length > 1) day.classList.add('multi');
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

  function toggleSingleEntry(key, activityId) {
    const entries = new Set(state.entries[key] || []);
    if (entries.has(activityId)) entries.delete(activityId);
    else entries.add(activityId);
    if (entries.size) state.entries[key] = [...entries];
    else delete state.entries[key];
    persist(); renderCalendar(); renderLegend();
  }

  function toggleEntry(key) {
    const hasSelection = state.selectedActivities.length > 0;
    const selected = hasSelection
      ? state.selectedActivities.filter(id => activityById(id))
      : state.activities.map(activity => activity.id);
    if (!selected.length) return;
    if (hasSelection && selected.length === 1) {
      toggleSingleEntry(key, selected[0]);
      return;
    }
    const dialog = $('#dayPicker');
    const [year, month, day] = key.split('-').map(Number);
    $('#dayPickerTitle').textContent = `${day} ${MONTHS[month - 1]} ${year}`;
    const choices = $('#dayPickerChoices');
    choices.replaceChildren();
    selected.forEach(id => {
      const activity = activityById(id);
      const present = (state.entries[key] || []).includes(id);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'day-picker-choice';
      const dot = document.createElement('span');
      dot.className = 'activity-dot';
      dot.style.background = activity.color;
      const label = document.createElement('span');
      label.textContent = activity.name;
      const action = document.createElement('span');
      action.className = 'day-picker-action';
      action.textContent = present ? 'Retirer' : 'Ajouter';
      button.setAttribute('aria-label', `${action.textContent} ${activity.name}`);
      button.append(dot, label, action);
      button.addEventListener('click', () => {
        toggleSingleEntry(key, id);
        dialog.close();
      });
      choices.append(button);
    });
    dialog.showModal();
  }

  $('#cancelDayPicker').addEventListener('click', () => $('#dayPicker').close());
  let dayPickerPointerOutside = false;
  function isOutsideDayPicker(event) {
    const bounds = $('#dayPicker').getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom;
  }
  $('#dayPicker').addEventListener('pointerdown', event => {
    dayPickerPointerOutside = event.target === $('#dayPicker') && isOutsideDayPicker(event);
  });
  $('#dayPicker').addEventListener('click', event => {
    if (dayPickerPointerOutside && event.target === $('#dayPicker') && isOutsideDayPicker(event)) $('#dayPicker').close();
    dayPickerPointerOutside = false;
  });

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

    state.selectedActivities = [...state.selectedActivities, id];

    persist();
    closeModal();
    render();
  });

  persist();
  render();

  let activityDraft = [];
  let deletedActivityIds = new Set();
  let managerTrigger = null;

  function closeManager() {
    $('#manager').close();
    managerTrigger?.focus();
  }

  function renderActivityRows() {
    const rows = $('#activityRows');
    rows.replaceChildren();
    activityDraft.forEach((activity, index) => {
      const row = document.createElement('div');
      row.className = 'manager-row';
      const colorLabel = document.createElement('label');
      colorLabel.className = 'color-field';
      colorLabel.style.setProperty('--swatch-color', activity.color);
      colorLabel.setAttribute('aria-label', `Couleur de ${activity.name}`);
      const color = document.createElement('input');
      color.type = 'color';
      color.value = activity.color;
      color.setAttribute('aria-label', `Couleur de ${activity.name}`);
      color.addEventListener('input', () => {
        activity.color = color.value;
        colorLabel.style.setProperty('--swatch-color', color.value);
      });
      colorLabel.append(color);
      const nameLabel = document.createElement('label');
      nameLabel.className = 'name-field';
      nameLabel.setAttribute('aria-label', `Nom de ${activity.name}`);
      const name = document.createElement('input');
      name.value = activity.name;
      name.required = true;
      name.maxLength = 24;
      name.addEventListener('input', () => {
        name.setCustomValidity(name.value.trim() ? '' : 'Saisissez un nom.');
        activity.name = name.value.trim();
      });
      nameLabel.append(name);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'delete-activity';
      remove.textContent = '×';
      remove.classList.add('cursor-interaction');
      remove.setAttribute('aria-label', `Supprimer ${activity.name}`);
      remove.addEventListener('click', () => {
        if (row.querySelector('.delete-confirmation')) return;
        const confirmation = document.createElement('div');
        confirmation.className = 'delete-confirmation';
        const count = Object.values(state.entries).filter(ids => ids.includes(activity.id)).length;
        const message = document.createElement('p');
        message.textContent = `Supprimer « ${activity.name} » et ses ${count} jours enregistrés, toutes années confondues ? Les autres activités seront conservées.`;
        const keep = document.createElement('button');
        keep.type = 'button'; keep.className = 'cancel'; keep.textContent = 'Conserver';
        keep.addEventListener('click', () => { confirmation.remove(); remove.focus(); });
        const confirm = document.createElement('button');
        confirm.type = 'button'; confirm.className = 'delete-activity'; confirm.textContent = 'Oui, supprimer';
        confirm.addEventListener('click', () => {
          deletedActivityIds.add(activity.id);
          activityDraft = activityDraft.filter(item => item.id !== activity.id);
          renderActivityRows();
          $('#managerStatus').textContent = 'Suppression préparée. Enregistrez pour appliquer, ou annulez pour conserver vos données.';
        });
        confirmation.append(message, keep, confirm); row.append(confirmation); keep.focus();
      });
      const number = document.createElement('span');
      number.className = 'activity-number'; number.textContent = String(index + 1).padStart(2, '0');
      row.append(number, colorLabel, nameLabel, remove); rows.append(row);
    });

    if (!activityDraft.length) rows.textContent = 'Aucune activité. Vous pourrez en ajouter avec le bouton +.';
  }

  $('#manageActivities').addEventListener('click', event => {
    managerTrigger = event.currentTarget;
    activityDraft = state.activities.map(activity => ({...activity}));
    deletedActivityIds = new Set();
    $('#managerStatus').textContent = '';
    renderActivityRows();
    $('#manager').showModal();
  });
  // Closing discards the draft; only Save commits activity edits.
  $('#manager').addEventListener('cancel', event => {
    event.preventDefault();
    closeManager();
  });
  let pointerStartedOutside = false;
  function isOutsideManager(event) {
    const bounds = $('#manager').getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom;
  }
  $('#manager').addEventListener('pointerdown', event => {
    pointerStartedOutside = event.target === $('#manager') && isOutsideManager(event);
  });
  $('#manager').addEventListener('click', event => {
    if (pointerStartedOutside && event.target === $('#manager') && isOutsideManager(event)) closeManager();
    pointerStartedOutside = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && $('#modalBackdrop').classList.contains('open')) closeModal();
  });
  $('#closeManager').addEventListener('click', closeManager);
  $('#cancelManager').addEventListener('click', closeManager);
  function saveManager() {
    if (!$('#managerForm').reportValidity()) return;
    state.activities = activityDraft.map(activity => ({...activity}));
    for (const [date, ids] of Object.entries(state.entries)) {
      const remaining = ids.filter(id => !deletedActivityIds.has(id));
      if (remaining.length) state.entries[date] = remaining;
      else delete state.entries[date];
    }
    state.selectedActivities = state.selectedActivities.filter(id => activityById(id));
    persist();
    closeManager();
    render();
  }
  $('#managerForm').addEventListener('submit', event => {
    event.preventDefault();
    saveManager();
  });
  $('#saveManager').addEventListener('click', saveManager);
