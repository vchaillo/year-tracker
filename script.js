

  const MONTHS = [
    'Janvier', 'Février', 'Mars', 'Avril',
    'Mai', 'Juin', 'Juillet', 'Août',
    'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const currentYear = new Date().getFullYear();

  let categories = [{"id": "sport", "name": "Sport"}, {"id": "work", "name": "Objectifs"}, {"id": "vacation", "name": "Liens sociaux"}];
  const defaultActivities = [{"id": "running", "name": "Running", "color": "#a855f7", "categoryId": "sport"}, {"id": "swimming", "name": "Natation", "color": "#3b82f6", "categoryId": "sport"}, {"id": "cycling", "name": "Vélo", "color": "#21a366", "categoryId": "sport"}, {"id": "strength", "name": "Musculation", "color": "#eab308", "categoryId": "sport"}, {"id": "conditioning", "name": "Renforcement", "color": "#f59e0b", "categoryId": "sport"}, {"id": "hiking", "name": "Randonnée", "color": "#b88154", "categoryId": "sport"}, {"id": "table-tennis", "name": "Ping-pong", "color": "#ec4899", "categoryId": "sport"}, {"id": "competition", "name": "Compétition", "color": "#ff2d2d", "categoryId": "sport"}, {"id": "work-1", "name": "Se lever tôt", "color": "#a855f7", "categoryId": "work"}, {"id": "work-2", "name": "Se coucher tôt", "color": "#3b82f6", "categoryId": "work"}, {"id": "work-3", "name": "Lire 20 minutes", "color": "#21a366", "categoryId": "work"}, {"id": "work-4", "name": "Recettes", "color": "#f59e0b", "categoryId": "work"}, {"id": "vacation-1", "name": "Voir des amis", "color": "#a855f7", "categoryId": "vacation"}, {"id": "vacation-2", "name": "Voir la famille", "color": "#3b82f6", "categoryId": "vacation"}, {"id": "vacation-3", "name": "Appeler un proche", "color": "#21a366", "categoryId": "vacation"}, {"id": "vacation-4", "name": "Sortie à deux", "color": "#f59e0b", "categoryId": "vacation"}, {"id": "vacation-5", "name": "Rencontrer quelqu’un", "color": "#eab308", "categoryId": "vacation"}, {"id": "vacation-6", "name": "Activité de groupe", "color": "#ec4899", "categoryId": "vacation"}, {"id": "work-notion", "name": "Notion", "color": "#eab308", "categoryId": "work"}, {"id": "work-important", "name": "Tâches importantes", "color": "#ec4899", "categoryId": "work"}];

  const initialCategories = JSON.parse(JSON.stringify(categories));

  const state = {
    year: currentYear,
    activeCategory: 'sport',
    selectedActivities: defaultActivities.filter(a => a.categoryId === 'sport').map(a => a.id),
    selections: Object.fromEntries(categories.map(c => [c.id, defaultActivities.filter(a => a.categoryId === c.id).map(a => a.id)])),
    activities: [...defaultActivities],
    entries: {}, details: {}, theme: 'system'
  };

  // Account data is loaded only after authentication.

  const $ = (selector) => document.getElementById('app').querySelector(selector);

  function loadSavedState(saved) {
    try {
      if (!saved) return;
      state.details = saved.details && typeof saved.details === 'object' ? saved.details : {};
      state.theme = ['system','light','dark'].includes(saved.theme) ? saved.theme : 'system';
      applyTheme();
      if (Number.isInteger(saved.year)) state.year = saved.year;
      if (Array.isArray(saved.categories)) categories = saved.categories;
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
      // Apply the requested Sport defaults once, preserving existing calendar entries.
      if ((saved.schemaVersion || 0) < 5 && categories.some(category => category.id === 'sport')) {
        if (!state.activities.some(activity => activity.id === 'competition')) {
          state.activities.push({...defaultActivities.find(activity => activity.id === 'competition')});
        }
        state.activities.forEach(activity => {
          if (activity.id === 'conditioning') { activity.name = 'Renforcement'; activity.color = '#f59e0b'; }
          if (activity.id === 'table-tennis') activity.color = '#ec4899';
          if (activity.id === 'strength') activity.color = '#eab308';
        });
        const sportOrder = ['running', 'swimming', 'cycling', 'strength', 'conditioning', 'hiking', 'competition', 'table-tennis'];
        const sportActivities = state.activities.filter(activity => activity.categoryId === 'sport');
        sportActivities.sort((a, b) => (sportOrder.indexOf(a.id) < 0 ? 99 : sportOrder.indexOf(a.id)) - (sportOrder.indexOf(b.id) < 0 ? 99 : sportOrder.indexOf(b.id)));
        state.activities = [...sportActivities, ...state.activities.filter(activity => activity.categoryId !== 'sport')];
        ['2026-02-14', '2026-04-12', '2026-10-25', '2026-12-12'].forEach(date => {
          state.entries[date] = [...new Set([...(state.entries[date] || []), 'competition'])];
        });
      }
      // Refresh the requested examples once; retain any removed goal with recorded history.
      if ((saved.schemaVersion || 0) < 6) {
        const social = categories.find(category => category.id === 'vacation');
        if (social && social.name === 'Équilibre') social.name = 'Liens sociaux';
        state.activities = state.activities.filter(activity => !['work-5', 'work-6'].includes(activity.id) || Object.values(state.entries).some(ids => ids.includes(activity.id)));
        state.activities.forEach(activity => {
          const preset = defaultActivities.find(item => item.id === activity.id);
          if (preset && (activity.id === 'work-4' || activity.id.startsWith('vacation-'))) activity.name = preset.name;
        });
        if (categories.some(category => category.id === 'work')) {
          defaultActivities.filter(activity => ['work-notion', 'work-important'].includes(activity.id)).forEach(activity => {
            if (!state.activities.some(item => item.id === activity.id)) state.activities.push({...activity});
          });
        }
        const order = ['running', 'swimming', 'cycling', 'strength', 'conditioning', 'hiking', 'table-tennis', 'competition'];
        state.activities.sort((a, b) => (a.categoryId === 'sport' && order.includes(a.id) ? order.indexOf(a.id) : 99) - (b.categoryId === 'sport' && order.includes(b.id) ? order.indexOf(b.id) : 99));
      }
      state.activeCategory = categories.some(category => category.id === saved.activeCategory) ? saved.activeCategory : categories[0]?.id || null;
      state.selections = saved.selections || {};
      categories.forEach(category => {
        const ids = state.activities.filter(activity => activity.categoryId === category.id).map(activity => activity.id);
        if (!Array.isArray(state.selections[category.id])) {
          state.selections[category.id] = category.id === 'sport' && Array.isArray(saved.selectedActivities) ? saved.selectedActivities : ids;
        }
        state.selections[category.id] = state.selections[category.id].filter(id => ids.includes(id));
      });
      state.selectedActivities = [...(state.selections[state.activeCategory] || [])];
    } catch (_) {
      // Keep the initial calendar if stored data cannot be read.
    }
  }

  function exportState() {
    if(state.activeCategory)state.selections[state.activeCategory] = [...state.selectedActivities];
    return JSON.parse(JSON.stringify({schemaVersion: 7, paletteVersion: 3, year:state.year, categories,
      activities: state.activities, entries: state.entries, details:state.details, theme:state.theme,
      activeCategory: state.activeCategory, selections: state.selections,
      selectedActivities: state.selectedActivities}));
  }

  function persist() {
    if (window.calendarCloud) window.calendarCloud.save(exportState());
  }

  window.calendarApp = {
    defaults: () => ({schemaVersion: 7, paletteVersion: 3, year:currentYear,
      categories: [], activities: [], entries: {}, details:{}, theme:'system', activeCategory:null,
      selections:{}, selectedActivities:[]}),
    load(data) { loadSavedState(JSON.parse(JSON.stringify(data))); render(); },
    export: exportState
  };

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
      enableDirectReorder(button, category.id, categoryBar, ids => { categories = reorderSubset(categories, ids); render(); });
    });
    const overview = false;
    $('#manageActivities').disabled = overview || !state.activeCategory;
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
      enableDirectReorder(label, activity.id, toolbar, ids => { state.activities = reorderSubset(state.activities, ids); render(); });
    });
    const add = document.createElement('button');
    add.className = 'add-button'; add.textContent = '+';
    add.setAttribute('aria-label', 'Ajouter une activité');
    add.disabled = !state.activeCategory;
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

        if (visibleIds.length) day.setAttribute('data-tooltip', visibleIds.map(id => { const detail=state.details[key]?.[id]; return [activityById(id)?.name, detail?.distance != null ? detail.distance+' km' : '', detail?.note || ''].filter(Boolean).join(' · '); }).join(' / '));
        if (visibleIds.some(id=>state.details[key]?.[id]?.note || state.details[key]?.[id]?.distance != null || (state.details[key]?.[id]?.count || 1)>1)) day.classList.add('has-note');
        day.addEventListener('click', event => toggleEntry(key, detailedMode || event.shiftKey));
        day.addEventListener('contextmenu', event => {event.preventDefault(); toggleEntry(key,true);});
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
    if (entries.has(activityId)) { entries.delete(activityId); removeDetail(key,activityId); }
    else entries.add(activityId);
    if (entries.size) state.entries[key] = [...entries];
    else delete state.entries[key];
    persist(); renderCalendar(); renderLegend(); renderGoals(); renderJournal();
  }

  let dayDraft = null;

  function toggleEntry(key, forceDetails = false) {
    if (state.activeCategory === 'overview') return;
    if (!forceDetails && state.selectedActivities.length === 1) {
      toggleSingleEntry(key, state.selectedActivities[0]);
      return;
    }
    const activities = state.activities.filter(activity => activity.categoryId === state.activeCategory);
    if (!activities.length) return;
    dayDraft = {key, changed:new Set(), values:{}};
    const [year, month, day] = key.split('-').map(Number);
    $('#dayPickerTitle').textContent = `${day} ${MONTHS[month - 1]} ${year}`;
    const choices = $('#dayPickerChoices');
    choices.replaceChildren();
    activities.forEach(activity => {
      const id=activity.id, included=(state.entries[key] || []).includes(id);
      const value={count:included ? (state.details[key]?.[id]?.count || 1) : 0,
        distance:state.details[key]?.[id]?.distance ?? null, note:state.details[key]?.[id]?.note || ''};
      dayDraft.values[id]=value;
      const row=document.createElement('div'); row.className='session-editor';
      const top=document.createElement('div'); top.className='session-top';
      const toggle=document.createElement('button'); toggle.type='button'; toggle.className='day-picker-choice';
      const dot=document.createElement('span');dot.className='activity-dot';dot.style.background=activity.color;
      const name=document.createElement('span');name.textContent=activity.name;
      const check=document.createElement('span');check.className='session-check';
      toggle.append(dot,name,check);
      const countLabel=document.createElement('label'); countLabel.className='count-label'; countLabel.textContent='Séances';
      const count=document.createElement('input'); count.type='number'; count.min='0';count.max='1000';count.step='1';count.required=true;count.value=value.count; count.setAttribute('aria-label','Nombre de séances · '+activity.name);countLabel.append(count);
      const fields=document.createElement('details');fields.className='session-fields';fields.open=Boolean(value.note || value.distance != null || value.count>1);
      const summary=document.createElement('summary');summary.textContent='Distance & note';
      const distanceLabel=document.createElement('label');distanceLabel.textContent='Distance (km)';
      const distance=document.createElement('input');distance.type='number';distance.min='0';distance.max='100000';distance.step='any';distance.placeholder='Ex. 10';distance.value=value.distance ?? '';distance.setAttribute('aria-label','Distance en kilomètres · '+activity.name);distanceLabel.append(distance);
      const note=document.createElement('textarea');note.maxLength=2000;note.rows=2;note.placeholder='Votre séance, une tâche accomplie…';note.value=value.note;note.setAttribute('aria-label','Note · '+activity.name);
      fields.append(summary,distanceLabel,note);
      const update=()=>{toggle.setAttribute('aria-pressed',String(value.count>0)); check.textContent=value.count>0?'✓':'+';row.classList.toggle('session-included',value.count>0);};
      toggle.addEventListener('click',()=>{value.count=value.count?0:1;count.value=value.count;dayDraft.changed.add(id);update();});
      count.addEventListener('input',()=>{value.count=Number(count.value);dayDraft.changed.add(id);update();});
      distance.addEventListener('input',()=>{value.distance=distance.value===''?null:Number(distance.value);if(value.distance!=null && !value.count){value.count=1;count.value=1;update();}dayDraft.changed.add(id);});
      note.addEventListener('input',()=>{value.note=note.value;if(value.note.trim() && !value.count){value.count=1;count.value=1;update();}dayDraft.changed.add(id);});
      top.append(toggle,countLabel);row.append(top,fields);choices.append(row); update();
    });
    $('#dayPicker').showModal();
  }

  $('#saveDayPicker').addEventListener('click', () => {
    if (!dayDraft) return;
    const inputs=[...$('#dayPickerChoices').querySelectorAll('input')];
    if (inputs.some(input=>!input.reportValidity())) return;
    const {key,changed,values}=dayDraft;
    const entries=new Set(state.entries[key] || []);
    changed.forEach(id=>{
      if(!activityById(id)) return;
      const value=values[id];
      if(value.count>0) {
        entries.add(id);
        state.details[key] ||= {};
        state.details[key][id]={count:value.count,distance:value.distance,note:value.note.trim()};
      } else {entries.delete(id);removeDetail(key,id);}
    });
    if(entries.size)state.entries[key]=[...entries]; else delete state.entries[key];
    const included=state.activities.filter(activity=>activity.categoryId===state.activeCategory && entries.has(activity.id)).map(activity=>activity.id);
    state.selectedActivities=[...new Set([...state.selectedActivities,...included])];
    state.selections[state.activeCategory]=[...state.selectedActivities];
    $('#dayPicker').close();render();
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
    renderGoals();
    renderJournal();
    persist();
  }

  function openModal() {
    $('#newActivityNumber').textContent = String(state.activities.filter(activity => activity.categoryId === state.activeCategory).length + 1).padStart(2, '0');
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

  // The authentication controller performs the first render.

  let activityDraft = [];
  let deletedActivityIds = new Set();
  let managerTrigger = null;

  function closeManager() {
    $('#manager').close();
    managerTrigger?.focus();
  }



  function liftItem(element, x, y) {
    const bounds = element.getBoundingClientRect();
    const ghost = element.cloneNode(true);
    // Preserve the exact appearance, including active colours and modal field styles.
    const originals = [element, ...element.querySelectorAll('*')];
    const copies = [ghost, ...ghost.querySelectorAll('*')];
    originals.forEach((node,index) => {
      const computed = getComputedStyle(node);
      for (const property of computed) copies[index].style.setProperty(property,computed.getPropertyValue(property));
    });
    ghost.setAttribute('aria-hidden','true');
    ghost.removeAttribute('id');
    ghost.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    ghost.classList.add('drag-lift');
    ghost.classList.remove('is-dragging');
    Object.assign(ghost.style, {width:bounds.width+'px', height:bounds.height+'px', left:bounds.left+'px', top:bounds.top+'px', transform:'scale(1.06) rotate(1deg)', transition:'none'});
    (element.closest('dialog') || document.getElementById('app')).append(ghost);
    element.classList.add('is-dragging');
    return {ghost, offsetX:x-bounds.left, offsetY:y-bounds.top};
  }

  function moveLift(lift, x, y) {
    lift.ghost.style.left = (x-lift.offsetX)+'px';
    lift.ghost.style.top = (y-lift.offsetY)+'px';
  }

  function animateReorder(container, element, target) {
    if (element.nextSibling === target || (!target && element === container.lastElementChild)) return;
    const children = [...container.children];
    const previous = new Map(children.map(node => [node,node.getBoundingClientRect()]));
    children.forEach(node => node.getAnimations().forEach(animation => animation.cancel()));
    container.insertBefore(element,target);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    children.filter(node=>node!==element).forEach(node => {
      const before=previous.get(node), after=node.getBoundingClientRect();
      const x=before.left-after.left,y=before.top-after.top;
      if(x || y) node.animate([{transform:`translate(${x}px,${y}px)`},{transform:'translate(0,0)'}],{duration:220,easing:'cubic-bezier(.2,.8,.2,1)'});
    });
  }

  function settleLift(lift, element) {
    const bounds=element.getBoundingClientRect();
    const animation=lift.ghost.animate([
      {left:lift.ghost.style.left,top:lift.ghost.style.top,transform:'scale(1.06) rotate(1deg)',opacity:1},
      {left:bounds.left+'px',top:bounds.top+'px',transform:'scale(1) rotate(0deg)',opacity:1}
    ],{duration:180,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});
    animation.finished.catch(()=>{}).finally(()=>lift.ghost.remove());
  }

  function enableDirectReorder(button, id, container, commit) {
    button.dataset.sortId = id;
    button.classList.add('direct-sortable');
    if (!container.sortClickGuard) {
      container.sortClickGuard = true;
      container.addEventListener('click', event => {
        if (Date.now() < (container.suppressSortClickUntil || 0)) {
          event.preventDefault(); event.stopImmediatePropagation();
        }
      }, true);
    }
    let drag = null;
    const finish = save => {
      if (!drag) return;
      clearTimeout(drag.timer);
      container.removeEventListener('pointermove', move);
      container.removeEventListener('pointerup', release);
      container.removeEventListener('pointercancel', cancel);
      container.removeEventListener('lostpointercapture', cancel);
      const lifted = drag.lift;
      drag = null;
      if (!lifted) return;
      settleLift(lifted,button); button.classList.remove('is-dragging');
      container.suppressSortClickUntil = Date.now()+400;
      if (save) commit([...container.children].filter(node => node.dataset.sortId).map(node => node.dataset.sortId));
      else render();
    };
    const begin = () => {
      if (!drag || drag.lift) return;
      drag.lift = liftItem(button, drag.x, drag.y);
      container.setPointerCapture(drag.pointerId);
    };
    const move = event => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const distance = Math.hypot(event.clientX-drag.x,event.clientY-drag.y);
      if (!drag.lift && drag.touch && distance>8) { finish(false); return; }
      if (!drag.lift && !drag.touch && distance>6) begin();
      if (!drag?.lift) return;
      event.preventDefault();
      moveLift(drag.lift,event.clientX,event.clientY);
      const peers = [...container.children].filter(node => node.dataset.sortId && node !== button);
      const target = peers.find(node => {
        const rect = node.getBoundingClientRect();
        return event.clientY < rect.top || (event.clientY <= rect.bottom && event.clientX < rect.left+rect.width/2);
      });
      const trailing = [...container.children].find(node => !node.dataset.sortId && node !== container.firstElementChild);
      animateReorder(container,button,target || trailing || null);
    };
    const release = () => finish(true);
    const cancel = () => finish(false);
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      drag = {pointerId:event.pointerId,x:event.clientX,y:event.clientY,touch:event.pointerType==='touch',lift:null};
      container.addEventListener('pointermove',move,{passive:false});
      container.addEventListener('pointerup',release);
      container.addEventListener('pointercancel',cancel);
      container.addEventListener('lostpointercapture',cancel);
      drag.timer = setTimeout(begin,250);
    });
    button.addEventListener('keydown', event => {
      if (event.key==='Escape') finish(false);
      if (!event.altKey || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const ids=[...container.children].filter(node=>node.dataset.sortId).map(node=>node.dataset.sortId);
      const from=ids.indexOf(id), to=from+(event.key==='ArrowLeft'?-1:1);
      if(to<0 || to>=ids.length)return;
      [ids[from],ids[to]]=[ids[to],ids[from]]; commit(ids);
    });
  }

  // Reorder only the visible rows; hidden categories retain their positions.
  function reorderSubset(items, orderedIds) {
    const wanted = new Set(orderedIds);
    const byId = new Map(items.map(item => [item.id, item]));
    let index = 0;
    return items.map(item => wanted.has(item.id) ? byId.get(orderedIds[index++]) : item);
  }

  function addReorderHandle(row, item, container, commit, rerender) {
    row.dataset.reorderId = item.id;
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'reorder-handle';
    handle.setAttribute('aria-label', `Réorganiser ${item.name}. Flèches haut et bas pour déplacer.`);
    handle.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><circle cx="8" cy="5" r="1.5"/><circle cx="16" cy="5" r="1.5"/><circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/><circle cx="8" cy="19" r="1.5"/><circle cx="16" cy="19" r="1.5"/></svg>';
    row.prepend(handle);
    let drag = null;
    const orderedIds = () => [...container.children].map(element => element.dataset.reorderId);
    const finish = (save) => {
      container.removeEventListener('pointermove', move);
      container.removeEventListener('pointerup', release);
      container.removeEventListener('pointercancel', cancel);
      container.removeEventListener('lostpointercapture', cancel);
      if (!drag) return;
      const moved = drag.moved;
      if (drag.lift) settleLift(drag.lift,row);
      drag = null;
      row.classList.remove('is-dragging');
      container.classList.remove('is-sorting');
      if (moved && save) commit(orderedIds());
      rerender();
      const restored = [...container.children].find(element => element.dataset.reorderId === item.id);
      restored?.querySelector('.reorder-handle')?.focus({preventScroll:true});
    };
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      drag = {pointerId:event.pointerId, x:event.clientX, y:event.clientY, moved:false};
      // Capture on the stable list so reordering does not interrupt the drag.
      container.addEventListener('pointermove', move);
      container.addEventListener('pointerup', release);
      container.addEventListener('pointercancel', cancel);
      container.addEventListener('lostpointercapture', cancel);
      container.setPointerCapture(event.pointerId);
    });
    const move = event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      if (!drag.moved && Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<5) return;
      if (!drag.lift) drag.lift = liftItem(row, drag.x, drag.y);
      moveLift(drag.lift,event.clientX,event.clientY);
      drag.moved = true;
      row.classList.add('is-dragging');
      container.classList.add('is-sorting');
      const siblings = [...container.children].filter(element => element !== row);
      const target = siblings.find(element => {
        const bounds = element.getBoundingClientRect();
        return event.clientY < bounds.top + bounds.height / 2;
      });
      animateReorder(container,row,target || null);
    };
    const release = () => finish(true);
    const cancel = () => finish(false);
    handle.addEventListener('keydown', event => {
      if (event.key === 'Escape' && drag) { event.preventDefault(); finish(false); return; }
      if (!['ArrowUp','ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const ids = orderedIds();
      const from = ids.indexOf(item.id), to = from + (event.key === 'ArrowUp' ? -1 : 1);
      if (to < 0 || to >= ids.length) return;
      [ids[from],ids[to]] = [ids[to],ids[from]];
      commit(ids); rerender();
      [...container.children].find(element => element.dataset.reorderId === item.id)?.querySelector('.reorder-handle')?.focus();
    });
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
      row.append(colorLabel, nameLabel, remove, createGoalEditor(activity)); rows.append(row);
      addReorderHandle(row, activity, rows, ids => { activityDraft = reorderSubset(activityDraft, ids); }, renderActivityRows);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({attrs:{width:16,height:16}});
    if (!activityDraft.some(activity=>activity.categoryId===state.activeCategory)) rows.textContent = 'Aucune activité. Vous pourrez en ajouter avec le bouton +.';
  }

  $('#manageActivities').addEventListener('click', event => {
    managerTrigger = event.currentTarget;
    $('#managerNewName').value = '';
    $('#managerNewColor').value = '#22c55e';
    $('#managerNewSwatch').style.setProperty('--swatch-color','#22c55e');
    activityDraft = JSON.parse(JSON.stringify(state.activities));
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
  function addManagerActivity() {
    const name = $('#managerNewName').value.trim();
    if (!name) { $('#managerNewName').focus(); return; }
    activityDraft.push({id:'activity-'+crypto.randomUUID(),name,color:$('#managerNewColor').value,categoryId:state.activeCategory});
    $('#managerNewName').value='';
    renderActivityRows();
    $('#managerStatus').textContent='Activité ajoutée. Enregistrez pour la conserver.';
    $('#managerNewName').focus();
  }
  $('#managerAddActivity').addEventListener('click',addManagerActivity);
  $('#managerNewName').addEventListener('keydown',event=>{
    if(event.key==='Enter') { event.preventDefault(); addManagerActivity(); }
  });
  $('#managerNewColor').addEventListener('input',()=>{
    $('#managerNewSwatch').style.setProperty('--swatch-color',$('#managerNewColor').value);
  });

  function saveManager() {
    if (!$('#managerForm').reportValidity() || !validGoals(activityDraft)) return;
    const createdIds = activityDraft.filter(activity=>!activityById(activity.id) && activity.categoryId===state.activeCategory).map(activity=>activity.id);
    state.activities = activityDraft.map(activity => ({...activity}));
    for (const [date, ids] of Object.entries(state.entries)) {
      const remaining = ids.filter(id => !deletedActivityIds.has(id));
      deletedActivityIds.forEach(id=>removeDetail(date,id));
      if (remaining.length) state.entries[date] = remaining;
      else delete state.entries[date];
    }
    state.selectedActivities = [...state.selectedActivities.filter(id => activityById(id)), ...createdIds];
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
    categoryDraft = JSON.parse(JSON.stringify(categories));
    categoryActivityDraft = JSON.parse(JSON.stringify(state.activities));
    $('#categoryError').textContent = '';
    $('#categoryNewForm').reset();
    renderCategoryEditor();
    $('#categoryManager').showModal();
  }

  function renderCategoryEditor() {
    const container = $('#categoryEditorRows');
    container.replaceChildren();
    categoryDraft.forEach((category, index) => {
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
      const number = document.createElement('span');
      number.className = 'activity-number'; number.textContent = String(index + 1).padStart(2, '0');
      row.append(name, remove, createGoalEditor(category)); container.append(row);
      addReorderHandle(row, category, container, ids => { categoryDraft = reorderSubset(categoryDraft, ids); }, renderCategoryEditor);
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
    if (!validGoals(categoryDraft)) { $('#categoryError').textContent='L’objectif doit être un nombre entier positif.'; return; }
    const names = categoryDraft.map(category => category.name.toLocaleLowerCase());
    if (names.some(name => !name) || new Set(names).size !== names.length) {
      $('#categoryError').textContent = 'Chaque catégorie doit avoir un nom différent et non vide.';
      return;
    }
    categories = categoryDraft.map(category => ({...category}));
    state.activities = categoryActivityDraft.map(activity => ({...activity}));
    if (!categories.some(category => category.id === state.activeCategory)) state.activeCategory = categories[0]?.id || null;
    state.selections = Object.fromEntries(categories.map(category => {
      const ids = state.activities.filter(activity => activity.categoryId === category.id).map(activity => activity.id);
      const previous = state.selections[category.id];
      return [category.id, previous ? previous.filter(id => ids.includes(id)) : ids];
    }));
    state.selectedActivities = [...(state.selections[state.activeCategory] || [])];
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

  // Goals and journal data are account state; interface navigation is transient.
  let detailedMode = false;
  let goalReference = '';
  function removeDetail(date,id) {
    if (!state.details[date]) return;
    delete state.details[date][id];
    if (!Object.keys(state.details[date]).length) delete state.details[date];
  }
  function applyTheme() {
    document.getElementById('app').dataset.theme=state.theme;
    $('#themeSelect').value=state.theme;
  }
  $('#themeSelect').addEventListener('change',()=>{state.theme=$('#themeSelect').value;applyTheme();persist();});
  function setEntryMode(details) {
    detailedMode=details;
    $('#quickMode').setAttribute('aria-pressed',String(!details));
    $('#detailMode').setAttribute('aria-pressed',String(details));
  }
  $('#quickMode').addEventListener('click',()=>setEntryMode(false));
  $('#detailMode').addEventListener('click',()=>setEntryMode(true));

  function createGoalEditor(item) {
    const panel=document.createElement('div');panel.className='goal-editor';
    const label=document.createElement('label');label.textContent='Objectif';
    const mode=document.createElement('select');mode.setAttribute('aria-label','Type d’objectif · '+item.name);
    [['','Sans objectif'],['min','Au moins'],['max','Au maximum']].forEach(([value,text])=>{const option=document.createElement('option');option.value=value;option.textContent=text;mode.append(option);});
    mode.value=item.goal?.mode || '';label.append(mode);
    const count=document.createElement('input');count.type='number';count.min='1';count.max='100000';count.step='1';count.value=item.goal?.target || 1;count.setAttribute('aria-label','Nombre visé · '+item.name);
    const period=document.createElement('select');period.setAttribute('aria-label','Fréquence de l’objectif · '+item.name);
    [['day','Par jour'],['week','Par semaine'],['month','Par mois'],['year','Par an']].forEach(([value,text])=>{const option=document.createElement('option');option.value=value;option.textContent=text;period.append(option);});period.value=item.goal?.period || 'week';
    const update=()=>{count.disabled=period.disabled=!mode.value;count.required=Boolean(mode.value);if(mode.value)item.goal={mode:mode.value,target:Number(count.value),period:period.value};else delete item.goal;};
    [mode,count,period].forEach(input=>input.addEventListener('input',update));
    count.disabled=period.disabled=!mode.value;
    panel.append(label,count,period);return panel;
  }
  function validGoals(items) {
    return items.every(item=>!item.goal || (['min','max'].includes(item.goal.mode) && ['day','week','month','year'].includes(item.goal.period) && Number.isInteger(item.goal.target) && item.goal.target>=1 && item.goal.target<=100000));
  }
  function localDateKey(date) {return dateKey(date.getFullYear(),date.getMonth(),date.getDate());}
  function periodBounds(reference,period) {
    const [year,month,day]=reference.split('-').map(Number);
    const start=new Date(year,month-1,day,12),end=new Date(start);
    if(period==='week'){start.setDate(start.getDate()-(start.getDay()+6)%7);end.setTime(start.getTime());end.setDate(end.getDate()+6);}
    if(period==='month'){start.setDate(1);end.setMonth(month,0);}
    if(period==='year'){start.setMonth(0,1);end.setMonth(11,31);}
    return [localDateKey(start),localDateKey(end)];
  }
  function goalProgress(ids,goal,reference) {
    const [start,end]=periodBounds(reference,goal.period);
    let count=0;
    Object.entries(state.entries).forEach(([date,entries])=>{if(date<start || date>end)return;entries.forEach(id=>{if(ids.includes(id))count+=state.details[date]?.[id]?.count || 1;});});
    const achieved=goal.mode==='min'?count>=goal.target:count<=goal.target;
    const ended=end<localDateKey(new Date());
    const status=goal.mode==='max'?(achieved?'Dans la limite':'Limite dépassée'):(achieved?'Objectif atteint':ended?'Objectif non atteint':'En cours');
    return {count,start,end,status,tone:goal.mode==='max'&&!achieved?'danger':achieved?'success':ended?'danger':'pending'};
  }
  function renderGoals() {
    const today=localDateKey(new Date());
    if(!goalReference || Number(goalReference.slice(0,4))!==state.year)goalReference=state.year===currentYear?today:`${state.year}-12-31`;
    $('#goalDate').value=goalReference;
    const cards=$('#goalCards');cards.replaceChildren();
    const category=categories.find(item=>item.id===state.activeCategory);
    const activities=state.activities.filter(item=>item.categoryId===state.activeCategory);
    const targets=[...(category?.goal?[{item:category,ids:activities.map(item=>item.id),category:true}]:[]),...activities.filter(item=>item.goal).map(item=>({item,ids:[item.id]}))];
    if(!targets.length){const empty=document.createElement('div');empty.className='empty-state';empty.textContent=categories.length?'Fixez un objectif dans « Gérer les activités » ou « Gérer les catégories ».':'Créez votre première catégorie pour commencer.';cards.append(empty);return;}
    const periods={day:'jour',week:'semaine',month:'mois',year:'an'};
    targets.forEach(({item,ids,category})=>{
      const result=goalProgress(ids,item.goal,goalReference);
      const card=document.createElement('article');card.className='goal-card';card.dataset.tone=result.tone;
      const label=document.createElement('p');label.className='eyebrow';label.textContent=category?'CATÉGORIE':'ACTIVITÉ';
      const name=document.createElement('h3');name.textContent=item.name;
      const amount=document.createElement('div');amount.className='goal-amount';const strong=document.createElement('strong');strong.textContent=result.count;const target=document.createElement('span');target.textContent=' / '+item.goal.target;amount.append(strong,target);
      const description=document.createElement('p');description.textContent=`${item.goal.mode==='min'?'Au moins':'Au maximum'} ${item.goal.target} séance${item.goal.target>1?'s':''} par ${periods[item.goal.period]}`;
      const track=document.createElement('div');track.className='goal-track';const fill=document.createElement('span');fill.style.width=Math.min(100,result.count/item.goal.target*100)+'%';track.append(fill);
      const status=document.createElement('p');status.className='goal-status';status.textContent=result.status;
      const dates=document.createElement('small');dates.textContent=result.start===result.end?formatDate(result.start):`${formatDate(result.start)} — ${formatDate(result.end)}`;
      card.append(label,name,amount,description,track,status,dates);cards.append(card);
    });
  }
  $('#goalDate').addEventListener('change',()=>{if(!$('#goalDate').value)return;goalReference=$('#goalDate').value;state.year=Number(goalReference.slice(0,4));render();});
  function formatDate(value,withTime=false) {
    if(!value)return '—';
    const date=/^\d{4}-\d{2}-\d{2}$/.test(value)?new Date(value+'T12:00:00'):new Date(value);
    if(!Number.isFinite(date.getTime()))return '—';
    return new Intl.DateTimeFormat('fr-FR',withTime?{dateStyle:'medium',timeStyle:'short'}:{day:'numeric',month:'short',year:'numeric'}).format(date);
  }
  function renderJournal() {
    const rows=$('#journalRows');rows.replaceChildren();
    const records=[];
    Object.entries(state.entries).sort(([a],[b])=>b.localeCompare(a)).forEach(([date,ids])=>{
      if(!date.startsWith(state.year+'-'))return;
      ids.forEach(id=>{const activity=activityById(id);if(activity?.categoryId===state.activeCategory)records.push({date,activity,detail:state.details[date]?.[id] || {count:1}});});
    });
    $('#journalCount').textContent=records.length+' entrée'+(records.length>1?'s':'');
    if(!records.length){const empty=document.createElement('p');empty.className='empty-state';empty.textContent='Votre journal commence au premier jour renseigné.';rows.append(empty);return;}
    records.slice(0,40).forEach(({date,activity,detail})=>{
      const row=document.createElement('article');row.className='journal-row';
      const when=document.createElement('time');when.dateTime=date;when.textContent=formatDate(date);
      const body=document.createElement('div');const title=document.createElement('h3');title.textContent=activity.name;title.style.setProperty('--activity-color',activity.color);
      const stats=document.createElement('span');stats.className='journal-stats';stats.textContent=`${detail.count || 1} séance${(detail.count || 1)>1?'s':''}${detail.distance!=null?' · '+detail.distance+' km':''}`;
      body.append(title,stats);if(detail.note){const note=document.createElement('p');note.textContent=detail.note;body.append(note);}
      const edit=document.createElement('button');edit.type='button';edit.className='text-button';edit.textContent='Modifier ↗';edit.setAttribute('aria-label',`Modifier ${activity.name} du ${formatDate(date)}`);edit.addEventListener('click',()=>toggleEntry(date,true));
      row.append(when,body,edit);rows.append(row);
    });
    if(records.length>40){const hint=document.createElement('p');hint.className='muted';hint.textContent='Les 40 dernières entrées sont affichées. Retrouvez les autres dans le calendrier.';rows.append(hint);}
  }
  function showProfile(show) {
    $('#trackerView').hidden=show;$('#profileView').hidden=!show;
    $('#accountMenu').hidden=true;$('#accountToggle').setAttribute('aria-expanded','false');
    document.querySelector('.year-nav').hidden=show;
    if(show)renderProfile();window.scrollTo({top:0,behavior:'smooth'});
  }
  $('#accountToggle').addEventListener('click',()=>{const open=$('#accountMenu').hidden;$('#accountMenu').hidden=!open;$('#accountToggle').setAttribute('aria-expanded',String(open));});
  $('#openProfile').addEventListener('click',()=>showProfile(true));
  $('#backToCalendar').addEventListener('click',()=>showProfile(false));
  $('#homeBrand').addEventListener('click',event=>{event.preventDefault();showProfile(false);});
  document.addEventListener('click',event=>{if(!event.target.closest('.account-control')){$('#accountMenu').hidden=true;$('#accountToggle').setAttribute('aria-expanded','false');}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){$('#accountMenu').hidden=true;$('#accountToggle').setAttribute('aria-expanded','false');}});
  let currentAccount=null;
  let accountLogins=[];
  function renderProfile() {
    const user=currentAccount;if(!user)return;
    $('#profileName').textContent=user.displayName || 'Votre compte';$('#profileEmail').textContent=user.email || '';
    $('#profileCreated').textContent=formatDate(user.createdAt,true);$('#profileLastLogin').textContent=formatDate(user.lastLoginAt,true);
    const history=$('#loginHistory');history.replaceChildren();accountLogins.forEach(date=>{const item=document.createElement('li');item.textContent=formatDate(date,true);history.append(item);});
    if(!accountLogins.length){const item=document.createElement('li');item.textContent='Aucune connexion enregistrée.';history.append(item);}
  }
  window.calendarApp.setAccount=(user,logins=[])=>{
    currentAccount=user;accountLogins=logins;
    $('#accountMenuName').textContent=user?.displayName || 'Votre compte';
    $('#accountInitial').textContent=(user?.displayName || 'Y').slice(0,1).toUpperCase();
    for(const id of ['#accountAvatar','#profileAvatar']){const img=$(id);img.hidden=!user?.photoURL;if(user?.photoURL)img.src=user.photoURL;else img.removeAttribute('src');}
    $('#accountInitial').hidden=Boolean(user?.photoURL);
    if(!user)showProfile(false);else renderProfile();
  };
