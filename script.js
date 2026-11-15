

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
    entries: {}, details: {}, theme: 'system', accent:null, goalOrder:[]
  };

  // Account data is loaded only after authentication.

  const $ = (selector) => document.getElementById('app').querySelector(selector);

  function loadSavedState(saved) {
    try {
      if (!saved) return;
      state.details = saved.details && typeof saved.details === 'object' ? saved.details : {};
      state.theme = ['system','light','dark'].includes(saved.theme) ? saved.theme : 'system';
      state.goalOrder=Array.isArray(saved.goalOrder)?saved.goalOrder:[];
      state.accent=normalizeAccent(saved.accent);
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
      categories=categories.map(normalizeGoalItem);state.activities=state.activities.map(normalizeGoalItem);
      state.activeCategory = saved.activeCategory === 'overview' || categories.some(category => category.id === saved.activeCategory) ? saved.activeCategory : categories[0]?.id || null;
      state.selections = saved.selections || {};
      categories.forEach(category => {
        const ids = state.activities.filter(activity => activity.categoryId === category.id).map(activity => activity.id);
        if (!Array.isArray(state.selections[category.id])) {
          state.selections[category.id] = category.id === 'sport' && Array.isArray(saved.selectedActivities) ? saved.selectedActivities : ids;
        }
        state.selections[category.id] = state.selections[category.id].filter(id => ids.includes(id));
      });
      state.selectedActivities = state.activeCategory==='overview'?state.activities.map(activity=>activity.id):[...(state.selections[state.activeCategory] || [])];
      restoreInterface(saved.interface || {});
    } catch (_) {
      // Keep the initial calendar if stored data cannot be read.
    }
  }

  function exportState() {
    if(state.activeCategory && state.activeCategory!=='overview')state.selections[state.activeCategory] = [...state.selectedActivities];
    return JSON.parse(JSON.stringify({schemaVersion: 9, paletteVersion: 3, year:state.year, categories,
      activities: state.activities, entries: state.entries, details:state.details, theme:state.theme, accent:state.accent, goalOrder:state.goalOrder,
      activeCategory: state.activeCategory, selections: state.selections,
      selectedActivities: state.selectedActivities, interface: exportInterface()}));
  }

  function persist() {
    if (window.calendarCloud) window.calendarCloud.save(exportState());
  }

  window.calendarApp = {
    defaults: () => ({schemaVersion: 9, paletteVersion: 3, year:currentYear,
      categories: [], activities: [], entries: {}, details:{}, theme:'system', accent:null, goalOrder:[], activeCategory:null,
      selections:{}, selectedActivities:[], interface:{}}),
    load(data) {
      const position={left:window.scrollX,top:window.scrollY};
      loadSavedState(JSON.parse(JSON.stringify(data))); render();
      if(dayDraft)dayDraft.refresh.forEach(refresh=>refresh());
      window.scrollTo({...position,behavior:'instant'});
    },
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

  function calendarFilterActivities() {
    return state.activities.filter(activity=>state.activeCategory==='overview' || activity.categoryId===state.activeCategory);
  }
  function filterChip(text,selected,action){
    const button=makeButton(text,action);button.setAttribute('aria-pressed',String(selected));return button;
  }
  function renderToolbar() {
    const categoryBar=$('#categoryBar'),toolbar=$('#toolbar');
    categoryBar.replaceChildren();toolbar.replaceChildren();
    for(const category of [{id:'overview',name:'Toutes'},...categories]){
      const button=filterChip(categoryLabel(category),state.activeCategory===category.id,()=>selectCategory(category.id));
      button.dataset.categoryDrop=category.id;categoryBar.append(button);
    }
    const activities=calendarFilterActivities(),overview=state.activeCategory==='overview';
    if(overview)state.selectedActivities=activities.map(activity=>activity.id);
    const allSelected=overview || activities.every(activity=>state.selectedActivities.includes(activity.id));
    const category=categories.find(item=>item.id===state.activeCategory);
    $('#calendarFilterSummary').textContent=[category?.name || 'Toutes les catégories',allSelected?'Toutes les activités':activityFilterSummary(state.selectedActivities,activities)].join(' · ');
    toolbar.append(filterChip('Toutes',allSelected,()=>{state.selectedActivities=activities.map(activity=>activity.id);render();}));
    if(!overview)activities.forEach(activity=>{
      const selected=state.selectedActivities.includes(activity.id);
      const button=filterChip(activity.name,selected,()=>{
        state.selectedActivities=selected?state.selectedActivities.filter(id=>id!==activity.id):[...state.selectedActivities,activity.id];
        render();
      });
      button.classList.add('activity-choice');toolbar.append(button);
    });
  }

  function moveActivity(id,categoryId) {
    const activity=activityById(id);if(!activity || !categories.some(c=>c.id===categoryId))return;if(activity.categoryId===categoryId){render();return;}
    if(state.activeCategory && state.activeCategory!=='overview')state.selections[state.activeCategory]=[...state.selectedActivities];
    const previous=activity.categoryId;activity.categoryId=categoryId;
    state.selections[previous]=(state.selections[previous] || []).filter(value=>value!==id);
    state.selections[categoryId]=[...new Set([...(state.selections[categoryId] || []),id])];
    state.activeCategory=categoryId;state.selectedActivities=[...state.selections[categoryId]];
    // Stable activity IDs retain every historical day, annotation, color and objective.
    render();
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
    const position = {left:window.scrollX,top:window.scrollY};
    const calendar = $('#calendar'), height = calendar.style.minHeight;
    calendar.style.minHeight = calendar.getBoundingClientRect().height+'px';
    const entries = new Set(state.entries[key] || []);
    if (entries.has(activityId)) { entries.delete(activityId); removeDetail(key,activityId); }
    else entries.add(activityId);
    if (entries.size) state.entries[key] = [...entries];
    else delete state.entries[key];
    render();
    calendar.style.minHeight = height;
    window.scrollTo({...position,behavior:'instant'});
  }

  let dayDraft = null;

  function toggleEntry(key, forceDetails = false, onlyIds = null) {
    if (!forceDetails && !onlyIds && state.selectedActivities.length === 1) {
      toggleSingleEntry(key,state.selectedActivities[0]);
      return;
    }
    const activities = onlyIds?state.activities.filter(activity=>onlyIds.includes(activity.id)):calendarFilterActivities();
    if (!activities.length) return;
    clearInvalid('#dayPicker');
    dayDraft = {key,refresh:[]};
    $('#dayPickerTitle').textContent = formatDate(key);
    const choices=$('#dayPickerChoices'); choices.replaceChildren();
    let previousCategory=null;
    activities.forEach(activity=>{
      if(activity.categoryId!==previousCategory){const heading=document.createElement('h3');heading.className='session-category-heading';heading.textContent=categoryLabel(categories.find(c=>c.id===activity.categoryId));choices.append(heading);previousCategory=activity.categoryId;}
      const id=activity.id, detail=state.details[key]?.[id] || {};
      let quantity=(state.entries[key] || []).includes(id)?detail.count || 1:0;
      const row=document.createElement('div');row.className='session-editor';
      const top=document.createElement('div');top.className='session-top';
      const toggle=document.createElement('button');toggle.type='button';toggle.className='day-picker-choice';
      const dot=document.createElement('span');dot.className='activity-dot';dot.style.background=activity.color;
      const name=document.createElement('span');name.textContent=activity.name;
      const check=document.createElement('span');check.className='session-check';toggle.append(dot,name,check);toggle.setAttribute('aria-label',activity.name+' · sélectionner pour '+formatDate(key));
      const countLabel=document.createElement('label');countLabel.className='count-label';countLabel.textContent='Nombre';
      const count=document.createElement('input');count.type='number';count.min='0';count.max='1000';count.step='1';count.required=true;count.value=quantity;count.setAttribute('aria-label','Nombre de séances · '+activity.name);countLabel.append(count);
      const distanceLabel=document.createElement('label');distanceLabel.className='distance-label';distanceLabel.textContent='Km';
      const distance=document.createElement('input');distance.type='number';distance.min='0';distance.max='100000';distance.step='any';distance.placeholder='—';distance.value=detail.distance ?? '';distance.setAttribute('aria-label','Distance en kilomètres · '+activity.name);distanceLabel.append(distance);
      const fields=document.createElement('details');fields.className='session-fields';fields.open=Boolean(detail.note);
      const summary=document.createElement('summary');summary.textContent='Note';
      const note=document.createElement('textarea');note.maxLength=2000;note.rows=2;note.placeholder='Votre séance, une tâche accomplie…';note.value=detail.note || '';note.setAttribute('aria-label','Note · '+activity.name);fields.append(summary,note);
      const update=()=>{quantity=(state.entries[key] || []).includes(id)?state.details[key]?.[id]?.count || 1:0;count.value=quantity;toggle.setAttribute('aria-pressed',String(quantity>0));check.textContent=quantity>0?'✓':'+';row.classList.toggle('session-included',quantity>0);distance.value=state.details[key]?.[id]?.distance ?? '';note.value=state.details[key]?.[id]?.note || '';duration.value=state.details[key]?.[id]?.durationMinutes ?? '';};
      const save=patch=>{updateSession(key,id,patch);update();clearInvalid('#dayPicker');};
      toggle.addEventListener('click',()=>save({count:(state.entries[key] || []).includes(id)?0:1}));
      count.addEventListener('input',()=>{if(!count.checkValidity()){markInvalid('#dayPicker','Nombre entier positif ou zéro requis');return;}save({count:Number(count.value)});});
      distance.addEventListener('input',()=>{if(!distance.checkValidity()){markInvalid('#dayPicker','Distance positive requise');return;}save({distance:distance.value===''?null:Number(distance.value)});});
      note.addEventListener('input',()=>save({note:note.value}));
      const durationLabel=document.createElement('label');durationLabel.className='duration-label';durationLabel.textContent='Minutes';const duration=document.createElement('input');duration.type='number';duration.min='0';duration.max='1000000';duration.step='any';duration.value=detail.durationMinutes ?? '';duration.placeholder='—';duration.setAttribute('aria-label','Durée en minutes · '+activity.name);durationLabel.append(duration);duration.addEventListener('input',()=>{if(!duration.checkValidity()){markInvalid('#dayPicker','Durée positive requise');return;}save({durationMinutes:duration.value===''?null:Number(duration.value)});});
      top.append(toggle,countLabel,distanceLabel,durationLabel);row.append(top,fields);choices.append(row);dayDraft.refresh.push(update);update();
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

    calendarFilterActivities().forEach(activity => {
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
    const position={left:window.scrollX,top:window.scrollY};
    const shell=$('.shell'),minHeight=shell.style.minHeight;
    shell.style.minHeight=shell.getBoundingClientRect().height+'px';

    renderToolbar();
    renderCalendar();
    renderLegend();
    renderGoals();
    renderJournal();
    renderWorkspace();
    persist();
    shell.style.minHeight=minHeight;
    window.scrollTo({...position,behavior:'instant'});
  }

  function openModal() {
    openTrackingSettings(categories.length?'activities':'categories');
    (categories.length?$('#managerNewName'):$('#newCategoryName')).focus();
  }

  function closeModal() {
    $('#modalBackdrop').classList.remove('open');
    $('#activityForm').reset();
  }

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
  let managerCategoryId=null;

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

  function animateReorder(container, element, target, animateMoved=false) {
    if (element.nextSibling === target || (!target && element === container.lastElementChild)) return;
    const children = [...container.children];
    const previous = new Map(children.map(node => [node,node.getBoundingClientRect()]));
    children.forEach(node => node.getAnimations?.().forEach(animation => animation.cancel()));
    container.insertBefore(element,target);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    children.filter(node=>animateMoved || node!==element).forEach(node => {
      const before=previous.get(node), after=node.getBoundingClientRect();
      const x=before.left-after.left,y=before.top-after.top;
      if(x || y) node.animate?.([{transform:`translate(${x}px,${y}px)`},{transform:'translate(0,0)'}],{duration:220,easing:'cubic-bezier(.2,.8,.2,1)'});
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

  function enableDirectReorder(button, id, container, commit, transfer = null, handleSelector = null) {
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
    const blockTouchScroll=event=>{if(drag?.lift)event.preventDefault();};
    const finish = save => {
      if (!drag) return;
      clearTimeout(drag.timer);
      container.removeEventListener('pointermove', move);
      container.removeEventListener('touchmove',blockTouchScroll);
      container.removeEventListener('pointerup', release);
      container.removeEventListener('pointercancel', cancel);
      container.removeEventListener('lostpointercapture', cancel);
      const lifted = drag.lift, destination=drag.destination;
      document.querySelectorAll('[data-category-drop]').forEach(node=>node.classList.remove('drop-target'));
      drag = null;
      if (!lifted) return;
      settleLift(lifted,button); button.classList.remove('is-dragging');
      container.suppressSortClickUntil = Date.now()+400;
      if (save && destination && transfer) {transfer(id,destination);return;}
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
      if(transfer){const drop=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-category-drop]');drag.destination=drop?.dataset.categoryDrop || null;document.querySelectorAll('[data-category-drop]').forEach(node=>node.classList.toggle('drop-target',node===drop));if(drop)return;}
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
      if(handleSelector && (!event.target.closest(handleSelector) || event.target.closest('[data-sort-id]')!==button))return;
      if (event.button !== 0 || (button.classList.contains('goal-card') && event.target.closest('button,input,select,textarea,a') && !event.target.closest('.goal-drag'))) return;
      drag = {pointerId:event.pointerId,x:event.clientX,y:event.clientY,touch:event.pointerType==='touch',lift:null};
      container.addEventListener('pointermove',move,{passive:false});
      container.addEventListener('touchmove',blockTouchScroll,{passive:false});
      container.addEventListener('pointerup',release);
      container.addEventListener('pointercancel',cancel);
      container.addEventListener('lostpointercapture',cancel);
      drag.timer = setTimeout(begin,250);
    });
    button.addEventListener('keydown', event => {
      if (event.key==='Escape') finish(false);
      if(handleSelector && (!event.target.closest(handleSelector) || event.target.closest('[data-sort-id]')!==button))return;
      const arrows=['ArrowLeft','ArrowRight'];
      if (!event.altKey || !arrows.includes(event.key)) return;
      event.preventDefault();
      const ids=[...container.children].filter(node=>node.dataset.sortId).map(node=>node.dataset.sortId);
      const from=ids.indexOf(id), to=from+(event.key===arrows[0]?-1:1);
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
    activityDraft.filter(activity => activity.categoryId === managerCategoryId).forEach((activity, index) => {
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
      const destination=document.createElement('select');destination.className='activity-category-select';destination.setAttribute('aria-label','Catégorie de '+activity.name);categories.forEach(category=>appendOption(destination,category.id,categoryLabel(category)));destination.value=activity.categoryId;destination.addEventListener('change',()=>{moveActivity(activity.id,destination.value);activityDraft=JSON.parse(JSON.stringify(state.activities));renderActivityRows();});
      nameLabel.append(destination);
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
    if (!activityDraft.some(activity=>activity.categoryId===managerCategoryId)) rows.textContent = 'Aucune activité. Vous pourrez en ajouter avec le bouton +.';
  }

  function refreshActivityManager() {
    const select=$('#managerCategory');select.replaceChildren();
    if(!categories.some(category=>category.id===managerCategoryId))managerCategoryId=categories.find(category=>category.id===state.activeCategory)?.id || categories[0]?.id || null;
    categories.forEach(category=>appendOption(select,category.id,categoryLabel(category)));
    select.value=managerCategoryId || '';
    select.disabled=!managerCategoryId;
    $('#managerAddActivity').disabled=!managerCategoryId;$('#managerNewName').disabled=!managerCategoryId;$('#managerNewColor').disabled=!managerCategoryId;
    activityDraft=JSON.parse(JSON.stringify(state.activities));deletedActivityIds=new Set();
    renderActivityRows();clearInvalid('#manager');
  }
  $('#managerCategory').addEventListener('change',event=>{managerCategoryId=event.target.value;refreshActivityManager();});
  document.getElementById('app').addEventListener('keydown', event => {
    if (event.key === 'Escape' && $('#modalBackdrop').classList.contains('open')) closeModal();
  });
  function addManagerActivity() {
    const name = $('#managerNewName').value.trim();
    if (!managerCategoryId || !name) { $('#managerNewName').focus(); return; }
    activityDraft.push({id:'activity-'+crypto.randomUUID(),name,color:$('#managerNewColor').value,categoryId:managerCategoryId});
    const created=activityDraft[activityDraft.length-1];state.activities.push(JSON.parse(JSON.stringify(created)));
    if(managerCategoryId===state.activeCategory)state.selectedActivities.push(created.id);
    else (state.selections[managerCategoryId] ||= []).push(created.id);
    render();
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
  const trackingSettings=$('#trackingSettings');
  function setTrackingSection(section) {
    const showCategories=section==='categories';
    $('#categoryManager').hidden=!showCategories;$('#manager').hidden=showCategories;
    $('#manageCategories').setAttribute('aria-pressed',String(showCategories));
    $('#manageActivities').setAttribute('aria-pressed',String(!showCategories));
    if(showCategories)openCategoryManager();else refreshActivityManager();
  }
  function openTrackingSettings(section=categories.length?'activities':'categories') {
    managerCategoryId=state.activeCategory;
    $('#managerForm').reset();$('#managerStatus').textContent='';
    $('#managerNewSwatch').style.setProperty('--swatch-color','#22c55e');
    setTrackingSection(section);
    if(!trackingSettings.open)trackingSettings.showModal();
  }
  $('#openTrackingSettings').addEventListener('click',()=>openTrackingSettings());
  $('#manageCategories').addEventListener('click',()=>setTrackingSection('categories'));
  $('#manageActivities').addEventListener('click',()=>setTrackingSection('activities'));
  $('#closeTrackingSettings').addEventListener('click',()=>trackingSettings.close());

  // Interface preferences are part of the account state, including all filters.
  let goalReference = '';
  function removeDetail(date,id) {
    if (!state.details[date]) return;
    delete state.details[date][id];
    if (!Object.keys(state.details[date]).length) delete state.details[date];
  }
  const defaultAccent='#1bd96a';
  const themeInputs=document.querySelectorAll('[name="appTheme"],[name="profileTheme"]');
  function normalizeAccent(value) {
    return typeof value==='string' && /^#[0-9a-f]{6}$/i.test(value)?value.toLowerCase():null;
  }
  function applyTheme() {
    const app=document.getElementById('app');
    app.dataset.theme=state.theme;
    themeInputs.forEach(input=>{input.checked=input.value===state.theme;});
    const accent=state.accent;
    for(const key of ['--accent','--accent-fill','--accent-text','--accent-ink']){
      if(!accent)app.style.removeProperty(key);
    }
    if(accent){
      const rgb=accent.slice(1).match(/../g).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
      const luminance=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
      app.style.setProperty('--accent',accent);
      app.style.setProperty('--accent-fill',accent);
      app.style.setProperty('--accent-text',luminance>.179?'#000':'#fff');
      app.style.setProperty('--accent-ink','light-dark(color-mix(in srgb, '+accent+' 42%, #101318), color-mix(in srgb, '+accent+' 48%, #fff))');
    }
    $('#profileAccent').value=accent || defaultAccent;
    $('#profileAccentValue').textContent=accent || 'Couleur par défaut';
    $('#resetProfileAccent').disabled=!accent;
  }
  themeInputs.forEach(input=>input.addEventListener('change',()=>{if(input.checked){state.theme=input.value;applyTheme();persist();}}));
  $('#profileAccent').addEventListener('change',event=>{state.accent=normalizeAccent(event.target.value);applyTheme();persist();});
  $('#resetProfileAccent').addEventListener('click',()=>{state.accent=null;applyTheme();persist();});



  function createGoalEditor(item) {
    const panel=document.createElement('div');panel.className='goal-editor';
    panel.append(makeButton((goalsOf(item).length || 'Aucun')+' objectif'+(goalsOf(item).length>1?'s':'')+' · Modifier',()=>openGoalEditor(item.id),'text-button'));
    return panel;
  }
  function validGoals(items) {return items.every(item=>goalsOf(item).every(validGoal));}
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
    const [start,end]=periodBounds(reference,goal.period);let count=0;
    Object.entries(state.entries).forEach(([date,entries])=>{if(date<start || date>end)return;entries.forEach(id=>{if(ids.includes(id))count+=measuredAmount(date,id,goal);});});
    count=Math.round(count*1000000)/1000000;
    if(goal.mode==='max' && goal.target===0){
      return {count,start,end,tone:count===0?'success':'danger',status:count===0?'Objectif respecté':'Limite dépassée'};
    }
    const equality=Math.abs(count-goal.target)<1e-8;
    const tone=goal.mode==='min'?(count>=goal.target?'success':'pending'):(equality?'warning':count>goal.target?'danger':'success');
    const status=goal.mode==='min'?(count>=goal.target?'Objectif atteint':'À accomplir'):(equality?'Limite atteinte':count>goal.target?'Limite dépassée':'Dans la limite');
    return {count,start,end,status,tone};
  }
  function filteredGoalTargets(categoryId=goalCategoryFilter,activityIds=goalActivityFilter) {
    return goalTargets(categoryId).filter(target=>activityIds===null || (target.category?target.ids.some(id=>activityIds.includes(id)):activityIds.includes(target.item.id)));
  }
  function activityFilterSummary(ids,activities) {
    if(ids===null || ids.length===activities.length)return 'Toutes les activités';
    if(ids.length===1)return activities.find(activity=>activity.id===ids[0])?.name || '1 activité';
    return ids.length?ids.length+' activités':'Aucune activité';
  }
  [['calendarFilterToggle','calendarFilters'],['goalFilterToggle','objectiveFilters']].forEach(([triggerId,dialogId])=>{
    const trigger=$('#'+triggerId),dialog=$('#'+dialogId);
    trigger.addEventListener('click',()=>{if(!dialog.open)dialog.showModal();});
    dialog.querySelectorAll('.filter-close').forEach(button=>button.addEventListener('click',()=>closeFilterDrawer(dialog)));
    dialog.addEventListener('cancel',event=>{event.preventDefault();closeFilterDrawer(dialog);});
    dialog.addEventListener('close',()=>{delete dialog.dataset.closing;});
  });
  $('#resetCalendarFilters').addEventListener('click',()=>selectCategory('overview'));
  $('#resetGoalFilters').addEventListener('click',()=>{
    goalCategoryFilter=null;
    goalActivityFilter=null;
    goalStatusFilter='all';
    renderGoals();
    persist();
  });
  function closeFilterDrawer(dialog) {
    if(!dialog.open || dialog.dataset.closing)return;
    if(!dialog.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches){dialog.close();return;}
    const slide=window.matchMedia('(max-width:600px)').matches?'translateY(100%)':'translateX(-100%)';
    const from=getComputedStyle(dialog).transform;
    dialog.getAnimations().forEach(animation=>animation.cancel());
    dialog.dataset.closing='true';
    const animation=dialog.animate([{transform:from},{transform:slide}],{duration:190,easing:'ease-in',fill:'forwards'});
    animation.finished.then(()=>{if(dialog.open)dialog.close();animation.cancel();},()=>{delete dialog.dataset.closing;});
  }
  function openCalendarGoals() {
    goalReference=calendarDateForYear();goalCategoryFilter=state.activeCategory==='overview'?null:state.activeCategory;goalActivityFilter=goalCategoryFilter?[...state.selectedActivities]:null;goalStatusFilter='all';historyView=calendarView;setPage('goals');renderGoals();persist();
  }
  function renderGoals() {
    const selected=filteredGoalTargets(state.activeCategory==='overview'?null:state.activeCategory,state.selectedActivities);
    $('#calendarGoalCount').textContent=selected.length+' objectif'+(selected.length>1?'s':'');
    if(!goalReference)goalReference=localDateKey(new Date());
    updateDateNavigation('goalDateLabel','globalGoalDate',goalReference,periodLabel(goalReference,historyView));
    syncFormatButtons('goal',goalFormat);
    $('#goalHistory').hidden=goalFormat!=='calendar';
    $('#globalGoalCards').hidden=goalFormat==='calendar';
    $('#globalGoalCards').dataset.format=goalFormat;
    renderGoalFilters();renderGoalHistory();
    const root=$('#globalGoalCards');root.replaceChildren();
    const period=historyView,tiles=goalFormat==='cards';
    const targets=filteredGoalTargets().filter(({goal,ids})=>goal.period===period && goalMatchesStatus(goalProgress(ids,goal,goalReference),goalStatusFilter));
    if(!targets.length){appendWorkspaceEmpty(root,'Aucun objectif à afficher','Essayez une autre période ou modifiez vos filtres.','goals');return;}
    if(tiles){
      const progress=document.createElement('div');progress.id='goalTileProgress';
      renderGoalSummary(targets,goalReference,progress,period);root.append(progress);
    }
    const grid=document.createElement('div');grid.className='goal-cards'+(tiles?' daily-goal-grid':'');grid.dataset.goalPeriod=period;
    root.append(grid);drawGoals(grid,goalReference,goalCategoryFilter,goalStatusFilter,period,goalActivityFilter);
  }

  function renderGoalHistory() {
    const root=$('#goalHistory');root.replaceChildren();
    const historyDate=goalReference;
    const targets=filteredGoalTargets().filter(({goal,ids})=>goal.mode==='min' &&
      goalMatchesStatus(goalProgress(ids,goal,historyDate),goalStatusFilter));
    const rank={day:0,week:1,month:2,year:3},today=localDateKey(new Date());
    const heading=document.createElement('div');heading.className='goal-history-heading';const title=document.createElement('h2');title.textContent='Calendrier des objectifs';heading.append(title);root.append(heading);
    const views=$('#historyViews');views.replaceChildren();
    [['day','Jour'],['week','Semaine'],['month','Mois'],['year','Année']].forEach(([view,label])=>{
      const button=makeButton(label,()=>{historyView=view;renderGoals();persist();});
      button.setAttribute('aria-pressed',String(historyView===view));views.append(button);
    });
    const caption=document.createElement('p');caption.className='muted';caption.textContent='Bilan des objectifs minimums qui correspondent aux filtres. Les périodes en cours restent provisoires.';root.append(caption);
    const periodTitle=document.createElement('h3');periodTitle.textContent=periodLabel(historyDate,historyView);root.append(periodTitle);
    if(!targets.length){appendWorkspaceEmpty(root,'Aucun objectif minimum','Modifiez vos filtres pour afficher des objectifs sur ce calendrier.','goals');return;}
    // Bucket each objective once, using its own frequency and measured unit.
    const totals=targets.map(({goal,ids})=>{const wanted=new Set(ids),counts=new Map();Object.entries(state.entries).forEach(([date,entries])=>{if(date>today)return;const key=periodBounds(date,goal.period)[0],amount=entries.reduce((sum,id)=>sum+(wanted.has(id)?measuredAmount(date,id,goal):0),0);counts.set(key,(counts.get(key)||0)+amount);});return counts;});
    function assess(reference,scope){
      const [start,end]=periodBounds(reference,scope);if(start>today)return {tone:'future',completed:0,total:0,label:'À venir'};
      let completed=0,total=0,progress=0;
      targets.forEach(({goal},index)=>{if(rank[goal.period]>rank[scope])return;for(let key=periodBounds(start,goal.period)[0];key<=end && key<=today;key=shiftDate(key,goal.period,1)){const amount=totals[index].get(key)||0;total++;if(amount+1e-8>=goal.target)completed++;progress+=Math.min(1,amount/goal.target);}});
      if(!total)return {tone:'empty',completed:0,total:0,label:'Aucun objectif de cette fréquence'};
      return {tone:completed===total?'success':progress>0?'warning':'danger',completed,total,label:completed+' / '+total+' échéances atteintes'+(end>=today?' · En cours':'')};
    }
    const summary=assess(historyDate,historyView),score=document.createElement('p');score.className='history-score';score.dataset.tone=summary.tone;score.textContent='Bilan '+({day:'du jour',week:'de la semaine',month:'du mois',year:'de l’année'})[historyView]+' · '+summary.label;root.append(score);
    const legend=document.createElement('div');legend.className='goal-history-legend';[['danger','Non atteint'],['warning','Partiellement atteint'],['success','Tous atteints'],['future','À venir']].forEach(([tone,label])=>{const item=document.createElement('span');item.dataset.tone=tone;item.textContent=label;legend.append(item);});root.append(legend);
    const [start,end]=periodBounds(historyDate,historyView);
    const resolution=targets.reduce((period,{goal})=>rank[goal.period]<rank[period]?goal.period:period,'year');
    function cell(date,scope,text){const result=assess(date,scope),button=makeButton(text,()=>{goalReference=date;renderGoals();persist();},'goal-history-day');button.dataset.date=date;button.dataset.period=scope;button.dataset.tone=result.tone;button.title=formatDate(date)+' · '+result.label;button.setAttribute('aria-label',button.title);button.setAttribute('aria-pressed',String(date===historyDate));if(date===today)button.setAttribute('aria-current','date');return button;}
    if(historyView==='day'){
      const list=document.createElement('div');list.className='history-period-tiles';
      targets.filter(({goal})=>goal.period==='day').forEach(({item,goal},index)=>{const card=document.createElement('article');const amount=totals[targets.findIndex(t=>t.goal.id===goal.id && t.item.id===item.id)].get(historyDate)||0;card.className='history-goal-result';card.dataset.tone=historyDate>today?'future':amount>=goal.target?'success':amount>0?'warning':'danger';const name=document.createElement('strong');name.textContent=item.name;const detail=document.createElement('span');detail.textContent=measureValue(amount,goal)+' / '+measureValue(goal.target,goal)+' '+unitLabel(goal);card.append(name,detail);list.append(card);});
      if(!list.children.length)appendWorkspaceEmpty(list,'Aucun objectif quotidien','Choisissez une vue plus large pour les objectifs hebdomadaires, mensuels ou annuels.','goals');root.append(list);return;
    }
    if(resolution!=='day'){
      if(rank[resolution]>rank[historyView]){appendEmpty(root,'Choisissez une vue '+({week:'semaine ou plus large',month:'mois ou année',year:'année'})[resolution]+' pour cette fréquence.');return;}
      const tiles=document.createElement('div');tiles.className='history-period-tiles';
      for(let key=periodBounds(start,resolution)[0];key<=end;key=shiftDate(key,resolution,1)){
        const button=cell(key,resolution,periodLabel(key,resolution));button.classList.add('history-period-tile');const result=assess(key,resolution),label=document.createElement('small');label.textContent=result.label;button.append(label);tiles.append(button);
      }root.append(tiles);return;
    }
    const months=document.createElement('div');months.className='goal-history-months';months.dataset.view=historyView;
    const year=Number(historyDate.slice(0,4)),firstMonth=historyView==='year'?0:Number(historyDate.slice(5,7))-1,lastMonth=historyView==='year'?11:firstMonth;
    if(historyView==='week'){
      const grid=document.createElement('div');grid.className='history-week';for(let date=start;date<=end;date=shiftDate(date,'day',1))grid.append(cell(date,'day',formatDate(date)));months.append(grid);
    }else for(let month=firstMonth;month<=lastMonth;month++){
      const section=document.createElement('section');section.className='goal-history-month';const name=document.createElement('h3');name.textContent=MONTHS[month];section.append(name);const grid=document.createElement('div');grid.className='goal-history-days';
      WEEKDAYS.forEach(day=>{const label=document.createElement('span');label.className='goal-history-weekday';label.textContent=day;grid.append(label);});const offset=(new Date(year,month,1,12).getDay()+6)%7;for(let i=0;i<offset;i++){const blank=document.createElement('span');blank.setAttribute('aria-hidden','true');grid.append(blank);}for(let day=1;day<=daysInMonth(year,month);day++)grid.append(cell(dateKey(year,month,day),'day',String(day)));section.append(grid);months.append(section);
    }
    root.append(months);
  }
  $('#calendarGoalLink').addEventListener('click',openCalendarGoals);
  $('#globalGoalDate').addEventListener('change',()=>{if(!$('#globalGoalDate').value)return;goalReference=$('#globalGoalDate').value;renderGoals();persist();});
  function shiftGoalPeriod(direction){goalReference=shiftDate(goalReference || localDateKey(new Date()),historyView,direction);renderGoals();persist();}
  $('#goalPrevious').addEventListener('click',()=>shiftGoalPeriod(-1));$('#goalNext').addEventListener('click',()=>shiftGoalPeriod(1));$('#goalToday').addEventListener('click',()=>{goalReference=localDateKey(new Date());renderGoals();persist();});


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
    const monthGroups=new Map(),monthCounts=new Map();
    records.forEach(({date})=>{const month=date.slice(0,7);monthCounts.set(month,(monthCounts.get(month)||0)+1);});
    records.slice(0,journalLimit).forEach(({date,activity,detail,category})=>{
      const month=date.slice(0,7);if(!monthGroups.has(month)){const section=journalMonth(MONTHS[Number(date.slice(5,7))-1]+' '+date.slice(0,4),'journal-month-'+month);const count=document.createElement('span');count.className='journal-month-count';const total=monthCounts.get(month);count.textContent=total+' entrée'+(total>1?'s':'');section.root.querySelector('summary').append(count);monthGroups.set(month,section);rows.append(section.root);}
      const row=document.createElement('article');row.className='journal-row';
      const when=document.createElement('time');when.dateTime=date;when.textContent=formatDate(date);
      const body=document.createElement('div');const title=document.createElement('h3');title.textContent=activity.name;title.style.setProperty('--activity-color',activity.color);
      const tag=document.createElement('span');tag.className='category-tag';tag.textContent=categoryLabel(category);
      const stats=document.createElement('div');stats.className='journal-stats';const metrics=`${detail.count || 1} fois${detail.distance!=null?' · '+detail.distance+' km':''}${detail.durationMinutes!=null?' · '+detail.durationMinutes+' min':''}`;
      metrics.split(' · ').forEach(value=>{const chip=document.createElement('span');chip.textContent=value;stats.append(chip);});
      body.append(title,tag,stats);if(detail.note){const note=document.createElement('p');note.textContent=detail.note;body.append(note);}
      const edit=makeButton('Modifier',()=>toggleEntry(date,true,[activity.id]),'journal-edit');edit.setAttribute('aria-label',`Modifier ${activity.name} du ${formatDate(date)}`);
      row.append(when,body,edit);monthGroups.get(month).body.append(row);
    });
    $('#moreJournal').hidden=records.length<=journalLimit;
  }
  ['#journalCategory','#journalYear','#journalSearch'].forEach(id=>$(id).addEventListener(id==='#journalSearch'?'input':'change',()=>{journalLimit=40;renderJournal();persist();}));
  $('#moreJournal').addEventListener('click',()=>{journalLimit+=40;renderJournal();persist();});
  function showProfile(show) {setPage(show?'profile':'day');}
  const accountToggle=$('#accountToggle'),accountMenu=$('#accountMenu');
  const mobileNavToggle=$('#mobileNavToggle'),mainNavigation=$('#mainNavigation');
  function setMobileMenu(open,returnFocus=false) {
    mainNavigation.toggleAttribute('data-open',open);
    mobileNavToggle.setAttribute('aria-expanded',String(open));
    if(open)setAccountMenu(false);
    if(returnFocus)mobileNavToggle.focus({preventScroll:true});
  }
  mobileNavToggle.addEventListener('click',()=>{const open=!mainNavigation.hasAttribute('data-open');setMobileMenu(open);if(open)mainNavigation.querySelector('button').focus();});
  mobileNavToggle.addEventListener('keydown',event=>{
    if(event.key==='ArrowDown'){event.preventDefault();setMobileMenu(true);mainNavigation.querySelector('button').focus();}
  });
  function setAccountMenu(open,returnFocus=false) {
    if(open)setMobileMenu(false);
    accountMenu.hidden=!open;
    accountToggle.setAttribute('aria-expanded',String(open));
    if(returnFocus)accountToggle.focus({preventScroll:true});
  }
  accountToggle.addEventListener('click',()=>setAccountMenu(accountMenu.hidden));
  accountToggle.addEventListener('keydown',event=>{
    if(event.key==='ArrowDown'){event.preventDefault();setAccountMenu(true);$('#openProfile').focus();}
  });
  $('#homeBrand').addEventListener('click',event=>{event.preventDefault();showProfile(false);});
  document.addEventListener('click',event=>{
    if(!accountMenu.hidden && !event.target.closest('.account-control'))setAccountMenu(false);
    if(mainNavigation.hasAttribute('data-open') && !event.target.closest('#mainNavigation,#mobileNavToggle'))setMobileMenu(false);
  });
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if(!accountMenu.hidden)setAccountMenu(false,true);
    else if(mainNavigation.hasAttribute('data-open'))setMobileMenu(false,true);
  });
  $('#logout').addEventListener('click',()=>setAccountMenu(false,true));
  let currentAccount=null;
  let accountLogins=[];
  let demoDevices=[];
  const sampleDevices=['Navigateur de bureau','Téléphone mobile','Tablette'];
  function renderProfileDevices() {
    const list=$('#profileDevices');list.replaceChildren();
    demoDevices.forEach(name=>{
      const row=document.createElement('li');
      const label=document.createElement('span');label.textContent=name;
      const button=makeButton('Déconnecter',()=>{
        demoDevices=demoDevices.filter(device=>device!==name);renderProfileDevices();$('#profileDeviceStatus').textContent='Appareil simulé retiré.';
      });
      button.setAttribute('aria-label','Déconnecter l’appareil simulé : '+name);row.append(label,button);list.append(row);
    });
    if(!demoDevices.length){const empty=document.createElement('li');empty.textContent='Aucun appareil simulé connecté.';list.append(empty);}
    $('#disconnectAllDevices').disabled=!demoDevices.length;
  }
  $('#disconnectAllDevices').addEventListener('click',()=>{demoDevices=[];renderProfileDevices();$('#profileDeviceStatus').textContent='Tous les appareils simulés ont été retirés.';});
  function renderProfile() {
    const user=currentAccount || {};
    $('#profileName').textContent=user.displayName || 'Votre compte';$('#profileEmail').textContent=user.email || '';
    $('#profileFullName').textContent=user.displayName || '—';$('#profileAccountEmail').textContent=user.email || '—';
    $('#profileEmailVerified').textContent=typeof user.emailVerified==='boolean'?(user.emailVerified?'Vérifié':'Non vérifié'):'—';
    $('#profileInitial').textContent=(user.displayName || 'Y').slice(0,1).toUpperCase();$('#profileInitial').hidden=Boolean(user.photoURL);
    renderProfileDevices();
    $('#profileCreated').textContent=formatDate(user.createdAt,true);$('#profileLastLogin').textContent=formatDate(user.lastLoginAt,true);
    const history=$('#loginHistory');history.replaceChildren();accountLogins.forEach(date=>{const item=document.createElement('li');item.textContent=formatDate(date,true);history.append(item);});
    if(!accountLogins.length){const item=document.createElement('li');item.textContent='Aucune connexion enregistrée.';history.append(item);}
  }
  window.calendarApp.setAccount=(user,logins=[])=>{
    if(user?.uid!==currentAccount?.uid || !currentAccount || !user){demoDevices=user?[...sampleDevices]:[];$('#profileDeviceStatus').textContent='';}
    currentAccount=user;accountLogins=logins;
    $('#accountMenuName').textContent=user?.displayName || 'Votre compte';
    $('#accountInitial').textContent=(user?.displayName || 'Y').slice(0,1).toUpperCase();
    for(const id of ['#accountAvatar','#profileAvatar']){const img=$(id);img.hidden=!user?.photoURL;if(user?.photoURL)img.src=user.photoURL;else img.removeAttribute('src');}
    $('#accountInitial').hidden=Boolean(user?.photoURL);
    if(!user)showProfile(false);else renderProfile();
  };

  // A single source of truth feeds every view and the Firebase write queue.
  let sectionLayout={folds:{},orders:{}};
  let historyView='year',activityFormat='calendar',goalFormat='cards';
  let currentPage='day';
  let calendarView=window.matchMedia('(max-width:600px)').matches?'month':'year';
  let focusDate=localDateKey(new Date());
  let agendaDate=localDateKey(new Date());
  let agendaView='day';
  function makeButton(text,action,className='') {
    const button=document.createElement('button');button.type='button';button.textContent=text;button.className=className;
    const paths={'+':'M12 5v14M5 12h14','−':'M5 12h14','✎':'m4 16 12-12 4 4L8 20H4v-4Zm10-10 4 4'};
    if(paths[text]){button.classList.add('icon-control');button.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+paths[text]+'"/></svg>';}
    button.addEventListener('click',action);return button;
  }
  function appendWorkspaceEmpty(container,title,message,kind) {
    const panel=document.createElement('div');panel.className='workspace-empty';
    const icon=document.createElement('span');icon.className='workspace-empty-icon';icon.setAttribute('aria-hidden','true');
    icon.innerHTML=kind==='goals'?'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/></svg>':'<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 10h16m-11 5h6"/></svg>';
    const heading=document.createElement('h3');heading.textContent=title;
    const description=document.createElement('p');description.textContent=message;
    panel.append(icon,heading,description);container.append(panel);
  }
  function appendEmpty(container,message) {const p=document.createElement('p');p.className='empty-state';p.textContent=message;container.append(p);}
  function appendOption(select,value,text) {const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}
  function trackFold(details,key) {
    details.open=sectionLayout.folds[key]!==false;details.foldBaseline=details.open;
    details.addEventListener('toggle',()=>{if(details.isConnected && details.foldBaseline!==details.open){details.foldBaseline=details.open;sectionLayout.folds[key]=details.open;persist();}});
  }
  function journalMonth(title,key) {
    const root=document.createElement('details');root.className='journal-month';
    const summary=document.createElement('summary');const label=document.createElement('span');label.textContent=title;summary.append(label);
    const body=document.createElement('div');body.className='journal-month-entries';root.append(summary,body);
    trackFold(root,key);return {root,body};
  }
  function categoryLabel(category) {return category?`${category.emoji ? category.emoji+' ' : ''}${category.name}`:'Catégorie';}
  function syncCategoryOptions(select) {
    const previous=select.value;select.replaceChildren();appendOption(select,'','Toutes les catégories');categories.forEach(category=>appendOption(select,category.id,categoryLabel(category)));select.value=categories.some(c=>c.id===previous)?previous:'';
  }
  function setPage(page, scroll = true) {
    // Explicit navigation opens today; cloud refreshes preserve the day being edited.
    if(page==='day' && scroll){agendaDate=localDateKey(new Date());$('#dailyActivityFeedback').textContent='';}
    const changedPage=currentPage!==page;
    currentPage=page;
    document.querySelectorAll('[data-workspace-page]').forEach(section=>{section.hidden=section.dataset.workspacePage!==page;});
    document.querySelectorAll(':is(.page-nav,.account-menu) [data-page]').forEach(button=>{if(button.dataset.page===page)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
    
    if(changedPage || scroll){setAccountMenu(false);setMobileMenu(false);}
    if(changedPage)document.querySelectorAll('.filter-drawer[open]').forEach(dialog=>dialog.close());
    if(page==='profile')renderProfile();
    renderWorkspace();persist();if(scroll)window.scrollTo({top:0,behavior:'smooth'});
  }
  document.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>{
    const fromDropdown=button.closest('.account-menu') || mainNavigation.hasAttribute('data-open');
    setPage(button.dataset.page);
    if(fromDropdown){
      const heading=document.querySelector('[data-workspace-page="'+button.dataset.page+'"] h1');
      if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
    }
  }));
  function exportInterface() {
    return {sectionLayout,historyView,activityFormat,goalFormat,page:currentPage,calendarView,focusDate,agendaDate,agendaView,goalReference,goalCategoryFilter,goalStatusFilter,goalActivityFilter,
      journalCategory:$('#journalCategory').value,journalYear:$('#journalYear').value,journalSearch:$('#journalSearch').value,journalLimit,
      journalFiltersOpen:$('#journalFilters').open};
  }
  function restoreInterface(value) {
    const date=(input,fallback)=>/^\d{4}-\d{2}-\d{2}$/.test(input || '')?input:fallback;
    const views=['day','week','month','year'];
    historyView=views.includes(value.historyView)?value.historyView:'year';
    activityFormat=validFormat(value.activityFormat,'calendar');goalFormat=validFormat(value.goalFormat,'cards');
    const layout=value.sectionLayout;sectionLayout={folds:layout?.folds && typeof layout.folds==='object' && !Array.isArray(layout.folds)?{...layout.folds}:{},orders:layout?.orders && typeof layout.orders==='object' && !Array.isArray(layout.orders)?Object.fromEntries(Object.entries(layout.orders).filter(([,ids])=>Array.isArray(ids)).map(([key,ids])=>[key,ids.filter(id=>typeof id==='string')])):{}};
    calendarView=views.includes(value.calendarView)?value.calendarView:(window.matchMedia('(max-width:600px)').matches?'month':'year');
    agendaView='day';
    focusDate=date(value.focusDate,localDateKey(new Date()));agendaDate=date(value.agendaDate,localDateKey(new Date()));goalReference=date(value.goalReference,'');
    goalCategoryFilter=value.goalCategoryFilter || null;goalActivityFilter=Array.isArray(value.goalActivityFilter)?value.goalActivityFilter:null;goalStatusFilter=['all','pending','success','warning','danger'].includes(value.goalStatusFilter)?value.goalStatusFilter:'all';
    $('#journalSearch').value=typeof value.journalSearch==='string'?value.journalSearch:'';
    journalLimit=Number.isInteger(value.journalLimit)&&value.journalLimit>=40?value.journalLimit:40;
    // Populate options first so native selects retain the restored values.
    syncCategoryOptions($('#journalCategory'));$('#journalCategory').value=value.journalCategory || '';
    renderJournal();$('#journalYear').value=value.journalYear || 'all';
    $('#journalFilters').open=value.journalFiltersOpen!==false;
    setPage(['calendar','day','goals','profile','journal'].includes(value.page)?value.page:'day',false);
  }
  ['#journalFilters'].forEach(id=>$(id).addEventListener('toggle',persist));
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
  document.querySelectorAll('[data-agenda-view]').forEach(button=>button.addEventListener('click',()=>{agendaView=button.dataset.agendaView;renderWorkspace();persist();}));
  $('#agendaDate').addEventListener('change',()=>{if($('#agendaDate').value){agendaDate=$('#agendaDate').value;renderWorkspace();persist();}});
  $('#agendaPrevious').addEventListener('click',()=>{agendaDate=shiftDate(agendaDate,agendaView,-1);renderWorkspace();persist();});
  $('#agendaNext').addEventListener('click',()=>{agendaDate=shiftDate(agendaDate,agendaView,1);renderWorkspace();persist();});
  $('#agendaToday').addEventListener('click',()=>{agendaDate=localDateKey(new Date());renderWorkspace();persist();});
  function bindDateNavigation(triggerId,inputId) {
    const trigger=$('#'+triggerId),input=$('#'+inputId);
    const toggle=open=>{input.hidden=!open;trigger.setAttribute('aria-expanded',String(open));};
    toggle(false);trigger.setAttribute('aria-controls',inputId);
    trigger.addEventListener('click',()=>{
      toggle(input.hidden);
      if(!input.hidden){input.focus();try{input.showPicker?.();}catch{}}
    });
    input.addEventListener('keydown',event=>{
      if(event.key==='Escape'){toggle(false);trigger.focus({preventScroll:true});}
    });
    input.addEventListener('change',()=>{
      if(input.value){toggle(false);trigger.focus({preventScroll:true});}
    });
    document.addEventListener('click',event=>{if(!trigger.parentElement.contains(event.target))toggle(false);});
  }
  function updateDateNavigation(triggerId,inputId,date,label) {
    const trigger=$('#'+triggerId);
    trigger.textContent=label;trigger.setAttribute('aria-label','Choisir une date · '+label);
    if(date===localDateKey(new Date()))trigger.setAttribute('aria-current','date');
    else trigger.removeAttribute('aria-current');
    $('#'+inputId).value=date;
  }
  bindDateNavigation('periodLabel','calendarDateInput');
  bindDateNavigation('agendaDateLabel','agendaDate');
  bindDateNavigation('goalDateLabel','globalGoalDate');
  $('#calendarDateInput').addEventListener('change',event=>{
    if(!event.target.value)return;
    focusDate=event.target.value;state.year=Number(focusDate.slice(0,4));render();
  });
  function validFormat(format,fallback) {return ['calendar','cards','list'].includes(format)?format:fallback;}
  function syncFormatButtons(scope,format) {
    document.querySelectorAll('[data-'+scope+'-format]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset[scope+'Format']===format)));
  }
  document.querySelectorAll('[data-activity-format]').forEach(button=>button.addEventListener('click',()=>{
    activityFormat=button.dataset.activityFormat;render();
  }));
  document.querySelectorAll('[data-goal-format]').forEach(button=>button.addEventListener('click',()=>{
    goalFormat=button.dataset.goalFormat;renderGoals();persist();
  }));
  function renderActivityRecords(reference,root) {
    root.replaceChildren();root.dataset.format=activityFormat;
    const [start,end]=periodBounds(reference,calendarView),selected=visibleActivityIds();
    Object.keys(state.entries).filter(date=>date>=start && date<=end).sort((a,b)=>b.localeCompare(a)).forEach(date=>{
      state.entries[date].filter(id=>selected.has(id)).forEach(id=>{
        const activity=activityById(id);if(!activity)return;
        const detail=state.details[date]?.[id] || {};
        const row=document.createElement('article');row.className='activity-record';row.style.setProperty('--activity-color',activity.color);
        const body=document.createElement('div'),title=document.createElement('h3');title.textContent=activity.name;
        const time=document.createElement('time');time.dateTime=date;time.textContent=formatDate(date);
        const metrics=document.createElement('p');metrics.className='muted';
        metrics.textContent=[(detail.count || 1)+' fois',detail.distance!=null?detail.distance+' km':'',detail.durationMinutes!=null?detail.durationMinutes+' min':''].filter(Boolean).join(' · ');
        body.append(title,metrics);
        if(detail.note){const note=document.createElement('p');note.className='activity-record-note';note.textContent=detail.note;body.append(note);}
        const edit=makeButton('Modifier',()=>toggleEntry(date,true,[id]),'activity-record-edit');
        edit.setAttribute('aria-label','Modifier '+activity.name+' · '+formatDate(date));
        row.append(time,body,edit);root.append(row);
      });
    });
    if(!root.children.length)appendWorkspaceEmpty(root,'Aucune activité enregistrée','Choisissez une autre période ou modifiez vos filtres.','activities');
  }
  function renderCalendar() {
    const reference=calendarDateForYear(),calendar=$('#calendar');calendar.dataset.view=calendarView;
    document.querySelectorAll('[data-calendar-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.calendarView===calendarView)));
    updateDateNavigation('periodLabel','calendarDateInput',reference,periodLabel(reference,calendarView));
    $('#categoryBar').hidden=false;
    $('#toolbar').hidden=false;
    const records=$('#activityRecords'),calendarFormat=activityFormat==='calendar';
    syncFormatButtons('activity',activityFormat);
    calendar.hidden=!calendarFormat;$('#legend').hidden=!calendarFormat;records.hidden=calendarFormat;
    if(!calendarFormat){renderActivityRecords(reference,records);return;}
    if(calendarView==='year'){renderYearCalendar();return;}
    calendar.replaceChildren();
    if(calendarView==='month')renderMonth(calendar,reference);
    if(calendarView==='week')renderWeek(calendar,reference,false);
    if(calendarView==='day')renderCalendarDay(calendar,reference);
  }
  function visibleActivityIds() {return new Set(state.selectedActivities);}
  function renderMonth(container,reference,agenda=false) {
    const [year,month]=reference.split('-').map(Number),visible=visibleActivityIds();
    const header=document.createElement('div');header.className='month-weekdays';WEEKDAYS.forEach(day=>{const span=document.createElement('span');span.textContent=day;header.append(span);});container.append(header);
    const grid=document.createElement('div');grid.className='month-grid';
    for(let i=0;i<getMondayFirstDay(year,month-1);i++){const empty=document.createElement('div');empty.className='month-cell empty';grid.append(empty);}
    for(let day=1;day<=daysInMonth(year,month-1);day++){
      const key=dateKey(year,month-1,day),ids=(state.entries[key] || []).filter(id=>agenda || visible.has(id));
      const cell=makeButton('',()=>{if(agenda){agendaDate=key;agendaView='day';renderWorkspace();persist();}else toggleEntry(key);},'month-cell');
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
      const label=makeButton(formatDate(date),()=>{if(agenda){agendaDate=date;agendaView='day';renderWorkspace();persist();}else{focusDate=date;calendarView='day';state.year=Number(date.slice(0,4));render();}},'week-heading');column.append(label);
      if(agenda)renderChecklist(column,date,null,true);
      else {
        const ids=(state.entries[date] || []).filter(id=>state.selectedActivities.includes(id));
        if(!ids.length){const empty=document.createElement('p');empty.className='muted';empty.textContent='Aucune activité';column.append(empty);}
        ids.forEach(id=>{const activity=activityById(id);if(!activity)return;const button=makeButton('',()=>toggleEntry(date,true,[id]),'week-activity');button.style.setProperty('--activity-color',activity.color);
          const name=document.createElement('strong');name.textContent=activity.name;
          const info=document.createElement('small');info.textContent=categoryLabel(categories.find(c=>c.id===activity.categoryId));
          const detail=state.details[date]?.[id];const text=document.createElement('span');text.textContent=[detail?.count>1?detail.count+' fois':'',detail?.distance!=null?detail.distance+' km':'',detail?.note || ''].filter(Boolean).join(' · ');button.append(name,info,text);column.append(button);});
        column.append(makeButton('+ Activité',()=>toggleEntry(date,true),'text-button'));
      }
      column.classList.toggle('today',date===localDateKey(new Date()));grid.append(column);
    }
    container.append(grid);
  }
  function renderCalendarDay(container,date) {
    const section=document.createElement('section');section.className='calendar-day';
    const heading=document.createElement('h2');heading.textContent=formatDate(date);section.append(heading);
    const ids=(state.entries[date] || []).filter(id=>state.selectedActivities.includes(id));
    if(!ids.length)appendWorkspaceEmpty(section,'Aucune activité enregistrée','Ajoutez une activité à cette journée ou modifiez vos filtres.','activities');
    ids.forEach(id=>{
      const activity=activityById(id);if(!activity)return;
      const row=document.createElement('article');row.className='calendar-day-row';row.style.setProperty('--activity-color',activity.color);
      const text=document.createElement('div'),name=document.createElement('h3');name.textContent=activity.name;
      const detail=state.details[date]?.[id] || {},note=document.createElement('p');note.textContent=[(detail.count || 1)+' séance'+((detail.count || 1)>1?'s':''),detail.distance!=null?detail.distance+' km':'',detail.durationMinutes!=null?detail.durationMinutes+' min':'',detail.note || ''].filter(Boolean).join(' · ');text.append(name,note);
      const edit=makeButton('Détails',()=>toggleEntry(date,true,[id]),'text-button');edit.setAttribute('aria-label','Modifier '+activity.name+' · '+date);
      const remove=makeButton('Retirer',()=>updateSession(date,id,{count:0}),'text-button');remove.setAttribute('aria-label','Retirer '+activity.name+' · '+date);row.append(text,edit,remove);section.append(row);
    });
    const add=makeButton('+ Ajouter une activité',()=>toggleEntry(date,true),'text-button');add.disabled=!state.activities.length;section.append(add);container.append(section);
  }
  function goalTargets(categoryId=null) {
    const chosen=categoryId?categories.filter(c=>c.id===categoryId):categories;
    const targets=chosen.flatMap(parent=>{
      const activities=state.activities.filter(a=>a.categoryId===parent.id);
      return [...goalsOf(parent).map(goal=>({goal,item:parent,ids:activities.map(a=>a.id),category:true,parent})),...activities.flatMap(item=>goalsOf(item).map(goal=>({goal,item,ids:[item.id],parent})))];
    });
    const priority=new Map(state.goalOrder.map((id,index)=>[id,index]));
    return targets.sort((a,b)=>(priority.get(a.goal.id) ?? Infinity)-(priority.get(b.goal.id) ?? Infinity));
  }
  function goalMatchesStatus(result,filter){return filter==='all'||result.tone===filter||(filter==='success'&&result.tone==='warning');}
  function drawGoals(container,reference,categoryId=null,statusFilter='all',period=null,activityIds=null,mode=null) {
    container.replaceChildren();
    const targets=filteredGoalTargets(categoryId,activityIds).filter(t=>(!period||t.goal.period===period)&&(!mode||t.goal.mode===mode)).map(t=>({...t,result:goalProgress(t.ids,t.goal,reference)})).filter(t=>goalMatchesStatus(t.result,statusFilter));
    if(!targets.length){appendEmpty(container,'Aucun objectif pour ces filtres. Définissez-en dans la gestion des activités ou des catégories.');return;}
    const daily=container.classList.contains('daily-goal-grid');
    targets.forEach(({item,parent,category,goal,result,ids})=>{
      const card=document.createElement('article');card.className='goal-card';card.dataset.goalId=goal.id;card.dataset.mode=goal.mode;card.dataset.display=goal.display || 'bar';card.dataset.tone=result.tone;card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label','Modifier l’objectif de '+item.name+' · '+goalDescription(goal));
      const head=document.createElement('div');head.className='goal-card-head';const label=document.createElement('p');label.className='eyebrow';label.textContent=category?'CATÉGORIE':categoryLabel(parent);
      const drag=makeButton('⠿',()=>{},'goal-drag');drag.setAttribute('aria-label','Réorganiser l’objectif de '+item.name);head.append(label,drag);
      const name=document.createElement('h3');name.textContent=category?categoryLabel(item):item.name;
      const measure=document.createElement('div');measure.className='goal-measure';
      const progress=createProgress(result,goal);
      if(daily && goal.display==='ring'){
        const digits=progress.querySelector('span').textContent.length;
        if(digits>10)progress.classList.add('ring-long-value');
      }
      if(goal.display!=='ring') {const amount=document.createElement('div');amount.className='goal-amount';const strong=document.createElement('strong');strong.textContent=measureValue(result.count,goal);const target=document.createElement('span');target.textContent=' / '+measureValue(goal.target,goal)+(goal.unit==='count'?'':' '+unitLabel(goal));amount.append(strong,target);measure.append(amount);}
      measure.append(progress);
      const description=document.createElement('p');description.className='goal-rule';description.textContent=goalDescription(goal);
      if(daily){
        const rule=goal.mode==='max'?'Au maximum':'Au moins';
        const marker=document.createElement('span');marker.className='goal-bound';marker.textContent=rule;
        description.replaceChildren(marker,document.createTextNode(goalDescription(goal).slice(rule.length)));
      }
      const status=document.createElement('p');status.className='goal-status';status.textContent=result.status;
      const dates=document.createElement('small');dates.className='goal-dates';dates.textContent=result.start===result.end?formatDate(result.start):formatDate(result.start)+' — '+formatDate(result.end);
      const logging=document.createElement('div');logging.className='goal-logging';
      if(daily){
        logging.append(dailyGoalControls(item,goal,result,ids.filter(id=>activityIds===null||activityIds.includes(id)),reference,category));
      }else{
        const hint=document.createElement('small');hint.className='logging-date';hint.textContent='Activités';logging.append(hint);
        ids.filter(id=>activityIds===null||activityIds.includes(id)).forEach(id=>{const activity=activityById(id);if(activity)logging.append(objectiveLogRow(activity,reference,goal));});
      }
      logging.addEventListener('click',event=>event.stopPropagation());
      head.prepend(status);measure.append(dates);card.append(head,name,description,measure,logging);
      if(!daily){
        const actions=document.createElement('div');actions.className='goal-card-actions';
        actions.append(makeButton('Modifier',()=>openGoalEditor(item.id,goal.id),'text-button goal-edit'));
        actions.addEventListener('click',event=>event.stopPropagation());
        card.append(actions);
      }else card.title='Cliquer pour modifier l’objectif';
      card.addEventListener('click',event=>{if(!event.target.closest('button,input,label,select,textarea,.goal-logging'))openGoalEditor(item.id,goal.id);});
      card.addEventListener('keydown',event=>{if(event.target===card&&['Enter',' '].includes(event.key)){event.preventDefault();openGoalEditor(item.id,goal.id);}});
      container.append(card);enableDirectReorder(card,goal.id,container,ordered=>{const full=goalTargets().map(t=>({id:t.goal.id}));state.goalOrder=reorderSubset(full,ordered).map(t=>t.id);render();});
    });
  }
  function dailyGoalControls(item,goal,result,ids,date,category) {
    const controls=document.createElement('div');controls.className='daily-goal-controls';
    const recorded=state.entries[date] || [];
    function change(direction) {
      if(category || goal.unit!=='count'){
        openDailyActivityDialog({date,categoryId:category?item.id:item.categoryId,ids,direction});
      }else{
        const count=recorded.includes(item.id)?state.details[date]?.[item.id]?.count || 1:0;
        updateSession(date,item.id,{count:count+direction});
      }
    }
    const stepper=document.createElement('div');stepper.className='daily-goal-stepper';
    const minus=makeButton('−',()=>change(-1)),plus=makeButton('+',()=>change(1));
    minus.setAttribute('aria-label','Retirer une occurrence de '+item.name+' · objectif '+goal.id);
    plus.setAttribute('aria-label','Ajouter une occurrence de '+item.name+' · objectif '+goal.id);
    minus.disabled=!ids.some(id=>recorded.includes(id));
    plus.disabled=!ids.length;
    stepper.append(minus,plus);controls.append(stepper);
    if(!ids.length){const hint=document.createElement('small');hint.className='muted';hint.textContent='Ajoutez une activité à cette catégorie.';controls.append(hint);}
    return controls;
  }
  function objectiveLogRow(activity,date,goal) {
    const row=document.createElement('div');row.className='objective-log-row';
    const included=(state.entries[date] || []).includes(activity.id),count=included?state.details[date]?.[activity.id]?.count || 1:0;
    const name=document.createElement('span');name.className='objective-log-name';name.textContent=activity.name;row.append(name);
    const controls=document.createElement('div');controls.className='objective-log-controls';
    const minus=makeButton('−',()=>updateSession(date,activity.id,{count:Math.max(0,count-1)}));minus.disabled=!count;minus.setAttribute('aria-label','Retirer une occurrence de '+activity.name+' · objectif '+goal.id);
    const number=document.createElement('span');number.textContent=count;
    const plus=makeButton('+',()=>updateSession(date,activity.id,{count:count+1}));plus.setAttribute('aria-label','Ajouter une occurrence de '+activity.name+' · objectif '+goal.id);controls.append(minus,number,plus);
    if(goal.unit==='distance'||goal.unit==='duration'){
      const metric=document.createElement('label');metric.className='objective-metric';const input=document.createElement('input');input.type='number';input.min='0';input.max=goal.unit==='distance'?'100000':'1000000';input.step='any';const field=goal.unit==='distance'?'distance':'durationMinutes',scale=goal.unit==='duration'&&goal.scale==='hours'?60:1;input.value=state.details[date]?.[activity.id]?.[field]!=null?state.details[date][activity.id][field]/scale:'';input.placeholder='—';input.setAttribute('aria-label',unitLabel(goal)+' de '+activity.name+' · objectif '+goal.id);input.addEventListener('change',()=>{if(input.checkValidity())updateSession(date,activity.id,{[field]:input.value===''?null:Number(input.value)*scale});});metric.append(input,document.createTextNode(unitLabel(goal)));controls.append(metric);
    }
    row.append(controls);return row;
  }
  function selectCategory(id) {
    if(state.activeCategory && state.activeCategory!=='overview')state.selections[state.activeCategory]=[...state.selectedActivities];state.activeCategory=id;state.selectedActivities=id==='overview'?state.activities.map(activity=>activity.id):[...(state.selections[id] || [])];render();
  }
  function renderGoalSummary(targets,date,progressContainer,period) {
      const overview=document.createElement('div');overview.className='day-overview daily-focus-summary';
      const outcomes=targets.map(({item,ids,goal})=>{
        const result=goalProgress(ids,goal,date);
        const tone=result.tone;
        return {item,goal,result,tone};
      });
      const atLimit=outcomes.filter(({tone})=>tone==='warning').length;
      const completed=outcomes.filter(({tone})=>tone==='success').length+atLimit;
      const exceeded=outcomes.filter(({tone})=>tone==='danger').length;
      const count=document.createElement('strong');count.textContent=completed+' / '+targets.length;
      const track=document.createElement('div');track.className='day-total-progress';
      track.setAttribute('role','progressbar');
      track.setAttribute('aria-label',period==='day'?'Objectifs quotidiens respectés':'Objectifs de la période respectés');
      track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(targets.length));track.setAttribute('aria-valuenow',String(completed));
      track.setAttribute('aria-valuetext',completed+' sur '+targets.length+' respectés'+(atLimit?', dont '+atLimit+' à la limite':'')+', '+exceeded+' dépassés, '+(targets.length-completed-exceeded)+' à accomplir');
      const toneOrder={danger:0,warning:1,success:2,pending:3};
      outcomes.sort((left,right)=>toneOrder[left.tone]-toneOrder[right.tone]).forEach(({item,goal,result,tone})=>{
        const segment=document.createElement('span');segment.dataset.tone=tone;
        segment.title=item.name+' · '+goalDescription(goal)+' · '+result.status;
        track.append(segment);
      });
      overview.append(count,track);progressContainer.append(overview);
  }
  function renderChecklist(container, date, categoryId = null, compact = false, progressContainer = container) {
    const wrap = document.createElement('div');
    wrap.className = 'goal-cards daily-goal-grid';
    // All daily rules belong in the agenda, including upper limits.
    const targets = goalTargets(categoryId).filter(({goal}) => goal.period === 'day');
    if (!compact && targets.length) renderGoalSummary(targets,date,progressContainer,'day');
    if (targets.length && !compact) {
      const rows=document.createElement('div');rows.className='daily-goal-rows';
      const modes=['min','max'];
      const saved=sectionLayout.orders.dailyGoalModes;
      if (Array.isArray(saved) && saved[0]==='max') modes.reverse();
      const visible=modes.filter(mode=>targets.some(({goal})=>goal.mode===mode));
      function updateRowArrows(){
        [...rows.children].forEach((row,index)=>{
          const arrow=row.querySelector('.daily-goal-row-arrow');
          if(!arrow)return;
          const up=index===1;
          const direction=up?'vers le haut':'vers le bas';
          arrow.querySelector('path').setAttribute('d',up?'M12 19V5m-6 6 6-6 6 6':'M12 5v14m-6-6 6 6 6-6');
          arrow.setAttribute('aria-label','Déplacer les '+row.getAttribute('aria-label').toLowerCase()+' '+direction);
          arrow.title=arrow.getAttribute('aria-label');
        });
      }
      visible.forEach(mode=>{
        const row=document.createElement('section');row.className='daily-goal-row';row.dataset.mode=mode;
        row.setAttribute('aria-label',mode==='max'?'Objectifs maximums':'Objectifs minimums');
        const grid=document.createElement('div');grid.className='goal-cards daily-goal-grid';
        row.append(grid);rows.append(row);
        if(visible.length===2){
          const arrow=makeButton('',()=>{
            const focused=document.activeElement;
            animateReorder(rows,rows.lastElementChild,rows.firstElementChild,true);
            if(rows.contains(focused))focused.focus({preventScroll:true});
            updateRowArrows();
            sectionLayout.orders.dailyGoalModes=[...rows.children].map(node=>node.dataset.mode);
            persist();
          },'daily-goal-row-arrow');
          arrow.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path/></svg>';
          row.append(arrow);
        }
        drawGoals(grid,date,categoryId,'all','day',null,mode);
      });
      updateRowArrows();
      container.append(rows);
    } else if (targets.length) drawGoals(wrap,date,categoryId,'all','day',null);
    if (!targets.length) {
      const empty = document.createElement('div');
      empty.className = 'daily-focus-empty';
      appendEmpty(empty, 'Aucun objectif quotidien pour le moment. Choisissez une fréquence « par jour » pour voir vos objectifs ici.');
      empty.append(makeButton('Créer un objectif quotidien', () => {
        historyView='day';
        goalCategoryFilter = null;
        goalActivityFilter = null;
        goalStatusFilter = 'all';
        goalReference = date;
        renderGoals();
        setPage('goals');
        $('#newGoalButton').click();
      }, 'primary-action'));
      wrap.append(empty);
    }
    if (compact || !targets.length) container.append(wrap);
    if (!compact) {
      const footer = document.createElement('div');
      footer.className = 'daily-focus-footer';
      footer.append(makeButton('Voir tous mes objectifs ↗', () => {
        const goals=goalTargets();historyView=goals.some(({goal})=>goal.period==='day')?'day':goals[0]?.goal.period || 'day';
        goalStatusFilter = 'all';
        goalCategoryFilter = null;
        goalActivityFilter = null;
        goalReference = date;
        renderGoals();
        setPage('goals');
      }, 'agenda-goals-link'));
      container.append(footer);
    }
  }

  function renderAnnualSummary(container,reference) {
    const year=Number(reference.slice(0,4));const grid=document.createElement('div');grid.className='annual-summary';
    MONTHS.forEach((month,index)=>{const prefix=`${year}-${pad(index+1)}-`;let count=0,days=0;Object.entries(state.entries).forEach(([date,ids])=>{if(!date.startsWith(prefix))return;days++;ids.forEach(id=>{if(activityById(id))count+=state.details[date]?.[id]?.count || 1;});});
      const button=makeButton('',()=>{agendaDate=dateKey(year,index,1);agendaView='month';renderWorkspace();persist();},'annual-month');const name=document.createElement('strong');name.textContent=month;const amount=document.createElement('b');amount.textContent=count;const info=document.createElement('small');info.textContent=days+' jours renseignés';button.append(name,amount,info);grid.append(button);});container.append(grid);
  }
  function renderWorkspace() {
    if(currentPage!=='day')return;
    if($('#agendaDate').value!==agendaDate)$('#dailyActivityFeedback').textContent='';
    agendaView='day';updateDateNavigation('agendaDateLabel','agendaDate',agendaDate,formatDate(agendaDate));
    const content=$('#agendaGoals'),progress=$('#agendaProgress');content.replaceChildren();progress.replaceChildren();renderChecklist(content,agendaDate,null,false,progress);
  }

  const dailyActivityDialog=$('#dailyActivityDialog'),dailyActivityForm=$('#dailyActivityForm');
  const dailyActivityCategory=$('#dailyActivityCategory'),dailyActivityChoice=$('#dailyActivityChoice');
  let dailyActivityContext;
  function dailyActivityOptions() {
    const {date,ids,direction}=dailyActivityContext;
    return state.activities.filter(activity=>(!ids || ids.includes(activity.id)) &&
      (direction>0 || (state.entries[date] || []).includes(activity.id)));
  }
  function refreshDailyActivityChoice() {
    const previous=dailyActivityChoice.value;dailyActivityChoice.replaceChildren();
    appendOption(dailyActivityChoice,'','Choisir une activité');
    const activities=dailyActivityOptions().filter(activity=>activity.categoryId===dailyActivityCategory.value);
    activities.forEach(activity=>appendOption(dailyActivityChoice,activity.id,activity.name));
    dailyActivityChoice.disabled=!activities.length;
    if(activities.some(activity=>activity.id===previous))dailyActivityChoice.value=previous;
    else if(activities.length===1)dailyActivityChoice.value=activities[0].id;
    refreshDailyActivityDetails();
  }
  function refreshDailyActivityDetails() {
    const activityId=dailyActivityChoice.value,{date,direction}=dailyActivityContext;
    const existing=$('#dailyActivityExisting'),recorded=(state.entries[date] || []).includes(activityId);
    existing.hidden=!recorded;
    existing.textContent=direction>0?'Déjà renseignée ce jour : cet ajout complétera les valeurs enregistrées.':'Retirer la dernière occurrence supprime aussi ses mesures et sa note. Pour un retrait partiel, indiquez les mesures à déduire si nécessaire.';
    $('#saveDailyActivity').disabled=dailyActivityChoice.disabled;
    $('#dailyActivityError').hidden=true;
  }
  function refreshDailyActivityDate() {
    const {date,categoryId,direction}=dailyActivityContext;
    updateDateNavigation('activityDateLabel','dailyActivityDate',date,formatDate(date));
    const previous=dailyActivityCategory.value;
    dailyActivityCategory.replaceChildren();
    const activities=dailyActivityOptions();
    const available=categories.filter(category=>(!categoryId || category.id===categoryId) && activities.some(activity=>activity.categoryId===category.id));
    available.forEach(category=>appendOption(dailyActivityCategory,category.id,categoryLabel(category)));
    const preferred=previous || state.activeCategory;
    if(available.some(category=>category.id===preferred))dailyActivityCategory.value=preferred;
    dailyActivityCategory.disabled=!available.length || Boolean(categoryId);
    $('#dailyActivityEmpty').hidden=Boolean(available.length);
    $('#dailyActivityEmpty').textContent=direction>0?'Créez d’abord une activité dans l’onglet Activités.':'Aucune activité enregistrée à retirer ce jour.';
    $('#dailyActivityDetails').hidden=!available.length;
    refreshDailyActivityChoice();
  }
  function openDailyActivityDialog({date=agendaDate,categoryId=null,ids=null,direction=1}={}) {
    dailyActivityContext={date,categoryId,ids,direction};
    $('#dailyActivityDate').hidden=true;$('#activityDateLabel').setAttribute('aria-expanded','false');
    dailyActivityForm.reset();
    dailyActivityCategory.replaceChildren();dailyActivityChoice.replaceChildren();
    $('#dailyActivityNote').closest('label').hidden=direction<0;
    $('#dailyActivityTitle').textContent=direction>0?'Ajouter une activité':'Retirer une activité';
    $('#saveDailyActivity').textContent=direction>0?'Enregistrer l’activité':'Confirmer le retrait';
    refreshDailyActivityDate();
    dailyActivityDialog.showModal();
  }
  bindDateNavigation('activityDateLabel','dailyActivityDate');
  function changeDailyActivityDate(date) {
    if(!date)return;
    dailyActivityContext.date=date;
    refreshDailyActivityDate();
  }
  $('#dailyActivityDate').addEventListener('change',event=>changeDailyActivityDate(event.target.value));
  $('#activityDatePrevious').addEventListener('click',()=>changeDailyActivityDate(shiftDate(dailyActivityContext.date,'day',-1)));
  $('#activityDateNext').addEventListener('click',()=>changeDailyActivityDate(shiftDate(dailyActivityContext.date,'day',1)));
  $('#activityDateToday').addEventListener('click',()=>changeDailyActivityDate(localDateKey(new Date())));
  $('#openDailyActivity').addEventListener('click',()=>openDailyActivityDialog());
  $('#openCalendarActivity').addEventListener('click',()=>openDailyActivityDialog({date:calendarDateForYear()}));
  dailyActivityCategory.addEventListener('change',refreshDailyActivityChoice);
  dailyActivityChoice.addEventListener('change',refreshDailyActivityDetails);
  ['#closeDailyActivity','#cancelDailyActivity'].forEach(id=>$(id).addEventListener('click',()=>dailyActivityDialog.close()));
  dailyActivityForm.addEventListener('submit',event=>{
    event.preventDefault();
    if(!dailyActivityDialog.open || !dailyActivityForm.reportValidity())return;
    const activity=dailyActivityOptions().find(item=>item.id===dailyActivityChoice.value && item.categoryId===dailyActivityCategory.value);
    if(!activity)return;
    const {date,direction}=dailyActivityContext;
    const existing=state.details[date]?.[activity.id];
    const recorded=(state.entries[date] || []).includes(activity.id);
    const adjustMetric=(id,previous)=>$(id).value===''?previous ?? null:(previous ?? 0)+direction*$(id).valueAsNumber;
    const count=(recorded?existing?.count || 1:0)+direction*$('#dailyActivityCount').valueAsNumber;
    const distance=adjustMetric('#dailyActivityDistance',existing?.distance);
    const durationMinutes=adjustMetric('#dailyActivityDuration',existing?.durationMinutes);
    if(count<0 || distance<0 || durationMinutes<0 || count>1000 || distance>100000 || durationMinutes>1000000){
      const error=$('#dailyActivityError');error.textContent=direction>0?'Le total pour cette journée dépasse la limite autorisée. Réduisez la quantité à ajouter.':'Vous ne pouvez pas retirer plus que ce qui a été enregistré.';error.hidden=false;return;
    }
    const note=direction>0?[existing?.note,$('#dailyActivityNote').value.trim()].filter(Boolean).join('\n'):existing?.note || '';
    updateSession(date,activity.id,{count,distance,durationMinutes,note});
    dailyActivityDialog.close();
    const feedback=$('#dailyActivityFeedback');
    if(currentPage==='day')feedback.textContent=activity.name+(direction>0?' : ajout enregistré le ':' : retrait enregistré le ')+formatDate(date)+'.';
  });

  function updateSession(date,id,patch) {
    if(!activityById(id))return;
    const entries=new Set(state.entries[date] || []),included=entries.has(id),existing=state.details[date]?.[id] || {};
    const value={count:included?existing.count || 1:0,distance:existing.distance ?? null,note:existing.note || '',...(existing.durationMinutes!=null?{durationMinutes:existing.durationMinutes}:{}),...patch};
    if(!('count' in patch) && !value.count && ((patch.note && patch.note.trim()) || patch.distance>0 || patch.durationMinutes>0))value.count=1;
    if(!Number.isInteger(value.count) || value.count<0 || value.count>1000 || (value.distance!=null && (!Number.isFinite(value.distance) || value.distance<0 || value.distance>100000)) || (value.durationMinutes!=null && (!Number.isFinite(value.durationMinutes) || value.durationMinutes<0 || value.durationMinutes>1000000)))return;
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
    if(state.activeCategory!=='overview' && !categories.some(c=>c.id===state.activeCategory))state.activeCategory=categories[0]?.id || null;
    const previous=state.selections;state.selections=Object.fromEntries(categories.map(category=>{const ids=state.activities.filter(a=>a.categoryId===category.id).map(a=>a.id);return [category.id,Array.isArray(previous[category.id])?previous[category.id].filter(id=>ids.includes(id)):ids];}));
    state.selectedActivities=state.activeCategory==='overview'?state.activities.map(activity=>activity.id):[...(state.selections[state.activeCategory] || [])];
  }
  function refreshSaveIndicators() {
    const status=$('#syncStatus');
    const showWarning=/^(Échec|Stockage local indisponible|Connexion interrompue|Synchronisez|Hors ligne · à synchroniser)/.test(status.textContent);
    status.parentElement.hidden=!showWarning;
    document.querySelectorAll('[data-save-status]').forEach(span=>{if(!span.dataset.invalid)span.textContent=status.textContent || 'Enregistré';});
  }
  function markInvalid(dialog,message) {const span=$(dialog).querySelector('[data-save-status]');span.dataset.invalid='true';span.textContent=message;}
  function clearInvalid(dialog) {const root=$(dialog),editor=root.querySelector('#activityRows,#categoryEditorRows,#dayPickerChoices,[data-goal-fields]');if(editor && [...editor.querySelectorAll('input')].some(input=>!input.checkValidity())){markInvalid(dialog,'Vérifiez les champs');return;}const span=root.querySelector('[data-save-status]');delete span.dataset.invalid;refreshSaveIndicators();}
  new MutationObserver(refreshSaveIndicators).observe($('#syncStatus'),{childList:true,subtree:true,characterData:true});
  let saveToastTimer;
  function dismissSaveToast() {
    clearTimeout(saveToastTimer);
    $('#saveToast').removeAttribute('data-visible');
    $('#saveToastMessage').textContent='';
  }
  document.addEventListener('calendar-save-toast-dismiss',dismissSaveToast);
  document.addEventListener('calendar-save-confirmed',()=>{
    clearTimeout(saveToastTimer);
    $('#saveToast').dataset.visible='true';
    $('#saveToastMessage').textContent='Modifications enregistrées';
    saveToastTimer=setTimeout(dismissSaveToast,3200);
  });
  function createEmojiPicker(category) {
    const button=makeButton(category.emoji || '＋',()=>openEmojiKeyboard(category,button),'category-emoji-button');button.setAttribute('aria-label','Emoji de '+category.name);return button;
  }

  function renderScopeReport(container,reference,scope) {
    const targets=goalTargets();if(!targets.length)return;
    const grid=document.createElement('div');grid.className='scope-scores';
    const rank={day:0,week:1,month:2,year:3},units={day:'jours',week:'semaines',month:'mois',year:'années'};
    const [start,end]=periodBounds(reference,scope),today=localDateKey(new Date()),cutoff=end<today?end:today;
    targets.forEach(({item,ids,parent,category,goal})=>{
      const card=document.createElement('article');card.className='scope-score';
      const title=document.createElement('h3');title.textContent=category?categoryLabel(item):item.name;
      const subtitle=document.createElement('small');subtitle.textContent=categoryLabel(parent);
      const info=document.createElement('p');
      if(rank[goal.period]<rank[scope]) {
        // Count each recorded day once per goal instead of rescanning the entire journal for every period.
        const counts=new Map(),wanted=new Set(ids);
        Object.entries(state.entries).forEach(([date,entries])=>{
          let amount=0;entries.forEach(id=>{if(wanted.has(id))amount+=measuredAmount(date,id,goal);});
          if(!amount)return;const key=goal.period==='day'?date:periodBounds(date,goal.period)[0];counts.set(key,(counts.get(key) || 0)+amount);
        });
        const buckets=new Set();for(let date=start;date<=cutoff;date=shiftDate(date,'day',1))buckets.add(periodBounds(date,goal.period)[0]);
        const total=buckets.size,success=[...buckets].filter(key=>goal.mode==='min'?(counts.get(key) || 0)>=goal.target:(counts.get(key) || 0)<=goal.target).length;
        info.textContent=total?`${success} / ${total} ${units[goal.period]} ${goal.mode==='min'?'avec objectif atteint':'dans la limite'}`:'Période à venir';
        const hint=document.createElement('small');hint.textContent='Périodes écoulées et en cours, jusqu’à aujourd’hui.';card.append(title,subtitle,info,hint);
      } else {const result=goalProgress(ids,goal,reference);info.textContent=`${result.count} / ${goal.target} · ${result.status}`;const hint=document.createElement('small');hint.textContent=`Du ${formatDate(result.start)} au ${formatDate(result.end)}`;card.append(title,subtitle,info,hint);}
      grid.append(card);
    });container.append(grid);
  }

  // Objectives are independent measures attached to an activity or category.
  let goalCategoryFilter=null,goalStatusFilter='all',goalActivityFilter=null,goalEditorOwner=null;
  function goalsOf(item) {return Array.isArray(item?.goals)?item.goals:item?.goal?[{id:'legacy-'+item.id,unit:'count',display:'bar',...item.goal}]:[];}
  function normalizeGoalItem(item) {const copy={...item,goals:goalsOf(item).map((g,index)=>({unit:'count',display:'bar',...g,id:g.id || 'legacy-'+item.id+'-'+index}))};delete copy.goal;return copy;}
  function validGoal(goal) {return ['min','max'].includes(goal.mode) && ['day','week','month','year'].includes(goal.period) && ['count','distance','duration'].includes(goal.unit || 'count') && Number.isFinite(goal.target) && (goal.mode==='max'?goal.target>=0:goal.target>0) && goal.target<=1000000 && ((goal.unit || 'count')!=='count' || Number.isInteger(goal.target));}
  function measuredAmount(date,id,goal) {const detail=state.details[date]?.[id];return goal.unit==='distance'?Number(detail?.distance || 0):goal.unit==='duration'?Number(detail?.durationMinutes || 0):detail?.count || 1;}
  function measureValue(value,goal) {return new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(goal.unit==='duration' && goal.scale==='hours'?value/60:value);}
  function unitLabel(goal) {return goal.unit==='distance'?'km':goal.unit==='duration'?(goal.scale==='hours'?'h':'min'):'fois';}
  function goalDescription(goal) {const periods={day:'jour',week:'semaine',month:'mois',year:'an'};return `${goal.mode==='min'?'Au moins':'Au maximum'} ${measureValue(goal.target,goal)} ${unitLabel(goal)} par ${periods[goal.period]}`;}
  function createProgress(result,goal,small=false) {
    const zeroCap=goal.mode==='max' && goal.target===0;
    const percent=zeroCap?1:Math.max(0,Math.min(1,result.count/goal.target));const wrap=document.createElement('div');wrap.dataset.tone=result.tone;wrap.className=(goal.display==='ring'?'progress-ring':'goal-track')+(small?' progress-small':'');
    wrap.setAttribute('role','progressbar');wrap.setAttribute('aria-label',goalDescription(goal));wrap.setAttribute('aria-valuemin','0');wrap.setAttribute('aria-valuemax',String(zeroCap?1:goal.target));wrap.setAttribute('aria-valuenow',String(zeroCap?percent:Math.min(result.count,goal.target)));wrap.setAttribute('aria-valuetext',measureValue(result.count,goal)+' / '+measureValue(goal.target,goal)+' '+unitLabel(goal)+' · '+result.status);
    if(goal.display==='ring'){
      const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 80 80');svg.setAttribute('aria-hidden','true');
      for(const className of ['ring-base','ring-fill']){const circle=document.createElementNS(ns,'circle');circle.setAttribute('cx','40');circle.setAttribute('cy','40');circle.setAttribute('r','32');circle.setAttribute('class',className);if(className==='ring-fill'){circle.setAttribute('stroke-dasharray',String(2*Math.PI*32));circle.setAttribute('stroke-dashoffset',String(2*Math.PI*32*(1-percent)));}svg.append(circle);}
      const label=document.createElement('span');if(small)label.textContent=zeroCap?(result.tone==='success'?'✓':'!'):Math.round(percent*100)+'%';else{const amount=document.createElement('strong');amount.textContent=measureValue(result.count,goal);const target=document.createElement('small');target.textContent='/ '+measureValue(goal.target,goal)+(goal.unit==='count'?'':' '+unitLabel(goal));label.append(amount,target);}wrap.append(svg,label);
    }else{const fill=document.createElement('span');fill.style.width=percent*100+'%';wrap.append(fill);}
    return wrap;
  }
  function populateNewGoalOwners() {
    const category=categories.find(item=>item.id===$('#newGoalCategory').value);
    const select=$('#newGoalOwner');select.replaceChildren();
    if(!category)return;
    appendOption(select,category.id,'Toute la catégorie');
    state.activities.filter(activity=>activity.categoryId===category.id).forEach(activity=>appendOption(select,activity.id,activity.name));
  }
  $('#newGoalButton').addEventListener('click',()=>{
    const select=$('#newGoalCategory');select.replaceChildren();
    categories.forEach(category=>appendOption(select,category.id,categoryLabel(category)));
    if(goalCategoryFilter)select.value=goalCategoryFilter;
    populateNewGoalOwners();
    $('#createGoalButton').disabled=!select.options.length;
    $('#newGoalEmpty').hidden=Boolean(select.options.length);
    initialGoalOwner=$('#newGoalOwner').value;renderNewGoalFields();$('#newGoalDialog').showModal();
  });
  $('#newGoalCategory').addEventListener('change',()=>{
    populateNewGoalOwners();$('#newGoalOwner').dispatchEvent(new Event('change'));
  });
  let newGoalDraft,initialNewGoal,initialGoalOwner;
  function requestNewGoalClose() {
    const dialog=$('#newGoalDialog');
    const dirty=$('#newGoalOwner').value!==initialGoalOwner ||
      (initialNewGoal && (!newGoalDraft || !equivalentGoals(initialNewGoal,newGoalDraft)));
    requestGoalDialogClose(dialog,dirty);
  }
  ['#closeNewGoal','#cancelNewGoal'].forEach(id=>$(id).addEventListener('click',requestNewGoalClose));
  $('#newGoalDialog').addEventListener('cancel',event=>{event.preventDefault();requestNewGoalClose();});
  $('#newGoalOwner').addEventListener('change',()=>{
    const owner=ownerById($('#newGoalOwner').value);if(!owner)return;
    $('#newGoalFields').querySelectorAll('[aria-label]').forEach(field=>{
      const label=field.getAttribute('aria-label').split(' · ')[0];field.setAttribute('aria-label',label+' · '+owner.name);
    });
  });
  $('#newGoalForm').addEventListener('submit',event=>{
    event.preventDefault();
    const owner=ownerById($('#newGoalOwner').value);if(!owner || !newGoalDraft)return;
    persistItem(owner,{goals:[...goalsOf(owner),newGoalDraft]});$('#newGoalDialog').close();
  });
  function renderNewGoalFields() {
    const fields=$('#newGoalFields'),owner=ownerById($('#newGoalOwner').value);
    fields.replaceChildren();newGoalDraft=null;initialNewGoal=null;$('#newGoalError').hidden=true;
    if(!owner)return;
    const goal={id:'goal-'+crypto.randomUUID(),mode:'min',target:1,period:historyView,unit:'count',display:'bar'};
    newGoalDraft=goal;initialNewGoal=goal;
    const editor=buildGoalFields(owner,goal,next=>{
      newGoalDraft=next;$('#createGoalButton').disabled=!next;
      $('#newGoalError').hidden=Boolean(next);$('#newGoalError').textContent=next?'':'Vérifiez la cible de l’objectif.';
    },true);
    fields.append(editor);
  }
  function ownerById(id) {return state.activities.find(item=>item.id===id) || categories.find(item=>item.id===id);}
  function openGoalEditor(ownerId,goalId=null) {
    goalEditorOwner=ownerId;
    const owner=ownerById(ownerId);if(!owner)return;
    goalEdits.clear();
    $('#goalEditorTitle').textContent=goalId?'Modifier l’objectif':'Objectifs';
    $('#goalOwnerLabel').textContent=owner.name;
    const fields=$('#goalEditorFields');fields.replaceChildren();
    $('#addOwnerGoal').hidden=Boolean(goalId);
    const list=goalsOf(owner).filter(goal=>!goalId || goal.id===goalId);
    if(!list.length)appendEmpty(fields,'Ajoutez un objectif pour cette activité ou catégorie.');
    list.forEach(goal=>appendGoalDraft(owner,goal));
    refreshGoalEditor();
    $('#goalEditorDialog').showModal();
  }
  function buildGoalFields(owner,goal,onChange,compact=false) {
      const form=document.createElement('div');form.className='goal-fields-grid';
      function field(labelText,input){const label=document.createElement('label');label.textContent=labelText;label.append(input);form.append(label);return input;}
      function select(labelText,options,value){const group=document.createElement('fieldset');group.className='goal-option-group';group.setAttribute('aria-label',labelText+' · '+owner.name);const legend=document.createElement('legend');legend.textContent=labelText;group.append(legend);options.forEach(([v,text])=>{const label=document.createElement('label'),input=document.createElement('input'),span=document.createElement('span');input.type='radio';input.name=goal.id+'-'+labelText;input.value=v;input.checked=v===value;span.textContent=text;label.append(input,span);group.append(label);});Object.defineProperty(group,'value',{get:()=>group.querySelector('input:checked')?.value});form.append(group);return group;}
      function dropdown(label,options,value){
        const input=document.createElement('select');options.forEach(([key,name])=>appendOption(input,key,name));input.value=value;
        input.setAttribute('aria-label',label+' · '+owner.name);field(label,input);return input;
      }
      const choice=compact?dropdown:select;
      const mode=select('Type d’objectif',[['min','Au moins'],['max','Au maximum']],goal.mode);
      const target=document.createElement('input');target.type='number';target.required=true;target.max='1000000';target.value=goal.unit==='duration' && goal.scale==='hours'?goal.target/60:goal.target;target.setAttribute('aria-label','Quantité visée · '+owner.name);field('Cible',target);
      const unit=select('Unité',[['count','Fois'],['distance','km'],['minutes','min'],['hours','h']],goal.unit==='duration'?goal.scale==='hours'?'hours':'minutes':goal.unit || 'count');
      const period=choice('Fréquence',[['day','Par jour'],['week','Par semaine'],['month','Par mois'],['year','Par an']],goal.period);
      const display=select('Affichage',[['bar','Barre'],['ring','Cercle']],goal.display || 'bar');
      const threshold=document.createElement('div');threshold.className='goal-threshold-fields';threshold.append(target.closest('label'),unit);mode.after(threshold);
      const updateLimits=()=>{target.step=unit.value==='count'?'1':'any';target.min=mode.value==='max'?'0':unit.value==='count'?'1':'0.01';};updateLimits();
      const update=()=>{
        updateLimits();const next={...goal,mode:mode.value,period:period.value,display:display.value,unit:['minutes','hours'].includes(unit.value)?'duration':unit.value,scale:unit.value==='hours'?'hours':'minutes',target:Number(target.value)*(unit.value==='hours'?60:1)};
        if(!target.checkValidity() || !validGoal(next)){onChange(null);return;}
        onChange(next);
      };
      if(compact){
        const frequencyLabel=period.closest('label');
        frequencyLabel.className='goal-frequency-field';
        threshold.append(frequencyLabel);
        display.classList.add('goal-display-options');
        const label=target.closest('label'),box=document.createElement('div'),stepper=document.createElement('div');
        box.className='goal-target-field';
        target.id='newGoalTarget';label.htmlFor=target.id;
        stepper.className='daily-goal-stepper goal-target-stepper';
        function stepTarget(delta){
          const value=Number.isFinite(target.valueAsNumber)?target.valueAsNumber:Number(target.min);
          target.value=String(Math.min(Number(target.max),Math.max(Number(target.min),Math.round((value+delta)*1e8)/1e8)));
          update();
        }
        const minus=makeButton('−',()=>stepTarget(-1)),plus=makeButton('+',()=>stepTarget(1));
        minus.setAttribute('aria-label','Diminuer la cible');plus.setAttribute('aria-label','Augmenter la cible');
        label.before(box);box.append(label,stepper);stepper.append(minus,target,plus);
      }
      [mode,unit,target,period,display].forEach(input=>input.addEventListener('input',update));
    return form;
  }
  const goalEdits=new Map();
  function equivalentGoals(left,right) {
    return left.mode===right.mode && left.target===right.target && left.period===right.period &&
      left.display===right.display && left.unit===right.unit &&
      (left.unit!=='duration' || (left.scale || 'minutes')===(right.scale || 'minutes'));
  }
  function refreshGoalEditor() {
    const invalid=[...goalEdits.values()].some(edit=>edit?.invalid);
    $('#saveGoalEditor').disabled=!goalEdits.size || invalid;
    const error=$('#goalEditorError');
    error.hidden=!invalid;error.textContent=invalid?'Vérifiez la cible de l’objectif.':'';
  }
  function appendGoalDraft(owner,goal,isNew=false) {
    const fields=$('#goalEditorFields'),block=document.createElement('section');block.className='single-goal-form';
    const form=buildGoalFields(owner,goal,next=>{
      if(!next)goalEdits.set(goal.id,{invalid:true});
      else if(!isNew && equivalentGoals(goal,next))goalEdits.delete(goal.id);
      else goalEdits.set(goal.id,{value:next,isNew});
      refreshGoalEditor();
    });
    const remove=makeButton('Supprimer cet objectif',()=>{
      if(isNew){goalEdits.delete(goal.id);block.remove();}
      else{
        const previous=goalEdits.get(goal.id);
        goalEdits.set(goal.id,null);
        form.hidden=true;remove.hidden=true;form.querySelectorAll('input').forEach(input=>{input.disabled=true;});
        const restore=makeButton('Rétablir',()=>{
          if(previous===undefined)goalEdits.delete(goal.id);else goalEdits.set(goal.id,previous);
          form.hidden=false;remove.hidden=false;form.querySelectorAll('input').forEach(input=>{input.disabled=false;});notice.remove();refreshGoalEditor();
        });
        const notice=document.createElement('div');notice.className='goal-removal-note';notice.append('Suppression à enregistrer',restore);block.append(notice);
      }
      refreshGoalEditor();
    },'delete-goal');
    fields.querySelector('.empty-state')?.remove();
    block.append(form,remove);fields.append(block);
    if(isNew)goalEdits.set(goal.id,{value:goal,isNew});
  }
  $('#addOwnerGoal').addEventListener('click',()=>{
    const owner=ownerById(goalEditorOwner);if(!owner)return;
    appendGoalDraft(owner,{id:'goal-'+crypto.randomUUID(),mode:'min',target:1,period:'week',unit:'count',display:'bar'},true);
    refreshGoalEditor();
  });
  $('#goalEditorForm').addEventListener('submit',event=>{
    event.preventDefault();
    const owner=ownerById(goalEditorOwner);
    if(!owner || !goalEdits.size || $('#saveGoalEditor').disabled)return;
    const goals=goalsOf(owner).flatMap(goal=>{
      if(!goalEdits.has(goal.id))return [goal];
      const edit=goalEdits.get(goal.id);
      return edit?[edit.value]:[];
    });
    goalEdits.forEach(edit=>{if(edit?.isNew)goals.push(edit.value);});
    persistItem(owner,{goals});
    $('#goalEditorDialog').close();
  });
  let goalDiscardSource;
  function requestGoalDialogClose(dialog,dirty) {
    if(!dirty){dialog.close();return;}
    const confirm=$('#discardGoalDialog');
    if(!confirm.open){goalDiscardSource=dialog;confirm.showModal();}
  }
  function requestGoalEditorClose() {requestGoalDialogClose($('#goalEditorDialog'),goalEdits.size>0);}
  $('#goalEditorDialog').addEventListener('close',()=>goalEdits.clear());
  $('#goalEditorDialog').addEventListener('cancel',event=>{event.preventDefault();requestGoalEditorClose();});
  ['#closeGoalEditor','#cancelGoalEditor'].forEach(id=>$(id).addEventListener('click',requestGoalEditorClose));
  $('#keepGoalEditing').addEventListener('click',()=>$('#discardGoalDialog').close());
  $('#discardGoalEdits').addEventListener('click',()=>{const source=goalDiscardSource;$('#discardGoalDialog').close();source?.close();});

  function renderGoalFilters() {
    if(goalCategoryFilter && !categories.some(c=>c.id===goalCategoryFilter))goalCategoryFilter=null;
    const choices=$('#goalCategoryChoices');choices.replaceChildren();
    for(const item of [{id:null,name:'Toutes'},...categories]){const button=makeButton(item.id?categoryLabel(item):item.name,()=>{goalCategoryFilter=item.id;goalActivityFilter=null;renderGoals();persist();});button.setAttribute('aria-pressed',String(goalCategoryFilter===item.id));choices.append(button);}
    const activityChoices=$('#goalActivityChoices');activityChoices.replaceChildren();const activities=goalCategoryFilter?state.activities.filter(activity=>activity.categoryId===goalCategoryFilter):[];
    if(!goalCategoryFilter)goalActivityFilter=null;
    if(goalActivityFilter!==null)goalActivityFilter=goalActivityFilter.filter(id=>activities.some(a=>a.id===id));
    const all=makeButton('Toutes',()=>{goalActivityFilter=null;renderGoals();persist();});all.setAttribute('aria-pressed',String(goalActivityFilter===null));activityChoices.append(all);
    activities.forEach(activity=>{const selected=goalActivityFilter===null||goalActivityFilter.includes(activity.id);const button=makeButton(activity.name,()=>{const previous=goalActivityFilter===null?activities.map(a=>a.id):goalActivityFilter;goalActivityFilter=selected?previous.filter(id=>id!==activity.id):[...previous,activity.id];renderGoals();persist();});button.setAttribute('aria-pressed',String(selected));activityChoices.append(button);});
    const statusNames={pending:'À accomplir',success:'Respectés',warning:'À la limite',danger:'Dépassés'};
    const category=categories.find(item=>item.id===goalCategoryFilter);
    $('#goalFilterSummary').textContent=[category?.name || 'Toutes les catégories',activityFilterSummary(goalActivityFilter,activities),statusNames[goalStatusFilter]].filter(Boolean).join(' · ');
    const states=$('#goalStatusChoices');states.replaceChildren();
    [['all','Tous'],['pending','À accomplir'],['success','Atteints / dans la limite'],['warning','À la limite'],['danger','Dépassés']].forEach(([value,label])=>{const button=makeButton(label,()=>{goalStatusFilter=value;renderGoals();persist();});button.setAttribute('aria-pressed',String(goalStatusFilter===value));states.append(button);});
  }
  const GEAR='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m9 3-1 3-3 1-2 3 2 2-1 3 2 3 3-1 2 2h3l1-3 3-1 2-3-2-2 1-3-2-3-3 1-2-2Z"/><circle cx="12" cy="12" r="3"/></svg>';
  function gearButton(button,text){button.classList.add('settings-button');button.replaceChildren();const icon=document.createElement('span');icon.innerHTML=GEAR;const label=document.createElement('span');label.textContent=text;button.append(icon,label);}
  $('#openTrackingSettings').innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m10 3-.6 2.6a7 7 0 0 0-1.8 1L5 5.9 3 9.3l1.9 1.9a7 7 0 0 0 0 1.6L3 14.7 5 18.1l2.6-.7a7 7 0 0 0 1.8 1L10 21h4l.6-2.6a7 7 0 0 0 1.8-1l2.6.7 2-3.4-1.9-1.9a7 7 0 0 0 0-1.6L21 9.3l-2-3.4-2.6.7a7 7 0 0 0-1.8-1L14 3z"/><circle cx="12" cy="12" r="3"/></svg>';

  let emojiOwner=null,emojiOwnerButton=null,emojiCategory='all',emojiLimit=144,emojiDataPromise=null;
  const EMOJI_GROUPS=[['all','Tous'],['0','😀 Visages'],['1','👋 Personnes'],['2','🧩 Composants'],['3','🌿 Nature'],['4','🍋 Aliments'],['5','🚲 Voyage'],['6','⚽ Activités'],['7','💡 Objets'],['8','💟 Symboles'],['9','🏳️ Drapeaux']];
  const QUICK_EMOJIS=['🏃','🚴','🏊','🏋️','🥾','⚽','🎯','✅','💼','🛵','📚','🧠','💡','💻','📝','🎨','🎵','🎮','🍳','🥗','☕','💧','🌱','🌍','🏠','🧹','🛌','☀️','🌙','❤️','👥','📞','🐾','💰','📦','✈️'];
  let emojiCatalog=QUICK_EMOJIS.map(emoji=>({emoji,label:emoji,group:'all',search:emoji,tone:0}));
  function normalizedSearch(value){return value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
  function loadEmojiData() {
    if(emojiDataPromise)return emojiDataPromise;
    if(typeof window.fetch!=='function')return Promise.resolve(emojiCatalog);
    emojiDataPromise=fetch('./emoji-data.json').then(response=>{if(!response.ok)throw Error('Emoji data unavailable');return response.json();}).then(data=>{
      emojiCatalog=data.emojis.flatMap(([emoji,label,group,tags,skins])=>[{emoji,label,group:String(group),search:normalizedSearch(label+' '+tags+' '+emoji),tone:0},...skins.map(([variant,tone])=>({emoji:variant,label:label+' · variante '+String(tone),group:String(group),search:normalizedSearch(label+' '+tags+' '+variant),tone:Array.isArray(tone)?tone[0]:tone}))]);
      return emojiCatalog;
    }).catch(error=>{emojiDataPromise=null;throw error;});return emojiDataPromise;
  }
  function openEmojiKeyboard(category,button) {
    emojiOwner=category;emojiOwnerButton=button;emojiCategory='all';emojiLimit=144;$('#emojiSearch').value='';$('#emojiTone').value='0';$('#customEmoji').value='';$('#emojiDialogTitle').textContent='Emoji · '+category.name;
    renderEmojiGroups();renderEmojiCatalog();$('#emojiDialog').showModal();
    $('#emojiCatalogStatus').textContent='Chargement du catalogue…';
    loadEmojiData().then(()=>{if($('#emojiDialog').open)renderEmojiCatalog();}).catch(()=>{$('#emojiCatalogStatus').textContent='Catalogue indisponible. Vous pouvez coller un emoji ou rouvrir le clavier pour réessayer.';});
  }
  function renderEmojiGroups(){const root=$('#emojiGroups');root.replaceChildren();EMOJI_GROUPS.forEach(([value,label])=>{const button=makeButton(label,()=>{emojiCategory=value;emojiLimit=144;renderEmojiGroups();renderEmojiCatalog();});button.setAttribute('aria-pressed',String(value===emojiCategory));root.append(button);});}
  function chooseCategoryEmoji(value){if(!emojiOwner)return;emojiOwner.emoji=value;emojiOwnerButton.textContent=value || '＋';persistItem(emojiOwner,{emoji:value});$('#emojiDialog').close();}
  function renderEmojiCatalog() {
    const query=normalizedSearch($('#emojiSearch').value.trim()),tone=$('#emojiTone').value;
    const matches=emojiCatalog.filter(entry=>(emojiCategory==='all' || entry.group===emojiCategory) && (tone==='all' || entry.tone===0 || String(entry.tone)===tone) && (!query || query.split(/\s+/).every(word=>entry.search.includes(word))));
    const root=$('#emojiCatalog');root.replaceChildren();matches.slice(0,emojiLimit).forEach(entry=>{const button=makeButton(entry.emoji,()=>chooseCategoryEmoji(entry.emoji));button.title=entry.label;button.setAttribute('aria-label','Choisir '+entry.emoji+' pour '+(emojiOwner?.name || 'la catégorie'));root.append(button);});
    if(!matches.length)appendEmpty(root,'Aucun emoji ne correspond à cette recherche.');$('#moreEmojis').hidden=matches.length<=emojiLimit;$('#emojiCatalogStatus').textContent=matches.length+' emojis · '+Math.min(matches.length,emojiLimit)+' affichés';
  }
  $('#emojiSearch').addEventListener('input',()=>{emojiLimit=144;renderEmojiCatalog();});$('#emojiTone').addEventListener('change',()=>{emojiLimit=144;renderEmojiCatalog();});$('#moreEmojis').addEventListener('click',()=>{emojiLimit+=144;renderEmojiCatalog();});
  $('#customEmoji').addEventListener('input',()=>{const value=$('#customEmoji').value.trim();if([...new Intl.Segmenter('fr',{granularity:'grapheme'}).segment(value)].length===1 && /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(value))chooseCategoryEmoji(value);});
  $('#clearCategoryEmoji').addEventListener('click',()=>chooseCategoryEmoji(''));$('#closeEmojiDialog').addEventListener('click',()=>$('#emojiDialog').close());

  document.querySelectorAll('#app dialog').forEach(dialog=>{
    let outside=false;
    const isOutside=event=>{const rect=dialog.getBoundingClientRect();return event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom;};
    dialog.addEventListener('pointerdown',event=>{outside=event.target===dialog&&isOutside(event);});
    dialog.addEventListener('click',event=>{if(outside&&event.target===dialog&&isOutside(event)){if(dialog.id==='goalEditorDialog')requestGoalEditorClose();else if(dialog.id==='newGoalDialog')requestNewGoalClose();else if(dialog.classList.contains('filter-drawer'))closeFilterDrawer(dialog);else{document.activeElement?.blur();persist();if(dialog.open)dialog.close();}}outside=false;});
    if(!['goalEditorDialog','newGoalDialog'].includes(dialog.id) && !dialog.classList.contains('filter-drawer'))dialog.addEventListener('cancel',event=>{event.preventDefault();document.activeElement?.blur();if(dialog.id!=='discardGoalDialog')persist();if(dialog.open)dialog.close();});
    dialog.addEventListener('close',persist);
  });
  window.calendarApp.start=()=>{agendaDate=localDateKey(new Date());setPage('day');};




