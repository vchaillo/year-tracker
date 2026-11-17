

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
    entries: {}, details: {}, theme: 'system', accent:null, avatar:{useGoogle:true,initial:'first'}, goalColors:{}, goalOrder:[]
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
      state.goalColors=normalizeGoalColors(saved.goalColors);
      state.avatar=normalizeAvatar(saved.avatar);renderAccountAvatar();
      applyTheme();applyGoalColors();
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
      state.activeCategory = saved.activeCategory === 'overview' || categories.some(category => category.id === saved.activeCategory) ? saved.activeCategory : 'overview';
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

  function exportState(forStorage=false) {
    if(state.activeCategory && state.activeCategory!=='overview')state.selections[state.activeCategory] = [...state.selectedActivities];
    const storeFilters=!forStorage || viewMemory.reload.activities.filters;
    return JSON.parse(JSON.stringify({schemaVersion: 9, paletteVersion: 3, year:forStorage && !viewMemory.reload.activities.date?new Date().getFullYear():state.year, categories,
      activities: state.activities, entries: state.entries, details:state.details, theme:state.theme, accent:state.accent, avatar:state.avatar, goalColors:state.goalColors, goalOrder:state.goalOrder,
      activeCategory: storeFilters?state.activeCategory:'overview', selections: storeFilters?state.selections:{},
      selectedActivities: storeFilters?state.selectedActivities:state.activities.map(item=>item.id), interface: exportInterface(forStorage)}));
  }

  function persist() {
    if (window.calendarCloud) window.calendarCloud.save(exportState(true));
  }

  window.calendarApp = {
    defaults: () => ({schemaVersion: 9, paletteVersion: 3, year:currentYear,
      categories: [], activities: [], entries: {}, details:{}, theme:'system', accent:null, avatar:{useGoogle:true,initial:'first'}, goalColors:{}, goalOrder:[], activeCategory:'overview',
      selections:{}, selectedActivities:[], interface:{}}),
    load(data,{live=false}={}) {
      const position={left:window.scrollX,top:window.scrollY};
      if(live)data=withCurrentViews(data);
      else visitedWorkspacePages.clear();
      loadSavedState(JSON.parse(JSON.stringify(data)));
      render();
      if(dayDraft)dayDraft.refresh.forEach(refresh=>refresh());
      if(onboardingDialog.open)renderOnboarding();
      window.scrollTo({...position,behavior:'instant'});
    },
    export: ()=>exportState(),
    exportForStorage: ()=>exportState(true)
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

  function activityCategoryId(){
    return currentPage==='calendar'?calendarState.categoryId:state.activeCategory==='overview'?null:state.activeCategory;
  }
  function calendarFilterActivities() {
    const categoryId=activityCategoryId();
    return state.activities.filter(activity=>!categoryId || activity.categoryId===categoryId);
  }
  function setVisibleActivityIds(ids){
    if(currentPage==='calendar'){
      const activities=calendarFilterActivities();
      calendarState.activityIds=allActivitiesSelected(ids,activities)?null:ids;
    }else{
      filtersUseDefaults.activities=false;
      state.selectedActivities=ids;
    }
  }
  function filterChip(text,selected,action){
    const button=makeButton(text,action);button.setAttribute('aria-pressed',String(selected));return button;
  }
  function updateFilterResultCount(id,count) {
    $('#'+id).textContent=count+' résultat'+(count>1?'s':'');
  }
  function renderToolbar() {
    const categoryBar=$('#categoryBar'),toolbar=$('#toolbar');
    categoryBar.replaceChildren();toolbar.replaceChildren();
    for(const category of [{id:'overview',name:'Toutes'},...categories]){
      const button=filterChip(categoryLabel(category),(activityCategoryId() || 'overview')===category.id,()=>selectCategory(category.id));
      button.dataset.categoryDrop=category.id;categoryBar.append(button);
    }
    const categoryId=activityCategoryId(),activities=calendarFilterActivities(),overview=!categoryId;
    if(overview && currentPage!=='calendar')state.selectedActivities=activities.map(activity=>activity.id);
    const visible=visibleActivityIds();
    const allSelected=overview || allActivitiesSelected([...visible],activities);
    const [start,end]=periodBounds(activityReference(),activityPeriod());
    const resultCount=Object.entries(state.entries).reduce((count,[date,ids])=>
      date>=start && date<=end?count+ids.filter(id=>visible.has(id)).length:count,0);
    updateFilterResultCount('calendarFilterResults',resultCount);
    renderFilterButtonState('calendar',[categoryId,!allSelected]);
    const all=filterChip('Toutes',allSelected,()=>{
      if(overview || !activities.length)return;
      setVisibleActivityIds(allSelected?[]:activities.map(activity=>activity.id));
      rerenderActivityFilter(toolbar,'all',render);
    });
    all.dataset.activityFilter='all';toolbar.append(all);
    if(!overview)activities.forEach(activity=>{
      const selected=visible.has(activity.id);
      const button=filterChip(activity.name,selected,()=>{
        if(selected)visible.delete(activity.id);else visible.add(activity.id);
        setVisibleActivityIds([...visible]);
        rerenderActivityFilter(toolbar,activity.id,render);
      });
      button.dataset.activityFilter=activity.id;
      button.classList.add('activity-choice');toolbar.append(button);
    });
  }

  function annualMonth(monthName){
    const monthElement=document.createElement('article');monthElement.className='month calendar-year-month';
    const title=document.createElement('h2');title.className='month-title';title.textContent=monthName;
    const weekdays=document.createElement('div');weekdays.className='weekdays';
    WEEKDAYS.forEach(day=>{const label=document.createElement('span');label.className='weekday';label.textContent=day;weekdays.append(label);});
    const days=document.createElement('div');days.className='days';
    monthElement.append(title,weekdays,days);return {monthElement,days};
  }
  function renderYearCalendar(year) {
    const calendar = $('#calendar');
    calendar.innerHTML = '';

    const today = new Date(), selected=visibleActivityIds();

    MONTHS.forEach((monthName, month) => {
      const {monthElement,days}=annualMonth(monthName);

      const offset = getMondayFirstDay(year, month);
      const count = daysInMonth(year, month);

      for (let i = 0; i < offset; i++) {
        const empty = document.createElement('div');
        empty.className = 'day empty';
        days.appendChild(empty);
      }

      for (let dayNumber = 1; dayNumber <= count; dayNumber++) {
        const key = dateKey(year, month, dayNumber);
        const entryIds = state.entries[key] || [];

        const visibleIds = entryIds.filter(id => selected.has(id));

        const day = document.createElement('button');
        day.className = 'day';
        day.textContent = dayNumber;
        day.setAttribute(
          'aria-label',
          `${dayNumber} ${monthName} ${year}`
        );

        if (
          today.getFullYear() === year &&
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

        if (visibleIds.length) day.dataset.previewDate=key;
        if (visibleIds.some(id=>state.details[key]?.[id]?.note || state.details[key]?.[id]?.distance != null || (state.details[key]?.[id]?.count || 1)>1)) day.classList.add('has-note');
        day.addEventListener('click', event => toggleEntry(key, event.shiftKey));
        day.addEventListener('contextmenu', event => {event.preventDefault(); toggleEntry(key,true);});
        days.appendChild(day);
      }

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
    if (!forceDetails && !onlyIds) {
      const selected=[...visibleActivityIds()];
      if(selected.length===1){toggleSingleEntry(key,selected[0]);return;}
    }
    const activities = onlyIds?state.activities.filter(activity=>onlyIds.includes(activity.id)):calendarFilterActivities();
    if (!activities.length) return;
    clearInvalid('#dayPicker');
    dayDraft = {key,refresh:[],patches:new Map()};
    const single=Boolean(onlyIds && activities.length===1);
    $('#dayPickerTitle').textContent=single?'Modifier l’activité':formatDate(key);
    const choices=$('#dayPickerChoices');choices.replaceChildren();choices.classList.toggle('single-activity-edit',single);
    if(single){
      const date=makeElement('time',null,formatDate(key));date.dateTime=key;
      const dateRow=makeElement('div','daily-entry-date');
      dateRow.append(makeElement('span',null,'Date de l’activité'),date);
      choices.append(dateRow);
    }
    let previousCategory=null;
    activities.forEach(activity=>{
      if(!single && activity.categoryId!==previousCategory){const heading=document.createElement('h3');heading.className='session-category-heading';heading.textContent=categoryLabel(categories.find(c=>c.id===activity.categoryId));choices.append(heading);previousCategory=activity.categoryId;}
      const id=activity.id, detail=state.details[key]?.[id] || {};
      let quantity=(state.entries[key] || []).includes(id)?detail.count || 1:0;
      let removal;
      const row=document.createElement('div');row.className='session-editor';
      const top=document.createElement('div');top.className='session-top activity-measures';
      const toggle=document.createElement('button');toggle.type='button';toggle.className='day-picker-choice';
      const dot=document.createElement('span');dot.className='activity-dot';dot.style.background=activity.color;
      const name=document.createElement('span');name.textContent=activity.name;
      const check=document.createElement('span');check.className='session-check';toggle.append(dot,name,check);toggle.setAttribute('aria-label',activity.name+' · sélectionner pour '+formatDate(key));
      const countLabel=document.createElement('label');countLabel.className='count-label';countLabel.textContent='Occurrences';
      const count=document.createElement('input');count.type='number';count.min='0';count.max='1000';count.step='1';count.required=true;count.value=quantity;count.setAttribute('aria-label','Nombre de séances · '+activity.name);countLabel.append(count);
      const distanceLabel=document.createElement('label');distanceLabel.className='distance-label';distanceLabel.textContent='Distance (km)';
      const distance=document.createElement('input');distance.type='number';distance.min='0';distance.max='100000';distance.step='any';distance.placeholder='—';distance.value=detail.distance ?? '';distance.setAttribute('aria-label','Distance en kilomètres · '+activity.name);distanceLabel.append(distance);
      const fields=document.createElement('label');fields.className='activity-edit-note';fields.textContent='Note';
      const note=document.createElement('textarea');note.maxLength=2000;note.rows=3;note.placeholder='Votre séance, une tâche accomplie…';note.value=detail.note || '';note.setAttribute('aria-label','Note · '+activity.name);fields.append(note);
      const read=()=>{
        const current=state.details[key]?.[id] || {};
        const included=(state.entries[key] || []).includes(id);
        return {...current,count:included?current.count || 1:0,...dayDraft.patches.get(id)};
      };
      const update=()=>{const value=read();quantity=value.count;count.value=quantity;toggle.setAttribute('aria-pressed',String(quantity>0));check.textContent=quantity>0?'✓':'+';row.classList.toggle('session-included',quantity>0);distance.value=value.distance ?? '';note.value=value.note || '';duration.value=value.durationMinutes ?? '';if(removal)removal.hidden=quantity!==0;};
      const stage=patch=>{
        const next={...dayDraft.patches.get(id),...patch};
        if(!('count' in patch) && !read().count && (patch.note?.trim() || patch.distance>0 || patch.durationMinutes>0))next.count=1;
        if(patch.count===0)Object.assign(next,{distance:null,durationMinutes:null,note:''});
        dayDraft.patches.set(id,next);
        update();clearInvalid('#dayPicker');
      };
      toggle.addEventListener('click',()=>stage({count:read().count?0:1}));
      count.addEventListener('input',()=>{if(!count.checkValidity()){markInvalid('#dayPicker','Nombre entier positif ou zéro requis');return;}stage({count:Number(count.value)});});
      distance.addEventListener('input',()=>{if(!distance.checkValidity()){markInvalid('#dayPicker','Distance positive requise');return;}stage({distance:distance.value===''?null:Number(distance.value)});});
      note.addEventListener('input',()=>stage({note:note.value}));
      const durationLabel=document.createElement('label');durationLabel.className='duration-label';durationLabel.textContent='Durée (min)';const duration=document.createElement('input');duration.type='number';duration.min='0';duration.max='1000000';duration.step='any';duration.value=detail.durationMinutes ?? '';duration.placeholder='—';duration.setAttribute('aria-label','Durée en minutes · '+activity.name);durationLabel.append(duration);duration.addEventListener('input',()=>{if(!duration.checkValidity()){markInvalid('#dayPicker','Durée positive requise');return;}stage({durationMinutes:duration.value===''?null:Number(duration.value)});});
      if(single){
        const header=document.createElement('div');header.className='activity-edit-identity';
        const title=document.createElement('h3');title.append(dot,name);
        const category=categories.find(item=>item.id===activity.categoryId);
        const meta=document.createElement('p');meta.className='muted';
        meta.textContent=category?categoryLabel(category):'';
        header.append(title,meta);choices.append(header);
      }else top.append(toggle);
      top.append(countLabel,durationLabel,distanceLabel);
      [count,distance,duration].forEach(input=>withNumberStepper(input));
      row.append(top,fields);
      if(single){
        removal=document.createElement('p');removal.className='activity-edit-removal muted';removal.textContent='Cette activité sera retirée de la journée si tu enregistres avec zéro occurrence.';
        row.append(removal);
      }
      choices.append(row);
      dayDraft.refresh.push(()=>{if(!dayDraft.patches.has(id) && count.validity.valid && distance.validity.valid && duration.validity.valid)update();});update();
    });
    clearInvalid('#dayPicker');refreshSaveIndicators();$('#dayPicker').showModal();
  }
  $('#dayPicker').addEventListener('close',()=>{dayDraft=null;});
  function closeDayEditor(){
    const invalid=$('#dayPicker [data-save-status]').dataset.invalid;
    requestGoalDialogClose($('#dayPicker'),Boolean(dayDraft?.patches.size || invalid));
  }
  ['#closeDayPicker','#cancelDayPicker'].forEach(id=>$(id).addEventListener('click',closeDayEditor));
  $('#saveDayPicker').addEventListener('click',()=>{
    if(!dayDraft)return;
    const invalid=[...$('#dayPickerChoices').querySelectorAll('input')].find(input=>!input.checkValidity());
    if(invalid){invalid.reportValidity();return;}
    const {key,patches}=dayDraft;
    patches.forEach((patch,id)=>updateSession(key,id,patch,false));
    $('#dayPicker').close();
    if(patches.size){render();refreshSaveIndicators();}
  });

  function render() {
    const position={left:window.scrollX,top:window.scrollY};
    const shell=$('.shell'),minHeight=shell.style.minHeight;
    shell.style.minHeight=shell.getBoundingClientRect().height+'px';

    Object.assign(calendarState,normalizeCalendarFilters(calendarState));
    renderToolbar();
    renderCalendar();
    if(currentPage==='statistics')renderStatistics();
    renderGoals();
    renderJournal();
    renderWorkspace();
    persist();
    shell.style.minHeight=minHeight;
    window.scrollTo({...position,behavior:'instant'});
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

  function addReorderHandle(row,item,container,commit,rerender,{handleMount=row,sourceCategory=null}={}) {
    row.dataset.reorderId = item.id;
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'reorder-handle';
    handle.setAttribute('aria-label', `Réorganiser ${item.name}. Flèches haut et bas pour déplacer.`);
    handle.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><circle cx="8" cy="5" r="1.5"/><circle cx="16" cy="5" r="1.5"/><circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/><circle cx="8" cy="19" r="1.5"/><circle cx="16" cy="19" r="1.5"/></svg>';
    handleMount.append(handle);
    let drag = null;
    const orderedIds = () => [...container.children].map(element => element.dataset.reorderId);
    const focusRoot=container.closest('.manager-list') || container;
    function restoreHandleFocus(){
      [...focusRoot.querySelectorAll('[data-reorder-id]')].find(element=>element.dataset.reorderId===item.id)
        ?.querySelector('.reorder-handle')?.focus({preventScroll:true});
    }
    const finish = (save) => {
      container.removeEventListener('pointermove', move);
      container.removeEventListener('pointerup', release);
      container.removeEventListener('pointercancel', cancel);
      container.removeEventListener('lostpointercapture', cancel);
      if (!drag) return;
      const {moved,lift,targetCategory}=drag;
      targetCategory?.classList.remove('catalog-drop-target');
      if(lift){
        if(targetCategory && save)lift.ghost.remove();
        else settleLift(lift,handleMount);
      }
      drag=null;
      handleMount.classList.remove('is-dragging');
      row.classList.remove('is-dragging');
      container.classList.remove('is-sorting');
      if(moved){
        if(!save)rerender();
        else if(targetCategory){
          if(!moveCatalogActivity(item.id,targetCategory.dataset.catalogCategory))rerender();
        }else commit(orderedIds());
      }
      restoreHandleFocus();
    };
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      handle.focus({preventScroll:true});
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
      if (!drag.lift) drag.lift = liftItem(handleMount, drag.x, drag.y);
      moveLift(drag.lift,event.clientX,event.clientY);
      drag.moved = true;
      row.classList.add('is-dragging');
      container.classList.add('is-sorting');
      if(sourceCategory){
        const group=document.elementFromPoint?.(event.clientX,event.clientY)?.closest('[data-catalog-category]');
        const targetCategory=group?.dataset.catalogCategory!==sourceCategory?group:null;
        if(drag.targetCategory!==targetCategory){
          drag.targetCategory?.classList.remove('catalog-drop-target');
          targetCategory?.classList.add('catalog-drop-target');
          drag.targetCategory=targetCategory;
        }
        if(targetCategory)return;
      }
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
      commit(ids);
      restoreHandleFocus();
    });
  }

  let newCategoryEmoji='🗂️',trackingCatalogSnapshot='';
  const newCategoryDialog=$('#newCategoryDialog'),newCategoryForm=$('#categoryNewForm'),newCategoryName=$('#newCategoryName');
  const openCatalogCategories=new Set(),newActivityInputs=new Map();
  const catalogActionDialog=$('#catalogActionDialog'),catalogDestination=$('#catalogDestination');
  let catalogAction=null;
  const catalogIcons={
    delete:'M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6',
    move:'M4 7h15m-4-4 4 4-4 4m5 6H5m4-4-4 4 4 4',
    chevron:'m9 6 6 6-6 6'
  };

  function catalogIcon(name){
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+catalogIcons[name]+'"/></svg>';
  }
  function catalogActionButton(icon,label,action){
    const button=makeButton('',action,'catalog-icon-action');
    button.innerHTML=catalogIcon(icon);
    if(icon==='delete')button.classList.add('catalog-delete');
    button.setAttribute('aria-label',label);button.title=label;
    return button;
  }
  function openCatalogAction(title,description,buttonLabel,destinations,action){
    $('#catalogActionTitle').textContent=title;
    $('#catalogActionDescription').textContent=description;
    $('#catalogActionError').hidden=true;
    const button=$('#confirmCatalogAction'),destructive=buttonLabel!=='Déplacer';
    button.textContent=buttonLabel;
    button.classList.toggle('goal-delete-button',destructive);
    button.classList.toggle('primary-action',!destructive);
    button.classList.toggle('workspace-primary',!destructive);
    $('#catalogDestinationField').hidden=!destinations.length;
    catalogDestination.required=Boolean(destinations.length);
    catalogDestination.replaceChildren();
    if(destinations.length){
      appendOption(catalogDestination,'','Choisir une catégorie');
      destinations.forEach(category=>appendOption(catalogDestination,category.id,categoryLabel(category)));
    }
    catalogAction=action;
    catalogActionDialog.showModal();
    (destinations.length?catalogDestination:$('#cancelCatalogAction')).focus();
  }
  ['#closeCatalogAction','#cancelCatalogAction'].forEach(id=>$(id).addEventListener('click',()=>catalogActionDialog.close()));
  catalogActionDialog.addEventListener('close',()=>{catalogAction=null;});
  $('#catalogActionForm').addEventListener('submit',event=>{
    event.preventDefault();
    if(!catalogAction || !catalogDestination.reportValidity())return;
    if(catalogAction(catalogDestination.value)){
      catalogActionDialog.close();
      return;
    }
    const error=$('#catalogActionError');
    error.textContent='Les catégories ou les activités ont changé. Ferme cette fenêtre et réessaie.';
    error.hidden=false;
  });
  function commitCatalog(message){
    reconcileCategories();
    $('#trackingStatus').textContent=message;
    render();
    refreshSaveIndicators();
  }
  function moveCatalogActivities(activities,destination){
    const targetIds=state.activities.filter(item=>item.categoryId===destination).map(item=>item.id);
    const selected=state.selections[destination] ?? targetIds;
    activities.forEach(item=>{item.categoryId=destination;});
    state.selections[destination]=[...new Set([...selected,...activities.map(item=>item.id)])];
    openCatalogCategories.add(destination);
  }
  function moveCatalogActivity(id,destination){
    const activity=activityById(id),category=categories.find(item=>item.id===destination);
    if(!activity || !category || activity.categoryId===category.id)return false;
    moveCatalogActivities([activity],destination);
    commitCatalog('« '+activity.name+' » déplacée vers '+category.name+'.');
    return true;
  }
  function askToMoveActivity(activity){
    openCatalogAction('Déplacer l’activité','Choisis la catégorie de destination pour « '+activity.name+' ».','Déplacer',
      categories.filter(category=>category.id!==activity.categoryId),
      destination=>moveCatalogActivity(activity.id,destination));
  }
  function askToDeleteActivity(activity){
    const days=Object.values(state.entries).filter(ids=>ids.includes(activity.id)).length;
    const description='Supprimer « '+activity.name+' »'+(days?' et ses '+days+' jours enregistrés':'')+' ?';
    openCatalogAction('Supprimer l’activité',description,'Supprimer',[],()=>{
      if(!activityById(activity.id))return false;
      removeActivity(activity.id,false);
      commitCatalog('Activité supprimée.');
      return true;
    });
  }
  function askToDeleteCategory(category){
    const count=state.activities.filter(item=>item.categoryId===category.id).length;
    const destinations=count?categories.filter(item=>item.id!==category.id):[];
    const description=count?'Choisis où déplacer les activités de « '+category.name+' ». Leurs jours enregistrés seront conservés.':
      'Supprimer la catégorie « '+category.name+' » ?';
    openCatalogAction('Supprimer la catégorie',description,count?'Déplacer et supprimer':'Supprimer',destinations,destination=>{
      if(categories.length<2 || !categories.some(item=>item.id===category.id))return false;
      const activities=state.activities.filter(item=>item.categoryId===category.id);
      if(activities.length && !categories.some(item=>item.id===destination && item.id!==category.id))return false;
      if(activities.length)moveCatalogActivities(activities,destination);
      categories=categories.filter(item=>item.id!==category.id);
      openCatalogCategories.delete(category.id);newActivityInputs.delete(category.id);
      commitCatalog('Catégorie supprimée.');
      return true;
    });
  }
  function catalogNameField(item){
    const input=makeElement('input','catalog-name');
    input.value=item.name;input.required=true;input.maxLength=24;
    input.setAttribute('aria-label','Nom de '+item.name);
    input.addEventListener('change',()=>{
      const owner=ownerById(item.id),name=input.value.trim();
      if(!owner)return;
      const duplicate=categories.some(category=>category.id===owner.id) && categories.some(category=>
        category.id!==owner.id && category.name.toLocaleLowerCase()===name.toLocaleLowerCase());
      if(!name || duplicate){
        input.value=owner.name;
        $('#trackingStatus').textContent=duplicate?'Ce nom de catégorie existe déjà.':'Le nom doit être renseigné.';
        return;
      }
      input.value=name;
      if(name!==owner.name)persistItem(owner,{name});
    });
    input.addEventListener('keydown',event=>{
      if(event.key==='Enter'){event.preventDefault();input.blur();}
    });
    return input;
  }
  function catalogColorField(value,label){
    const input=makeElement('input');
    input.type='color';input.value=value;input.setAttribute('aria-label',label);input.title=label;
    return input;
  }
  function createCatalogActivityRow(activity,rows){
    const row=makeElement('div','catalog-activity-row');
    const color=catalogColorField(activity.color,'Couleur de '+activity.name);
    color.addEventListener('change',()=>{
      const owner=activityById(activity.id);
      if(owner && owner.color!==color.value)persistItem(owner,{color:color.value});
    });
    const move=catalogActionButton('move','Déplacer '+activity.name,()=>askToMoveActivity(activity));
    move.disabled=categories.length<2;
    const remove=catalogActionButton('delete','Supprimer '+activity.name,()=>askToDeleteActivity(activity));
    row.append(color,catalogNameField(activity),createGoalEditor(activity),move,remove);
    rows.append(row);
    addReorderHandle(row,activity,rows,ids=>{
      state.activities=reorderSubset(state.activities,ids);
      commitCatalog('Ordre des activités enregistré.');
    },()=>renderTrackingCatalog(true),{sourceCategory:activity.categoryId});
  }
  const defaultCatalogActivityColor='#808a96';
  function addCatalogActivity(categoryId,name,color=defaultCatalogActivityColor){
    const activity={id:'activity-'+crypto.randomUUID(),name,color,categoryId};
    state.activities.push(activity);
    state.selections[categoryId]=[...new Set([...(state.selections[categoryId] ?? []),activity.id])];
  }
  function categoryNameError(name){
    if(!name)return 'Saisis un nom de catégorie.';
    return categories.some(category=>category.name.toLocaleLowerCase()===name.toLocaleLowerCase())?'Ce nom existe déjà.':'';
  }
  function addCatalogCategory(name,emoji){
    const category={id:'category-'+crypto.randomUUID(),name,...(emoji?{emoji}:{})};
    categories.push(category);openCatalogCategories.add(category.id);
    return category;
  }
  function createCatalogActivityForm(category){
    const form=makeElement('form','catalog-activity-form');
    form.dataset.createActivity=category.id;
    const draft=newActivityInputs.get(category.id);
    const name=makeElement('input','catalog-name');
    name.value=draft?.name || '';name.placeholder='Nouvelle activité';name.required=true;name.maxLength=24;
    name.setAttribute('aria-label','Nouvelle activité dans '+category.name);
    const color=catalogColorField(draft?.color || defaultCatalogActivityColor,'Couleur de la nouvelle activité dans '+category.name);
    const remember=()=>newActivityInputs.set(category.id,{name:name.value,color:color.value});
    name.addEventListener('input',remember);color.addEventListener('input',remember);
    const submit=makeElement('button','workspace-primary primary-action');submit.type='submit';
    submit.innerHTML=$('#openNewCategory svg').outerHTML;
    submit.append(makeElement('span',null,'Créer une activité'));
    form.append(color,name,submit);
    form.addEventListener('submit',event=>{
      event.preventDefault();
      const title=name.value.trim();
      if(!title || !categories.some(item=>item.id===category.id)){name.focus();return;}
      addCatalogActivity(category.id,title,color.value);
      newActivityInputs.delete(category.id);
      commitCatalog('Activité ajoutée.');
      [...$('#categoryEditorRows').querySelectorAll('[data-create-activity]')].find(node=>node.dataset.createActivity===category.id)
        ?.querySelector('input:not([type=color])')?.focus({preventScroll:true});
    });
    return form;
  }
  function renderTrackingCatalog(force=false){
    const root=$('#categoryEditorRows'),snapshot=JSON.stringify([categories,state.activities]);
    if(root.querySelector('.is-sorting') || root.classList.contains('is-sorting'))return;
    if(!force && trackingCatalogSnapshot===snapshot)return;
    trackingCatalogSnapshot=snapshot;
    root.replaceChildren();
    if(!categories.length)appendEmpty(root,'Aucune catégorie. Ajoute une catégorie pour organiser tes activités.');
    categories.forEach((category,index)=>{
      const activities=state.activities.filter(item=>item.categoryId===category.id);
      const group=makeElement('article','catalog-category');
      group.dataset.catalogCategory=category.id;
      const header=makeElement('div','catalog-category-header');
      const body=makeElement('div','catalog-category-body');
      body.id='catalogCategoryBody-'+index;
      const toggle=makeButton('',()=>setOpen(body.hidden),'catalog-category-toggle');
      toggle.setAttribute('aria-controls',body.id);
      const chevron=makeElement('span','catalog-chevron');chevron.innerHTML=catalogIcon('chevron');
      toggle.append(chevron);
      function setOpen(open){
        body.hidden=!open;toggle.setAttribute('aria-expanded',String(open));
        toggle.setAttribute('aria-label',(open?'Replier ':'Déplier ')+category.name);
        if(open)openCatalogCategories.add(category.id);
        else openCatalogCategories.delete(category.id);
      }
      setOpen(openCatalogCategories.has(category.id));
      header.addEventListener('click',event=>{
        if(!event.target.closest('button,input'))setOpen(body.hidden);
      });
      const remove=catalogActionButton('delete','Supprimer '+category.name,()=>askToDeleteCategory(category));
      remove.disabled=categories.length<2;
      const title=makeElement('div','catalog-category-title');
      const count=makeElement('span','catalog-count',String(activities.length));
      count.title=activities.length+' activité'+(activities.length===1?'':'s');
      count.setAttribute('aria-label',count.title);
      title.append(catalogNameField(category),count);
      header.append(toggle,createEmojiPicker(category),title,createGoalEditor(category),remove);
      const rows=makeElement('div','catalog-activity-rows');
      activities.forEach(activity=>createCatalogActivityRow(activity,rows));
      body.append(createCatalogActivityForm(category),rows);
      group.append(header,body);root.append(group);
      addReorderHandle(group,category,root,ids=>{
        categories=reorderSubset(categories,ids);
        commitCatalog('Ordre des catégories enregistré.');
      },()=>renderTrackingCatalog(true),{handleMount:header});
    });
  }

  function setNewCategoryEmoji(value){
    newCategoryEmoji=value;
    const button=$('#newCategoryEmoji');
    button.textContent=value || '＋';
    button.title=value?'Changer l’emoji '+value:'Choisir un emoji';
    button.setAttribute('aria-label',button.title+' pour la nouvelle catégorie');
  }
  function setNewCategoryError(message=''){
    const error=$('#categoryError');
    error.textContent=message;error.hidden=!message;
    newCategoryName.setAttribute('aria-invalid',String(Boolean(message)));
  }
  $('#openNewCategory').addEventListener('click',()=>{
    newCategoryForm.reset();setNewCategoryEmoji('🗂️');setNewCategoryError();
    newCategoryDialog.showModal();
    newCategoryName.focus({preventScroll:true});
  });
  $('#closeNewCategory').addEventListener('click',()=>newCategoryDialog.close());
  $('#cancelNewCategory').addEventListener('click',()=>newCategoryDialog.close());
  newCategoryName.addEventListener('input',()=>setNewCategoryError());
  $('#newCategoryEmoji').addEventListener('click',()=>{
    const name=newCategoryName.value.trim() || 'Nouvelle catégorie';
    openEmojiKeyboard({name},$('#newCategoryEmoji'),setNewCategoryEmoji);
  });
  newCategoryForm.addEventListener('submit',event=>{
    event.preventDefault();
    if(!newCategoryDialog.open)return;
    const name=newCategoryName.value.trim();
    const error=categoryNameError(name);
    if(error){setNewCategoryError(error);newCategoryName.focus();return;}
    addCatalogCategory(name,newCategoryEmoji);
    newCategoryDialog.close();
    commitCatalog('Catégorie ajoutée.');
  });
  function clearTrackingCatalog(){
    trackingCatalogSnapshot='';openCatalogCategories.clear();newActivityInputs.clear();
    if(newCategoryDialog.open)newCategoryDialog.close();
    $('#categoryEditorRows').replaceChildren();$('#trackingStatus').textContent='';
    if(catalogActionDialog.open)catalogActionDialog.close();
  }
  // Interface preferences are part of the account state, including all filters.
  let goalReference = '';
  function removeDetail(date,id) {
    if (!state.details[date]) return;
    delete state.details[date][id];
    if (!Object.keys(state.details[date]).length) delete state.details[date];
  }
  const defaultAccent='#1bd96a';
  const themeInputs=document.querySelectorAll('[name="profileTheme"]');
  function normalizeAccent(value) {
    return typeof value==='string' && /^#[0-9a-f]{6}$/i.test(value)?value.toLowerCase():null;
  }
  const goalColorOptions=[
    ['success','Atteint ou respecté','#43966a','Le minimum est atteint ou la limite est respectée.'],
    ['exceeded','Minimum dépassé','#7538c8','Le résultat dépasse l’objectif minimum.'],
    ['warning','Partiel ou à la limite','#fda251','L’objectif est partiellement atteint ou le résultat est exactement à la limite.'],
    ['danger','Non atteint ou limite dépassée','#d65b60','L’objectif a été manqué ou le maximum a été dépassé.'],
    ['pending','En cours','#73796f','La période est toujours ouverte.'],
    ['future','À venir','#a0a395','La période n’a pas encore commencé.']
  ];
  function normalizeGoalColors(value={}){
    return Object.fromEntries(goalColorOptions.flatMap(([tone])=>{
      const color=normalizeAccent(value?.[tone]);
      return color?[[tone,color]]:[];
    }));
  }
  const paletteRows=new Map();
  goalColorOptions.forEach(([tone,name,defaultColor,description])=>{
    const row=makeElement('div','preference-color-row');
    const label=makeElement('label','preference-color-label');
    label.htmlFor='goalColor-'+tone;
    label.append(makeElement('strong',null,name),makeElement('small',null,description));
    const controls=makeElement('div','preference-color-controls');
    const value=makeElement('span','preference-color-value');
    const input=makeElement('input');
    input.type='color';input.id='goalColor-'+tone;input.value=defaultColor;
    input.addEventListener('change',()=>{
      const color=normalizeAccent(input.value);
      if(!color)return;
      state.goalColors={...state.goalColors,[tone]:color};
      applyGoalColors();persist();
    });
    controls.append(value,input);
    row.append(label,controls);
    $('#goalColorRows').append(row);
    paletteRows.set(tone,{value,input,defaultColor});
  });
  function applyGoalColors(){
    const style=document.getElementById('app').style;
    paletteRows.forEach(({value,input,defaultColor},tone)=>{
      const color=state.goalColors[tone];
      const token='--custom-goal-'+tone;
      if(color){
        style.setProperty(token,color);
        style.setProperty('--goal-ink-'+tone,'color-mix(in srgb, '+color+' 34%, var(--text))');
      }else{
        style.removeProperty(token);
        style.removeProperty('--goal-ink-'+tone);
      }
      input.value=color || defaultColor;
      value.textContent=color?color.toUpperCase():'Par défaut';
    });
    $('#resetGoalColors').disabled=!Object.keys(state.goalColors).length;
  }
  $('#resetGoalColors').addEventListener('click',()=>{
    state.goalColors={};applyGoalColors();persist();
  });
  function applyTheme() {
    const app=document.getElementById('app');
    app.dataset.theme=state.theme;
    if(currentAccount)$('#authGate').dataset.theme=state.theme;
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
    $('#profileAccentValue').textContent=accent?accent.toUpperCase():'Par défaut';
    $('#resetProfileAccent').disabled=!accent;
  }
  themeInputs.forEach(input=>input.addEventListener('change',()=>{if(input.checked){state.theme=input.value;applyTheme();persist();}}));
  $('#profileAccent').addEventListener('change',event=>{state.accent=normalizeAccent(event.target.value);applyTheme();persist();});
  $('#resetProfileAccent').addEventListener('click',()=>{state.accent=null;applyTheme();persist();});



  function updateGoalEditorButton(button,item){
    const count=goalsOf(item).length;
    button.classList.toggle('has-goals',count>0);
    const label=count?count+' objectif'+(count>1?'s':''):'Aucun objectif';
    button.title=label;
    button.setAttribute('aria-label','Modifier les objectifs de '+item.name+' · '+label);
  }
  function createGoalEditor(item) {
    const panel=document.createElement('div');panel.className='goal-editor';
    const button=makeButton('',()=>openGoalEditor(item.id),'text-button');
    button.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>';
    button.dataset.goalOwner=item.id;
    updateGoalEditorButton(button,item);
    panel.append(button);
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
  function goalCountsByPeriod(ids,goal,through,entries){
    const wanted=new Set(ids),counts=new Map();
    entries.forEach(([date,activities])=>{
      if(date>through || goalStartsAfter(goal,date))return;
      const amount=activities.reduce((sum,id)=>sum+(wanted.has(id)?measuredAmount(date,id,goal):0),0);
      if(!amount)return;
      const key=goal.period==='day'?date:periodBounds(date,goal.period)[0];
      counts.set(key,(counts.get(key)||0)+amount);
    });
    return counts;
  }
  function goalStartsAfter(goal,date){return Boolean(goal.startDate && goal.startDate>date);}
  function goalProgress(ids,goal,reference) {
    const [start,end]=periodBounds(reference,goal.period),today=localDateKey(new Date());
    const first=goalStartsAfter(goal,start)?goal.startDate:start;
    let count=0;
    Object.entries(state.entries).forEach(([date,entries])=>{
      if(date<first || date>end || date>today)return;
      entries.forEach(id=>{if(ids.includes(id))count+=measuredAmount(date,id,goal);});
    });
    return evaluateGoal(goal,count,start,end,today);
  }
  function evaluateGoal(goal,count,start,end,today,viewDate=start){
    if(goalStartsAfter(goal,end))return {count:0,start,end,tone:'empty',status:'Pas encore commencé'};
    start=goalStartsAfter(goal,start)?goal.startDate:start;
    if(start>today || viewDate>today)return {count:0,start,end,tone:'future',status:'À venir'};
    count=Math.round(count*1000000)/1000000;
    if(goal.mode==='max' && goal.target===0){
      return {count,start,end,tone:count===0?'success':'danger',status:count===0?'Objectif respecté':'Limite dépassée'};
    }
    const equality=Math.abs(count-goal.target)<1e-8;
    const missed=goal.mode==='min' && !equality && count<goal.target && end<today;
    const tone=goal.mode==='min'?(equality?'success':count>goal.target?'exceeded':missed?'danger':'pending'):(equality?'warning':count>goal.target?'danger':'success');
    const status=goal.mode==='min'?(tone==='exceeded'?'Objectif dépassé':tone==='success'?'Objectif atteint':missed?'Non atteint':'À accomplir'):(equality?'Limite atteinte':count>goal.target?'Limite dépassée':'Dans la limite');
    return {count,start,end,status,tone,missed};
  }
  function filteredGoalTargets(categoryId=goalCategoryFilter,activityIds=goalActivityFilter) {
    return goalTargets(categoryId).filter(target=>activityIds===null || (target.category?target.ids.some(id=>activityIds.includes(id)):activityIds.includes(target.item.id)));
  }
  function allActivitiesSelected(ids,activities){
    return ids===null || (activities.length>0 && activities.every(activity=>ids.includes(activity.id)));
  }
  function rerenderActivityFilter(group,id,refresh){
    const focused=group.contains(document.activeElement);
    refresh();
    if(focused)[...group.children].find(button=>button.dataset.activityFilter===id)?.focus({preventScroll:true});
  }
  function renderFilterButtonState(scope,filters){
    const reset=$('#'+scope+'QuickReset'),group=reset.parentElement;
    const trigger=$('#'+scope+'FilterToggle'),badge=trigger.querySelector('.filter-count');
    const count=filters.filter(Boolean).length;
    group.classList.toggle('filters-active',count>0);
    badge.textContent=count || '';
    badge.hidden=!count;
    trigger.setAttribute('aria-label',count?'Filtres · '+count+' '+(count===1?'filtre actif':'filtres actifs'):'Filtres');
    reset.hidden=!count && !reset.hasAttribute('data-resetting');
  }
  [['calendarFilterToggle','calendarFilters'],['goalFilterToggle','objectiveFilters'],['statsFilterToggle','statsFilters']].forEach(([triggerId,dialogId])=>{
    const trigger=$('#'+triggerId),dialog=$('#'+dialogId);
    trigger.addEventListener('click',()=>{if(!dialog.open)dialog.showModal();});
    dialog.querySelectorAll('.filter-close').forEach(button=>button.addEventListener('click',()=>closeFilterDrawer(dialog)));
    dialog.addEventListener('cancel',event=>{event.preventDefault();closeFilterDrawer(dialog);});
    dialog.addEventListener('close',()=>{delete dialog.dataset.closing;});
  });
  function resetCalendarFilters(){
    if(currentPage!=='calendar' && state.activeCategory!=='overview')state.selectedActivities=calendarFilterActivities().map(activity=>activity.id);
    selectCategory('overview');
  }
  function resetGoalFilters(){
    if(calendarIsOpen('goals')){
      Object.assign(calendarState,normalizeCalendarFilters({}));
    }else{
      filtersUseDefaults.goals=false;goalCategoryFilter=null;goalActivityFilter=null;goalStatusFilter='all';goalFrequencyFilter=[];
    }
    renderGoals();persist();
  }
  function animateFilterReset(button){
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return null;
    const icon=button.querySelector('.filter-reset-icon');
    icon.getAnimations?.().forEach(animation=>animation.cancel());
    return icon.animate?.([{transform:'rotate(0deg)'},{transform:'rotate(-360deg)'}],{duration:400,easing:'ease-out'});
  }
  [['calendar','resetCalendarFilters',resetCalendarFilters],['goal','resetGoalFilters',resetGoalFilters],['stats','resetStatsFilters',resetStatsFilters]].forEach(([scope,drawerId,reset])=>{
    const drawerButton=$('#'+drawerId),quickButton=$('#'+scope+'QuickReset'),trigger=$('#'+scope+'FilterToggle');
    drawerButton.addEventListener('click',()=>{reset();animateFilterReset(drawerButton);});
    quickButton.addEventListener('click',()=>{
      if(quickButton.hidden || quickButton.hasAttribute('data-resetting'))return;
      const animation=animateFilterReset(quickButton);
      if(animation?.finished)quickButton.setAttribute('data-resetting','');
      if(document.activeElement===quickButton)trigger.focus({preventScroll:true});
      reset();
      if(animation?.finished)animation.finished.catch(()=>{}).finally(()=>{
        quickButton.removeAttribute('data-resetting');
        quickButton.hidden=!quickButton.parentElement.classList.contains('filters-active');
      });
    });
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
  function renderGoals() {
    if(!goalReference)goalReference=localDateKey(new Date());
    const calendar=calendarIsOpen('goals');
    const reference=calendar?calendarState.date:goalReference;
    updateDateNavigation('goalDateLabel','globalGoalDate',reference,calendar?calendarState.period:selectedGoalFrequency('day'));
    syncFormatButtons('goal',goalFormat);
    syncSegmentedSwitch($('#historyViews'),'goalView',calendarState.period);
    syncCompactSwitch($('#historyViews'));
    renderGoalFilters();
    if(calendar){
      updateFilterResultCount('goalFilterResults',calendarGoalTargets(reference).length);
      renderGoalHistory();
      return;
    }
    const root=$('#globalGoalCards'),tiles=goalFormat==='cards';
    root.dataset.format=goalFormat;
    root.replaceChildren();
    const targets=filteredGoalTargets().filter(({goal,ids})=>(!goalFrequencyFilter.length || goalFrequencyFilter.includes(goal.period))
      && goalMatchesStatus(goalProgress(ids,goal,goalReference),goalStatusFilter));
    updateFilterResultCount('goalFilterResults',targets.length);
    if(!targets.length){appendWorkspaceEmpty(root,'Aucun objectif à afficher','Choisissez une autre fréquence ou modifiez vos filtres.','goals');return;}
    const progress=makeElement('div');
    progress.id=tiles?'goalTileProgress':'goalListProgress';
    renderGoalSummary(targets,goalReference,progress,selectedGoalFrequency());root.append(progress);
    for(const [period,label] of goalFrequencyOptions){
      if(goalFrequencyFilter.length && !goalFrequencyFilter.includes(period))continue;
      const section=makeElement('section','objective-frequency-section');
      const title=makeElement('h2',null,label);
      title.id='objectiveFrequency-'+period;
      section.setAttribute('aria-labelledby',title.id);
      section.append(title);root.append(section);
      const group=targets.filter(({goal})=>goal.period===period);
      if(!group.length){appendEmpty(section,'Aucun objectif.');continue;}
      if(!tiles){renderGoalTable(section,group,period);continue;}
      const grid=makeElement('div','goal-cards daily-goal-grid');
      grid.dataset.goalPeriod=period;
      section.append(grid);
      drawGoals(grid,goalReference,goalCategoryFilter,goalStatusFilter,period,goalActivityFilter);
    }
  }

  function summarizeGoalOutcomes(rows,ongoing){
    if(!rows.length)return {tone:'empty',label:'Aucun objectif pour cette période'};
    if(rows.every(row=>row.tone==='future'))return {tone:'future',label:'À venir'};
    const completed=rows.filter(row=>row.tone==='success' || row.tone==='exceeded' || (row.goal.mode==='max' && row.tone==='warning')).length;
    const positiveExceeded=rows.filter(row=>row.tone==='exceeded').length;
    const overLimit=rows.some(row=>row.goal.mode==='max' && row.tone==='danger');
    const atLimit=rows.some(row=>row.goal.mode==='max' && row.tone==='warning');
    const missed=rows.some(row=>row.tone==='danger');
    const tone=overLimit?'danger':atLimit?'warning':completed===rows.length?(positiveExceeded?'exceeded':'success'):completed?'warning':missed?'danger':'pending';
    const beyond=positiveExceeded?' · '+positiveExceeded+' minimum'+(positiveExceeded>1?'s':'')+' dépassé'+(positiveExceeded>1?'s':''):'';
    const completionLabel=rows.some(row=>row.goal.mode==='max')?'respectés':'atteints';
    return {tone,completed,total:rows.length,completionLabel,
      label:completed+' / '+rows.length+' objectifs '+completionLabel+beyond+(ongoing?' · En cours':'')};
  }
  function goalOutcomeLegend(label){
    const legend=document.createElement('div');legend.className='goal-history-legend';
    legend.setAttribute('role','group');legend.setAttribute('aria-label',label);
    [['danger','Non atteint ou limite dépassée'],['warning','Partiel ou à la limite'],['success','Objectifs respectés'],['exceeded','Minimum dépassé'],['pending','En cours'],['future','À venir']].forEach(([tone,label])=>{const item=document.createElement('span');item.dataset.tone=tone;item.textContent=label;legend.append(item);});
    return legend;
  }
  function goalHistoryAmount({count,goal}){
    return measureValue(count,goal)+' / '+measureValue(goal.target,goal)+' '+unitLabel(goal);
  }
  function calendarGoalTargets(reference){
    const {categoryId,activityIds,status,frequencies}=calendarState;
    return filteredGoalTargets(categoryId,activityIds).filter(({goal,ids})=>
      (!frequencies.length || frequencies.includes(goal.period)) &&
      (status==='all' || goalMatchesStatus(goalProgress(ids,goal,reference),status)));
  }
  function renderGoalHistory() {
    if(calendarPreviewAnchor && $('#goalHistory').contains(calendarPreviewAnchor))hideCalendarPreview();
    const panel=$('#goalHistory');panel.replaceChildren();
    const root=document.createElement('div');root.className='goal-calendar-body';panel.append(root);
    const {date:historyDate,period:historyView,categoryId,activityIds,status,frequencies}=calendarState;
    const shows=period=>!frequencies.length || frequencies.includes(period);
    const targets=calendarGoalTargets(historyDate);
    function calendarSection(period){
      const section=makeElement('section','goal-calendar-section');
      section.dataset.calendarGoalPeriod=period;
      const title=goalFrequencyOptions.find(([value])=>value===period)[1];
      const heading=makeElement('h3',null,'Objectifs '+title.toLowerCase());
      heading.id='calendarGoalSection-'+period;
      section.setAttribute('aria-labelledby',heading.id);
      section.append(heading);root.append(section);
      return section;
    }
    if(targets.length)panel.append(goalOutcomeLegend('Légende du calendrier'));
    if(historyView==='day'){
      root.append(calendarDayHeading(historyDate));
      for(const [period] of goalFrequencyOptions){
        if(!shows(period))continue;
        const section=calendarSection(period);
        const grid=makeElement('div','goal-cards daily-goal-grid calendar-goal-tiles');
        section.append(grid);
        drawGoals(grid,historyDate,categoryId,status,period,activityIds);
      }
      return;
    }
    const today=localDateKey(new Date());
    // Bucket each objective once using its own frequency and measurement.
    const entries=Object.entries(state.entries);
    const targetGroups=Object.fromEntries(goalFrequencyOptions.map(([period])=>[period,[]]));
    targets.forEach(target=>{
      const {goal,ids}=target;
      targetGroups[goal.period].push({...target,counts:goalCountsByPeriod(ids,goal,today,entries)});
    });
    function appendOutcomes(list,rows){
      rows.forEach(({name,goal,count,tone,status})=>{
        const item=makeElement('article','week-goal-item');
        item.dataset.tone=tone;item.dataset.goalId=goal.id;
        const amount=goalHistoryAmount({count,goal});
        item.setAttribute('aria-label',name+' · '+status+' · '+amount);
        item.append(makeElement('strong',null,name),makeElement('span','week-goal-amount',amount));
        list.append(item);
      });
      if(!rows.length)list.append(makeElement('p','muted','Aucun objectif'));
    }
    function outcomesFor(reference,scope){
      const [start,end]=periodBounds(reference,scope);
      return targetGroups[scope].flatMap(({item,goal,counts})=>{
        const {tone,status,count}=evaluateGoal(goal,counts.get(start)||0,start,end,today);
        return tone==='empty'?[]:[{name:item.name,goal,count,tone,status}];
      });
    }
    function assess(reference,scope){
      const [,end]=periodBounds(reference,scope);
      return summarizeGoalOutcomes(outcomesFor(reference,scope),end>=today);
    }
    const [start]=periodBounds(historyDate,historyView);
    function openGoalDay(date){
      calendarState.date=date;calendarState.period='day';renderGoals();persist();
      const heading=root.parentElement?.querySelector('.calendar-day-heading') || $('#goalHistory .calendar-day-heading');
      if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
    }
    function cell(date,scope,text,result=assess(date,scope)){
      const button=makeButton(text,()=>{
        if(scope==='day'){openGoalDay(date);return;}
        calendarState.date=date;renderGoals();persist();
      },'goal-history-day');
      button.dataset.date=date;button.dataset.period=scope;button.dataset.tone=result.tone;
      const label=formatDate(date)+' · '+result.label;
      button.setAttribute('aria-label',label);button.setAttribute('aria-pressed',String(date===historyDate));
      button.dataset.previewDate=date;
      goalCalendarPreviews.set(button,()=>({
        scope,
        rows:outcomesFor(date,scope)
      }));
      if(date===today)button.setAttribute('aria-current','date');
      return button;
    }
    if(historyView==='week'){
      if(shows('day')){
        const daily=calendarSection('day');
        calendarWeekGrid(daily,start,(column,date)=>{
          const rows=outcomesFor(date,'day'),result=assess(date,'day');
          const heading=column.parentElement.querySelector('.week-heading');
          heading.dataset.date=heading.dataset.previewDate=date;
          heading.setAttribute('aria-label',formatDate(date)+' · '+result.label);
          goalCalendarPreviews.set(heading,()=>({scope:'day',rows}));
          const list=makeElement('div','week-goal-list');
          appendOutcomes(list,rows);
          column.append(list);
        },openGoalDay);
      }
      const end=shiftDate(start,'day',6);
      for(const period of ['week','month','year'].filter(shows)){
        const section=calendarSection(period);
        const refs=periodBounds(start,period)[0]===periodBounds(end,period)[0]?[start]:[start,end];
        const groups=makeElement('div','goal-calendar-period-groups');
        refs.forEach(reference=>{
          const group=makeElement('div','goal-calendar-period-group');
          group.append(makeElement('h4',null,periodLabel(reference,period)));
          const list=makeElement('div','week-goal-list');
          appendOutcomes(list,outcomesFor(reference,period));
          group.append(list);groups.append(group);
        });
        section.append(groups);
      }
      return;
    }
    function summaryBar(date,period,title){
      const result=assess(date,period);
      const button=makeButton('',()=>showCalendarPreview(button),'goal-period-summary');
      button.dataset.previewDate=date;button.dataset.tone=result.tone;button.dataset.period=period;
      button.setAttribute('aria-label',title+' · '+result.label);
      goalCalendarPreviews.set(button,()=>({scope:period,rows:outcomesFor(date,period)}));
      const heading=makeElement('strong',null,title);
      const label=makeElement('span','goal-period-result',result.total?result.completed+' / '+result.total+' '+result.completionLabel:result.label);
      const track=makeElement('span','goal-period-track'),fill=makeElement('span');
      track.setAttribute('aria-hidden','true');
      fill.style.width=(result.total?result.completed/result.total*100:0)+'%';track.append(fill);
      button.append(heading,track,label);
      return button;
    }
    if(historyView==='month'){
      const [year,month]=historyDate.split('-').map(Number);
      if(shows('month'))root.append(summaryBar(historyDate,'month','Bilan · '+periodLabel(historyDate,'month')));
      if(shows('day') || shows('week')){
        root.append(calendarMonthGrid(year,month-1,(date,day)=>{
          if(!shows('day'))return makeElement('span','goal-month-date',String(day));
          const result=assess(date,'day'),button=cell(date,'day','',result);
          button.classList.add('month-cell');
          button.append(makeElement('strong',null,String(day)));
          if(result.total){
            const count=makeElement('span','month-goal-count');
            count.setAttribute('aria-hidden','true');
            count.append(makeElement('strong',null,result.completed+'/'+result.total),
              makeElement('small',null,result.completionLabel));
            button.append(count);
          }
          return button;
        },shows('week')?date=>summaryBar(date,'week','Semaine '+weekNumber(periodBounds(date,'week')[0])):null));
      }
      if(frequencies.includes('year'))root.append(summaryBar(historyDate,'year','Bilan · '+periodLabel(historyDate,'year')));
      return;
    }
    if(frequencies.length){
      for(const period of ['week','month','year'].filter(shows)){
        root.append(summaryBar(historyDate,period,periodLabel(historyDate,period)));
      }
      if(!shows('day'))return;
    }
    const months=document.createElement('div');months.className='goal-history-months';months.dataset.view='year';
    const year=Number(historyDate.slice(0,4));
    MONTHS.forEach((monthName,month)=>{
      const {monthElement,days}=annualMonth(monthName);
      for(let i=0;i<getMondayFirstDay(year,month);i++){
        const blank=document.createElement('span');blank.setAttribute('aria-hidden','true');days.append(blank);
      }
      for(let day=1;day<=daysInMonth(year,month);day++)days.append(cell(dateKey(year,month,day),'day',String(day)));
      months.append(monthElement);
    });
    root.append(months);
  }
  function setGoalDate(date){
    if(!date)return;
    if(calendarIsOpen('goals'))calendarState.date=date;
    else goalReference=date;
    renderGoals();persist();
  }
  $('#globalGoalDate').addEventListener('change',event=>setGoalDate(event.target.value));
  function shiftGoalPeriod(direction){
    const calendar=calendarIsOpen('goals');
    const date=calendar?calendarState.date:goalReference || localDateKey(new Date());
    setGoalDate(shiftDate(date,calendar?calendarState.period:selectedGoalFrequency('day'),direction));
  }
  $('#goalPrevious').addEventListener('click',()=>shiftGoalPeriod(-1));
  $('#goalNext').addEventListener('click',()=>shiftGoalPeriod(1));
  $('#goalToday').addEventListener('click',()=>setGoalDate(localDateKey(new Date())));

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
  function setAccountMenu(open,returnFocus=false) {
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
  });
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if(!accountMenu.hidden)setAccountMenu(false,true);
  });
  $('#logout').addEventListener('click',()=>setAccountMenu(false,true));
  let currentAccount=null;
  let accountLogins=[];
  let demoDevices=[];
  const sampleDevices=['Navigateur de bureau','Téléphone mobile','Tablette'];
  const profileIconPaths={
    person:'<circle cx="12" cy="8" r="3"/><path d="M5 20v-1a7 7 0 0 1 14 0v1"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18"/>',
    check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    desktop:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
    mobile:'<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 17h2"/>',
    tablet:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M11 17h2"/>'
  };
  function paintProfileIcon(node){
    node.innerHTML='<svg viewBox="0 0 24 24" focusable="false">'+profileIconPaths[node.dataset.profileIcon]+'</svg>';
  }
  document.querySelectorAll('[data-profile-icon]').forEach(paintProfileIcon);
  function profileRowLabel(text,icon){
    const label=makeElement('span','profile-row-label');
    const badge=makeElement('span','profile-row-icon');
    badge.dataset.profileIcon=icon;badge.setAttribute('aria-hidden','true');paintProfileIcon(badge);
    label.append(badge,makeElement('span',null,text));
    return label;
  }
  const disconnectDevicesDialog=$('#disconnectDevicesDialog');
  const disconnectAllDevices=$('#disconnectAllDevices');
  const logoutIcon=$('#logout svg');
  disconnectAllDevices.prepend(logoutIcon.cloneNode(true));
  function renderProfileDevices() {
    const list=$('#profileDevices');list.replaceChildren();
    demoDevices.forEach((name,index)=>{
      const row=document.createElement('li');
      const label=profileRowLabel(name,['desktop','mobile','tablet'][sampleDevices.indexOf(name)]);
      const button=makeButton('Déconnecter',()=>{
        demoDevices=demoDevices.filter(device=>device!==name);
        renderProfileDevices();
        (list.querySelectorAll('button')[index] || list.querySelector('button') || $('#profileSessionsTab')).focus();
        showSaveToast('Appareil retiré de la liste');
      },'profile-disconnect');
      button.prepend(logoutIcon.cloneNode(true));
      button.setAttribute('aria-label','Déconnecter '+name);
      row.append(label,button);list.append(row);
    });
    if(!demoDevices.length){const empty=document.createElement('li');empty.textContent='Aucun appareil dans la liste.';list.append(empty);}
    disconnectAllDevices.disabled=!demoDevices.length;
  }
  disconnectAllDevices.addEventListener('click',()=>disconnectDevicesDialog.showModal());
  ['#closeDisconnectDevices','#cancelDisconnectDevices'].forEach(id=>$(id).addEventListener('click',()=>disconnectDevicesDialog.close()));
  $('#disconnectDevicesForm').addEventListener('submit',event=>{
    event.preventDefault();
    if(!disconnectDevicesDialog.open || !demoDevices.length)return;
    demoDevices=[];
    disconnectDevicesDialog.close();
    renderProfileDevices();
    $('#profileSessionsTab').focus();
    showSaveToast('Tous les appareils ont été retirés de la liste');
  });
  const goalFilterStatuses=[['all','Tous'],['pending','À accomplir'],['success','Atteints / dans la limite'],['exceeded','Minimum dépassé'],['warning','À la limite'],['danger','Limite dépassée'],['missed','Non atteints']];
  function normalizedFilter(scope,value={}){
    const categoryId=categories.some(item=>item.id===value?.categoryId)?value.categoryId:null;
    const ids=state.activities.filter(item=>item.categoryId===categoryId).map(item=>item.id);
    return {
      custom:value?.custom===true,
      categoryId,
      activityIds:categoryId && Array.isArray(value?.activityIds)?[...new Set(value.activityIds.filter(id=>ids.includes(id)))]:null,
      ...(scope==='goals'?{status:goalFilterStatuses.some(([id])=>id===value?.status)?value.status:'all'}:{})
    };
  }
  function normalizeFilterPreferences(value={}){
    return {activities:normalizedFilter('activities',value?.activities),goals:normalizedFilter('goals',value?.goals)};
  }
  let filterPreferences=normalizeFilterPreferences(),filtersUseDefaults={activities:false,goals:false};

  const memoryFields={
    calendar:['Calendrier',{filters:'Filtres',date:'Date',period:'Jour, semaine, mois ou année',scope:'Activités ou objectifs'}],
    activities:['Activités',{filters:'Filtres',date:'Date',period:'Jour, semaine, mois ou année',format:'Galerie ou liste'}],
    goals:['Objectifs',{filters:'Filtres',date:'Date',period:'Fréquence',format:'Galerie ou liste'}]
  };
  function normalizeViewMemory(value={},rememberFilters=true){
    const reloadDefaults={
      calendar:{filters:rememberFilters,date:true,period:true},
      activities:{filters:rememberFilters},
      goals:{filters:rememberFilters,period:rememberFilters}
    };
    return Object.fromEntries(['navigation','reload'].map(mode=>[mode,Object.fromEntries(
      Object.entries(memoryFields).map(([page,[,fields]])=>[page,Object.fromEntries(
        Object.keys(fields).map(field=>{
          const saved=value?.[mode]?.[page]?.[field];
          return [field,typeof saved==='boolean'?saved:mode==='navigation' || reloadDefaults[page][field]===true];
        })
      )])
    )]));
  }
  let viewMemory=normalizeViewMemory();
  const visitedWorkspacePages=new Set();

  function withCurrentViews(data){
    const {activityFormat,goalFormat,calendarScope,calendarView,focusDate,agendaDate,goalReference,calendar,
      goalCategoryFilter,goalStatusFilter,goalActivityFilter,goalFrequencyFilter}=exportInterface();
    const selections={...state.selections};
    if(state.activeCategory!=='overview')selections[state.activeCategory]=state.selectedActivities;
    return {...data,year:state.year,activeCategory:state.activeCategory,selections,selectedActivities:state.selectedActivities,
      interface:{...data.interface,page:currentPage,filtersUseDefaults,activityFormat,goalFormat,calendarScope,calendarView,
        focusDate,agendaDate,goalReference,calendar,goalCategoryFilter,goalStatusFilter,goalActivityFilter,goalFrequencyFilter}};
  }

  function applyActivityFilter(value){
    const filter=normalizedFilter('activities',value);
    state.activeCategory=filter.categoryId || 'overview';
    state.selectedActivities=filter.activityIds ?? state.activities.filter(item=>!filter.categoryId || item.categoryId===filter.categoryId).map(item=>item.id);
  }
  function applyGoalFilter(value){
    const filter=normalizedFilter('goals',value);
    goalCategoryFilter=filter.categoryId;goalActivityFilter=filter.activityIds;goalStatusFilter=filter.status;
    goalFrequencyFilter=normalizeGoalFrequencies(value?.frequencies);
  }
  function resetUnrememberedView(page,mode){
    const memory=viewMemory[mode][page];
    const today=localDateKey(new Date());
    if(page==='calendar'){
      if(!memory.scope)calendarScope='activities';
      if(!memory.date)calendarState.date=today;
      if(!memory.period)calendarState.period=defaultViews[calendarScope].period;
      if(!memory.filters)Object.assign(calendarState,normalizeCalendarFilters({}));
    }else if(page==='activities'){
      if(!memory.date){focusDate=today;state.year=Number(today.slice(0,4));}
      if(!memory.period)calendarView=defaultViews.activities.period;
      if(!memory.format)activityFormat=defaultViews.activities.format;
      if(!memory.filters || (mode==='reload' && filtersUseDefaults.activities)){
        state.selections={};
        applyActivityFilter(filterPreferences.activities.custom?filterPreferences.activities:{});
      }
    }else{
      if(!memory.date)goalReference=today;
      if(!memory.period)goalFrequencyFilter=[];
      if(!memory.format)goalFormat=defaultViews.goals.format;
      if(!memory.filters || (mode==='reload' && filtersUseDefaults.goals)){
        applyGoalFilter({...filterPreferences.goals.custom && filterPreferences.goals,frequencies:goalFrequencyFilter});
      }
    }
  }

  const memoryControls=[];
  for(const mode of ['navigation','reload']){
    const root=$('#'+mode+'MemoryOptions');
    Object.entries(memoryFields).forEach(([page,[title,fields]])=>{
      const group=makeElement('fieldset','memory-group');
      group.append(makeElement('legend',null,title));
      for(const [field,text] of Object.entries(fields)){
        const label=makeElement('label','profile-switch');
        const input=makeElement('input');
        input.type='checkbox';input.setAttribute('role','switch');input.checked=viewMemory[mode][page][field];
        input.dataset.memoryMode=mode;input.dataset.memoryPage=page;input.dataset.memoryField=field;
        input.addEventListener('change',()=>{viewMemory[mode][page][field]=input.checked;persist();});
        label.append(makeElement('strong',null,text),input,makeElement('i'));
        label.lastElementChild.setAttribute('aria-hidden','true');group.append(label);
        memoryControls.push(input);
      }
      root.append(group);
    });
  }
  function renderViewMemorySettings(){
    memoryControls.forEach(input=>{
      const {memoryMode,memoryPage,memoryField}=input.dataset;
      input.checked=viewMemory[memoryMode][memoryPage][memoryField];
    });
  }
  function setDefaultFilter(scope,patch){
    filterPreferences[scope]=normalizedFilter(scope,{...filterPreferences[scope],...patch});
    filtersUseDefaults[scope]=true;
    renderDefaultFilterSettings();persist();
  }
  function renderDefaultFilterSettings(){
    for(const scope of ['activities','goals']){
      const panel=document.querySelector('[data-filter-defaults="'+scope+'"]'),filter=normalizedFilter(scope,filterPreferences[scope]);
      panel.querySelector('[data-profile-filter-custom]').checked=filter.custom;
      panel.querySelector('.profile-filter-fields').hidden=!filter.custom;
      const category=panel.querySelector('[data-profile-filter-category]');
      category.replaceChildren();appendOption(category,'','Toutes les catégories');
      categories.forEach(item=>appendOption(category,item.id,categoryLabel(item)));
      category.value=filter.categoryId || '';
      const group=panel.querySelector('[data-profile-filter-activities]');
      group.replaceChildren();
      const activities=filter.categoryId?state.activities.filter(item=>item.categoryId===filter.categoryId):[];
      const allSelected=allActivitiesSelected(filter.activityIds,activities);
      const setSelection=(id,ids)=>{
        const focused=group.contains(document.activeElement);
        setDefaultFilter(scope,{activityIds:ids});
        if(focused)[...group.children].find(button=>button.dataset.activityFilter===id)?.focus({preventScroll:true});
      };
      const all=filterChip('Toutes',allSelected,()=>{if(activities.length)setSelection('all',allSelected?[]:null);});
      all.dataset.activityFilter='all';group.append(all);
      activities.forEach(item=>{
        const selected=filter.activityIds===null || filter.activityIds.includes(item.id);
        const button=filterChip(item.name,selected,()=>{
          const previous=filter.activityIds ?? activities.map(activity=>activity.id);
          const next=selected?previous.filter(id=>id!==item.id):[...previous,item.id];
          setSelection(item.id,allActivitiesSelected(next,activities)?null:next);
        });
        button.dataset.activityFilter=item.id;group.append(button);
      });
      const status=panel.querySelector('[data-profile-filter-status]');
      if(status){
        if(!status.options.length)goalFilterStatuses.forEach(([id,label])=>appendOption(status,id,label));
        status.value=filter.status;
      }
    }
  }
  document.querySelectorAll('[data-filter-defaults]').forEach(panel=>{
    const scope=panel.dataset.filterDefaults;
    panel.querySelector('[data-profile-filter-custom]').addEventListener('change',event=>setDefaultFilter(scope,{custom:event.target.checked}));
    panel.querySelector('[data-profile-filter-category]').addEventListener('change',event=>setDefaultFilter(scope,{categoryId:event.target.value || null,activityIds:null}));
    panel.querySelector('[data-profile-filter-status]')?.addEventListener('change',event=>setDefaultFilter(scope,{status:event.target.value}));
  });
  function renderDefaultViewSettings(){
    goalPriorityChoices.forEach(input=>{input.checked=input.value===goalPriority;});
    document.querySelectorAll('[data-default-view]').forEach(group=>{
      const {defaultView,setting}=group.dataset;
      syncSegmentedSwitch(group,'value',defaultViews[defaultView][setting]);
    });
  }
  const preferencesDialog=$('#preferencesDialog');
  const saveToast=$('#saveToast');
  function bindSectionTabs(container,onSelect){
    const navigation=container.querySelector('[role=tablist]');
    const tabs=[...navigation.querySelectorAll('[role=tab]')];
    const narrow=matchMedia('(max-width:640px)');
    const content=container.querySelector('.preferences-content');
    function syncOrientation(){
      navigation.setAttribute('aria-orientation',narrow.matches?'horizontal':'vertical');
    }
    function select(selected,focus=false){
      tabs.forEach(tab=>{
        const active=tab===selected;
        tab.tabIndex=active?0:-1;
        tab.setAttribute('aria-selected',String(active));
        document.getElementById(tab.getAttribute('aria-controls')).hidden=!active;
      });
      content.scrollTop=0;
      onSelect?.(selected);
      if(focus)selected.focus({preventScroll:true});
    }
    tabs.forEach((tab,index)=>{
      tab.addEventListener('click',()=>select(tab));
      tab.addEventListener('keydown',event=>{
        const steps=narrow.matches?{ArrowLeft:-1,ArrowRight:1}:{ArrowUp:-1,ArrowDown:1};
        let next;
        if(event.key==='Home')next=0;
        else if(event.key==='End')next=tabs.length-1;
        else if(Object.hasOwn(steps,event.key))next=(index+steps[event.key]+tabs.length)%tabs.length;
        else return;
        event.preventDefault();
        select(tabs[next],true);
      });
    });
    narrow.addEventListener?.('change',syncOrientation);
    syncOrientation();
    return ()=>select(tabs[0],true);
  }
  const resetPreferencesTabs=bindSectionTabs(preferencesDialog,selected=>{
    if(selected.id==='preferencesCatalogTab')renderTrackingCatalog();
    if(selected.id==='preferencesViewsTab')renderDefaultFilterSettings();
    if(selected.id==='preferencesMemoryTab')renderViewMemorySettings();
  });
  bindSectionTabs($('#profileView'));
  $('#openPreferences').addEventListener('click',()=>{
    if(preferencesDialog.open)return;
    setAccountMenu(false,true);
    openCatalogCategories.clear();trackingCatalogSnapshot='';
    renderDefaultViewSettings();renderDefaultFilterSettings();applyGoalColors();
    preferencesDialog.showModal();
    resetPreferencesTabs();
  });
  $('#closePreferences').addEventListener('click',()=>preferencesDialog.close());
  preferencesDialog.addEventListener('close',()=>{
    if(preferencesDialog.open)return;
    accountToggle.focus({preventScroll:true});
  });
  function normalizeAvatar(value){
    return {useGoogle:value?.useGoogle!==false,initial:['both','last'].includes(value?.initial)?value.initial:'first'};
  }
  function renderAccountAvatar(){
    const user=currentAccount;
    const names=user?.displayName?.trim().split(/\s+/).filter(Boolean) || [];
    const initial=value=>Array.from(value || 'Y')[0].toLocaleUpperCase('fr');
    const first=initial(names[0] || user?.email),last=initial(names.at(-1) || user?.email);
    const both=names.length>1?first+last:first;
    const letter={first,last,both}[state.avatar.initial];
    const available=Boolean(user?.photoURL && user.photoURL!==failedAvatarUrl);
    const usePhoto=available && state.avatar.useGoogle;
    for(const prefix of ['account','profile']){
      const image=$('#'+prefix+'Avatar'),text=$('#'+prefix+'Initial');
      text.textContent=letter;text.hidden=usePhoto;
      image.hidden=!usePhoto;
      if(usePhoto){
        if(image.getAttribute('src')!==user.photoURL)image.src=user.photoURL;
      }else image.removeAttribute('src');
    }
    const option=$('#useGoogleAvatar');
    option.checked=usePhoto;option.disabled=!available;
    $('#profilePhotoUnavailable').hidden=available;
    $('#profileInitialChoice').hidden=usePhoto;
    $('#profileBothInitialsLabel').textContent='Initiales · '+both;
    $('#profileFirstInitialLabel').textContent='Prénom · '+first;
    $('#profileLastInitialLabel').textContent='Nom · '+last;
    document.querySelectorAll('[name=profileInitialSource]').forEach(input=>{input.checked=input.value===state.avatar.initial;});
  }
  let failedAvatarUrl;
  for(const id of ['#accountAvatar','#profileAvatar']){
    $(id).addEventListener('error',event=>{
      if(event.currentTarget.getAttribute('src')!==currentAccount?.photoURL)return;
      failedAvatarUrl=currentAccount.photoURL;renderAccountAvatar();
    });
  }
  $('#useGoogleAvatar').addEventListener('change',event=>{
    state.avatar.useGoogle=event.target.checked;renderAccountAvatar();persist();
  });
  document.querySelectorAll('[name=profileInitialSource]').forEach(input=>input.addEventListener('change',()=>{
    if(!input.checked)return;
    state.avatar.initial=input.value;renderAccountAvatar();persist();
  }));
  function renderProfile() {
    const user=currentAccount || {};
    $('#profileName').textContent=user.displayName || 'Votre compte';$('#profileEmail').textContent=user.email || '';
    $('#profileFullName').textContent=user.displayName || '—';$('#profileAccountEmail').textContent=user.email || '—';
    const verification=$('#profileEmailVerified');
    const verified=typeof user.emailVerified==='boolean';
    const badge=makeElement('span','profile-badge',verified?(user.emailVerified?'Vérifié':'Non vérifié'):'—');
    if(verified)badge.dataset.tone=user.emailVerified?'success':'pending';
    verification.replaceChildren(badge);
    renderProfileDevices();
    $('#profileCreated').textContent=formatDate(user.createdAt,true);$('#profileLastLogin').textContent=formatDate(user.lastLoginAt,true);
    const history=$('#loginHistory');history.replaceChildren();accountLogins.forEach(date=>{const item=document.createElement('li');item.append(profileRowLabel(formatDate(date,true),'clock'));history.append(item);});
    if(!accountLogins.length){const item=document.createElement('li');item.textContent='Aucune connexion enregistrée.';history.append(item);}
  }
  window.calendarApp.setAccount=(user,logins=[])=>{
    if(user?.uid!==currentAccount?.uid || !currentAccount || !user)demoDevices=user?[...sampleDevices]:[];
    if(user?.uid!==currentAccount?.uid || !user)failedAvatarUrl=undefined;
    currentAccount=user;accountLogins=logins;
    if(!user)$('#authGate').dataset.theme='system';
    $('#accountMenuName').textContent=user?.displayName || 'Votre compte';
    renderAccountAvatar();
    if(!user){
      if(preferencesDialog.open)preferencesDialog.close();
      clearTrackingCatalog();
      if(onboardingDialog.open)onboardingDialog.close();
      onboardingStatus=null;
      setPage('day',false);
    }else renderProfile();
  };

  // A single source of truth feeds every view and the Firebase write queue.
  let sectionLayout={folds:{},orders:{}};
  const periodOptions=[['day','Jour'],['week','Semaine'],['month','Mois'],['year','Année']];
  const calendarPeriods=periodOptions.map(([period])=>period);
  function normalizeDefaultViews(value={}){
    return Object.fromEntries(['activities','goals'].map(key=>[key,{
      period:calendarPeriods.includes(value?.[key]?.period)?value[key].period:'year',
      format:validFormat(value?.[key]?.format,'cards')
    }]));
  }
  let defaultViews=normalizeDefaultViews(),goalPriority='manual';
  const goalPriorityChoices=document.querySelectorAll('[name=goalPriority]');
  goalPriorityChoices.forEach(input=>input.addEventListener('change',()=>{
    if(!input.checked)return;
    goalPriority=input.value;render();
  }));
  const formatOptions=[...$('#activityFormats').children].map(button=>[
    button.dataset.activityFormat,button.getAttribute('aria-label'),button.querySelector('svg')
  ]);
  document.querySelectorAll('[data-default-view]').forEach(group=>{
    const {defaultView,setting}=group.dataset;
    const options=setting==='period'?periodOptions:formatOptions;
    options.forEach(([value,label,icon])=>{
      const button=makeButton(label,()=>{
        if(defaultViews[defaultView][setting]===value)return;
        defaultViews[defaultView][setting]=value;
        renderDefaultViewSettings();persist();
      });
      button.dataset.value=value;
      if(icon)button.prepend(icon.cloneNode(true));
      group.append(button);
    });
  });
  renderDefaultViewSettings();
  const goalFrequencyOptions=[['day','Quotidiens'],['week','Hebdomadaires'],['month','Mensuels'],['year','Annuels']];
  let activityFormat='cards',goalFormat='cards',goalFrequencyFilter=[];
  function normalizeGoalFrequencies(value){
    if(!Array.isArray(value))return [];
    const selected=goalFrequencyOptions.map(([period])=>period).filter(period=>value.includes(period));
    return selected.length===goalFrequencyOptions.length?[]:selected;
  }
  function selectedGoalFrequency(fallback='all'){
    return goalFrequencyFilter.length===1?goalFrequencyFilter[0]:fallback;
  }
  let calendarScope='activities';
  let calendarState={date:localDateKey(new Date()),period:'year',categoryId:null,activityIds:null,status:'all',frequencies:[]};
  function normalizeCalendarFilters(value){
    const {categoryId,activityIds,status}=normalizedFilter('goals',value);
    const activities=state.activities.filter(item=>item.categoryId===categoryId);
    return {categoryId,activityIds:allActivitiesSelected(activityIds,activities)?null:activityIds,status,frequencies:normalizeGoalFrequencies(value?.frequencies)};
  }
  periodOptions.forEach(([period,label])=>{
    const button=makeButton(label,()=>{calendarState.period=period;renderGoals();persist();});
    button.dataset.goalView=period;
    $('#historyViews').append(button);
  });
  let currentPage='day';
  let calendarView='year';
  let focusDate=localDateKey(new Date());
  let agendaDate=localDateKey(new Date());
  let agendaView='day';
  function makeButton(text,action,className='') {
    const button=document.createElement('button');button.type='button';button.textContent=text;button.className=className;
    const paths={'+':'M12 5v14M5 12h14','−':'M5 12h14','✎':'m4 16 12-12 4 4L8 20H4v-4Zm10-10 4 4'};
    if(paths[text]){button.classList.add('icon-control');button.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+paths[text]+'"/></svg>';}
    button.addEventListener('click',action);return button;
  }
  let numberFieldId=0;
  function withNumberStepper(input,eventType='input'){
    const label=input.closest('label');
    const field=document.createElement('div');field.className='number-field';
    const controls=document.createElement('div');controls.className='number-stepper';
    const name=input.getAttribute('aria-label') || label?.textContent.trim() || 'Valeur';
    const step=(direction)=>{
      const min=input.min===''?-Infinity:Number(input.min);
      const max=input.max===''?Infinity:Number(input.max);
      const current=input.value;
      if(input.step==='any'){
        const base=Number.isFinite(input.valueAsNumber)?input.valueAsNumber:Math.max(0,min);
        input.value=String(Math.max(min,Math.min(max,Math.round((base+direction)*1e8)/1e8)));
      }else if(direction>0)input.stepUp();else input.stepDown();
      if(input.value!==current)input.dispatchEvent(new Event(eventType,{bubbles:true}));
    };
    const minus=makeButton('−',()=>step(-1)),plus=makeButton('+',()=>step(1));
    minus.setAttribute('aria-label','Diminuer : '+name);
    plus.setAttribute('aria-label','Augmenter : '+name);
    if(label && label.contains(input)){
      input.id ||= 'number-field-'+(++numberFieldId);
      label.htmlFor=input.id;label.before(field);field.append(label,controls);
    }else{
      input.before(controls);controls.classList.add('number-stepper-inline');
    }
    controls.append(minus,input,plus);
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
  function calendarIsOpen(scope){
    return currentPage==='calendar' && calendarScope===scope;
  }
  function mountCalendarControls(){
    const scopes=[
      ['activities','#activityCalendarPanel','#activityControls','#activityPeriodControls','#activityDateControls','#activityFormats','#openCalendarActivity','#activitiesHeadingAction'],
      ['goals','#goalCalendarPanel','#goalControls','#goalPeriodControls','#goalDateControls','#goalFormats','#newGoalButton','#goalsHeadingAction']
    ];
    scopes.forEach(([scope,panelId,filtersId,periodId,dateId,formatsId,actionId,headingId])=>{
      const open=calendarIsOpen(scope);
      const filters=$(filtersId),period=$(periodId),date=$(dateId),action=$(actionId),home=$(headingId);
      const homeViews=$(formatsId).parentElement;
      const toolbar=open?$('#calendarToolbarMount'):homeViews.closest('.workspace-command-bar');
      const views=open?$('#calendarViewControls'):homeViews;
      if(filters.parentElement!==toolbar)toolbar.prepend(filters);
      if(period.parentElement!==toolbar)toolbar.insertBefore(period,views);
      period.hidden=scope==='goals' && !open;
      const dateMount=views.querySelector('.workspace-toolbar-date');
      if(date.parentElement!==dateMount)dateMount.append(date);
      const heading=open?$('#calendarHeadingAction'):home;
      if(action.parentElement!==heading)heading.append(action);
      $(panelId).hidden=calendarScope!==scope;
    });
    const scopeSwitch=$('#calendarScopes');
    syncSegmentedSwitch(scopeSwitch,'calendarScope',calendarScope);
  }
  document.querySelectorAll('[data-calendar-scope]').forEach(button=>button.addEventListener('click',()=>{
    if(calendarScope===button.dataset.calendarScope)return;
    calendarScope=button.dataset.calendarScope;
    mountCalendarControls();
    render();
  }));
  function setPage(page, scroll = true) {
    // Explicit navigation opens today; cloud refreshes preserve the day being edited.
    if(page==='day' && scroll){agendaDate=localDateKey(new Date());$('#dailyActivityFeedback').textContent='';}
    const changedPage=currentPage!==page;
    if(changedPage){
      hideCalendarPreview();activeDatePicker?.close();
      if(scroll && visitedWorkspacePages.has(page) && Object.hasOwn(memoryFields,page))resetUnrememberedView(page,'navigation');
    }
    visitedWorkspacePages.add(page);
    currentPage=page;
    document.querySelectorAll('[data-workspace-page]').forEach(section=>{section.hidden=section.dataset.workspacePage!==page;});
    document.querySelectorAll(':is(.page-nav,.account-menu) [data-page]').forEach(button=>{if(button.dataset.page===page)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
    
    if(changedPage || scroll)setAccountMenu(false);
    if(changedPage)document.querySelectorAll('.filter-drawer[open]').forEach(dialog=>dialog.close());
    mountCalendarControls();
    if(scroll && changedPage && ['calendar','activities','goals'].includes(page)){renderToolbar();renderCalendar();renderGoals();}
    if(page==='profile')renderProfile();
    if(page==='statistics')renderStatistics();
    renderWorkspace();persist();if(scroll)window.scrollTo({top:0,behavior:'smooth'});
  }
  document.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>{
    const fromDropdown=button.closest('.account-menu');
    setPage(button.dataset.page);
    if(fromDropdown){
      const heading=document.querySelector('[data-workspace-page="'+button.dataset.page+'"] h1');
      if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
    }
  }));
  function exportInterface(forStorage=false) {
    const keep=(page,field)=>!forStorage || viewMemory.reload[page][field];
    const goalFilters=keep('goals','filters');
    return {sectionLayout,defaultViews,goalPriority,filterPreferences,filtersUseDefaults,viewMemory,
      page:currentPage,...(onboardingStatus?{onboarding:onboardingStatus}:{}),
      ...(keep('activities','format')?{activityFormat}:{}),...(keep('goals','format')?{goalFormat}:{}),
      calendarScope:keep('calendar','scope')?calendarScope:'activities',
      ...(keep('activities','period')?{calendarView}:{}),...(keep('activities','date')?{focusDate}:{}),
      agendaDate,agendaView,...(keep('goals','date')?{goalReference}:{}),
      calendar:{
        ...(keep('calendar','date')?{date:calendarState.date}:{}),...(keep('calendar','period')?{period:calendarState.period}:{}),
        ...normalizeCalendarFilters(keep('calendar','filters')?calendarState:{})
      },
      goalCategoryFilter:goalFilters?goalCategoryFilter:null,goalStatusFilter:goalFilters?goalStatusFilter:'all',
      goalActivityFilter:goalFilters?goalActivityFilter:null,goalFrequencyFilter:keep('goals','period')?goalFrequencyFilter:[],
      journalCategory:$('#journalCategory').value,journalYear:$('#journalYear').value,journalSearch:$('#journalSearch').value,journalLimit,
      journalFiltersOpen:$('#journalFilters').open};
  }
  let onboardingStatus=null;
  function restoreInterface(value) {
    onboardingStatus=['pending','dismissed','complete'].includes(value.onboarding)?value.onboarding:null;
    const date=(input,fallback)=>/^\d{4}-\d{2}-\d{2}$/.test(input || '')?input:fallback;
    defaultViews=normalizeDefaultViews(value.defaultViews);
    goalPriority=['min','max'].includes(value.goalPriority)?value.goalPriority:'manual';
    filterPreferences=normalizeFilterPreferences(value.filterPreferences);
    viewMemory=normalizeViewMemory(value.viewMemory,value.filterPreferences?.remember!==false);
    renderViewMemorySettings();
    filtersUseDefaults={activities:value.filtersUseDefaults?.activities===true,goals:value.filtersUseDefaults?.goals===true};
    activityFormat=validFormat(value.activityFormat,defaultViews.activities.format);
    goalFormat=validFormat(value.goalFormat,defaultViews.goals.format);
    const layout=value.sectionLayout;sectionLayout={folds:layout?.folds && typeof layout.folds==='object' && !Array.isArray(layout.folds)?{...layout.folds}:{},orders:layout?.orders && typeof layout.orders==='object' && !Array.isArray(layout.orders)?Object.fromEntries(Object.entries(layout.orders).filter(([,ids])=>Array.isArray(ids)).map(([key,ids])=>[key,ids.filter(id=>typeof id==='string')])):{}};
    calendarView=calendarPeriods.includes(value.calendarView)?value.calendarView:defaultViews.activities.period;
    agendaView='day';
    focusDate=date(value.focusDate,localDateKey(new Date()));agendaDate=date(value.agendaDate,localDateKey(new Date()));goalReference=date(value.goalReference,'');
    goalCategoryFilter=value.goalCategoryFilter || null;goalActivityFilter=Array.isArray(value.goalActivityFilter)?value.goalActivityFilter:null;goalStatusFilter=goalFilterStatuses.some(([id])=>id===value.goalStatusFilter)?value.goalStatusFilter:'all';
    goalFrequencyFilter=normalizeGoalFrequencies(value.goalFrequencyFilter);
    $('#journalSearch').value=typeof value.journalSearch==='string'?value.journalSearch:'';
    journalLimit=Number.isInteger(value.journalLimit)&&value.journalLimit>=40?value.journalLimit:40;
    // Populate options first so native selects retain the restored values.
    syncCategoryOptions($('#journalCategory'));$('#journalCategory').value=value.journalCategory || '';
    renderJournal();$('#journalYear').value=value.journalYear || 'all';
    $('#journalFilters').open=value.journalFiltersOpen!==false;
    if(preferencesDialog.open){renderDefaultViewSettings();renderDefaultFilterSettings();}
    let page=value.page;
    calendarScope=value.calendarScope==='goals'?'goals':'activities';
    // Older saves used the activity page for both the records and the calendar.
    if(!value.calendarScope){
      if(page==='calendar' && (value.activityFormat || value.defaultViews?.activities?.format || 'calendar')!=='calendar')page='activities';
      if(page==='goals' && (value.goalFormat || value.defaultViews?.goals?.format || 'calendar')==='calendar'){
        page='calendar';
        calendarScope='goals';
      }
    }
    const legacyCalendar=calendarScope==='goals'
      ?{date:goalReference,period:value.historyView,categoryId:goalCategoryFilter,activityIds:goalActivityFilter,status:goalStatusFilter}
      :{date:calendarDateForYear(),period:calendarView,categoryId:state.activeCategory,activityIds:state.selectedActivities};
    // Before the scopes shared state, the selected scope supplied the calendar settings.
    const calendar=value.calendar ?? legacyCalendar;
    calendarState={date:date(calendar.date,localDateKey(new Date())),period:calendarPeriods.includes(calendar.period)?calendar.period:defaultViews.activities.period,...normalizeCalendarFilters(calendar)};
    setPage(['calendar','activities','day','goals','profile','journal','statistics','components'].includes(page)?page:'day',false);
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
  function activityReference(){return currentPage==='calendar'?calendarState.date:calendarDateForYear();}
  function activityPeriod(){return currentPage==='calendar'?calendarState.period:calendarView;}
  function setActivityView(date,period){
    if(currentPage==='calendar')Object.assign(calendarState,{date,period});
    else{focusDate=date;calendarView=period;state.year=Number(date.slice(0,4));}
    render();
  }
  document.querySelectorAll('[data-calendar-view]').forEach(button=>button.addEventListener('click',()=>setActivityView(activityReference(),button.dataset.calendarView)));
  function navigateCalendar(direction) {setActivityView(shiftDate(activityReference(),activityPeriod(),direction),activityPeriod());}
  $('#previousPeriod').addEventListener('click',()=>navigateCalendar(-1));
  $('#nextPeriod').addEventListener('click',()=>navigateCalendar(1));
  $('#todayPeriod').addEventListener('click',()=>setActivityView(localDateKey(new Date()),activityPeriod()));
  document.querySelectorAll('[data-agenda-view]').forEach(button=>button.addEventListener('click',()=>{agendaView=button.dataset.agendaView;renderWorkspace();persist();}));
  $('#agendaDate').addEventListener('change',()=>{if($('#agendaDate').value){agendaDate=$('#agendaDate').value;renderWorkspace();persist();}});
  $('#agendaPrevious').addEventListener('click',()=>{agendaDate=shiftDate(agendaDate,agendaView,-1);renderWorkspace();persist();});
  $('#agendaNext').addEventListener('click',()=>{agendaDate=shiftDate(agendaDate,agendaView,1);renderWorkspace();persist();});
  $('#agendaToday').addEventListener('click',()=>{agendaDate=localDateKey(new Date());renderWorkspace();persist();});
  let activeDatePicker;
  let datePickerId=0;
  const datePeriodNames={day:'une date',week:'une semaine',month:'un mois',year:'une année'};
  const datePickerWeekdays=['Lun.','Mar.','Mer.','Jeu.','Ven.','Sam.','Dim.'];

  document.addEventListener('click',event=>{
    if(activeDatePicker && !event.composedPath().some(node=>node===activeDatePicker.trigger || node===activeDatePicker.panel))activeDatePicker.close();
  });
  document.addEventListener('keydown',event=>{
    if(!activeDatePicker || event.key!=='Escape')return;
    event.preventDefault();event.stopImmediatePropagation();activeDatePicker.close(true);
  },true);
  function positionActiveDatePicker(event){
    if(activeDatePicker && !activeDatePicker.panel.contains(event.target instanceof Node?event.target:document.body))activeDatePicker.position();
  }
  window.addEventListener('resize',positionActiveDatePicker);
  window.addEventListener('scroll',positionActiveDatePicker,true);

  function weekNumber(monday){
    const thursday=shiftDate(monday,'day',3);
    const [firstMonday]=periodBounds(thursday.slice(0,4)+'-01-04','week');
    return 1+Math.round((Date.parse(monday)-Date.parse(firstMonday))/604800000);
  }

  function bindDatePicker(trigger,input,{optional=false,eventType='change'}={}){
    const panel=makeElement('div','date-picker');
    panel.id='datePicker-'+(++datePickerId);panel.hidden=true;panel.setAttribute('role','dialog');
    const topLayer=typeof panel.showPopover==='function';
    if(topLayer)panel.setAttribute('popover','manual');
    input.hidden=true;trigger.classList.add('date-control');
    trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',panel.id);
    trigger.setAttribute('aria-haspopup','dialog');
    trigger.after(panel);
    let cursor,period,view;

    function position(){
      if(panel.hidden)return;
      const anchor=trigger.getBoundingClientRect();
      if(!anchor.width && !anchor.height && topLayer){close();return;}
      const viewportWidth=document.documentElement.clientWidth || window.innerWidth;
      const viewportHeight=document.documentElement.clientHeight || window.innerHeight;
      const gap=8,panelWidth=panel.offsetWidth;
      const below=viewportHeight-anchor.bottom-gap*2,above=anchor.top-gap*2;
      const flip=panel.scrollHeight>below && above>below;
      panel.style.maxHeight=Math.max(0,flip?above:below)+'px';
      panel.style.left=Math.max(gap,Math.min(anchor.left+(anchor.width-panelWidth)/2,viewportWidth-panelWidth-gap))+'px';
      panel.style.top=(flip?Math.max(gap,anchor.top-gap-panel.offsetHeight):anchor.bottom+gap)+'px';
    }
    function close(returnFocus=false){
      if(topLayer && panel.matches(':popover-open'))panel.hidePopover();
      panel.hidden=true;trigger.setAttribute('aria-expanded','false');
      if(activeDatePicker?.trigger===trigger)activeDatePicker=null;
      if(returnFocus)trigger.focus({preventScroll:true});
    }
    function choose(date){
      close(true);
      input.value=date;
      input.dispatchEvent(new Event(eventType,{bubbles:true}));
    }
    function choosePeriod(date){
      if(view===period){choose(date);return;}
      cursor=date;
      view=view==='year'?'month':period;
      renderPicker();
    }
    function renderPicker(focusSelector){
      const [year,month]=cursor.split('-').map(Number);
      const pageStart=1000+Math.floor((year-1000)/12)*12;
      const step=view==='year'?12:1;
      const unit=view==='year' || view==='month'?'year':'month';
      const title=view==='year'?pageStart+' – '+Math.min(pageStart+11,9999):periodLabel(cursor,unit);
      const heading=makeElement('div','date-picker-heading');
      const navigate=direction=>{
        const button=makeButton('',()=>{
          cursor=shiftDate(cursor,unit,direction*step);
          renderPicker('[data-picker-step="'+direction+'"]');
        },'period-arrow');
        button.innerHTML=catalogIcon('chevron');
        button.dataset.pickerStep=direction;
        button.setAttribute('aria-label',direction<0?'Période précédente':'Période suivante');
        const targetYear=Number(shiftDate(cursor,unit,direction*step).split('-')[0]);
        button.disabled=targetYear<1000 || targetYear>9999;
        return button;
      };
      const titleControl=view==='year'?makeElement('strong',null,title):makeButton(title,()=>{
        view=view==='month'?'year':'month';
        renderPicker();
      },'date-picker-jump');
      if(view!=='year')titleControl.setAttribute('aria-label',title+' · '+(view==='month'?'Choisir une année':'Choisir un mois'));
      heading.append(navigate(-1),titleControl,navigate(1));
      const grid=makeElement('div','date-picker-options');
      grid.dataset.pickerView=view;
      const columns=view==='day'?7:view==='week'?1:3;
      const applied=input.value;
      const today=localDateKey(new Date());
      const option=(date,text,label,extraClass='')=>{
        if(!/^\d{4}-/.test(date))return;
        const button=makeButton(text,()=>choosePeriod(date),'date-picker-option '+extraClass);
        const selected=Boolean(applied) && periodBounds(applied,view)[0]===periodBounds(date,view)[0];
        button.dataset.pickDate=date;button.tabIndex=-1;
        button.setAttribute('aria-label',label);button.setAttribute('aria-pressed',String(selected));
        if(view==='day' && date===today)button.setAttribute('aria-current','date');
        grid.append(button);
      };
      if(view==='year'){
        for(let i=0;i<12 && pageStart+i<=9999;i++){
          const value=pageStart+i;
          option(shiftDate(cursor,'year',value-year),String(value),String(value));
        }
      }else if(view==='month'){
        MONTHS.forEach((name,index)=>option(shiftDate(cursor,'month',index+1-month),name,name+' '+year));
      }else{
        const first=dateKey(year,month-1,1);
        const offset=getMondayFirstDay(year,month-1);
        const count=daysInMonth(year,month-1)+offset;
        if(view==='day'){
          datePickerWeekdays.forEach(name=>grid.append(makeElement('span','date-picker-weekday',name)));
          for(let i=0;i<Math.ceil(count/7)*7;i++){
            const date=shiftDate(first,'day',i-offset);
            option(date,String(Number(date.slice(-2))),formatDate(date),date.slice(0,7)===first.slice(0,7)?'':'adjacent-month');
          }
        }else{
          for(let row=0;row<Math.ceil(count/7);row++){
            const date=shiftDate(first,'day',row*7-offset);
            const label='Semaine '+weekNumber(date);
            option(date,periodLabel(date,'week'),label+' · '+periodLabel(date,'week'));
            const button=grid.lastElementChild;
            if(button?.dataset.pickDate===date)button.prepend(makeElement('strong',null,label));
          }
        }
      }
      const footer=makeElement('div','date-picker-footer');
      footer.append(makeButton(period==='year'?'Cette année':period==='month'?'Ce mois-ci':period==='week'?'Cette semaine':'Aujourd’hui',()=>choose(today),'today-button'));
      if(optional)footer.append(makeButton('Effacer la date',()=>choose(''),'text-button'));
      panel.replaceChildren(heading,grid,footer);
      const options=[...grid.querySelectorAll('button')];
      const setTabStop=button=>{options.forEach(item=>{item.tabIndex=item===button?0:-1;});};
      const firstChoice=grid.querySelector('[aria-pressed=true]') || options.find(b=>!b.classList.contains('adjacent-month'));
      setTabStop(firstChoice);
      grid.addEventListener('keydown',event=>{
        const index=options.indexOf(event.target);
        const directions={ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns};
        if(index<0 || !(event.key in directions))return;
        event.preventDefault();
        const next=options[index+directions[event.key]];
        if(next){setTabStop(next);next.focus();}
      });
      position();
      const nextFocus=(focusSelector && panel.querySelector(focusSelector+':enabled')) || firstChoice;
      nextFocus?.focus({preventScroll:true});
    }
    function open(){
      if(!panel.hidden){close();return;}
      hideCalendarPreview();
      activeDatePicker?.close();
      period=trigger.dataset.datePeriod || 'day';view=period;
      cursor=input.value || localDateKey(new Date());
      activeDatePicker={trigger,panel,close,position};
      panel.setAttribute('aria-label','Choisir '+datePeriodNames[period]);
      panel.hidden=false;
      if(topLayer)panel.showPopover();
      trigger.setAttribute('aria-expanded','true');
      renderPicker();
    }
    trigger.addEventListener('click',open);
    trigger.addEventListener('keydown',event=>{
      if(event.key==='ArrowDown' && panel.hidden){event.preventDefault();open();}
    });
    trigger.closest('dialog')?.addEventListener('close',()=>close());
  }

  function bindDateNavigation(triggerId,inputId,options){
    bindDatePicker($('#'+triggerId),$('#'+inputId),options);
  }
  function updateDateNavigation(triggerId,inputId,date,period){
    setDateControl($('#'+triggerId),$('#'+inputId),date,period);
  }
  function setDateControl(trigger,input,date,period='day'){
    if(activeDatePicker?.trigger===trigger && (input.value!==date || trigger.dataset.datePeriod!==period))activeDatePicker.close();
    const label=date?periodLabel(date,period):'Choisir une date';
    trigger.textContent=label;trigger.dataset.datePeriod=period;
    trigger.setAttribute('aria-label','Choisir '+datePeriodNames[period]+(date?' · '+label:''));
    if(date){
      const [year,month,day]=date.split('-');
      const [,weekMonth,weekDay]=period==='week'?periodBounds(date,'week')[0].split('-'):[];
      trigger.dataset.compactLabel={year,month:MONTHS[Number(month)-1].slice(0,3)+' '+year.slice(-2),week:weekDay+'/'+weekMonth,day:day+'/'+month}[period];
    }
    const today=localDateKey(new Date());
    if(date && periodBounds(date,period)[0]===periodBounds(today,period)[0])trigger.setAttribute('aria-current','date');
    else trigger.removeAttribute('aria-current');
    input.value=date;
  }
  bindDateNavigation('periodLabel','calendarDateInput');
  bindDateNavigation('agendaDateLabel','agendaDate');
  bindDateNavigation('goalDateLabel','globalGoalDate');
  $('#calendarDateInput').addEventListener('change',event=>{
    if(event.target.value)setActivityView(event.target.value,activityPeriod());
  });
  function validFormat(format,fallback) {return ['cards','list'].includes(format)?format:fallback;}
  function addCompactSwitch(group){
    const buttons=[...group.querySelectorAll('button')],select=document.createElement('select');
    select.className='workspace-compact-switch';
    select.setAttribute('aria-label',group.getAttribute('aria-label'));
    buttons.forEach((button,index)=>appendOption(select,String(index),button.textContent.trim()));
    select.addEventListener('change',()=>buttons[select.selectedIndex].click());
    group.after(select);
  }
  function updateSegmentIndicator(group){
    const selected=group.querySelector('button[aria-pressed=true]');
    if(!selected || selected.offsetParent!==group)return;
    group.style.setProperty('--segment-x',selected.offsetLeft+'px');
    group.style.setProperty('--segment-y',selected.offsetTop+'px');
    group.style.setProperty('--segment-width',selected.offsetWidth+'px');
    group.style.setProperty('--segment-height',selected.offsetHeight+'px');
    group.classList.add('has-segment-indicator');
  }
  function syncSegmentedSwitch(group,key,value){
    for(const button of group.children){
      button.setAttribute('aria-pressed',String(button.dataset[key]===value));
    }
    updateSegmentIndicator(group);
  }
  if(typeof ResizeObserver==='function'){
    const segmentObserver=new ResizeObserver(entries=>{
      const groups=new Set(entries.map(({target})=>target.matches('button')?target.parentElement:target));
      groups.forEach(updateSegmentIndicator);
    });
    document.querySelectorAll('#calendarScopes,#activityFormats,#goalFormats,#activityViews,#historyViews,[data-default-view]').forEach(group=>{
      segmentObserver.observe(group);
      for(const button of group.children)segmentObserver.observe(button);
    });
  }
  function syncCompactSwitch(group){
    group.nextElementSibling.selectedIndex=[...group.querySelectorAll('button')].findIndex(button=>button.getAttribute('aria-pressed')==='true');
  }
  ['#activityViews','#historyViews'].forEach(id=>addCompactSwitch($(id)));
  function syncFormatButtons(scope,format) {
    const group=$('#'+scope+'Formats');
    syncSegmentedSwitch(group,scope+'Format',format);
  }
  document.querySelectorAll('[data-activity-format]').forEach(button=>button.addEventListener('click',()=>{
    activityFormat=button.dataset.activityFormat;render();
  }));
  document.querySelectorAll('[data-goal-format]').forEach(button=>button.addEventListener('click',()=>{
    goalFormat=button.dataset.goalFormat;renderGoals();persist();
  }));
  function appendTileEditIndicator(tile){
    const edit=makeElement('span','tile-edit-indicator');
    edit.setAttribute('aria-hidden','true');
    edit.innerHTML='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m14 6 4 4M4 20l4-.8L20 7l-4-4L4 15z"/></svg>';
    tile.append(edit);
  }
  // Open the record editor without intercepting actions inside the record.
  function makeEditableRecord(row,open,label,className='editable-list-row'){
    row.classList.add(className);
    row.tabIndex=0;
    row.setAttribute('aria-label',label);
    const interactive='button,a,input,select,textarea,label,[role="button"],[contenteditable="true"]';
    row.addEventListener('click',event=>{
      const control=event.target.closest(interactive);
      if(control && control!==row)return;
      open();
    });
    row.addEventListener('keydown',event=>{
      if(event.target!==row || !['Enter',' '].includes(event.key))return;
      event.preventDefault();
      open();
    });
  }
  function listTable(container,name,columns){
    const frame=document.createElement('div');frame.className='list-table-frame';
    frame.tabIndex=0;frame.setAttribute('role','region');frame.setAttribute('aria-label',name);
    const table=document.createElement('table');table.className='list-table';table.setAttribute('aria-label',name);
    const head=table.createTHead().insertRow();
    columns.forEach(label=>{const cell=document.createElement('th');cell.scope='col';cell.textContent=label;head.append(cell);});
    const body=table.createTBody();frame.append(table);container.append(frame);return body;
  }
  function rowLabel(row,primary,secondary){
    const label=document.createElement('th');label.scope='row';
    const name=document.createElement('strong');name.textContent=primary;label.append(name);
    if(secondary){const subtitle=document.createElement('small');subtitle.textContent=secondary;label.append(subtitle);}
    row.append(label);
  }
  function renderGoalTable(root,targets,period){
    const body=listTable(root,'Liste des objectifs',['Objectif','Progression','État','Actions']);
    body.closest('table').classList.add('objective-list-table');
    body.dataset.goalPeriod=period;
    targets.forEach(({item,parent,category,goal,ids})=>{
      const result=goalProgress(ids,goal,goalReference);
      const row=body.insertRow();row.dataset.goalId=goal.id;row.dataset.tone=result.tone;
      makeEditableRecord(row,()=>openGoalEditor(item.id,goal.id),'Modifier l’objectif : '+item.name);
      rowLabel(row,category?categoryLabel(item):item.name,[category?null:parent?.name,goalDescription(goal)].filter(Boolean).join(' · '));
      const progress=row.insertCell();progress.className='list-progress';
      const value=document.createElement('span');value.className='list-progress-value';
      value.textContent=measureValue(result.count,goal)+' / '+measureValue(goal.target,goal)+(goal.unit==='count'?'':' '+unitLabel(goal));
      const indicator=createProgress(result,goal,true);
      progress.append(indicator,value);
      animateGoalProgress(indicator,result,goal,goal.id,'goals',goalReference);
      const badge=document.createElement('span');badge.className='list-status';badge.dataset.tone=result.tone;badge.textContent=result.status;
      row.insertCell().append(badge);
      const actions=document.createElement('div');actions.className='list-actions';
      const edit=makeButton('✎',()=>openGoalEditor(item.id,goal.id),'list-action');edit.setAttribute('aria-label','Modifier l’objectif de '+item.name);edit.title=edit.getAttribute('aria-label');
      actions.append(dailyGoalControls(item,goal,result,ids.filter(id=>goalActivityFilter===null||goalActivityFilter.includes(id)),goalReference,category,false),edit);
      row.insertCell().append(actions);
    });
  }
  const statsMetrics={count:'Occurrences',days:'Jours actifs',distance:'Distance',minutes:'Durée'};
  let statsYear=null,statsMetric='count',statsCategoryId=null,statsActivityIds=null,statsDay=null;
  const expandedStatsCategories=new Set();

  function resetStatsFilters(){
    statsCategoryId=null;statsActivityIds=null;
    renderStatistics();
  }
  function renderStatsFilters(){
    const categoryGroup=$('#statsCategoryChoices'),activityGroup=$('#statsActivityChoices');
    if(!categories.some(category=>category.id===statsCategoryId))statsCategoryId=null;
    const activities=state.activities.filter(activity=>!statsCategoryId || activity.categoryId===statsCategoryId);
    if(statsActivityIds!==null)statsActivityIds=statsActivityIds.filter(id=>activities.some(activity=>activity.id===id));
    categoryGroup.replaceChildren();
    [null,...categories].forEach(category=>{
      const id=category?.id ?? null;
      const button=filterChip(category?categoryLabel(category):'Toutes',statsCategoryId===id,()=>{
        if(statsCategoryId===id)return;
        const focused=document.activeElement===button;
        statsCategoryId=id;statsActivityIds=null;
        renderStatistics();
        if(focused)categoryGroup.querySelector('[aria-pressed=true]').focus({preventScroll:true});
      });
      button.dataset.statsCategory=id ?? '';
      categoryGroup.append(button);
    });
    activityGroup.replaceChildren();
    const all=allActivitiesSelected(statsActivityIds,activities);
    const master=filterChip('Toutes',all,()=>{
      statsActivityIds=all?[]:null;
      rerenderActivityFilter(activityGroup,'all',renderStatistics);
    });
    master.dataset.activityFilter='all';master.disabled=!activities.length;
    activityGroup.append(master);
    const selected=new Set(statsActivityIds ?? activities.map(activity=>activity.id));
    activities.forEach(activity=>{
      const button=filterChip(activity.name,selected.has(activity.id),()=>{
        if(!selected.delete(activity.id))selected.add(activity.id);
        statsActivityIds=selected.size===activities.length?null:[...selected];
        rerenderActivityFilter(activityGroup,activity.id,renderStatistics);
      });
      button.dataset.activityFilter=activity.id;activityGroup.append(button);
    });
    renderFilterButtonState('stats',[statsCategoryId,!all]);
    return selected;
  }
  function makeElement(tag,className,text){
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined)node.textContent=text;
    return node;
  }
  const statNumber=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1});
  function statValue(metric,value){
    if(metric==='minutes'){
      const rounded=Math.round(value);
      return rounded<60?rounded+' min':Math.floor(rounded/60)+' h'+(rounded%60?' '+pad(rounded%60):'');
    }
    return statNumber.format(value)+(metric==='distance'?' km':'');
  }
  function statSection(root,id,title,description){
    const section=makeElement('section','stats-section'),heading=makeElement('h2',null,title);
    heading.id=id;section.setAttribute('aria-labelledby',id);section.append(heading);
    if(description)section.append(makeElement('p','stats-description',description));
    root.append(section);return section;
  }
  function statTotals(){return {count:0,distance:0,minutes:0,dates:new Set()};}
  function statSum(bucket,date,detail){
    bucket.count+=Number(detail?.count) || 1;bucket.distance+=Number(detail?.distance) || 0;bucket.minutes+=Number(detail?.durationMinutes) || 0;
    bucket.dates.add(date);
  }
  function activityStatistics(entries,categoryId,activityIds,start,through,previousMonth){
    const byActivity=new Map(state.activities.filter(a=>activityIds.has(a.id))
      .map(activity=>[activity.id,{activity,...statTotals(),weeks:new Set()}]));
    const byCategory=new Map(categories.filter(c=>!categoryId || c.id===categoryId).map(category=>[category.id,{category,...statTotals(),records:[]}]));
    const year=statTotals(),months=MONTHS.map(statTotals),countsByDate=new Map();
    let previousCount=0;
    entries.forEach(([date,ids])=>{
      if(date>through)return;
      const inYear=date>=start,wasPrevious=date.startsWith(previousMonth);
      if(!inYear && !wasPrevious)return;
      ids.forEach(id=>{
        const record=byActivity.get(id);if(!record)return;
        const detail=state.details[date]?.[id];
        if(wasPrevious)previousCount+=Number(detail?.count) || 1;
        if(!inYear)return;
        statSum(year,date,detail);statSum(months[Number(date.slice(5,7))-1],date,detail);statSum(record,date,detail);
        const category=byCategory.get(record.activity.categoryId);
        if(category){
          statSum(category,date,detail);
          category.records.push({date,activity:record.activity,detail});
        }
        countsByDate.set(date,(countsByDate.get(date)||0)+(Number(detail?.count)||1));
        record.weeks.add(periodBounds(date,'week')[0]);
      });
    });
    const ranked=[...byActivity.values()].filter(item=>item.count).sort((a,b)=>b.count-a.count);
    ranked.forEach(item=>{
      let longest=0,run=0,previous='';
      [...item.weeks].sort().forEach(week=>{
        run=previous && shiftDate(previous,'week',1)===week?run+1:1;
        longest=Math.max(longest,run);previous=week;
      });
      item.longest=longest;
    });
    return {year,months,previousCount,ranked,countsByDate,categories:[...byCategory.values()].sort((a,b)=>b.count-a.count)};
  }
  const goalPeriodLabels={day:'Quotidiens',week:'Hebdomadaires',month:'Mensuels',year:'Annuels'};
  function blankGoalStats(){return {met:0,missed:0,open:0};}
  function goalStatistics(entries,categoryId,activityIds,firstDay,lastDay,today){
    const total=blankGoalStats(),byPeriod=new Map(Object.keys(goalPeriodLabels).map(period=>[period,blankGoalStats()]));
    const byCategory=new Map(),outcomesByDate=new Map();
    let configured=0;
    filteredGoalTargets(categoryId,activityIds).forEach(({goal,ids,parent,item})=>{
      if(goalStartsAfter(goal,lastDay))return;
      configured++;
      const category=byCategory.get(parent.id) || {category:parent,...blankGoalStats()};
      byCategory.set(parent.id,category);
      const counts=goalCountsByPeriod(ids,goal,today,entries);
      const first=goalStartsAfter(goal,firstDay)?goal.startDate:firstDay;
      let [start,end]=periodBounds(first,goal.period);
      // Assign a finished period to the year in which it ends.
      while(end<=lastDay && start<=today){
        const result=evaluateGoal(goal,counts.get(start)||0,start,end,today);
        if(result.tone!=='future' && result.tone!=='empty'){
          const outcome=end>=today?'open':result.tone==='danger'?'missed':'met';
          total[outcome]++;byPeriod.get(goal.period)[outcome]++;category[outcome]++;
          if(end<=today){
            if(!outcomesByDate.has(end))outcomesByDate.set(end,[]);
            outcomesByDate.get(end).push({...result,goal,name:item.name});
          }
        }
        [start,end]=periodBounds(shiftDate(end,'day',1),goal.period);
      }
    });
    return {total,byPeriod,byCategory,configured,outcomesByDate};
  }
  function statCard(label,value,detail){
    const card=makeElement('div','stats-kpi');
    card.append(makeElement('span',null,label),makeElement('strong',null,value));
    if(detail)card.append(makeElement('small',null,detail));
    return card;
  }
  function statRow(label,text,value,total,results=false){
    const row=makeElement('li','stats-breakdown-row'),title=makeElement('div','stats-breakdown-title');
    title.append(makeElement('strong',null,label),makeElement('span',null,text));
    const bar=makeElement('div','stats-bar'+(results && total?' stats-result-bar':''));
    bar.setAttribute('aria-hidden','true');
    const fill=makeElement('span');fill.style.width=(total?value/total*100:0)+'%';bar.append(fill);
    row.append(title,bar);return row;
  }
  function occurrenceLabel(count){
    return statNumber.format(count)+(count===1?' occurrence':' occurrences');
  }
  function statsCategoryRow({category,count,records},total){
    const row=makeElement('li','stats-category-row'),details=makeElement('details','stats-category-details');
    const summary=makeElement('summary','stats-category-summary');
    row.dataset.categoryId=category.id;
    const name=makeElement('strong',null,categoryLabel(category));
    const countLabel=makeElement('span','stats-category-count',occurrenceLabel(count));
    const share=makeElement('span','stats-category-share',statNumber.format(count/total*100)+' %');
    const track=makeElement('span','stats-bar'),fill=makeElement('span');
    track.setAttribute('aria-hidden','true');fill.style.width=(count/total*100)+'%';track.append(fill);
    share.prepend(track);
    const chevron=makeElement('span','catalog-chevron');chevron.innerHTML=catalogIcon('chevron');
    if(count)summary.append(chevron,name,countLabel,share);
    else{
      const empty=makeElement('div','stats-category-summary stats-category-empty');
      empty.append(chevron,name,countLabel,share);row.append(empty);return row;
    }
    details.append(summary);row.append(details);
    details.open=expandedStatsCategories.has(category.id);
    function showRecords(){
      const body=listTable(details,'Occurrences de '+category.name,['Activité','Date','Occurrences','Distance','Durée']);
      body.closest('table').classList.add('stats-category-table');
      [...records].sort((a,b)=>b.date.localeCompare(a.date)||a.activity.name.localeCompare(b.activity.name,'fr')).forEach(({date,activity,detail})=>{
        const entry=body.insertRow(),when=makeElement('time',null,formatDate(date));
        when.dateTime=date;
        rowLabel(entry,activity.name,detail?.note);
        entry.querySelector('strong').style.setProperty('--stats-activity-color',activity.color);
        entry.insertCell().append(when);
        entry.insertCell().textContent=statNumber.format(Number(detail?.count)||1);
        entry.insertCell().textContent=detail?.distance==null?'—':statValue('distance',detail.distance);
        entry.insertCell().textContent=detail?.durationMinutes==null?'—':statValue('minutes',detail.durationMinutes);
      });
    }
    if(details.open)showRecords();
    details.addEventListener('toggle',()=>{
      if(!details.isConnected)return;
      if(!details.open){expandedStatsCategories.delete(category.id);return;}
      expandedStatsCategories.add(category.id);
      if(details.childElementCount===1)showRecords();
    });
    return row;
  }
  function renderStatsHeatmap(root,first,last,today,outcomesByDate,countsByDate){
    const section=makeElement('section','stats-goal-calendar');
    section.id='statsHeatmap';
    section.setAttribute('aria-label','Bilan annuel des objectifs');
    root.append(section);
    const frame=makeElement('div','stats-heatmap-frame'),grid=makeElement('div','stats-heatmap-grid');
    grid.setAttribute('role','group');grid.setAttribute('aria-label','Jours de l’année');
    const offset=(new Date(first+'T12:00:00').getDay()+6)%7;
    const formatDay=new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const days=[];
    [['Lun',2],['Mer',4],['Ven',6]].forEach(([label,row])=>{
      const day=makeElement('span','stats-heatmap-axis',label);
      day.style.gridRow=row;day.setAttribute('aria-hidden','true');grid.append(day);
    });
    function selectDay(index){
      grid.querySelector('[aria-pressed=true]')?.setAttribute('aria-pressed','false');
      grid.querySelector('[tabindex="0"]')?.setAttribute('tabindex','-1');
      const {button,date}=days[index];
      statsDay=date;button.tabIndex=0;button.setAttribute('aria-pressed','true');
    }
    for(let date=first;date<=last;date=shiftDate(date,'day',1)){
      const index=days.length,position=index+offset,column=2+Math.floor(position/7);
      if(date.endsWith('-01')){
        const month=makeElement('span','stats-heatmap-axis',MONTHS[Number(date.slice(5,7))-1].slice(0,3));
        month.style.gridColumn=column;month.style.gridRow=1;month.setAttribute('aria-hidden','true');grid.append(month);
      }
      const rows=outcomesByDate.get(date) || [],count=countsByDate.get(date) || 0;
      let {tone,label}=date>today?{tone:'future',label:'À venir'}:summarizeGoalOutcomes(rows,date===today);
      if(tone==='empty')label='Aucun objectif évalué ce jour';
      if(tone==='danger' && !rows.some(row=>row.goal.mode==='max' && row.tone==='danger') &&
          rows.some(row=>row.goal.mode==='min' && row.count>0)){
        tone='warning';label='Progression partielle · '+label;
      }
      const button=makeButton('',()=>{selectDay(index);showCalendarPreview(button);},'stats-heatmap-day');
      button.dataset.date=date;button.dataset.previewDate=date;button.dataset.tone=tone;button.tabIndex=-1;
      button.style.gridColumn=column;button.style.gridRow=2+position%7;
      const formattedDate=formatDay.format(new Date(date+'T12:00:00'));
      button.setAttribute('aria-label',formattedDate+' · '+label+' · '+occurrenceLabel(count));
      button.setAttribute('aria-pressed','false');
      goalCalendarPreviews.set(button,()=>({scope:'day',rows,statistics:{label,tone,count}}));
      grid.append(button);days.push({button,date});
    }
    grid.style.setProperty('--stats-weeks',Math.ceil((days.length+offset)/7));
    const currentDay=days.findIndex(({date})=>date===statsDay);
    selectDay(currentDay>=0?currentDay:days.findIndex(({date})=>date===(today<last?today:last)));
    grid.addEventListener('keydown',event=>{
      if(!event.target.matches('.stats-heatmap-day'))return;
      const steps={ArrowLeft:-7,ArrowRight:7,ArrowUp:-1,ArrowDown:1};
      if(!(event.key in steps))return;
      event.preventDefault();
      const index=days.findIndex(({button})=>button===event.target)+steps[event.key];
      if(days[index]){
        selectDay(index);days[index].button.focus();
        showCalendarPreview(days[index].button);
      }
    });
    bindCalendarPreview(grid,false);
    frame.append(grid);
    const legend=goalOutcomeLegend('Légende du bilan annuel'),empty=makeElement('span',null,'Sans objectif évalué');
    empty.dataset.tone='empty';legend.append(empty);
    const disclosure=makeElement('details','stats-legend');
    const legendButton=makeElement('summary',null,'Légende');
    disclosure.append(legendButton,legend);
    section.append(frame,disclosure);
  }
  function renderStatsGoals(root,result){
    const section=statSection(root,'statsGoals','Objectifs tenus','Une période est comptée à sa clôture. Les limites respectées et les minima atteints sont des réussites.');
    if(!result.configured){appendWorkspaceEmpty(section,'Aucun objectif pour cette année','Les objectifs apparaissent à partir de leur date de début.','goals');return;}
    const {met,missed,open}=result.total,closed=met+missed,rate=closed?Math.round(met/closed*100):null;
    const panel=makeElement('div','stats-goal-overview'),ring=makeElement('div','stats-goal-ring'),scores=makeElement('div','stats-goal-scores');
    ring.style.setProperty('--stats-rate',(rate || 0)+'%');ring.setAttribute('aria-hidden','true');
    ring.append(makeElement('strong',null,rate===null?'—':rate+' %'));if(!closed)ring.classList.add('no-results');
    const counters=makeElement('div','stats-goal-counters');
    [[met,'Réussies','success'],[missed,'Non réussies','danger'],[open,'En cours','pending']].forEach(([value,label,tone])=>{
      const counter=makeElement('div','stats-goal-counter');counter.dataset.tone=tone;
      counter.append(makeElement('strong',null,statNumber.format(value)),makeElement('span',null,label));
      counters.append(counter);
    });
    scores.append(makeElement('strong',null,closed?met+' sur '+closed+' périodes réussies ('+rate+' %)':'Aucune période terminée'),counters);
    panel.append(ring,scores);section.append(panel);
    const lists=makeElement('div','stats-goal-breakdowns');
    [['Par fréquence',[...result.byPeriod].filter(([,s])=>s.met+s.missed+s.open).map(([key,value])=>[goalPeriodLabels[key],value])],
     ['Par catégorie',[...result.byCategory.values()].map(value=>[categoryLabel(value.category),value])]].forEach(([title,rows])=>{
      if(!rows.length)return;
      const block=makeElement('div'),list=makeElement('ul','stats-breakdown');
      rows.forEach(([label,{met,missed,open}])=>{
        const total=met+missed,text=total?met+' / '+total+' réussies':'Aucune période terminée';
        list.append(statRow(label,text+(open?' · '+open+' en cours':''),met,total,true));
      });
      block.append(makeElement('h3',null,title),list);lists.append(block);
    });
    section.append(lists);
  }
  function renderStatistics(){
    const now=localDateKey(new Date()),currentYear=Number(now.slice(0,4));
    const yearSelect=$('#statsYear');
    statsYear=Math.min(statsYear || currentYear,currentYear);
    const year=statsYear,first=year+'-01-01',last=year+'-12-31',through=now<last?now:last;
    const entries=Object.entries(state.entries);
    const relevantYears=[...entries.map(([date])=>Number(date.slice(0,4))),...goalTargets().map(({goal})=>Number(goal.startDate?.slice(0,4)))];
    const earliest=Math.max(1000,Math.min(year-1,...relevantYears.filter(value=>Number.isInteger(value) && value>=1000)));
    if(yearSelect.dataset.range!==currentYear+':'+earliest){
      yearSelect.replaceChildren();
      for(let y=currentYear;y>=earliest;y--)appendOption(yearSelect,String(y),String(y));
      yearSelect.dataset.range=currentYear+':'+earliest;
    }
    yearSelect.value=String(year);
    $('#statsNext').disabled=year>=currentYear;$('#statsPrevious').disabled=year<=1000;
    const activityIds=renderStatsFilters(),root=$('#statisticsContent'),focused=document.activeElement;
    const activeMetric=focused?.dataset.statsMetric,activeDay=focused?.matches('.stats-heatmap-day')?focused.dataset.date:null;
    if(calendarPreviewAnchor && root.contains(calendarPreviewAnchor))hideCalendarPreview();
    root.replaceChildren();
    const currentMonth=Number(through.slice(5,7))-1,current=periodBounds(through,'month')[0],previous=shiftDate(current,'month',-1);
    const monthLabel=date=>new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'}).format(new Date(date+'T12:00:00'));
    const data=activityStatistics(entries,statsCategoryId,activityIds,first,through,previous.slice(0,7));
    const goals=goalStatistics(entries,statsCategoryId,statsActivityIds,first,last,now);
    updateFilterResultCount('statsFilterResults',data.year.count);
    const overview=statSection(root,'statsOverview','Activités en '+year),cards=makeElement('div','stats-kpis');
    cards.append(statCard('Occurrences',statValue('count',data.year.count),data.year.dates.size+' jours actifs'),
      statCard('Distance totale',statValue('distance',data.year.distance)),statCard('Durée totale',statValue('minutes',data.year.minutes)),
      statCard('Occurrences · '+monthLabel(current),statValue('count',data.months[currentMonth].count),statValue('count',data.previousCount)+' en '+monthLabel(previous)));
    overview.append(cards);
    renderStatsHeatmap(root,first,last,now,goals.outcomesByDate,data.countsByDate);

    const trend=statSection(root,'statsMonthly','Évolution par mois'),choices=makeElement('div','workspace-formats stats-metrics');
    choices.setAttribute('role','group');choices.setAttribute('aria-label','Indicateur du graphique mensuel');
    Object.entries(statsMetrics).forEach(([metric,label])=>{
      const button=makeButton(label,()=>{statsMetric=metric;renderStatistics();});
      button.dataset.statsMetric=metric;button.setAttribute('aria-pressed',String(statsMetric===metric));choices.append(button);
    });
    const chart=makeElement('ol','stats-months'),values=data.months.map(bucket=>statsMetric==='days'?bucket.dates.size:bucket[statsMetric]);
    const peak=Math.max(1,...values);
    values.forEach((value,month)=>{
      const future=month>currentMonth,item=makeElement('li','stats-month');
      const amount=makeElement('strong',null,future?'—':statValue(statsMetric,value));
      item.title=MONTHS[month]+' : '+(future?'À venir':amount.textContent);item.setAttribute('aria-label',item.title);
      const track=makeElement('span','stats-month-track'),fill=makeElement('span');
      track.setAttribute('aria-hidden','true');fill.style.setProperty('--stats-height',(value/peak*100)+'%');track.append(fill);
      item.append(amount,track,makeElement('span','stats-month-label',MONTHS[month].slice(0,3)));chart.append(item);
    });
    trend.append(choices,chart);

    const split=statSection(root,'statsDistribution','Répartition par catégorie');
    if(data.year.count){
      const heading=makeElement('div','stats-category-heading stats-category-summary');
      heading.setAttribute('aria-hidden','true');
      heading.append(makeElement('span'),makeElement('span',null,'Catégorie'),
        makeElement('span',null,'Occurrences'),makeElement('span',null,'Part du total'));
      const list=makeElement('ul','stats-category-list');
      list.append(...data.categories.map(item=>statsCategoryRow(item,data.year.count)));
      split.append(heading,list);
    }else appendWorkspaceEmpty(split,'Aucune activité enregistrée','Essaie une autre année ou une autre catégorie.','activities');

    renderStatsGoals(root,goals);
    const streaks=statSection(root,'statsStreaks','Statistiques par activité','Une semaine est active dès qu’une occurrence est enregistrée. Une série enchaîne plusieurs semaines actives, du lundi au dimanche.');
    if(!data.ranked.length)appendWorkspaceEmpty(streaks,'Aucune série à afficher','Ajoute une activité pour commencer à suivre ta régularité.','activities');
    else{
      const body=listTable(streaks,'Statistiques par activité',['Activité','Occurrences','Jours actifs','Semaines actives','Meilleure série']);
      data.ranked.forEach(({activity,count,distance,minutes,dates,weeks,longest})=>{
        const row=body.insertRow();row.dataset.activityId=activity.id;
        const category=categoryLabel(data.categories.find(item=>item.category.id===activity.categoryId)?.category);
        const measurements=[category,distance?statValue('distance',distance):null,minutes?statValue('minutes',minutes):null];
        rowLabel(row,activity.name,measurements.filter(Boolean).join(' · '));
        row.querySelector('strong').style.setProperty('--stats-activity-color',activity.color);
        [count,dates.size,weeks.size,longest].forEach(value=>row.insertCell().textContent=statNumber.format(value));
      });
    }
    if(activeMetric)root.querySelector('[data-stats-metric="'+activeMetric+'"]')?.focus({preventScroll:true});
    if(activeDay)root.querySelector('.stats-heatmap-day[data-date="'+activeDay+'"]')?.focus({preventScroll:true});
  }
  $('#statsYear').addEventListener('change',event=>{statsYear=Number(event.target.value);renderStatistics();});
  $('#statsToday').addEventListener('click',()=>{statsYear=null;renderStatistics();});
  $('#statsPrevious').addEventListener('click',()=>{statsYear--;renderStatistics();});
  $('#statsNext').addEventListener('click',()=>{statsYear++;renderStatistics();});

  function appendActivityListRow(body,activity,date,{showDate=true,removable=false}={}){
    const detail=state.details[date]?.[activity.id] || {};
    const open=()=>toggleEntry(date,true,[activity.id]);
    const row=body.insertRow();row.className='activity-record';
    row.style.setProperty('--activity-color',activity.color);
    makeEditableRecord(row,open,'Modifier l’activité : '+activity.name+' · '+formatDate(date));
    rowLabel(row,activity.name,categories.find(category=>category.id===activity.categoryId)?.name);
    if(showDate){
      const time=makeElement('time',null,formatDate(date));time.dateTime=date;row.insertCell().append(time);
    }
    row.insertCell().textContent=[(detail.count || 1)+' fois',detail.distance!=null?detail.distance+' km':'',detail.durationMinutes!=null?detail.durationMinutes+' min':''].filter(Boolean).join(' · ');
    const note=row.insertCell();note.className='list-note';note.textContent=detail.note || '—';if(detail.note)note.title=detail.note;
    const actions=makeElement('div','list-actions');
    const edit=makeButton('✎',open,'list-action');edit.setAttribute('aria-label','Modifier '+activity.name+' · '+formatDate(date));edit.title=edit.getAttribute('aria-label');
    actions.append(edit);
    if(removable){
      const remove=catalogActionButton('delete','Retirer '+activity.name+' · '+formatDate(date),()=>updateSession(date,activity.id,{count:0}));
      remove.classList.add('list-action');actions.append(remove);
    }
    row.insertCell().append(actions);
  }

  function renderActivityRecords(reference,root) {
    root.replaceChildren();root.dataset.format=activityFormat;
    const [start,end]=periodBounds(reference,calendarView),selected=visibleActivityIds();
    let listBody,currentMonth,cardGrid=root;
    const groupByMonth=activityFormat==='cards' && calendarView==='year';
    root.classList.toggle('activity-months',groupByMonth);
    function cardGridFor(date){
      if(!groupByMonth)return root;
      const month=date.slice(0,7);
      if(month!==currentMonth){
        currentMonth=month;
        const section=document.createElement('section');section.className='activity-month';
        const title=document.createElement('h2');title.textContent=MONTHS[Number(date.slice(5,7))-1];
        cardGrid=document.createElement('div');cardGrid.className='activity-card-grid';
        section.append(title,cardGrid);root.append(section);
      }
      return cardGrid;
    }
    Object.keys(state.entries).filter(date=>date>=start && date<=end).sort((a,b)=>b.localeCompare(a)).forEach(date=>{
      state.entries[date].filter(id=>selected.has(id)).forEach(id=>{
        const activity=activityById(id);if(!activity)return;
        if(activityFormat==='list'){
          listBody ||= listTable(root,'Liste des activités',['Activité','Date','Mesures','Note','Actions']);
          appendActivityListRow(listBody,activity,date);
          return;
        }
        const detail=state.details[date]?.[id] || {};
        const time=document.createElement('time');time.dateTime=date;time.textContent=formatDate(date);
        const row=document.createElement('article');row.className='activity-record';row.style.setProperty('--activity-color',activity.color);
        row.setAttribute('role','button');
        makeEditableRecord(row,()=>toggleEntry(date,true,[id]),'Modifier l’activité : '+activity.name+' · '+formatDate(date),'editable-record-tile');
        const header=document.createElement('header');header.className='activity-tile-heading';
        const category=document.createElement('span');category.className='activity-tile-category';
        const owner=categories.find(item=>item.id===activity.categoryId);
        category.textContent=owner?categoryLabel(owner):'Activité';header.append(category,time);
        const identity=document.createElement('div');identity.className='activity-tile-identity';
        const title=document.createElement('h3');title.textContent=activity.name;title.title=activity.name;
        const actions=document.createElement('div');actions.className='activity-tile-actions';
        if(detail.note){
          const marker=document.createElement('span');marker.className='activity-tile-has-note';marker.title='Note dans les détails de l’activité';
          marker.setAttribute('role','img');marker.setAttribute('aria-label','Note disponible');
          marker.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l3 3v15H6zM9 10h6m-6 4h6m-6 4h3"/></svg>';
          actions.append(marker);
        }
        identity.append(title);if(actions.childElementCount)identity.append(actions);
        const measures=document.createElement('dl');measures.className='activity-tile-measures';
        [['Séances',detail.count || 1],['Distance',detail.distance!=null?detail.distance+' km':null],['Durée',detail.durationMinutes!=null?detail.durationMinutes+' min':null]].forEach(([label,value])=>{
          if(value===null)return;
          const metric=document.createElement('div'),term=document.createElement('dt'),amount=document.createElement('dd');
          term.textContent=label;amount.textContent=value;metric.append(term,amount);measures.append(metric);
        });
        row.append(header,identity,measures);
        appendTileEditIndicator(row);
        cardGridFor(date).append(row);
      });
    });
    if(!root.children.length)appendWorkspaceEmpty(root,'Aucune activité enregistrée','Choisissez une autre période ou modifiez vos filtres.','activities');
  }
  function renderCalendar() {
    hideCalendarPreview();
    const reference=activityReference(),period=activityPeriod(),calendar=$('#calendar');calendar.dataset.view=period;
    syncSegmentedSwitch($('#activityViews'),'calendarView',period);
    syncCompactSwitch($('#activityViews'));
    updateDateNavigation('periodLabel','calendarDateInput',reference,period);
    $('#categoryBar').hidden=false;
    $('#toolbar').hidden=false;
    syncFormatButtons('activity',activityFormat);
    if(!calendarIsOpen('activities')){renderActivityRecords(calendarDateForYear(),$('#activityRecords'));return;}
    if(period==='year'){renderYearCalendar(Number(reference.slice(0,4)));return;}
    calendar.replaceChildren();
    if(period==='month')renderMonth(calendar,reference);
    if(period==='week')renderWeek(calendar,reference,false);
    if(period==='day')renderCalendarDay(calendar,reference);
  }
  function visibleActivityIds() {
    if(currentPage!=='calendar')return new Set(state.selectedActivities);
    const selected=calendarState.activityIds;
    return new Set(calendarFilterActivities().map(item=>item.id).filter(id=>selected===null || selected.includes(id)));
  }
  const calendarPreview=$('#calendarDayPreview'),goalCalendarPreviews=new WeakMap();
  let calendarPreviewAnchor=null,calendarPreviewTimer;
  function hideCalendarPreview(){
    clearTimeout(calendarPreviewTimer);
    calendarPreviewAnchor?.removeAttribute('aria-describedby');
    calendarPreviewAnchor=null;calendarPreview.hidden=true;
  }
  function positionCalendarPreview(){
    if(!calendarPreviewAnchor?.isConnected){hideCalendarPreview();return;}
    const anchor=calendarPreviewAnchor.getBoundingClientRect(),tip=calendarPreview.getBoundingClientRect();
    const width=document.documentElement.clientWidth,height=document.documentElement.clientHeight,gap=8;
    if(anchor.bottom<0 || anchor.top>height){hideCalendarPreview();return;}
    const left=anchor.left+(anchor.width-tip.width)/2;
    const boundary=calendarPreviewAnchor.closest('.stats-heatmap-frame')?.getBoundingClientRect() || anchor;
    const top=boundary.bottom+gap+tip.height<=height || boundary.top<tip.height+gap?
      boundary.bottom+gap:boundary.top-tip.height-gap;
    calendarPreview.style.left=Math.max(gap,Math.min(width-tip.width-gap,left))+'px';
    calendarPreview.style.top=Math.max(gap,Math.min(height-tip.height-gap,top))+'px';
  }
  function showCalendarPreview(anchor){
    clearTimeout(calendarPreviewTimer);
    if(anchor===calendarPreviewAnchor)return;
    hideCalendarPreview();
    const date=anchor.dataset.previewDate;
    const goalPreview=goalCalendarPreviews.get(anchor)?.();
    const selected=visibleActivityIds();
    const ids=goalPreview?[]:(state.entries[date] || []).filter(id=>selected.has(id) && activityById(id));
    if(!goalPreview && !ids.length)return;
    const statistics=goalPreview?.statistics;
    calendarPreview.classList.toggle('stats-day-preview',Boolean(statistics));
    const heading=calendarDayHeading(date);heading.className='calendar-preview-date';
    const list=document.createElement('ul');list.className='calendar-preview-list';
    let summary;
    if(goalPreview){
      const achieved=goalPreview.rows.filter(row=>row.tone==='success' || row.tone==='exceeded' || (row.goal.mode==='max' && row.tone==='warning')).length;
      const hasLimit=goalPreview.rows.some(row=>row.goal.mode==='max');
      summary=document.createElement('p');summary.className='calendar-preview-summary';
      summary.textContent=!goalPreview.rows.length?'Aucun objectif pour cette période':goalPreview.rows.every(row=>row.tone==='future')?'Objectifs à venir':achieved+' / '+goalPreview.rows.length+' objectifs '+(hasLimit?'respectés':'atteints');
      if(statistics){
        const status=makeElement('span','stats-preview-status',statistics.label);status.dataset.tone=statistics.tone;
        summary.replaceChildren(status,makeElement('span','stats-preview-count',occurrenceLabel(statistics.count)));
      }
      if(goalPreview.scope!=='day')heading.textContent=periodLabel(date,goalPreview.scope);
      goalPreview.rows.forEach(item=>{
        const row=document.createElement('li');row.dataset.tone=item.tone;
        const dot=document.createElement('span');dot.className='calendar-preview-dot';dot.setAttribute('aria-hidden','true');
        const name=document.createElement('strong');name.textContent=item.name;
        const detail=document.createElement('small');detail.textContent=item.status+(item.tone==='future'?'':' · '+goalHistoryAmount(item));
        if(statistics){
          const status=makeElement('span','stats-preview-goal-status',item.status);
          detail.textContent=goalHistoryAmount(item);
          row.append(dot,name,status,detail);
        }else row.append(dot,name,detail);
        list.append(row);
      });
    }
    ids.forEach(id=>{
      const activity=activityById(id),detail=state.details[date]?.[id] || {};
      const row=document.createElement('li');
      const dot=document.createElement('span');dot.className='calendar-preview-dot';dot.style.setProperty('--activity-color',activity.color);dot.setAttribute('aria-hidden','true');
      const name=document.createElement('strong');name.textContent=activity.name;
      const measurements=document.createElement('small');
      const count=detail.count || 1;
      measurements.textContent=[count+' séance'+(count>1?'s':''),detail.distance!=null?detail.distance+' km':'',detail.durationMinutes!=null?detail.durationMinutes+' min':''].filter(Boolean).join(' · ');
      row.append(dot,name,measurements);
      if(detail.note){const note=document.createElement('p');note.textContent=detail.note;row.append(note);}
      list.append(row);
    });
    calendarPreview.replaceChildren(heading,...(summary?[summary]:[]),list);calendarPreviewAnchor=anchor;
    anchor.setAttribute('aria-describedby',calendarPreview.id);
    calendarPreview.hidden=false;positionCalendarPreview();
  }
  function scheduleCalendarPreviewClose(){
    clearTimeout(calendarPreviewTimer);
    calendarPreviewTimer=setTimeout(hideCalendarPreview,160);
  }
  function bindCalendarPreview(calendarPreviewGrid,closeOnClick=true){
    calendarPreviewGrid.addEventListener('pointerover',event=>{
      const anchor=event.target.closest('[data-preview-date]');
      if(event.pointerType!=='touch' && anchor)showCalendarPreview(anchor);
    });
    calendarPreviewGrid.addEventListener('pointerout',event=>{
      if(calendarPreviewAnchor?.contains(event.target) && !(event.relatedTarget instanceof Node && calendarPreviewAnchor.contains(event.relatedTarget)))scheduleCalendarPreviewClose();
    });
    calendarPreviewGrid.addEventListener('focusin',event=>{
      if(event.target.matches('[data-preview-date]:focus-visible'))showCalendarPreview(event.target);
    });
    calendarPreviewGrid.addEventListener('focusout',event=>{if(event.target===calendarPreviewAnchor)hideCalendarPreview();});
    if(closeOnClick)calendarPreviewGrid.addEventListener('click',hideCalendarPreview,true);
    calendarPreviewGrid.addEventListener('contextmenu',hideCalendarPreview,true);
  }
  [$('#calendar'),$('#goalHistory')].forEach(grid=>bindCalendarPreview(grid));
  document.addEventListener('pointerdown',event=>{
    if(calendarPreviewAnchor?.matches('.stats-heatmap-day') && !calendarPreviewAnchor.contains(event.target) &&
      !calendarPreview.contains(event.target))hideCalendarPreview();
  });
  calendarPreview.addEventListener('pointerenter',()=>clearTimeout(calendarPreviewTimer));
  calendarPreview.addEventListener('pointerleave',scheduleCalendarPreviewClose);
  window.addEventListener('resize',positionCalendarPreview);
  window.addEventListener('scroll',()=>{if(calendarPreviewAnchor)positionCalendarPreview();},true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape' && calendarPreviewAnchor)hideCalendarPreview();});
  const FULL_WEEKDAYS=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
  function calendarMonthGrid(year,month,makeCell,afterWeek){
    const grid=document.createElement('div');grid.className='compact-month-grid';
    FULL_WEEKDAYS.forEach(day=>{
      const heading=document.createElement('span');heading.className='calendar-weekday';
      heading.textContent=day.slice(0,3)+'.';heading.title=day;grid.append(heading);
    });
    const offset=getMondayFirstDay(year,month),last=daysInMonth(year,month);
    for(let index=0;index<offset;index++){
      const empty=document.createElement('span');empty.setAttribute('aria-hidden','true');grid.append(empty);
    }
    for(let day=1;day<=last;day++){
      const date=dateKey(year,month,day);
      grid.append(makeCell(date,day));
      if(afterWeek && ((offset+day)%7===0 || day===last))grid.append(afterWeek(date));
    }
    return grid;
  }
  function calendarWeekGrid(container,start,renderColumn,onDate){
    const frame=document.createElement('div');frame.className='calendar-week-frame';
    frame.tabIndex=0;frame.setAttribute('role','region');frame.setAttribute('aria-label','Colonnes de la semaine');
    const grid=document.createElement('div');grid.className='week-grid calendar-week-grid';
    FULL_WEEKDAYS.forEach((weekday,index)=>{
      const date=shiftDate(start,'day',index),slot=document.createElement('div'),column=document.createElement('section');
      slot.className='calendar-week-slot';
      column.className='week-day';
      column.classList.toggle('today',date===localDateKey(new Date()));
      const label=makeButton('',()=>onDate(date),'week-heading');
      const name=document.createElement('strong');name.textContent=weekday;
      const dateLabel=document.createElement('small');dateLabel.textContent=formatDate(date);
      label.append(name,dateLabel);slot.append(label,column);
      renderColumn(column,date);grid.append(slot);
    });
    frame.append(grid);container.append(frame);
  }
  function renderMonth(container,reference,agenda=false) {
    const [year,month]=reference.split('-').map(Number),visible=visibleActivityIds();
    const grid=calendarMonthGrid(year,month-1,(key,day)=>{
      const activities=(state.entries[key] || []).filter(id=>agenda || visible.has(id)).map(activityById).filter(Boolean);
      const cell=makeButton('',()=>{if(agenda){agendaDate=key;agendaView='day';renderWorkspace();persist();}else toggleEntry(key);},'month-cell');
      cell.dataset.date=key;
      cell.setAttribute('aria-label',[formatDate(key),...activities.map(activity=>activity.name)].join(' · '));
      if(!agenda && activities.length)cell.dataset.previewDate=key;
      cell.classList.toggle('today',key===localDateKey(new Date()));
      cell.append(makeElement('strong',null,String(day)));
      if(activities.length){
        const list=makeElement('span','month-activities');
        activities.forEach(activity=>{
          const detail=state.details[key]?.[activity.id],label=makeElement('span','month-activity');
          label.style.setProperty('--activity-color',activity.color);
          label.append(makeElement('span','month-activity-name',activity.name));
          if(detail?.count>1)label.append(makeElement('small',null,'×'+detail.count));
          list.append(label);
        });
        cell.append(list);
      }
      if(activities.some(activity=>state.details[key]?.[activity.id]?.note)){
        const marker=makeElement('span','month-note-marker','✎');marker.setAttribute('aria-hidden','true');cell.append(marker);
      }
      if(!agenda)cell.addEventListener('contextmenu',event=>{event.preventDefault();toggleEntry(key,true);});
      return cell;
    });
    container.append(grid);
  }
  function renderWeek(container,reference,agenda=false) {
    const [start]=periodBounds(reference,'week'),selected=visibleActivityIds();
    calendarWeekGrid(container,start,(column,date)=>{
      if(agenda)renderChecklist(column,date,null,true);
      else {
        const ids=(state.entries[date] || []).filter(id=>selected.has(id));
        if(ids.length)column.parentElement.querySelector('.week-heading').dataset.previewDate=date;
        else{const empty=document.createElement('p');empty.className='muted';empty.textContent='Aucune activité';column.append(empty);}
        ids.forEach(id=>{const activity=activityById(id);if(!activity)return;const button=makeButton('',()=>toggleEntry(date,true,[id]),'week-activity');button.style.setProperty('--activity-color',activity.color);
          const name=document.createElement('strong');name.textContent=activity.name;
          const info=document.createElement('small');info.textContent=categoryLabel(categories.find(c=>c.id===activity.categoryId));
          const detail=state.details[date]?.[id];const text=document.createElement('span');text.textContent=[detail?.count>1?detail.count+' fois':'',detail?.distance!=null?detail.distance+' km':'',detail?.note || ''].filter(Boolean).join(' · ');button.append(name,info,text);column.append(button);});
        column.classList.add('week-activity-editable');
        column.addEventListener('click',event=>{
          if(!event.target.closest('button'))toggleEntry(date,true);
        });
      }
    },date=>{
      if(agenda){agendaDate=date;agendaView='day';renderWorkspace();persist();}
      else toggleEntry(date,true);
    });
  }
  function calendarDayHeading(date){
    const heading=document.createElement('h2');heading.className='calendar-day-heading';
    heading.textContent=new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(date+'T12:00:00'));
    return heading;
  }
  function renderCalendarDay(container,date) {
    const section=document.createElement('section');section.className='calendar-day';
    section.append(calendarDayHeading(date));
    const selected=visibleActivityIds();
    const activities=(state.entries[date] || []).filter(id=>selected.has(id)).map(activityById).filter(Boolean);
    if(activities.length){
      const body=listTable(section,'Activités de la journée',['Activité','Mesures','Note','Actions']);
      activities.forEach(activity=>appendActivityListRow(body,activity,date,{showDate:false,removable:true}));
    }else appendWorkspaceEmpty(section,'Aucune activité enregistrée','Ajoutez une activité à cette journée ou modifiez vos filtres.','activities');
    container.append(section);
  }
  function goalTargets(categoryId=null) {
    const chosen=categoryId?categories.filter(c=>c.id===categoryId):categories;
    const targets=chosen.flatMap(parent=>{
      const activities=state.activities.filter(a=>a.categoryId===parent.id);
      return [...goalsOf(parent).map(goal=>({goal,item:parent,ids:activities.map(a=>a.id),category:true,parent})),...activities.flatMap(item=>goalsOf(item).map(goal=>({goal,item,ids:[item.id],parent})))];
    });
    const priority=new Map(state.goalOrder.map((id,index)=>[id,index]));
    return targets.sort((a,b)=>{
      const modeOrder=Number(b.goal.mode===goalPriority)-Number(a.goal.mode===goalPriority);
      return modeOrder || (priority.get(a.goal.id) ?? Infinity)-(priority.get(b.goal.id) ?? Infinity);
    });
  }
  function goalMatchesStatus(result,filter){
    if(result.tone==='empty')return false;
    if(result.missed)return filter==='all' || filter==='missed';
    return filter==='all' || result.tone===filter || (filter==='success' && (result.tone==='exceeded' || result.tone==='warning'));
  }
  function drawGoals(container,reference,categoryId=null,statusFilter='all',period=null,activityIds=null) {
    container.replaceChildren();
    const targets=filteredGoalTargets(categoryId,activityIds).filter(t=>(!period||t.goal.period===period)).map(t=>({...t,result:goalProgress(t.ids,t.goal,reference)})).filter(t=>goalMatchesStatus(t.result,statusFilter));
    if(!targets.length){
      if(container.classList.contains('calendar-goal-tiles'))appendEmpty(container,'Aucun objectif pour cette période.');
      else appendEmpty(container,'Aucun objectif pour ces filtres. Définissez-en dans la gestion des activités ou des catégories.');
      return;
    }
    const daily=container.classList.contains('daily-goal-grid');
    const placement=container.classList.contains('agenda-placement-grid');
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
      appendTileEditIndicator(card);
      card.title='Cliquer pour modifier l’objectif';
      card.addEventListener('click',event=>{if(!event.target.closest('button,input,label,select,textarea,.goal-logging'))openGoalEditor(item.id,goal.id);});
      card.addEventListener('keydown',event=>{if(event.target===card&&['Enter',' '].includes(event.key)){event.preventDefault();openGoalEditor(item.id,goal.id);}});
      container.append(card);
      animateGoalProgress(progress,result,goal,goal.id,container.closest('#agendaContent')?'agenda':'goals',reference);
      if(!placement)enableDirectReorder(card,goal.id,container,ordered=>{const full=goalTargets().map(t=>({id:t.goal.id}));state.goalOrder=reorderSubset(full,ordered).map(t=>t.id);render();},null,'.goal-drag');
    });
  }
  function dailyGoalControls(item,goal,result,ids,date,category,showHint=true) {
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
    const canLog=date>=result.start;
    minus.disabled=!canLog || !ids.some(id=>recorded.includes(id));
    plus.disabled=!canLog || !ids.length;
    stepper.append(minus,plus);controls.append(stepper);
    if(showHint && !ids.length){const hint=document.createElement('small');hint.className='muted';hint.textContent='Ajoutez une activité à cette catégorie.';controls.append(hint);}
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
      const metric=document.createElement('label');metric.className='objective-metric';const input=document.createElement('input');input.type='number';input.min='0';input.max=goal.unit==='distance'?'100000':'1000000';input.step='any';const field=goal.unit==='distance'?'distance':'durationMinutes',scale=goal.unit==='duration'&&goal.scale==='hours'?60:1;input.value=state.details[date]?.[activity.id]?.[field]!=null?state.details[date][activity.id][field]/scale:'';input.placeholder='—';input.setAttribute('aria-label',unitLabel(goal)+' de '+activity.name+' · objectif '+goal.id);input.addEventListener('change',()=>{if(input.checkValidity())updateSession(date,activity.id,{[field]:input.value===''?null:Number(input.value)*scale});});metric.append(input,document.createTextNode(unitLabel(goal)));controls.append(metric);withNumberStepper(input,'change');
    }
    row.append(controls);return row;
  }
  function selectCategory(id) {
    if(currentPage==='calendar'){
      const categoryId=id==='overview'?null:id;
      if(calendarState.categoryId!==categoryId)Object.assign(calendarState,{categoryId,activityIds:null});
      render();return;
    }
    filtersUseDefaults.activities=false;
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
      const positiveExceeded=outcomes.filter(({tone})=>tone==='exceeded').length;
      const completed=outcomes.filter(({tone})=>tone==='success').length+positiveExceeded+atLimit;
      const missed=outcomes.filter(({result})=>result.missed).length;
      const overLimit=outcomes.filter(({tone,result})=>tone==='danger' && !result.missed).length;
      const upcoming=outcomes.filter(({tone})=>tone==='future').length;
      const count=document.createElement('strong');count.textContent=completed+' / '+targets.length;
      const track=document.createElement('div');track.className='day-total-progress';
      track.setAttribute('role','progressbar');
      track.setAttribute('aria-label',period==='day'?'Objectifs quotidiens respectés':'Objectifs de la période respectés');
      track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(targets.length));track.setAttribute('aria-valuenow',String(completed));
      track.setAttribute('aria-valuetext',completed+' sur '+targets.length+' respectés'+(positiveExceeded?', dont '+positiveExceeded+' minimum'+(positiveExceeded>1?'s':'')+' dépassé'+(positiveExceeded>1?'s':''):'')+(atLimit?', dont '+atLimit+' à la limite':'')+', '+overLimit+' limites dépassées, '+(targets.length-completed-overLimit-missed-upcoming)+' à accomplir'+(missed?', '+missed+' non atteints':'')+(upcoming?', '+upcoming+' à venir':''));
      // Always display negative to positive, then outstanding goals, from left to right.
      const toneOrder={danger:0,warning:1,success:2,exceeded:3,pending:4,future:4};
      outcomes.sort((left,right)=>toneOrder[left.tone]-toneOrder[right.tone]).forEach(({item,goal,result,tone})=>{
        const segment=document.createElement('span');segment.dataset.tone=tone;
        segment.title=item.name+' · '+goalDescription(goal)+' · '+result.status;
        track.append(segment);
      });
      overview.append(count,track);progressContainer.append(overview);
  }
  function agendaColumnCount(grid){
    return Number(getComputedStyle(grid).getPropertyValue('--agenda-columns')) || 5;
  }
  function placeAgendaGoals(grid){
    const columns=agendaColumnCount(grid),layoutKey='dailyGoalSlots'+columns+(goalPriority==='manual'?'':'-'+goalPriority);
    grid.dataset.columns=columns;
    const cards=new Map([...grid.querySelectorAll('.goal-card')].map(card=>[card.dataset.goalId,card]));
    if(!cards.size)return;
    const dailyIds=new Set(goalTargets().filter(({goal})=>goal.period==='day').map(({goal})=>goal.id));
    const saved=sectionLayout.orders[layoutKey];
    const placed=new Set();
    let slots;
    if(saved){
      slots=saved.map(id=>{
        if(!dailyIds.has(id) || placed.has(id))return '';
        placed.add(id);return id;
      });
      for(const id of cards.keys()){
        if(placed.has(id))continue;
        const vacant=slots.indexOf('');
        if(vacant<0)slots.push(id);
        else slots[vacant]=id;
      }
    }else{
      const firstMode=goalPriority==='min'?'min':'max';
      const first=[...cards.values()].filter(card=>card.dataset.mode===firstMode).map(card=>card.dataset.goalId);
      const second=[...cards.values()].filter(card=>card.dataset.mode!==firstMode).map(card=>card.dataset.goalId);
      const gap=second.length?(columns-first.length%columns)%columns:0;
      slots=[...first,...Array(gap).fill(''),...second];
    }
    const lastVisible=slots.findLastIndex(id=>cards.has(id));
    const visibleSize=Math.ceil((lastVisible+1)/columns)*columns;
    const cells=Array.from({length:visibleSize+columns},(_,index)=>{
      const card=cards.get(slots[index]);
      const cell=card || makeElement('div','agenda-goal-slot');
      cell.dataset.agendaSlot=index;
      if(!card){
        cell.setAttribute('aria-hidden','true');
        cell.hidden=index>=visibleSize;
      }
      return cell;
    });
    grid.replaceChildren(...cells);
    const extraCells=cells.slice(visibleSize,visibleSize+columns);
    function commit(from,to){
      if(to==null || from===to)return;
      const id=slots[from];
      slots[from]=slots[to] || '';
      slots[to]=id;
      sectionLayout.orders[layoutKey]=Array.from(slots.slice(0,slots.findLastIndex(Boolean)+1),value=>value || '');
      renderWorkspace();persist();
      [...$('#agendaGoals').querySelectorAll('.goal-card')].find(card=>card.dataset.goalId===id)
        ?.querySelector('.goal-drag').focus({preventScroll:true});
    }
    let drag;
    function targetAt(event){
      const target=document.elementFromPoint?.(event.clientX,event.clientY)?.closest('[data-agenda-slot]');
      return target?.parentElement===grid?target:null;
    }
    function finish(target=null){
      if(!drag)return;
      const {card,lift,over}=drag;
      drag=null;
      lift?.ghost.remove();
      card.classList.remove('is-dragging');
      over?.classList.remove('agenda-slot-target');
      extraCells.forEach(cell=>{cell.hidden=true;});
      grid.classList.remove('is-placing-goal');
      commit(Number(card.dataset.agendaSlot),target?Number(target.dataset.agendaSlot):null);
    }
    grid.addEventListener('pointermove',event=>{
      if(!drag || event.pointerId!==drag.pointerId)return;
      if(!drag.lift){
        if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<6)return;
        drag.lift=liftItem(drag.card,drag.x,drag.y);
        grid.classList.add('is-placing-goal');
        extraCells.forEach(cell=>{cell.hidden=false;});
      }
      moveLift(drag.lift,event.clientX,event.clientY);
      const target=targetAt(event);
      if(drag.over===target)return;
      drag.over?.classList.remove('agenda-slot-target');
      target?.classList.add('agenda-slot-target');
      drag.over=target;
    });
    grid.addEventListener('pointerup',event=>{
      if(drag?.pointerId===event.pointerId)finish(drag.lift?targetAt(event):null);
    });
    for(const eventName of ['pointercancel','lostpointercapture']){
      grid.addEventListener(eventName,event=>{if(drag?.pointerId===event.pointerId)finish();});
    }
    for(const card of cards.values()){
      const handle=card.querySelector('.goal-drag');
      handle.addEventListener('pointerdown',event=>{
        if(event.button!==0 || drag)return;
        event.preventDefault();handle.focus({preventScroll:true});
        drag={card,pointerId:event.pointerId,x:event.clientX,y:event.clientY};
        grid.setPointerCapture(event.pointerId);
      });
      handle.addEventListener('keydown',event=>{
        if(event.key==='Escape'){finish();return;}
        const offset={ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns}[event.key];
        if(!event.altKey || !offset)return;
        const from=Number(card.dataset.agendaSlot),to=from+offset;
        if(to<0 || to>=visibleSize+columns || (Math.abs(offset)===1 && event.key!=='ArrowUp' && event.key!=='ArrowDown' &&
          Math.floor(from/columns)!==Math.floor(to/columns)))return;
        event.preventDefault();commit(from,to);
      });
    }
  }

  function renderChecklist(container, date, categoryId = null, compact = false, progressContainer = container) {
    const wrap = document.createElement('div');
    wrap.className = 'goal-cards daily-goal-grid';
    // All daily rules belong in the agenda, including upper limits.
    const targets = goalTargets(categoryId).filter(({goal}) => goal.period === 'day' && !goalStartsAfter(goal,date));
    if (!compact && targets.length) renderGoalSummary(targets,date,progressContainer,'day');
    container.append(wrap);
    if (targets.length) {
      if(!compact)wrap.classList.add('agenda-placement-grid');
      drawGoals(wrap,date,categoryId,'all','day',null);
      if(!compact)placeAgendaGoals(wrap);
    }
    if (!targets.length) {
      const empty = document.createElement('div');
      empty.className = 'daily-focus-empty';
      appendEmpty(empty, 'Aucun objectif quotidien pour cette date. Choisissez une fréquence « par jour » pour créer un objectif quotidien.');
      empty.append(makeButton('Créer un objectif quotidien', () => {
        goalCategoryFilter = null;
        goalActivityFilter = null;
        goalStatusFilter = 'all';
        goalReference = date;
        renderGoals();
        setPage('goals');
        openNewGoalDialog('day');
      }, 'primary-action'));
      wrap.append(empty);
    }
    if (!compact) {
      const footer = document.createElement('div');
      footer.className = 'daily-focus-footer';
      footer.append(makeButton('Voir tous mes objectifs ↗', () => {
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
    if(preferencesDialog.open && !$('#trackingSettings').hidden)renderTrackingCatalog();
    if(currentPage!=='day')return;
    if($('#agendaDate').value!==agendaDate)$('#dailyActivityFeedback').textContent='';
    agendaView='day';updateDateNavigation('agendaDateLabel','agendaDate',agendaDate);
    const content=$('#agendaGoals'),progress=$('#agendaProgress');content.replaceChildren();progress.replaceChildren();renderChecklist(content,agendaDate,null,false,progress);
  }

  window.addEventListener('resize',()=>{
    const grid=$('#agendaGoals .agenda-placement-grid');
    if(currentPage==='day' && grid && !grid.classList.contains('is-placing-goal') &&
      Number(grid.dataset.columns)!==agendaColumnCount(grid))renderWorkspace();
  });

  const dailyActivityDialog=$('#dailyActivityDialog'),dailyActivityForm=$('#dailyActivityForm');
  const dailyActivityCategory=$('#dailyActivityCategory'),dailyActivityChoice=$('#dailyActivityChoice');
  let dailyActivityContext,dailyActivityBaseline;
  function dailyActivitySnapshot(){return JSON.stringify([dailyActivityContext?.date,dailyActivityCategory.value,dailyActivityChoice.value,...['Count','Distance','Duration','Note'].map(key=>$('#dailyActivity'+key).value)]);}
  function requestDailyActivityClose(){requestGoalDialogClose(dailyActivityDialog,dailyActivitySnapshot()!==dailyActivityBaseline || Boolean(dailyActivityForm.querySelector('input:invalid')));}
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
    updateDateNavigation('activityDateLabel','dailyActivityDate',date);
    const previous=dailyActivityCategory.value;
    dailyActivityCategory.replaceChildren();
    const activities=dailyActivityOptions();
    const available=categories.filter(category=>(!categoryId || category.id===categoryId) && activities.some(activity=>activity.categoryId===category.id));
    available.forEach(category=>appendOption(dailyActivityCategory,category.id,categoryLabel(category)));
    const preferred=previous || activityCategoryId();
    if(available.some(category=>category.id===preferred))dailyActivityCategory.value=preferred;
    dailyActivityCategory.disabled=!available.length || Boolean(categoryId);
    $('#dailyActivityEmpty').hidden=Boolean(available.length);
    $('#dailyActivityEmpty').textContent=direction>0?'Créez d’abord une activité dans l’onglet Activités.':'Aucune activité enregistrée à retirer ce jour.';
    $('#dailyActivityDetails').hidden=!available.length;
    refreshDailyActivityChoice();
  }
  function openDailyActivityDialog({date=agendaDate,categoryId=null,ids=null,direction=1}={}) {
    dailyActivityContext={date,categoryId,ids,direction};
    dailyActivityForm.reset();
    dailyActivityCategory.replaceChildren();dailyActivityChoice.replaceChildren();
    $('#dailyActivityNote').closest('label').hidden=direction<0;
    $('#dailyActivityTitle').textContent=direction>0?'Ajouter une activité':'Retirer une activité';
    $('#saveDailyActivity').textContent=direction>0?'Enregistrer l’activité':'Confirmer le retrait';
    refreshDailyActivityDate();
    dailyActivityBaseline=dailyActivitySnapshot();
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
  $('#openCalendarActivity').addEventListener('click',()=>openDailyActivityDialog({date:activityReference()}));
  dailyActivityCategory.addEventListener('change',refreshDailyActivityChoice);
  dailyActivityChoice.addEventListener('change',refreshDailyActivityDetails);
  ['#closeDailyActivity','#cancelDailyActivity'].forEach(id=>$(id).addEventListener('click',requestDailyActivityClose));
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

  function updateSession(date,id,patch,commit=true) {
    if(!activityById(id))return;
    const entries=new Set(state.entries[date] || []),included=entries.has(id),existing=state.details[date]?.[id] || {};
    const value={count:included?existing.count || 1:0,distance:existing.distance ?? null,note:existing.note || '',...(existing.durationMinutes!=null?{durationMinutes:existing.durationMinutes}:{}),...patch};
    if(!('count' in patch) && !value.count && ((patch.note && patch.note.trim()) || patch.distance>0 || patch.durationMinutes>0))value.count=1;
    if(!Number.isInteger(value.count) || value.count<0 || value.count>1000 || (value.distance!=null && (!Number.isFinite(value.distance) || value.distance<0 || value.distance>100000)) || (value.durationMinutes!=null && (!Number.isFinite(value.durationMinutes) || value.durationMinutes<0 || value.durationMinutes>1000000)))return;
    if(value.count){entries.add(id);state.details[date] ||= {};state.details[date][id]=value;}else{entries.delete(id);removeDetail(date,id);}
    if(entries.size)state.entries[date]=[...entries];else delete state.entries[date];
    // Newly checked activities remain visible in the current category's filters.
    if(currentPage!=='calendar' && value.count && activityById(id).categoryId===state.activeCategory && !state.selectedActivities.includes(id))state.selectedActivities.push(id);
    if(commit){render();refreshSaveIndicators();}
  }
  function persistItem(item,patch) {
    const activity=state.activities.find(a=>a.id===item.id),category=categories.find(c=>c.id===item.id),target=activity || category;if(!target)return;
    Object.entries(patch).forEach(([key,value])=>{if(key==='goal' && !value)delete target.goal;else target[key]=JSON.parse(JSON.stringify(value));});
    render();refreshSaveIndicators();
  }
  function removeActivity(id,commit=true) {
    state.activities=state.activities.filter(activity=>activity.id!==id);
    Object.entries(state.entries).forEach(([date,ids])=>{const remaining=ids.filter(value=>value!==id);removeDetail(date,id);if(remaining.length)state.entries[date]=remaining;else delete state.entries[date];});
    state.selectedActivities=state.selectedActivities.filter(value=>value!==id);
    Object.keys(state.selections).forEach(key=>{state.selections[key]=state.selections[key].filter(value=>value!==id);});if(commit)render();
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
  function clearInvalid(dialog) {const root=$(dialog),editor=root.querySelector('#dayPickerChoices,[data-goal-fields]');if(editor && [...editor.querySelectorAll('input')].some(input=>!input.checkValidity())){markInvalid(dialog,'Vérifiez les champs');return;}const span=root.querySelector('[data-save-status]');delete span.dataset.invalid;refreshSaveIndicators();}
  new MutationObserver(refreshSaveIndicators).observe($('#syncStatus'),{childList:true,subtree:true,characterData:true});
  let saveToastTimer;
  function dismissSaveToast() {
    clearTimeout(saveToastTimer);
    saveToast.hidePopover?.();
    saveToast.removeAttribute('data-visible');
    $('#saveToastMessage').textContent='';
  }
  function showSaveToast(message) {
    clearTimeout(saveToastTimer);
    saveToast.dataset.visible='true';
    saveToast.showPopover?.();
    $('#saveToastMessage').textContent=message;
    saveToastTimer=setTimeout(dismissSaveToast,3200);
  }
  document.addEventListener('calendar-save-toast-dismiss',dismissSaveToast);
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
  function validGoalDate(value){
    if(typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.slice(0,4)==='0000')return false;
    const date=new Date(value+'T12:00:00');
    return Number.isFinite(date.getTime()) && String(date.getFullYear()).padStart(4,'0')+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate())===value;
  }
  function validGoal(goal) {return (!goal.startDate || validGoalDate(goal.startDate)) && ['min','max'].includes(goal.mode) && ['day','week','month','year'].includes(goal.period) && ['count','distance','duration'].includes(goal.unit || 'count') && Number.isFinite(goal.target) && (goal.mode==='max'?goal.target>=0:goal.target>0) && goal.target<=1000000 && ((goal.unit || 'count')!=='count' || Number.isInteger(goal.target));}
  function measuredAmount(date,id,goal) {const detail=state.details[date]?.[id];return goal.unit==='distance'?Number(detail?.distance || 0):goal.unit==='duration'?Number(detail?.durationMinutes || 0):detail?.count || 1;}
  function measureValue(value,goal) {return new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(goal.unit==='duration' && goal.scale==='hours'?value/60:value);}
  function unitLabel(goal) {return goal.unit==='distance'?'km':goal.unit==='duration'?(goal.scale==='hours'?'h':'min'):'fois';}
  function goalDescription(goal) {const periods={day:'jour',week:'semaine',month:'mois',year:'an'};return `${goal.mode==='min'?'Au moins':'Au maximum'} ${measureValue(goal.target,goal)} ${unitLabel(goal)} par ${periods[goal.period]}`;}
  // Renders replace whole goal cards; retain previous values to animate between renders.
  const progressSnapshots={goals:new Map(),agenda:new Map()};
  function animateGoalProgress(indicator,result,goal,id,view,reference) {
    const memory=progressSnapshots[view];
    const key=id+'|'+reference+'|'+goal.period;
    const percent=goalFill(result,goal);
    const next={percent,tone:result.tone,count:result.count};
    const previous=memory.get(key);
    memory.set(key,next);
    if(!previous || (previous.percent===next.percent && previous.tone===next.tone && previous.count===next.count))return;
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
    const timing={duration:540,easing:'cubic-bezier(0.22, 1, 0.36, 1)'};
    const oldColor='var(--goal-tone-'+previous.tone+')',newColor='var(--goal-tone-'+next.tone+')';
    if(indicator.classList.contains('progress-ring')) {
      const circumference=2*Math.PI*32;
      const fill=indicator.querySelector('.ring-fill');
      fill?.animate?.([
        {strokeDashoffset:String(circumference*(1-previous.percent))},
        {strokeDashoffset:String(circumference*(1-next.percent))}
      ],timing);
      if(previous.tone!==next.tone)indicator.animate?.([{color:oldColor},{color:newColor}],timing);
    } else {
      const fill=indicator.firstElementChild;
      const frames=[
        {width:previous.percent*100+'%',backgroundColor:oldColor},
        {width:next.percent*100+'%',backgroundColor:newColor}
      ];
      fill?.animate?.(frames,timing);
    }
    if(previous.tone!==next.tone){
      indicator.closest('.goal-card')?.querySelector('.goal-status')?.animate?.([
        {color:oldColor,opacity:.65},{color:newColor,opacity:1}
      ],timing);
    }
  }
  function goalFill(result,goal){
    if(result.tone==='future')return 0;
    return goal.mode==='max' && goal.target===0?1:Math.max(0,Math.min(1,result.count/goal.target));
  }
  function createProgress(result,goal,small=false) {
    const zeroCap=goal.mode==='max' && goal.target===0;
    const percent=goalFill(result,goal);const wrap=document.createElement('div');wrap.dataset.tone=result.tone;wrap.className=(goal.display==='ring'?'progress-ring':'goal-track')+(small?' progress-small':'');
    wrap.setAttribute('role','progressbar');wrap.setAttribute('aria-label',goalDescription(goal));wrap.setAttribute('aria-valuemin','0');wrap.setAttribute('aria-valuemax',String(zeroCap?1:goal.target));wrap.setAttribute('aria-valuenow',String(zeroCap?percent:Math.min(result.count,goal.target)));wrap.setAttribute('aria-valuetext',measureValue(result.count,goal)+' / '+measureValue(goal.target,goal)+' '+unitLabel(goal)+' · '+result.status);
    if(goal.display==='ring'){
      const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 80 80');svg.setAttribute('aria-hidden','true');
      for(const className of ['ring-base','ring-fill']){const circle=document.createElementNS(ns,'circle');circle.setAttribute('cx','40');circle.setAttribute('cy','40');circle.setAttribute('r','32');circle.setAttribute('class',className);if(className==='ring-fill'){circle.setAttribute('stroke-dasharray',String(2*Math.PI*32));circle.setAttribute('stroke-dashoffset',String(2*Math.PI*32*(1-percent)));}svg.append(circle);}
      wrap.append(svg);
      if(!small){
        const label=document.createElement('span'),amount=document.createElement('strong'),target=document.createElement('small');
        amount.textContent=measureValue(result.count,goal);
        target.textContent='/ '+measureValue(goal.target,goal)+(goal.unit==='count'?'':' '+unitLabel(goal));
        label.append(amount,target);wrap.append(label);
      }
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
  function openNewGoalDialog(period){
    const selectedPeriod=period ?? (calendarIsOpen('goals')?calendarState.period:selectedGoalFrequency(defaultViews.goals.period));
    const select=$('#newGoalCategory');select.replaceChildren();
    categories.forEach(category=>appendOption(select,category.id,categoryLabel(category)));
    const categoryId=calendarIsOpen('goals')?calendarState.categoryId:goalCategoryFilter;
    if(categoryId)select.value=categoryId;
    populateNewGoalOwners();
    $('#createGoalButton').disabled=!select.options.length;
    $('#newGoalEmpty').hidden=Boolean(select.options.length);
    initialGoalOwner=$('#newGoalOwner').value;renderNewGoalFields(selectedPeriod);$('#newGoalDialog').showModal();
  }
  $('#newGoalButton').addEventListener('click',()=>openNewGoalDialog());
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
  function renderNewGoalFields(period) {
    const fields=$('#newGoalFields'),owner=ownerById($('#newGoalOwner').value);
    fields.replaceChildren();newGoalDraft=null;initialNewGoal=null;$('#newGoalError').hidden=true;
    if(!owner)return;
    const goal={id:'goal-'+crypto.randomUUID(),mode:'min',target:1,period,unit:'count',display:'bar',startDate:localDateKey(new Date())};
    newGoalDraft=goal;initialNewGoal=goal;
    const editor=buildGoalFields(owner,goal,next=>{
      newGoalDraft=next;$('#createGoalButton').disabled=!next;
      $('#newGoalError').hidden=Boolean(next);$('#newGoalError').textContent=next?'':'Vérifiez la cible et la date de début de l’objectif.';
    },true);
    fields.append(editor);
  }
  function ownerById(id) {return state.activities.find(item=>item.id===id) || categories.find(item=>item.id===id);}
  let goalEditorSelection=null;
  function openGoalEditor(ownerId,goalId=null) {
    goalEditorSelection=goalId;
    showGoalDeleteConfirmation(false);
    goalEditorOwner=ownerId;
    const owner=ownerById(ownerId);if(!owner)return;
    goalEdits.clear();
    $('#goalEditorTitle').textContent=goalId?'Modifier l’objectif':'Objectifs';
    $('#goalOwnerLabel').textContent=owner.name;
    const fields=$('#goalEditorFields');fields.replaceChildren();
    $('#addOwnerGoal').hidden=Boolean(goalId);
    const list=editableSavedGoals(owner);
    $('#deleteGoalEditor').hidden=!list.length;
    if(!list.length)appendEmpty(fields,'Ajoutez un objectif pour cette activité ou catégorie.');
    list.forEach(goal=>appendGoalDraft(owner,goal));
    refreshGoalEditor();
    $('#goalEditorDialog').showModal();
  }
  let goalDatePickerId=0;
  function appendGoalStartDate(form,value){
    const field=makeElement('div','goal-start-field'),label=makeElement('span',null,'Date de début');
    const nav=makeElement('div','period-navigation'),input=makeElement('input');
    const id=++goalDatePickerId;
    input.id='goalStartDate-'+id;input.type='date';
    const trigger=makeElement('button','period-trigger');trigger.type='button';trigger.id='goalStartTrigger-'+id;
    const today=makeButton('Aujourd’hui',()=>{
      input.value=localDateKey(new Date());
      input.dispatchEvent(new Event('change',{bubbles:true}));
    },'today-button');
    nav.append(trigger,input,today);field.append(label,nav);form.append(field);
    const refresh=()=>{
      setDateControl(trigger,input,input.value);
      trigger.setAttribute('aria-label',input.value?'Date de début · '+formatDate(input.value):'Choisir la date de début');
    };
    input.value=value;
    bindDatePicker(trigger,input,{optional:true});
    input.addEventListener('change',refresh);
    refresh();
    return input;
  }
  function buildGoalFields(owner,goal,onChange,isCreation=false) {
      const form=document.createElement('div');form.className='goal-fields-grid';
      function field(labelText,input){const label=document.createElement('label');label.textContent=labelText;label.append(input);form.append(label);return input;}
      function select(labelText,options,value,key){
        const group=document.createElement('fieldset');group.className='goal-option-group goal-choice-field';
        const legend=document.createElement('legend');legend.textContent=labelText;
        const segments=document.createElement('div');segments.className='goal-segments';
        segments.style.setProperty('--segment-count',options.length);
        options.forEach(([option,text])=>{
          const label=document.createElement('label'),input=document.createElement('input'),span=document.createElement('span');
          input.type='radio';input.name=goal.id+'-'+key;input.value=option;input.checked=option===value;
          input.dataset.goalChoice=key;
          span.textContent=text;label.append(input,span);segments.append(label);
        });
        Object.defineProperty(group,'value',{get:()=>group.querySelector('input:checked')?.value});
        group.append(legend,segments);form.append(group);return group;
      }
      function dropdown(label,options,value){
        const input=document.createElement('select');options.forEach(([key,name])=>appendOption(input,key,name));input.value=value;
        input.setAttribute('aria-label',label+' · '+owner.name);field(label,input);return input;
      }
      const mode=select('Type d’objectif',[['min','Au moins'],['max','Au maximum']],goal.mode,'mode');
      const target=document.createElement('input');target.type='number';target.required=true;target.max='1000000';target.value=goal.unit==='duration' && goal.scale==='hours'?goal.target/60:goal.target;target.setAttribute('aria-label','Quantité visée · '+owner.name);field('Cible',target);
      const unit=select('Unité',[['count','Fois'],['distance','km'],['minutes','min'],['hours','h']],goal.unit==='duration'?goal.scale==='hours'?'hours':'minutes':goal.unit || 'count','unit');
      const period=dropdown('Fréquence',[['day','Par jour'],['week','Par semaine'],['month','Par mois'],['year','Par an']],goal.period);
      const startDate=appendGoalStartDate(form,goal.startDate || '');
      const display=select('Affichage',[['bar','Barre'],['ring','Cercle']],goal.display || 'bar','display');
      const threshold=document.createElement('div');threshold.className='goal-threshold-fields';threshold.append(target.closest('label'),unit);mode.after(threshold);
      const updateLimits=()=>{target.step=unit.value==='count'?'1':'any';target.min=mode.value==='max'?'0':unit.value==='count'?'1':'0.01';};updateLimits();
      const update=()=>{
        updateLimits();const next={...goal,mode:mode.value,period:period.value,display:display.value,unit:['minutes','hours'].includes(unit.value)?'duration':unit.value,scale:unit.value==='hours'?'hours':'minutes',target:Number(target.value)*(unit.value==='hours'?60:1)};
        const savedDate=startDate.value;
        if(savedDate)next.startDate=savedDate;else delete next.startDate;
        if(!target.checkValidity() || !validGoal(next)){onChange(null);return;}
        onChange(next);
      };
      const frequencyLabel=period.closest('label');
      frequencyLabel.className='goal-frequency-field';
      threshold.append(frequencyLabel);
      if(isCreation)target.id='newGoalTarget';
      withNumberStepper(target);
      [mode,unit,target,period,display].forEach(input=>input.addEventListener('input',update));
      startDate.addEventListener('change',update);
    return form;
  }
  const goalEdits=new Map();
  function equivalentGoals(left,right) {
    return left.mode===right.mode && left.target===right.target && left.period===right.period &&
      left.display===right.display && left.unit===right.unit && (left.startDate || '')===(right.startDate || '') &&
      (left.unit!=='duration' || (left.scale || 'minutes')===(right.scale || 'minutes'));
  }
  function refreshGoalEditor() {
    const invalid=[...goalEdits.values()].some(edit=>edit?.invalid);
    $('#saveGoalEditor').disabled=!goalEdits.size || invalid;
    const error=$('#goalEditorError');
    error.hidden=!invalid;error.textContent=invalid?'Vérifiez la cible et la date de début de l’objectif.':'';
  }
  function appendGoalDraft(owner,goal,isNew=false) {
    const fields=$('#goalEditorFields'),block=document.createElement('section');block.className='single-goal-form';
    const form=buildGoalFields(owner,goal,next=>{
      if(!next)goalEdits.set(goal.id,{invalid:true});
      else if(!isNew && equivalentGoals(goal,next))goalEdits.delete(goal.id);
      else goalEdits.set(goal.id,{value:next,isNew});
      refreshGoalEditor();
    });
    block.dataset.goalId=goal.id;
    fields.querySelector('.empty-state')?.remove();
    block.append(form);fields.append(block);
    if(isNew)goalEdits.set(goal.id,{value:goal,isNew});
  }
  $('#addOwnerGoal').addEventListener('click',()=>{
    const owner=ownerById(goalEditorOwner);if(!owner)return;
    appendGoalDraft(owner,{id:'goal-'+crypto.randomUUID(),mode:'min',target:1,period:'week',unit:'count',display:'bar',startDate:localDateKey(new Date())},true);
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
  function editableSavedGoals(owner){
    return goalsOf(owner).filter(goal=>!goalEditorSelection || goal.id===goalEditorSelection);
  }
  function showGoalDeleteConfirmation(show){
    $('#goalEditorForm').hidden=show;
    $('#goalDeleteConfirmation').hidden=!show;
    const dialog=$('#goalEditorDialog');
    if(show){
      $('#goalEditorTitle').textContent='Supprimer l’objectif ?';
      dialog.setAttribute('aria-describedby','goalDeleteDescription');
      $('#cancelGoalDelete').focus();
    }else{
      $('#goalEditorTitle').textContent=goalEditorSelection?'Modifier l’objectif':'Objectifs';
      dialog.removeAttribute('aria-describedby');
    }
  }
  $('#deleteGoalEditor').addEventListener('click',()=>{
    const goals=editableSavedGoals(ownerById(goalEditorOwner));
    if(!goals.length)return;
    const choice=$('#goalDeleteChoice');choice.replaceChildren();
    goals.forEach(goal=>appendOption(choice,goal.id,goalDescription(goal)));
    $('#goalDeleteChoiceLabel').hidden=goals.length===1;
    showGoalDeleteConfirmation(true);
  });
  function cancelGoalDeletion(){
    showGoalDeleteConfirmation(false);
    $('#deleteGoalEditor').focus();
  }
  $('#cancelGoalDelete').addEventListener('click',cancelGoalDeletion);
  $('#confirmGoalDelete').addEventListener('click',()=>{
    const owner=ownerById(goalEditorOwner),id=$('#goalDeleteChoice').value;
    if(!owner || !editableSavedGoals(owner).some(goal=>goal.id===id))return;
    const remaining=goalsOf(owner).filter(goal=>goal.id!==id);
    persistItem(owner,{goals:remaining});
    goalEdits.delete(id);
    if(goalEditorSelection){$('#goalEditorDialog').close();return;}
    const fields=$('#goalEditorFields');
    [...fields.children].find(block=>block.dataset.goalId===id)?.remove();
    if(!fields.children.length)appendEmpty(fields,'Ajoutez un objectif pour cette activité ou catégorie.');
    $('#deleteGoalEditor').hidden=!remaining.length;
    showGoalDeleteConfirmation(false);
    ($('#deleteGoalEditor').hidden?$('#addOwnerGoal'):$('#deleteGoalEditor')).focus();
    refreshGoalEditor();
  });
  let discardAction;
  function confirmDiscard(action,description='Les modifications en cours seront perdues.'){
    const confirm=$('#discardGoalDialog');
    if(confirm.open)return;
    discardAction=action;
    $('#discardGoalDescription').textContent=description;confirm.showModal();
  }
  function requestGoalDialogClose(dialog,dirty) {
    if(!dirty){dialog.close();return;}
    confirmDiscard(()=>dialog.close());
  }
  function requestGoalEditorClose() {if(!$('#goalDeleteConfirmation').hidden){cancelGoalDeletion();return;}requestGoalDialogClose($('#goalEditorDialog'),goalEdits.size>0);}
  $('#goalEditorDialog').addEventListener('close',()=>goalEdits.clear());
  $('#goalEditorDialog').addEventListener('cancel',event=>{event.preventDefault();requestGoalEditorClose();});
  ['#closeGoalEditor','#cancelGoalEditor'].forEach(id=>$(id).addEventListener('click',requestGoalEditorClose));
  ['#closeDiscardGoal','#keepGoalEditing'].forEach(id=>$(id).addEventListener('click',()=>$('#discardGoalDialog').close()));
  $('#discardGoalEdits').addEventListener('click',()=>{const action=discardAction;$('#discardGoalDialog').close();action?.();});

  function renderGoalFilters() {
    const calendar=calendarIsOpen('goals');
    const filter=calendar?calendarState:normalizeCalendarFilters({categoryId:goalCategoryFilter,activityIds:goalActivityFilter,status:goalStatusFilter,frequencies:goalFrequencyFilter});
    const {categoryId,activityIds,status}=filter;
    if(!calendar){goalCategoryFilter=categoryId;goalActivityFilter=activityIds;}
    const activities=categoryId?state.activities.filter(activity=>activity.categoryId===categoryId):[];
    const allSelected=!categoryId || allActivitiesSelected(activityIds,activities);
    function apply(patch){
      const next={...filter,...patch};
      if(calendar)Object.assign(calendarState,normalizeCalendarFilters(next));
      else{filtersUseDefaults.goals=false;applyGoalFilter(next);}
      renderGoals();persist();
    }
    const choices=$('#goalCategoryChoices');choices.replaceChildren();
    for(const item of [{id:null,name:'Toutes'},...categories]){
      choices.append(filterChip(item.id?categoryLabel(item):item.name,categoryId===item.id,()=>{
        if(categoryId!==item.id)apply({categoryId:item.id,activityIds:null});
      }));
    }
    const activityChoices=$('#goalActivityChoices');activityChoices.replaceChildren();
    const refresh=(id,ids)=>rerenderActivityFilter(activityChoices,id,()=>apply({activityIds:ids}));
    const all=filterChip('Toutes',allSelected,()=>{
      if(activities.length)refresh('all',allSelected?[]:null);
    });
    all.dataset.activityFilter='all';activityChoices.append(all);
    activities.forEach(activity=>{
      const selected=activityIds===null || activityIds.includes(activity.id);
      const button=filterChip(activity.name,selected,()=>{
        const previous=activityIds ?? activities.map(item=>item.id);
        const next=selected?previous.filter(id=>id!==activity.id):[...previous,activity.id];
        refresh(activity.id,allActivitiesSelected(next,activities)?null:next);
      });
      button.dataset.activityFilter=activity.id;activityChoices.append(button);
    });
    renderGoalFrequencyChoices(filter.frequencies,apply);
    renderFilterButtonState('goal',[categoryId,!allSelected,status!=='all',filter.frequencies.length]);
    const states=$('#goalStatusChoices');states.replaceChildren();
    goalFilterStatuses.forEach(([value,label])=>states.append(filterChip(label,status===value,()=>apply({status:value}))));
  }
  function renderGoalFrequencyChoices(frequencies,apply){
    const group=$('#goalFrequencyChoices'),focused=group.contains(document.activeElement)&&document.activeElement.dataset.frequency;
    group.replaceChildren();
    const options=[['all','Tous'],...goalFrequencyOptions];
    options.forEach(([period,label])=>{
      const active=period==='all'?!frequencies.length:frequencies.includes(period);
      const button=filterChip(label,active,()=>apply({frequencies:period==='all'?[]:active
        ?frequencies.filter(value=>value!==period):[...frequencies,period]}));
      button.dataset.frequency=period;
      group.append(button);
      if(focused===period)button.focus({preventScroll:true});
    });
  }
  const GEAR='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m9 3-1 3-3 1-2 3 2 2-1 3 2 3 3-1 2 2h3l1-3 3-1 2-3-2-2 1-3-2-3-3 1-2-2Z"/><circle cx="12" cy="12" r="3"/></svg>';
  function gearButton(button,text){button.classList.add('settings-button');button.replaceChildren();const icon=document.createElement('span');icon.innerHTML=GEAR;const label=document.createElement('span');label.textContent=text;button.append(icon,label);}

  let emojiOwner=null,emojiOwnerButton=null,emojiChooseAction=null,emojiCategory='all',emojiLimit=144,emojiDataPromise=null;
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
  function openEmojiKeyboard(category,button,onChoose=null) {
    emojiChooseAction=onChoose;emojiOwner=category;emojiOwnerButton=button;emojiCategory='all';emojiLimit=144;$('#emojiSearch').value='';$('#emojiTone').value='0';$('#customEmoji').value='';$('#emojiDialogTitle').textContent='Emoji · '+category.name;
    renderEmojiGroups();renderEmojiCatalog();$('#emojiDialog').showModal();
    $('#emojiCatalogStatus').textContent='Chargement du catalogue…';
    loadEmojiData().then(()=>{if($('#emojiDialog').open)renderEmojiCatalog();}).catch(()=>{$('#emojiCatalogStatus').textContent='Catalogue indisponible. Vous pouvez coller un emoji ou rouvrir le clavier pour réessayer.';});
  }
  function renderEmojiGroups(){const root=$('#emojiGroups');root.replaceChildren();EMOJI_GROUPS.forEach(([value,label])=>{const button=makeButton(label,()=>{emojiCategory=value;emojiLimit=144;renderEmojiGroups();renderEmojiCatalog();});button.setAttribute('aria-pressed',String(value===emojiCategory));root.append(button);});}
  function chooseCategoryEmoji(value){if(!emojiOwner)return;if(emojiChooseAction)emojiChooseAction(value);else{emojiOwner.emoji=value;emojiOwnerButton.textContent=value || '＋';persistItem(emojiOwner,{emoji:value});}$('#emojiDialog').close();}
  function renderEmojiCatalog() {
    const query=normalizedSearch($('#emojiSearch').value.trim()),tone=$('#emojiTone').value;
    const matches=emojiCatalog.filter(entry=>(emojiCategory==='all' || entry.group===emojiCategory) && (tone==='all' || entry.tone===0 || String(entry.tone)===tone) && (!query || query.split(/\s+/).every(word=>entry.search.includes(word))));
    const root=$('#emojiCatalog');root.replaceChildren();matches.slice(0,emojiLimit).forEach(entry=>{const button=makeButton(entry.emoji,()=>chooseCategoryEmoji(entry.emoji));button.title=entry.label;button.setAttribute('aria-label','Choisir '+entry.emoji+' pour '+(emojiOwner?.name || 'la catégorie'));root.append(button);});
    if(!matches.length)appendEmpty(root,'Aucun emoji ne correspond à cette recherche.');$('#moreEmojis').hidden=matches.length<=emojiLimit;$('#emojiCatalogStatus').textContent=matches.length+' emojis · '+Math.min(matches.length,emojiLimit)+' affichés';
  }
  $('#emojiSearch').addEventListener('input',()=>{emojiLimit=144;renderEmojiCatalog();});$('#emojiTone').addEventListener('change',()=>{emojiLimit=144;renderEmojiCatalog();});$('#moreEmojis').addEventListener('click',()=>{emojiLimit+=144;renderEmojiCatalog();});
  $('#customEmoji').addEventListener('input',()=>{const value=$('#customEmoji').value.trim();if([...new Intl.Segmenter('fr',{granularity:'grapheme'}).segment(value)].length===1 && /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(value))chooseCategoryEmoji(value);});
  $('#clearCategoryEmoji').addEventListener('click',()=>chooseCategoryEmoji(''));$('#closeEmojiDialog').addEventListener('click',()=>$('#emojiDialog').close());

  function initComponentReference(){
    const root=$('#componentsView'),feedback=$('#referenceFeedback');
    const announce=label=>{feedback.textContent=label+' · exemple activé';};
    $('#referenceFont').textContent='Police : '+getComputedStyle(root.closest('#app') || document.body).fontFamily.split(',')[0].replace(/["']/g,'');
    bindSectionTabs($('#referenceTabs'));
    const menu=$('#referenceMenu'),menuToggle=$('#referenceMenuToggle');
    function toggleMenu(open){
      menu.hidden=!open;menuToggle.setAttribute('aria-expanded',String(open));
    }
    menuToggle.addEventListener('click',()=>toggleMenu(menu.hidden));
    menu.addEventListener('click',event=>{
      if(!event.target.closest('button'))return;
      announce(event.target.textContent);toggleMenu(false);menuToggle.focus();
    });
    document.addEventListener('click',event=>{
      if(!menu.hidden && !menu.contains(event.target) && !menuToggle.contains(event.target))toggleMenu(false);
    });
    root.addEventListener('keydown',event=>{
      if(event.key==='Escape' && !menu.hidden){toggleMenu(false);menuToggle.focus();}
    });
    $('#referenceActions').addEventListener('click',event=>{
      if(event.target.dataset.referenceAction)announce(event.target.dataset.referenceAction);
    });
    const icons=[
      ...[...$('#mainNavigation').querySelectorAll('button')].map(button=>[button.textContent.trim(),button.querySelector('svg')]),
      ['Réglages',$('#openPreferences svg')],['Profil',$('#openProfile svg')],['Journal',$('#openJournal svg')],
      ['Catégories',$('#preferencesCatalogTab svg')],
      ['Filtrer',$('#statsFilterToggle svg')],['Réinitialiser',$('#statsQuickReset svg')],['Ajouter',$('#openDailyActivity svg')],
      ['Galerie',$('#activityFormats [aria-label=Galerie] svg')],['Liste',$('#activityFormats [aria-label=Liste] svg')],
      ['Fermer',$('#closeDailyActivity svg')],['Déconnexion',$('#logout svg')]
    ];
    icons.forEach(([name,icon])=>{
      if(!icon)return;
      const sample=makeElement('li');sample.append(icon.cloneNode(true),makeElement('span',null,name));$('#referenceIcons').append(sample);
    });
    [['✎','Modifier'],['move','Déplacer'],['delete','Supprimer']].forEach(([name,label])=>{
      const item=makeElement('li'),action=name==='✎'?makeButton(name,()=>announce(label),'catalog-icon-action'):catalogActionButton(name,label,()=>announce(label));
      action.setAttribute('aria-label',label);
      item.append(action,makeElement('span',null,label));$('#referenceIcons').append(item);
    });
    withNumberStepper($('#referenceCount'));
    const chipLabels=['Sport','Lecture','Travail'];
    ['#referenceChips','#referenceDrawerChips'].forEach(id=>chipLabels.forEach((label,index)=>{
      const chip=filterChip(label,index===0,()=>chip.setAttribute('aria-pressed',String(chip.getAttribute('aria-pressed')==='false')));
      $(id).append(chip);
    }));
    function referenceSwitch(id,options,selected){
      const group=$(id);
      options.forEach(([key,label,icon])=>{
        const button=makeButton(icon?'':label,()=>syncSegmentedSwitch(group,'value',key));
        button.dataset.value=key;
        if(icon){button.append(icon.cloneNode(true));button.setAttribute('aria-label',label);button.title=label;}
        group.append(button);
      });
      syncSegmentedSwitch(group,'value',selected);
      referenceSwitchObserver?.observe(group);
    }
    const referenceSwitchObserver=typeof ResizeObserver==='function'?new ResizeObserver(items=>items.forEach(({target})=>updateSegmentIndicator(target))):null;
    referenceSwitch('#referencePeriodSwitch',[['day','Jour'],['week','Semaine'],['month','Mois'],['year','Année']],'day');
    referenceSwitch('#referenceFormatSwitch',[['cards','Galerie',icons.find(([label])=>label==='Galerie')[1]],['list','Liste',icons.find(([label])=>label==='Liste')[1]]],'cards');

    const initial=localDateKey(new Date());
    Object.entries({day:'Jour',week:'Semaine',month:'Mois',year:'Année'}).forEach(([period,label])=>{
      const sample=makeElement('div','reference-sample'),nav=makeElement('div','period-navigation');
      const trigger=makeElement('button','period-trigger'),input=makeElement('input');
      trigger.type='button';trigger.id='reference-date-'+period;input.type='date';input.id=trigger.id+'-value';
      function refresh(date){updateDateNavigation(trigger.id,input.id,date,period);}
      const previous=makeButton('',()=>refresh(shiftDate(input.value,period,-1)),'period-arrow');
      const next=makeButton('',()=>refresh(shiftDate(input.value,period,1)),'period-arrow');
      previous.append($('#agendaPrevious svg').cloneNode(true));previous.setAttribute('aria-label','Période précédente');
      next.append($('#agendaNext svg').cloneNode(true));next.setAttribute('aria-label','Période suivante');
      nav.append(previous,trigger,input,next,makeButton('Aujourd’hui',()=>refresh(initial),'today-button'));
      sample.append(makeElement('h3',null,label),nav);$('#referenceDateExamples').append(sample);
      bindDatePicker(trigger,input);input.addEventListener('change',()=>refresh(input.value));refresh(initial);
    });
    const statYearSample=makeElement('div','reference-sample'),statSelect=makeElement('select','date-control');
    statSelect.setAttribute('aria-label','Année des statistiques');
    const year=Number(initial.slice(0,4));
    [year,year-1,year-2].forEach(value=>appendOption(statSelect,String(value),String(value)));
    statYearSample.append(makeElement('h3',null,'Sélecteur d’année · Statistiques'),statSelect);$('#referenceDateExamples').append(statYearSample);

    $('#referenceDisclosureIcon').innerHTML=catalogIcon('chevron');
    const table=listTable($('#referenceTable'),'Activités d’exemple',['Activité','Occurrences','Durée']);
    [['Running','2','45 min'],['Lecture','1','30 min']].forEach(([name,count,duration])=>{
      const row=table.insertRow();rowLabel(row,name);row.insertCell().textContent=count;row.insertCell().textContent=duration;
    });
    $('#referenceTiles').append(statCard('Occurrences','12','4 jours actifs'),statCard('Durée totale','3 h 20'));
    const goal={mode:'min',period:'week',target:5,unit:'count',display:'bar'},result={count:3,tone:'warning',status:'En progression'};
    $('#referenceProgress').append(createProgress(result,goal),createProgress(result,{...goal,display:'ring'}));
    $('#referenceGoalMeasure').append(createProgress(result,goal));
    const statusLabels=[['success','Atteint'],['warning','En progression'],['danger','Non tenu'],['exceeded','Dépassé'],['pending','À accomplir'],['future','À venir']];
    statusLabels.forEach(([tone,label])=>{
      const chip=makeElement('span','list-status',label);chip.dataset.tone=tone;$('#referenceStatuses').append(chip);
    });
    appendWorkspaceEmpty($('#referenceEmpty'),'Aucun résultat','Essaie de modifier les filtres.','activities');
    [['#referenceOpenDialog','#referenceDialog'],['#referenceOpenDrawer','#referenceDrawer']].forEach(([button,id])=>{
      const dialog=$(id);
      $(button).addEventListener('click',()=>dialog.showModal());
      dialog.querySelectorAll('[data-reference-close]').forEach(close=>close.addEventListener('click',()=>{
        if(dialog.classList.contains('filter-drawer'))closeFilterDrawer(dialog);
        else dialog.close();
      }));
    });
  }
  initComponentReference();

  const onboardingDialog=$('#onboardingDialog'),onboardingTitle=$('#onboardingTitle');
  const onboardingCategoryForm=$('#onboardingCategoryForm'),onboardingActivityForm=$('#onboardingActivityForm');
  const onboardingCategoryName=$('#onboardingCategoryName'),onboardingActivityName=$('#onboardingActivityName');
  const onboardingActivityCategory=$('#onboardingActivityCategory'),onboardingNext=$('#onboardingNext');
  let onboardingStep=0;

  function showOnboardingError(message=''){
    const error=$('#onboardingError');
    error.hidden=!message;error.textContent=message;
  }
  function renderOnboarding(){
    const firstName=currentAccount?.displayName?.trim().split(/\s+/)[0];
    const welcome=firstName?'Bienvenue, '+firstName+' !':'Bienvenue dans Year Tracker';
    const titles=[welcome,'Tes catégories','Tes activités','Ton calendrier est prêt'];
    onboardingTitle.textContent=titles[onboardingStep];
    $('#onboardingStep').textContent=onboardingStep===1?'Étape 1 sur 2':onboardingStep===2?'Étape 2 sur 2':'';
    $('#onboardingStep').hidden=!$('#onboardingStep').textContent;
    onboardingDialog.querySelectorAll('[data-onboarding-panel]').forEach(panel=>{panel.hidden=Number(panel.dataset.onboardingPanel)!==onboardingStep;});
    $('#onboardingBack').hidden=onboardingStep===0 || onboardingStep===3;
    $('#onboardingLater').hidden=onboardingStep===3;
    onboardingNext.textContent=['Commencer','Continuer','Terminer','Ouvrir Ma journée'][onboardingStep];
    onboardingNext.disabled=(onboardingStep===1 && !categories.length) || (onboardingStep===2 && !state.activities.length);

    const selected=onboardingActivityCategory.value;
    onboardingActivityCategory.replaceChildren();
    categories.forEach(category=>appendOption(onboardingActivityCategory,category.id,categoryLabel(category)));
    if(categories.some(category=>category.id===selected))onboardingActivityCategory.value=selected;
    $('#onboardingCategories').replaceChildren(...categories.map(category=>makeElement('li',null,categoryLabel(category))));
    renderOnboardingActivities();
    const categoryCount=categories.length,activityCount=state.activities.length;
    $('#onboardingSummary').textContent=categoryCount+' catégorie'+(categoryCount===1?'':'s')+' et '+activityCount+' activité'+(activityCount===1?'':'s')+' dans ton espace.';
  }
  function renderOnboardingActivities(){
    const rows=state.activities.filter(activity=>activity.categoryId===onboardingActivityCategory.value);
    $('#onboardingActivities').replaceChildren(...rows.map(activity=>{
      const item=makeElement('li',null,activity.name);
      item.style.setProperty('--activity-color',activity.color);
      return item;
    }));
  }
  function goToOnboardingStep(step){
    onboardingStep=step;showOnboardingError();renderOnboarding();
    onboardingTitle.focus({preventScroll:true});
  }
  function openOnboarding(){
    if(onboardingDialog.open)return;
    onboardingCategoryForm.reset();onboardingActivityForm.reset();
    onboardingStep=0;showOnboardingError();renderOnboarding();
    onboardingDialog.showModal();onboardingTitle.focus({preventScroll:true});
  }
  function dismissOnboarding(){
    if(onboardingStatus==='pending'){onboardingStatus='dismissed';persist();}
    onboardingDialog.close();
  }
  $('#openOnboarding').addEventListener('click',openOnboarding);
  $('#closeOnboarding').addEventListener('click',dismissOnboarding);
  $('#onboardingLater').addEventListener('click',dismissOnboarding);
  $('#onboardingBack').addEventListener('click',()=>goToOnboardingStep(onboardingStep-1));
  onboardingNext.addEventListener('click',()=>{
    if(onboardingNext.disabled)return;
    if(onboardingStep===2){onboardingStatus='complete';persist();}
    if(onboardingStep===3){onboardingDialog.close();setPage('day');return;}
    goToOnboardingStep(onboardingStep+1);
  });
  [onboardingCategoryName,onboardingActivityName].forEach(input=>input.addEventListener('input',()=>showOnboardingError()));
  onboardingActivityCategory.addEventListener('change',()=>{showOnboardingError();renderOnboardingActivities();});
  onboardingCategoryForm.addEventListener('submit',event=>{
    event.preventDefault();
    if(!onboardingDialog.open)return;
    const name=onboardingCategoryName.value.trim();
    const error=categoryNameError(name);
    if(error){showOnboardingError(error);onboardingCategoryName.focus();return;}
    const category=addCatalogCategory(name,'🗂️');
    onboardingCategoryName.value='';
    commitCatalog('Catégorie ajoutée.');
    renderOnboarding();onboardingActivityCategory.value=category.id;renderOnboardingActivities();
    onboardingCategoryName.focus();
  });
  onboardingActivityForm.addEventListener('submit',event=>{
    event.preventDefault();
    if(!onboardingDialog.open)return;
    const categoryId=onboardingActivityCategory.value,name=onboardingActivityName.value.trim();
    if(!name || !categories.some(item=>item.id===categoryId)){
      showOnboardingError('Choisis une catégorie et saisis un nom d’activité.');return;
    }
    if(state.activities.some(activity=>activity.categoryId===categoryId && activity.name.toLocaleLowerCase()===name.toLocaleLowerCase())){
      showOnboardingError('Une activité porte déjà ce nom dans cette catégorie.');return;
    }
    addCatalogActivity(categoryId,name);
    onboardingActivityName.value='';
    commitCatalog('Activité ajoutée.');
    renderOnboarding();onboardingActivityName.focus();
  });

  const draftClosers={dayPicker:closeDayEditor,dailyActivityDialog:requestDailyActivityClose,onboardingDialog:dismissOnboarding};
  document.querySelectorAll('#app dialog').forEach(dialog=>{
    let outside=false;
    const isOutside=event=>{const rect=dialog.getBoundingClientRect();return event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom;};
    dialog.addEventListener('pointerdown',event=>{outside=event.target===dialog&&isOutside(event);});
    dialog.addEventListener('click',event=>{
      const filterDrawer=dialog.classList.contains('filter-drawer');
      if((outside || filterDrawer) && event.target===dialog && isOutside(event)){
        if(filterDrawer)closeFilterDrawer(dialog);
        else if(draftClosers[dialog.id])draftClosers[dialog.id]();
        else if(dialog.id==='goalEditorDialog')requestGoalEditorClose();
        else if(dialog.id==='newGoalDialog')requestNewGoalClose();
        else{document.activeElement?.blur();persist();if(dialog.open)dialog.close();}
      }
      outside=false;
    });
    if(draftClosers[dialog.id])dialog.addEventListener('cancel',event=>{event.preventDefault();draftClosers[dialog.id]();});
    else if(!['goalEditorDialog','newGoalDialog'].includes(dialog.id) && !dialog.classList.contains('filter-drawer'))dialog.addEventListener('cancel',event=>{event.preventDefault();document.activeElement?.blur();if(dialog.id!=='discardGoalDialog')persist();if(dialog.open)dialog.close();});
    if(!draftClosers[dialog.id])dialog.addEventListener('close',persist);
  });
  document.querySelectorAll('#dailyActivityForm input[type=number]').forEach(input=>withNumberStepper(input));
  $('#authRetry').addEventListener('click',()=>location.reload());
  $('#cloudModule')?.addEventListener('error',()=>{
    $('#authLoader').hidden=true;$('#authCard').hidden=false;
    $('#authStatus').textContent='Impossible de charger la connexion. Vérifiez le réseau puis rechargez la page.';
    $('#authRetry').hidden=false;
  });
  window.calendarApp.start=()=>{
    statsYear=null;statsMetric='count';statsCategoryId=null;statsActivityIds=null;statsDay=null;
    expandedStatsCategories.clear();
    agendaDate=localDateKey(new Date());
    visitedWorkspacePages.clear();
    for(const page of Object.keys(memoryFields))resetUnrememberedView(page,'reload');
    clearTrackingCatalog();
    setPage('day',false);render();
    if(onboardingStatus==='pending')openOnboarding();
  };




