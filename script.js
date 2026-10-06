
  const STORAGE_KEY = 'year-tracker-v2';

  const MONTHS = [
    'Janvier', 'Février', 'Mars', 'Avril',
    'Mai', 'Juin', 'Juillet', 'Août',
    'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const currentYear = new Date().getFullYear();

  let categories = [{"id": "sport", "name": "Sport"}, {"id": "work", "name": "Objectifs"}, {"id": "vacation", "name": "Équilibre"}];
  const defaultActivities = [{"id": "running", "name": "Running", "color": "#a855f7", "categoryId": "sport"}, {"id": "swimming", "name": "Natation", "color": "#3b82f6", "categoryId": "sport"}, {"id": "cycling", "name": "Vélo", "color": "#21a366", "categoryId": "sport"}, {"id": "hiking", "name": "Randonnée", "color": "#b88154", "categoryId": "sport"}, {"id": "strength", "name": "Musculation", "color": "#eab308", "categoryId": "sport"}, {"id": "conditioning", "name": "Renfo", "color": "#ec4899", "categoryId": "sport"}, {"id": "table-tennis", "name": "Ping-pong", "color": "#f59e0b", "categoryId": "sport"}, {"id": "work-1", "name": "Se lever tôt", "color": "#a855f7", "categoryId": "work"}, {"id": "work-2", "name": "Se coucher tôt", "color": "#3b82f6", "categoryId": "work"}, {"id": "work-3", "name": "Lire 20 minutes", "color": "#21a366", "categoryId": "work"}, {"id": "work-4", "name": "Apprendre", "color": "#f59e0b", "categoryId": "work"}, {"id": "work-5", "name": "Méditer", "color": "#eab308", "categoryId": "work"}, {"id": "work-6", "name": "Sans réseaux sociaux", "color": "#ec4899", "categoryId": "work"}, {"id": "vacation-1", "name": "Repas maison", "color": "#a855f7", "categoryId": "vacation"}, {"id": "vacation-2", "name": "Boire suffisamment", "color": "#3b82f6", "categoryId": "vacation"}, {"id": "vacation-3", "name": "Temps dehors", "color": "#21a366", "categoryId": "vacation"}, {"id": "vacation-4", "name": "Pause écran", "color": "#f59e0b", "categoryId": "vacation"}, {"id": "vacation-5", "name": "Temps avec mes proches", "color": "#eab308", "categoryId": "vacation"}, {"id": "vacation-6", "name": "Tenir un journal", "color": "#ec4899", "categoryId": "vacation"}];

  const sampleEntries = {
  "2026-01-04": [
    "running"
  ],
  "2026-01-11": [
    "running"
  ],
  "2026-01-18": [
    "running"
  ],
  "2026-01-23": [
    "running"
  ],
  "2026-02-01": [
    "running"
  ],
  "2026-02-03": [
    "running"
  ],
  "2026-02-08": [
    "running"
  ],
  "2026-02-14": [
    "running"
  ],
  "2026-02-21": [
    "running"
  ],
  "2026-02-25": [
    "running"
  ],
  "2026-02-26": [
    "running"
  ],
  "2026-02-28": [
    "running",
    "cycling"
  ],
  "2026-03-10": [
    "running"
  ],
  "2026-03-12": [
    "running"
  ],
  "2026-03-14": [
    "running"
  ],
  "2026-03-17": [
    "running"
  ],
  "2026-03-18": [
    "cycling"
  ],
  "2026-03-19": [
    "running"
  ],
  "2026-03-20": [
    "cycling"
  ],
  "2026-03-21": [
    "running"
  ],
  "2026-03-22": [
    "strength"
  ],
  "2026-03-24": [
    "running"
  ],
  "2026-03-26": [
    "running"
  ],
  "2026-03-28": [
    "running"
  ],
  "2026-03-31": [
    "running"
  ],
  "2026-04-01": [
    "strength"
  ],
  "2026-04-02": [
    "running"
  ],
  "2026-04-03": [
    "cycling"
  ],
  "2026-04-04": [
    "running"
  ],
  "2026-04-05": [
    "strength"
  ],
  "2026-04-07": [
    "running"
  ],
  "2026-04-09": [
    "cycling"
  ],
  "2026-04-10": [
    "running"
  ],
  "2026-04-12": [
    "running"
  ],
  "2026-04-15": [
    "cycling"
  ],
  "2026-04-21": [
    "running"
  ],
  "2026-04-23": [
    "running"
  ],
  "2026-04-25": [
    "running"
  ],
  "2026-04-26": [
    "cycling"
  ],
  "2026-04-28": [
    "running"
  ],
  "2026-04-30": [
    "running"
  ],
  "2026-05-02": [
    "cycling"
  ],
  "2026-05-04": [
    "running"
  ],
  "2026-05-05": [
    "running"
  ],
  "2026-05-07": [
    "running"
  ],
  "2026-05-16": [
    "cycling"
  ],
  "2026-05-21": [
    "running"
  ],
  "2026-05-22": [
    "running"
  ],
  "2026-06-08": [
    "cycling"
  ],
  "2026-06-13": [
    "cycling"
  ],
  "2026-06-14": [
    "cycling"
  ],
  "2026-07-01": [
    "cycling"
  ],
  "2026-07-12": [
    "cycling"
  ],
  "2026-07-26": [
    "running"
  ],
  "2026-07-27": [
    "cycling"
  ],
  "2026-08-04": [
    "running",
    "cycling"
  ],
  "2026-08-09": [
    "running"
  ],
  "2026-08-12": [
    "cycling"
  ],
  "2026-08-14": [
    "cycling"
  ],
  "2026-08-18": [
    "cycling"
  ],
  "2026-08-19": [
    "running"
  ],
  "2026-08-20": [
    "cycling"
  ],
  "2026-08-21": [
    "running"
  ],
  "2026-08-22": [
    "cycling"
  ],
  "2026-08-24": [
    "cycling"
  ],
  "2026-08-26": [
    "cycling"
  ],
  "2026-08-29": [
    "cycling"
  ],
  "2026-09-03": [
    "cycling"
  ],
  "2026-09-21": [
    "running"
  ],
  "2026-09-24": [
    "cycling"
  ],
  "2026-10-05": [
    "running"
  ]
};

  const state = {
    year: currentYear,
    activeCategory: 'sport',
    selectedActivities: defaultActivities.filter(a => a.categoryId === 'sport').map(a => a.id),
    selections: Object.fromEntries(categories.map(c => [c.id, defaultActivities.filter(a => a.categoryId === c.id).map(a => a.id)])),
    activities: [...defaultActivities],
    entries: { ...sampleEntries }
  };

  loadSavedState();

  const $ = (selector) => document.getElementById('app').querySelector(selector);

  function loadSavedState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved) return;
      if (Array.isArray(saved.categories) && saved.categories.length) categories = saved.categories;
      if (Array.isArray(saved.activities)) {
        state.activities = saved.activities.map(activity => ({...activity, categoryId: activity.categoryId || 'sport'}));
        if ((saved.schemaVersion || 0) < 4) {
          defaultActivities.filter(activity => activity.categoryId !== 'sport').forEach(activity => {
            if (!state.activities.some(item => item.id === activity.id)) state.activities.push({...activity});
          });
        }
      }
      if (saved.entries && typeof saved.entries === 'object' && !Array.isArray(saved.entries)) state.entries = saved.entries;
      if ((saved.paletteVersion || 0) < 3) {
        state.activities.forEach(activity => {
          const preset = defaultActivities.find(item => item.id === activity.id);
          if (preset) activity.color = preset.color;
        });
      }
      state.activeCategory = categories.some(category => category.id === saved.activeCategory) ? saved.activeCategory : categories[0].id;
      state.selections = saved.selections || {};
      categories.forEach(category => {
        const ids = state.activities.filter(activity => activity.categoryId === category.id).map(activity => activity.id);
        if (!Array.isArray(state.selections[category.id])) {
          state.selections[category.id] = category.id === 'sport' && Array.isArray(saved.selectedActivities) ? saved.selectedActivities : ids;
        }
        state.selections[category.id] = state.selections[category.id].filter(id => ids.includes(id));
      });
      state.selectedActivities = [...state.selections[state.activeCategory]];
    } catch (_) {
      // Keep the initial calendar if stored data cannot be read.
    }
  }

  function persist() {
    state.selections[state.activeCategory] = [...state.selectedActivities];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      schemaVersion: 4, paletteVersion: 3, categories,
      activities: state.activities, entries: state.entries,
      activeCategory: state.activeCategory, selections: state.selections,
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
    const categoryBar = $('#categoryBar');
    categoryBar.replaceChildren();
    categories.forEach(category => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'category-button cursor-interaction';
      button.setAttribute('aria-pressed', String(state.activeCategory === category.id));
      button.textContent = category.name;
      if (category.id !== 'overview') {
        const count = document.createElement('span'); count.className='category-count';
        count.textContent = state.activities.filter(activity => activity.categoryId === category.id).length;
        button.append(count);
      }
      button.addEventListener('click', () => {
        if (state.activeCategory !== 'overview') state.selections[state.activeCategory] = [...state.selectedActivities];
        state.activeCategory = category.id;
        state.selectedActivities = category.id === 'overview'
          ? state.activities.map(activity => activity.id)
          : [...(state.selections[category.id] || [])];
        render();
      });
      categoryBar.append(button);
    });
    const overview = false;
    $('#manageActivities').disabled = overview;
    $('#manageActivities').hidden = overview;
    const manage = document.createElement('button');
    manage.type = 'button'; manage.className = 'category-button cursor-interaction';
    manage.textContent = 'Gérer les catégories';
    manage.addEventListener('click', openCategoryManager); categoryBar.append(manage);
    const activities = state.activities.filter(activity => activity.categoryId === state.activeCategory);
    const toolbar = $('#toolbar');
    toolbar.replaceChildren();
    if (overview) {
      const status = document.createElement('span'); status.className='overview-label';
      status.textContent='Toutes les catégories · Vue de consultation'; toolbar.append(status); return;
    }
    const all = document.createElement('button');
    const allSelected = activities.length > 0 && state.selectedActivities.length === activities.length;
    all.className = `activity-button ${allSelected ? 'active' : ''}`;
    all.textContent = 'Toutes';
    all.setAttribute('aria-pressed', String(activities.length > 0 && state.selectedActivities.length === activities.length));
    all.addEventListener('click', () => {
      state.selectedActivities = allSelected ? [] : activities.map(activity => activity.id);
      render();
    });
    toolbar.append(all);
    state.activities.filter(activity => activity.categoryId === state.activeCategory).forEach(activity => {
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
        render();
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

        if (visibleIds.length) day.setAttribute('data-tooltip', visibleIds.map(id => activityById(id)?.name).filter(Boolean).join(' · '));
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

  let dayDraft = null;

  function toggleEntry(key) {
    if (state.activeCategory === 'overview') return;
    if (state.selectedActivities.length === 1) {
      toggleSingleEntry(key, state.selectedActivities[0]);
      return;
    }
    const selected = state.activities.filter(activity => activity.categoryId === state.activeCategory).map(activity => activity.id);
    if (!selected.length) return;
    const dialog = $('#dayPicker');
    dayDraft = { key, entries: new Set(state.entries[key] || []) };
    const [year, month, day] = key.split('-').map(Number);
    $('#dayPickerTitle').textContent = `${day} ${MONTHS[month - 1]} ${year}`;
    const choices = $('#dayPickerChoices');
    choices.replaceChildren();
    selected.forEach(id => {
      const activity = activityById(id);
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
      function updateChoice() {
        const included = dayDraft.entries.has(id);
        action.textContent = included ? '✓' : '';
        action.setAttribute('aria-hidden', 'true');
        button.setAttribute('aria-label', `${included ? 'Retirer' : 'Ajouter'} ${activity.name}`);
        button.setAttribute('aria-pressed', String(included));
      }
      updateChoice();
      button.append(dot, label, action);
      button.addEventListener('click', () => {
        if (dayDraft.entries.has(id)) dayDraft.entries.delete(id);
        else dayDraft.entries.add(id);
        updateChoice();
      });
      choices.append(button);
    });
    dialog.showModal();
  }

  $('#saveDayPicker').addEventListener('click', () => {
    if (!dayDraft) return;
    const { key, entries } = dayDraft;
    if (entries.size) state.entries[key] = [...entries];
    else delete state.entries[key];
    // Preserve existing filters and include activities checked on the edited day.
    const included = state.activities.filter(activity => activity.categoryId === state.activeCategory && entries.has(activity.id)).map(activity => activity.id);
    state.selectedActivities = [...new Set([...state.selectedActivities, ...included])];
    state.selections[state.activeCategory] = [...state.selectedActivities];
    persist();
    $('#dayPicker').close();
    render();
  });
  // Escape, outside clicks and Cancel discard all uncommitted changes.
  $('#dayPicker').addEventListener('close', () => { dayDraft = null; });

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

    if (state.activeCategory === 'overview') {
      categories.forEach(category => {
        const ids = state.activities.filter(activity => activity.categoryId === category.id).map(activity => activity.id);
        const count = Object.entries(state.entries).filter(([date, entryIds]) => date.startsWith(String(state.year) + '-') && entryIds.some(id => ids.includes(id))).length;
        const item = document.createElement('span'); item.textContent = `${category.name} · ${count}`; legend.append(item);
      });
      return;
    }
    state.activities.filter(activity => activity.categoryId === state.activeCategory).forEach(activity => {
      const count = Object.entries(state.entries)
        .filter(([date, ids]) => date.startsWith(String(state.year) + '-') && ids.includes(activity.id))
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
    $('#yearLabel').textContent = state.year;

    renderToolbar();
    renderCalendar();
    renderLegend();
    persist();
  }

  function openModal() {
    $('#activityColor').value = '#22c55e';
    $('#newColorSwatch').style.setProperty('--swatch-color', $('#activityColor').value);
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

  $('#activityColor').addEventListener('input', () => $('#newColorSwatch').style.setProperty('--swatch-color', $('#activityColor').value));

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
      color,
      categoryId: state.activeCategory
    });

    state.selectedActivities = [...state.selectedActivities, id];

    persist();
    closeModal();
    render();
  });

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
    activityDraft.filter(activity => activity.categoryId === state.activeCategory).forEach((activity, index) => {
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
      color.addEventListener('input', () => { activity.color = color.value; colorLabel.style.setProperty('--swatch-color', color.value); });
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
      remove.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6"/></svg>';
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
        confirm.type = 'button'; confirm.className = 'save'; confirm.textContent = 'Supprimer';
        confirm.addEventListener('click', () => {
          deletedActivityIds.add(activity.id);
          activityDraft = activityDraft.filter(item => item.id !== activity.id);
          renderActivityRows();
          $('#managerStatus').textContent = 'Suppression préparée. Enregistrez pour appliquer, ou annulez pour conserver vos données.';
        });
        const actions = document.createElement('div');
        actions.className = 'modal-actions'; actions.append(keep, confirm);
        confirmation.append(message, actions); row.append(confirmation); keep.focus();
      });
      const number = document.createElement('span');
      number.className = 'activity-number'; number.textContent = String(index + 1).padStart(2, '0');
      row.append(number, colorLabel, nameLabel, remove); rows.append(row);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({attrs:{width:16,height:16}});
    if (!activityDraft.length) rows.textContent = 'Aucune activité. Vous pourrez en ajouter avec le bouton +.';
  }

  $('#manageActivities').addEventListener('click', event => {
    managerTrigger = event.currentTarget;
    activityDraft = state.activities.map(activity => ({...activity}));
    deletedActivityIds = new Set();
    $('#managerStatus').textContent = '';
    $('#managerTitle').firstChild.textContent = 'Activités · ' + categories.find(category => category.id === state.activeCategory).name;
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
  document.getElementById('app').addEventListener('keydown', event => {
    if (event.key === 'Escape' && $('#modalBackdrop').classList.contains('open')) closeModal();
  });
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
    Object.keys(state.selections).forEach(id => { state.selections[id] = state.selections[id].filter(activityId => activityById(activityId)); });
    persist();
    closeManager();
    render();
  }
  $('#managerForm').addEventListener('submit', event => {
    event.preventDefault();
    saveManager();
  });
  $('#saveManager').addEventListener('click', saveManager);


  let categoryDraft = [];
  let categoryActivityDraft = [];

  function openCategoryManager() {
    categoryDraft = categories.map(category => ({...category}));
    categoryActivityDraft = state.activities.map(activity => ({...activity}));
    $('#categoryError').textContent = '';
    $('#categoryNewForm').reset();
    renderCategoryEditor();
    $('#categoryManager').showModal();
  }

  function renderCategoryEditor() {
    const container = $('#categoryEditorRows');
    container.replaceChildren();
    categoryDraft.forEach(category => {
      const row = document.createElement('div');
      row.className = 'category-editor-row';
      const name = document.createElement('input');
      name.value = category.name;
      name.maxLength = 24;
      name.setAttribute('aria-label', `Nom de ${category.name}`);
      name.addEventListener('input', () => { category.name = name.value.trim(); });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'delete-activity cursor-interaction';
      const count = categoryActivityDraft.filter(activity => activity.categoryId === category.id).length;
      remove.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6"/></svg>';
      remove.disabled = categoryDraft.length === 1;
      remove.setAttribute('aria-label', `Supprimer ${category.name}`);
      remove.addEventListener('click', () => {
        if (row.querySelector('.category-delete-options')) return;
        const panel = document.createElement('div');
        panel.className = 'category-delete-options';
        const message = document.createElement('p');
        message.textContent = count
          ? `Déplacer les ${count} activités vers une autre catégorie avant de supprimer « ${category.name} ». Tous les jours enregistrés seront conservés.`
          : `Supprimer la catégorie vide « ${category.name} » ?`;
        const target = document.createElement('select');
        target.setAttribute('aria-label', 'Catégorie de destination');
        categoryDraft.filter(item => item.id !== category.id).forEach(item => {
          const option = document.createElement('option');
          option.value = item.id; option.textContent = item.name; target.append(option);
        });
        const actions = document.createElement('div');
        actions.className = 'modal-actions';
        const cancel = document.createElement('button');
        cancel.type = 'button'; cancel.textContent = 'Conserver'; cancel.className = 'cancel cursor-interaction';
        cancel.addEventListener('click', () => panel.remove());
        const confirm = document.createElement('button');
        confirm.type = 'button'; confirm.textContent = count ? 'Déplacer et supprimer' : 'Supprimer'; confirm.className = 'save cursor-interaction';
        confirm.addEventListener('click', () => {
          categoryActivityDraft.forEach(activity => {
            if (activity.categoryId === category.id) activity.categoryId = target.value;
          });
          categoryDraft = categoryDraft.filter(item => item.id !== category.id);
          renderCategoryEditor();
        });
        panel.append(message);
        if (count) panel.append(target);
        actions.append(cancel, confirm); panel.append(actions); row.append(panel);
      });
      row.append(name, remove); container.append(row);
    });
  }

  $('#categoryNewForm').addEventListener('submit', event => {
    event.preventDefault();
    const name = $('#newCategoryName').value.trim();
    if (!name) return;
    if (categoryDraft.some(category => category.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      $('#categoryError').textContent = 'Ce nom existe déjà.';
      return;
    }
    categoryDraft.push({id: `category-${Date.now()}`, name});
    $('#categoryNewForm').reset();
    $('#categoryError').textContent = '';
    renderCategoryEditor();
  });
  $('#cancelCategories').addEventListener('click', () => $('#categoryManager').close());
  $('#saveCategories').addEventListener('click', () => {
    const names = categoryDraft.map(category => category.name.toLocaleLowerCase());
    if (names.some(name => !name) || new Set(names).size !== names.length) {
      $('#categoryError').textContent = 'Chaque catégorie doit avoir un nom différent et non vide.';
      return;
    }
    categories = categoryDraft.map(category => ({...category}));
    state.activities = categoryActivityDraft.map(activity => ({...activity}));
    if (!categories.some(category => category.id === state.activeCategory)) state.activeCategory = categories[0].id;
    state.selections = Object.fromEntries(categories.map(category => {
      const ids = state.activities.filter(activity => activity.categoryId === category.id).map(activity => activity.id);
      const previous = state.selections[category.id];
      return [category.id, previous ? previous.filter(id => ids.includes(id)) : ids];
    }));
    state.selectedActivities = [...state.selections[state.activeCategory]];
    $('#categoryManager').close();
    render();
  });
  let categoryPointerOutside = false;
  function outsideCategoryManager(event) {
    const bounds = $('#categoryManager').getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  }
  $('#categoryManager').addEventListener('pointerdown', event => {
    categoryPointerOutside = event.target === $('#categoryManager') && outsideCategoryManager(event);
  });
  $('#categoryManager').addEventListener('click', event => {
    if (categoryPointerOutside && event.target === $('#categoryManager') && outsideCategoryManager(event)) $('#categoryManager').close();
    categoryPointerOutside = false;
  });
  $('#resetStorage').addEventListener('click', () => $('#resetDialog').showModal());
  $('#cancelReset').addEventListener('click', () => $('#resetDialog').close());
  $('#confirmReset').addEventListener('click', () => {
    // Remove this app's storage only; other apps on the same origin remain intact.
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });
