

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
      button.textContent = `${category.emoji ? category.emoji+' ' : ''}${category.name}`;
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

  function renderYearCalendar() {
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
        day.addEventListener('click', event => toggleEntry(key, event.shiftKey));
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
    render();
  }

  let dayDraft = null;

  function toggleEntry(key, forceDetails = false, onlyIds = null) {
    if (!forceDetails && state.selectedActivities.length === 1) {
      toggleSingleEntry(key, state.selectedActivities[0]); return;
    }
    const activities = onlyIds ? state.activities.filter(activity=>onlyIds.includes(activity.id)) : state.activities.filter(activity=>activity.categoryId===state.activeCategory);
    if (!activities.length) return;
    clearInvalid('#dayPicker');
    dayDraft = {key};
    $('#dayPickerTitle').textContent = formatDate(key);
    const choices=$('#dayPickerChoices'); choices.replaceChildren();
    activities.forEach(activity=>{
      const id=activity.id, detail=state.details[key]?.[id] || {};
      let quantity=(state.entries[key] || []).includes(id)?detail.count || 1:0;
      const row=document.createElement('div');row.className='session-editor';
      const top=document.createElement('div');top.className='session-top';
      const toggle=document.createElement('button');toggle.type='button';toggle.className='day-picker-choice';
      const dot=document.createElement('span');dot.className='activity-dot';dot.style.background=activity.color;
      const name=document.createElement('span');name.textContent=activity.name;
      const check=document.createElement('span');check.className='session-check';toggle.append(dot,name,check);
      const countLabel=document.createElement('label');countLabel.className='count-label';countLabel.textContent='Nombre';
      const count=document.createElement('input');count.type='number';count.min='0';count.max='1000';count.step='1';count.required=true;count.value=quantity;count.setAttribute('aria-label','Nombre de séances · '+activity.name);countLabel.append(count);
      const distanceLabel=document.createElement('label');distanceLabel.className='distance-label';distanceLabel.textContent='Km';
      const distance=document.createElement('input');distance.type='number';distance.min='0';distance.max='100000';distance.step='any';distance.placeholder='—';distance.value=detail.distance ?? '';distance.setAttribute('aria-label','Distance en kilomètres · '+activity.name);distanceLabel.append(distance);
      const fields=document.createElement('details');fields.className='session-fields';fields.open=Boolean(detail.note);
      const summary=document.createElement('summary');summary.textContent='Note';
      const note=document.createElement('textarea');note.maxLength=2000;note.rows=2;note.placeholder='Votre séance, une tâche accomplie…';note.value=detail.note || '';note.setAttribute('aria-label','Note · '+activity.name);fields.append(summary,note);
      const update=()=>{quantity=(state.entries[key] || []).includes(id)?state.details[key]?.[id]?.count || 1:0;count.value=quantity;toggle.setAttribute('aria-pressed',String(quantity>0));check.textContent=quantity>0?'✓':'+';row.classList.toggle('session-included',quantity>0);distance.value=state.details[key]?.[id]?.distance ?? '';note.value=state.details[key]?.[id]?.note || '';};
      const save=patch=>{updateSession(key,id,patch);update();clearInvalid('#dayPicker');};
      toggle.addEventListener('click',()=>save({count:quantity?0:1}));
      count.addEventListener('input',()=>{if(!count.checkValidity()){markInvalid('#dayPicker','Nombre entier positif ou zéro requis');return;}save({count:Number(count.value)});});
      distance.addEventListener('input',()=>{if(!distance.checkValidity()){markInvalid('#dayPicker','Distance positive requise');return;}save({distance:distance.value===''?null:Number(distance.value)});});
      note.addEventListener('input',()=>save({note:note.value}));
      top.append(toggle,countLabel,distanceLabel);row.append(top,fields);choices.append(row);update();
    });
    clearInvalid('#dayPicker');refreshSaveIndicators();$('#dayPicker').showModal();
  }
  // Closing only dismisses the editor; valid changes are already persisted.
  $('#dayPicker').addEventListener('close', () => { dayDraft = null; });

  $('#closeDayPicker').addEventListener('click', () => $('#dayPicker').close());
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
    renderWorkspace();
    persist();
  }

  function openModal() {
    $('#manageActivities').click();$('#managerNewName').focus();
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
      color.addEventListener('input', () => { activity.color = color.value; colorLabel.style.setProperty('--swatch-color', color.value); persistItem(activity,{color:activity.color}); });
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
        if(activity.name){clearInvalid('#manager');persistItem(activity,{name:activity.name});}else markInvalid('#manager','Le nom ne peut pas être vide');
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
          removeActivity(activity.id);renderActivityRows();
          $('#managerStatus').textContent = 'Activité supprimée.';
        });
        const actions = document.createElement('div');
        actions.className = 'modal-actions'; actions.append(keep, confirm);
        confirmation.append(message, actions); row.append(confirmation); keep.focus();
      });
      const number = document.createElement('span');
      number.className = 'activity-number'; number.textContent = String(index + 1).padStart(2, '0');
      row.append(colorLabel, nameLabel, remove, createGoalEditor(activity)); rows.append(row);
      addReorderHandle(row, activity, rows, ids => { activityDraft = reorderSubset(activityDraft, ids); state.activities=reorderSubset(state.activities,ids);render(); }, renderActivityRows);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({attrs:{width:16,height:16}});
    if (!activityDraft.some(activity=>activity.categoryId===state.activeCategory)) rows.textContent = 'Aucune activité. Vous pourrez en ajouter avec le bouton +.';
  }

  $('#manageActivities').addEventListener('click', event => {
    managerTrigger = event.currentTarget;
    $('#managerNewName').value = '';
    $('#managerNewColor').value = '#22c55e';
    $('#managerNewSwatch').style.setProperty('--swatch-color','#22c55e');
    clearInvalid('#manager');
    activityDraft = JSON.parse(JSON.stringify(state.activities));
    deletedActivityIds = new Set();
    $('#managerStatus').textContent = '';
    $('#managerTitle').firstChild.textContent = 'Activités · ' + categories.find(category => category.id === state.activeCategory).name;
    renderActivityRows();clearInvalid('#manager');
    $('#manager').showModal();
  });
  // Valid manager edits are persisted immediately; closing does not roll them back.
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
  $('#closeManager').addEventListener('click', closeManager);
  function addManagerActivity() {
    const name = $('#managerNewName').value.trim();
    if (!name) { $('#managerNewName').focus(); return; }
    activityDraft.push({id:'activity-'+crypto.randomUUID(),name,color:$('#managerNewColor').value,categoryId:state.activeCategory});
    const created=activityDraft[activityDraft.length-1];state.activities.push(JSON.parse(JSON.stringify(created)));state.selectedActivities.push(created.id);render();
    $('#managerNewName').value='';
    renderActivityRows();
    $('#managerStatus').textContent='Activité créée.';
    $('#managerNewName').focus();
  }
  $('#managerAddActivity').addEventListener('click',addManagerActivity);
  $('#managerNewName').addEventListener('keydown',event=>{
    if(event.key==='Enter') { event.preventDefault(); addManagerActivity(); }
  });
  $('#managerNewColor').addEventListener('input',()=>{
    $('#managerNewSwatch').style.setProperty('--swatch-color',$('#managerNewColor').value);
  });

  $('#managerForm').addEventListener('submit',event=>{event.preventDefault();if($('#managerNewName').value.trim())addManagerActivity();});

  let categoryDraft = [];
  let categoryActivityDraft = [];

  function openCategoryManager() {
    clearInvalid('#categoryManager');
    categoryDraft = JSON.parse(JSON.stringify(categories));
    categoryActivityDraft = JSON.parse(JSON.stringify(state.activities));
    $('#categoryError').textContent = '';
    $('#categoryNewForm').reset();
    renderCategoryEditor();clearInvalid('#categoryManager');
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
      name.required=true;
      name.setAttribute('aria-label', `Nom de ${category.name}`);
      name.addEventListener('input', () => { category.name=name.value.trim();const valid=category.name && !categories.some(item=>item.id!==category.id && item.name.toLocaleLowerCase()===category.name.toLocaleLowerCase());name.setCustomValidity(valid?'':'Choisissez un nom unique et non vide');if(valid){clearInvalid('#categoryManager');persistItem(category,{name:category.name});}else markInvalid('#categoryManager','Choisissez un nom unique et non vide'); });
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
          state.activities.forEach(activity=>{if(activity.categoryId===category.id)activity.categoryId=target.value;});
          categories=categories.filter(item=>item.id!==category.id);reconcileCategories();render();renderCategoryEditor();
        });
        panel.append(message);
        if (count) panel.append(target);
        actions.append(cancel, confirm); panel.append(actions); row.append(panel);
      });
      const number = document.createElement('span');
      number.className = 'activity-number'; number.textContent = String(index + 1).padStart(2, '0');
      row.append(createEmojiPicker(category),name, remove, createGoalEditor(category)); container.append(row);
      addReorderHandle(row, category, container, ids => { categoryDraft = reorderSubset(categoryDraft, ids); categories=reorderSubset(categories,ids);render(); }, renderCategoryEditor);
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
    const created={id:'category-'+crypto.randomUUID(),name};categoryDraft.push(created);categories.push({...created});reconcileCategories();render();
    $('#categoryNewForm').reset();
    $('#categoryError').textContent = '';
    renderCategoryEditor();
  });
  $('#closeCategories').addEventListener('click',()=>$('#categoryManager').close());
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
  let goalReference = '';
  function removeDetail(date,id) {
    if (!state.details[date]) return;
    delete state.details[date][id];
    if (!Object.keys(state.details[date]).length) delete state.details[date];
  }
  function applyTheme() {
    document.getElementById('app').dataset.theme=state.theme;
    document.querySelectorAll('[name="appTheme"]').forEach(input=>{input.checked=input.value===state.theme;});
  }
  document.querySelectorAll('[name="appTheme"]').forEach(input=>input.addEventListener('change',()=>{if(input.checked){state.theme=input.value;applyTheme();persist();}}));

  function createGoalEditor(item) {
    const panel=document.createElement('div');panel.className='goal-editor';
    const label=document.createElement('label');label.textContent='Objectif';
    const mode=document.createElement('select');mode.setAttribute('aria-label','Type d’objectif · '+item.name);
    [['','Sans objectif'],['min','Au moins'],['max','Au maximum']].forEach(([value,text])=>{const option=document.createElement('option');option.value=value;option.textContent=text;mode.append(option);});
    mode.value=item.goal?.mode || '';label.append(mode);
    const count=document.createElement('input');count.type='number';count.min='1';count.max='100000';count.step='1';count.value=item.goal?.target || 1;count.setAttribute('aria-label','Nombre visé · '+item.name);
    const period=document.createElement('select');period.setAttribute('aria-label','Fréquence de l’objectif · '+item.name);
    [['day','Par jour'],['week','Par semaine'],['month','Par mois'],['year','Par an']].forEach(([value,text])=>{const option=document.createElement('option');option.value=value;option.textContent=text;period.append(option);});period.value=item.goal?.period || 'week';
    const update=()=>{count.disabled=period.disabled=!mode.value;count.required=Boolean(mode.value);if(mode.value)item.goal={mode:mode.value,target:Number(count.value),period:period.value};else delete item.goal;if(validGoals([item])){clearInvalid('#manager');clearInvalid('#categoryManager');persistItem(item,{goal:item.goal || null});}else markInvalid(state.activities.some(a=>a.id===item.id)?'#manager':'#categoryManager','L’objectif doit être un entier positif');};
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
    const reference=calendarDateForYear();
    $('#goalDate').value=reference;
    drawGoals($('#goalCards'),reference,state.activeCategory);
    const count=goalTargets(state.activeCategory).length;
    $('#goalFoldSummary').textContent=count+' objectif'+(count>1?'s':'');
    if(!goalReference)goalReference=localDateKey(new Date());
    $('#globalGoalDate').value=goalReference;
    syncCategoryOptions($('#goalCategory'));
    drawGoals($('#globalGoalCards'),goalReference,$('#goalCategory').value || null,$('#goalStatus').value);
  }
  $('#goalDate').addEventListener('change',()=>{if(!$('#goalDate').value)return;focusDate=$('#goalDate').value;state.year=Number(focusDate.slice(0,4));render();});
  $('#globalGoalDate').addEventListener('change',()=>{if(!$('#globalGoalDate').value)return;goalReference=$('#globalGoalDate').value;renderGoals();});
  ['#goalCategory','#goalStatus'].forEach(id=>$(id).addEventListener('change',renderGoals));

  function formatDate(value,withTime=false) {
    if(!value)return '—';
    const date=/^\d{4}-\d{2}-\d{2}$/.test(value)?new Date(value+'T12:00:00'):new Date(value);
    if(!Number.isFinite(date.getTime()))return '—';
    return new Intl.DateTimeFormat('fr-FR',withTime?{dateStyle:'medium',timeStyle:'short'}:{day:'numeric',month:'short',year:'numeric'}).format(date);
  }
  let journalLimit=40;
  function renderJournal() {
    syncCategoryOptions($('#journalCategory'));
    const yearSelect=$('#journalYear'), previous=yearSelect.value || 'all';
    const years=[...new Set([state.year,...Object.keys(state.entries).map(date=>Number(date.slice(0,4)))])].sort((a,b)=>b-a);
    yearSelect.replaceChildren();appendOption(yearSelect,'all','Toutes les années');years.forEach(year=>appendOption(yearSelect,String(year),String(year)));yearSelect.value=years.map(String).includes(previous)?previous:'all';
    const rows=$('#journalRows');rows.replaceChildren();
    const records=[],filter=$('#journalCategory').value,year=yearSelect.value,search=$('#journalSearch').value.trim().toLocaleLowerCase();
    Object.entries(state.entries).sort(([a],[b])=>b.localeCompare(a)).forEach(([date,ids])=>{
      if(year!=='all' && !date.startsWith(year+'-'))return;
      ids.forEach(id=>{const activity=activityById(id);if(!activity || (filter && activity.categoryId!==filter))return;
        const detail=state.details[date]?.[id] || {count:1},category=categories.find(c=>c.id===activity.categoryId);
        if(search && ![activity.name,category?.name,detail.note].filter(Boolean).join(' ').toLocaleLowerCase().includes(search))return;
        records.push({date,activity,detail,category});});
    });
    $('#journalCount').textContent=records.length+' entrée'+(records.length>1?'s':'');
    if(!records.length)appendEmpty(rows,'Aucune activité ne correspond à ces filtres.');
    records.slice(0,journalLimit).forEach(({date,activity,detail,category})=>{
      const row=document.createElement('article');row.className='journal-row';
      const when=document.createElement('time');when.dateTime=date;when.textContent=formatDate(date);
      const body=document.createElement('div');const title=document.createElement('h3');title.textContent=activity.name;title.style.setProperty('--activity-color',activity.color);
      const tag=document.createElement('span');tag.className='category-tag';tag.textContent=categoryLabel(category);
      const stats=document.createElement('span');stats.className='journal-stats';stats.textContent=`${detail.count || 1} fois${detail.distance!=null?' · '+detail.distance+' km':''}`;
      body.append(title,tag,stats);if(detail.note){const note=document.createElement('p');note.textContent=detail.note;body.append(note);}
      const edit=makeButton('Modifier ↗',()=>toggleEntry(date,true,[activity.id]),'text-button');edit.setAttribute('aria-label',`Modifier ${activity.name} du ${formatDate(date)}`);
      row.append(when,body,edit);rows.append(row);
    });
    $('#moreJournal').hidden=records.length<=journalLimit;
  }
  ['#journalCategory','#journalYear','#journalSearch'].forEach(id=>$(id).addEventListener(id==='#journalSearch'?'input':'change',()=>{journalLimit=40;renderJournal();}));
  $('#moreJournal').addEventListener('click',()=>{journalLimit+=40;renderJournal();});
  function showProfile(show) {setPage(show?'profile':'calendar');}
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

  // A single source of truth feeds every view and the Firebase write queue.
  let currentPage='calendar';
  let calendarView=window.matchMedia('(max-width:600px)').matches?'month':'year';
  let focusDate=localDateKey(new Date());
  let agendaDate=localDateKey(new Date());
  let agendaView='day';
  function makeButton(text,action,className='') {
    const button=document.createElement('button');button.type='button';button.textContent=text;button.className=className;button.addEventListener('click',action);return button;
  }
  function appendEmpty(container,message) {const p=document.createElement('p');p.className='empty-state';p.textContent=message;container.append(p);}
  function appendOption(select,value,text) {const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}
  function categoryLabel(category) {return category?`${category.emoji ? category.emoji+' ' : ''}${category.name}`:'Catégorie';}
  function syncCategoryOptions(select) {
    const previous=select.value;select.replaceChildren();appendOption(select,'','Toutes les catégories');categories.forEach(category=>appendOption(select,category.id,categoryLabel(category)));select.value=categories.some(c=>c.id===previous)?previous:'';
  }
  function setPage(page) {
    currentPage=page;
    document.querySelectorAll('[data-workspace-page]').forEach(section=>{section.hidden=section.dataset.workspacePage!==page;});
    document.querySelectorAll('.page-nav [data-page]').forEach(button=>{if(button.dataset.page===page)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
    document.querySelector('.year-nav').hidden=page!=='calendar';
    $('#accountMenu').hidden=true;$('#accountToggle').setAttribute('aria-expanded','false');
    if(page==='profile')renderProfile();
    renderWorkspace();window.scrollTo({top:0,behavior:'smooth'});
  }
  document.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>setPage(button.dataset.page)));
  function calendarDateForYear() {
    if(Number(focusDate.slice(0,4))!==state.year){const [,month,day]=focusDate.split('-').map(Number);focusDate=dateKey(state.year,month-1,Math.min(day,daysInMonth(state.year,month-1)));}
    return focusDate;
  }
  function shiftDate(value,view,direction) {
    const [year,month,day]=value.split('-').map(Number),date=new Date(year,month-1,day,12);
    if(view==='year'){date.setDate(1);date.setFullYear(year+direction);date.setMonth(month-1);date.setDate(Math.min(day,daysInMonth(date.getFullYear(),month-1)));}
    else if(view==='month'){date.setDate(1);date.setMonth(date.getMonth()+direction);date.setDate(Math.min(day,daysInMonth(date.getFullYear(),date.getMonth())));}
    else date.setDate(date.getDate()+direction*(view==='week'?7:1));
    return localDateKey(date);
  }
  function periodLabel(value,view) {
    if(view==='year')return value.slice(0,4);
    if(view==='month'){const [year,month]=value.split('-').map(Number);return MONTHS[month-1]+' '+year;}
    if(view==='week'){const [start,end]=periodBounds(value,'week');return formatDate(start)+' — '+formatDate(end);}
    return formatDate(value);
  }
  document.querySelectorAll('[data-calendar-view]').forEach(button=>button.addEventListener('click',()=>{calendarView=button.dataset.calendarView;render();}));
  $('#previousPeriod').addEventListener('click',()=>navigateCalendar(-1));$('#nextPeriod').addEventListener('click',()=>navigateCalendar(1));
  function navigateCalendar(direction) {focusDate=shiftDate(calendarDateForYear(),calendarView,direction);state.year=Number(focusDate.slice(0,4));render();}
  $('#todayPeriod').addEventListener('click',()=>{focusDate=localDateKey(new Date());state.year=currentYear;render();});
  document.querySelectorAll('[data-agenda-view]').forEach(button=>button.addEventListener('click',()=>{agendaView=button.dataset.agendaView;renderWorkspace();}));
  $('#agendaDate').addEventListener('change',()=>{if($('#agendaDate').value){agendaDate=$('#agendaDate').value;renderWorkspace();}});
  $('#agendaPrevious').addEventListener('click',()=>{agendaDate=shiftDate(agendaDate,agendaView,-1);renderWorkspace();});
  $('#agendaNext').addEventListener('click',()=>{agendaDate=shiftDate(agendaDate,agendaView,1);renderWorkspace();});
  $('#agendaToday').addEventListener('click',()=>{agendaDate=localDateKey(new Date());renderWorkspace();});
  function renderCalendar() {
    const reference=calendarDateForYear(),calendar=$('#calendar');calendar.dataset.view=calendarView;
    document.querySelectorAll('[data-calendar-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.calendarView===calendarView)));
    $('#periodLabel').textContent=periodLabel(reference,calendarView);
    $('#categoryBar').hidden=calendarView==='week' || calendarView==='day';
    $('#toolbar').hidden=calendarView==='week' || calendarView==='day';
    document.querySelector('.management').hidden=calendarView==='week' || calendarView==='day';
    if(calendarView==='year'){renderYearCalendar();return;}
    calendar.replaceChildren();
    if(calendarView==='month')renderMonth(calendar,reference);
    if(calendarView==='week')renderWeek(calendar,reference,false);
    if(calendarView==='day')renderChecklist(calendar,reference,null);
  }
  function visibleActivityIds() {return new Set(state.selectedActivities);}
  function renderMonth(container,reference,agenda=false) {
    const [year,month]=reference.split('-').map(Number),visible=visibleActivityIds();
    const header=document.createElement('div');header.className='month-weekdays';WEEKDAYS.forEach(day=>{const span=document.createElement('span');span.textContent=day;header.append(span);});container.append(header);
    const grid=document.createElement('div');grid.className='month-grid';
    for(let i=0;i<getMondayFirstDay(year,month-1);i++){const empty=document.createElement('div');empty.className='month-cell empty';grid.append(empty);}
    for(let day=1;day<=daysInMonth(year,month-1);day++){
      const key=dateKey(year,month-1,day),ids=(state.entries[key] || []).filter(id=>agenda || visible.has(id));
      const cell=makeButton('',()=>{if(agenda){agendaDate=key;agendaView='day';renderWorkspace();}else toggleEntry(key);},'month-cell');
      cell.setAttribute('aria-label',`${day} ${MONTHS[month-1]} ${year}`);cell.classList.toggle('today',key===localDateKey(new Date()));
      const number=document.createElement('strong');number.textContent=day;cell.append(number);
      const chips=document.createElement('div');chips.className='month-activities';
      ids.slice(0,3).forEach(id=>{const activity=activityById(id);if(!activity)return;const label=document.createElement('span');label.className='calendar-chip';label.style.setProperty('--activity-color',activity.color);label.textContent=activity.name;chips.append(label);});
      if(ids.length>3){const more=document.createElement('small');more.textContent='+'+(ids.length-3);chips.append(more);}
      cell.append(chips);
      if(ids.some(id=>state.details[key]?.[id]?.note)){const marker=document.createElement('small');marker.className='month-note-marker';marker.textContent='✎';cell.append(marker);}
      if(!agenda)cell.addEventListener('contextmenu',event=>{event.preventDefault();toggleEntry(key,true);});
      grid.append(cell);
    }
    container.append(grid);
  }
  function renderWeek(container,reference,agenda=false) {
    const [start]=periodBounds(reference,'week');const grid=document.createElement('div');grid.className='week-grid';
    for(let offset=0;offset<7;offset++){
      const date=shiftDate(start,'day',offset),column=document.createElement('section');column.className='week-day';
      const label=makeButton(formatDate(date),()=>{if(agenda){agendaDate=date;agendaView='day';renderWorkspace();}else{focusDate=date;calendarView='day';state.year=Number(date.slice(0,4));render();}},'week-heading');column.append(label);
      if(agenda)renderChecklist(column,date,null,true);
      else {
        const ids=state.entries[date] || [];
        if(!ids.length){const empty=document.createElement('p');empty.className='muted';empty.textContent='Aucune activité';column.append(empty);}
        ids.forEach(id=>{const activity=activityById(id);if(!activity)return;const button=makeButton('',()=>toggleEntry(date,true,[id]),'week-activity');button.style.setProperty('--activity-color',activity.color);
          const name=document.createElement('strong');name.textContent=activity.name;
          const info=document.createElement('small');info.textContent=categoryLabel(categories.find(c=>c.id===activity.categoryId));
          const detail=state.details[date]?.[id];const text=document.createElement('span');text.textContent=[detail?.count>1?detail.count+' fois':'',detail?.distance!=null?detail.distance+' km':'',detail?.note || ''].filter(Boolean).join(' · ');button.append(name,info,text);column.append(button);});
        column.append(makeButton('+ Activité',()=>toggleEntry(date,true,state.activities.map(a=>a.id)),'text-button'));
      }
      column.classList.toggle('today',date===localDateKey(new Date()));grid.append(column);
    }
    container.append(grid);
  }
  function goalTargets(categoryId=null) {
    const selectedCategories=categoryId?categories.filter(c=>c.id===categoryId):categories;
    return selectedCategories.flatMap(category=>{
      const activities=state.activities.filter(a=>a.categoryId===category.id);
      return [...(category.goal?[{item:category,ids:activities.map(a=>a.id),category:true,parent:category}]:[]),...activities.filter(a=>a.goal).map(item=>({item,ids:[item.id],parent:category}))];
    });
  }
  function drawGoals(container,reference,categoryId=null,statusFilter='all') {
    container.replaceChildren();const periods={day:'jour',week:'semaine',month:'mois',year:'an'};
    const targets=goalTargets(categoryId).map(target=>({...target,result:goalProgress(target.ids,target.item.goal,reference)})).filter(target=>statusFilter==='all' || target.result.tone===statusFilter);
    if(!targets.length){appendEmpty(container,'Aucun objectif ici. Définissez-en dans la gestion des activités ou des catégories.');return;}
    targets.forEach(({item,parent,category,result})=>{
      const card=document.createElement('article');card.className='goal-card';card.dataset.tone=result.tone;
      const label=document.createElement('p');label.className='eyebrow';label.textContent=category?'CATÉGORIE':categoryLabel(parent);
      const name=document.createElement('h3');name.textContent=category?categoryLabel(item):item.name;
      const amount=document.createElement('div');amount.className='goal-amount';const strong=document.createElement('strong');strong.textContent=result.count;const target=document.createElement('span');target.textContent=' / '+item.goal.target;amount.append(strong,target);
      const description=document.createElement('p');description.textContent=`${item.goal.mode==='min'?'Au moins':'Au maximum'} ${item.goal.target} fois par ${periods[item.goal.period]}`;
      const track=document.createElement('div');track.className='goal-track';const fill=document.createElement('span');fill.style.width=Math.min(100,result.count/item.goal.target*100)+'%';track.append(fill);
      const status=document.createElement('p');status.className='goal-status';status.textContent=result.status;
      const dates=document.createElement('small');dates.textContent=result.start===result.end?formatDate(result.start):`${formatDate(result.start)} — ${formatDate(result.end)}`;
      const edit=makeButton('Modifier ↗',()=>{if(category)openCategoryManager();else{selectCategory(parent.id);$('#manageActivities').click();}},'text-button goal-edit');
      card.append(label,name,amount,description,track,status,dates,edit);container.append(card);
    });
  }
  function selectCategory(id) {
    if(state.activeCategory)state.selections[state.activeCategory]=[...state.selectedActivities];state.activeCategory=id;state.selectedActivities=[...(state.selections[id] || [])];render();
  }
  function renderChecklist(container,date,categoryId=null,compact=false) {
    const wrap=document.createElement('div');wrap.className='checklist';
    if(!compact){const header=document.createElement('div');header.className='checklist-heading';const h=document.createElement('h2');h.textContent=formatDate(date);const hint=document.createElement('p');hint.className='muted';hint.textContent='Les cases renseignent directement ce jour. Les compteurs suivent la période de chaque objectif.';header.append(h,hint);wrap.append(header);}
    const selectedCategories=categoryId?categories.filter(c=>c.id===categoryId):categories;
    if(!state.activities.length){appendEmpty(wrap,'Créez une catégorie et une activité pour commencer.');wrap.append(makeButton('Gérer les catégories ↗',openCategoryManager,'text-button'));}
    selectedCategories.forEach(category=>{
      const activities=state.activities.filter(a=>a.categoryId===category.id);if(!activities.length)return;
      const group=document.createElement('section');group.className='checklist-group';const title=document.createElement('h3');title.textContent=categoryLabel(category);group.append(title);
      if(category.goal){const result=goalProgress(activities.map(a=>a.id),category.goal,date);const summary=document.createElement('p');summary.className='category-goal-line';summary.textContent=`${category.goal.mode==='min'?'Minimum':'Maximum'} ${category.goal.target} · ${result.count} effectuées · ${result.status}`;group.append(summary);}
      const required=activities.filter(a=>a.goal?.mode==='min');
      const others=activities.filter(a=>a.goal?.mode!=='min');
      required.forEach(activity=>group.append(checklistRow(activity,date)));
      if(others.length){const details=document.createElement('details');details.className='other-activities';details.open=!required.length;const summary=document.createElement('summary');summary.textContent='Autres activités ('+others.length+')';details.append(summary);others.forEach(activity=>details.append(checklistRow(activity,date)));group.append(details);}
      wrap.append(group);
    });
    container.append(wrap);
  }
  function checklistRow(activity,date) {
    const row=document.createElement('div');row.className='todo-row';
    const completed=(state.entries[date] || []).includes(activity.id),quantity=completed?state.details[date]?.[activity.id]?.count || 1:0;
    const label=document.createElement('label');const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=completed;checkbox.setAttribute('aria-label',activity.name+' · '+date);checkbox.addEventListener('change',()=>updateSession(date,activity.id,{count:checkbox.checked?1:0}));
    const content=document.createElement('span');const name=document.createElement('strong');name.textContent=activity.name;content.append(name);
    if(activity.goal){const result=goalProgress([activity.id],activity.goal,date),remaining=Math.max(0,activity.goal.target-result.count);const info=document.createElement('small');const units={day:'jour',week:'semaine',month:'mois',year:'année'};
      info.textContent=activity.goal.mode==='min'?`${remaining?remaining+' restant'+(remaining>1?'s':''):'Objectif atteint'} · ${result.count}/${activity.goal.target} cette ${units[activity.goal.period]}`:`Limite : ${result.count}/${activity.goal.target} · ${result.status}`;content.append(info);row.dataset.tone=result.tone;}
    label.append(checkbox,content);
    const controls=document.createElement('div');controls.className='todo-controls';
    const minus=makeButton('−',()=>updateSession(date,activity.id,{count:Math.max(0,quantity-1)}));minus.disabled=!quantity;minus.setAttribute('aria-label','Retirer une occurrence de '+activity.name+' · '+date);
    const amount=document.createElement('span');amount.textContent=quantity;
    const plus=makeButton('+',()=>updateSession(date,activity.id,{count:quantity+1}));plus.disabled=quantity>=1000;plus.setAttribute('aria-label','Ajouter une occurrence de '+activity.name+' · '+date);
    const edit=makeButton('✎',()=>toggleEntry(date,true,[activity.id]));edit.setAttribute('aria-label','Détails de '+activity.name+' · '+date);controls.append(minus,amount,plus,edit);row.append(label,controls);return row;
  }
  function renderAnnualSummary(container,reference) {
    const year=Number(reference.slice(0,4));const grid=document.createElement('div');grid.className='annual-summary';
    MONTHS.forEach((month,index)=>{const prefix=`${year}-${pad(index+1)}-`;let count=0,days=0;Object.entries(state.entries).forEach(([date,ids])=>{if(!date.startsWith(prefix))return;days++;ids.forEach(id=>{if(activityById(id))count+=state.details[date]?.[id]?.count || 1;});});
      const button=makeButton('',()=>{agendaDate=dateKey(year,index,1);agendaView='month';renderWorkspace();},'annual-month');const name=document.createElement('strong');name.textContent=month;const amount=document.createElement('b');amount.textContent=count;const info=document.createElement('small');info.textContent=days+' jours renseignés';button.append(name,amount,info);grid.append(button);});container.append(grid);
  }
  function renderWorkspace() {
    const today=localDateKey(new Date()),inline=$('#todayInline');inline.replaceChildren();renderChecklist(inline,today);
    const requirements=goalTargets().filter(t=>t.item.goal.mode==='min'),remaining=requirements.filter(t=>goalProgress(t.ids,t.item.goal,today).count<t.item.goal.target).length;
    $('#todayFoldSummary').textContent=requirements.length?remaining+' objectif'+(remaining>1?'s':'')+' restant'+(remaining>1?'s':''):'Aujourd’hui';
    if(currentPage!=='day')return;
    $('#agendaDate').value=agendaDate;$('#agendaPeriodLabel').textContent=periodLabel(agendaDate,agendaView);document.querySelectorAll('[data-agenda-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.agendaView===agendaView)));
    const content=$('#agendaContent');content.replaceChildren();content.dataset.view=agendaView;
    if(agendaView==='day')renderChecklist(content,agendaDate);
    if(agendaView!=='day')renderScopeReport(content,agendaDate,agendaView);
    if(agendaView==='week')renderWeek(content,agendaDate,true);
    if(agendaView==='month')renderMonth(content,agendaDate,true);
    if(agendaView==='year')renderAnnualSummary(content,agendaDate);
  }

  function updateSession(date,id,patch) {
    if(!activityById(id))return;
    const entries=new Set(state.entries[date] || []),included=entries.has(id),existing=state.details[date]?.[id] || {};
    const value={count:included?existing.count || 1:0,distance:existing.distance ?? null,note:existing.note || '',...patch};
    if(!('count' in patch) && !value.count && ((patch.note && patch.note.trim()) || patch.distance!=null))value.count=1;
    if(!Number.isInteger(value.count) || value.count<0 || value.count>1000 || (value.distance!=null && (!Number.isFinite(value.distance) || value.distance<0 || value.distance>100000)))return;
    if(value.count){entries.add(id);state.details[date] ||= {};state.details[date][id]=value;}else{entries.delete(id);removeDetail(date,id);}
    if(entries.size)state.entries[date]=[...entries];else delete state.entries[date];
    // Newly checked activities remain visible in the current category's filters.
    if(value.count && activityById(id).categoryId===state.activeCategory && !state.selectedActivities.includes(id))state.selectedActivities.push(id);
    render();refreshSaveIndicators();
  }
  function persistItem(item,patch) {
    const activity=state.activities.find(a=>a.id===item.id),category=categories.find(c=>c.id===item.id),target=activity || category;if(!target)return;
    Object.entries(patch).forEach(([key,value])=>{if(key==='goal' && !value)delete target.goal;else target[key]=JSON.parse(JSON.stringify(value));});
    render();refreshSaveIndicators();
  }
  function removeActivity(id) {
    state.activities=state.activities.filter(activity=>activity.id!==id);
    Object.entries(state.entries).forEach(([date,ids])=>{const remaining=ids.filter(value=>value!==id);removeDetail(date,id);if(remaining.length)state.entries[date]=remaining;else delete state.entries[date];});
    state.selectedActivities=state.selectedActivities.filter(value=>value!==id);
    Object.keys(state.selections).forEach(key=>{state.selections[key]=state.selections[key].filter(value=>value!==id);});render();
  }
  function reconcileCategories() {
    if(!categories.some(c=>c.id===state.activeCategory))state.activeCategory=categories[0]?.id || null;
    const previous=state.selections;state.selections=Object.fromEntries(categories.map(category=>{const ids=state.activities.filter(a=>a.categoryId===category.id).map(a=>a.id);return [category.id,Array.isArray(previous[category.id])?previous[category.id].filter(id=>ids.includes(id)):ids];}));
    state.selectedActivities=[...(state.selections[state.activeCategory] || [])];
  }
  function refreshSaveIndicators() {
    document.querySelectorAll('[data-save-status]').forEach(span=>{if(!span.dataset.invalid)span.textContent=$('#syncStatus').textContent || 'Enregistré';});
  }
  function markInvalid(dialog,message) {const span=$(dialog).querySelector('[data-save-status]');span.dataset.invalid='true';span.textContent=message;}
  function clearInvalid(dialog) {const root=$(dialog),editor=root.querySelector('#activityRows,#categoryEditorRows,#dayPickerChoices');if(editor && [...editor.querySelectorAll('input')].some(input=>!input.checkValidity())){markInvalid(dialog,'Vérifiez les champs');return;}const span=root.querySelector('[data-save-status]');delete span.dataset.invalid;refreshSaveIndicators();}
  new MutationObserver(refreshSaveIndicators).observe($('#syncStatus'),{childList:true,subtree:true,characterData:true});
  const EMOJIS=['🏃','🚴','🏊','🏋️','🥾','⚽','🎯','✅','💼','🛵','📚','🧠','💡','💻','📝','🎨','🎵','🎮','🍳','🥗','☕','💧','🌱','🌍','🏠','🧹','🛌','☀️','🌙','❤️','👥','📞','🐾','💰','📦','✈️'];
  function createEmojiPicker(category) {
    const picker=document.createElement('details');picker.className='emoji-picker';
    const summary=document.createElement('summary');summary.textContent=category.emoji || '＋';summary.setAttribute('aria-label','Emoji de '+category.name);picker.append(summary);
    const panel=document.createElement('div');panel.className='emoji-panel';const grid=document.createElement('div');grid.className='emoji-grid';
    const choose=value=>{category.emoji=value;summary.textContent=value || '＋';persistItem(category,{emoji:value});picker.open=false;};
    EMOJIS.forEach(emoji=>{const button=makeButton(emoji,()=>choose(emoji));button.setAttribute('aria-label','Choisir '+emoji+' pour '+category.name);grid.append(button);});
    const custom=document.createElement('input');custom.maxLength=16;custom.placeholder='Coller un emoji';custom.setAttribute('aria-label','Emoji personnalisé de '+category.name);
    custom.addEventListener('input',()=>{const value=custom.value.trim();const parts=[...new Intl.Segmenter('fr',{granularity:'grapheme'}).segment(value)];if(parts.length===1 && /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(value))choose(value);});
    panel.append(grid,custom,makeButton('Sans emoji',()=>choose(''),'text-button'));picker.append(panel);return picker;
  }

  function renderScopeReport(container,reference,scope) {
    const targets=goalTargets();if(!targets.length)return;
    const grid=document.createElement('div');grid.className='scope-scores';
    const rank={day:0,week:1,month:2,year:3},units={day:'jours',week:'semaines',month:'mois',year:'années'};
    const [start,end]=periodBounds(reference,scope),today=localDateKey(new Date()),cutoff=end<today?end:today;
    targets.forEach(({item,ids,parent,category})=>{
      const card=document.createElement('article');card.className='scope-score';
      const title=document.createElement('h3');title.textContent=category?categoryLabel(item):item.name;
      const subtitle=document.createElement('small');subtitle.textContent=categoryLabel(parent);
      const info=document.createElement('p');
      if(rank[item.goal.period]<rank[scope]) {
        // Count each recorded day once per goal instead of rescanning the entire journal for every period.
        const counts=new Map(),wanted=new Set(ids);
        Object.entries(state.entries).forEach(([date,entries])=>{
          let amount=0;entries.forEach(id=>{if(wanted.has(id))amount+=state.details[date]?.[id]?.count || 1;});
          if(!amount)return;const key=item.goal.period==='day'?date:periodBounds(date,item.goal.period)[0];counts.set(key,(counts.get(key) || 0)+amount);
        });
        const buckets=new Set();for(let date=start;date<=cutoff;date=shiftDate(date,'day',1))buckets.add(periodBounds(date,item.goal.period)[0]);
        const total=buckets.size,success=[...buckets].filter(key=>item.goal.mode==='min'?(counts.get(key) || 0)>=item.goal.target:(counts.get(key) || 0)<=item.goal.target).length;
        info.textContent=total?`${success} / ${total} ${units[item.goal.period]} ${item.goal.mode==='min'?'avec objectif atteint':'dans la limite'}`:'Période à venir';
        const hint=document.createElement('small');hint.textContent='Périodes écoulées et en cours, jusqu’à aujourd’hui.';card.append(title,subtitle,info,hint);
      } else {const result=goalProgress(ids,item.goal,reference);info.textContent=`${result.count} / ${item.goal.target} · ${result.status}`;const hint=document.createElement('small');hint.textContent=`Du ${formatDate(result.start)} au ${formatDate(result.end)}`;card.append(title,subtitle,info,hint);}
      grid.append(card);
    });container.append(grid);
  }
