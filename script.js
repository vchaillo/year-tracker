

  const controlIconPaths={'+':'M12 5v14M5 12h14','−':'M5 12h14','✎':'m4 16 12-12 4 4L8 20H4v-4Zm10-10 4 4'};
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
    const storeFilters=!forStorage;
    return JSON.parse(JSON.stringify({schemaVersion: 9, paletteVersion: 3, year:forStorage?new Date().getFullYear():state.year, categories,
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
      loadSavedState(JSON.parse(JSON.stringify(data)));
      render();
      dayDraft?.refresh();
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
    return activeQuickFilter(currentPage==='calendar'?'calendar':'activities').categoryId;
  }
  let activityExtraFilter=null;
  function filterCategoryIds(filter){
    const ids=Array.isArray(filter?.categoryIds)?filter.categoryIds:[filter?.categoryId];
    return [...new Set(ids.filter(id=>categories.some(category=>category.id===id)))];
  }
  function filterCategoriesPatch(ids){
    return {categoryId:ids.length===1?ids[0]:null,categoryIds:ids.length>1?ids:null};
  }
  function activitiesForCategories(ids){
    return state.activities.filter(activity=>!ids.length || ids.includes(activity.categoryId));
  }
  function filterChip(text,selected,action){
    const button=makeButton(text,action);button.setAttribute('aria-pressed',String(selected));return button;
  }
  function activityResultCount(reference,period,visible){
    const [start,end]=periodBounds(reference,period);
    return Object.entries(state.entries).reduce((count,[date,ids])=>
      date>=start && date<=end?count+ids.filter(id=>visible.has(id)).length:count,0);
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
        day.type='button';
        day.dataset.date=key;
        const canEdit=entryIds.length>0;
        day.append(makeElement('span','calendar-year-number',String(dayNumber)));
        day.insertAdjacentHTML('beforeend',controlIcon(controlIconPaths[canEdit?'✎':'+']));
        day.lastElementChild.classList.add('calendar-year-action');
        day.setAttribute(
          'aria-label',
          `${dayNumber} ${monthName} ${year}`
        );
        day.setAttribute('aria-description',canEdit?'Modifier la journée':'Ajouter une activité');

        if (
          today.getFullYear() === year &&
          today.getMonth() === month &&
          today.getDate() === dayNumber
        ) {
          day.classList.add('today');
        }

        if (visibleIds.length) {
          day.classList.add('marked');
          setActivityDayColors(day,visibleIds);
          if (visibleIds.length > 1) day.classList.add('multi');
        }

        if (visibleIds.length) day.dataset.previewDate=key;
        if (visibleIds.some(id=>state.details[key]?.[id]?.note || state.details[key]?.[id]?.distance != null || (state.details[key]?.[id]?.count || 1)>1)) day.classList.add('has-note');
        day.addEventListener('click',()=>{
          if(canEdit)openDayOverview(key);
          else openDailyActivityDialog({date:key});
        });
        day.addEventListener('contextmenu', event => {event.preventDefault();openDayOverview(key);});
        days.appendChild(day);
      }

      calendar.appendChild(monthElement);
    });
  }

  function setActivityDayColors(day,ids){
    const colors=ids.map(id=>activityById(id)?.color).filter(Boolean);
    if(!colors.length)return;
    day.dataset.activityDay='';
    day.style.setProperty('--activity-day-color',colors[0]);
    day.style.setProperty('--activity-day-paint',createGradient(colors));
    day.style.setProperty('--activity-day-tint',createGradient(colors.map(color=>'color-mix(in srgb, '+color+' 26%, var(--surface))')));
  }

  function createGradient(colors) {

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

  const activityEditDialog=$('#dayPicker'),activityEditPanel=$('#activityEditPanel');
  let dayDraft = null;

  function openActivityEditor(key,id,fromDayOverview=false){
    const activity=activityById(id);
    if(!activity || !(state.entries[key] || []).includes(id))return;
    dayDraft={key,id,date:key,patch:{},refresh:null,fromDayOverview};
    $('#editActivityHeading').textContent=activity.name;
    updateDateNavigation('editActivityDateLabel','editActivityDate',key);
    const category=categories.find(item=>item.id===activity.categoryId);
    for(const [selector,value,label] of [
      ['#editActivityCategory',activity.categoryId,categoryLabel(category)],
      ['#editActivityName',activity.id,activity.name]
    ]){
      const select=$(selector);
      select.replaceChildren();
      appendOption(select,value,label);
    }
    const top=makeElement('div','daily-activity-metrics activity-measures');
    const countLabel=document.createElement('label');countLabel.textContent='Occurrences';
    const count=document.createElement('input');count.type='number';count.min='1';count.max='1000';count.step='1';count.required=true;count.inputMode='numeric';count.setAttribute('aria-label','Nombre de séances · '+activity.name);countLabel.append(count);
    const distanceLabel=document.createElement('label');distanceLabel.append('Distance ',makeElement('span',null,'(km)'));
    const distance=document.createElement('input');distance.type='number';distance.min='0';distance.max='100000';distance.step='any';distance.placeholder='—';distance.inputMode='decimal';distance.setAttribute('aria-label','Distance en kilomètres · '+activity.name);distanceLabel.append(distance);
    const fields=document.createElement('label');fields.className='activity-edit-note';fields.textContent='Note';
    const note=document.createElement('textarea');note.maxLength=2000;note.rows=1;note.setAttribute('aria-label','Note · '+activity.name);fields.append(note);
    const read=()=>{
      const current=state.details[key]?.[id] || {};
      const included=(state.entries[key] || []).includes(id);
      return {...current,count:included?current.count || 1:0,...dayDraft.patch};
    };
    const update=()=>{const value=read();count.value=value.count;distance.value=value.distance ?? '';note.value=value.note || '';duration.value=value.durationMinutes ?? '';};
    const stage=patch=>{Object.assign(dayDraft.patch,patch);clearInvalid('#activityEditPanel');};
    count.addEventListener('input',()=>{if(!count.checkValidity()){markInvalid('#activityEditPanel','Nombre entier positif requis');return;}stage({count:Number(count.value)});});
    distance.addEventListener('input',()=>{if(!distance.checkValidity()){markInvalid('#activityEditPanel','Distance positive requise');return;}stage({distance:distance.value===''?null:Number(distance.value)});});
    note.addEventListener('input',()=>stage({note:note.value}));
    const durationLabel=document.createElement('label');durationLabel.append('Durée ',makeElement('span',null,'(min)'));const duration=document.createElement('input');duration.type='number';duration.min='0';duration.max='1000000';duration.step='any';duration.inputMode='decimal';duration.placeholder='—';duration.setAttribute('aria-label','Durée en minutes · '+activity.name);durationLabel.append(duration);duration.addEventListener('input',()=>{if(!duration.checkValidity()){markInvalid('#activityEditPanel','Durée positive requise');return;}stage({durationMinutes:duration.value===''?null:Number(duration.value)});});
    top.append(countLabel,durationLabel,distanceLabel);
    [count,distance,duration].forEach(input=>withNumberStepper(input));
    $('#editActivityFields').replaceChildren(top,fields);
    dayDraft.refresh=()=>{if(!Object.keys(dayDraft.patch).length && [count,distance,duration].every(input=>input.validity.valid))update();};
    update();
    clearInvalid('#activityEditPanel');
    if(fromDayOverview){
      calendarDayOverview.hidden=true;
      calendarDayDialog.append(activityEditPanel);
      calendarDayDialog.setAttribute('aria-labelledby','dayPickerTitle');
      $('#closeDayPicker').focus({preventScroll:true});
    }else activityEditDialog.showModal();
  }
  activityEditDialog.addEventListener('close',()=>{
    if(!activityEditDialog.open && !dayDraft?.fromDayOverview)dayDraft=null;
  });
  function finishActivityEditor(){
    if(!dayDraft?.fromDayOverview){activityEditDialog.close();return;}
    const editedId=dayDraft.id;
    activityEditDialog.append(activityEditPanel);
    dayDraft=null;
    calendarDayOverview.hidden=false;
    calendarDayDialog.setAttribute('aria-labelledby','calendarDayDialogTitle');
    renderDayOverview(editedId);
  }
  function setEditActivityDate(date){
    if(!dayDraft || !date)return;
    dayDraft.date=date;
    updateDateNavigation('editActivityDateLabel','editActivityDate',date);
    clearInvalid('#activityEditPanel');
  }
  $('#editActivityDate').addEventListener('change',event=>setEditActivityDate(event.target.value));
  for(const [id,offset] of [['#editActivityDatePrevious',-1],['#editActivityDateNext',1]]){
    $(id).addEventListener('click',()=>{if(dayDraft)setEditActivityDate(shiftDate(dayDraft.date,'day',offset));});
  }
  $('#editActivityDateToday').addEventListener('click',()=>setEditActivityDate(localDateKey(new Date())));
  function confirmActivityRemoval(date,id,afterRemoval){
    const activity=activityById(id);
    if(!activity)return;
    const question=makeElement('p');
    question.append('Êtes-vous sûr de vouloir supprimer ',makeElement('strong',null,activity.name),
      ' pour le ',makeElement('strong',null,formatDate(date)),' ?');
    const warning=makeElement('p','catalog-action-warning','Cette action est irréversible.');
    openCatalogAction('Supprimer cette activité ?', [question,warning],
      'Supprimer',[],()=>{
        saveActivitySession(date,id,{count:0});afterRemoval?.();return true;
      });
  }
  $('#deleteDayPicker').addEventListener('click',()=>{
    if(dayDraft)confirmActivityRemoval(dayDraft.key,dayDraft.id,finishActivityEditor);
  });
  function closeDayEditor(){
    const invalid=activityEditPanel.querySelector('[data-save-status]').dataset.invalid;
    if(invalid || (dayDraft && (dayDraft.date!==dayDraft.key || Object.keys(dayDraft.patch).length))){
      confirmDiscard(finishActivityEditor);
    }else finishActivityEditor();
  }
  ['#closeDayPicker','#cancelDayPicker'].forEach(id=>$(id).addEventListener('click',closeDayEditor));
  $('#saveDayPicker').addEventListener('click',()=>{
    if(!dayDraft)return;
    const invalid=[...$('#dayPickerChoices').querySelectorAll('input')].find(input=>!input.checkValidity());
    if(invalid){invalid.reportValidity();return;}
    const {key,id,date,patch}=dayDraft;
    if(!(state.entries[key] || []).includes(id)){
      markInvalid('#activityEditPanel','Cette activité a déjà été retirée ou déplacée.');return;
    }
    if(date!==key && (state.entries[date] || []).includes(id)){
      markInvalid('#activityEditPanel','Cette activité est déjà enregistrée à cette date. Choisis une autre date.');return;
    }
    if(date===key){
      if(Object.keys(patch).length)saveActivitySession(key,id,patch,'Activité mise à jour');
      finishActivityEditor();
      return;
    }
    const detail={count:1,...state.details[key]?.[id],...patch};
    const undo=captureUndo('session',[date,key]);
    if(!updateSession(date,id,detail,false)){
      markInvalid('#activityEditPanel','Vérifie les mesures avant de déplacer l’activité.');return;
    }
    updateSession(key,id,{count:0});
    finishActivityEditor();
    showSaveToast('Activité déplacée',undo());

  });

  const calendarDayDialog=$('#calendarDayDialog'),calendarDayOverview=$('#calendarDayOverview');
  let calendarDayDate;
  function renderDayOverview(focusActivityId){
    if(!calendarDayDialog.open || calendarDayOverview.hidden)return;
    const root=$('#calendarDayActivities'),date=calendarDayDate;
    const expanded=new Map([...root.querySelectorAll('details')].map(section=>[section.dataset.dayCategory,section.open]));
    const entries=new Set(state.entries[date] || []);
    root.replaceChildren();
    let editedButton;
    for(const category of categories){
      const activities=state.activities.filter(activity=>activity.categoryId===category.id && entries.has(activity.id));
      if(!activities.length)continue;
      const section=makeElement('details','catalog-category calendar-day-category');
      section.dataset.dayCategory=category.id;
      section.open=expanded.get(category.id) ?? true;
      const heading=makeElement('summary','catalog-category-header');
      const chevron=makeElement('span','catalog-chevron');chevron.innerHTML=catalogIcon('chevron');
      const title=makeElement('span','catalog-category-title',categoryLabel(category));
      const count=makeElement('span','catalog-count',activities.length);
      count.setAttribute('aria-label',activities.length+(activities.length===1?' activité':' activités'));
      heading.append(chevron,title,count);
      const list=makeElement('div','catalog-category-body');
      const body=listTable(list,'Activités · '+category.name,['Activité','Mesures','Note','Actions']);
      for(const activity of activities){
        const edit=appendActivityListRow(body,activity,date,{showDate:false,dayOverview:true});
        if(activity.id===focusActivityId){editedButton=edit;section.open=true;}
      }
      section.append(heading,list);root.append(section);
    }
    if(!root.children.length)appendWorkspaceEmpty(root,'Aucune activité enregistrée','Ajoute une activité à cette journée.');
    if(focusActivityId)(editedButton || $('#addCalendarDayActivity')).focus({preventScroll:true});
  }
  function openDayOverview(date){
    hideCalendarPreview();
    if(calendarDayDate!==date)$('#calendarDayActivities').replaceChildren();
    calendarDayDate=date;
    const time=$('#calendarDayDialogDate');time.dateTime=date;time.textContent=formatDate(date);
    calendarDayDialog.showModal();renderDayOverview();
  }
  function closeDayOverview(){
    if(dayDraft?.fromDayOverview)closeDayEditor();
    else calendarDayDialog.close();
  }
  for(const id of ['#closeCalendarDayDialog','#doneCalendarDayDialog'])$(id).addEventListener('click',closeDayOverview);
  $('#addCalendarDayActivity').addEventListener('click',()=>openDailyActivityDialog({date:calendarDayDate}));
  for(const id of ['#dailyActivityDialog','#catalogActionDialog']){
    $(id).addEventListener('close',()=>{
      if(calendarDayDialog.open && !calendarDayOverview.hidden && !calendarDayDialog.contains(document.activeElement))$('#addCalendarDayActivity').focus();
    });
  }

  function render() {
    const position={left:window.scrollX,top:window.scrollY};
    const shell=$('.shell'),minHeight=shell.style.minHeight;
    shell.style.minHeight=shell.getBoundingClientRect().height+'px';

    Object.assign(calendarState,normalizeWorkspaceFilters(calendarState));
    if(activityExtraFilter)activityExtraFilter=normalizedFilter('activities',activityExtraFilter);
    syncQuickFilters();
    renderCalendar();
    if(currentPage==='statistics')renderStatistics();
    if(currentPage==='profile'){
      renderProfileBadges();
      if(!$('#profilePanelFlames').hidden)renderProfileFlames();
    }
    renderGoals();
    renderWorkspace();
    renderDayOverview();
    checkStreakNotifications();
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

  function enableDirectReorder(button, id, container, commit, handleSelector = null, {scroll=false}={}) {
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
      if(drag.frame)cancelAnimationFrame(drag.frame);
      container.removeEventListener('pointermove', move);
      container.removeEventListener('touchmove',blockTouchScroll);
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
    function reorderAt(clientX,clientY){
      const peers = [...container.children].filter(node => node.dataset.sortId && node !== button);
      const target = peers.find(node => {
        const rect = node.getBoundingClientRect();
        return clientY < rect.top || (clientY <= rect.bottom && clientX < rect.left+rect.width/2);
      });
      const trailing = [...container.children].find(node => !node.dataset.sortId && node !== container.firstElementChild);
      animateReorder(container,button,target || trailing || null);
    }
    function scrollNearEdge(){
      drag.frame=null;
      const {clientX,clientY}=drag;
      const margin=70,edge=window.innerHeight-margin;
      const distance=clientY<margin?clientY-margin:clientY>edge?clientY-edge:0;
      if(!distance)return;
      const before=window.scrollY;
      window.scrollBy(0,Math.sign(distance)*Math.min(22,Math.ceil(Math.abs(distance)/4)));
      if(before===window.scrollY)return;
      reorderAt(clientX,clientY);
      drag.frame=requestAnimationFrame(scrollNearEdge);
    }
    const move = event => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const {clientX,clientY}=event;
      const distance = Math.hypot(clientX-drag.x,clientY-drag.y);
      if (!drag.lift && drag.touch && !scroll && distance>8) { finish(false); return; }
      if (!drag.lift && (!drag.touch || scroll) && distance>6) begin();
      if (!drag?.lift) return;
      event.preventDefault();
      moveLift(drag.lift,clientX,clientY);
      reorderAt(clientX,clientY);
      if(scroll){
        Object.assign(drag,{clientX,clientY});
        if(!drag.frame)drag.frame=requestAnimationFrame(scrollNearEdge);
      }
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
      const arrows=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];
      if (!event.altKey || !arrows.includes(event.key)) return;
      event.stopPropagation();
      event.preventDefault();
      const ids=[...container.children].filter(node=>node.dataset.sortId).map(node=>node.dataset.sortId);
      const from=ids.indexOf(id), to=from+(arrows.indexOf(event.key)%2===0?-1:1);
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
    back:'M9 6l-6 6 6 6m-6-6h17',
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
  document.querySelectorAll('.goal-delete-button:not(#disconnectDevicesDialog button)').forEach(button=>{
    button.insertAdjacentHTML('afterbegin',catalogIcon('delete'));
  });

  function openCatalogAction(title,description,buttonLabel,destinations,action){
    $('#catalogActionTitle').textContent=title;
    $('#catalogActionDescription').replaceChildren(...(typeof description==='string'?[makeElement('p',null,description)]:description));
    $('#catalogActionError').hidden=true;
    const button=$('#confirmCatalogAction'),destructive=buttonLabel!=='Déplacer';
    catalogActionDialog.classList.toggle('confirmation-dialog',destructive);
    button.textContent=buttonLabel;
    button.insertAdjacentHTML('afterbegin',catalogIcon(destructive?'delete':'move'));
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
      if(catalogActionDialog.open)catalogActionDialog.close();
      return;
    }
    const error=$('#catalogActionError');
    error.textContent='Les catégories ou les activités ont changé. Ferme cette fenêtre et réessaie.';
    error.hidden=false;
  });
  function commitCatalog(message,undo){
    reconcileCategories();
    render();
    refreshSaveIndicators();
    showSaveToast(message,undo());
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
    const undo=captureUndo('catalog');
    moveCatalogActivities([activity],destination);
    commitCatalog('« '+activity.name+' » déplacée vers '+category.name+'.',undo);
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
      const undo=captureUndo('catalog',Object.keys(state.entries).filter(date=>state.entries[date].includes(activity.id)));
      removeActivity(activity.id,false);
      commitCatalog('Activité supprimée.',undo);
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
      const undo=captureUndo('catalog');
      if(activities.length)moveCatalogActivities(activities,destination);
      categories=categories.filter(item=>item.id!==category.id);
      openCatalogCategories.delete(category.id);newActivityInputs.delete(category.id);
      commitCatalog('Catégorie supprimée.',undo);
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
      if(name!==owner.name)persistItem(owner,{name},'Nom mis à jour');
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
      if(owner && owner.color!==color.value)persistItem(owner,{color:color.value},'Couleur mise à jour');
    });
    const move=catalogActionButton('move','Déplacer '+activity.name,()=>askToMoveActivity(activity));
    move.disabled=categories.length<2;
    const remove=catalogActionButton('delete','Supprimer '+activity.name,()=>askToDeleteActivity(activity));
    row.append(color,catalogNameField(activity),createGoalEditor(activity),move,remove);
    rows.append(row);
    addReorderHandle(row,activity,rows,ids=>{
      const undo=captureUndo('catalog');
      state.activities=reorderSubset(state.activities,ids);
      commitCatalog('Ordre des activités enregistré.',undo);
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
      const undo=captureUndo('catalog');
      addCatalogActivity(category.id,title,color.value);
      newActivityInputs.delete(category.id);
      commitCatalog('Activité ajoutée.',undo);
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
      const toggle=makeButton('',()=>setOpen(!openCatalogCategories.has(category.id)),'catalog-category-toggle');
      toggle.setAttribute('aria-controls',body.id);
      const chevron=makeElement('span','catalog-chevron');chevron.innerHTML=catalogIcon('chevron');
      toggle.append(chevron);
      let animation;
      function setOpen(open){
        const start=body.getBoundingClientRect().height;
        animation?.cancel();
        toggle.setAttribute('aria-expanded',String(open));
        toggle.setAttribute('aria-label',(open?'Replier ':'Déplier ')+category.name);
        if(open)openCatalogCategories.add(category.id);
        else openCatalogCategories.delete(category.id);
        body.inert=!open;
        if(!body.isConnected || !body.animate || matchMedia('(prefers-reduced-motion: reduce)').matches){body.hidden=!open;return;}
        body.hidden=false;
        const motion=body.animate([{height:start+'px',overflow:'clip'},{height:(open?body.getBoundingClientRect().height:0)+'px',overflow:'clip'}],{duration:230,easing:'ease',fill:'both'});
        animation=motion;
        motion.onfinish=()=>{
          if(animation!==motion)return;
          body.hidden=!open;motion.cancel();animation=null;
        };
      }
      setOpen(openCatalogCategories.has(category.id));
      header.addEventListener('click',event=>{
        if(!event.target.closest('button,input'))setOpen(!openCatalogCategories.has(category.id));
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
        const undo=captureUndo('catalog');
        categories=reorderSubset(categories,ids);
        commitCatalog('Ordre des catégories enregistré.',undo);
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
    const undo=captureUndo('catalog');
    addCatalogCategory(name,newCategoryEmoji);
    newCategoryDialog.close();
    commitCatalog('Catégorie ajoutée.',undo);
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
    ['exceeded','Objectif surpassé','#7538c8','Un minimum dépassé ou une période terminée sous son maximum.'],
    ['warning','Partiel ou à la limite','#fda251','L’objectif est partiellement atteint ou le résultat est exactement à la limite.'],
    ['danger','Non atteint ou limite dépassée','#d65b60','L’objectif a été manqué ou le maximum a été dépassé.'],
    ['pending','En cours','#73796f','La période est toujours ouverte.'],
    ['future','À venir','#a0a395','La période n’a pas encore commencé.']
  ];
  const tileStyles=[['gradient','Dégradé'],['top','Liseré en haut'],['left','Liseré à gauche'],['right','Liseré à droite'],['bottom','Liseré en bas'],['fill','Fond coloré']];
  const dayStyles=[['fill','Fond plein'],['outline','Bordure'],['number','Numéro coloré']];
  const listStyles=[['plain','Simple'],['left','Liseré à gauche'],['fill','Fond coloré']];
  const appearanceOptions={
    goal:{tile:tileStyles,calendar:dayStyles,list:listStyles},
    activity:{tile:tileStyles,calendar:[['standard','D’origine'],...dayStyles],list:listStyles}
  };
  function normalizeStyles(scope,value,legacyGradient){
    return Object.fromEntries(Object.entries(appearanceOptions[scope]).map(([group,options])=>[
      group,options.some(([key])=>key===value?.[group])?value[group]:
        group==='tile' && legacyGradient===false?'fill':options[0][0]
    ]));
  }
  let goalAppearance=normalizeStyles('goal'),activityAppearance=normalizeStyles('activity'),compactGoalTiles=false,gradientButtons=false;
  let useExceededColor=true,useUnderLimitColor=true,showStreakFlames=true,streakFlameStyle='solid',streakFlameFinish='prism';
  const defaultStreakTiers=[
    {days:2,color:'#ffbf00'},{days:7,color:'#ff6600'},{days:30,color:'#f51335'},
    {days:60,color:'#831dcc'},{days:365,color:'#ae45f5'}
  ];
  const streakHolograms={
    prism:{name:'Prisme',base:['#00e4f4','#4b80fa','#902cf7','#ff37ea'],shine:['#4ef9ff','#c757ff','#e565ff']}
  };
  let streakTiers=defaultStreakTiers;
  const previousStreakColors=['#ff985e','#f4d34e','#62b7f1','#b998ff','#eab04d'];
  function normalizeStreakTiers(tiers,migrateColors=false){
    if(!Array.isArray(tiers) || tiers.length!==defaultStreakTiers.length)return null;
    let previous=1;
    const normalized=[];
    for(const tier of tiers){
      const color=normalizeAccent(tier?.color),days=tier?.days;
      if(!color || !Number.isSafeInteger(days) || days<=previous)return null;
      const index=normalized.length;
      normalized.push({days,color:migrateColors && color===previousStreakColors[index]?defaultStreakTiers[index].color:color});previous=days;
    }
    return normalized;
  }
  const streakStyles={solid:'Flammes pleines',outline:'Flammes en contour',flat:'Flammes plates',animated:'Flammes animées'};
  const streakTierFields=$('#streakTierFields'),streakStyleSwitch=$('#streakFlameStyle');
  const streakFinishes=[['prism','Prisme'],['gloss','Brillant'],['glitter','Paillettes'],['color','Couleur']];
  const streakFinishChoices=$('#streakFinishChoices');
  for(const [finish,label] of streakFinishes){
    const button=makeButton(label,()=>{
      if(finish==='color'){
        streakTierFields.lastElementChild.querySelector('[type=color]').click();
        return;
      }
      streakFlameFinish=finish;commitAppearance(true);
    });
    const preview=makeElement('span','streak-finish-preview');
    preview.dataset.previewFlameStyle='solid';preview.setAttribute('aria-hidden','true');
    button.dataset.finish=finish;button.prepend(preview);streakFinishChoices.append(button);
  }
  for(const button of streakStyleSwitch.children){
    const preview=makeElement('span','appearance-flame-preview');
    preview.dataset.previewFlameStyle=button.dataset.value;
    preview.setAttribute('aria-hidden','true');
    button.prepend(preview);
    button.addEventListener('click',()=>{
      streakFlameStyle=button.dataset.value;commitAppearance(true);
    });
  }
  function selectCustomStreakFinish(){
    if(streakFlameFinish==='color')return;
    streakFlameFinish='color';commitAppearance(true);
  }
  function updateStreakThresholds(){
    const tiers=normalizeStreakTiers([...streakTierFields.children].map((row,index)=>({
      days:row.querySelector('[type=number]').valueAsNumber,color:streakTiers[index].color
    })));
    $('#streakTiersError').hidden=Boolean(tiers);
    if(tiers){streakTiers=tiers;commitAppearance(true);}
    else syncAppearanceReset();
  }
  defaultStreakTiers.forEach((tier,index)=>{
    const row=makeElement('div','streak-tier-card'),label=makeElement('span',null,'Niveau '+(index+1));
    const days=makeElement('input'),color=makeElement('input');
    days.type='number';days.min='2';days.step='1';days.required=true;
    days.setAttribute('aria-label',label.textContent+' · Jours');
    days.addEventListener('input',updateStreakThresholds);
    color.type='color';color.setAttribute('aria-label',label.textContent+' · Couleur');
    function selectTierColor(){
      if(color.value===streakTiers[index].color && (index!==4 || streakFlameFinish==='color'))return;
      streakTiers=streakTiers.map((value,i)=>i===index?{...value,color:color.value}:value);
      if(index===4)streakFlameFinish='color';
      commitAppearance(true);
    }
    if(index===4)color.addEventListener('click',selectCustomStreakFinish);
    color.addEventListener('input',selectTierColor);
    color.addEventListener('change',selectTierColor);
    const swatch=makeElement('label','streak-tier-swatch');
    swatch.append(makeElement('span','streak-tier-preview'),label,color);
    row.append(swatch,days);
    streakTierFields.append(row);
  });
  function syncStreakTierFields(){
    [...streakTierFields.children].forEach((row,index)=>{
      const [color,days]=row.querySelectorAll('input');
      days.value=streakTiers[index].days;color.value=streakTiers[index].color;
    });
    $('#streakTiersError').hidden=true;
    syncAppearanceReset();
  }
  function appearanceChoice(container,name,value,title,preview,onChange){
    const label=makeElement('label','goal-appearance-option'),input=makeElement('input');
    input.type='radio';input.name=name;input.value=value;
    const option=makeElement('span','goal-appearance-choice');
    preview.setAttribute('aria-hidden','true');
    option.append(preview,makeElement('span',null,title));
    label.append(input,option);container.append(label);
    input.addEventListener('change',()=>{if(input.checked)onChange(value);});
    return input;
  }
  function layoutPreview(scope,group,value){
    const preview=makeElement('span','goal-appearance-sample');
    preview.dataset.sample=value;preview.dataset.previewKind=group;preview.dataset.previewScope=scope;
    if(group==='calendar'){
      preview.append(...['16','17','18'].map(day=>makeElement(day==='16'?'span':'small',null,day)));
    }else{
      preview.append(makeElement('span',null,scope==='goal'?'Objectif':'Course'),makeElement('i'),
        makeElement('span','appearance-sample-value',scope==='goal'?'3 / 5':'5 km'));
    }
    return preview;
  }
  for(const [scope,groups] of Object.entries(appearanceOptions)){
    for(const [group,options] of Object.entries(groups)){
      const container=$('[data-'+scope+'-appearance="'+group+'"]');
      for(const [value,title] of options){
        appearanceChoice(container,scope+'Appearance-'+group,value,title,layoutPreview(scope,group,value),style=>{
          const styles=scope==='goal'?goalAppearance:activityAppearance;
          styles[group]=style;commitAppearance();
        });
      }
    }
  }
  let favoriteStarStyle='outline';
  const favoriteStarChoices=$('#favoriteStarChoices');
  const favoriteStarInputs=[...favoriteStarChoices.querySelectorAll('input')];
  favoriteStarInputs.forEach(input=>input.addEventListener('change',()=>{
    favoriteStarStyle=input.value;commitAppearance();
  }));
  $('#resetFavoriteStar').addEventListener('click',()=>{favoriteStarStyle='outline';commitAppearance();});
  function applyAppearanceStyles(){
    const app=document.getElementById('app');
    for(const [scope,styles] of Object.entries({goal:goalAppearance,activity:activityAppearance})){
      for(const [group,value] of Object.entries(styles)){
        app.dataset[scope+group[0].toUpperCase()+group.slice(1)+'Style']=value;
        $('[name="'+scope+'Appearance-'+group+'"][value="'+value+'"]').checked=true;
      }
    }
    app.toggleAttribute('data-gradient-buttons',gradientButtons);
    $('#gradientButtons').checked=gradientButtons;
    app.dataset.favoriteStarStyle=favoriteStarStyle;
    favoriteStarInputs.forEach(input=>{input.checked=input.value===favoriteStarStyle;});
    app.toggleAttribute('data-compact-goal-tiles',compactGoalTiles);
    $('#compactGoalTiles').checked=compactGoalTiles;
    app.dataset.useExceededColor=String(useExceededColor);
    $('#useExceededColor').checked=useExceededColor;
    $('#useUnderLimitColor').checked=useUnderLimitColor;
    $('#showStreakFlames').checked=showStreakFlames;
    app.dataset.streakFlameStyle=streakFlameStyle;
    const options=$('#streakFlameOptions');
    options.dataset.open=String(showStreakFlames);
    options.toggleAttribute('inert',!showStreakFlames);
    options.setAttribute('aria-hidden',String(!showStreakFlames));
    streakTierFields.dataset.finish=streakFlameFinish;
    syncSegmentedSwitch(streakStyleSwitch,'value',streakFlameStyle);
    syncSegmentedSwitch(streakFinishChoices,'finish',streakFlameFinish);
  }
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
      commitAppearance();
    });
    controls.append(value,input);
    row.append(label,controls);
    $('#goalColorRows').append(row);
    paletteRows.set(tone,{value,input,defaultColor});
  });
  function applyGoalColors(){
    const style=document.getElementById('app').style;
    paletteRows.forEach(({value,input,defaultColor},tone)=>{
      input.disabled=tone==='exceeded' && !useExceededColor && !useUnderLimitColor;
      input.closest('.preference-color-row').hidden=input.disabled;
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
  }
  $('#resetGoalColors').addEventListener('click',()=>{
    resetGoalColorSettings();commitAppearance(true);
  });
  const favicon=document.querySelector('link[rel="icon"]');
  const faviconPrefix='data:image/svg+xml,';
  const faviconArtwork=favicon?decodeURIComponent(favicon.dataset.defaultHref.slice(faviconPrefix.length)):null;
  function accentInk(accent){
    return 'light-dark(color-mix(in srgb, '+accent+' 42%, #101318), color-mix(in srgb, '+accent+' 48%, #fff))';
  }
  function setFaviconAppearance(accent,theme,remember=false){
    if(!faviconArtwork)return;
    let artwork=faviconArtwork;
    if(accent)artwork=artwork.replace(defaultAccent,accent).replace('light-dark(#006840,#5ce894)',accentInk(accent));
    if(theme==='light' || theme==='dark')artwork=artwork.replace('color-scheme:light dark','color-scheme:'+theme);
    const url=faviconPrefix+encodeURIComponent(artwork);
    if(favicon.getAttribute('href')!==url)favicon.href=url;
    if(remember){
      try {
        if(accent || theme==='light' || theme==='dark')localStorage.setItem('year-tracker:favicon',url);
        else localStorage.removeItem('year-tracker:favicon');
      }catch{}
    }
  }
  function rgbLuminance(rgb){
    const [red,green,blue]=rgb.map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
    return .2126*red+.7152*green+.0722*blue;
  }
  function applyAccent(style,accent){
    if(!accent){
      for(const key of ['--accent','--accent-fill','--accent-text','--accent-ink','--button-gradient-lightness','--button-gradient-text'])style.removeProperty(key);
      return;
    }
    const rgb=accent.slice(1).match(/../g).map(value=>parseInt(value,16)/255);
    const luminance=rgbLuminance(rgb);
    style.setProperty('--accent',accent);
    style.setProperty('--accent-fill',accent);
    style.setProperty('--accent-text',luminance>.179?'#000':'#fff');

    // Black needs a luminance of at least .175 for 4.5:1 contrast.
    const darkLabel=luminance>=.175;
    let lightness=.24;
    if(!darkLabel){
      // Limit the white added at the top so the white label remains readable.
      let min=0,max=lightness;
      for(let step=0;step<9;step++){
        const mix=(min+max)/2;
        const lighter=rgb.map(channel=>channel+(1-channel)*mix);
        if(rgbLuminance(lighter)<=1.05/4.5-.05)min=mix;
        else max=mix;
      }
      lightness=min;
    }
    style.setProperty('--button-gradient-text',darkLabel?'#000':'#fff');
    style.setProperty('--button-gradient-lightness',lightness*100+'%');
    style.setProperty('--accent-ink',accentInk(accent));
  }
  window.calendarApp.rememberFavicon=({accent,theme}={})=>setFaviconAppearance(normalizeAccent(accent),theme,true);
  window.calendarApp.setLoadingAppearance=(preferences={})=>{
    const gate=$('#authGate'),accent=normalizeAccent(preferences.accent);
    gate.dataset.theme=['light','dark'].includes(preferences.theme)?preferences.theme:'system';
    applyAccent(gate.style,accent);
    for(const tone of ['danger','warning','success']){
      const color=normalizeAccent(preferences.goalColors?.[tone]);
      if(color)gate.style.setProperty('--loader-'+tone,color);
      else gate.style.removeProperty('--loader-'+tone);
    }
    setFaviconAppearance(accent,gate.dataset.theme);
  };
  function applyTheme(accent=state.accent) {
    const app=document.getElementById('app');
    app.dataset.theme=state.theme;
    themeInputs.forEach(input=>{input.checked=input.value===state.theme;});
    applyAccent(app.style,accent);
    if(currentAccount)window.calendarApp.setLoadingAppearance({theme:state.theme,accent,goalColors:state.goalColors});
    else setFaviconAppearance(accent,state.theme);
    $('#profileAccent').value=accent || defaultAccent;
    $('#referenceAccent').value=accent || defaultAccent;
    $('#profileAccentValue').textContent=accent?accent.toUpperCase():'Par défaut';
    $('#resetProfileAccent').disabled=!accent;
  }
  themeInputs.forEach(input=>input.addEventListener('change',()=>{if(input.checked){state.theme=input.value;commitAppearance();}}));
  $('#profileAccent').addEventListener('input',event=>applyTheme(normalizeAccent(event.target.value)));
  $('#profileAccent').addEventListener('change',event=>{state.accent=normalizeAccent(event.target.value);commitAppearance();});
  $('#resetProfileAccent').addEventListener('click',()=>{state.accent=null;commitAppearance();});
  for(const id of ['#useExceededColor','#useUnderLimitColor']){
    $(id).addEventListener('change',()=>{
      useExceededColor=$('#useExceededColor').checked;
      useUnderLimitColor=$('#useUnderLimitColor').checked;
      commitAppearance(true);
    });
  }

  $('#showStreakFlames').addEventListener('change',event=>{
    showStreakFlames=event.target.checked;
    commitAppearance(true);
  });
  function syncAppearanceReset(){
    const colorsDefault=streakFlameFinish==='prism' && $('#streakTiersError').hidden &&
      streakTiers.every(({days,color},i)=>days===defaultStreakTiers[i].days && color===defaultStreakTiers[i].color);
    const styleIsDefault=(scope,styles)=>Object.entries(normalizeStyles(scope)).every(([group,value])=>styles[group]===value);
    $('#resetTheme').disabled=state.theme==='system';
    $('#resetStreakStyle').disabled=streakFlameStyle==='solid';
    $('#resetStreakColors').disabled=colorsDefault;
    $('#resetStreakFlames').disabled=showStreakFlames && streakFlameStyle==='solid' && colorsDefault;
    $('#resetGoalColors').disabled=!Object.keys(state.goalColors).length && useExceededColor && useUnderLimitColor;
    $('#resetGoalAppearance').disabled=!compactGoalTiles && $('#resetGoalColors').disabled && styleIsDefault('goal',goalAppearance);
    $('#resetActivityAppearance').disabled=styleIsDefault('activity',activityAppearance);
    $('#resetFavoriteStar').disabled=favoriteStarStyle==='outline';
    $('#resetAppearance').disabled=!gradientButtons && ['resetFavoriteStar','resetTheme','resetProfileAccent','resetStreakFlames','resetGoalAppearance','resetActivityAppearance']
      .every(id=>document.getElementById(id).disabled);
  }
  function updateAppearance(){
    applyAppearanceStyles();applyTheme();applyGoalColors();syncAppearanceReset();renderStreakPreviews();
  }
  function commitAppearance(refreshGoals=false){
    updateAppearance();
    if(refreshGoals)render();
    else persist();
  }
  function restoreAppearanceSettings(value){
    favoriteStarStyle=value.favoriteStarStyle==='solid'?'solid':'outline';
    compactGoalTiles=value.compactGoalTiles===true;
    gradientButtons=value.gradientButtons===true;
    goalAppearance=normalizeStyles('goal',value.goalAppearance,value.useGoalGradient);
    activityAppearance=normalizeStyles('activity',value.activityAppearance,value.useActivityGradient);
    useExceededColor=value.useExceededColor!==false;
    showStreakFlames=value.showStreakFlames!==false;
    streakFlameStyle=Object.hasOwn(streakStyles,value.streakFlameStyle)?value.streakFlameStyle:'solid';
    streakTiers=normalizeStreakTiers(value.streakTiers,value.streakPaletteVersion!==2) || defaultStreakTiers;
    streakFlameFinish=streakFinishes.some(([key])=>key===value.streakFlameFinish)?value.streakFlameFinish:
      Object.hasOwn(streakHolograms,value.streakHologram)?value.streakHologram:'prism';
    syncStreakTierFields();renderStreakPreviews();
    useUnderLimitColor=typeof value.useUnderLimitColor==='boolean'?value.useUnderLimitColor:useExceededColor;
    applyAppearanceStyles();applyGoalColors();syncAppearanceReset();
  }
  function resetFlameSettings(){
    showStreakFlames=true;
    streakFlameStyle='solid';resetFlameColors();
  }
  function resetFlameColors(){
    streakFlameFinish='prism';
    streakTiers=defaultStreakTiers;syncStreakTierFields();
  }
  function resetGoalColorSettings(){
    state.goalColors={};useExceededColor=true;useUnderLimitColor=true;
  }
  function resetGoalAppearanceSettings(){
    compactGoalTiles=false;goalAppearance=normalizeStyles('goal');resetGoalColorSettings();
  }
  function resetAppearanceSettings(){
    state.theme='system';state.accent=null;favoriteStarStyle='outline';
    activityAppearance=normalizeStyles('activity');
    gradientButtons=false;
    resetGoalAppearanceSettings();resetFlameSettings();
  }
  $('#gradientButtons').addEventListener('change',event=>{
    gradientButtons=event.target.checked;
    commitAppearance();
  });
  $('#resetTheme').addEventListener('click',()=>{state.theme='system';commitAppearance();});
  $('#resetStreakStyle').addEventListener('click',()=>{streakFlameStyle='solid';commitAppearance(true);});
  $('#resetStreakColors').addEventListener('click',()=>{resetFlameColors();commitAppearance(true);});
  $('#resetStreakFlames').addEventListener('click',()=>{resetFlameSettings();commitAppearance(true);});
  $('#compactGoalTiles').addEventListener('change',event=>{
    compactGoalTiles=event.target.checked;commitAppearance(true);
  });
  $('#resetGoalAppearance').addEventListener('click',()=>{resetGoalAppearanceSettings();commitAppearance(true);});
  $('#resetActivityAppearance').addEventListener('click',()=>{activityAppearance=normalizeStyles('activity');commitAppearance();});
  $('#resetAppearance').addEventListener('click',()=>confirmPreferencesReset('Réinitialiser l’apparence ?',()=>{resetAppearanceSettings();commitAppearance(true);}));
  applyAppearanceStyles();syncAppearanceReset();syncStreakTierFields();

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
  function goalCountsByPeriod(ids,goal,through,entries,reachedDates){
    const wanted=new Set(ids),counts=new Map();
    entries.forEach(([date,activities])=>{
      if(date>through || goalStartsAfter(goal,date))return;
      const amount=activities.reduce((sum,id)=>sum+(wanted.has(id)?measuredAmount(date,id,goal):0),0);
      if(!amount)return;
      const key=goal.period==='day'?date:periodBounds(date,goal.period)[0];
      const total=(counts.get(key)||0)+amount;
      counts.set(key,total);
      if(reachedDates && total>=goal.target && !reachedDates.has(key))reachedDates.set(key,date);
    });
    if(goal.display==='check'){
      for(const [key,checked] of Object.entries(goal.checks || {})){
        const [period,date]=key.split(':');
        if(checked===true && period===goal.period && validGoalDate(date) && date<=through && !counts.has(date))counts.set(date,0);
      }
    }
    return counts;
  }
  function goalStartsAfter(goal,date){return Boolean(goal.startDate && goal.startDate>date);}
  function goalProgress(ids,goal,reference,today=localDateKey(new Date()),through=today) {
    const [start,end]=periodBounds(reference,goal.period);
    const first=goalStartsAfter(goal,start)?goal.startDate:start;
    let count=0;
    Object.entries(state.entries).forEach(([date,entries])=>{
      if(date<first || date>end || date>through)return;
      entries.forEach(id=>{if(ids.includes(id))count+=measuredAmount(date,id,goal);});
    });
    return evaluateGoal(goal,count,start,end,today);
  }
  function evaluateGoal(goal,count,start,end,today,viewDate=start){
    const override=goal.display==='check'?goal.checks?.[goal.period+':'+start]:undefined;
    if(goalStartsAfter(goal,end))return {count:0,start,end,tone:'empty',status:'Pas encore commencé'};
    start=goalStartsAfter(goal,start)?goal.startDate:start;
    if(start>today || viewDate>today)return {count:0,start,end,tone:'future',status:'À venir'};
    count=Math.round(count*1000000)/1000000;
    if(typeof override==='boolean' && count===0){
      if(override)return {count,start,end,tone:'success',status:'Objectif validé'};
      if(goal.mode==='max')return {count,start,end,tone:'danger',status:'Objectif non respecté'};
    }
    if(goal.mode==='max' && goal.target===0){
      return {count,start,end,tone:count===0?'success':'danger',status:count===0?'Objectif respecté':'Limite dépassée'};
    }
    const equality=Math.abs(count-goal.target)<1e-8;
    const missed=goal.mode==='min' && !equality && count<goal.target && end<today;
    const aboveMinimum=goal.mode==='min' && !equality && count>goal.target;
    const belowClosedLimit=goal.mode==='max' && !equality && count<goal.target && end<today;
    const surpassed=aboveMinimum || belowClosedLimit;
    const highlight=aboveMinimum?useExceededColor:useUnderLimitColor;
    const tone=goal.mode==='min'?(equality?'success':missed?'danger':'pending'):(equality?'warning':count>goal.target?'danger':'success');
    const status=goal.mode==='min'?(aboveMinimum?'Objectif dépassé':equality?'Objectif atteint':missed?'Non atteint':'À accomplir'):(equality?'Limite atteinte':count>goal.target?'Limite dépassée':belowClosedLimit?'Sous la limite':'Dans la limite');
    return {count,start,end,status,tone:surpassed?(highlight?'exceeded':'success'):tone,missed,surpassed};
  }
  function goalStreakReader(reference,show=showStreakFlames,today=localDateKey(new Date())){
    if(!show)return ()=>null;
    const entries=Object.entries(state.entries);
    // Legacy goals without a start date can only be traced back to the recorded history.
    const firstEntry=entries.reduce((first,[date])=>date<=today && (!first || date<first)?date:first,'');
    return (ids,goal,result)=>{
      if(reference>today || ['empty','future','danger'].includes(result.tone))return null;
      const first=goal.startDate || firstEntry;
      if(!first)return null;
      const period=goal.period;
      let [start,end]=periodBounds(reference,period),firstSuccess=start;
      const open=end>=today;
      const current=goal.mode==='max'?!open:result.tone!=='pending';
      const lastSuccess=current?(open?today:end):shiftDate(start,'day',-1);
      let count=Number(current);
      const [earliest]=periodBounds(first,period);
      if(start>earliest){
        const counts=goalCountsByPeriod(ids,goal,open?today:end,entries);
        while(start>earliest){
          start=shiftDate(start,period,-1);
          const [,end]=periodBounds(start,period);
          const outcome=evaluateGoal(goal,counts.get(start)||0,start,end,today);
          if(!['success','warning','exceeded'].includes(outcome.tone))break;
          firstSuccess=start;count++;
        }
      }
      if(count<2)return null;
      const days=1+(Date.parse(lastSuccess)-Date.parse(firstSuccess<first?first:firstSuccess))/86400000;
      return {count,days};
    };
  }
  const streakNotice=$('#streakNotice');
  const streakNoticeQueue=[];
  let streakNoticeAccount=null,streakNoticeSnapshot={},streakNoticeTimer,streakDayTimer,streakDay,activeStreakNotice;

  function dismissStreakNotice(){
    window.clearTimeout(streakNoticeTimer);
    streakNotice.hidePopover?.();
    streakNotice.hidden=true;
    activeStreakNotice=null;
  }

  function showNextStreakNotice(){
    if(!streakNotice.hidden || !streakNoticeQueue.length)return;
    activeStreakNotice=streakNoticeQueue.shift();
    const {title,message,name,rule,flame,kind}=activeStreakNotice;
    streakNotice.dataset.kind=kind;
    $('#streakNoticeFlame').replaceChildren(flame);
    $('#streakNoticeTitle').textContent=title;
    $('#streakNoticeGoal').textContent=name+' · '+rule;
    $('#streakNoticeMessage').textContent=message;
    streakNotice.hidden=false;
    streakNotice.showPopover?.();
    $('#streakNoticeAnnouncement').textContent=[title,name,rule,message].join(' ');
    streakNoticeTimer=window.setTimeout(advanceStreakNotice,7500);
  }

  function advanceStreakNotice(){
    dismissStreakNotice();
    showNextStreakNotice();
  }

  $('#dismissStreakNotice').addEventListener('click',advanceStreakNotice);

  function streakNotification(kind,item,goal,streak,result){
    const length=streakValue(streak.days,'day');
    const periods=streakValue(streak.count,goal.period);
    const run=goal.period==='day'?length+' de suite':periods+' de suite ('+length+')';
    const messages={
      earned:['Félicitations, une nouvelle flamme !','Déjà '+run+'. Continuez comme ça !'],
      level:['Votre flamme change de couleur !','Déjà '+run+'. Votre régularité paie !'],
      risk:['Dernier jour pour garder votre flamme','Atteignez votre objectif aujourd’hui pour prolonger votre série de '+periods+'.'],
      lost:['Votre série est interrompue',goal.mode==='max' && result.tone==='danger'
        ?'La limite est dépassée. Si la saisie est incorrecte, corrigez-la pour retrouver votre flamme.'
        :'Votre série a duré '+length+'. Chaque objectif atteint compte pour la prochaine flamme.']
    };
    const [title,message]=messages[kind];
    return {kind,title,message,name:item.name,rule:goalDescription(goal),flame:goalStreakBadge(streak,goal.period)};
  }

  function checkStreakNotifications(){
    if(streakNoticeAccount===null || document.hidden || $('#authenticatedApp').hidden)return;
    if(!showStreakFlames){
      streakNoticeQueue.length=0;
      dismissStreakNotice();
      return;
    }
    const today=localDateKey(new Date());
    const yesterday=shiftDate(today,'day',-1);
    const readToday=goalStreakReader(today,true,today);
    const readYesterday=goalStreakReader(yesterday,true,yesterday);
    const next={},riskKeys=new Set();
    const tierFor=streak=>streak?streakTiers.findLastIndex(tier=>streak.days>=tier.days):-1;

    for(const {goal,item,ids} of goalTargets()){
      const key=JSON.stringify([item.id,goal.id]);
      const signature=JSON.stringify([goal.mode,goal.period,goal.unit,goal.target,goal.startDate,streakTiers.map(tier=>tier.days)]);
      const stored=streakNoticeSnapshot[key];
      const prior=stored?.signature===signature?stored:null;
      const result=goalProgress(ids,goal,today);
      const streak=readToday(ids,goal,result);
      const tier=tierFor(streak);
      // A maximum can gain a completed period overnight, including on first sign-in.
      const boundary=goal.mode==='max' && result.start===today;
      const previous=prior?.streak ?? (!stored && boundary
        ?readYesterday(ids,goal,goalProgress(ids,goal,yesterday,yesterday)):null);
      const previousTier=tierFor(previous);
      const notices=prior?.end===result.end?{...prior.notices}:{};
      const notify=(kind,badgeStreak,stamp=kind)=>{
        if(notices[stamp])return;
        notices[stamp]=true;
        streakNoticeQueue.push({...streakNotification(kind,item,goal,badgeStreak,result),key,end:result.end});
      };

      if(prior || (!stored && boundary)){
        if(tier>=0 && previousTier<0)notify('earned',streak);
        else if(previousTier>=0 && tier>previousTier)notify('level',streak,'level-'+tier);
        else if(previousTier>=0 && tier<0)notify('lost',previous);
      }
      if(tier>=0 && goal.mode==='min' && result.tone==='pending' && result.end===today){
        riskKeys.add(key);
        notify('risk',streak);
      }
      next[key]={signature,streak,end:result.end,notices};
    }

    const serialized=JSON.stringify(next);
    if(serialized!==JSON.stringify(streakNoticeSnapshot)){
      streakNoticeSnapshot=next;
      try {localStorage.setItem(streakNoticeAccount,serialized);} catch {}
    }
    const expiredRisk=notice=>notice?.kind==='risk' && (notice.end!==today || !riskKeys.has(notice.key));
    for(let index=streakNoticeQueue.length-1;index>=0;index--){
      if(expiredRisk(streakNoticeQueue[index]))streakNoticeQueue.splice(index,1);
    }
    if(expiredRisk(activeStreakNotice))dismissStreakNotice();
    showNextStreakNotice();
  }

  function checkStreakDay(){
    window.clearTimeout(streakDayTimer);
    if(streakNoticeAccount===null)return;
    const now=new Date(),today=localDateKey(now);
    if(streakDay!==today && !document.hidden && !$('#authenticatedApp').hidden){
      if(agendaDate===streakDay)agendaDate=today;
      if(goalReference===streakDay)goalReference=today;
      if(sharedTemporalView?.date===streakDay){
        rememberTemporalSelection(today);
        applySharedTemporalView(currentPage);
      }
      streakDay=today;
      render();
    }else checkStreakNotifications();
    const midnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
    streakDayTimer=window.setTimeout(checkStreakDay,midnight-now+500);
  }

  function resetStreakNotifications(){
    window.clearTimeout(streakDayTimer);
    streakNoticeAccount=null;
    streakNoticeSnapshot={};
    streakNoticeQueue.length=0;
    dismissStreakNotice();
  }

  window.calendarApp.startStreakNotifications=()=>{
    if(!currentAccount)return;
    const key='year-tracker-streak-notices:'+ (currentAccount.demo?'demo':currentAccount.uid);
    if(streakNoticeAccount!==key){
      resetStreakNotifications();
      streakNoticeAccount=key;
      try {streakNoticeSnapshot=JSON.parse(localStorage.getItem(key)) || {};} catch {}
      streakDay=localDateKey(new Date());
    }
    checkStreakDay();
  };
  window.addEventListener('focus',checkStreakDay);
  document.addEventListener('visibilitychange',checkStreakDay);

  // Flame contours traced from the supplied reference, scaled together to the badge viewBox.
  const streakFlameShape=`
    M22.93 2.07 L23.65 2.51 L25.9 4.75 L26.77 6.06 L27.63 7.94 L28.07 10.11 L28.07 11.7 L27.78 13.3 L27.06 15.18
    L26.91 16.77 L27.2 18.08 L27.78 19.23 L29.01 20.61 L29.23 18.08 L30.24 15.61 L31.33 14.38 L32.63 13.51 L31.98
    15.47 L32.12 17.93 L32.85 19.38 L34.88 22.13 L36.18 24.59 L37.05 27.92 L37.05 31.54 L36.76 33.43 L35.89 36.18
    L34.59 38.5 L32.63 40.6 L30.31 42.19 L27.85 43.2 L24.52 43.93 L22.2 43.93 L19.74 43.49 L18 42.91 L15.98 41.9
    L14.09 40.6 L12.43 39.08 L10.26 36.18 L9.24 34.15 L8.66 32.41 L8.23 30.1 L8.23 27.78 L8.81 24.59 L9.39 23
    L10.83 20.25 L12.14 18.51 L15.11 15.54 L19.89 12.07 L21.12 10.83 L22.28 9.24 L23.14 7.21 L23.43 5.19 Z M15.11
    3.38 L16.41 3.96 L17.64 5.33 L18.08 6.63 L18.08 8.08 L17.79 8.95 L17.06 9.97 L14.46 12.57 L14.17 13.15 L14.09
    14.24 L12.72 12.72 L12.43 11.99 L12.43 10.98 L13.01 9.82 L15.32 6.78 L15.61 4.75 Z
  `;
  const streakFlameCore=`
    M20.61 17.71 L20.68 17.93 L20.1 18.66 L19.23 20.54 L18.8 23.58 L19.09 25.61 L19.67 27.34 L21.41 30.1 L22.64
    31.33 L24.23 32.34 L25.68 32.78 L26.84 32.78 L27.85 32.49 L29.37 31.11 L30.1 29.81 L30.39 28.79 L30.39 27.06
    L30.17 26.26 L31.83 27.92 L32.41 28.94 L33.14 31.11 L33.28 32.12 L33.14 35.31 L32.41 37.48 L31.4 39.22 L28.87
    41.9 L26.69 43.2 L24.52 43.93 L22.2 43.93 L21.62 43.64 L21.04 43.64 L19.74 43.2 L17.86 42.19 L16.56 41.18
    L14.89 39.37 L13.73 37.34 L13.15 35.46 L12.86 32.56 L13.01 29.23 L13.59 26.48 L14.17 24.88 L15.03 23.14 L16.34
    21.26 L18.58 19.02 Z
  `;
  const streakFlameHighlight=`
    M17.13 31.76 L17.79 33.86 L18.8 35.6 L20.32 37.12 L21.19 37.7 L23.07 38.42 L25.68 38.42 L26.55 38.13 L28.29
    37.12 L29.66 35.6 L29.52 37.34 L28.5 39.66 L27.78 40.67 L25.97 42.48 L23.87 43.71 L24.23 43.93 L22.78 43.93
    L22.78 43.64 L21.33 43.06 L19.89 42.04 L18.22 40.09 L17.64 38.93 L16.92 36.18 L16.92 32.56 Z
  `;
  let flameGradientId=0;
  function flameIcon(tier,color,number='',finish=streakFlameFinish,style=streakFlameStyle){
    const badge=makeElement('span','goal-streak-badge');
    badge.dataset.tier=String(tier+1);
    badge.dataset.flameStyle=style;
    badge.dataset.digits=String(number).length;
    badge.style.setProperty('--flame-color',color);
    let gradients='',shine='';
    if(tier===4)badge.dataset.finish=finish;
    if(style!=='flat' && tier===4 && Object.hasOwn(streakHolograms,finish)){
      badge.dataset.holographic='';
      const id='flame-prism-'+(++flameGradientId);
      const {base,shine:tints}=streakHolograms[finish];
      badge.style.setProperty('--flame-reflection','linear-gradient(110deg,'+base[1]+','+base[2]+',var(--flame-color))');
      gradients=`<defs>
        <linearGradient id="${id}" x1="0%" y1="65%" x2="100%" y2="36%">
          <stop stop-color="${base[0]}"/><stop offset=".32" stop-color="${base[1]}"/>
          <stop offset=".61" stop-color="${base[2]}"/><stop offset=".82" style="stop-color:var(--flame-color)"/>
          <stop offset="1" stop-color="${base[3]}"/>
        </linearGradient>
        <radialGradient id="${id}-cyan" cx="19%" cy="34%" r="37%">
          <stop stop-color="${tints[0]}"/><stop offset=".42" stop-color="#5df5f4"/>
          <stop offset="1" stop-color="#5df5f4" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="${id}-pink" cx="69%" cy="99%" r="39%">
          <stop stop-color="${tints[1]}"/><stop offset="1" stop-color="#f693e7" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="${id}-gold" cx="70%" cy="4%" r="33%">
          <stop stop-color="${tints[2]}"/><stop offset="1" stop-color="#ffe0aa" stop-opacity="0"/>
        </radialGradient>
      </defs>`.replace(/>\s+</g,"><");
      badge.style.setProperty('--flame-paint','url(#'+id+')');
      shine=['cyan','pink','gold'].map(tint=>
        `<path class="streak-flame-shine" d="${streakFlameShape}" fill="url(#${id}-${tint})"/>`
      ).join('');
    }
    if(style!=='flat' && tier===4 && ['gloss','glitter'].includes(finish)){
      const id='flame-metal-'+(++flameGradientId),glitter=finish==='glitter';
      const palette=glitter?['#7541a8','#bb77e3','#e1b7ff','#9458cc','#5e3082']:
        ['#9f5917','#df9d36','#ffe9a7','#c97922','#91420d'];
      gradients='<defs><linearGradient id="'+id+'" x1="3%" y1="96%" x2="88%" y2="4%">'+
        palette.map((color,index)=>'<stop offset="'+(index/4)+'" stop-color="'+color+'"/>').join('')+'</linearGradient></defs>';
      badge.style.setProperty('--flame-paint','url(#'+id+')');
      badge.style.setProperty('--flame-reflection','linear-gradient(45deg,'+palette.join(',')+')');
      badge.dataset.holographic='';
      if(glitter)shine='<path class="streak-flame-shine" fill="#fff9" d="M25 8l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7ZM13 24l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6ZM34 25l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6Z"/>';
    }
    const filled=style==='solid' || style==='animated';
    const core=filled
      ? `<path class="streak-flame-core" d="${streakFlameCore}"/><path class="streak-flame-core streak-flame-highlight" d="${streakFlameHighlight}"/>`
      : '';
    badge.innerHTML=`<svg class="streak-flame-icon" viewBox="0 0 46 46" aria-hidden="true">${gradients}<path class="streak-flame-body" d="${streakFlameShape}"/>${filled?shine:''}${core}</svg>`;
    if(number!=='')badge.append(makeElement('span','streak-flame-number',String(number)));
    return badge;
  }
  function goalStreakBadge(streak,period,style=streakFlameStyle){
    if(!streak)return null;
    const {count,days}=streak;
    const tier=streakTiers.findLastIndex(item=>days>=item.days);
    if(tier<0)return null;
    const badge=flameIcon(tier,streakTiers[tier].color,count,streakFlameFinish,style);
    const duration=streakValue(days,'day');
    const label='Série en cours · '+(period==='day'?duration:streakValue(count,period)+' · '+duration);
    badge.setAttribute('role','img');badge.setAttribute('aria-label',label);badge.title=label;
    return badge;
  }
  function renderStreakSettingPreviews(){
    streakTiers.forEach(({days,color},index)=>{
      streakTierFields.children[index].querySelector('.streak-tier-preview').replaceChildren(flameIcon(index,color,days));
    });
    for(const button of streakStyleSwitch.children){
      button.querySelector('.appearance-flame-preview').replaceChildren(flameIcon(0,streakTiers[0].color,2,streakFlameFinish,button.dataset.value));
    }
    for(const button of streakFinishChoices.children){
      button.firstElementChild.replaceChildren(flameIcon(4,streakTiers[4].color,'',button.dataset.finish,'solid'));
    }
  }
  function renderStreakPreviews(){
    renderStreakSettingPreviews();
    const root=$('#referenceFlames');
    root.replaceChildren(...Object.entries(streakStyles).map(([style,label])=>{
      const section=makeElement('div','reference-sample');
      section.dataset.previewFlameStyle=style;
      const list=makeElement('ul','streak-preview-list');
      for(const {days} of streakTiers){
        const item=makeElement('li');
        item.append(goalStreakBadge({count:days,days},'day',style),makeElement('span',null,streakValue(days,'day')));
        list.append(item);
      }
      section.append(makeElement('h3',null,label),list);
      return section;
    }));
    const tile=$('#referenceGoalFlameSample');
    if(tile){
      const badge=goalStreakBadge({count:2,days:streakTiers[0].days},'day');
      tile.querySelector('.goal-streak-badge')?.remove();
      tile.prepend(badge);
    }
  }
  function filteredGoalTargets(categoryId=goalCategoryIds || goalCategoryFilter,activityIds=goalActivityFilter) {
    return goalTargets(categoryId).filter(target=>activityIds===null || (target.category?target.ids.some(id=>activityIds.includes(id)):activityIds.includes(target.item.id)));
  }
  function allActivitiesSelected(ids,activities){
    return ids===null || (activities.length>0 && activities.every(activity=>ids.includes(activity.id)));
  }
  function animateFilterReset(button){
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return null;
    const icon=button.querySelector('.filter-reset-icon');
    icon.getAnimations?.().forEach(animation=>animation.cancel());
    return icon.animate?.([{transform:'rotate(0deg)'},{transform:'rotate(-360deg)'}],{duration:400,easing:'ease-out'});
  }
  function renderGoals() {
    if(!goalReference)goalReference=localDateKey(new Date());
    const calendar=calendarIsOpen('goals');
    const reference=calendar?calendarState.date:goalReference,period=goalPickerPeriod();
    $('#goalDateControls').inert=period==='life';
    if(period!=='life')updateDateNavigation('goalDateLabel','globalGoalDate',reference,period);
    else showCenturyRange($('#goalDateLabel'));
    syncFormatButtons('goal',goalFormat);
    syncSegmentedSwitch($('#historyViews'),'goalView',period);
    syncCompactSwitch($('#historyViews'));
    if(calendar)syncCalendarDayFormat();
    if(calendar){
      if(period==='life'){renderLifeCalendar();return;}
      renderGoalHistory();
      const history=$('#goalHistory .goal-calendar-body');
      if(calendarState.period!=='day' && !history.querySelector('[data-tone]:not([data-tone=empty])')){
        appendWorkspaceEmpty(history,'Aucun objectif à afficher','Choisissez une autre période ou modifiez vos filtres.');
      }
      return;
    }
    const root=$('#globalGoalCards'),tiles=goalFormat==='cards';
    root.dataset.format=goalFormat;
    root.replaceChildren();
    const {categoryId,categoryIds,activityIds,status,frequencies}=activeQuickFilter('goals');
    const targets=filteredGoalTargets(categoryIds || categoryId,activityIds).filter(({goal,ids})=>
      (!frequencies.length || frequencies.includes(goal.period)) && goalMatchesStatus(goalProgress(ids,goal,goalReference),status));
    if(!targets.length){appendWorkspaceEmpty(root,'Aucun objectif à afficher','Choisissez une autre fréquence ou modifiez vos filtres.');return;}
    const progress=makeElement('div');
    progress.id=tiles?'goalTileProgress':'goalListProgress';
    renderGoalSummary(targets,goalReference,progress,selectedGoalFrequency());root.append(progress);
    for(const [period,label] of goalFrequencyOptions){
      if(frequencies.length && !frequencies.includes(period))continue;
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
      drawGoals(grid,goalReference,categoryIds || categoryId,status,period,activityIds);
    }
  }

  function summarizeGoalOutcomes(rows,ongoing){
    if(!rows.length)return {tone:'empty',label:'Aucun objectif pour cette période'};
    if(rows.every(row=>row.tone==='future'))return {tone:'future',label:'À venir'};
    const completed=rows.filter(row=>row.tone==='success' || row.tone==='exceeded' || (row.goal.mode==='max' && row.tone==='warning')).length;
    const positiveExceeded=rows.filter(row=>row.surpassed).length;
    const highlighted=rows.some(row=>row.tone==='exceeded');
    const overLimit=rows.some(row=>row.goal.mode==='max' && row.tone==='danger');
    const atLimit=rows.some(row=>row.goal.mode==='max' && row.tone==='warning');
    const missed=rows.some(row=>row.tone==='danger');
    const tone=overLimit?'danger':atLimit?'warning':completed===rows.length?(highlighted?'exceeded':'success'):completed?'warning':missed?'danger':'pending';
    const beyond=positiveExceeded?' · '+positiveExceeded+(positiveExceeded>1?' objectifs surpassés':' objectif surpassé'):'';
    const completionLabel=rows.some(row=>row.goal.mode==='max')?'respectés':'atteints';
    return {tone,completed,total:rows.length,completionLabel,
      label:completed+' / '+rows.length+' objectifs '+completionLabel+beyond+(ongoing?' · En cours':'')};
  }
  function goalHistoryAmount({count,goal}){
    return measureValue(count,goal)+' / '+measureValue(goal.target,goal)+' '+unitLabel(goal);
  }
  function calendarGoalTargets(reference){
    const {categoryId,categoryIds,activityIds,status,frequencies}=activeQuickFilter('calendar');
    return filteredGoalTargets(categoryIds || categoryId,activityIds).filter(({goal,ids})=>
      (!frequencies.length || frequencies.includes(goal.period)) &&
      (status==='all' || goalMatchesStatus(goalProgress(ids,goal,reference),status)));
  }
  function renderGoalHistory() {
    if(calendarPreviewAnchor && $('#goalHistory').contains(calendarPreviewAnchor))hideCalendarPreview();
    const panel=$('#goalHistory');panel.replaceChildren();
    const root=document.createElement('div');root.className='goal-calendar-body';panel.append(root);
    const {date:historyDate,period:historyView}=calendarState;
    const {categoryId,categoryIds,activityIds,status,frequencies}=activeQuickFilter('calendar');
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
    if(historyView==='day'){
      root.classList.add('goal-calendar-day');
      root.append(calendarDayHeading(historyDate));
      const dayTargets=targets.filter(({goal,ids})=>goalMatchesStatus(goalProgress(ids,goal,historyDate),status));
      if(!dayTargets.length){
        appendWorkspaceEmpty(root,'Aucun objectif pour cette journée','Choisissez une autre date ou modifiez les filtres.');
        return;
      }
      for(const [period] of goalFrequencyOptions){
        if(!shows(period))continue;
        const group=dayTargets.filter(({goal})=>goal.period===period);
        const section=calendarSection(period);
        const heading=section.firstElementChild;
        const header=makeElement('div','calendar-goal-section-heading');
        heading.replaceWith(header);
        header.append(heading);
        if(!group.length){appendWorkspaceEmpty(section,'Aucun objectif pour cette période',null,{compact:true});continue;}
        const progress=makeElement('div','calendar-goal-progress');
        header.append(progress);
        renderGoalSummary(group,historyDate,progress,period);
        if(calendarState.dayFormats.goals==='list'){
          renderGoalTable(section,group,period,{reference:historyDate,activityIds,view:'calendar'});
          continue;
        }
        const grid=makeElement('div','goal-cards daily-goal-grid calendar-goal-tiles');
        section.append(grid);
        drawGoals(grid,historyDate,categoryIds || categoryId,status,period,activityIds);
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
      rows.forEach(({name,ownerId,goal,count,tone,status})=>{
        const item=makeButton('',()=>openGoalEditor(ownerId,goal.id),'week-goal-item');
        item.dataset.tone=tone;item.dataset.goalId=goal.id;
        const amount=goalHistoryAmount({count,goal});
        item.setAttribute('aria-label','Modifier l’objectif de '+name+' · '+status+' · '+amount);
        item.append(makeElement('strong',null,name),makeElement('span','week-goal-amount',amount));
        list.append(item);
      });
      if(!rows.length)list.append(makeElement('p','muted','Aucun objectif'));
    }
    function outcomesFor(reference,scope){
      const [start,end]=periodBounds(reference,scope);
      return targetGroups[scope].flatMap(({item,goal,counts})=>{
        const result=evaluateGoal(goal,counts.get(start)||0,start,end,today);
        return result.tone==='empty'?[]:[{name:item.name,ownerId:item.id,goal,...result}];
      });
    }
    function assess(reference,scope,rows=outcomesFor(reference,scope)){
      const [,end]=periodBounds(reference,scope);
      return summarizeGoalOutcomes(rows,end>=today);
    }
    const [start]=periodBounds(historyDate,historyView);
    function openGoalDay(date){
      calendarState.period='day';setGoalDate(date);
      const heading=root.parentElement?.querySelector('.calendar-day-heading') || $('#goalHistory .calendar-day-heading');
      if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
    }
    function cell(date,scope,text,result=assess(date,scope)){
      const button=makeButton(text,()=>{
        if(scope==='day'){openGoalDay(date);return;}
        setGoalDate(date);
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
      root.classList.add('goal-calendar-week');
      if(shows('day')){
        const daily=calendarSection('day');
        calendarWeekGrid(daily,start,(column,date)=>{
          const rows=outcomesFor(date,'day'),result=assess(date,'day',rows);
          const heading=column.parentElement.querySelector('.week-heading');
          heading.dataset.date=date;
          heading.setAttribute('aria-label',formatDate(date)+' · '+result.label);
          const list=makeElement('div','week-goal-list');
          appendOutcomes(list,rows);
          if(rows.length){
            const progress=summaryBar(date,'day',formatDate(date),rows,result);
            progress.classList.add('goal-week-day-progress');
            column.append(progress);
          }
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
          const title=period==='week'?'Semaine '+weekNumber(periodBounds(reference,'week')[0]):periodLabel(reference,period);
          const rows=outcomesFor(reference,period);
          group.append(summaryBar(reference,period,title,rows));
          const list=makeElement('div','week-goal-list');
          appendOutcomes(list,rows);
          group.append(list);groups.append(group);
        });
        section.append(groups);
      }
      return;
    }
    function summaryBar(date,period,title,rows=outcomesFor(date,period),result=assess(date,period,rows)){
      const interactive=historyView!=='week';
      const button=interactive?makeButton('',()=>showCalendarPreview(button),'goal-period-summary'):makeElement('div','goal-period-summary');
      button.dataset.tone=result.tone;button.dataset.period=period;
      button.setAttribute('aria-label',title+' · '+result.label);
      if(interactive){
        button.dataset.previewDate=date;
        goalCalendarPreviews.set(button,()=>({scope:period,rows}));
      }else button.setAttribute('role','group');
      const heading=makeElement('strong',null,title);
      const label=makeElement('span','goal-period-result',result.total?result.completed+' / '+result.total+' '+result.completionLabel:result.label);
      const track=makeElement('span','day-total-progress goal-period-track');
      track.setAttribute('aria-hidden','true');
      appendGoalSegments(track,rows);
      button.append(heading,track,label);
      return button;
    }
    if(historyView==='month'){
      const [year,month]=historyDate.split('-').map(Number);
      if(shows('month'))root.append(summaryBar(historyDate,'month',periodLabel(historyDate,'month')));
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
      if(frequencies.includes('year'))root.append(summaryBar(historyDate,'year',periodLabel(historyDate,'year')));
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
    rememberTemporalSelection(date,goalPickerPeriod());
    syncShortcutStar();
    renderGoals();persist();
  }
  $('#globalGoalDate').addEventListener('change',event=>setGoalDate(event.target.value));
  function shiftGoalPeriod(direction){
    const calendar=calendarIsOpen('goals');
    const date=calendar?calendarState.date:goalReference || localDateKey(new Date());
    setGoalDate(shiftDate(date,goalPickerPeriod(),direction));
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
  function showProfile(show) {setPage(show?'profile':'day');}
  const accountToggle=$('#accountToggle'),accountMenu=$('#accountMenu');
  const accountMenuAnimations=new WeakMap();
  function setAccountDisclosure(toggle,menu,open){
    if((toggle.getAttribute('aria-expanded')==='true')===open)return;
    const style=menu.hidden?null:getComputedStyle(menu);
    const from=style?{opacity:style.opacity,transform:style.transform}:{opacity:0,transform:'translateY(-10px)'};
    accountMenuAnimations.get(menu)?.cancel();
    accountMenuAnimations.delete(menu);
    toggle.setAttribute('aria-expanded',String(open));
    menu.toggleAttribute('inert',!open);
    if(open)menu.hidden=false;
    if(typeof menu.animate!=='function' || matchMedia('(prefers-reduced-motion: reduce)').matches){
      menu.hidden=!open;return;
    }
    const animation=menu.animate([from,open?{opacity:1,transform:'none'}:{opacity:0,transform:'translateY(-10px)'}],
      {duration:open?240:185,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});
    accountMenuAnimations.set(menu,animation);
    animation.finished.then(()=>{
      if(accountMenuAnimations.get(menu)!==animation)return;
      menu.hidden=!open;
      accountMenuAnimations.delete(menu);
      animation.cancel();
    },()=>{});
  }
  function setAccountMenu(open,returnFocus=false) {
    setAccountDisclosure(accountToggle,accountMenu,open);
    if(returnFocus)accountToggle.focus({preventScroll:true});
  }
  accountToggle.addEventListener('click',()=>setAccountMenu(accountToggle.getAttribute('aria-expanded')!=='true'));
  accountToggle.addEventListener('keydown',event=>{
    if(event.key==='ArrowDown'){event.preventDefault();setAccountMenu(true);$('#openProfile').focus();}
  });
  $('#homeBrand').addEventListener('click',event=>{event.preventDefault();showProfile(false);});
  document.addEventListener('click',event=>{
    if(!accountMenu.hidden && !event.target.closest('.account-control'))setAccountMenu(false);
  });
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if(accountToggle.getAttribute('aria-expanded')==='true')setAccountMenu(false,true);
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
    cake:'<path d="M4 21h16M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7M5 16c2 2 4 2 7 0 3 2 5 2 7 0M8 12V8m4 4V8m4 4V8M8 5v.1M12 5v.1M16 5v.1"/>',
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
  disconnectDevicesDialog.querySelector('button[type=submit]').prepend(logoutIcon.cloneNode(true));
  function renderProfileDevices() {
    const list=$('#profileDevices');list.replaceChildren();
    disconnectAllDevices.hidden=!currentAccount?.demo;
    if(!currentAccount?.demo){
      const row=makeElement('li');
      if(currentAccount)row.append(profileRowLabel('Session actuelle · ce navigateur','desktop'));
      const link=makeElement('a','profile-security-link','Voir mes appareils sur Google');
      link.href='https://myaccount.google.com/device-activity';
      link.target='_blank';link.rel='noopener noreferrer';
      row.append(link);list.append(row);
      return;
    }
    demoDevices.forEach((name,index)=>{
      const row=document.createElement('li');
      const label=profileRowLabel(name,['desktop','mobile','tablet'][sampleDevices.indexOf(name)]);
      const button=makeButton('Déconnecter',()=>{
        const undo=captureUndo('devices');
        demoDevices=demoDevices.filter(device=>device!==name);
        renderProfileDevices();
        (list.querySelectorAll('button')[index] || list.querySelector('button') || $('#profileDevicesTitle')).focus();
        showSaveToast('Appareil retiré de la liste',undo());
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
    const undo=captureUndo('devices');
    demoDevices=[];
    disconnectDevicesDialog.close();
    renderProfileDevices();
    $('#profileDevicesTitle').focus();
    showSaveToast('Tous les appareils ont été retirés de la liste',undo());
  });
  const goalFilterStatuses=[['all','Tous'],['pending','À accomplir'],['success','Atteints / dans la limite'],['exceeded','Objectifs surpassés'],['warning','À la limite'],['danger','Limite dépassée'],['missed','Non atteints']];
  function normalizedFilter(scope,value={}){
    const categoryIds=filterCategoryIds(value);
    const ids=new Set(activitiesForCategories(categoryIds).map(item=>item.id));
    return {
      ...filterCategoriesPatch(categoryIds),
      activityIds:Array.isArray(value?.activityIds)?[...new Set(value.activityIds.filter(id=>ids.has(id)))]:null,
      ...(scope==='goals'?{status:goalFilterStatuses.some(([id])=>id===value?.status)?value.status:'all'}:{})
    };
  }
  let shareWorkspaceFilters=true,rememberWorkspaceFilters=false,stickyHeader=false,stickyWorkspaceControls=false;
  let sharedFilters=null,statsFilters={};
  let shareWorkspaceDates=false,rememberWorkspaceDates=false,sharedTemporalView=null;

  function temporalViewForPage(page){
    const today=localDateKey(new Date());
    switch(page){
      case 'day':return {date:agendaDate,period:null};
      case 'calendar':return {date:calendarState.date,period:calendarState.period};
      case 'activities':return {date:focusDate,period:calendarView};
      case 'goals':return {date:goalReference || today,period:goalDatePeriod || selectedGoalFrequency(defaultViews.goals.period)};
      case 'statistics':return {date:statsDate || today,period:statsPeriod};
      default:return {date:null,period:null};
    }
  }
  function rememberTemporalSelection(date,period){
    if(!shareWorkspaceDates || !validGoalDate(date))return;
    sharedTemporalView={date,period:calendarPeriods.includes(period)?period:sharedTemporalView?.period || null};
  }
  function applySharedTemporalView(page){
    if(!shareWorkspaceDates || !sharedTemporalView)return;
    const {date,period}=sharedTemporalView;
    switch(page){
      case 'day':agendaDate=date;break;
      case 'calendar':
        calendarState.date=date;
        if(period)calendarState.period=period;
        break;
      case 'activities':
        focusDate=date;state.year=Number(date.slice(0,4));
        if(period)calendarView=period;
        break;
      case 'goals':
        goalReference=date;
        if(period)goalDatePeriod=period;
        break;
      case 'statistics':{
        const today=localDateKey(new Date());
        statsDate=date<today?date:null;
        if(period)statsPeriod=period;
        break;
      }
    }
  }
  const workspaceFilterPages=['calendar','activities','goals','statistics'];

  function withCurrentViews(data){
    const {activityFormat,goalFormat,calendarScope,calendarView,focusDate,agendaDate,goalReference,goalDatePeriod,calendar,
      sharedTemporalView,statsDate,statsPeriod,goalCategoryFilter,goalCategoryIds,goalStatusFilter,goalActivityFilter,goalFrequencyFilter,activityExtraFilter,sharedFilters,statsFilters}=exportInterface();
    const selections={...state.selections};
    if(state.activeCategory!=='overview')selections[state.activeCategory]=state.selectedActivities;
    return {...data,year:state.year,activeCategory:state.activeCategory,selections,selectedActivities:state.selectedActivities,
      interface:{...data.interface,page:currentPage,activityFormat,goalFormat,calendarScope,calendarView,
        focusDate,agendaDate,goalReference,goalDatePeriod,calendar,sharedTemporalView,statsDate,statsPeriod,goalCategoryFilter,goalCategoryIds,goalStatusFilter,goalActivityFilter,goalFrequencyFilter,activityExtraFilter,sharedFilters,statsFilters}};
  }

  function applyActivityFilter(value){
    const filter=normalizedFilter('activities',value);
    activityExtraFilter=filter.categoryIds || (!filter.categoryId && filter.activityIds!==null)?filter:null;
    state.activeCategory=filter.categoryId || 'overview';
    state.selectedActivities=filter.activityIds ?? state.activities.filter(item=>!filter.categoryId || item.categoryId===filter.categoryId).map(item=>item.id);
  }
  function applyGoalFilter(value){
    const filter=normalizedFilter('goals',value);
    goalCategoryFilter=filter.categoryId;goalCategoryIds=filter.categoryIds;goalActivityFilter=filter.activityIds;goalStatusFilter=filter.status;
    goalFrequencyFilter=normalizeGoalFrequencies(value?.frequencies);
  }
  $('#shareWorkspaceFilters').addEventListener('change',event=>{
    if(event.target.checked){
      if(workspaceFilterPages.includes(currentPage))sharedFilters=normalizeWorkspaceFilters(pageFilter(currentPage));
    }else{
      for(const page of workspaceFilterPages)applyPageFilter(page,sharedFilters || {});
    }
    shareWorkspaceFilters=event.target.checked;
    renderNavigationSettings();render();
  });
  $('#rememberWorkspaceFilters').addEventListener('change',event=>{
    rememberWorkspaceFilters=event.target.checked;renderNavigationSettings();persist();
  });
  $('#shareWorkspaceDates').addEventListener('change',event=>{
    shareWorkspaceDates=event.target.checked;
    if(shareWorkspaceDates){
      const current=temporalViewForPage(currentPage);
      const view=current.date?current:temporalViewForPage('calendar');
      rememberTemporalSelection(view.date,view.period || temporalViewForPage('calendar').period);
    }else sharedTemporalView=null;
    renderNavigationSettings();persist();
  });
  $('#rememberWorkspaceDates').addEventListener('change',event=>{
    rememberWorkspaceDates=event.target.checked;
    renderNavigationSettings();persist();
  });
  $('#stickyHeader').addEventListener('change',event=>{
    stickyHeader=event.target.checked;
    renderNavigationSettings();persist();
  });
  $('#stickyWorkspaceControls').addEventListener('change',event=>{
    stickyWorkspaceControls=event.target.checked;
    renderNavigationSettings();persist();
  });
  function renderNavigationSettings(){
    $('#shareWorkspaceFilters').checked=shareWorkspaceFilters;
    $('#rememberWorkspaceFilters').checked=rememberWorkspaceFilters;
    $('#sharedFilterReloadOption').hidden=!shareWorkspaceFilters;
    $('#shareWorkspaceDates').checked=shareWorkspaceDates;
    $('#rememberWorkspaceDates').checked=rememberWorkspaceDates;
    $('#stickyHeader').checked=stickyHeader;
    $('#stickyWorkspaceControls').checked=stickyWorkspaceControls;
    $('#resetNavigationFilters').disabled=shareWorkspaceFilters && !rememberWorkspaceFilters && !shareWorkspaceDates && !rememberWorkspaceDates && !stickyHeader && !stickyWorkspaceControls;
    syncNavigationReset();
    updateNavigationDescriptions();
    const app=document.getElementById('app');
    app.toggleAttribute('data-sticky-header',stickyHeader);
    app.toggleAttribute('data-sticky-controls',stickyWorkspaceControls);
  }
  function updateNavigationDescriptions(){
    for(const input of $('#preferencesNavigation').querySelectorAll('input[role=switch][aria-describedby]')){
      const description=document.getElementById(input.getAttribute('aria-describedby'));
      description.textContent=input.checked?description.dataset.on:description.dataset.off;
    }
  }
  if(typeof ResizeObserver==='function'){
    new ResizeObserver(([{target}])=>{
      document.getElementById('app').style.setProperty('--workspace-header-height',target.offsetHeight+'px');
    }).observe($('#authenticatedApp .topbar'));
  }
  function renderDefaultViewSettings(){
    for(const [scope,settings] of Object.entries(defaultViewSettings)){
      const button=document.getElementById('resetView'+scope[0].toUpperCase()+scope.slice(1));
      button.disabled=defaultViews[scope].period===settings.period && defaultViews[scope].format===settings.format;
    }
    $('#resetDefaultViews').disabled=['resetViewActivities','resetViewGoals'].every(id=>document.getElementById(id).disabled);
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
    const content=container.querySelector('.preferences-content');
    function select(selected,focus=false,allowCollapse=false){
      const repeated=allowCollapse && selected.getAttribute('aria-selected')==='true';
      tabs.forEach(tab=>{
        const active=tab===selected;
        tab.tabIndex=active?0:-1;
        tab.setAttribute('aria-selected',String(active));
        document.getElementById(tab.getAttribute('aria-controls')).hidden=!active;
      });
      if(!repeated)content.scrollTop=0;
      onSelect?.(selected,repeated);
      if(focus)selected.focus({preventScroll:true});
    }
    tabs.forEach((tab,index)=>{
      tab.addEventListener('click',()=>select(tab,false,true));
      tab.addEventListener('keydown',event=>{
        const steps={ArrowUp:-1,ArrowDown:1};
        let next;
        if(event.key==='Home')next=0;
        else if(event.key==='End')next=tabs.length-1;
        else if(Object.hasOwn(steps,event.key))next=(index+steps[event.key]+tabs.length)%tabs.length;
        else return;
        event.preventDefault();
        select(tabs[next],true);
      });
    });
    return ()=>select(tabs[0],true);
  }
  const preferenceSubnavs=[...preferencesDialog.querySelectorAll('[data-preferences-subnav]')];
  const preferencesContent=preferencesDialog.querySelector('.preferences-content');
  function markPreferenceSection(nav,active){
    for(const link of nav.querySelectorAll('a')){
      if(link===active)link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    }
  }
  function syncPreferenceSection(){
    const nav=preferenceSubnavs.find(item=>item.hasAttribute('data-expanded'));
    if(!nav || !preferencesDialog.open)return;
    const links=[...nav.querySelectorAll('a')];
    const threshold=preferencesContent.getBoundingClientRect().top+24;
    let active=links[0];
    for(const link of links){
      if(document.getElementById(link.hash.slice(1)).getBoundingClientRect().top>threshold)break;
      active=link;
    }
    const {clientHeight,scrollHeight,scrollTop}=preferencesContent;
    if(scrollHeight>clientHeight && scrollHeight-scrollTop-clientHeight<=2)active=links.at(-1);
    markPreferenceSection(nav,active);
  }
  preferencesContent.addEventListener('scroll',syncPreferenceSection,{passive:true});
  for(const nav of preferenceSubnavs){
    nav.addEventListener('click',event=>{
      const link=event.target.closest('a[href^="#"]');
      if(!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)return;
      const heading=document.getElementById(link.hash.slice(1));
      if(!heading || heading.closest('[hidden]'))return;
      event.preventDefault();
      markPreferenceSection(nav,link);
      const top=preferencesContent.scrollTop+heading.getBoundingClientRect().top-preferencesContent.getBoundingClientRect().top-14;
      if(preferencesContent.scrollTo)preferencesContent.scrollTo({top,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
      else preferencesContent.scrollTop=top;
      heading.tabIndex=-1;
      heading.focus({preventScroll:true});
    });
  }
  const resetPreferencesTabs=bindSectionTabs(preferencesDialog,(selected,repeated)=>{
    for(const nav of preferenceSubnavs){
      const matching=nav.dataset.preferencesSubnav===selected.id;
      const expanded=matching && (!repeated || !nav.hasAttribute('data-expanded'));
      nav.toggleAttribute('data-expanded',expanded);
      nav.toggleAttribute('inert',!expanded);
      $('#' + nav.dataset.preferencesSubnav).setAttribute('aria-expanded',String(expanded));
      if(expanded && !repeated)markPreferenceSection(nav,nav.querySelector('a'));
    }
    if(repeated)syncPreferenceSection();
    if(selected.id==='preferencesNavigationTab'){
      renderNavigationSettings();renderDashboardSectionSettings();
    }
  });
  let preferencesOpener=accountToggle;
  function openPreferences(opener=accountToggle){
    if(preferencesDialog.open)return;
    preferencesOpener=opener;
    setAccountMenu(false,opener===accountToggle);
    renderDefaultViewSettings();applyGoalColors();syncStreakTierFields();
    preferencesDialog.showModal();
    updateSegmentIndicator(streakStyleSwitch);
    resetPreferencesTabs();
  }
  $('#openPreferences').addEventListener('click',()=>openPreferences());
  $('#closePreferences').addEventListener('click',()=>preferencesDialog.close());
  preferencesDialog.addEventListener('close',()=>{
    if(preferencesDialog.open)return;
    preferencesOpener.focus({preventScroll:true});
  });
  const avatarDialog=$('#profileAvatarDialog'),avatarFile=$('#avatarPhotoFile'),avatarError=$('#avatarPhotoError');
  const avatarSources=[...$('#avatarSources').querySelectorAll('button')];
  let failedAvatarUrl,avatarUploadRevision=0;
  function normalizeAvatar(value){
    const avatar={useGoogle:value?.useGoogle!==false,initial:['both','last'].includes(value?.initial)?value.initial:'first'};
    const photo=value?.photo;
    if(typeof photo==='string' && photo.length<=150000 && /^data:image\/jpeg;base64,[a-z0-9+/]+={0,2}$/i.test(photo)){
      avatar.photo=photo;avatar.useCustom=value.useCustom===true && !avatar.useGoogle;
    }
    return avatar;
  }
  function renderAccountAvatar(){
    const user=currentAccount;
    const names=user?.displayName?.trim().split(/\s+/).filter(Boolean) || [];
    const initial=value=>Array.from(value || 'Y')[0].toLocaleUpperCase('fr');
    const first=initial(names[0] || user?.email),last=initial(names.at(-1) || user?.email);
    const both=names.length>1?first+last:first;
    const letter={first,last,both}[state.avatar.initial];
    const googlePhoto=user?.photoURL!==failedAvatarUrl?user?.photoURL:null;
    const photo=state.avatar.useCustom?state.avatar.photo:state.avatar.useGoogle?googlePhoto:null;
    for(const prefix of ['account','profile','editor','referenceHeader','referenceDropdown']){
      const image=$('#'+prefix+'Avatar'),text=$('#'+prefix+'Initial');
      if(!image || !text)continue;
      text.textContent=letter;text.hidden=Boolean(photo);image.hidden=!photo;
      if(photo){
        if(image.getAttribute('src')!==photo)image.src=photo;
      }else image.removeAttribute('src');
    }
    const source=photo?(state.avatar.useCustom?'custom':'google'):'initials';
    for(const button of avatarSources){
      button.setAttribute('aria-pressed',String(button.dataset.avatarSource===source));
    }
    $('#useGoogleAvatar').disabled=!googlePhoto;
    $('#profilePhotoUnavailable').hidden=Boolean(googlePhoto);
    $('[data-avatar-source=custom]').hidden=!state.avatar.photo;
    $('#removeAvatarPhoto').hidden=!state.avatar.photo;
    $('#profileInitialChoice').hidden=Boolean(photo);
    $('#profileBothInitialsLabel').textContent='Initiales · '+both;
    $('#profileFirstInitialLabel').textContent='Prénom · '+first;
    $('#profileLastInitialLabel').textContent='Nom · '+last;
    document.querySelectorAll('[name=profileInitialSource]').forEach(input=>{input.checked=input.value===state.avatar.initial;});
  }
  function updateAvatar(patch){
    state.avatar=normalizeAvatar({...state.avatar,...patch});
    renderAccountAvatar();persist();
  }
  for(const id of ['#accountAvatar','#profileAvatar','#editorAvatar']){
    $(id).addEventListener('error',event=>{
      if(event.currentTarget.getAttribute('src')!==currentAccount?.photoURL)return;
      failedAvatarUrl=currentAccount.photoURL;renderAccountAvatar();
    });
  }
  for(const button of avatarSources){
    button.addEventListener('click',()=>{
      avatarUploadRevision++;
      const source=button.dataset.avatarSource;
      updateAvatar({useGoogle:source==='google',useCustom:source==='custom'});
    });
  }
  document.querySelectorAll('[name=profileInitialSource]').forEach(input=>input.addEventListener('change',()=>{
    if(input.checked){avatarUploadRevision++;updateAvatar({initial:input.value,useGoogle:false,useCustom:false});}
  }));
  const editAvatar=$('#editProfileAvatar'),uploadAvatar=$('#uploadAvatarPhoto');
  [editAvatar,uploadAvatar].forEach(appendTileEditIndicator);
  editAvatar.addEventListener('click',()=>{
    avatarError.hidden=true;renderAccountAvatar();avatarDialog.showModal();
  });
  $('#closeProfileAvatar').addEventListener('click',()=>avatarDialog.close());
  avatarDialog.addEventListener('close',()=>{
    avatarUploadRevision++;avatarFile.value='';
    if(currentPage==='profile')editAvatar.focus({preventScroll:true});
  });
  [uploadAvatar,$('#chooseAvatarPhoto')].forEach(button=>button.addEventListener('click',()=>avatarFile.click()));
  $('#removeAvatarPhoto').addEventListener('click',()=>{
    avatarUploadRevision++;
    updateAvatar({photo:null,useCustom:false});uploadAvatar.focus();
  });
  avatarFile.addEventListener('change',async()=>{
    const file=avatarFile.files[0],revision=++avatarUploadRevision,account=currentAccount;
    avatarFile.value='';avatarError.hidden=true;
    if(!file)return;
    let url;
    try{
      if(file.size>25*1024*1024)throw new Error('Image too large');
      url=URL.createObjectURL(file);
      const image=new Image();
      image.src=url;await image.decode();
      const edge=Math.min(image.naturalWidth,image.naturalHeight);
      if(!edge)throw new Error('Empty image');
      // Store a small square JPEG so it fits in the existing synced preferences.
      const canvas=document.createElement('canvas'),size=Math.min(256,edge);
      canvas.width=canvas.height=size;
      const context=canvas.getContext('2d');
      context.fillStyle='#fff';context.fillRect(0,0,size,size);
      context.drawImage(image,(image.naturalWidth-edge)/2,(image.naturalHeight-edge)/2,edge,edge,0,0,size,size);
      const photo=canvas.toDataURL('image/jpeg',0.83);
      if(!normalizeAvatar({photo}).photo)throw new Error('Image encoding failed');
      if(revision===avatarUploadRevision && avatarDialog.open && account?.uid===currentAccount?.uid)updateAvatar({photo,useGoogle:false,useCustom:true});
    }catch{
      if(revision!==avatarUploadRevision || !avatarDialog.open)return;
      avatarError.textContent='Impossible de charger cette image. Choisis une autre photo de 25 Mo maximum.';
      avatarError.hidden=false;
    }finally{
      if(url)URL.revokeObjectURL(url);
    }
  });
  function profileBadgeProgress(){
    const today=localDateKey(new Date());
    const entries=Object.entries(state.entries).filter(([date])=>date<=today)
      .sort(([left],[right])=>left.localeCompare(right));
    const firstEntry=entries[0]?.[0] || today;
    const known=new Map(state.activities.map(({id,categoryId})=>[id,categoryId]));
    const activitiesSeen=new Set(),categoriesSeen=new Set(),weeksSeen=new Set(),monthsSeen=new Set();
    const timeline=new Map();
    function record(metric,date,amount=1){
      if(!timeline.has(metric))timeline.set(metric,[]);
      timeline.get(metric).push({date,amount});
    }
    function recordFirst(seen,key,metric,date){
      if(seen.has(key))return;
      seen.add(key);record(metric,date);
    }
    for(const [date,ids] of entries){
      const activeIds=ids.filter(id=>known.has(id) && measuredAmount(date,id,{unit:'count'})>0);
      if(!activeIds.length)continue;
      record('activities',date,activeIds.reduce((sum,id)=>sum+measuredAmount(date,id,{unit:'count'}),0));
      record('days',date);
      recordFirst(weeksSeen,periodBounds(date,'week')[0],'weeks',date);
      recordFirst(monthsSeen,date.slice(0,7),'months',date);
      if([0,6].includes(new Date(date+'T12:00:00').getDay()))record('weekendDays',date);
      if(new Set(activeIds).size>=3)record('busyDays',date);
      for(const id of activeIds){
        recordFirst(activitiesSeen,id,'distinctActivities',date);
        if(known.get(id))recordFirst(categoriesSeen,known.get(id),'distinctCategories',date);
      }
    }
    for(const {goal,ids} of goalTargets()){
      const first=goal.startDate || firstEntry;
      if(first>today)continue;
      const reachedDates=new Map();
      const counts=goalCountsByPeriod(ids,goal,today,entries,reachedDates);
      const firstPeriod=periodBounds(first,goal.period)[0];
      const sparse=goal.mode==='min' && goal.target>0;
      const periods=sparse?[...counts.keys()].sort():null;
      let runStart='',previousEnd='',runCount=0,reached=0;
      for(let index=0,start=periods?periods[0]:firstPeriod;start && start<=today;index++,
          start=periods?periods[index]:shiftDate(start,goal.period,1)){
        const [,end]=periodBounds(start,goal.period);
        const {tone}=evaluateGoal(goal,counts.get(start)||0,start,end,today);
        if((goal.mode==='max' && end>=today) || !['success','warning','exceeded'].includes(tone)){
          previousEnd='';continue;
        }
        const outcomeDate=goal.mode==='min' && reachedDates.has(start)?reachedDates.get(start):end>today?today:end;
        record('goals',outcomeDate);
        if(!previousEnd || shiftDate(previousEnd,'day',1)!==start){
          runStart=start<first?first:start;runCount=0;reached=0;
        }
        previousEnd=end;runCount++;
        if(runCount<2)continue;
        const days=1+(Date.parse(end>today?today:end)-Date.parse(runStart))/86400000;
        while(reached<streakTiers.length && days>=streakTiers[reached].days){
          const thresholdDate=shiftDate(runStart,'day',streakTiers[reached].days-1);
          record('flame-'+reached,outcomeDate>thresholdDate?outcomeDate:thresholdDate);
          reached++;
        }
      }
    }
    const totals={};
    for(const [metric,events] of timeline){
      events.sort((left,right)=>left.date.localeCompare(right.date));
      let total=0;
      for(const event of events){total+=event.amount;event.total=total;}
      totals[metric]=total;
    }
    return {
      totals,flames:streakTiers.map((_,tier)=>totals['flame-'+tier] || 0),
      earnedOn:(metric,target)=>timeline.get(metric)?.find(event=>event.total>=target)?.date
    };
  }

  const profileTabs=[...document.querySelectorAll('#profileView [role=tab]')];
  function selectProfileTab(tab){
    for(const button of profileTabs){
      const active=button===tab;
      button.setAttribute('aria-selected',String(active));
      button.tabIndex=active?0:-1;
      document.getElementById(button.getAttribute('aria-controls')).hidden=!active;
    }
    if(tab.id==='profileTabFlames')renderProfileFlames();
  }
  profileTabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>selectProfileTab(tab));
    tab.addEventListener('keydown',event=>{
      const steps={ArrowRight:(index+1)%profileTabs.length,ArrowLeft:(index+profileTabs.length-1)%profileTabs.length,Home:0,End:profileTabs.length-1};
      if(!Object.hasOwn(steps,event.key))return;
      event.preventDefault();
      const next=profileTabs[steps[event.key]];
      selectProfileTab(next);next.focus();
    });
  });

  function renderProfileFlames(){
    const root=$('#profileFlames'),today=localDateKey(new Date());
    const readStreak=goalStreakReader(today,true);
    const active=goalTargets().map(target=>({
      ...target,streak:readStreak(target.ids,target.goal,goalProgress(target.ids,target.goal,today))
    })).filter(({streak})=>streak).sort((a,b)=>b.streak.days-a.streak.days);
    const list=makeElement('ul','profile-flame-grid');
    for(const {item,goal,category,parent,streak} of active){
      const card=makeElement('li','profile-flame-card');
      const flame=goalStreakBadge(streak,goal.period);
      if(!flame)continue;
      const rule=goalDescription(goal);
      card.append(flame,makeElement('strong',null,category?categoryLabel(item):item.name));
      card.append(makeElement('span',null,category?rule:parent.name+' · '+rule));
      card.append(makeElement('small',null,streakValue(streak.count,goal.period)+' de suite'));
      list.append(card);
    }
    root.replaceChildren(list.children.length?list:makeElement('p','muted','Aucune flamme active pour le moment.'));
  }

  let profileBadgeFilter='all';
  function renderProfileBadges(){
    const root=$('#profileBadges'),{totals,flames,earnedOn}=profileBadgeProgress();
    const {activities=0,goals=0}=totals;
    const milestones=[1,10,25,50,100,1000];
    const activityBadges=milestones.map((target,rarity)=>({kind:'activities',hint:'Enregistrer '+statNumber.format(target)+' '+(target===1?'activité':'activités')+' dans les activités.',name:target===1?'Première activité':statNumber.format(target)+' activités',target,progress:activities,date:earnedOn('activities',target),rarity,icon:metricIcon('activity')}));
    const goalBadges=milestones.map((target,rarity)=>({kind:'goals',hint:'Réussir '+statNumber.format(target)+' '+(target===1?'période d’objectif.':'périodes d’objectifs.'),name:target===1?'Premier objectif réussi':statNumber.format(target)+' objectifs réussis',target,progress:goals,date:earnedOn('goals',target),rarity,icon:metricIcon('goals')}));
    const birthday=makeElement('span','profile-row-icon');birthday.dataset.profileIcon='cake';paintProfileIcon(birthday);
    const flameNames=['jaune','orange','rouge','violette',streakFlameFinish==='color'?null:streakFlameFinish==='gloss'?'brillante':streakFlameFinish==='glitter'?'à paillettes':'holographique'];
    const flameBadges=streakTiers.map(({color,days},tier)=>[1,10,25,50].map((target,rarity)=>({
      kind:'flames',hint:'Atteindre ce palier dans '+target+' '+(target===1?'série distincte.':'séries distinctes.'),
      name:target+' '+(target===1?'flamme':'flammes')+' '+((tier===4?Boolean(flameNames[tier]):color===defaultStreakTiers[tier].color)?
        flameNames[tier]+(target===1 || tier===1 || (tier===4 && streakFlameFinish==='glitter')?'':'s'):'· Palier '+(tier+1)),
      target,progress:flames[tier],date:earnedOn('flame-'+tier,target),rarity,icon:flameIcon(tier,color)
    })));
    const explorationBadges=[
      ['days','Une semaine au compteur','Enregistrer une activité sur 7 jours distincts.',7,'days',0],
      ['days','Un mois au compteur','Enregistrer une activité sur 30 jours distincts.',30,'days',2],
      ['weeks','De semaine en semaine','Enregistrer une activité sur 4 semaines distinctes.',4,'days',1],
      ['months','Au fil des saisons','Enregistrer une activité sur 12 mois distincts.',12,'days',4],
      ['weekendDays','Week-ends actifs','Enregistrer une activité sur 5 jours de week-end distincts.',5,'days',1],
      ['busyDays','Journées bien remplies','Pratiquer 3 activités différentes le même jour, à 3 reprises.',3,'activity',2],
      ['distinctActivities','Touche-à-tout','Enregistrer 5 activités différentes.',5,'activity',2],
      ['distinctCategories','Hors des sentiers battus','Enregistrer des activités dans 3 catégories différentes.',3,'catalog',3],
      ['distinctActivities','Grand explorateur','Enregistrer 15 activités différentes.',15,'catalog',4]
    ].map(([metric,name,hint,target,icon,rarity])=>({
      kind:icon, name, hint, target, progress:totals[metric] || 0, date:earnedOn(metric,target), icon:metricIcon(icon), rarity
    }));
    const generalBadges=[
      {kind:'birthday',name:'Une bougie de plus',hint:'Renseigner ta date de naissance dans les infos du compte.',progress:Number(Boolean(birthDate)),target:1,date:birthDateRecordedOn,icon:birthday,rarity:0},
      ...explorationBadges
    ];
    const items=[...generalBadges,...activityBadges,...goalBadges,...flameBadges.flat()];
    function badgeRow(badges){
      const list=makeElement('ul','profile-badge-grid');
      for(const {kind,name,hint,progress,target,date,icon,rarity} of badges){
        const unlocked=progress>=target;
        const item=makeElement('li','profile-achievement');
        item.dataset.badgeGroup=kind;item.dataset.rarity=rarity;item.dataset.earned=String(unlocked);
        const medal=makeElement('span','profile-medal');
        medal.setAttribute('aria-hidden','true');medal.append(icon);
        const status=makeElement('small',null,unlocked?'✓ Obtenu':'À débloquer · '+statNumber.format(progress)+' / '+statNumber.format(target));
        if(unlocked && date){
          const time=makeElement('time',null,formatDate(date));
          time.dateTime=date;
          status.replaceChildren('✓ Obtenu le ',time);
        }
        const copy=makeElement('div','profile-achievement-copy');
        copy.append(makeElement('strong',null,name),status);
        if(!unlocked && progress>0){
          const bar=makeElement('progress','profile-achievement-progress');
          bar.max=target;bar.value=progress;
          bar.setAttribute('aria-label','Progression · '+name);
          copy.append(bar);
        }
        copy.append(makeElement('p','profile-achievement-hint',hint));
        item.append(medal,copy);
        list.append(item);
      }
      return list;
    }
    const groups=[['Général',generalBadges],['Activités',activityBadges],['Objectifs',goalBadges]].map(([name,badges])=>{
      const section=makeElement('section');
      section.append(makeElement('h3',null,name),badgeRow(badges));
      return section;
    });
    const flameSection=makeElement('section');
    flameSection.append(makeElement('h3',null,'Flammes'));
    flameBadges.forEach((badges,tier)=>{
      const row=makeElement('div','profile-flame-badge-row');
      const {color,days}=streakTiers[tier];
      const name=(tier===4?Boolean(flameNames[tier]):color===defaultStreakTiers[tier].color)?' · Flamme '+flameNames[tier]:'';
      const heading=makeElement('h4');
      const flame=flameIcon(tier,color);flame.setAttribute('aria-hidden','true');
      heading.append(flame,makeElement('span',null,'Niveau '+(tier+1)+name),makeElement('small',null,streakValue(days,'day')));
      row.append(heading,badgeRow(badges));
      flameSection.append(row);
    });
    const badgeGroups=[...groups,flameSection];
    const filters=$('#profileBadgeFilters');
    filters.replaceChildren(...['Tous','Général','Activités','Objectifs','Flammes'].map((label,index)=>{
      const key=index?String(index):'all';
      return filterChip(label,key===profileBadgeFilter,()=>{
        profileBadgeFilter=key;
        for(const [offset,section] of badgeGroups.entries())section.hidden=key!=='all' && String(offset+1)!==key;
        for(const button of filters.children)button.setAttribute('aria-pressed',String(button.textContent===label));
      });
    }));
    badgeGroups.forEach((section,index)=>section.hidden=profileBadgeFilter!=='all' && String(index+1)!==profileBadgeFilter);
    root.replaceChildren(...badgeGroups);
    const achieved=items.filter(({progress,target})=>progress>=target).length;
    const summary=$('#profileSummary');
    summary.replaceChildren(...[['Badges obtenus',achieved],['Séries avec flamme',flames[0]],['Objectifs atteints',goals]].map(([label,value])=>{
      const item=makeElement('div');
      item.append(makeElement('dt',null,label),makeElement('dd',null,statNumber.format(value)));return item;
    }));
    $('#profileBadgeCount').textContent=items.filter(({progress,target})=>progress>=target).length+' / '+items.length+' obtenus';
  }

  function renderProfile() {
    const user=currentAccount || {};
    syncBirthDateControl('profile');
    $('#profileName').textContent=user.displayName || 'Votre compte';$('#profileEmail').textContent=user.email || '';
    const verification=$('#profileEmailVerified');
    const verified=typeof user.emailVerified==='boolean';
    const badge=makeElement('span','profile-badge',verified?(user.emailVerified?'Vérifié':'Non vérifié'):'—');
    if(verified)badge.dataset.tone=user.emailVerified?'success':'pending';
    verification.replaceChildren(badge);
    renderProfileDevices();
    $('#profileCreated').textContent=formatDate(user.createdAt);
    renderProfileBadges();
    if(!$('#profilePanelFlames').hidden)renderProfileFlames();
    const history=$('#loginHistory');history.replaceChildren();[...new Set(accountLogins.length?accountLogins:[user.lastLoginAt].filter(Boolean))].forEach(date=>{const item=document.createElement('li');item.append(profileRowLabel(formatDate(date,true),'clock'));history.append(item);});
    if(!history.children.length){const item=document.createElement('li');item.textContent='Aucune connexion enregistrée.';history.append(item);}
  }
  window.calendarApp.setAccount=(user,logins=[])=>{
    if(user?.demo!==currentAccount?.demo || user?.uid!==currentAccount?.uid)demoDevices=user?.demo?[...sampleDevices]:[];
    if(user?.uid!==currentAccount?.uid || !user)failedAvatarUrl=undefined;
    if(user?.uid!==currentAccount?.uid || user?.demo!==currentAccount?.demo || !user)resetStreakNotifications();
    currentAccount=user;accountLogins=logins;
    if(!user){
      $('#authGate').dataset.theme='system';state.avatar=normalizeAvatar(null);
      if(avatarDialog.open)avatarDialog.close();
    }
    for(const id of ['accountMenuName','referenceHeaderMenuName','referenceDropdownMenuName']){
      const label=document.getElementById(id);
      if(label)label.textContent=user?.displayName || 'Votre compte';
    }
    renderAccountAvatar();
    if(!user){
      if(preferencesDialog.open)preferencesDialog.close();
      clearTrackingCatalog();
      if(onboardingDialog.open)onboardingDialog.close();
      onboardingStatus=null;birthDate=null;birthDateRecordedOn=null;
      setPage('day',false);
    }else renderProfile();
  };

  // A single source of truth feeds every view and the Firebase write queue.
  let sectionLayout={folds:{},orders:{}};
  const periodOptions=[['day','Jour'],['week','Semaine'],['month','Mois'],['year','Année']];
  const calendarPeriods=periodOptions.map(([period])=>period);
  const defaultViewSettings={activities:{period:'year',format:'list'},goals:{period:'year',format:'cards'}};
  function normalizeDefaultViews(value={}){
    return Object.fromEntries(['activities','goals'].map(key=>[key,{
      period:calendarPeriods.includes(value?.[key]?.period)?value[key].period:defaultViewSettings[key].period,
      format:validFormat(value?.[key]?.format,defaultViewSettings[key].format)
    }]));
  }
  let defaultViews=normalizeDefaultViews();
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
  function resetViewSettings(){
    defaultViews=normalizeDefaultViews();
    renderDefaultViewSettings();
  }
  for(const scope of ['activities','goals']){
    document.getElementById('resetView'+scope[0].toUpperCase()+scope.slice(1)).addEventListener('click',()=>{
      defaultViews[scope]={...defaultViewSettings[scope]};
      renderDefaultViewSettings();persist();
    });
  }
  $('#resetDefaultViews').addEventListener('click',()=>confirmPreferencesReset('Réinitialiser les vues par défaut ?',()=>{resetViewSettings();render();}));
  renderDefaultViewSettings();
  const goalFrequencyOptions=[['day','Quotidiens'],['week','Hebdomadaires'],['month','Mensuels'],['year','Annuels']];
  let activityFormat=defaultViews.activities.format,goalFormat=defaultViews.goals.format,goalFrequencyFilter=[];
  function normalizeGoalFrequencies(value){
    if(!Array.isArray(value))return [];
    const selected=goalFrequencyOptions.map(([period])=>period).filter(period=>value.includes(period));
    return selected.length===goalFrequencyOptions.length?[]:selected;
  }
  function selectedGoalFrequency(fallback='all'){
    const {frequencies}=activeQuickFilter('goals');
    return frequencies.length===1?frequencies[0]:fallback;
  }
  let goalDatePeriod=null;
  function goalPickerPeriod(){
    return calendarIsOpen('goals')?calendarState.period:goalDatePeriod || selectedGoalFrequency(defaultViews.goals.period);
  }
  let calendarScope='activities';
  let calendarState={date:localDateKey(new Date()),period:'year',dayFormats:normalizeCalendarDayFormats(),categoryId:null,activityIds:null,status:'all',frequencies:[]};
  function normalizeWorkspaceFilters(value){
    const {categoryId,categoryIds,activityIds,status}=normalizedFilter('goals',value);
    const activities=activitiesForCategories(categoryIds || (categoryId?[categoryId]:[]));
    return {categoryId,categoryIds,activityIds:allActivitiesSelected(activityIds,activities)?null:activityIds,status,frequencies:normalizeGoalFrequencies(value?.frequencies)};
  }
  [...periodOptions,['life','Centenaire']].forEach(([period,label])=>{
    const button=makeButton(label,()=>{
      if(period==='life' && !calendarIsOpen('goals'))return;
      activeDatePicker?.close();
      if(calendarIsOpen('goals'))calendarState.period=period;
      else goalDatePeriod=period;
      rememberTemporalSelection(calendarIsOpen('goals')?calendarState.date:goalReference || localDateKey(new Date()),period);
      renderGoals();persist();
    });
    button.dataset.goalView=period;
    $('#historyViews').append(button);
  });
  let currentPage='day';
  let calendarView='year';
  let focusDate=localDateKey(new Date());
  let agendaDate=localDateKey(new Date());
  let agendaView='day';
  function controlIcon(path){
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+path+'"/></svg>';
  }
  function makeButton(text,action,className='') {
    const button=document.createElement('button');button.type='button';button.textContent=text;button.className=className;
    if(Object.hasOwn(controlIconPaths,text)){button.classList.add('icon-control');button.innerHTML=controlIcon(controlIconPaths[text]);}
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
  function appendWorkspaceEmpty(container,title,message,{compact=false}={}) {
    const panel=makeElement('div',compact?'workspace-empty workspace-empty-compact':'workspace-empty');
    const illustration=makeElement('img','workspace-empty-art');
    illustration.src='./empty-results.webp';
    illustration.alt='';
    illustration.width=300;
    illustration.height=200;
    illustration.loading='lazy';
    panel.append(illustration,makeElement(compact?'strong':'h3',null,title));
    if(message)panel.append(makeElement('p',null,message));
    container.append(panel);
  }
  function appendEmpty(container,message) {const p=document.createElement('p');p.className='empty-state';p.textContent=message;container.append(p);}
  function appendOption(select,value,text) {const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}
  function trackFold(details,key) {
    details.open=sectionLayout.folds[key]!==false;details.foldBaseline=details.open;
    details.addEventListener('toggle',()=>{if(details.isConnected && details.foldBaseline!==details.open){details.foldBaseline=details.open;sectionLayout.folds[key]=details.open;persist();}});
  }
  function categoryLabel(category) {return category?`${category.emoji ? category.emoji+' ' : ''}${category.name}`:'Catégorie';}
  function calendarIsOpen(scope){
    return currentPage==='calendar' && calendarScope===scope;
  }
  document.querySelectorAll('.workspace-command-bar').forEach((bar,index)=>{
    const filters=bar.querySelector('.workspace-quick-filters');
    if(!filters)return;
    const controls=makeElement('div','workspace-filter-controls');
    controls.append(...filters.childNodes);
    filters.append(controls);
    filters.id='workspace-filters-'+index;
    const toggle=makeButton('',()=>{
      const open=bar.toggleAttribute('data-filters-open');
      toggle.setAttribute('aria-expanded',String(open));
    },'workspace-filter-toggle');
    toggle.setAttribute('aria-label','Filtres et affichage');
    toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-controls',filters.id);
    toggle.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2" fill="var(--control)"/><circle cx="15" cy="17" r="2" fill="var(--control)"/></svg>';
    filters.after(toggle);
  });
  function mountCalendarControls(){
    const scopes=[
      ['activities','#activityPeriodControls','#activityDateControls','#activityFormats','#openCalendarActivity','#activitiesHeadingAction'],
      ['goals','#goalPeriodControls','#goalDateControls','#goalFormats','#newGoalButton','#goalsHeadingAction']
    ];
    scopes.forEach(([scope,periodId,dateId,formatsId,actionId,headingId])=>{
      const open=calendarIsOpen(scope);
      const period=$(periodId),date=$(dateId),action=$(actionId),home=$(headingId);
      const homeViews=home.closest('[data-workspace-page]').querySelector('.workspace-view-controls');
      const views=open?$('#calendarViewControls'):homeViews;
      const formats=$(formatsId),homeQuick=homeViews.closest('.workspace-command-bar').querySelector('.workspace-filter-controls');
      if(formats.parentElement!==homeQuick)homeQuick.append(formats);
      if(period.parentElement!==views)views.prepend(period);
      views.classList.add('temporal-picker');
      const granularity=period.querySelector('.temporal-granularity');
      if(granularity)granularity.removeAttribute('open');
      const dateMount=views.querySelector('.workspace-toolbar-date');
      if(date.parentElement!==dateMount)dateMount.append(date);
      const heading=open?$('#calendarHeadingAction'):home;
      if(action.parentElement!==heading)heading.append(action);
      period.querySelector('[data-calendar-view=life],[data-goal-view=life]').hidden=!open;
    });
    syncCalendarPanels();
    const quickChoices=document.querySelector('[data-workspace-page="'+currentPage+'"] .workspace-quick-choices');
    if(quickChoices && quickCatalogPicker.root.parentElement!==quickChoices){
      quickChoices.append(quickCatalogPicker.root,quickFrequencyPicker.root,quickStatusPicker.root,filterReset);
    }
    const scopeSwitch=$('#calendarScopes');
    syncSegmentedSwitch(scopeSwitch,'calendarScope',calendarScope);
  }
  document.querySelectorAll('[data-calendar-scope]').forEach(button=>button.addEventListener('click',()=>{
    if(calendarScope===button.dataset.calendarScope)return;
    activeDatePicker?.close();
    calendarScope=button.dataset.calendarScope;
    mountCalendarControls();
    render();
  }));
  const navigationInputs=[...document.querySelectorAll('[data-navigation-tab]')];
  function normalizeNavigationTabs(value){
    const tabs={day:value?.day!==false,calendar:value?.calendar!==false,dashboard:value?.dashboard===true,
      activities:value?.activities===true,goals:value?.goals===true,statistics:value?.statistics!==false};
    if(!Object.values(tabs).some(Boolean))tabs.day=true;
    return tabs;
  }
  let navigationTabs=normalizeNavigationTabs();
  const mainNavigation=$('#mainNavigation'),mobileNavMenu=$('#mobileNavMenu'),mobileNavToggle=$('#mobileNavToggle');
  const mobileNavHeader=mobileNavToggle.closest('.topbar');
  const headerBrand=$('#homeBrand'),brandArrow=headerBrand.querySelector('svg');
  for(const button of mainNavigation.children){
    const arrow=brandArrow.cloneNode(true);
    arrow.classList.add('mobile-nav-arrow');
    arrow.setAttribute('aria-hidden','true');
    button.append(arrow);
  }
  function sizeMobileNavigation(){
    if(!mobileNavHeader.hasAttribute('data-mobile-nav-open'))return;
    const bottom=mobileNavHeader.getBoundingClientRect().bottom;
    mobileNavMenu.style.setProperty('--mobile-menu-top',Math.max(0,bottom)+'px');
  }
  function syncHeaderNavigation(){
    if(mobileNavHeader.hasAttribute('data-mobile-nav-open')){
      sizeMobileNavigation();
      return;
    }
    const width=mobileNavHeader.clientWidth;
    const actions=mobileNavHeader.querySelector('.header-actions');
    if(width>800){
      if(mainNavigation.parentElement===mobileNavMenu)actions.before(mainNavigation);
      mobileNavHeader.removeAttribute('data-nav-collapsed');
    }
    const navStyle=getComputedStyle(mainNavigation);
    const visibleButtons=[...mainNavigation.children].filter(button=>!button.hidden);
    const navWidth=visibleButtons.reduce((total,button)=>total+button.getBoundingClientRect().width,0)+
      Math.max(0,visibleButtons.length-1)*parseFloat(navStyle.gap||0);
    const required=headerBrand.getBoundingClientRect().width+navWidth+actions.getBoundingClientRect().width+64;
    mobileNavHeader.toggleAttribute('data-nav-collapsed',width<=800 || required>width);
  }
  window.addEventListener('resize',syncHeaderNavigation);
  window.visualViewport?.addEventListener('resize',sizeMobileNavigation);
  if(typeof ResizeObserver==='function'){
    const headerResizeObserver=new ResizeObserver(syncHeaderNavigation);
    [mobileNavHeader,mainNavigation,headerBrand,mobileNavHeader.querySelector('.header-actions')].forEach(element=>headerResizeObserver.observe(element));
  }
  new MutationObserver(syncHeaderNavigation).observe(mainNavigation,{subtree:true,attributes:true,attributeFilter:['hidden']});
  function setMobileNavigation(open,returnFocus=false){
    if(open===mobileNavHeader.hasAttribute('data-mobile-nav-open'))return;
    if(open){
      setAccountMenu(false);
      if(mainNavigation.parentElement!==mobileNavMenu)mobileNavMenu.append(mainNavigation);
    }else if(!mobileNavHeader.hasAttribute('data-nav-collapsed') && mainNavigation.parentElement===mobileNavMenu){
      mobileNavHeader.insertBefore(mainNavigation,mobileNavHeader.querySelector('.year-nav'));
    }
    mobileNavHeader.toggleAttribute('data-mobile-nav-open',open);
    if(open)sizeMobileNavigation();
    mobileNavMenu.toggleAttribute('inert',!open);
    mobileNavToggle.setAttribute('aria-expanded',String(open));
    mobileNavToggle.setAttribute('aria-label',open?'Fermer la navigation':'Ouvrir la navigation');
    if(returnFocus)mobileNavToggle.focus({preventScroll:true});
  }
  syncHeaderNavigation();
  mobileNavToggle.addEventListener('click',()=>{
    const open=mobileNavToggle.getAttribute('aria-expanded')==='true';
    setMobileNavigation(!open,open);
  });
  document.addEventListener('click',event=>{
    if(event.target.closest('#mobileNavMenu,#mobileNavToggle'))return;
    setMobileNavigation(false,mobileNavMenu.contains(document.activeElement));
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape' && mobileNavHeader.hasAttribute('data-mobile-nav-open')){
      event.preventDefault();setMobileNavigation(false,true);
    }
  });
  mobileNavHeader.addEventListener('focusout',event=>{
    if(event.relatedTarget && !mobileNavHeader.contains(event.relatedTarget))setMobileNavigation(false);
  });
  matchMedia('(max-width: 800px)').addEventListener?.('change',event=>{
    if(event.matches)return;
    setMobileNavigation(false);
    mobileNavToggle.closest('.header-actions').before(mainNavigation);
    updateSegmentIndicator(mainNavigation);
  });
  function applyNavigationTabs(){
    const onlyOne=Object.values(navigationTabs).filter(Boolean).length===1;
    for(const input of navigationInputs){
      const page=input.dataset.navigationTab;
      input.checked=navigationTabs[page];
      input.disabled=onlyOne && input.checked;
      mainNavigation.querySelector('[data-page="'+page+'"]').hidden=!input.checked;
    }
    $('#lastVisiblePage').hidden=!onlyOne;
    updateNavigationDescriptions();
    updateSegmentIndicator(mainNavigation);
    syncNavigationReset();
  }
  function syncNavigationReset(){
    const defaults=normalizeNavigationTabs();
    $('#resetNavigationTabs').disabled=Object.keys(defaults).every(key=>navigationTabs[key]===defaults[key]);
    $('#resetNavigation').disabled=$('#resetNavigationTabs').disabled && $('#resetNavigationFilters').disabled && $('#resetDashboardSectionOrder').disabled;
  }
  function resetNavigationFilters(){
    if(!shareWorkspaceFilters && workspaceFilterPages.includes(currentPage)){
      sharedFilters=normalizeWorkspaceFilters(pageFilter(currentPage));
    }
    shareWorkspaceFilters=true;rememberWorkspaceFilters=false;
    shareWorkspaceDates=false;rememberWorkspaceDates=false;sharedTemporalView=null;
    stickyHeader=false;stickyWorkspaceControls=false;
    renderNavigationSettings();
  }
  function resetNavigationTabs(){
    navigationTabs=normalizeNavigationTabs();applyNavigationTabs();
  }
  function commitNavigationReset(){
    if(navigationTabs[currentPage]===false)setPage(currentPage);
    else render();
  }
  $('#resetNavigationFilters').addEventListener('click',()=>{resetNavigationFilters();render();});
  $('#resetNavigationTabs').addEventListener('click',()=>{resetNavigationTabs();commitNavigationReset();});
  $('#resetNavigation').addEventListener('click',()=>confirmPreferencesReset('Réinitialiser l’affichage ?',()=>{
    resetNavigationFilters();resetNavigationTabs();resetDashboardSectionOrder();commitNavigationReset();
  }));
  $('#resetAllPreferences').addEventListener('click',()=>confirmPreferencesReset('Réinitialiser tous les réglages ?',()=>{
    resetViewSettings();resetNavigationFilters();resetNavigationTabs();resetDashboardSectionOrder();resetAppearanceSettings();
    updateAppearance();
    commitNavigationReset();
  }));
  navigationInputs.forEach(input=>input.addEventListener('change',()=>{
    if(input.disabled){input.checked=true;return;}
    navigationTabs[input.dataset.navigationTab]=input.checked;
    applyNavigationTabs();
    if(navigationTabs[currentPage]===false)setPage(currentPage);
    else persist();
  }));
  let pageTitleMotion;
  function animatePageTitle(previous,page){
    pageTitleMotion?.();
    const tabs=[...$('#mainNavigation').children].map(button=>button.dataset.page);
    const from=tabs.indexOf(previous),to=tabs.indexOf(page);
    if(from<0 || to<0 || matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const oldTitle=document.querySelector('[data-workspace-page="'+previous+'"] h1');
    const title=document.querySelector('[data-workspace-page="'+page+'"] h1');
    if(!oldTitle || !title?.animate)return;
    const direction=to>from?1:-1;
    const incoming=makeElement('span','page-title-incoming',title.textContent);
    const outgoing=makeElement('span','page-title-outgoing',oldTitle.textContent);
    outgoing.setAttribute('aria-hidden','true');
    title.replaceChildren(incoming,outgoing);
    title.classList.add('page-title-animated');
    const options={duration:220,easing:'cubic-bezier(.2,.7,.25,1)',fill:'both'};
    const enter=incoming.animate([{opacity:0,transform:'translate3d('+(direction*24)+'px,0,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],options);
    const exit=outgoing.animate([{opacity:1,transform:'translate3d(0,0,0)'},{opacity:0,transform:'translate3d('+(-direction*24)+'px,0,0)'}],options);
    const finish=()=>{
      if(pageTitleMotion!==finish)return;
      title.replaceChildren(incoming.textContent);
      title.classList.remove('page-title-animated');
      pageTitleMotion=null;
      enter.cancel();exit.cancel();
    };
    pageTitleMotion=finish;
    return enter.finished.then(finish,finish);
  }
  function setPage(page, scroll = true, fromShortcut = false) {
    const hiddenPage=!fromShortcut && navigationTabs[page]===false?page:null;
    if(hiddenPage)page=navigationTabs.calendar?'calendar':Object.keys(navigationTabs).find(tab=>navigationTabs[tab]);
    if(page==='day' && scroll){
      if(!shareWorkspaceDates && !rememberWorkspaceDates)agendaDate=localDateKey(new Date());
      $('#dailyActivityFeedback').textContent='';
    }
    const previousPage=currentPage;
    const changedPage=previousPage!==page;
    if(changedPage){
      hideCalendarPreview();activeDatePicker?.close();
      if(previousPage==='dashboard')dashboardPlacement?.abort();
      if(previousPage==='day')agendaPlacement?.abort();
    }
    if(page==='calendar' && (hiddenPage==='goals' || hiddenPage==='activities')){
      calendarScope=hiddenPage;
      Object.assign(calendarState,{
        date:hiddenPage==='goals'?goalReference || calendarState.date:focusDate,
        period:'day'
      });
    }
    if(!fromShortcut && changedPage)applySharedTemporalView(page);
    currentPage=page;
    document.querySelectorAll('[data-workspace-page]').forEach(section=>{section.hidden=section.dataset.workspacePage!==page;});
    if(page==='components' && !$('#referenceStatsGraphs').childElementCount)renderReferenceStatsGraphs('week');
    document.querySelectorAll(':is(.page-nav,.account-menu) [data-page]').forEach(button=>{if(button.dataset.page===page)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
    updateSegmentIndicator($('#mainNavigation'));
    if(changedPage || scroll)setAccountMenu(false);
    mountCalendarControls();
    syncQuickFilters();
    if(scroll && (changedPage || hiddenPage) && ['calendar','activities','goals'].includes(page)){renderCalendar();renderGoals();}
    if(page==='profile')renderProfile();
    if(page==='catalog' && changedPage){openCatalogCategories.clear();trackingCatalogSnapshot='';}
    renderWorkspace();
    persist();
    if(scroll){
      const instant=page==='statistics' || matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({top:0,behavior:instant?'instant':'smooth'});
    }
    const titleAnimation=changedPage && scroll && animatePageTitle(previousPage,page);
    if(page==='statistics'){
      if(titleAnimation){
        updateStatsPeriod();
        const revision=++statisticsRenderRevision;
        const draw=()=>{
          if(currentPage==='statistics' && revision===statisticsRenderRevision)renderStatistics();
        };
        // Present the settled title before the statistics build its next frame.
        titleAnimation.then(()=>{
          if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>requestAnimationFrame(draw));
          else draw();
        });
      }else renderStatistics();
    }
  }
  document.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>{
    const fromDropdown=button.closest('.account-menu,#mobileNavMenu');
    setMobileNavigation(false);
    setPage(button.dataset.page);
    if(fromDropdown){
      const heading=document.querySelector('[data-workspace-page="'+button.dataset.page+'"] h1');
      if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
    }
  }));
  function exportInterface(forStorage=false) {
    return {sectionLayout,defaultViews,navigationTabs,favoriteStarStyle,goalAppearance,compactGoalTiles,activityAppearance,gradientButtons,useExceededColor,useUnderLimitColor,showStreakFlames,streakFlameStyle,streakFlameFinish,streakTiers,streakPaletteVersion:2,dashboardPins,
      shareWorkspaceFilters,rememberWorkspaceFilters,stickyHeader,stickyWorkspaceControls,statsFavorites,
      shareWorkspaceDates,rememberWorkspaceDates,
      sharedTemporalView:!forStorage || (shareWorkspaceDates && rememberWorkspaceDates)?sharedTemporalView:null,
      ...(!forStorage || rememberWorkspaceDates?{focusDate,goalReference,goalDatePeriod,calendarView,statsDate}:{}),
      sharedFilters:!forStorage || (shareWorkspaceFilters && rememberWorkspaceFilters)?normalizeWorkspaceFilters(sharedFilters || {}):null,
      statsFilters:!forStorage?normalizeWorkspaceFilters(statsFilters):null,statsPeriod,
      page:currentPage,birthDate,birthDateRecordedOn,...(onboardingStatus?{onboarding:onboardingStatus}:{}),
      ...(!forStorage?{activityFormat,goalFormat}:{}),
      calendarScope:forStorage?'activities':calendarScope,
      agendaDate,agendaView,
      calendar:{
        dayFormats:calendarState.dayFormats,date:calendarState.date,period:calendarState.period,
        ...normalizeWorkspaceFilters(forStorage?{}:calendarState)
      },
      activityExtraFilter:!forStorage?activityExtraFilter:null,
      goalCategoryFilter:!forStorage?goalCategoryFilter:null,goalCategoryIds:!forStorage?goalCategoryIds:null,goalStatusFilter:!forStorage?goalStatusFilter:'all',
      goalActivityFilter:!forStorage?goalActivityFilter:null,goalFrequencyFilter:!forStorage?goalFrequencyFilter:[],
      };
  }
  let onboardingStatus=null,birthDate=null,birthDateRecordedOn=null;
  function normalizeBirthDate(value){
    if(typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value<'1000-01-01' || value>localDateKey(new Date()))return null;
    const date=new Date(value+'T12:00:00');
    return !Number.isNaN(date.getTime()) && localDateKey(date)===value?value:null;
  }
  function restoreInterface(value) {
    restoreAppearanceSettings(value);
    birthDate=normalizeBirthDate(value.birthDate);
    birthDateRecordedOn=birthDate?normalizeBirthDate(value.birthDateRecordedOn):null;
    navigationTabs=normalizeNavigationTabs(value.navigationTabs);applyNavigationTabs();
    onboardingStatus=['pending','dismissed','complete'].includes(value.onboarding)?value.onboarding:null;
    const date=(input,fallback)=>/^\d{4}-\d{2}-\d{2}$/.test(input || '')?input:fallback;
    defaultViews=normalizeDefaultViews(value.defaultViews);
    shareWorkspaceFilters=value.shareWorkspaceFilters!==false;
    rememberWorkspaceFilters=value.rememberWorkspaceFilters===true;
    shareWorkspaceDates=value.shareWorkspaceDates===true;
    rememberWorkspaceDates=value.rememberWorkspaceDates===true;
    const temporal=value.sharedTemporalView;
    sharedTemporalView=shareWorkspaceDates && validGoalDate(temporal?.date)
      ?{date:temporal.date,period:calendarPeriods.includes(temporal.period)?temporal.period:null}:null;
    statsDate=validGoalDate(value.statsDate)?value.statsDate:null;
    statsFilters=normalizeWorkspaceFilters(value.statsFilters || {});
    statsPeriod=calendarPeriods.includes(value.statsPeriod)?value.statsPeriod:'year';
    statsFavorites=normalizeStatsFavorites(value.statsFavorites);
    dashboardPins=normalizeDashboardPins(value.dashboardPins);
    stickyHeader=value.stickyHeader===true;
    stickyWorkspaceControls=value.stickyWorkspaceControls===true;
    renderNavigationSettings();
    activityFormat=validFormat(value.activityFormat,defaultViews.activities.format);
    goalFormat=validFormat(value.goalFormat,defaultViews.goals.format);
    const layout=value.sectionLayout;sectionLayout={folds:layout?.folds && typeof layout.folds==='object' && !Array.isArray(layout.folds)?{...layout.folds}:{},orders:layout?.orders && typeof layout.orders==='object' && !Array.isArray(layout.orders)?Object.fromEntries(Object.entries(layout.orders).filter(([,ids])=>Array.isArray(ids)).map(([key,ids])=>[key,ids.filter(id=>typeof id==='string')])):{}};
    renderDashboardSectionSettings();
    // Preserve the arrangement selected by the former priority setting.
    if(['min','max'].includes(value.goalPriority)){
      const suffix='-'+value.goalPriority;
      for(const [key,slots] of Object.entries(sectionLayout.orders)){
        if(key.startsWith('dailyGoalSlots') && key.endsWith(suffix)){
          sectionLayout.orders[key.slice(0,-suffix.length)]??=slots;
        }
      }
    }
    calendarView=calendarPeriods.includes(value.calendarView)?value.calendarView:defaultViews.activities.period;
    goalDatePeriod=calendarPeriods.includes(value.goalDatePeriod)?value.goalDatePeriod:null;
    agendaView='day';
    focusDate=date(value.focusDate,localDateKey(new Date()));agendaDate=date(value.agendaDate,localDateKey(new Date()));goalReference=date(value.goalReference,'');
    if(rememberWorkspaceDates && validGoalDate(value.focusDate))state.year=Number(value.focusDate.slice(0,4));
    activityExtraFilter=value.activityExtraFilter?normalizedFilter('activities',value.activityExtraFilter):null;
    goalCategoryIds=Array.isArray(value.goalCategoryIds)?value.goalCategoryIds:null;
    goalCategoryFilter=value.goalCategoryFilter || null;goalActivityFilter=Array.isArray(value.goalActivityFilter)?value.goalActivityFilter:null;goalStatusFilter=goalFilterStatuses.some(([id])=>id===value.goalStatusFilter)?value.goalStatusFilter:'all';
    goalFrequencyFilter=normalizeGoalFrequencies(value.goalFrequencyFilter);
    if(preferencesDialog.open)renderDefaultViewSettings();
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
      ?{date:goalReference,period:value.historyView,categoryId:goalCategoryFilter,categoryIds:goalCategoryIds,activityIds:goalActivityFilter,status:goalStatusFilter}
      :{date:calendarDateForYear(),period:calendarView,categoryId:state.activeCategory,activityIds:state.activeCategory==='overview'?null:state.selectedActivities};
    // Before the scopes shared state, the selected scope supplied the calendar settings.
    const calendar=value.calendar ?? legacyCalendar;
    calendarState={date:date(calendar.date,localDateKey(new Date())),dayFormats:normalizeCalendarDayFormats(calendar.dayFormats),
      period:calendar.period==='life' || calendarPeriods.includes(calendar.period)?calendar.period:defaultViews.activities.period,
      ...normalizeWorkspaceFilters(calendar)};
    sharedFilters=normalizeWorkspaceFilters(
      Object.hasOwn(value,'sharedFilters')?value.sharedFilters || {}:pageFilter(page)
    );
    setPage(['calendar','activities','day','dashboard','goals','profile','statistics','components','catalog'].includes(page)?page:'day',false);
  }
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
    rememberTemporalSelection(date,period);
    render();
  }
  const lifeActivityButton=makeButton('Centenaire',()=>{if(calendarIsOpen('activities'))setActivityView(activityReference(),'life');});
  lifeActivityButton.dataset.calendarView='life';$('#activityViews').append(lifeActivityButton);
  document.querySelectorAll('[data-calendar-view]:not([data-calendar-view=life])').forEach(button=>button.addEventListener('click',()=>setActivityView(activityReference(),button.dataset.calendarView)));
  function navigateCalendar(direction) {setActivityView(shiftDate(activityReference(),activityPeriod(),direction),activityPeriod());}
  $('#previousPeriod').addEventListener('click',()=>navigateCalendar(-1));
  $('#nextPeriod').addEventListener('click',()=>navigateCalendar(1));
  $('#todayPeriod').addEventListener('click',()=>setActivityView(localDateKey(new Date()),activityPeriod()));
  document.querySelectorAll('[data-agenda-view]').forEach(button=>button.addEventListener('click',()=>{agendaView=button.dataset.agendaView;renderWorkspace();persist();}));
  function setAgendaDate(date){
    if(!date)return;
    agendaDate=date;agendaView='day';
    rememberTemporalSelection(date);
    renderWorkspace();persist();
  }
  $('#agendaDate').addEventListener('change',event=>setAgendaDate(event.target.value));
  $('#agendaPrevious').addEventListener('click',()=>setAgendaDate(shiftDate(agendaDate,agendaView,-1)));
  $('#agendaNext').addEventListener('click',()=>setAgendaDate(shiftDate(agendaDate,agendaView,1)));
  $('#agendaToday').addEventListener('click',()=>setAgendaDate(localDateKey(new Date())));
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

  function createMultiSelect(label,allLabel,apply,{single=false,grouped=false,showDefault=false}={}){
    const root=makeElement('div','multi-select');
    const trigger=makeButton('',open,'multi-select-trigger date-control');
    const caption=makeElement('span',null,label);
    trigger.append(caption);
    const panel=makeElement('div','multi-select-panel date-picker');
    panel.id='multiSelect-'+(++datePickerId);
    panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label',label);
    trigger.setAttribute('aria-controls',panel.id);
    trigger.setAttribute('aria-haspopup','dialog');
    trigger.setAttribute('aria-expanded','false');
    const topLayer=typeof panel.showPopover==='function';
    if(topLayer)panel.setAttribute('popover','manual');
    const search=makeElement('input');search.type='search';
    search.placeholder='Rechercher…';search.setAttribute('aria-label','Rechercher · '+label);
    const options=makeElement('div','multi-select-options');
    options.setAttribute('role','group');options.setAttribute('aria-label',label);
    panel.append(search,options);root.append(trigger,panel);
    let items=[],selected=null;
    const normalize=value=>value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase().trim();
    function renderOptions(){
      const focused=options.contains(document.activeElement)?document.activeElement.dataset.choice:null;
      const term=normalize(search.value);
      options.replaceChildren();
      const actions=[[null,allLabel],...items.filter(item=>normalize(item[1]+' '+(item[2] || '')).includes(term))];
      if(grouped && term){
        const matched=new Set(actions.map(([id])=>id));
        const parents=new Set(actions.map(item=>item[4]).filter(Boolean));
        actions.splice(1,actions.length,...items.filter(([id])=>matched.has(id) || parents.has(id)));
      }
      const selectedIds=new Set(selected);
      actions.forEach(([id,text,detail,kind])=>{
        const checked=id===null?selected===null:selectedIds.has(id);
        const option=filterChip('',checked,()=>{
          if(single){close(true);apply(id===null?null:[id]);return;}
          if(grouped){apply(id,kind);return;}
          if(id===null){apply(null);return;}
          const next=selected || [];
          const toggled=checked?next.filter(value=>value!==id):[...next,id];
          apply(toggled.length?toggled:null);
        });
        option.dataset.choice=id ?? '';
        if(kind)option.dataset.choiceKind=kind;
        const content=makeElement('span',null,text);
        if(detail && !grouped)content.append(makeElement('small',null,detail));
        option.append(content,makeElement('span','multi-select-check',checked?'✓':''));
        option.lastElementChild.setAttribute('aria-hidden','true');
        options.append(option);
      });
      if(term && actions.length===1)options.append(makeElement('p','muted','Aucun résultat'));
      if(focused!==null)[...options.querySelectorAll('button')].find(option=>option.dataset.choice===focused)?.focus({preventScroll:true});
    }
    function position(){
      const anchor=trigger.getBoundingClientRect(),gap=7;
      if(!anchor.width && !anchor.height && topLayer){close();return;}
      const width=document.documentElement.clientWidth || window.innerWidth;
      const height=document.documentElement.clientHeight || window.innerHeight;
      panel.style.maxHeight='';
      const below=height-anchor.bottom-gap*2,above=anchor.top-gap*2;
      const up=panel.offsetHeight>below && above>below;
      panel.style.maxHeight=Math.max(0,up?above:below)+'px';
      panel.style.left=Math.max(gap,Math.min(anchor.left,width-panel.offsetWidth-gap))+'px';
      panel.style.top=(up?anchor.top-gap-panel.offsetHeight:anchor.bottom+gap)+'px';
    }
    function close(returnFocus=false){
      if(topLayer && panel.matches(':popover-open'))panel.hidePopover();
      panel.hidden=true;trigger.setAttribute('aria-expanded','false');
      if(activeDatePicker?.trigger===trigger)activeDatePicker=null;
      if(returnFocus)trigger.focus({preventScroll:true});
    }
    function open(){
      if(!panel.hidden){close();return;}
      activeDatePicker?.close();hideCalendarPreview();
      search.value='';renderOptions();
      panel.hidden=false;if(topLayer)panel.showPopover();
      activeDatePicker={trigger,panel,close,position};
      trigger.setAttribute('aria-expanded','true');position();
      search.focus({preventScroll:true});
    }
    search.addEventListener('input',()=>{renderOptions();position();});
    panel.addEventListener('keydown',event=>{
      const buttons=[...options.querySelectorAll('button')],index=buttons.indexOf(event.target);
      if(event.key!=='ArrowDown' && event.key!=='ArrowUp')return;
      event.preventDefault();
      (event.key==='ArrowDown'?buttons[Math.min(buttons.length-1,index+1)]:buttons[index-1] || search)?.focus();
    });
    return {root,update(choices,values){
      items=choices;selected=values;
      trigger.toggleAttribute('data-filter-active',selected!==null);
      const selection=new Set(selected);
      const visible=grouped && selected?items.filter(([id,,,,parent])=>selection.has(id) && !selection.has(parent)).map(([id])=>id):selected;
      const first=items.find(([id])=>id===visible?.[0])?.[1];
      caption.textContent=visible===null?(showDefault?allLabel:label):visible.length===1 && first?first:label+' ('+visible.length+')';
      trigger.setAttribute('aria-label',label+' · '+(selected===null?allLabel:caption.textContent));
      if(grouped && visible?.length){
        const names=new Map(items.map(([id,name])=>[id,name]));
        caption.replaceChildren(...visible.slice(0,2).map(id=>makeElement('span','catalog-filter-label',names.get(id))));
        if(visible.length>2)caption.append(makeElement('span','catalog-filter-label','+'+(visible.length-2)));
      }
      if(!panel.hidden){renderOptions();position();}
    }};
  }
  function pageFilter(page){
    if(page==='calendar')return calendarState;
    if(page==='goals')return {categoryId:goalCategoryFilter,categoryIds:goalCategoryIds,activityIds:goalActivityFilter,status:goalStatusFilter,frequencies:goalFrequencyFilter};
    if(page==='activities')return activityExtraFilter || {
      categoryId:state.activeCategory==='overview'?null:state.activeCategory,
      activityIds:state.activeCategory==='overview'?null:state.selectedActivities
    };
    if(page==='statistics')return statsFilters;
    return {};
  }
  function activeQuickFilter(page=currentPage){
    return normalizeWorkspaceFilters(shareWorkspaceFilters && sharedFilters?sharedFilters:pageFilter(page));
  }
  function applyPageFilter(page,filter){
    if(page==='calendar')Object.assign(calendarState,normalizeWorkspaceFilters(filter));
    if(page==='goals')applyGoalFilter(filter);
    if(page==='activities')applyActivityFilter(filter);
    if(page==='statistics')statsFilters=normalizeWorkspaceFilters(filter);
  }
  function applyQuickFilter(filter){
    if(shareWorkspaceFilters)sharedFilters=normalizeWorkspaceFilters(filter);
    else applyPageFilter(currentPage,filter);
    render();
  }
  const filterReset=$('#workspaceFilterReset');
  const filterResetCount=filterReset.querySelector('.filter-reset-count');
  filterReset.addEventListener('click',()=>{
    if(filterReset.disabled)return;
    activeDatePicker?.close();
    if(document.activeElement===filterReset)quickCatalogPicker.root.querySelector('button').focus({preventScroll:true});
    applyQuickFilter({});
    animateFilterReset(filterReset);
  });
  function syncQuickFilters(){
    if(!workspaceFilterPages.includes(currentPage))return;
    const filter=activeQuickFilter();
    const showGoalFilters=currentPage==='goals' || calendarIsOpen('goals');
    syncShortcutStar();
    const {choices,selected}=catalogFilterChoices(filter);
    quickCatalogPicker.update(choices,selected);
    quickFrequencyPicker.root.hidden=quickStatusPicker.root.hidden=!showGoalFilters;
    quickFrequencyPicker.update(goalFrequencyOptions,filter.frequencies.length?filter.frequencies:null);
    quickStatusPicker.update(goalFilterStatuses.slice(1),filter.status==='all'?null:[filter.status]);
    const count=[selected!==null,filter.status!=='all',filter.frequencies.length>0].filter(Boolean).length;
    filterReset.disabled=count===0;
    filterResetCount.textContent=String(count);
    const label='Réinitialiser les filtres · '+count+(count>1?' filtres actifs':' filtre actif');
    filterReset.setAttribute('aria-label',label);
    filterReset.title=label;
  }
  function catalogFilterChoices(filter){
    const choices=[],selected=[],ids=filterCategoryIds(filter);
    const activities=filter.activityIds===null?null:new Set(filter.activityIds);
    const unrestricted=!ids.length && activities===null;
    const grouped=new Map(categories.map(category=>[category.id,[]]));
    for(const activity of state.activities)grouped.get(activity.categoryId)?.push(activity);
    for(const category of categories){
      const children=grouped.get(category.id);
      const parent='category:'+category.id;
      const inScope=!ids.length || ids.includes(category.id);
      choices.push([parent,categoryLabel(category),null,'category']);
      if(!unrestricted && ids.includes(category.id) && children.every(activity=>!activities || activities.has(activity.id)))selected.push(parent);
      for(const activity of children){
        const key='activity:'+activity.id;
        choices.push([key,activity.name,category.name,'activity',parent]);
        if(!unrestricted && inScope && (!activities || activities.has(activity.id)))selected.push(key);
      }
    }
    return {choices,selected:unrestricted?null:selected};
  }
  const quickCatalogPicker=createMultiSelect('Catégories et activités','Toutes les catégories et activités',(key,kind)=>{
    const filter=activeQuickFilter();
    const {choices,selected}=catalogFilterChoices(filter);
    const next=new Set(selected || []);
    if(key===null)next.clear();
    else if(kind==='category'){
      const enabled=!next.has(key);
      for(const [id,,,,parent] of choices){
        if(id===key || parent===key){
          if(enabled)next.add(id);
          else next.delete(id);
        }
      }
    }else if(next.has(key)){
      next.delete(key);
      next.delete(choices.find(([id])=>id===key)[4]);
    }else next.add(key);
    const categoryIds=choices.filter(([id,,,type])=>type==='category' && next.has(id)).map(([id])=>id.slice(9));
    const explicit=choices.filter(([id,,,type,parent])=>type==='activity' && next.has(id) && !next.has(parent));
    const mixedCategoryIds=explicit.length && categoryIds.length?
      [...new Set([...categoryIds,...explicit.map(item=>item[4].slice(9))])]:categoryIds;
    const activityIds=explicit.length?choices.filter(([id,,,type])=>type==='activity' && next.has(id)).map(([id])=>id.slice(9)):null;
    applyQuickFilter({...filter,...filterCategoriesPatch(mixedCategoryIds),activityIds});
  },{grouped:true});
  quickCatalogPicker.root.classList.add('catalog-filter-picker');
  const quickFrequencyPicker=createMultiSelect('Fréquences','Toutes les fréquences',ids=>{
    applyQuickFilter({...activeQuickFilter(),frequencies:ids || []});
  });
  const quickStatusPicker=createMultiSelect('Progression','Tous les états',ids=>{
    applyQuickFilter({...activeQuickFilter(),status:ids?.[0] || 'all'});
  },{single:true});

  function bindDatePicker(trigger,input,{optional=false,eventType='change',maxYear=()=>9999,maxDate=()=>null,emptyView}={}){
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
    function pickerFooter(today){
      const footer=makeElement('div','date-picker-footer');
      footer.append(makeButton(period==='year'?'Cette année':period==='month'?'Ce mois-ci':period==='week'?'Cette semaine':'Aujourd’hui',()=>choose(today),'today-button'));
      if(optional)footer.append(makeButton('Effacer la date',()=>choose(''),'text-button'));
      return footer;
    }
    function renderPicker(focusSelector){
      const [year,month]=cursor.split('-').map(Number);
      const pageStart=1000+Math.floor((year-1000)/12)*12;
      const step=view==='year'?12:1;
      const unit=view==='year' || view==='month'?'year':'month';
      const title=view==='year'?pageStart+' – '+Math.min(pageStart+11,maxYear()):periodLabel(cursor,unit);
      const heading=makeElement('div','date-picker-heading'),latest=maxDate();
      const navigate=direction=>{
        const button=makeButton('',()=>{
          cursor=shiftDate(cursor,unit,direction*step);
          renderPicker('[data-picker-step="'+direction+'"]');
        },'period-arrow');
        button.innerHTML=catalogIcon('chevron');
        button.dataset.pickerStep=direction;
        button.setAttribute('aria-label',direction<0?'Période précédente':'Période suivante');
        const targetYear=view==='year'?pageStart+direction*step:Number(shiftDate(cursor,unit,direction*step).split('-')[0]);
        const target=shiftDate(cursor,unit,direction*step);
        button.disabled=targetYear<1000 || targetYear>maxYear() ||
          Boolean(latest && view!=='year' && periodBounds(target,unit)[0]>latest);
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
        button.disabled=Boolean(latest && periodBounds(date,view)[0]>latest);
        button.setAttribute('aria-label',label);button.setAttribute('aria-pressed',String(selected));
        if((view==='day' && date===today) || (view==='year' && date.slice(0,4)===today.slice(0,4)))button.setAttribute('aria-current','date');
        grid.append(button);
      };
      if(view==='year'){
        for(let i=0;i<12 && pageStart+i<=maxYear();i++){
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
      panel.replaceChildren(heading,grid,pickerFooter(today));
      const options=[...grid.querySelectorAll('button')];
      const setTabStop=button=>{options.forEach(item=>{item.tabIndex=item===button?0:-1;});};
      const firstChoice=grid.querySelector('[aria-pressed=true]:enabled') || options.find(b=>!b.disabled && !b.classList.contains('adjacent-month'));
      setTabStop(firstChoice);
      grid.addEventListener('keydown',event=>{
        const index=options.indexOf(event.target);
        const directions={ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns};
        if(index<0 || !(event.key in directions))return;
        event.preventDefault();
        const next=options[index+directions[event.key]];
        if(next && !next.disabled){setTabStop(next);next.focus();}
      });
      position();
      const nextFocus=(focusSelector && panel.querySelector(focusSelector+':enabled')) || firstChoice;
      nextFocus?.focus({preventScroll:true});
    }
    function open(){
      if(!panel.hidden){close();return;}
      hideCalendarPreview();
      activeDatePicker?.close();
      period=trigger.dataset.datePeriod || 'day';view=input.value?period:emptyView || period;
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
  function showCenturyRange(trigger){
    const start=birthDate?Number(birthDate.slice(0,4)):null;
    const label=start===null?'100 ans':start+'–'+(start+99);
    trigger.dataset.datePeriod='life';
    if(activeDatePicker?.trigger===trigger)activeDatePicker.close();
    trigger.textContent=label;
    trigger.dataset.compactLabel=label;
    trigger.setAttribute('aria-label',label);
    trigger.removeAttribute('aria-current');
    trigger.removeAttribute('title');
  }
  function setDateControl(trigger,input,date,period='day'){
    if(activeDatePicker?.trigger===trigger && (input.value!==date || trigger.dataset.datePeriod!==period))activeDatePicker.close();
    const dateLabel=date?periodLabel(date,period):'Choisir une date';
    const weekLabel=date && period==='week'?'Semaine '+weekNumber(periodBounds(date,'week')[0]):null;
    const label=weekLabel || dateLabel;
    trigger.textContent=label;trigger.dataset.datePeriod=period;
    const description=weekLabel?weekLabel+' · '+dateLabel:dateLabel;
    trigger.setAttribute('aria-label','Choisir '+datePeriodNames[period]+(date?' · '+description:''));
    if(weekLabel)trigger.title=dateLabel;
    else trigger.removeAttribute('title');
    if(date){
      const [year,month,day]=date.split('-');
      trigger.dataset.compactLabel={year,month:MONTHS[Number(month)-1].slice(0,3)+' '+year.slice(-2),week:weekLabel,day:day+'/'+month}[period];
    }
    const today=localDateKey(new Date());
    if(date && periodBounds(date,period)[0]===periodBounds(today,period)[0])trigger.setAttribute('aria-current','date');
    else trigger.removeAttribute('aria-current');
    input.value=date;
  }
  bindDateNavigation('periodLabel','calendarDateInput');
  bindDateNavigation('agendaDateLabel','agendaDate');
  bindDateNavigation('editActivityDateLabel','editActivityDate');
  bindDateNavigation('goalDateLabel','globalGoalDate');
  function syncBirthDateControl(scope){
    const label=$('#'+scope+'BirthDateLabel');
    setDateControl(label,$('#'+scope+'BirthDate'),birthDate);
    if(scope==='profile' && !birthDate)label.textContent='Renseigner';
    label.setAttribute('aria-label',birthDate?'Modifier la date de naissance · '+label.textContent:'Choisir une date de naissance');
  }
  for(const scope of ['profile','onboarding']){
    const inputId=scope+'BirthDate';
    bindDateNavigation(inputId+'Label',inputId,{
      optional:true,emptyView:'year',maxYear:()=>new Date().getFullYear(),maxDate:()=>localDateKey(new Date())
    });
    $('#'+inputId).addEventListener('change',event=>{
      const next=normalizeBirthDate(event.target.value);
      if(!next)birthDateRecordedOn=null;
      else if(!birthDate)birthDateRecordedOn=localDateKey(new Date());
      birthDate=next;
      syncBirthDateControl('profile');
      if(onboardingDialog.open)renderOnboarding();
      if(currentPage==='profile'){
      renderProfileBadges();
      if(!$('#profilePanelFlames').hidden)renderProfileFlames();
    }
      persist();
    });
  }
  $('#calendarDateInput').addEventListener('change',event=>{
    if(event.target.value)setActivityView(event.target.value,activityPeriod());
  });
  function validFormat(format,fallback) {return ['cards','list'].includes(format)?format:fallback;}
  function addCompactSwitch(group){
    const buttons=[...group.querySelectorAll('button')],select=makeElement('select');
    select.className='workspace-compact-switch';
    select.hidden=true;
    select.setAttribute('aria-label',group.getAttribute('aria-label'));
    buttons.forEach((button,index)=>appendOption(select,String(index),button.textContent.trim()));
    select.addEventListener('change',()=>buttons[select.selectedIndex]?.click());
    const picker=makeElement('details','temporal-granularity');
    const trigger=makeElement('summary','temporal-granularity-trigger','Période');
    trigger.setAttribute('aria-label',select.getAttribute('aria-label') || 'Période');
    const options=makeElement('div','temporal-granularity-options');
    for(const button of buttons){
      const choice=makeButton(button.textContent.trim(),()=>{
        picker.open=false;
        button.click();
        if(picker.isConnected)trigger.focus({preventScroll:true});
      },'temporal-granularity-option');
      options.append(choice);
    }
    picker.append(trigger,options);
    picker.addEventListener('keydown',event=>{
      const choices=[...options.children].filter(choice=>!choice.hidden);
      if(event.key==='Escape' && picker.open){
        event.preventDefault();picker.open=false;trigger.focus();
      }
      if(event.key==='ArrowDown' || event.key==='ArrowUp'){
        event.preventDefault();picker.open=true;
        const index=choices.indexOf(document.activeElement),step=event.key==='ArrowDown'?1:-1;
        choices[index<0?(step===1?0:choices.length-1):(index+step+choices.length)%choices.length]?.focus();
      }
    });
    document.addEventListener('click',event=>{if(!picker.contains(event.target))picker.open=false;});
    picker.addEventListener('focusout',event=>{if(event.relatedTarget && !picker.contains(event.relatedTarget))picker.open=false;});
    group.after(select,picker);
  }

  const calendarDayFormats=$('#calendarDayFormats');
  for(const [format,label,icon] of formatOptions){
    const button=makeButton('',()=>{
      if(calendarState.dayFormats[calendarScope]===format)return;
      calendarState.dayFormats[calendarScope]=format;syncShortcutStar();
      if(calendarIsOpen('goals'))renderGoals();else renderCalendar();
      persist();
    });
    button.dataset.calendarDayFormat=format;
    button.setAttribute('aria-label',label);button.title=label;
    button.append(icon.cloneNode(true));calendarDayFormats.append(button);
  }
  function updateSegmentIndicator(group){
    const selected=group.querySelector('button:is([aria-pressed=true],[aria-current=page]):not([hidden])');
    if(!selected){group.classList.remove('has-segment-indicator');return;}
    if(selected.offsetParent!==group)return;
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
    document.querySelectorAll('#mainNavigation,#calendarScopes,#calendarDayFormats,#activityFormats,#goalFormats,#activityViews,#historyViews,#statsPeriods,#streakFlameStyle,[data-default-view]').forEach(group=>{
      segmentObserver.observe(group);
      for(const button of group.children)segmentObserver.observe(button);
    });
  }
  function syncCompactSwitch(group){
    const select=group.nextElementSibling,buttons=[...group.querySelectorAll('button')];
    buttons.forEach((button,index)=>{select.options[index].hidden=select.options[index].disabled=button.hidden;});
    select.selectedIndex=buttons.findIndex(button=>button.getAttribute('aria-pressed')==='true');
    const picker=select.nextElementSibling;
    const label=select.options[select.selectedIndex]?.textContent || 'Période';
    const trigger=picker.querySelector('summary');
    trigger.textContent=label;
    trigger.setAttribute('aria-label',(select.getAttribute('aria-label') || 'Période')+' · '+label);
    [...picker.querySelectorAll('button')].forEach((choice,index)=>{
      choice.hidden=buttons[index].hidden;
      choice.setAttribute('aria-pressed',String(index===select.selectedIndex));
    });
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
    goalFormat=button.dataset.goalFormat;syncShortcutStar();renderGoals();persist();
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
  function rowLabel(row,primary,secondary,badge){
    const label=document.createElement('th');label.scope='row';
    const name=document.createElement('strong');name.textContent=primary;
    if(badge){
      label.classList.add('goal-label-with-streak');label.append(name,badge);
    }else label.append(name);
    if(secondary){const subtitle=document.createElement('small');subtitle.textContent=secondary;label.append(subtitle);}
    row.append(label);
  }
  const expandedListRows=new Set();
  let listDetailId=0;
  function makeResponsiveListRow(row,key,name,summary){
    const table=row.closest('table');
    const label=row.cells[0];
    table.classList.add('responsive-list-table');
    table.setAttribute('role','table');
    row.setAttribute('role','row');
    label.setAttribute('role','rowheader');
    const detailIds=[];
    for(const cell of [...row.cells].slice(1)){
      cell.setAttribute('role','cell');
      cell.id='list-detail-'+(++listDetailId);
      detailIds.push(cell.id);
      const clip=makeElement('div','mobile-list-clip');
      const content=makeElement('div','mobile-list-content');
      const heading=makeElement('span','mobile-list-caption');
      heading.dataset.label=table.tHead.rows[0].cells[cell.cellIndex].textContent;
      heading.setAttribute('aria-hidden','true');
      const value=makeElement('div','mobile-list-value');
      value.append(...cell.childNodes);
      content.append(heading,value);
      clip.append(content);
      cell.append(clip);
    }
    const toggle=makeButton('',()=>{
      if(expandedListRows.has(key))expandedListRows.delete(key);
      else expandedListRows.add(key);
      sync();
    },'mobile-list-toggle');
    toggle.setAttribute('aria-label','Détails · '+name);
    toggle.setAttribute('aria-controls',detailIds.join(' '));
    toggle.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
    const preview=makeElement('span','mobile-list-summary',summary);
    label.append(preview,toggle);
    function sync(){
      const expanded=expandedListRows.has(key);
      row.toggleAttribute('data-details-open',expanded);
      toggle.setAttribute('aria-expanded',String(expanded));
    }
    label.addEventListener('click',event=>{
      if(event.target.closest('button') || !matchMedia('(max-width:700px)').matches)return;
      event.stopPropagation();
      toggle.click();
    });
    sync();
  }
  function renderGoalTable(root,targets,period,{reference=goalReference,activityIds=goalActivityFilter,view='goals'}={}){
    const body=listTable(root,'Liste des objectifs',['Objectif','Progression','État','Actions']);
    body.closest('table').classList.add('objective-list-table');
    body.dataset.goalPeriod=period;
    const readStreak=goalStreakReader(reference);
    targets.forEach(({item,parent,category,goal,ids})=>{
      const result=goalProgress(ids,goal,reference);
      const row=body.insertRow();row.dataset.goalId=goal.id;row.dataset.tone=result.tone;
      const badge=goalStreakBadge(readStreak(ids,goal,result),goal.period);
      const label='Modifier l’objectif : '+item.name+(badge?' · '+badge.getAttribute('aria-label'):'');
      makeEditableRecord(row,()=>openGoalEditor(item.id,goal.id),label);
      rowLabel(row,category?categoryLabel(item):item.name,[category?null:parent?.name,goalDescription(goal)].filter(Boolean).join(' · '),badge);
      const progress=row.insertCell();progress.className='list-progress';
      const value=document.createElement('span');value.className='list-progress-value';
      value.textContent=measureValue(result.count,goal)+' / '+measureValue(goal.target,goal)+(goal.unit==='count'?'':' '+unitLabel(goal));
      const indicator=createProgress(result,goal,true);
      if(goal.display==='check')indicator.replaceChildren(goalStatusCheck(item,goal,result,ids,reference));
      const progressContent=makeElement('div','list-progress-content');
      progressContent.append(value,indicator);
      progress.append(progressContent);
      animateGoalProgress(indicator,result,goal,goal.id,view,reference);
      const status=document.createElement('span');status.className='list-status';status.dataset.tone=result.tone;status.textContent=result.status;
      row.insertCell().append(status);
      const actions=document.createElement('div');actions.className='list-actions';
      const edit=makeButton('✎',()=>openGoalEditor(item.id,goal.id),'list-action');edit.setAttribute('aria-label','Modifier l’objectif de '+item.name);edit.title=edit.getAttribute('aria-label');
      actions.append(dailyGoalControls(item,goal,result,ids.filter(id=>activityIds===null||activityIds.includes(id)),reference,category,false));
      actions.append(dashboardPinButton(goalDashboardPin(item,goal),item.name),edit);
      row.insertCell().append(actions);
      makeResponsiveListRow(row,JSON.stringify([view,reference,item.id,goal.id]),item.name,value.textContent);
    });
  }
  const statsMetrics={count:'Occurrences',days:'Jours actifs',distance:'Distance',minutes:'Durée'};
  let statsDate=null,statsPeriod='year',statsMetric='count',statisticsRenderRevision=0;
  const statsCalendarDates=new Map();
  const statsPeriods=$('#statsPeriods');
  let expandedStatsCategory=null;
  let dismissStatsCategory;
  document.addEventListener('click',event=>{
    if(!event.target.closest('.stats-category-pie [role=button],.stats-category-row details'))dismissStatsCategory?.();
  });

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
  function statisticTotal(bucket,metric){
    return metric==='days'?bucket.dates.size:bucket[metric];
  }
  function statisticsWindow(reference,period,cutoff){
    const [first,last]=periodBounds(reference,period);
    const through=cutoff<last?cutoff:last;
    const previousReference=shiftDate(first,period,-1);
    const [previousFirst,previousLast]=periodBounds(previousReference,period);
    // Compare the same calendar point for periods still in progress, including short months.
    return {period,first,last,through,previousFirst,previousLast,
      previousThrough:through===last?previousLast:shiftDate(through,period,-1)};
  }
  const statRangeFormat=new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',year:'numeric'});
  const statMonthFormat=new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'});
  function statRangeLabel(first,last){
    const date=value=>{const [year,month,day]=value.split('-').map(Number);return new Date(year,month-1,day,12);};
    const from=date(first),to=date(last);
    return first===last?statRangeFormat.format(from):statRangeFormat.formatRange(from,to);
  }
  const evolutionTitles={year:'Évolution par an',month:'Évolution par mois',week:'Évolution par semaine',day:'Évolution par jour','current-week':'Évolution · Semaine en cours'};
  function statisticsChart(through,period,scope){
    const title=evolutionTitles[period],currentWeek=period==='current-week';
    if(currentWeek)period='day';
    const length={year:5,month:12,week:8,day:7}[period];
    const weekLabels=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
    const current=periodBounds(through,currentWeek?'week':period)[currentWeek?1:0];
    const buckets=new Map();
    for(let offset=length-1;offset>=0;offset--){
      const from=shiftDate(current,period,-offset);
      if(!/^\d{4}-/.test(from))continue;
      const to=periodBounds(from,period)[1];
      const label=currentWeek?weekLabels[length-1-offset]:period==='year'?from.slice(0,4):period==='month'?MONTHS[Number(from.slice(5,7))-1].slice(0,3):from.slice(8,10)+'/'+from.slice(5,7);
      buckets.set(from,{...statTotals(),label,from,to:from<=through && to>through?through:to});
    }
    const earliest=buckets.keys().next().value;
    for(const {activity,dates} of scope.records){
      for(const date of dates){
        if(date<earliest || date>through)continue;
        const bucket=buckets.get(periodBounds(date,period)[0]);
        if(bucket)statSum(bucket,date,state.details[date]?.[activity.id]);
      }
    }
    return {title,buckets,period};
  }
  function activityTrend(metric,total,previous,range){
    const precision=metric==='distance'?10:1;
    const value=Math.round(total*precision),baseline=Math.round(previous*precision);
    if((!value && !baseline) || range.previousFirst.length!==10)return null;
    const difference=value-baseline;
    const days=Math.round((Date.parse(range.last)-Date.parse(range.first))/86400000)+1;
    return {
      tone:difference>0?'up':difference<0?'down':'flat',
      delta:difference?(difference>0?'+':'−')+statValue(metric,Math.abs(difference)/precision):'Stable',
      direction:difference>0?'En hausse':difference<0?'En baisse':'Stable',
      previous:statValue(metric,previous),days,
      comparison:range.previousThrough===range.previousLast && range.period==='year'?range.previousFirst.slice(0,4):
        range.previousThrough===range.previousLast && range.period==='month'?statMonthFormat.format(new Date(range.previousFirst+'T12:00:00')):
        statRangeLabel(range.previousFirst,range.previousThrough)
    };
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
  function activityStatistics(entries,categoryIds,activityIds,range){
    const byActivity=new Map(state.activities.filter(a=>activityIds.has(a.id))
      .map(activity=>[activity.id,{activity,...statTotals(),weeks:new Set()}]));
    const byCategory=new Map(categories.filter(c=>!categoryIds.length || categoryIds.includes(c.id)).map(category=>[category.id,{category,...statTotals(),records:[]}]));
    const total=statTotals(),previous=statTotals(),countsByDate=new Map();
    for(const [date,ids] of entries){
      const selected=date>=range.first && date<=range.through;
      const comparison=date>=range.previousFirst && date<=range.previousThrough;
      if(!selected && !comparison)continue;
      const week=selected?periodBounds(date,'week')[0]:null;
      for(const id of ids){
        const record=byActivity.get(id);if(!record)continue;
        const detail=state.details[date]?.[id];
        if(comparison){statSum(previous,date,detail);continue;}
        statSum(total,date,detail);statSum(record,date,detail);
        const category=byCategory.get(record.activity.categoryId);
        if(category){
          statSum(category,date,detail);
          category.records.push({date,activity:record.activity,detail});
        }
        countsByDate.set(date,(countsByDate.get(date)||0)+(Number(detail?.count)||1));
        record.weeks.add(week);
      }
    }
    const ranked=[...byActivity.values()].filter(item=>item.count).sort((a,b)=>b.count-a.count);
    ranked.forEach(item=>{item.longest=streakLengths(item.weeks,'week',range.through).longest;});
    return {total,previous,ranked,countsByDate,categories:[...byCategory.values()].sort((a,b)=>b.count-a.count)};
  }
  const goalPeriodLabels={day:'Quotidiens',week:'Hebdomadaires',month:'Mensuels',year:'Annuels'};
  function blankGoalStats(){return {met:0,missed:0,open:0};}
  function goalStatistics(targets,firstDay,lastDay,today){
    const total=blankGoalStats(),byPeriod=new Map(Object.keys(goalPeriodLabels).map(period=>[period,blankGoalStats()]));
    const byCategory=new Map(),outcomesByDate=new Map();
    let configured=0;
    const boundsByPeriod=new Map();
    targets.forEach(({goal,counts,parent,item})=>{
      if(goalStartsAfter(goal,lastDay))return;
      if(!boundsByPeriod.has(goal.period)){
        const periods=[];
        let [start,end]=periodBounds(firstDay,goal.period);
        // Assign a finished period to the year in which it ends.
        while(end<=lastDay && start<=today){
          periods.push([start,end]);
          [start,end]=periodBounds(shiftDate(end,'day',1),goal.period);
        }
        boundsByPeriod.set(goal.period,periods);
      }
      const periods=boundsByPeriod.get(goal.period).filter(([,end])=>!goalStartsAfter(goal,end));
      if(!periods.length) return;
      configured++;
      const category=byCategory.get(parent.id) || {category:parent,...blankGoalStats()};
      byCategory.set(parent.id,category);
      for(const [start,end] of periods){
        const result=evaluateGoal(goal,counts.get(start)||0,start,end,today);
        if(result.tone==='future')continue;
        const outcome=end>=today?'open':result.tone==='danger'?'missed':'met';
        total[outcome]++;byPeriod.get(goal.period)[outcome]++;category[outcome]++;
        if(end<=today){
          if(!outcomesByDate.has(end))outcomesByDate.set(end,[]);
          outcomesByDate.get(end).push({...result,goal,name:item.name});
        }
      }
    });
    return {total,byPeriod,byCategory,configured,outcomesByDate};
  }
  const regularityPath='M4 19h16M6 15v-3m4 3V8m4 7V5m4 10v-5';
  const metricIconPaths={
    trendUp:'M5 19 19 5M9 5h10v10',trendDown:'M5 5l14 14M9 19h10V9',trendFlat:'M5 12h14',
    count:'M4 6h16M4 12h16M4 18h10',
    activity:'M3 12h4l3-7 4 14 3-7h4',
    catalog:'M3 7V5h7l2 2h9v12H3zM8 12h8m-8 4h5',
    days:'M4 6h16v14H4zM8 3v5m8-5v5M4 10h16m-12 5h2',
    distance:'M3 15 15 3l6 6L9 21zM12 6l2 2m-6 2 2 2m-6 2 2 2',
    minutes:'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    current:regularityPath,longest:regularityPath,without:regularityPath,
    goals:'M20 11a8 8 0 1 1-7-7m-1 12a4 4 0 1 1 0-8m0 4 8-8m-4 0h4v4'
  };
  function metricIcon(metric){
    const ns='http://www.w3.org/2000/svg';
    const icon=document.createElementNS(ns,'svg'),path=document.createElementNS(ns,'path');
    icon.setAttribute('viewBox','0 0 24 24');
    icon.setAttribute('aria-hidden','true');
    icon.classList.add('metric-icon');
    path.setAttribute('d',metricIconPaths[metric]);
    icon.append(path);
    return icon;
  }
  function statCard(label,value,detail,metric,trend){
    const card=makeElement('div','stats-kpi'),title=makeElement('span','stats-kpi-label',label);
    const trendOnly=Object.hasOwn(trendMetrics,metric);
    const iconMetric=Object.hasOwn(favoriteGoalMetrics,metric)?'goals':trendMetrics[metric]?.[0] || metric;
    if(iconMetric)title.prepend(metricIcon(iconMetric));
    const amount=makeElement('strong',null,value);
    card.append(title,amount);
    if(trend){
      const indicator=trendOnly?amount:makeElement('span','stats-trend',trend.delta);
      indicator.dataset.trend=trend.tone;
      if(trendOnly)indicator.classList.add('stats-trend-value');
      const description=trend.direction+(trend.tone==='flat'?'':' · '+trend.delta);
      indicator.title=description+' · '+trend.previous+' sur la période précédente ('+trend.comparison+')';
      indicator.setAttribute('role','img');
      indicator.setAttribute('aria-label',indicator.title);
      indicator.prepend(metricIcon({up:'trendUp',down:'trendDown',flat:'trendFlat'}[trend.tone]));
      const row=makeElement('div','stats-trend-row');
      if(!trendOnly)row.append(indicator);
      row.append(makeElement('small','stats-trend-baseline','Tendance sur '+trend.days+(trend.days===1?' jour':' jours')));
      card.append(row);
    }
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
  function renderCategoryPie(section,items,total){
    const layout=makeElement('div','stats-category-layout');
    const ns='http://www.w3.org/2000/svg',pie=document.createElementNS(ns,'svg');
    pie.setAttribute('viewBox','0 0 100 100');
    pie.setAttribute('role','group');
    pie.setAttribute('aria-label','Répartition des occurrences par catégorie');
    pie.classList.add('stats-category-pie');
    const list=makeElement('ul','stats-category-list');
    const heading=makeElement('div','stats-category-heading stats-category-summary');
    heading.setAttribute('aria-hidden','true');
    heading.append(makeElement('span'),makeElement('span',null,'Catégorie'),
      makeElement('span',null,'Occurrences'),makeElement('span',null,'Part du total'));
    const breakdown=makeElement('div','stats-category-breakdown');
    breakdown.append(heading,list);
    const chart=makeElement('div','stats-category-chart');
    const ring=makeElement('div','stats-category-ring');
    const percentage=makeElement('strong','stats-category-percentage');
    const digits=makeElement('span');percentage.append(digits);
    const countLabel=makeElement('strong','stats-category-active-count');
    const caption=makeElement('span','stats-category-active-label');
    const readout=makeElement('div','stats-category-readout');readout.setAttribute('aria-live','polite');
    readout.append(countLabel,caption);
    ring.append(pie,percentage);chart.append(ring,readout);
    const controls=[];
    function syncSelection(selected){
      expandedStatsCategory=selected?.category.id || null;
      const value=statNumber.format((selected?selected.count/total:1)*100)+' %';
      const previous=digits.textContent;
      digits.textContent=value;
      if(previous && previous!==value && digits.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches){
        percentage.querySelector('.stats-category-old-percentage')?.remove();
        const outgoing=makeElement('span','stats-category-old-percentage',previous);
        outgoing.setAttribute('aria-hidden','true');percentage.append(outgoing);
        const motion={duration:260,easing:'cubic-bezier(.2,.75,.3,1)'};
        outgoing.animate([{transform:'translateY(0)'},{transform:'translateY(-100%)',opacity:0}],motion).onfinish=()=>outgoing.remove();
        digits.getAnimations?.().forEach(animation=>animation.cancel());
        digits.animate([{transform:'translateY(100%)',opacity:.45},{transform:'translateY(0)',opacity:1}],motion);
      }
      countLabel.textContent=statNumber.format(selected?.count ?? total);
      caption.textContent=selected?categoryLabel(selected.category):'Occurrences sur la période';
      for(const {slice,details,item} of controls){
        const active=item===selected;
        details.open=active;
        slice.setAttribute('aria-expanded',String(active));
      }
    }
    let offset=0;
    const point=share=>[50+43*Math.sin(share*2*Math.PI),50-43*Math.cos(share*2*Math.PI)].join(' ');
    for(const item of items){
      const {category,count}=item;
      const row=statsCategoryRow(item,total);
      list.append(row);
      if(!count)continue;
      const details=row.querySelector('details'),share=count/total;
      const slice=document.createElementNS(ns,count===total?'circle':'path');
      if(count===total){
        slice.setAttribute('cx','50');slice.setAttribute('cy','50');slice.setAttribute('r','43');
      }else{
        const gap=Math.min(.019,share/4);
        slice.setAttribute('d','M '+point(offset+gap)+' A 43 43 0 '+Number(share-2*gap>.5)+' 1 '+point(offset+share-gap));
      }
      slice.setAttribute('fill','none');
      slice.setAttribute('tabindex','0');
      slice.setAttribute('role','button');
      slice.setAttribute('aria-label',categoryLabel(category)+' · '+statNumber.format(share*100)+' %');
      details.id='statsCategoryDetails-'+controls.length;
      slice.setAttribute('aria-controls',details.id);
      slice.setAttribute('aria-expanded',String(details.open));
      const select=()=>syncSelection(details.open?null:item);
      slice.addEventListener('click',select);
      slice.addEventListener('keydown',event=>{
        if(event.key==='Enter' || event.key===' '){event.preventDefault();select();}
      });
      details.querySelector('summary').addEventListener('click',event=>{event.preventDefault();select();});
      details.addEventListener('toggle',()=>{
        if(details.isConnected && details.open!==(expandedStatsCategory===category.id))syncSelection(details.open?item:null);
      });
      controls.push({slice,details,item});
      pie.append(slice);
      offset+=share;
    }
    syncSelection(controls.find(({item})=>item.category.id===expandedStatsCategory)?.item);
    dismissStatsCategory=()=>{if(section.isConnected && expandedStatsCategory)syncSelection(null);};
    layout.append(chart,breakdown);section.append(layout);
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
    details.open=expandedStatsCategory===category.id;
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
      if(details.open && details.childElementCount===1)showRecords();
    });
    return row;
  }
  function selectStatsCalendarCell(id,grid,{button,date}){
    grid.querySelector('[tabindex="0"]')?.setAttribute('tabindex','-1');
    grid.querySelector('[aria-pressed=true]')?.setAttribute('aria-pressed','false');
    statsCalendarDates.set(id,date);
    button.tabIndex=0;button.setAttribute('aria-pressed','true');
  }
  function bindStatsCalendarGrid(id,grid,cells,date,steps){
    const selected=cells.find(cell=>cell.date===statsCalendarDates.get(id)) || cells.find(cell=>cell.date===date) || cells[0];
    selectStatsCalendarCell(id,grid,selected);
    grid.addEventListener('keydown',event=>{
      if(!event.target.matches('.stats-calendar-cell') || !Object.hasOwn(steps,event.key))return;
      event.preventDefault();
      const next=cells[cells.findIndex(({button})=>button===event.target)+steps[event.key]];
      if(!next)return;
      selectStatsCalendarCell(id,grid,next);next.button.focus();showCalendarPreview(next.button);
    });
    bindCalendarPreview(grid,false);
  }

  const goalCalendarTones=[
    ['success','Atteints'],['exceeded','Dépassés'],['warning','Partiels ou à la limite'],
    ['danger','Non atteints ou limites dépassées'],['pending','En cours'],['empty','Sans objectif'],['future','À venir']
  ];
  function legendSwatch(label){
    const swatch=makeElement('span','stats-contribution-swatch');
    swatch.tabIndex=0;swatch.setAttribute('role','img');swatch.setAttribute('aria-label',label);
    swatch.dataset.tooltip=label;
    return swatch;
  }
  function calendarGoalLegend(compact=false){
    const legend=makeElement('ul','calendar-goal-legend calendar-outcome-colors');
    legend.setAttribute('aria-label','États des objectifs');
    legend.classList.toggle('stats-goal-legend-compact',compact);
    for(const [tone,label] of goalCalendarTones){
      const item=makeElement('li',null,compact?undefined:label);
      const swatch=compact?legendSwatch(label):makeElement('span','stats-contribution-swatch');
      swatch.dataset.tone=tone;
      if(!compact)swatch.setAttribute('aria-hidden','true');
      item.prepend(swatch);legend.append(item);
    }
    return legend;
  }
  const statsGraphModes={contributions:'Contribution des activités',heat:'Heatmap des activités',goals:'Objectifs quotidiens'};
  const statsGraphMetrics=Object.fromEntries(Object.entries(statsGraphModes).map(([mode,label])=>['graph-'+mode,label]));
  function renderStatsDayGraph(first,last,today,outcomesByDate,countsByDate,mode,{period=statsPeriod,reference=false,embeddedId}={}){
    const heat=mode==='heat',goalStatus=mode==='goals',horizontal=period==='week'||period==='month';
    const section=makeElement('section','stats-activity-calendar');
    const graph=goalStatus?'DailyGoals':heat?'ActivityHeatmap':'Heatmap';
    section.id=embeddedId || (reference?'referenceStats':'stats')+graph;
    section.dataset.statsGraph=mode;
    section.dataset.period=period;
    if(horizontal)section.classList.add('stats-heatmap-horizontal');
    if(goalStatus)section.classList.add('calendar-outcome-colors');
    if(embeddedId)section.setAttribute('aria-label',statsGraphModes[mode]);
    else{
      const title=makeElement('h2',null,statsGraphModes[mode]);
      title.id=section.id+'Title';
      section.setAttribute('aria-labelledby',title.id);
      section.append(title);
    }
    const frame=makeElement('div','stats-heatmap-frame'),grid=makeElement('div','stats-heatmap-grid');
    grid.setAttribute('role','group');grid.setAttribute('aria-label','Jours de la période');
    const offset=(new Date(first+'T12:00:00').getDay()+6)%7;
    const formatDay=new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const days=[];
    const peak=Math.max(1,...Array.from(countsByDate,([date,count])=>date>=first&&date<=last&&date<=today?count:0));
    if(!horizontal){
      [['Lun',2],['Mer',4],['Ven',6]].forEach(([label,row])=>{
        const day=makeElement('span','stats-heatmap-axis',label);
        day.style.gridRow=row;day.setAttribute('aria-hidden','true');grid.append(day);
      });
    }
    for(let date=first;date<=last;date=shiftDate(date,'day',1)){
      const index=days.length,position=index+offset,column=2+Math.floor(position/7);
      if(!horizontal && date.endsWith('-01')){
        const month=makeElement('span','stats-heatmap-axis',MONTHS[Number(date.slice(5,7))-1].slice(0,3));
        month.style.gridColumn=column;month.style.gridRow=1;month.setAttribute('aria-hidden','true');grid.append(month);
      }
      const outcomes=outcomesByDate.get(date) || [],count=countsByDate.get(date) || 0;
      const rows=goalStatus?outcomes.filter(({goal})=>goal.period==='day'):outcomes;
      let {tone,label}=date>today?{tone:'future',label:'À venir'}:summarizeGoalOutcomes(rows,date===today);
      if(tone==='empty')label='Aucun objectif évalué ce jour';
      if(tone==='danger' && !rows.some(row=>row.goal.mode==='max' && row.tone==='danger') &&
          rows.some(row=>row.goal.mode==='min' && row.count>0)){
        tone='warning';label='Progression partielle · '+label;
      }
      const button=makeButton('',()=>{selectStatsCalendarCell(section.id,grid,days[index]);showCalendarPreview(button);},'stats-calendar-cell '+(goalStatus?'stats-daily-goal':heat?'stats-activity-heatmap-day':'stats-heatmap-day'));
      button.dataset.date=date;button.dataset.previewDate=date;button.tabIndex=-1;
      if(goalStatus)button.dataset.tone=tone;
      else if(date>today)button.dataset.future='true';
      else button.dataset.intensity=count===0?0:Math.max(1,Math.ceil(count/peak*(heat?6:4)));
      if(horizontal){
        const label=makeElement('span','stats-heatmap-axis stats-heatmap-day-label',period==='week'?WEEKDAYS[(new Date(date+'T12:00:00').getDay()+6)%7]:String(Number(date.slice(-2))));
        label.style.gridColumn=index+1;label.style.gridRow=1;label.setAttribute('aria-hidden','true');grid.append(label);
        button.style.gridColumn=index+1;button.style.gridRow=2;
      }else{
        button.style.gridColumn=column;button.style.gridRow=2+position%7;
      }
      const formattedDate=formatDay.format(new Date(date+'T12:00:00'));
      const detail=goalStatus?label:occurrenceLabel(count)+(date>today?' · À venir':'');
      button.setAttribute('aria-label',formattedDate+' · '+detail);
      button.setAttribute('aria-pressed','false');
      goalCalendarPreviews.set(button,()=>({scope:'day',rows,statistics:goalStatus?{label,tone}:{label,tone,count}}));
      grid.append(button);days.push({button,date});
    }
    grid.style.setProperty('--stats-weeks',Math.ceil((days.length+offset)/7));
    if(horizontal)grid.style.setProperty('--stats-days',days.length);
    bindStatsCalendarGrid(section.id,grid,days,today<last?today:last,horizontal?{ArrowLeft:-1,ArrowRight:1,ArrowUp:-1,ArrowDown:1}:{ArrowLeft:-7,ArrowRight:7,ArrowUp:-1,ArrowDown:1});
    frame.append(grid);
    section.append(frame,goalStatus?calendarGoalLegend(true):contributionLegend(heat,peak));
    return section;
  }
  function contributionLegend(thermal=false,peak=null){
    const legend=makeElement('div','stats-contribution-legend');
    legend.setAttribute('aria-label','Intensité des activités enregistrées');
    legend.append(makeElement('span',null,'Moins'));
    const levels=thermal?6:4;
    for(let level=0;level<=levels;level++){
      const min=Math.floor((level-1)*peak/levels)+1,max=Math.floor(level*peak/levels);
      const label=level===0?'0 activité':min>max?'Aucune valeur dans cette tranche':min===max?min+(min===1?' activité':' activités'):min+' à '+max+' activités';
      const sample=peak===null?makeElement('span','stats-contribution-swatch'):legendSwatch(label);
      if(peak===null)sample.setAttribute('aria-hidden','true');
      sample.dataset.intensity=level;
      legend.append(sample);
    }
    legend.append(makeElement('span',null,'Plus'));
    return legend;
  }
  const goalReportMetrics={
    'goal-success-rate':'Taux de réussite',
    'goal-periods-met':'Périodes réussies',
    'goal-periods-missed':'Périodes non réussies',
    'goal-periods-open':'Périodes en cours',
    'goal-by-frequency':'Par fréquence',
    'goal-by-category':'Par catégorie'
  };
  function isGoalBreakdown(metric){
    return metric==='goal-by-frequency' || metric==='goal-by-category';
  }
  function renderGoalReportCard(metric,label,report){
    const {met,missed,open}=report.total,closed=met+missed;
    if(metric==='goal-success-rate'){
      const rate=closed?Math.round(met/closed*100):null;
      const detail=closed?met+' sur '+closed+' périodes réussies ('+rate+' %)':'Aucune période terminée';
      return statCard(label,rate===null?'—':rate+' %',detail,'goals');
    }
    if(isGoalBreakdown(metric)){
      const card=makeElement('div','stats-kpi stats-goal-breakdown-card');
      const title=makeElement('h3','stats-kpi-label',label);
      title.prepend(metricIcon(metric==='goal-by-frequency'?'days':'catalog'));
      const rows=metric==='goal-by-frequency'
        ? [...report.byPeriod].filter(([,value])=>value.met+value.missed+value.open).map(([period,value])=>[goalPeriodLabels[period],value])
        : [...report.byCategory.values()].map(value=>[categoryLabel(value.category),value]);
      card.append(title);
      if(!rows.length){
        card.append(makeElement('small',null,'Aucune période pour cette sélection'));
        return card;
      }
      const list=makeElement('ul','stats-breakdown');
      for(const [name,result] of rows){
        const total=result.met+result.missed;
        const text=total?result.met+' / '+total+' réussies':'Aucune période terminée';
        list.append(statRow(name,text+(result.open?' · '+result.open+' en cours':''),result.met,total,true));
      }
      card.append(list);
      return card;
    }
    const [value,tone,icon]={
      'goal-periods-met':[met,'success','goals'],
      'goal-periods-missed':[missed,'danger','goals'],
      'goal-periods-open':[open,'pending','days']
    }[metric];
    const card=statCard(label,statNumber.format(value),null,icon);
    card.classList.add('stats-goal-counter-tile');
    card.dataset.tone=tone;
    return card;
  }
  function renderStatsGoals(root,result){
    const section=statSection(root,'statsGoals','Objectifs tenus');
    if(!result.configured){appendWorkspaceEmpty(section,statsPeriod==='year'?'Aucun objectif pour cette année':'Aucun objectif pour cette période','Les objectifs apparaissent à partir de leur date de début.');return;}
    const counters=makeElement('div','stats-kpis stats-goal-scores');
    const breakdowns=makeElement('div','stats-kpis stats-goal-breakdowns');
    for(const [metric,label] of Object.entries(goalReportMetrics)){
      const grid=isGoalBreakdown(metric)?breakdowns:counters;
      grid.append(offerStatPin(renderGoalReportCard(metric,label,result),statFavoritePreset(metric,statsPeriod,label)));
    }
    section.append(counters,breakdowns);
  }
  function goalReportForScope(scope,through,period,today){
    scope.goalReports ??= new Map();
    const key=period+'|'+through;
    if(!scope.goalReports.has(key)){
      const [first,last]=periodBounds(through,period),entries=Object.entries(state.entries);
      const targets=filteredGoalTargets(scope.categoryIds,scope.goalActivityIds)
        .filter(({goal})=>!goalStartsAfter(goal,last))
        .map(target=>({...target,counts:goalCountsByPeriod(target.ids,target.goal,today,entries)}));
      scope.goalReports.set(key,goalStatistics(targets,first,last,today));
    }
    return scope.goalReports.get(key);
  }
  const trendMetrics={
    'trend-count':['count','Tendance des occurrences'],
    'trend-distance':['distance','Tendance de la distance'],
    'trend-minutes':['minutes','Tendance de la durée']
  };
  const favoriteGoalMetrics={goals:'Objectifs accomplis','goals-pending':'Objectifs à accomplir'};
  const favoriteMetrics={...statsMetrics,...Object.fromEntries(Object.entries(trendMetrics).map(([key,[,label]])=>[key,label])),current:'Série en cours',longest:'Meilleure série',without:'Jours sans activité',...favoriteGoalMetrics,...goalReportMetrics,evolution:'Évolution',...statsGraphMetrics};
  const favoritePeriods={day:'Jour',week:'Semaine',month:'Mois',year:'Année'};
  const streakUnits={day:['jour','jours'],week:['semaine','semaines'],month:['mois','mois'],year:['année','années']};
  const MAX_STATS_FAVORITES=24;
  let statsFavorites=[];
  const statsFavoriteDialog=$('#statsFavoriteDialog'),statsFavoriteForm=$('#statsFavoriteForm');
  const favoriteMetric=$('#statsFavoriteMetric'),favoriteScope=$('#statsFavoriteScope');
  const favoriteScopePickers=new Map([
    ['all',createMultiSelect('Activité ou catégorie','Filtres actuels',ids=>setFavoriteScope(ids?.[0] || 'filters'),
      {single:true,grouped:true,showDefault:true})],
    ['activity',createMultiSelect('Activité','Choisir une activité',ids=>setFavoriteScope(ids?.[0] || ''),
      {single:true,grouped:true,showDefault:true})]
  ]);
  for(const [kind,picker] of favoriteScopePickers){
    picker.root.classList.add('catalog-filter-picker');
    favoriteScope.parentElement.append(picker.root);
    picker.root.hidden=kind!=='all';
  }
  favoriteScope.addEventListener('change',()=>syncFavoriteScopePicker());
  const favoritePeriod=$('#statsFavoritePeriod'),favoriteStart=$('#statsFavoriteStart'),favoriteName=$('#statsFavoriteName');
  const favoriteStartMode=$('#statsFavoriteStartMode'),favoriteEvolutionMeasure=$('#statsFavoriteEvolutionMeasure');
  setFavoriteOptions(favoriteEvolutionMeasure,Object.entries(statsMetrics),'count');
  let editingFavorite=null,favoriteReturnFocus=null;

  function normalizeStatsFavorites(value){
    if(!Array.isArray(value))return [];
    const favorites=new Map();
    for(const item of value){
      if(!item || typeof item.id!=='string' || !Object.hasOwn(favoriteMetrics,item.metric))continue;
      const scope=typeof item.scope==='string' && /^(activity|category):.+$/.test(item.scope)?item.scope:'filters';
      const streak=['current','longest'].includes(item.metric);
      const defaultPeriod=streak?'week':item.metric==='goals'?'day':'year';
      const canUseDay=!Object.hasOwn(statsGraphMetrics,item.metric);
      const period=(item.metric==='evolution' && item.period==='current-week') || (Object.hasOwn(favoritePeriods,item.period) && (!streak || item.period!=='year') && (canUseDay || item.period!=='day'))?item.period:defaultPeriod;
      const start=typeof item.start==='string' && /^\d{4}-\d{2}-\d{2}$/.test(item.start)?item.start:'';
      if(item.metric==='without' && !scope.startsWith('activity:'))continue;
      const measure=item.metric==='evolution'?{measure:Object.hasOwn(statsMetrics,item.measure)?item.measure:'count'}:{};
      let name=typeof item.name==='string'?item.name.trim().slice(0,70):'';
      if(item.metric==='goals' && name==='Objectifs quotidiens réussis')name=favoriteGoalMetrics.goals;
      favorites.set(item.id,{id:item.id,metric:item.metric,scope,period,start,...measure,name});
      if(favorites.size===MAX_STATS_FAVORITES)break;
    }
    return [...favorites.values()];
  }
  function streakLengths(periods,period,through,open=true){
    const currentPeriod=periodBounds(through,period)[0];
    const previousPeriod=shiftDate(currentPeriod,period,-1);
    let longest=0,run=0,previous='';
    for(const key of [...periods].sort()){
      run=previous && shiftDate(previous,period,1)===key?run+1:1;
      longest=Math.max(longest,run);
      previous=key;
    }
    // Leave the current period available before breaking a streak.
    return {longest,current:previous===currentPeriod || (open && previous===previousPeriod)?run:0};
  }
  function streakValue(value,period){
    return statNumber.format(value)+' '+streakUnits[period][value===1?0:1];
  }
  function statScope(scope,filter){
    if(scope==='filters'){
      const ids=filterCategoryIds(filter);
      return {
        label:'Filtres actuels',categoryIds:ids.length?ids:null, goalActivityIds:filter.activityIds,
        activities:filter.activityIds===null?activitiesForCategories(ids):state.activities.filter(activity=>filter.activityIds.includes(activity.id))
      };
    }
    const colon=scope.indexOf(':'),kind=scope.slice(0,colon),id=scope.slice(colon+1);
    if(kind==='category'){
      const category=categories.find(item=>item.id===id);
      if(!category)return null;
      return {label:categoryLabel(category),categoryIds:[id],goalActivityIds:null,activities:activitiesForCategories([id])};
    }
    const activity=activityById(id);
    return activity && {label:activity.name,categoryIds:[activity.categoryId],goalActivityIds:[id],activities:[activity]};
  }
  function statsMeasureData(entries,filter,through){
    const datesByActivity=new Map();
    for(const [date,ids] of entries){
      if(date>through)continue;
      for(const id of ids){
        if(!datesByActivity.has(id))datesByActivity.set(id,[]);
        datesByActivity.get(id).push(date);
      }
    }
    const cache=new Map(),activityRecords=new Map();
    return scope=>{
      if(!cache.has(scope)){
        const selection=statScope(scope,filter);
        cache.set(scope,selection && {
          ...selection,
          records:selection.activities.map(activity=>{
            if(!activityRecords.has(activity.id)){
              activityRecords.set(activity.id,{activity,dates:datesByActivity.get(activity.id)||[],streaks:new Map()});
            }
            return activityRecords.get(activity.id);
          }),
          streaks:new Map(),totals:new Map()
        });
      }
      return cache.get(scope);
    };
  }
  function measureFavorite(config,scope,through,today){
    const {metric,period,start}=config;
    const baseMetric=trendMetrics[metric]?.[0] || metric;
    if(Object.hasOwn(favoriteGoalMetrics,metric)){
      const goals=filteredGoalTargets(scope.categoryIds,scope.goalActivityIds)
        .filter(({goal})=>goal.period===period && !goalStartsAfter(goal,through));
      const status=metric==='goals'?'success':'pending';
      const matching=goals.filter(({goal,ids})=>goalMatchesStatus(goalProgress(ids,goal,through,today,through),status)).length;
      return {value:matching+' / '+goals.length,detail:periodLabel(through,period)};
    }
    if(metric==='without'){
      const end=through===today?shiftDate(today,'day',-1):through;
      const last=scope.records[0]?.dates.reduce((latest,date)=>date>=start && date<=through && date>latest?date:latest,'');
      if(!start && !last)return {value:'—',detail:'Aucune occurrence enregistrée sur cette période ou avant'};
      const first=last?shiftDate(last,'day',1):start;
      const days=Math.max(0,Math.round((Date.parse(end)-Date.parse(first))/86400000)+1);
      const detail=start?'Depuis le '+formatDate(start):'Dernière occurrence le '+formatDate(last);
      return {value:streakValue(days,'day'),detail:detail+' · jours terminés'};
    }
    if(metric==='current' || metric==='longest'){
      if(!scope.streaks.has(period)){
        scope.streaks.set(period,scope.records.map(({dates,streaks})=>{
          if(!streaks.has(period)){
            const periods=new Set(dates.map(date=>period==='day'?date:periodBounds(date,period)[0]));
            streaks.set(period,streakLengths(periods,period,through,through===today));
          }
          return streaks.get(period);
        }));
      }
      const streaks=scope.streaks.get(period);
      const best=Math.max(0,...streaks.map(item=>item.longest));
      if(metric==='longest')return {value:streakValue(best,period),detail:'Record au '+formatDate(through)};
      if(streaks.length===1)return {value:streakValue(streaks[0].current,period),detail:'Record · '+streakValue(best,period)};
      const active=streaks.filter(item=>item.current>=2).length;
      return {value:statNumber.format(active)+(active===1?' activité':' activités'),detail:'Séries d’au moins 2 '+streakUnits[period][1]+' · record '+streakValue(best,period)};
    }
    const range=statisticsWindow(through,period,through);
    if(!scope.totals.has(period)){
      const total=statTotals(),previous=statTotals();
      for(const {activity,dates} of scope.records){
        for(const date of dates){
          const bucket=date>=range.first?total:date>=range.previousFirst && date<=range.previousThrough?previous:null;
          if(bucket)statSum(bucket,date,state.details[date]?.[activity.id]);
        }
      }
      scope.totals.set(period,{total,previous});
    }
    const {total,previous}=scope.totals.get(period);
    const amount=statisticTotal(total,baseMetric);
    const trend=activityTrend(baseMetric,amount,statisticTotal(previous,baseMetric),range);
    if(metric!==baseMetric)return {value:trend?.delta || '—',detail:trend?null:'Aucune donnée à comparer',trend};
    return {value:statValue(metric,amount),detail:periodLabel(through,period),trend};
  }
  function favoriteLabel(config,scope){
    if(config.name)return config.name;
    const name=config.metric==='evolution'?evolutionTitles[config.period]:favoriteMetrics[config.metric];
    return name+(scope && config.scope!=='filters'?' · '+scope.label:'');
  }
  function statFavoritePreset(metric,period,name){
    return {metric,period,name,scope:'filters',start:''};
  }
  function favoriteKey(config){
    const parts=[config.metric,config.period,config.scope,config.start];
    if(config.metric==='evolution')parts.push(config.measure || 'count');
    return parts.join('|');
  }
  let dashboardPins=[];
  const collectionPinPath='m16 3 5 5-3 1-3 5v3l-2 2-8-8 2-2h3l5-3 1-3ZM9 15l-6 6';
  const collectionStarPath='m12 3 2.8 5.7 6.3.9-4.5 4.4 1 6.3-5.6-3-5.6 3 1-6.3L3 9.6l6.2-.9L12 3Z';
  function collectionIcon(path){
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+path+'"/></svg>';
  }
  favoriteStarChoices.querySelectorAll('.favorite-star-preview').forEach(preview=>{
    preview.innerHTML=collectionIcon(collectionStarPath);
  });
  function goalDashboardPin(item,goal){
    return {kind:'goal',ownerId:item.id,goalId:goal.id,...(goal.mode==='max'?{mode:'max'}:{})};
  }
  function dashboardPinKey(pin){
    if(pin.kind==='shortcut')return JSON.stringify(['shortcut',pin.id]);
    if(pin.kind==='evolution')return JSON.stringify(['evolution',pin.period,pin.metric]);
    return pin.kind==='goal'?JSON.stringify(['goal',pin.ownerId,pin.goalId]):
      JSON.stringify(['stat',pin.config.id || favoriteKey(pin.config)]);
  }
  function normalizeDashboardPins(pins){
    const unique=new Map();
    for(const pin of Array.isArray(pins)?pins:[]){
      let entry;
      if(pin?.kind==='goal' && typeof pin.ownerId==='string' && typeof pin.goalId==='string'){
        entry={kind:'goal',ownerId:pin.ownerId,goalId:pin.goalId,...(pin.mode==='max'?{mode:'max'}:{})};
      }else if(pin?.kind==='shortcut' && typeof pin.id==='string' && shortcutPages.includes(pin.page) &&
        validGoalDate(pin.date) && (calendarPeriods.includes(pin.period) || (pin.page==='calendar' && pin.period==='life'))){
        entry={kind:'shortcut',id:pin.id,page:pin.page,date:pin.date,period:pin.period,relative:pin.relative===true,
          scope:pin.scope==='goals'?'goals':'activities',format:pin.format==='cards'?'cards':'list',
          filter:normalizeWorkspaceFilters(pin.filter),name:typeof pin.name==='string'?pin.name.trim().slice(0,70):''};
      }else if(pin?.kind==='stat' && pin.config && typeof pin.config==='object'){
        const [config]=normalizeStatsFavorites([{...pin.config,id:pin.config.id || favoriteKey(pin.config)}]);
        if(!config)continue;
        if(!pin.config.id)delete config.id;
        entry={kind:'stat',config};
      }else if(pin?.kind==='evolution' && Object.hasOwn(evolutionTitles,pin.period) && Object.hasOwn(statsMetrics,pin.metric)){
        entry={kind:'evolution',period:pin.period,metric:pin.metric};
      }
      if(entry)unique.set(dashboardPinKey(entry),entry);
    }
    return [...unique.values()];
  }
  function syncDashboardPin(button,pressed){
    const action=pressed?'Retirer des favoris du tableau de bord':'Ajouter aux favoris du tableau de bord';
    button.setAttribute('aria-pressed',String(pressed));
    button.setAttribute('aria-label',action+' · '+button.dataset.pinLabel);
    button.title=action;
  }
  function dashboardPinButton(pin,label){
    const key=dashboardPinKey(pin);
    const button=makeButton('',()=>{
      const index=dashboardPins.findIndex(item=>dashboardPinKey(item)===key);
      const add=index===-1;
      const undo=captureUndo('collections');
      if(add)dashboardPins.push(pin);
      else dashboardPins.splice(index,1);
      document.querySelectorAll('[data-dashboard-pin]').forEach(control=>{
        if(control.dataset.dashboardPin===key)syncDashboardPin(control,add);
      });
      const grid=button.closest('.dashboard-grid');
      if(currentPage==='dashboard' && grid){
        const offset=[...grid.querySelectorAll('[data-dashboard-pin]')].indexOf(button);
        renderDashboard();
        const controls=grid.querySelectorAll('[data-dashboard-pin]');
        (controls[Math.min(offset,controls.length-1)] || $('#dashboardTitle')).focus({preventScroll:true});
      }
      persist();
      showSaveToast(add?'Ajouté aux favoris du tableau de bord':'Retiré des favoris du tableau de bord',undo());
    },'dashboard-pin');
    button.dataset.dashboardPin=key;
    button.dataset.pinLabel=label;
    button.innerHTML=collectionIcon(collectionStarPath);
    syncDashboardPin(button,dashboardPins.some(item=>dashboardPinKey(item)===key));
    return button;
  }
  const shortcutPages=['calendar','activities','goals'];
  const shortcutPageNames={calendar:'Calendrier',activities:'Activités',goals:'Objectifs'};
  const shortcutDialog=$('#dashboardShortcutDialog');
  const shortcutName=$('#dashboardShortcutName'),shortcutDateMode=$('#dashboardShortcutDateMode');
  let editingShortcut;
  function currentShortcut(){
    const page=currentPage,today=localDateKey(new Date());
    const scope=page==='calendar'?calendarScope:page;
    const date=page==='calendar'?calendarState.date:page==='activities'?activityReference():goalReference || today;
    const period=page==='calendar'?calendarState.period:page==='activities'?activityPeriod():goalPickerPeriod();
    const format=page==='calendar'?calendarState.dayFormats[scope]:scope==='goals'?goalFormat:activityFormat;
    const relative=period!=='life' && periodBounds(date,period)[0]===periodBounds(today,period)[0];
    return {kind:'shortcut',page,scope,date,period,format,relative,filter:activeQuickFilter()};
  }
  function shortcutLabel(shortcut){
    return shortcutPageNames[shortcut.page]+(shortcut.page==='calendar'?' · '+shortcutPageNames[shortcut.scope]:'')+
      ' · '+(shortcut.period==='life'?'Centenaire':favoritePeriods[shortcut.period]);
  }
  function shortcutFiltersLabel(filter){
    const labels=filterCategoryIds(filter).map(id=>categories.find(category=>category.id===id).name);
    if(filter.activityIds!==null)labels.push(...filter.activityIds.map(id=>activityById(id)?.name).filter(Boolean));
    if(filter.frequencies.length)labels.push(...filter.frequencies.map(period=>goalPeriodLabels[period]));
    if(filter.status!=='all')labels.push(goalFilterStatuses.find(([key])=>key===filter.status)?.[1]);
    return labels.filter(Boolean).join(', ') || 'Aucun filtre';
  }
  function openShortcutEditor(shortcut){
    editingShortcut=shortcut;
    shortcutName.value=shortcut.name || '';
    shortcutName.placeholder=shortcutLabel(shortcut);
    shortcutDateMode.value=shortcut.relative?'relative':'fixed';
    shortcutDateMode.querySelector('[value=relative]').disabled=shortcut.period==='life';
    $('#dashboardShortcutSummary').textContent=shortcutLabel(shortcut)+' · '+
      (shortcut.format==='cards'?'Galerie':'Liste')+' · '+shortcutFiltersLabel(shortcut.filter);
    $('#dashboardShortcutDate').textContent='Date enregistrée · '+formatDate(shortcut.date);
    shortcutDialog.showModal();shortcutName.focus();
  }
  function openDashboardShortcut(shortcut){
    const {page,scope,period,format}=shortcut,date=shortcut.relative?localDateKey(new Date()):shortcut.date;
    activeDatePicker?.close();
    if(page==='calendar'){
      calendarScope=scope;Object.assign(calendarState,{date,period});
      calendarState.dayFormats[scope]=format;
    }else if(page==='activities'){
      focusDate=date;calendarView=period;activityFormat=format;state.year=Number(date.slice(0,4));
    }else{
      goalReference=date;goalDatePeriod=period;goalFormat=format;
    }
    rememberTemporalSelection(date,period);
    const filter=normalizeWorkspaceFilters(shortcut.filter);
    if(shareWorkspaceFilters)sharedFilters=filter;
    else applyPageFilter(page,filter);
    setPage(page,true,true);
  }
  function syncShortcutStar(){
    if(!shortcutPages.includes(currentPage))return;
    const view=currentShortcut();
    const button=$('[data-workspace-page="'+currentPage+'"] .workspace-shortcut-pin');
    const matched=dashboardPins.some(pin=>pin.kind==='shortcut' && pin.page===view.page &&
      pin.scope===view.scope && pin.format===view.format && pin.period===view.period &&
      (pin.relative?view.relative:pin.date===view.date) && JSON.stringify(pin.filter)===JSON.stringify(view.filter));
    button?.setAttribute('aria-pressed',String(matched));
  }
  for(const page of shortcutPages){
    const button=makeButton('',()=>openShortcutEditor(currentShortcut()),'dashboard-pin workspace-shortcut-pin');
    button.innerHTML=collectionIcon(collectionStarPath);
    button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls',shortcutDialog.id);
    button.setAttribute('aria-label','Enregistrer cette vue dans les raccourcis');
    button.title='Enregistrer cette vue dans les raccourcis';
    $('[data-workspace-page="'+page+'"] .workspace-heading-actions').prepend(button);
  }
  $('#dashboardShortcutForm').addEventListener('submit',event=>{
    event.preventDefault();
    if(!editingShortcut)return;
    const shortcut={...editingShortcut,id:editingShortcut.id || crypto.randomUUID(),name:shortcutName.value.trim(),relative:shortcutDateMode.value==='relative'};
    const undo=captureUndo('collections');
    dashboardPins=editingShortcut.id?dashboardPins.map(pin=>pin.kind==='shortcut' && pin.id===shortcut.id?shortcut:pin):[...dashboardPins,shortcut];
    shortcutDialog.close();
    if(currentPage==='dashboard')renderDashboard();
    else syncShortcutStar();
    persist();showSaveToast(editingShortcut.id?'Raccourci modifié':'Raccourci ajouté au tableau de bord',undo());
  });
  $('#cancelDashboardShortcut').addEventListener('click',()=>shortcutDialog.close());
  let dashboardPlacement;
  const dashboardContent=$('#dashboardContent');
  const dashboardGrids=[...dashboardContent.querySelectorAll('[data-dashboard-group]')];
  const dashboardSections=new Map(dashboardGrids.map(grid=>[grid.dataset.dashboardGroup,grid.parentElement]));
  const defaultDashboardSectionOrder=[...dashboardSections.keys()];
  function dashboardSectionOrder(){
    const saved=sectionLayout.orders.dashboardSections || [];
    return [...new Set([...saved.filter(id=>dashboardSections.has(id)),...defaultDashboardSectionOrder])];
  }
  const dashboardSectionIcons={
    shortcuts:'M13 5h6v6m0-6-8 8m6 0v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5',
    indicators:'M4 4v16h16M8 16v-4m5 4V8m5 8V5',
    minimums:'M5 12l4 4L19 6',
    limits:'M5 12h14'
  };
  function renderDashboardSectionSettings(){
    const order=dashboardSectionOrder(),list=$('#dashboardSectionOrder');
    if(!list.childElementCount){
      for(const id of order){
        const name=document.getElementById(dashboardSections.get(id).getAttribute('aria-labelledby')).textContent;
        const row=makeElement('li');
        row.dataset.section=id;
        const label=makeElement('span','dashboard-section-order-label');
        label.innerHTML=collectionIcon(dashboardSectionIcons[id]);
        label.append(document.createTextNode(name));
        const controls=makeElement('div','dashboard-section-order-actions');
        for(const [delta,symbol,action] of [[-1,'↑','Monter'],[1,'↓','Descendre']]){
          const button=makeButton(symbol,()=>{
            const rows=[...list.children],index=rows.indexOf(row),adjacent=rows[index+delta];
            if(!adjacent)return;
            animateReorder(list,row,delta<0?adjacent:adjacent.nextElementSibling,true);
            sectionLayout.orders.dashboardSections=[...list.children].map(item=>item.dataset.section);
            renderDashboardSectionSettings();
            (button.disabled?controls.querySelector('button:enabled'):button)?.focus({preventScroll:true});
            if(currentPage==='dashboard')renderDashboard();
            persist();
          });
          button.dataset.move=String(delta);
          button.setAttribute('aria-label',action+' « '+name+' »');
          controls.append(button);
        }
        row.append(label,controls);
        list.append(row);
      }
    }
    const rows=new Map([...list.children].map(row=>[row.dataset.section,row]));
    order.forEach((id,index)=>{
      const row=rows.get(id),position=list.children[index];
      if(position!==row)list.insertBefore(row,position);
      row.querySelector('[data-move="-1"]').disabled=index===0;
      row.querySelector('[data-move="1"]').disabled=index===order.length-1;
    });
    $('#resetDashboardSectionOrder').disabled=order.every((id,index)=>id===defaultDashboardSectionOrder[index]);
    syncNavigationReset();
  }
  function resetDashboardSectionOrder(){
    delete sectionLayout.orders.dashboardSections;
    renderDashboardSectionSettings();
  }
  $('#resetDashboardSectionOrder').addEventListener('click',()=>{
    resetDashboardSectionOrder();
    if(currentPage==='dashboard')renderDashboard();
    persist();
  });
  function renderDashboard(){
    dashboardSectionOrder().forEach((id,index)=>{
      const section=dashboardSections.get(id);
      const current=dashboardContent.children[index];
      if(current!==section)dashboardContent.insertBefore(section,current || null);
    });
    dashboardPlacement?.abort();
    dashboardPlacement=new AbortController();
    const groups=new Map(dashboardGrids.map(grid=>[grid.dataset.dashboardGroup,new Map()]));
    const today=localDateKey(new Date()),readStreak=goalStreakReader(today);
    const entries=Object.entries(state.entries),filter=activeQuickFilter('statistics');
    const getScope=statsMeasureData(entries,filter,today);
    const targets=new Map(goalTargets().map(target=>[dashboardPinKey(goalDashboardPin(target.item,target.goal)),target]));
    const goalGroups={minimums:[],limits:[]};
    for(const pin of dashboardPins){
      const key=dashboardPinKey(pin),target=targets.get(key);
      if(pin.kind==='shortcut'){
        const label=pin.name || shortcutLabel(pin);
        const card=makeElement('article','stats-kpi dashboard-shortcut');
        const open=makeButton(label,()=>openDashboardShortcut(pin),'dashboard-shortcut-open');
        const edit=makeButton('✎',()=>openShortcutEditor(pin),'dashboard-shortcut-edit');
        edit.setAttribute('aria-label','Renommer '+label);
        card.append(open,makeElement('small',null,shortcutLabel(pin)),
          makeElement('small',null,(pin.relative?'Période actuelle':formatDate(pin.date))+' · '+shortcutFiltersLabel(pin.filter)));
        const handle=makeButton('⠿',()=>{},'goal-drag');handle.setAttribute('aria-label','Réorganiser '+label);
        const actions=makeElement('div','dashboard-tile-actions');
        actions.append(dashboardPinButton(pin,label),edit,handle);card.prepend(actions);
        groups.get('shortcuts').set(key,{card,span:1,width:1});
        continue;
      }
      if(pin.kind==='goal' && !target)continue;
      let card,label;
      if(target){
        label=target.item.name;
        const result=goalProgress(target.ids,target.goal,today);
        card=createGoalCard({...target,result},today,readStreak).card;
      }else{
        const config=pin.kind==='evolution'?{metric:'evolution',period:pin.period,measure:pin.metric,scope:'filters'}:
          statsFavorites.find(item=>item.id===pin.config.id) || pin.config;
        const scope=getScope(config.scope);
        label=favoriteLabel(config,scope);
        card=renderFavoriteCard(config,scope,today,today,'dashboard-graph-'+key);
        if(config.metric==='evolution')card.classList.add('dashboard-evolution');
        const handle=makeButton('⠿',()=>{},'goal-drag');
        handle.setAttribute('aria-label','Réorganiser '+label);
        statCardActions(card).append(dashboardPinButton(pin,label),handle);
      }
      const group=pin.kind!=='goal'?'indicators':(target?.goal.mode || pin.mode)==='max'?'limits':'minimums';
      if(target)goalGroups[group].push(target);
      groups.get(group).set(key,{card,span:target && !compactGoalTiles?2:1,width:card.matches('.stats-graph-card')?Infinity:card.matches('.dashboard-evolution,.stats-goal-breakdown-card')?2:1});
    }
    for(const grid of dashboardGrids){
      const group=grid.dataset.dashboardGroup,tiles=groups.get(group);
      const summary=grid.previousElementSibling;
      if(summary.classList.contains('dashboard-goal-summary')){
        summary.replaceChildren();
        if(goalGroups[group].length)renderGoalSummary(goalGroups[group],today,summary);
      }
      grid.replaceChildren();
      grid.parentElement.hidden=tiles.size===0;
      if(tiles.size)placeDashboardTiles(grid,tiles);
    }
  }
  function cardColumnCount(grid){
    return Number(getComputedStyle(grid).getPropertyValue('--card-columns')) || 4;
  }
  function placeDashboardTiles(grid,tiles){
    const columns=cardColumnCount(grid);
    const layoutKey='dashboardSlots-'+grid.dataset.dashboardGroup+'-'+columns;
    const maxSlots=(tiles.size*4+4)*columns;
    grid.dataset.columns=columns;
    const tileWidth=key=>Math.min(columns,tiles.get(key).width);
    const fits=(key,index)=>index%columns+tileWidth(key)<=columns;
    const slotsFor=(key,index)=>Array.from({length:tiles.get(key).span},(_,row)=>
      Array.from({length:tileWidth(key)},(_,column)=>index+row*columns+column)).flat();
    const occupied=layout=>new Map([...layout].flatMap(([key,index])=>slotsFor(key,index).map(slot=>[slot,key])));
    const findFree=(cells,key,preferred=0)=>{
      for(let index=preferred;;index++){
        if(fits(key,index) && slotsFor(key,index).every(slot=>!cells.has(slot)))return index;
      }
    };
    // Preserve the order of existing pins when projecting the old combined grid.
    const group=grid.dataset.dashboardGroup;
    const previous=(columns===1 && sectionLayout.orders['dashboardSlots-'+group+'-2']) ||
      sectionLayout.orders['dashboardSlots-'+group+'-3'] ||
      sectionLayout.orders['dashboardSlots-'+group+'-5'] ||
      sectionLayout.orders['dashboardSlots'+columns] || sectionLayout.orders.dashboardSlots3 || [];
    const saved=sectionLayout.orders[layoutKey] || previous.filter(key=>tiles.has(key));
    const layout=new Map(),filled=new Map();
    function place(key,index){
      layout.set(key,index);
      slotsFor(key,index).forEach(slot=>filled.set(slot,key));
    }
    saved.slice(0,maxSlots).forEach((key,index)=>{
      if(tiles.has(key) && !layout.has(key) && fits(key,index) && slotsFor(key,index).every(slot=>!filled.has(slot)))place(key,index);
    });
    for(const key of tiles.keys()){
      if(!layout.has(key))place(key,findFree(filled,key));
    }
    const lastSlot=Math.max(...filled.keys());
    const limit=Math.min(maxSlots,(Math.ceil((lastSlot+1)/columns)+2)*columns);
    function position(card,index,span,width=1){
      card.dataset.dashboardSlot=index;
      card.style.gridColumn=(index%columns+1)+' / span '+width;
      card.style.gridRow=(Math.floor(index/columns)+1)+' / span '+span;
    }
    const ordered=[...layout].sort((a,b)=>a[1]-b[1]).map(([key])=>key);
    const cards=new Map(ordered.map(key=>{
      const {card,span}=tiles.get(key);
      card.dataset.dashboardTile=key;
      position(card,layout.get(key),span,tileWidth(key));
      return [key,card];
    }));
    const targets=Array.from({length:limit},(_,index)=>{
      const cell=makeElement('div','dashboard-slot tile-drop-cell');
      cell.hidden=true;cell.setAttribute('aria-hidden','true');
      position(cell,index,1);
      return cell;
    });
    grid.append(...cards.values(),...targets);
    function preview(key,index){
      const from=layout.get(key);
      if(from===index || !fits(key,index))return layout;
      const blocker=slotsFor(key,index).map(slot=>filled.get(slot)).find(other=>other && other!==key);
      if(!blocker){
        const moved=new Map(layout);
        moved.set(key,index);
        return moved;
      }
      const destination=ordered.indexOf(blocker),order=[...ordered];
      order.splice(order.indexOf(key),1);
      order.splice(destination,0,key);
      const start=Math.min(from,layout.get(blocker));
      const moved=new Map([...layout].filter(([,slot])=>slot<start)),cells=occupied(moved);
      let cursor=start;
      for(const id of order){
        if(moved.has(id))continue;
        const slot=findFree(cells,id,cursor);
        moved.set(id,slot);
        slotsFor(id,slot).forEach(cell=>cells.set(cell,id));
        cursor=slot+1;
      }
      return moved;
    }
    function commit(moved,key){
      const next=Array(Math.max(...moved.values())+1).fill('');
      for(const [id,slot] of moved)next[slot]=id;
      const previous=sectionLayout.orders[layoutKey];
      sectionLayout.orders[layoutKey]=next;
      renderDashboard();persist();
      showSaveToast('Tuile déplacée',()=>{
        if(!sameUndoValue(sectionLayout.orders[layoutKey],next))return false;
        if(previous)sectionLayout.orders[layoutKey]=previous;
        else delete sectionLayout.orders[layoutKey];
        renderDashboard();persist();return true;
      });
      [...grid.querySelectorAll('[data-dashboard-tile]')].find(tile=>tile.dataset.dashboardTile===key)
        ?.querySelector('.goal-drag').focus({preventScroll:true});
    }
    bindTilePlacement(grid,{columns,cards,targets,layout,preview,commit,
      position:(key,card,index)=>position(card,index,tiles.get(key).span,tileWidth(key)),
      slotAttribute:'dashboardSlot',signal:dashboardPlacement.signal});
  }
  function commitStatsFavorites(focus,message,undo){
    persist();renderStatistics();
    focus?.()?.focus({preventScroll:true});
    showSaveToast(message,undo?.());
  }
  function statCardActions(card){
    let header=card.querySelector(':scope > .stats-tile-header');
    if(!header){
      header=makeElement('div','stats-tile-header');
      const label=card.querySelector(':scope > :is(.stats-kpi-label,h2)');
      if(label)header.append(label);
      header.append(makeElement('div','stats-tile-actions'));
      card.prepend(header);
    }
    return header.lastElementChild;
  }
  function favoriteCardAction(card,action,label,symbol){
    const button=makeButton(symbol,action,'stats-card-action');
    button.title=label;button.setAttribute('aria-label',label);
    card.classList.add('stats-card-with-action');
    statCardActions(card).prepend(button);
    return button;
  }
  function offerStatPin(card,config,dashboardPin={kind:'stat',config}){
    const key=favoriteKey(config);
    const pinned=statsFavorites.find(item=>favoriteKey(item)===key);
    statCardActions(card).append(dashboardPinButton(dashboardPin,config.name));
    const button=favoriteCardAction(card,()=>{
      const undo=captureUndo('collections');
      if(pinned)statsFavorites=statsFavorites.filter(item=>item.id!==pinned.id);
      else if(statsFavorites.length<MAX_STATS_FAVORITES)statsFavorites.push({...config,id:crypto.randomUUID()});
      commitStatsFavorites(()=>[...document.querySelectorAll('[data-stat-pin]')].find(node=>node.dataset.statPin===key),pinned?'Indicateur désépinglé':'Indicateur épinglé',undo);
    },(pinned?'Désépingler de Mes indicateurs':'Épingler dans Mes indicateurs')+' · '+config.name,'');
    button.classList.add('stats-key-pin');
    button.innerHTML=collectionIcon(collectionPinPath);
    button.dataset.statPin=key;
    button.setAttribute('aria-pressed',String(Boolean(pinned)));
    button.disabled=!pinned && statsFavorites.length>=MAX_STATS_FAVORITES;
    return card;
  }
  function renderFavoriteGraph(config,scope,through,today,id,label){
    const mode=config.metric.slice('graph-'.length);
    const {first,last}=statisticsWindow(through,config.period,today);
    const counts=new Map();
    let outcomes=new Map();
    if(mode==='goals'){
      const entries=Object.entries(state.entries);
      const targets=filteredGoalTargets(scope.categoryIds,scope.goalActivityIds)
        .filter(({goal})=>goal.period==='day' && !goalStartsAfter(goal,last))
        .map(target=>({...target,counts:goalCountsByPeriod(target.ids,target.goal,today,entries)}));
      outcomes=goalStatistics(targets,first,last,today).outcomesByDate;
    }else{
      for(const {activity,dates} of scope.records){
        for(const date of dates){
          if(date<first || date>last)continue;
          const count=Number(state.details[date]?.[activity.id]?.count) || 1;
          counts.set(date,(counts.get(date) || 0)+count);
        }
      }
    }
    const card=makeElement('article','stats-kpi stats-graph-card');
    card.append(makeElement('h3','stats-kpi-label',label),
      renderStatsDayGraph(first,last,today,outcomes,counts,mode,{period:config.period,embeddedId:id}));
    return card;
  }
  function renderFavoriteCard(config,scope,through,today,graphId){
    const label=favoriteLabel(config,scope);
    if(scope && Object.hasOwn(statsGraphMetrics,config.metric))return renderFavoriteGraph(config,scope,through,today,graphId,label);
    if(scope && Object.hasOwn(goalReportMetrics,config.metric))return renderGoalReportCard(config.metric,label,goalReportForScope(scope,through,config.period,today));
    if(config.metric==='evolution' && scope){
      const measure=config.measure || 'count',card=makeElement('article','stats-kpi stats-evolution-card');
      const reference=config.period==='current-week'?today:through;
      const chart=statisticsChart(reference,config.period,scope);
      const heading=makeElement('h3','stats-kpi-label');
      heading.append(metricIcon(measure),makeElement('span',null,label));
      card.append(heading,statisticsBarChart(chart.buckets,reference,chart.period,measure));
      return card;
    }
    const result=scope?measureFavorite(config,scope,through,today):{value:'—',detail:'Activité ou catégorie supprimée'};
    return statCard(label,result.value,result.detail,Object.hasOwn(goalReportMetrics,config.metric)?'goals':config.metric,result.trend);
  }
  function renderStatsFavorites(root,through,today,filter,getScope,getTodayScope){
    const section=statSection(root,'statsFavorites','Mes indicateurs');
    if(!statsFavorites.length){
      section.append(makeElement('p','stats-description','Épingle un indicateur avec la punaise ou crée un indicateur pour suivre une activité ou une catégorie.'));
      return;
    }
    const grid=makeElement('div','stats-kpis stats-favorite-grid');section.append(grid);
    for(const config of statsFavorites){
      const scope=(config.period==='current-week'?getTodayScope:getScope)(config.scope),label=favoriteLabel(config,scope);
      const card=renderFavoriteCard(config,scope,through,today,'favorite-graph-'+config.id);card.dataset.statsFavorite=config.id;
      const edit=favoriteCardAction(card,()=>openStatFavoriteEditor(config,filter),'Modifier l’indicateur '+label,'✎');
      edit.dataset.editStatsFavorite=config.id;
      statCardActions(card).append(dashboardPinButton({kind:'stat',config},label));
      grid.append(card);
    }
    bindStatsOrder(grid);
  }
  function setFavoriteOptions(select,choices,value){
    select.replaceChildren(...choices.map(([key,label,group])=>{
      if(group){
        const options=makeElement('optgroup');options.label=label;
        for(const [id,name] of group)options.append(new Option(name,id));
        return options;
      }
      return new Option(label,key);
    }));
    if([...select.options].some(option=>option.value===value))select.value=value;
  }
  function setFavoriteScope(value){
    favoriteScope.value=value;
    syncFavoriteScopePicker();
  }
  function syncFavoriteScopePicker(){
    const without=favoriteMetric.value==='without';
    const choices=catalogFilterChoices(activeQuickFilter('statistics')).choices;
    const value=favoriteScope.value;
    for(const [kind,picker] of favoriteScopePickers){
      const visible=(kind==='activity')===without;
      picker.root.hidden=!visible;
      if(visible)picker.update(without?choices.filter(([,,,type])=>type==='activity'):choices,
        value && value!=='filters'?[value]:null);
    }
  }
  function syncStatFavoriteFields({scope=favoriteScope.value,period=favoritePeriod.value}={}){
    const without=favoriteMetric.value==='without',streak=['current','longest'].includes(favoriteMetric.value);
    const evolution=favoriteMetric.value==='evolution';
    favoriteEvolutionMeasure.closest('label').hidden=favoriteEvolutionMeasure.disabled=!evolution;
    const activities=state.activities.map(activity=>['activity:'+activity.id,activity.name+' · '+(categories.find(c=>c.id===activity.categoryId)?.name||'Activité')]);
    const categoryOptions=categories.map(category=>['category:'+category.id,categoryLabel(category)]);
    const choices=without?[['','Choisir une activité']]:[['filters','Filtres actuels'],['','Catégories',categoryOptions]];
    if(activities.length)choices.push(['','Activités',activities]);
    setFavoriteOptions(favoriteScope,choices,scope);
    syncFavoriteScopePicker();
    favoritePeriod.closest('label').hidden=favoritePeriod.disabled=without;
    const graph=Object.hasOwn(statsGraphMetrics,favoriteMetric.value);
    const periods=Object.entries(favoritePeriods).filter(([key])=>(!streak || key!=='year') && (!graph || key!=='day'));
    if(evolution)periods.push(['current-week','Semaine en cours · un jour par barre']);
    setFavoriteOptions(favoritePeriod,periods,period || (streak?'week':'year'));
    syncFavoriteStartFields();
    $('#statsFavoriteHelp').textContent=without?'Compte les jours terminés. Toute nouvelle occurrence remet le compteur à zéro.':
      Object.hasOwn(trendMetrics,favoriteMetric.value)?'Affiche la différence avec la période précédente.':
      evolution?'Compare les dernières périodes pour la mesure et le périmètre choisis.':
      streak?'Une période est active dès qu’une occurrence est enregistrée. La période en cours peut encore prolonger la série.':
      favoriteMetric.value==='goals-pending'?'Compte les objectifs dont le minimum reste à atteindre avant la fin de la période.':
      favoriteMetric.value==='goals'?'Compte les minima atteints et les limites respectées pour la fréquence choisie.':'';
  }
  function syncFavoriteStartFields(){
    const without=favoriteMetric.value==='without';
    const custom=without && favoriteStartMode.value==='date';
    favoriteStartMode.closest('label').hidden=favoriteStartMode.disabled=!without;
    favoriteStart.closest('label').hidden=favoriteStart.disabled=!custom;
    favoriteStart.required=custom;
  }
  favoriteStartMode.addEventListener('change',syncFavoriteStartFields);
  function openStatFavoriteEditor(config,filter){
    editingFavorite=config;favoriteReturnFocus=document.activeElement;
    statsFavoriteForm.reset();
    favoriteStartMode.value=config?.metric==='without' && config.start?'date':'last';
    setFavoriteOptions(favoriteMetric,Object.entries(favoriteMetrics),config?.metric||'current');
    const scope=statScope('filters',filter);
    const initialScope=scope.activities.length===1?'activity:'+scope.activities[0].id:'filters';
    syncStatFavoriteFields({scope:config?.scope||initialScope,period:config?.period||'week'});
    favoriteEvolutionMeasure.value=config?.measure || 'count';
    favoriteName.value=config?.name||'';
    const today=localDateKey(new Date());favoriteStart.max=today;favoriteStart.value=config?.start||'';
    $('#statsFavoriteTitle').textContent=config?'Modifier l’indicateur':'Ajouter un indicateur';
    $('#removeStatsFavorite').hidden=!config;
    statsFavoriteDialog.showModal();favoriteName.focus({preventScroll:true});
  }
  favoriteMetric.addEventListener('change',()=>{
    const metric=favoriteMetric.value;
    syncStatFavoriteFields({period:metric==='evolution' || Object.hasOwn(favoriteGoalMetrics,metric) || Object.hasOwn(goalReportMetrics,metric)?statsPeriod:''});
  });
  for(const id of ['#closeStatsFavorite','#cancelStatsFavorite']){
    $(id).addEventListener('click',()=>statsFavoriteDialog.close());
  }
  statsFavoriteDialog.addEventListener('close',()=>{
    if(activeDatePicker && statsFavoriteDialog.contains(activeDatePicker.trigger))activeDatePicker.close();
    if(!statsFavoriteDialog.open && favoriteReturnFocus?.isConnected)favoriteReturnFocus.focus({preventScroll:true});
  });
  function dashboardCopiesOf(config){
    return dashboardPins.filter(pin=>{
      if(pin.kind==='stat' && pin.config.id)return pin.config.id===config.id;
      const preset=pin.kind==='stat'?pin.config:pin.kind==='evolution'?
        {...statFavoritePreset('evolution',pin.period,evolutionTitles[pin.period]+' · '+statsMetrics[pin.metric]),measure:pin.metric}:null;
      return preset && preset.name===config.name && favoriteKey(preset)===favoriteKey(config);
    });
  }
  $('#removeStatsFavorite').addEventListener('click',()=>{
    const config=editingFavorite;
    if(!config)return;
    function remove(){
      if(!statsFavorites.some(item=>item.id===config.id))return false;
      const undo=captureUndo('collections');
      const copies=dashboardCopiesOf(config);
      statsFavorites=statsFavorites.filter(item=>item.id!==config.id);
      dashboardPins=dashboardPins.filter(pin=>!copies.includes(pin));
      if(catalogActionDialog.open)catalogActionDialog.close();
      statsFavoriteDialog.close();
      commitStatsFavorites(()=>$('#addStatsFavorite'),copies.length?'Indicateur retiré des statistiques et du tableau de bord':'Indicateur retiré',undo);
      return true;
    }
    if(dashboardCopiesOf(config).length){
      openCatalogAction('Retirer cet indicateur ?', 'Il est aussi dans le tableau de bord. Confirme le retrait des deux pages.', 'Retirer', [], remove);
    }else remove();
  });
  statsFavoriteForm.addEventListener('submit',event=>{
    event.preventDefault();
    if(!statsFavoriteDialog.open || !statsFavoriteForm.reportValidity())return;
    if(!favoriteScope.value){
      favoriteScopePickers.get('activity').root.querySelector('button').click();
      return;
    }
    const without=favoriteMetric.value==='without';
    const id=editingFavorite?.id||crypto.randomUUID();
    const config={id,metric:favoriteMetric.value,scope:favoriteScope.value,
      ...(favoriteMetric.value==='evolution'?{measure:favoriteEvolutionMeasure.value}:{}),
      period:without?'day':favoritePeriod.value,
      start:without && favoriteStartMode.value==='date'?favoriteStart.value:'',name:favoriteName.value.trim()};
    const undo=captureUndo('collections');
    if(editingFavorite){
      statsFavorites=statsFavorites.map(item=>item.id===id?config:item);
      dashboardPins=dashboardPins.map(pin=>pin.kind==='stat' && pin.config.id===id?{...pin,config}:pin);
    }else if(statsFavorites.length<MAX_STATS_FAVORITES)statsFavorites.push(config);
    const message=editingFavorite?'Indicateur mis à jour':'Indicateur créé';
    statsFavoriteDialog.close();
    commitStatsFavorites(()=>[...document.querySelectorAll('[data-edit-stats-favorite]')].find(button=>button.dataset.editStatsFavorite===id),message,undo);
  });
  const addStatsFavorite=$('#addStatsFavorite');
  addStatsFavorite.addEventListener('click',()=>openStatFavoriteEditor(null,activeQuickFilter('statistics')));
  function updateStatsPeriod(now=localDateKey(new Date())){
    const reference=statsDate && statsDate<=now?statsDate:now;
    const range=statisticsWindow(reference,statsPeriod,now);
    updateDateNavigation('statsYearLabel','statsYear',range.first,statsPeriod);
    syncSegmentedSwitch(statsPeriods,'statsPeriod',statsPeriod);
    syncCompactSwitch(statsPeriods);
    $('#statsNext').disabled=range.last>=now;
    $('#statsPrevious').disabled=range.previousFirst.length!==10;
    const todayLabel={year:'Cette année',month:'Ce mois-ci',week:'Cette semaine',day:'Aujourd’hui'}[statsPeriod];
    $('#statsToday').textContent=todayLabel;
    $('#statsToday').setAttribute('aria-label',todayLabel);
    addStatsFavorite.disabled=statsFavorites.length>=MAX_STATS_FAVORITES;
    return range;
  }
  function bindStatsOrder(container){
    const key='statsFavorites:0',saved=sectionLayout.orders[key] || [];
    const cards=new Map([...container.children].map(card=>[card.dataset.statsFavorite,card]));
    const ordered=[...new Set([...saved,...cards.keys()])].filter(id=>cards.has(id));
    for(const id of ordered){
      const card=cards.get(id);
      container.append(card);
      const handle=makeButton('⠿',()=>{},'goal-drag stats-reorder');
      handle.dataset.statsReorder=id;
      handle.title='Réorganiser';
      handle.setAttribute('aria-label','Réorganiser '+card.querySelector('.stats-kpi-label').textContent+' · Alt et flèches pour déplacer');
      statCardActions(card).append(handle);
      enableDirectReorder(card,id,container,next=>{
        if(sameUndoValue(ordered,next))return;
        const previous=sectionLayout.orders[key];
        sectionLayout.orders[key]=next;
        renderStatistics();persist();
        [...$('#statisticsContent').querySelectorAll('[data-stats-reorder]')]
          .find(button=>button.dataset.statsReorder===id)?.focus({preventScroll:true});
        showSaveToast('Ordre des statistiques enregistré',()=>{
          if(!sameUndoValue(sectionLayout.orders[key],next))return false;
          if(previous)sectionLayout.orders[key]=previous;
          else delete sectionLayout.orders[key];
          renderStatistics();persist();return true;
        });
      },'.stats-reorder',{scroll:true});
    }
  }
  function renderStatistics(){
    statisticsRenderRevision++;
    dismissStatsCategory=null;
    const now=localDateKey(new Date()),range=updateStatsPeriod(now);
    const {first,last,through}=range;
    const entries=Object.entries(state.entries);
    const filter=activeQuickFilter('statistics'),categoryIds=filterCategoryIds(filter);
    const activityIds=new Set(filter.activityIds ?? activitiesForCategories(categoryIds).map(activity=>activity.id));
    const content=$('#statisticsContent'),root=document.createDocumentFragment(),focused=document.activeElement;
    const activeMetric=focused?.dataset.statsMetric,activeGraph=focused?.closest('.stats-activity-calendar')?.id;
    const activeDate=focused?.matches('.stats-calendar-cell')?focused.dataset.date:null;
    if(calendarPreviewAnchor && content.contains(calendarPreviewAnchor))hideCalendarPreview();
    const data=activityStatistics(entries,categoryIds,activityIds,range);
    const targets=filteredGoalTargets(categoryIds.length?categoryIds:null,filter.activityIds)
      .filter(({goal})=>!goalStartsAfter(goal,last))
      .map(target=>({...target,counts:goalCountsByPeriod(target.ids,target.goal,now,entries)}));
    const goals=goalStatistics(targets,first,last,now);
    const getScope=statsMeasureData(entries,filter,through);
    getScope('filters').goalReports=new Map([[statsPeriod+'|'+through,goals]]);
    let todayScope=through===now?getScope:null;
    renderStatsFavorites(root,through,now,filter,getScope,scope=>(todayScope??=statsMeasureData(entries,filter,now))(scope));
    const rangeName=statsPeriod==='year'?'Activités en '+first.slice(0,4):'Activités · '+statRangeLabel(first,last);
    const overview=statSection(root,'statsOverview',rangeName),cards=makeElement('div','stats-kpis');
    const metrics=[['count','Occurrences'],['distance','Distance totale'],['minutes','Durée totale']];
    if(statsPeriod==='week' || statsPeriod==='month')metrics.push(['days','Jours actifs']);
    for(const [metric,label] of metrics){
      const value=statisticTotal(data.total,metric),prior=statisticTotal(data.previous,metric);
      const detail=metric==='count'?streakValue(data.total.dates.size,'day')+(data.total.dates.size===1?' actif':' actifs'):null;
      cards.append(offerStatPin(statCard(label,statValue(metric,value),detail,metric,activityTrend(metric,value,prior,range)),
        statFavoritePreset(metric,statsPeriod,label)));
    }
    if(statsPeriod==='year'){
      const config=statFavoritePreset('count','month','Occurrences du mois');
      const {value,trend}=measureFavorite(config,getScope('filters'),through,now);
      const month=statMonthFormat.format(new Date(through+'T12:00:00'));
      cards.append(offerStatPin(statCard('Occurrences · '+month,value,null,config.metric,trend),config));
    }
    cards.style.setProperty('--stats-kpi-columns',cards.children.length);
    const regularity=makeElement('div','stats-regularity'),streakCards=makeElement('div','stats-kpis stats-streak-grid');
    regularity.append(makeElement('h3',null,'Régularité'),streakCards);
    for(const [metric,period,label] of [
      ['current','day','Séries quotidiennes'],['current','week','Séries hebdomadaires'],
      ['current','month','Séries mensuelles'],['goals',statsPeriod,favoriteGoalMetrics.goals]
    ]){
      const config=statFavoritePreset(metric,period,label);
      const {value,detail}=measureFavorite(config,getScope('filters'),through,now);
      streakCards.append(offerStatPin(statCard(label,value,detail,metric),config));
    }
    overview.append(cards,regularity);
    if(statsPeriod!=='day'){
      for(const [mode,label] of Object.entries(statsGraphModes)){
        const graph=renderStatsDayGraph(first,last,now,goals.outcomesByDate,data.countsByDate,mode);
        root.append(offerStatPin(graph,statFavoritePreset('graph-'+mode,statsPeriod,label)));
      }
    }

    const trends=statSection(root,'statsTrends','Tendances');
    const trendCards=makeElement('div','stats-kpis stats-comparison-grid');
    trendCards.style.setProperty('--stats-kpi-columns',3);
    for(const [metric,[baseMetric,label]] of Object.entries(trendMetrics)){
      const trend=activityTrend(baseMetric,statisticTotal(data.total,baseMetric),statisticTotal(data.previous,baseMetric),range);
      trendCards.append(offerStatPin(statCard(label,trend?.delta || '—',trend?null:'Aucune donnée à comparer',metric,trend),
        statFavoritePreset(metric,statsPeriod,label)));
    }
    trends.append(trendCards);
    renderStatisticsChart(root,statisticsChart(through,statsPeriod,getScope('filters')),through);

    const split=statSection(root,'statsDistribution','Répartition par catégorie');
    if(data.total.count)renderCategoryPie(split,data.categories,data.total.count);
    else appendWorkspaceEmpty(split,'Aucune activité enregistrée','Essaie une autre période ou une autre catégorie.');

    renderStatsGoals(root,goals);
    const streaks=statSection(root,'statsStreaks','Statistiques par activité','Une semaine est active dès qu’une occurrence est enregistrée. Une série enchaîne plusieurs semaines actives, du lundi au dimanche.');
    if(!data.ranked.length)appendWorkspaceEmpty(streaks,'Aucune série à afficher','Ajoute une activité pour commencer à suivre ta régularité.');
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
    renderLifetimeStatistics(root,entries,now);
    content.replaceChildren(root);
    updateSegmentIndicator(content.querySelector('.stats-metrics'));
    if(activeMetric)content.querySelector('[data-stats-metric="'+activeMetric+'"]')?.focus({preventScroll:true});
    if(activeGraph && activeDate)document.getElementById(activeGraph)?.querySelector('[data-date="'+activeDate+'"]')?.focus({preventScroll:true});
  }
  function renderLifetimeStatistics(root,entries,today){
    const section=statSection(root,'statsLifetime','Depuis le début');
    const counts=new Map(state.activities.map(activity=>[activity.id,0])),total=statTotals();
    for(const [date,ids] of entries){
      if(date>today)continue;
      for(const id of ids){
        if(!counts.has(id))continue;
        const detail=state.details[date]?.[id];
        counts.set(id,counts.get(id)+(Number(detail?.count) || 1));
        statSum(total,date,detail);
      }
    }
    const summary=makeElement('div','stats-kpis');
    for(const [metric,label] of [['count','Total des occurrences'],['days','Jours actifs'],['distance','Distance totale'],['minutes','Durée totale']]){
      const card=statCard(label,statValue(metric,statisticTotal(total,metric)),null,metric);
      summary.append(card);
    }
    section.append(summary);
    const cards=makeElement('div','stats-kpis stats-lifetime-activities');
    for(const activity of [...state.activities].sort((a,b)=>counts.get(b.id)-counts.get(a.id))){
      const count=counts.get(activity.id);
      if(!count)continue;
      const card=statCard(activity.name,statNumber.format(count),'Occurrences','activity');
      cards.append(card);
    }
    if(cards.children.length)section.append(makeElement('h3',null,'Par activité'),cards);
  }
  function renderReferenceStatsGraphs(period){
    const controls=$('#referenceStatsPeriods'),graphs=$('#referenceStatsGraphs');
    const today='2026-11-18',[first,last]=periodBounds(today,period);
    const counts=new Map(),outcomes=new Map();
    const goal={period:'day',mode:'min',target:3,unit:'count'};
    const exampleCounts=[0,2,5,1,8,12,4,0,3,6,1];
    for(let date=first,index=0;date<=today;date=shiftDate(date,'day',1),index++){
      const count=exampleCounts[index%exampleCounts.length];
      counts.set(date,count);
      outcomes.set(date,[{...evaluateGoal(goal,count,date,date,today),goal,name:'Activités'}]);
    }
    hideCalendarPreview();
    graphs.replaceChildren();
    for(const mode of Object.keys(statsGraphModes))graphs.append(renderStatsDayGraph(first,last,today,outcomes,counts,mode,{period,reference:true}));
    syncSegmentedSwitch(controls,'period',period);
  }
  function renderStatisticsChart(root,{title,buckets},through){
    const section=statSection(root,'statsMonthly',title),choices=makeElement('div','workspace-formats stats-metrics');
    const card=makeElement('div','stats-kpi stats-evolution-card stats-evolution-surface');
    const period=statsPeriod;
    const bars=statisticsBarChart(buckets,through,period,statsMetric);
    choices.setAttribute('role','group');choices.setAttribute('aria-label','Indicateur du graphique');
    function syncChartPin(){
      statCardActions(card).replaceChildren();
      const config={...statFavoritePreset('evolution',period,title+' · '+statsMetrics[statsMetric]),measure:statsMetric};
      offerStatPin(card,config,{kind:'evolution',period,metric:statsMetric});
    }
    Object.entries(statsMetrics).forEach(([metric,label])=>{
      const button=makeButton(label,()=>{
        if(statsMetric===metric)return;
        statsMetric=metric;
        syncSegmentedSwitch(choices,'statsMetric',metric);
        const updated=statisticsBarChart(buckets,through,period,metric);
        [...bars.children].forEach((item,index)=>{
          const next=updated.children[index];
          item.title=next.title;item.setAttribute('aria-label',next.title);
          item.firstElementChild.textContent=next.firstElementChild.textContent;
          item.querySelector('.stats-month-track>span').style.setProperty('--stats-height',next.querySelector('.stats-month-track>span').style.getPropertyValue('--stats-height'));
        });
        syncChartPin();
      });
      button.dataset.statsMetric=metric;button.setAttribute('aria-pressed',String(statsMetric===metric));choices.append(button);
    });
    section.classList.add('stats-evolution');
    syncChartPin();
    card.append(bars);section.append(card,choices);
  }
  function statisticsBarChart(buckets,through,period,metric){
    const chart=makeElement('ol','stats-months'),values=[...buckets.values()];
    chart.dataset.period=period;
    chart.style.setProperty('--stats-chart-columns',values.length);
    const peak=Math.max(1,...values.map(bucket=>statisticTotal(bucket,metric)));
    for(const bucket of values){
      const value=statisticTotal(bucket,metric),future=bucket.from>through,item=makeElement('li','stats-month');
      const amount=makeElement('strong',null,future?'—':statValue(metric,value));
      item.title=statRangeLabel(bucket.from,bucket.to)+' · '+(future?'À venir':amount.textContent);
      item.setAttribute('aria-label',item.title);
      const track=makeElement('span','stats-month-track'),fill=makeElement('span');
      track.setAttribute('aria-hidden','true');fill.style.setProperty('--stats-height',(value/peak*100)+'%');track.append(fill);
      item.append(amount,track,makeElement('span','stats-month-label',bucket.label));chart.append(item);
    }
    return chart;
  }
  window.addEventListener('resize',()=>{
    const choices=$('#statisticsContent .stats-metrics');
    if(choices)updateSegmentIndicator(choices);
  });
  const statsDatePickerOptions={maxYear:()=>new Date().getFullYear(),maxDate:()=>localDateKey(new Date())};
  bindDateNavigation('statsYearLabel','statsYear',statsDatePickerOptions);
  function setStatisticsDate(date){
    if(!date)return;
    const today=localDateKey(new Date());
    statsDate=date<today?date:null;
    rememberTemporalSelection(statsDate || today,statsPeriod);
    renderStatistics();persist();
  }
  $('#statsYear').addEventListener('change',event=>setStatisticsDate(event.target.value));
  $('#statsToday').addEventListener('click',()=>setStatisticsDate(localDateKey(new Date())));
  for(const [id,direction] of [['#statsPrevious',-1],['#statsNext',1]]){
    $(id).addEventListener('click',()=>{
      const today=localDateKey(new Date()),reference=statsDate || today;
      const target=shiftDate(reference,statsPeriod,direction);
      const onCurrentPeriod=periodBounds(target,statsPeriod)[0]===periodBounds(today,statsPeriod)[0];
      setStatisticsDate(onCurrentPeriod?today:target);
    });
  }
  for(const [period,label] of periodOptions){
    const button=makeButton(label,()=>{
      if(statsPeriod===period)return;
      statsPeriod=period;
      rememberTemporalSelection(sharedTemporalView?.date || statsDate || localDateKey(new Date()),period);
      renderStatistics();persist();
    });
    button.dataset.statsPeriod=period;
    statsPeriods.append(button);
  }
  addCompactSwitch(statsPeriods);

  function activityMeasurements(detail){
    return [(detail.count || 1)+' fois',detail.distance!=null?detail.distance+' km':'',detail.durationMinutes!=null?detail.durationMinutes+' min':''].filter(Boolean).join(' · ');
  }
  function occurrenceStepper(label,change,{canRemove,canAdd,amountLabel='une occurrence'}){
    const stepper=makeElement('div','daily-goal-stepper');
    for(const [direction,symbol,verb,enabled] of [[-1,'−','Retirer',canRemove],[1,'+','Ajouter',canAdd]]){
      const button=makeButton(symbol,()=>change(direction));
      button.setAttribute('aria-label',verb+' '+amountLabel+' de '+label);
      button.title=button.getAttribute('aria-label');
      button.disabled=!enabled;
      stepper.append(button);
    }
    return stepper;
  }
  function activityListStepper(activity,date){
    const count=state.details[date]?.[activity.id]?.count || 1;
    const label=activity.name+' · '+formatDate(date);
    return occurrenceStepper(label,direction=>{
      if(count+direction===0){confirmActivityRemoval(date,activity.id);return;}
      const activeLabel=document.activeElement?.getAttribute('aria-label');
      if(!saveActivitySession(date,activity.id,{count:count+direction},direction>0?'Occurrence ajoutée':'Occurrence retirée') || !activeLabel)return;
      const view=$('[data-workspace-page="'+currentPage+'"]');
      const buttons=[...view.querySelectorAll('.activity-record .daily-goal-stepper button')];
      const next=buttons.find(button=>button.getAttribute('aria-label')===activeLabel);
      (next?.disabled?next.parentElement.querySelector('button:not(:disabled)'):next)?.focus({preventScroll:true});
    },{canRemove:true,canAdd:count<1000});
  }

  function appendActivityListRow(body,activity,date,{showDate=true,dayOverview=false}={}){
    const detail=state.details[date]?.[activity.id] || {};
    const open=()=>openActivityEditor(date,activity.id,dayOverview);
    const row=body.insertRow();row.className='activity-record';
    if(dayOverview)row.classList.add('calendar-day-activity');
    row.style.setProperty('--activity-color',activity.color);
    makeEditableRecord(row,open,'Modifier l’activité : '+activity.name+' · '+formatDate(date));
    rowLabel(row,activity.name,dayOverview?null:categories.find(category=>category.id===activity.categoryId)?.name);
    if(showDate){
      const time=makeElement('time',null,formatDate(date));time.dateTime=date;row.insertCell().append(time);
    }
    row.insertCell().textContent=activityMeasurements(detail);
    const note=row.insertCell();note.className='list-note';note.textContent=detail.note || '—';if(detail.note)note.title=detail.note;
    const actions=makeElement('div','list-actions');
    const edit=makeButton('✎',open,'list-action');
    edit.setAttribute('aria-label','Modifier '+activity.name+(dayOverview?'':' · '+formatDate(date)));edit.title=edit.getAttribute('aria-label');
    if(!dayOverview)actions.append(activityListStepper(activity,date));
    actions.append(edit);row.insertCell().append(actions);
    makeResponsiveListRow(row,JSON.stringify(['activity',date,activity.id]),activity.name,activityMeasurements({count:detail.count}));
    return edit;
  }

  function activityRecordTile(activity,date){
    const detail=state.details[date]?.[activity.id] || {};
    const row=document.createElement('article');row.className='activity-record';row.style.setProperty('--activity-color',activity.color);
    row.setAttribute('role','button');
    makeEditableRecord(row,()=>openActivityEditor(date,activity.id),'Modifier l’activité : '+activity.name+' · '+formatDate(date),'editable-record-tile');
    const header=document.createElement('header');header.className='activity-tile-heading';
    const category=document.createElement('span');category.className='activity-tile-category';
    const owner=categories.find(item=>item.id===activity.categoryId);
    category.textContent=owner?categoryLabel(owner):'Activité';header.append(category);
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
    [['Séances',detail.count ?? null],['Distance',detail.distance!=null?detail.distance+' km':null],['Durée',detail.durationMinutes!=null?detail.durationMinutes+' min':null]].forEach(([label,value])=>{
      const metric=document.createElement('div'),term=document.createElement('dt'),amount=document.createElement('dd');
      term.textContent=label;amount.textContent=value ?? '—';metric.append(term,amount);measures.append(metric);
    });
    row.append(header,identity,measures);
    appendTileEditIndicator(row);
    return row;
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
        cardGridFor(date).append(activityRecordTile(activity,date));
      });
    });
    if(!root.children.length)appendWorkspaceEmpty(root,'Aucune activité enregistrée','Choisissez une autre période ou modifiez vos filtres.');
  }
  function renderCalendar() {
    hideCalendarPreview();
    const reference=activityReference(),period=activityPeriod(),calendar=$('#calendar');calendar.dataset.view=period;
    syncSegmentedSwitch($('#activityViews'),'calendarView',period);
    syncCompactSwitch($('#activityViews'));
    $('#activityDateControls').inert=period==='life';
    if(period!=='life')updateDateNavigation('periodLabel','calendarDateInput',reference,period);
    else showCenturyRange($('#periodLabel'));
    syncFormatButtons('activity',activityFormat);
    if(!calendarIsOpen('activities')){renderActivityRecords(calendarDateForYear(),$('#activityRecords'));return;}
    syncCalendarDayFormat();
    if(period==='life'){renderLifeCalendar();return;}
    if(period==='day'){
      calendar.replaceChildren();renderCalendarDay(calendar,reference);return;
    }
    if(period==='year')renderYearCalendar(Number(reference.slice(0,4)));
    else{
      calendar.replaceChildren();
      if(period==='month')renderMonth(calendar,reference);
      if(period==='week')renderWeek(calendar,reference,false);
    }
    if(period!=='week' && !activityResultCount(reference,period,visibleActivityIds())){
      appendWorkspaceEmpty(calendar,'Aucune activité enregistrée','Choisissez une autre période ou modifiez vos filtres.');
    }
  }
  function syncCalendarPanels(){
    const life=currentPage==='calendar' && calendarState.period==='life';
    $('#activityCalendarPanel').hidden=life || calendarScope!=='activities';
    $('#goalCalendarPanel').hidden=life || calendarScope!=='goals';
    $('#lifeCalendarPanel').hidden=!life;
    if(!life)$('#lifeCalendarGrid').replaceChildren();
  }
  function renderLifeCalendar(){
    const grid=$('#lifeCalendarGrid'),legend=$('#lifeCalendarLegend');
    $('#lifeCalendarEmpty').hidden=Boolean(birthDate);
    grid.parentElement.hidden=!birthDate;
    legend.hidden=!birthDate;
    if(!birthDate){grid.replaceChildren();legend.replaceChildren();return;}
    const startYear=Number(birthDate.slice(0,4)),endYear=startYear+99;
    const today=localDateKey(new Date()),[currentWeek]=periodBounds(today,'week');
    const entries=Object.entries(state.entries),goals=calendarScope==='goals';
    const targets=goals?calendarGoalTargets(today).filter(({goal})=>goal.period==='week')
      .map(target=>({...target,counts:goalCountsByPeriod(target.ids,target.goal,today,entries)})):[];
    const counts=new Map();
    if(!goals){
      const selected=visibleActivityIds();
      for(const [date,ids] of entries){
        if(date>today)continue;
        const count=ids.reduce((sum,id)=>sum+(selected.has(id)?Number(state.details[date]?.[id]?.count)||1:0),0);
        if(!count)continue;
        const [week]=periodBounds(date,'week');
        counts.set(week,(counts.get(week)||0)+count);
      }
    }
    const firstWeek=year=>periodBounds(year+'-01-04','week')[0];
    const first=firstWeek(startYear),last=firstWeek(endYear+1);
    let peak=1;
    for(const [date,count] of counts){if(date>=first && date<last)peak=Math.max(peak,count);}
    const content=document.createDocumentFragment(),axis=makeElement('div','life-calendar-row life-calendar-axis');
    axis.setAttribute('aria-hidden','true');
    axis.append(makeElement('span','life-calendar-year','Année'));
    for(const week of [1,10,20,30,40,50]){
      const label=makeElement('span',null,String(week));label.style.gridColumn=week+1;axis.append(label);
    }
    content.append(axis);
    let currentCell,firstCell;
    for(let year=startYear;year<=endYear;year++){
      const row=makeElement('div','life-calendar-row');
      const endOfYear=firstWeek(year+1);
      row.dataset.lifeYear=year;
      const marker=makeElement('span','life-calendar-year');
      if(year%10===0)marker.append(makeElement('span','life-calendar-decade',String(year)));
      row.append(marker);
      // ISO weeks belong to the year of their Thursday.
      for(let date=firstWeek(year),week=1;date<endOfYear;date=shiftDate(date,'week',1),week++){
        const button=makeElement('button','life-calendar-week');
        button.type='button';button.tabIndex=-1;button.dataset.date=date;
        const count=counts.get(date)||0;
        let detail=occurrenceLabel(count);
        if(date>today){button.dataset.tone='future';detail='À venir';}
        else if(goals){
          const end=shiftDate(date,'day',6);
          const outcomes=targets.flatMap(({goal,counts})=>goalStartsAfter(goal,end)?[]:[
            {...evaluateGoal(goal,counts.get(date)||0,date,end,today),goal}
          ]);
          const summary=summarizeGoalOutcomes(outcomes,end>=today);
          button.dataset.tone=summary.tone;detail=summary.label;
        }else button.dataset.intensity=Math.ceil(count/peak*4);
        button.title='Semaine '+week+' · '+year+' · '+detail;
        button.setAttribute('aria-label',button.title);
        if(date===currentWeek){button.setAttribute('aria-current','date');currentCell=button;}
        firstCell ||= button;
        row.append(button);
      }
      content.append(row);
    }
    (currentCell || firstCell).tabIndex=0;
    grid.replaceChildren(content);
    legend.replaceChildren(goals?calendarGoalLegend():contributionLegend());
  }
  const lifeCalendarGrid=$('#lifeCalendarGrid');
  function focusLifeWeek(button){
    lifeCalendarGrid.querySelector('[tabindex="0"]')?.setAttribute('tabindex','-1');
    button.tabIndex=0;button.focus({preventScroll:true});
    button.scrollIntoView?.({block:'nearest',inline:'nearest'});
  }
  $('#openBirthDateProfile').addEventListener('click',()=>{
    setPage('profile');
    $('#profileBirthDateLabel').focus();
  });
  lifeCalendarGrid.addEventListener('click',event=>{
    const week=event.target.closest('.life-calendar-week');
    if(!week)return;
    Object.assign(calendarState,{date:week.dataset.date,period:'week'});
    render();
    $(calendarScope==='goals'?'#goalDateLabel':'#periodLabel').focus();
  });
  lifeCalendarGrid.addEventListener('keydown',event=>{
    const button=event.target;
    if(!button.matches('.life-calendar-week') || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();
    const row=button.parentElement,index=[...row.children].indexOf(button);
    const nextRow=event.key==='ArrowUp'?row.previousElementSibling:row.nextElementSibling;
    const next=event.key==='ArrowLeft'?button.previousElementSibling:event.key==='ArrowRight'?button.nextElementSibling:
      nextRow?.children[Math.min(index,nextRow.childElementCount-1)];
    if(next?.matches('.life-calendar-week'))focusLifeWeek(next);
  });
  function visibleActivityIds() {
    const filter=activeQuickFilter(calendarIsOpen('activities')?'calendar':'activities');
    return new Set(activitiesForCategories(filterCategoryIds(filter)).map(item=>item.id)
      .filter(id=>filter.activityIds===null || filter.activityIds.includes(id)));
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
        summary.replaceChildren(status);
        if(statistics.count!==undefined)summary.append(makeElement('span','stats-preview-count',occurrenceLabel(statistics.count)));
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
    if(calendarPreviewAnchor?.matches('.stats-calendar-cell') && !calendarPreviewAnchor.contains(event.target) &&
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
  function calendarActivityAddButton(date,className){
    const button=makeButton('+',()=>openDailyActivityDialog({date}),className);
    button.setAttribute('aria-label','Ajouter une activité le '+formatDate(date));
    return button;
  }
  function renderMonth(container,reference) {
    const [year,month]=reference.split('-').map(Number),visible=visibleActivityIds();
    const grid=calendarMonthGrid(year,month-1,(key,day)=>{
      const activities=(state.entries[key] || []).filter(id=>visible.has(id)).map(activityById).filter(Boolean);
      const cell=makeElement('div','month-cell');
      cell.dataset.date=key;
      cell.classList.toggle('today',key===localDateKey(new Date()));
      const editDay=makeButton('',()=>openDayOverview(key),'month-day-edit');
      editDay.setAttribute('aria-label','Modifier la journée du '+formatDate(key));
      cell.append(editDay);
      cell.append(makeElement('strong',null,String(day)));
      if(activities.length){
        setActivityDayColors(cell,activities.map(activity=>activity.id));
        const list=makeElement('span','month-activities');
        activities.forEach(activity=>{
          const detail=state.details[key]?.[activity.id],label=makeButton('',()=>openActivityEditor(key,activity.id),'month-activity');
          label.style.setProperty('--activity-color',activity.color);
          label.setAttribute('aria-label','Modifier '+activity.name+' · '+formatDate(key));
          label.append(makeElement('span','month-activity-name',activity.name));
          if(detail?.count>1)label.append(makeElement('small',null,'×'+detail.count));
          list.append(label);
        });
        cell.append(list);
      }
      if(activities.some(activity=>state.details[key]?.[activity.id]?.note)){
        const marker=makeElement('span','month-note-marker','✎');marker.setAttribute('aria-hidden','true');cell.append(marker);
      }
      cell.append(calendarActivityAddButton(key,'month-day-add'));
      cell.addEventListener('click',event=>{if(!event.target.closest('button'))openDayOverview(key);});
      cell.addEventListener('contextmenu',event=>{event.preventDefault();openDayOverview(key);});
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
        ids.forEach(id=>{const activity=activityById(id);if(!activity)return;const button=makeButton('',()=>openActivityEditor(date,id),'week-activity');button.style.setProperty('--activity-color',activity.color);
          const name=document.createElement('strong');name.textContent=activity.name;
          const info=document.createElement('small');info.textContent=categoryLabel(categories.find(c=>c.id===activity.categoryId));
          const detail=state.details[date]?.[id];const text=document.createElement('span');text.textContent=[detail?.count>1?detail.count+' fois':'',detail?.distance!=null?detail.distance+' km':'',detail?.note || ''].filter(Boolean).join(' · ');button.append(name,info,text);column.append(button);});
        column.append(calendarActivityAddButton(date,'week-day-add'));
        column.classList.add('week-activity-editable');
        column.addEventListener('click',event=>{if(!event.target.closest('button'))openDayOverview(date);});
      }
    },date=>{
      if(agenda)setAgendaDate(date);
      else openDayOverview(date);
    });
  }
  function calendarDayHeading(date){
    const heading=document.createElement('h2');heading.className='calendar-day-heading';
    heading.textContent=new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(date+'T12:00:00'));
    return heading;
  }
  function normalizeCalendarDayFormats(value){
    return {activities:validFormat(value?.activities,'list'),goals:validFormat(value?.goals,'cards')};
  }

  function syncCalendarDayFormat(){
    syncCalendarPanels();
    calendarDayFormats.hidden=calendarState.period!=='day';
    syncSegmentedSwitch(calendarDayFormats,'calendarDayFormat',calendarState.dayFormats[calendarScope]);
  }
  function renderCalendarDay(container,date) {
    const section=makeElement('section','calendar-day');
    section.append(calendarDayHeading(date));
    const selected=visibleActivityIds();
    const activities=(state.entries[date] || []).filter(id=>selected.has(id)).map(activityById).filter(Boolean);
    if(calendarState.dayFormats.activities==='cards'){
      const grid=makeElement('div','activity-card-grid calendar-day-activity-cards');
      grid.append(...activities.map(activity=>activityRecordTile(activity,date)),calendarActivityAddButton(date,'calendar-day-add-tile'));
      section.append(grid);
    }else{
      if(activities.length){
        const body=listTable(section,'Activités de la journée',['Activité','Mesures','Note','Actions']);
        activities.forEach(activity=>appendActivityListRow(body,activity,date,{showDate:false}));
      }else appendWorkspaceEmpty(section,'Aucune activité enregistrée','Ajoutez une activité à cette journée ou modifiez vos filtres.');
      const add=calendarActivityAddButton(date,'calendar-day-add-row');
      add.append(makeElement('span',null,'Ajouter une activité'));
      section.append(add);
    }
    container.append(section);
  }
  function goalTargets(categoryId=null) {
    const chosen=Array.isArray(categoryId)?categories.filter(c=>categoryId.includes(c.id)):categoryId?categories.filter(c=>c.id===categoryId):categories;
    const targets=chosen.flatMap(parent=>{
      const activities=state.activities.filter(a=>a.categoryId===parent.id);
      return [...goalsOf(parent).map(goal=>({goal,item:parent,ids:activities.map(a=>a.id),category:true,parent})),...activities.flatMap(item=>goalsOf(item).map(goal=>({goal,item,ids:[item.id],parent})))];
    });
    const priority=new Map(state.goalOrder.map((id,index)=>[id,index]));
    return targets.sort((a,b)=>{
      return (priority.get(a.goal.id) ?? Infinity)-(priority.get(b.goal.id) ?? Infinity) || Number(b.goal.mode==='min')-Number(a.goal.mode==='min');
    });
  }
  function goalMatchesStatus(result,filter){
    if(result.tone==='empty')return false;
    if(result.missed)return filter==='all' || filter==='missed';
    if(filter==='exceeded')return result.surpassed;
    return filter==='all' || result.tone===filter || (filter==='success' && (result.surpassed || result.tone==='warning'));
  }
  function drawGoals(container,reference,categoryId=null,statusFilter='all',period=null,activityIds=null) {
    container.replaceChildren();
    const targets=filteredGoalTargets(categoryId,activityIds).filter(t=>(!period||t.goal.period===period)).map(t=>({...t,result:goalProgress(t.ids,t.goal,reference)})).filter(t=>goalMatchesStatus(t.result,statusFilter));
    if(!targets.length){
      if(container.classList.contains('calendar-goal-tiles'))appendWorkspaceEmpty(container,'Aucun objectif pour cette période',null,{compact:true});
      else appendEmpty(container,'Aucun objectif pour ces filtres. Définissez-en dans la gestion des activités ou des catégories.');
      return;
    }
    const daily=container.classList.contains('daily-goal-grid');
    const placement=container.classList.contains('agenda-placement-grid');
    const readStreak=goalStreakReader(reference);
    targets.forEach(target=>{
      const {goal,result}=target;
      const {card,progress}=createGoalCard(target,reference,readStreak,{daily,activityIds});
      container.append(card);
      animateGoalProgress(progress,result,goal,goal.id,container.closest('#agendaContent')?'agenda':container.closest('#goalHistory')?'calendar':'goals',reference);
      if(!placement)enableDirectReorder(card,goal.id,container,ordered=>{const full=goalTargets().map(t=>({id:t.goal.id}));state.goalOrder=reorderSubset(full,ordered).map(t=>t.id);render();},'.goal-drag');
    });
  }
  function createGoalCard({item,parent,category,goal,result,ids},reference,readStreak,{daily=true,activityIds=null}={}){
    const card=document.createElement('article');card.className='goal-card';card.dataset.goalId=goal.id;card.dataset.mode=goal.mode;card.dataset.display=goal.display || 'bar';card.dataset.tone=result.tone;card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label','Modifier l’objectif de '+item.name+' · '+goalDescription(goal));
    const head=document.createElement('div');head.className='goal-card-head';const label=document.createElement('p');label.className='eyebrow';label.textContent=category?'CATÉGORIE':categoryLabel(parent);
    head.append(label,dashboardPinButton(goalDashboardPin(item,goal),item.name));
    const drag=makeButton('⠿',()=>{},'goal-drag');
    drag.setAttribute('aria-label','Réorganiser l’objectif de '+item.name);head.append(drag);
    const name=document.createElement('h3');name.textContent=category?categoryLabel(item):item.name;
    const badge=goalStreakBadge(readStreak(ids,goal,result),goal.period);
    if(badge){
      card.setAttribute('aria-label',card.getAttribute('aria-label')+' · '+badge.getAttribute('aria-label'));
    }
    const measure=document.createElement('div');measure.className='goal-measure';
    const progress=createProgress(result,goal);
    if(goal.display==='check')progress.replaceChildren(goalStatusCheck(item,goal,result,ids,reference));
    if(daily && goal.display==='ring'){
      const digits=progress.querySelector('span').textContent.length;
      if(digits>10)progress.classList.add('ring-long-value');
    }
    if(!['ring','check','percent'].includes(goal.display)) {const amount=document.createElement('div');amount.className='goal-amount';const strong=document.createElement('strong');strong.textContent=measureValue(result.count,goal);const target=document.createElement('span');target.textContent=' / '+measureValue(goal.target,goal)+(goal.unit==='count'?'':' '+unitLabel(goal));amount.append(strong,target);measure.append(amount);}
    measure.append(progress);
    const description=document.createElement('p');description.className='goal-rule';description.textContent=goalDescription(goal);
    if(daily){
      const rule=goalRuleLabel(goal);
      const marker=document.createElement('span');marker.className='goal-bound';marker.textContent=rule;
      description.replaceChildren(marker,document.createTextNode(goalDescription(goal).slice(rule.length)));
    }
    const status=document.createElement('p');status.className='goal-status';status.textContent=result.status;
    const dates=document.createElement('small');dates.className='goal-dates';dates.textContent=result.start===result.end?formatDate(result.start):formatDate(result.start)+' — '+formatDate(result.end);
    const logging=document.createElement('div');logging.className='goal-logging';
    if(badge)logging.append(badge);
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
    return {card,progress};
  }
  function goalStatusCheck(item,goal,result,ids,reference){
    const control=makeElement('label','goal-check-control');
    const check=makeElement('input','goal-status-check');
    const mark=makeElement('span','goal-check-mark');
    const key=goal.period+':'+periodBounds(reference,goal.period)[0];
    const today=localDateKey(new Date());
    const noOccurrences=goalType(goal)==='none',logDate=reference<result.start?result.start:reference;
    const respected=tone=>['success','exceeded','warning'].includes(tone);
    check.type='checkbox';
    check.checked=respected(result.tone);
    check.disabled=['future','empty'].includes(result.tone) || reference>today;
    control.dataset.tone=result.tone;
    mark.textContent=check.disabled?'—':measureValue(result.count,goal);
    mark.setAttribute('aria-hidden','true');
    check.setAttribute('aria-label','Objectif de '+item.name+' · '+mark.textContent+' · '+result.status);
    control.append(check,mark);
    if(!check.disabled && (check.checked || result.tone==='danger')){
      const icon=makeElement('span','goal-check-state-icon');
      icon.innerHTML=collectionIcon(check.checked?'m5 12 4 4L19 6':'M6 6l12 12M18 6 6 18');
      control.append(icon);
    }
    check.addEventListener('change',()=>{
      const selected=check.checked;
      const checks={...goal.checks};
      const wantAmount=selected!==noOccurrences;
      const measurement=goal.unit==='distance'?'distance':goal.unit==='duration'?'durationMinutes':'count';
      const existing=Object.keys(state.entries).sort().reverse().find(date=>date>=result.start && date<=result.end && date<=today &&
        state.entries[date].some(id=>ids.includes(id) && measuredAmount(date,id,goal)>0));
      const undo=captureUndo('session',[...new Set([logDate,existing].filter(Boolean))]);
      if(wantAmount && ids.length && (noOccurrences?result.count===0:result.count<goal.target)){
        const amount=noOccurrences?(goal.unit==='duration' && goal.scale==='hours'?60:1):goal.target-result.count;
        const id=ids[0],previous=(state.entries[logDate] || []).includes(id)?measuredAmount(logDate,id,goal):0;
        if(!updateSession(logDate,id,{[measurement]:previous+amount},false)){check.checked=!selected;return;}
      }else if(!wantAmount && existing){
        const id=state.entries[existing].find(id=>ids.includes(id) && measuredAmount(existing,id,goal)>0);
        const detail=state.details[existing]?.[id];
        if(measurement!=='count' || (detail?.count || 1)>1 || !(detail?.note || detail?.distance || detail?.durationMinutes)){
          const amount=measurement==='count'?measuredAmount(existing,id,goal)-1:0;
          updateSession(existing,id,{[measurement]:amount},false);
        }
      }
      const actual=goalProgress(ids,{...goal,checks:{}},reference);
      if(ids.length || selected===respected(actual.tone))delete checks[key];
      else checks[key]=selected;
      const container=check.closest('table,.goal-card')?.parentElement;
      const restoreFocus=document.activeElement===check;
      const changed=actual.count!==result.count || checks[key]!==goal.checks?.[key];
      persistItem(item,{goals:goalsOf(item).map(rule=>rule.id===goal.id?{...rule,checks}:rule)},changed?'Objectif mis à jour':null,undo);
      if(restoreFocus){
        [...(container?.isConnected?container:document).querySelectorAll('[data-goal-id]')].find(tile=>tile.dataset.goalId===goal.id && tile.querySelector('.goal-status-check'))
          ?.querySelector('.goal-status-check').focus({preventScroll:true});
      }
    });
    return control;
  }
  function dailyGoalControls(item,goal,result,ids,date,category,showHint=true) {
    const controls=document.createElement('div');controls.className='daily-goal-controls';
    const recorded=state.entries[date] || [];
    function change(direction) {
      if(goal.unit==='duration'){
        stepGoalDuration(date,ids,goal,direction);
      }else if(category || goal.unit!=='count'){
        openDailyActivityDialog({date,categoryId:category?item.id:item.categoryId,ids,direction});
      }else{
        const count=recorded.includes(item.id)?state.details[date]?.[item.id]?.count || 1:0;
        saveActivitySession(date,item.id,{count:count+direction},direction>0?'Occurrence ajoutée':'Occurrence retirée');
      }
    }
    const canLog=date>=result.start;
    controls.append(occurrenceStepper(item.name+' · objectif '+goal.id,change,{
      canRemove:canLog && ids.some(id=>recorded.includes(id) && (goal.unit!=='duration' || measuredAmount(date,id,goal)>0)),canAdd:canLog && Boolean(ids.length),
      amountLabel:goal.unit==='duration'?(goal.scale==='hours'?'une heure':'une minute'):undefined
    }));
    if(showHint && !ids.length){const hint=document.createElement('small');hint.className='muted';hint.textContent='Ajoutez une activité à cette catégorie.';controls.append(hint);}
    return controls;
  }
  function stepGoalDuration(date,ids,goal,direction){
    const step=goal.scale==='hours'?60:1;
    const recorded=(state.entries[date] || []).filter(id=>ids.includes(id));
    if(direction>0){
      const id=recorded.find(activityId=>measuredAmount(date,activityId,goal)>0) || recorded[0] || ids[0];
      if(id)saveActivitySession(date,id,{durationMinutes:measuredAmount(date,id,goal)+step},'Durée mise à jour');
      return;
    }
    let remaining=step;
    const undo=captureUndo('session',[date]);
    for(const id of recorded){
      const duration=measuredAmount(date,id,goal);
      const removed=Math.min(duration,remaining);
      if(removed>0 && updateSession(date,id,{durationMinutes:duration-removed},false))remaining-=removed;
      if(remaining===0)break;
    }
    if(remaining<step){render();refreshSaveIndicators();showSaveToast('Durée mise à jour',undo());}
  }
  function objectiveLogRow(activity,date,goal) {
    const row=document.createElement('div');row.className='objective-log-row';
    const included=(state.entries[date] || []).includes(activity.id),count=included?state.details[date]?.[activity.id]?.count || 1:0;
    const name=document.createElement('span');name.className='objective-log-name';name.textContent=activity.name;row.append(name);
    const controls=document.createElement('div');controls.className='objective-log-controls';
    const duration=goal.unit==='duration';
    const amount=duration?measuredAmount(date,activity.id,goal):count;
    const change=direction=>duration?stepGoalDuration(date,[activity.id],goal,direction):saveActivitySession(date,activity.id,{count:count+direction},direction>0?'Occurrence ajoutée':'Occurrence retirée');
    const minus=makeButton('−',()=>change(-1));minus.disabled=!amount;minus.setAttribute('aria-label','Retirer '+(duration?(goal.scale==='hours'?'une heure':'une minute'):'une occurrence')+' de '+activity.name+' · objectif '+goal.id);
    const number=document.createElement('span');number.textContent=duration?measureValue(amount,goal):count;
    const plus=makeButton('+',()=>change(1));plus.setAttribute('aria-label','Ajouter '+(duration?(goal.scale==='hours'?'une heure':'une minute'):'une occurrence')+' de '+activity.name+' · objectif '+goal.id);
    controls.append(minus,number,plus);
    if(goal.unit==='distance'||goal.unit==='duration'){
      const metric=document.createElement('label');metric.className='objective-metric';const input=document.createElement('input');input.type='number';input.min='0';input.max=goal.unit==='distance'?'100000':'1000000';input.step='any';const field=goal.unit==='distance'?'distance':'durationMinutes',scale=goal.unit==='duration'&&goal.scale==='hours'?60:1;input.value=state.details[date]?.[activity.id]?.[field]!=null?state.details[date][activity.id][field]/scale:'';input.placeholder='—';input.setAttribute('aria-label',unitLabel(goal)+' de '+activity.name+' · objectif '+goal.id);input.addEventListener('change',()=>{if(input.checkValidity())saveActivitySession(date,activity.id,{[field]:input.value===''?null:Number(input.value)*scale});});metric.append(input,document.createTextNode(unitLabel(goal)));controls.append(metric);withNumberStepper(input,'change');
    }
    row.append(controls);return row;
  }
  function appendGoalSegments(track,outcomes){
    const toneOrder={danger:0,warning:1,success:2,exceeded:3,pending:4,future:4};
    [...outcomes].sort((left,right)=>toneOrder[left.tone]-toneOrder[right.tone]).forEach(({name,goal,status,tone})=>{
      const segment=makeElement('span');
      segment.dataset.tone=tone;
      segment.title=name+' · '+goalDescription(goal)+' · '+status;
      track.append(segment);
    });
  }
  function renderGoalSummary(targets,date,progressContainer,period) {
      const overview=document.createElement('div');overview.className='day-overview daily-focus-summary';
      const outcomes=targets.map(({item,ids,goal})=>{
        const result=goalProgress(ids,goal,date);
        const tone=result.tone;
        return {item,goal,result,tone};
      });
      const atLimit=outcomes.filter(({tone})=>tone==='warning').length;
      const positiveExceeded=outcomes.filter(({result})=>result.surpassed).length;
      const completed=outcomes.filter(({tone,result})=>tone==='success' || result.surpassed).length+atLimit;
      const missed=outcomes.filter(({result})=>result.missed).length;
      const overLimit=outcomes.filter(({tone,result})=>tone==='danger' && !result.missed).length;
      const upcoming=outcomes.filter(({tone})=>tone==='future').length;
      const count=document.createElement('strong');count.textContent=completed+' / '+targets.length;
      const track=document.createElement('div');track.className='day-total-progress';
      if(targets.length){
        const frequency=goalFrequencyOptions.find(([key])=>key===period)?.[1].toLowerCase();
        track.setAttribute('role','progressbar');
        track.setAttribute('aria-label',frequency?'Objectifs '+frequency+' respectés':'Objectifs de la période respectés');
        track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(targets.length));track.setAttribute('aria-valuenow',String(completed));
        track.setAttribute('aria-valuetext',completed+' sur '+targets.length+' respectés'+(positiveExceeded?', dont '+positiveExceeded+(positiveExceeded>1?' objectifs surpassés':' objectif surpassé'):'')+(atLimit?', dont '+atLimit+' à la limite':'')+', '+overLimit+' limites dépassées, '+(targets.length-completed-overLimit-missed-upcoming)+' à accomplir'+(missed?', '+missed+' non atteints':'')+(upcoming?', '+upcoming+' à venir':''));
      }else track.setAttribute('aria-hidden','true');
      appendGoalSegments(track,outcomes.map(({item,goal,result,tone})=>({name:item.name,goal,status:result.status,tone})));
      overview.append(count,track);progressContainer.append(overview);
  }
  let agendaPlacement;
  function placeAgendaGoals(grid){
    const columns=cardColumnCount(grid),layoutKey='dailyGoalSlots'+columns;
    grid.dataset.columns=columns;
    const cards=new Map([...grid.querySelectorAll('.goal-card')].map(card=>[card.dataset.goalId,card]));
    if(!cards.size)return;
    const dailyIds=new Set(goalTargets().filter(({goal})=>goal.period==='day').map(({goal})=>goal.id));
    const orders=sectionLayout.orders;
    const saved=orders[layoutKey] || orders.dailyGoalOrder ||
      ((columns===1 && orders.dailyGoalSlots2) || orders.dailyGoalSlots3 || orders.dailyGoalSlots5 || Object.entries(orders).find(([key])=>/^dailyGoalSlots/.test(key))?.[1])?.filter(Boolean);
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
      slots=[...cards.keys()];
    }
    const lastVisible=slots.findLastIndex(id=>cards.has(id));
    const visibleSize=Math.ceil((lastVisible+1)/columns)*columns;
    const layout=new Map();
    function position(key,card,index){
      card.dataset.agendaSlot=index;
      card.style.gridColumn=String(index%columns+1);
      card.style.gridRow=String(Math.floor(index/columns)+1);
    }
    const ordered=new Map();
    slots.forEach((key,index)=>{
      if(!cards.has(key))return;
      const card=cards.get(key);
      position(key,card,index);
      layout.set(key,index);ordered.set(key,card);
    });
    const targets=Array.from({length:visibleSize+columns},(_,index)=>{
      const cell=makeElement('div','agenda-goal-slot tile-drop-cell');
      cell.hidden=index>=visibleSize || cards.has(slots[index]);
      cell.setAttribute('aria-hidden','true');position(null,cell,index);
      return cell;
    });
    grid.replaceChildren(...ordered.values(),...targets);
    const order=[...ordered.keys()],indexes=[...layout.values()];
    function preview(key,index){
      const from=layout.get(key);
      if(from===index)return layout;
      const moved=new Map(layout);
      if(!cards.has(slots[index])){
        moved.set(key,index);
        return moved;
      }
      const next=[...order],destination=next.indexOf(slots[index]);
      next.splice(next.indexOf(key),1);
      next.splice(destination,0,key);
      next.forEach((id,offset)=>moved.set(id,indexes[offset]));
      return moved;
    }
    function commit(moved,key){
      const next=Array.from({length:slots.length},(_,index)=>cards.has(slots[index])?'':slots[index] || '');
      for(const [id,slot] of moved)next[slot]=id;
      for(const slotKey of Object.keys(sectionLayout.orders)){
        if(slotKey.startsWith('dailyGoalSlots'))delete sectionLayout.orders[slotKey];
      }
      sectionLayout.orders.dailyGoalOrder=next.filter(Boolean);
      sectionLayout.orders[layoutKey]=Array.from(next.slice(0,next.findLastIndex(Boolean)+1),id=>id || '');
      renderWorkspace();persist();
      [...$('#agendaGoals').querySelectorAll('.goal-card')].find(card=>card.dataset.goalId===key)
        ?.querySelector('.goal-drag').focus({preventScroll:true});
    }
    agendaPlacement=new AbortController();
    bindTilePlacement(grid,{columns,cards:ordered,targets,layout,preview,commit,position,
      slotAttribute:'agendaSlot',signal:agendaPlacement.signal});
  }

  function bindTilePlacement(grid,{columns,cards,targets,layout,preview,commit,position,slotAttribute,signal}){
    const options={signal},initialVisibility=targets.map(cell=>cell.hidden);
    let drag;
    function apply(positions,animate){
      const before=new Map();
      if(animate){
        for(const [key,card] of cards){
          if(!card.classList.contains('is-dragging'))before.set(key,card.getBoundingClientRect());
        }
      }
      for(const [key,card] of cards){
        card.getAnimations?.().forEach(animation=>animation.cancel());
        position(key,card,positions.get(key));
      }
      for(const [key,rect] of before){
        const card=cards.get(key),after=card.getBoundingClientRect();
        const x=rect.left-after.left,y=rect.top-after.top;
        if(x || y)card.animate?.([{transform:`translate(${x}px,${y}px)`},{transform:'none'}],
          {duration:180,easing:'cubic-bezier(.2,.8,.2,1)'});
      }
    }
    function targetAt(event){
      // Keep hit targets at fixed grid positions while the tiles animate below them.
      const target=document.elementFromPoint?.(event.clientX,event.clientY)?.closest('.tile-drop-cell');
      if(target?.parentElement===grid)return target;
      const rect=grid.getBoundingClientRect(),{clientX:x,clientY:y}=event;
      return x>=rect.left && x<=rect.right && y>=rect.top && y<=rect.bottom?drag?.over:null;
    }
    function finish(target=null){
      if(!drag)return;
      const {key,card,lift}=drag;
      drag=null;
      lift?.ghost.remove();
      card.classList.remove('is-dragging');
      targets.forEach((cell,index)=>{cell.hidden=initialVisibility[index];});
      grid.classList.remove('is-placing-goal');
      const moved=target?preview(key,Number(target.dataset[slotAttribute])):layout;
      if(moved===layout)apply(layout,false);
      else commit(moved,key);
    }
    signal.addEventListener('abort',()=>finish(),{once:true});
    document.addEventListener('keydown',event=>{
      if(!drag || event.key!=='Escape')return;
      event.preventDefault();
      const handle=drag.card.querySelector('.goal-drag');
      finish();
      handle.focus({preventScroll:true});
    },options);
    grid.addEventListener('pointermove',event=>{
      if(!drag || event.pointerId!==drag.pointerId)return;
      if(!drag.lift){
        if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<6)return;
        drag.lift=liftItem(drag.card,drag.x,drag.y);
        grid.classList.add('is-placing-goal');
        targets.forEach(cell=>{cell.hidden=false;});
      }
      moveLift(drag.lift,event.clientX,event.clientY);
      const target=targetAt(event);
      if(drag.over===target)return;
      drag.over=target;
      const arrangement=target?preview(drag.key,Number(target.dataset[slotAttribute])):layout;
      apply(arrangement,!matchMedia('(prefers-reduced-motion: reduce)').matches);
    },options);
    grid.addEventListener('pointerup',event=>{
      if(drag?.pointerId===event.pointerId)finish(drag.lift?targetAt(event):null);
    },options);
    for(const eventName of ['pointercancel','lostpointercapture']){
      grid.addEventListener(eventName,event=>{if(drag?.pointerId===event.pointerId)finish();},options);
    }
    for(const [key,card] of cards){
      const handle=card.querySelector('.goal-drag');
      handle.addEventListener('pointerdown',event=>{
        if(event.button!==0 || drag)return;
        event.preventDefault();handle.focus({preventScroll:true});
        drag={key,card,pointerId:event.pointerId,x:event.clientX,y:event.clientY};
        grid.setPointerCapture?.(event.pointerId);
      },options);
      handle.addEventListener('keydown',event=>{
        const offset={ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns}[event.key];
        if(!event.altKey || !offset || drag)return;
        event.preventDefault();
        const from=layout.get(key),to=from+offset;
        const horizontal=event.key==='ArrowLeft' || event.key==='ArrowRight';
        if(to<0 || to>=targets.length || (horizontal && Math.floor(from/columns)!==Math.floor(to/columns)))return;
        const moved=preview(key,to);
        if(moved!==layout)commit(moved,key);
      },options);
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
        goalCategoryFilter = null;goalCategoryIds=null;
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
        goalCategoryFilter = null;goalCategoryIds=null;
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
    if(currentPage==='dashboard')renderDashboard();
    if(currentPage==='catalog')renderTrackingCatalog();
    if(currentPage!=='day')return;
    if($('#agendaDate').value!==agendaDate)$('#dailyActivityFeedback').textContent='';
    agendaView='day';updateDateNavigation('agendaDateLabel','agendaDate',agendaDate);
    agendaPlacement?.abort();
    const content=$('#agendaGoals'),progress=$('#agendaProgress');content.replaceChildren();progress.replaceChildren();renderChecklist(content,agendaDate,null,false,progress);
  }

  window.addEventListener('resize',()=>{
    if(currentPage==='dashboard' && dashboardGrids.some(grid=>grid.querySelector('[data-dashboard-tile]') &&
      Number(grid.dataset.columns)!==cardColumnCount(grid)))renderDashboard();
    const grid=$('#agendaGoals .agenda-placement-grid');
    if(currentPage==='day' && grid && !grid.classList.contains('is-placing-goal') &&
      Number(grid.dataset.columns)!==cardColumnCount(grid))renderWorkspace();
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
    $('#dailyActivityEmpty').textContent=direction>0?'Crée d’abord une activité dans Menu du compte → Catalogue.':'Aucune activité enregistrée à retirer ce jour.';
    $('#dailyActivityDetails').hidden=!available.length;
    refreshDailyActivityChoice();
  }
  function openDailyActivityDialog({date=agendaDate,categoryId=null,ids=null,direction=1}={}) {
    dailyActivityContext={date,categoryId,ids,direction};
    dailyActivityForm.reset();
    dailyActivityCategory.replaceChildren();dailyActivityChoice.replaceChildren();
    $('#dailyActivityNote').closest('label').hidden=direction<0;
    $('#dailyActivityTitle .daily-activity-title-icon').toggleAttribute('hidden',direction<0);
    $('#dailyActivityTitle > span').textContent=direction>0?'Ajouter une activité':'Retirer une activité';
    $('#saveDailyActivity').textContent=direction>0?'Enregistrer l’activité':'Confirmer le retrait';
    refreshDailyActivityDate();
    dailyActivityBaseline=dailyActivitySnapshot();
    dailyActivityDialog.showModal();
    if(!dailyActivityCategory.disabled)dailyActivityCategory.focus();
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
    saveActivitySession(date,activity.id,{count,distance,durationMinutes,note},
      direction>0?'Activité enregistrée':count?'Occurrence retirée':'Activité retirée');
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
    const activity=activityById(id);
    for(const owner of [activity,categories.find(category=>category.id===activity.categoryId)]){
      for(const goal of goalsOf(owner)){
        if(goal.display!=='check' || !goal.checks || goalStartsAfter(goal,date))continue;
        const previous=included?(goal.unit==='distance'?existing.distance || 0:goal.unit==='duration'?existing.durationMinutes || 0:existing.count || 1):0;
        const current=value.count?measuredAmount(date,id,goal):0;
        if(previous!==current)delete goal.checks[goal.period+':'+periodBounds(date,goal.period)[0]];
      }
    }
    // Newly checked activities remain visible in the current category's filters.
    if(currentPage!=='calendar' && value.count && activityById(id).categoryId===state.activeCategory && !state.selectedActivities.includes(id))state.selectedActivities.push(id);
    if(commit){render();refreshSaveIndicators();}
    return true;
  }
  function saveActivitySession(date,id,patch,message){
    const recorded=(state.entries[date] || []).includes(id);
    const undo=captureUndo('session',[date]);
    if(!updateSession(date,id,patch))return false;
    const remains=(state.entries[date] || []).includes(id);
    if(recorded || remains)showSaveToast(message || (!remains?'Activité retirée':recorded?'Activité mise à jour':'Activité enregistrée'),undo());
    return true;
  }
  function persistItem(item,patch,message,undo=message?captureUndo('catalog'):null) {
    const activity=state.activities.find(a=>a.id===item.id),category=categories.find(c=>c.id===item.id),target=activity || category;if(!target)return;
    Object.entries(patch).forEach(([key,value])=>{if(key==='goal' && !value)delete target.goal;else target[key]=JSON.parse(JSON.stringify(value));});
    render();refreshSaveIndicators();
    if(message)showSaveToast(message,undo?.());
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
  const saveToastMessage=$('#saveToastMessage');
  const activeSaveToasts=new Map();
  const saveToastHome=saveToast.parentElement;
  const modalOrder=[];
  function syncSaveToastHost(){
    if(!activeSaveToasts.size)return;
    const focused=document.activeElement?.closest('dialog[open]');
    const host=focused || modalOrder.findLast(dialog=>dialog.open) || saveToastHome;
    if(saveToast.parentElement===host)return;
    saveToast.hidePopover?.();
    host.append(saveToast,saveToastMessage);
    saveToast.showPopover?.();
  }
  new MutationObserver(records=>{
    for(const {target} of records){
      if(target.tagName!=='DIALOG')continue;
      const index=modalOrder.indexOf(target);
      if(index!==-1)modalOrder.splice(index,1);
      if(target.open)modalOrder.push(target);
    }
    syncSaveToastHost();
  }).observe(document.getElementById('app'),{subtree:true,attributes:true,attributeFilter:['open']});
  function removeSaveToast(item){
    const stop=activeSaveToasts.get(item);
    if(!stop)return;
    stop();
    activeSaveToasts.delete(item);
    item.remove();
    if(activeSaveToasts.size)return;
    saveToast.hidePopover?.();
    saveToast.removeAttribute('data-visible');
    saveToastHome.append(saveToast,saveToastMessage);
    saveToastMessage.textContent='';
  }
  if(typeof ResizeObserver==='function'){
    new ResizeObserver(([{contentRect}])=>{
      saveToastHome.style.setProperty('--toast-stack-height',contentRect.height+'px');
    }).observe(saveToast);
  }
  function sameUndoValue(a,b){
    return JSON.stringify(a)===JSON.stringify(b);
  }
  function captureUndo(scope,dates){
    // Store inverses for changed records only so other recent actions remain intact.
    const snapshots=[];
    function watch(read,write,key){
      const before=JSON.parse(JSON.stringify(read()));
      snapshots.push(()=>{
        const after=JSON.parse(JSON.stringify(read()));
        if(sameUndoValue(before,after))return null;
        if(key){
          const previous=new Map(before.map(item=>[key(item),item]));
          const next=new Map(after.map(item=>[key(item),item]));
          const changes=[...new Set([...previous.keys(),...next.keys()])]
            .filter(id=>!sameUndoValue(previous.get(id),next.get(id)));
          const previousOrder=[...previous.keys()].filter(id=>next.has(id));
          const nextOrder=[...next.keys()].filter(id=>previous.has(id));
          const reordered=!sameUndoValue(previousOrder,nextOrder);
          return ()=>{
            const live=read(),current=new Map(live.map(item=>[key(item),item]));
            if(changes.some(id=>!sameUndoValue(current.get(id),next.get(id))))return null;
            if(reordered && !sameUndoValue([...current.keys()].filter(id=>previous.has(id)&&next.has(id)),nextOrder))return null;
            for(const id of changes){
              if(previous.has(id))current.set(id,previous.get(id));
              else current.delete(id);
            }
            const target=[...current.keys()];
            const removed=changes.filter(id=>previous.has(id)&&!next.has(id));
            for(const id of removed){
              target.splice(target.indexOf(id),1);
              const successor=[...previous.keys()].slice([...previous.keys()].indexOf(id)+1).find(other=>target.includes(other));
              target.splice(successor===undefined?target.length:target.indexOf(successor),0,id);
            }
            if(reordered){
              let index=0;
              for(let position=0;position<target.length;position++){
                if(previousOrder.includes(target[position]))target[position]=previousOrder[index++];
              }
            }
            return ()=>write(target.map(id=>current.get(id)));
          };
        }
        return ()=>sameUndoValue(read(),after)?()=>write(before):null;
      });
    }
    const keyed=item=>item.id;
    if(scope==='preferences'){
      const appearanceKeys=['favoriteStarStyle','goalAppearance','compactGoalTiles','activityAppearance','gradientButtons','useExceededColor',
        'useUnderLimitColor','showStreakFlames','streakFlameStyle','streakFlameFinish','streakTiers','streakPaletteVersion'];
      watch(()=>{
        const profile=exportInterface();
        return {
          appearance:Object.fromEntries(appearanceKeys.map(key=>[key,profile[key]])),
          theme:state.theme,accent:state.accent,goalColors:state.goalColors,
          defaultViews,navigationTabs,shareWorkspaceFilters,rememberWorkspaceFilters,stickyHeader,stickyWorkspaceControls,
          sharedFilters,shareWorkspaceDates,rememberWorkspaceDates,sharedTemporalView,sections:sectionLayout.orders.dashboardSections
        };
      },before=>{
        Object.assign(state,{theme:before.theme,accent:before.accent,goalColors:before.goalColors});
        restoreAppearanceSettings(before.appearance);
        updateAppearance();
        ({defaultViews,navigationTabs,shareWorkspaceFilters,rememberWorkspaceFilters,stickyHeader,stickyWorkspaceControls,sharedFilters,shareWorkspaceDates,rememberWorkspaceDates,sharedTemporalView}=before);
        if(before.sections)sectionLayout.orders.dashboardSections=before.sections;
        else delete sectionLayout.orders.dashboardSections;
        applyNavigationTabs();
        renderDefaultViewSettings();
        renderNavigationSettings();
        renderDashboardSectionSettings();
        if(navigationTabs[currentPage]===false)setPage(currentPage,false);
      });
    }
    if(scope==='devices')watch(()=>demoDevices,value=>{demoDevices=value;renderProfileDevices();},device=>device);
    if(scope==='collections'){
      watch(()=>statsFavorites,value=>{statsFavorites=value;},keyed);
      watch(()=>dashboardPins,value=>{dashboardPins=value;},dashboardPinKey);
    }
    if(scope==='catalog' || scope==='session'){
      watch(()=>categories,value=>{categories=value;},keyed);
      watch(()=>state.activities,value=>{state.activities=value;},keyed);
    }
    const affectedSessions=[];
    for(const date of dates || []){
      function readSessions(){
        const ids=state.entries[date] || [],details=state.details[date] || {};
        return [...new Set([...ids,...Object.keys(details)])].map(id=>({id,logged:ids.includes(id),detail:details[id] || null}));
      }
      const before=scope==='session'?readSessions():null;
      if(before)affectedSessions.push(()=>{
        const current=new Map(readSessions().map(session=>[session.id,session]));
        return before.filter(session=>!sameUndoValue(session,current.get(session.id))).map(session=>session.id);
      });
      watch(readSessions,sessions=>{
        const ids=sessions.filter(session=>session.logged).map(session=>session.id);
        const details=Object.fromEntries(sessions.filter(session=>session.detail).map(session=>[session.id,session.detail]));
        if(ids.length)state.entries[date]=ids;
        else delete state.entries[date];
        if(Object.keys(details).length)state.details[date]=details;
        else delete state.details[date];
      },keyed);
    }
    const activityIds=scope==='catalog'?new Set(state.activities.map(keyed)):null;
    const categoryIds=scope==='catalog'?new Set(categories.map(keyed)):null;
    return ()=>{
      const changes=snapshots.map(finish=>finish()).filter(Boolean);
      if(!changes.length)return undefined;
      const requiredActivities=affectedSessions.flatMap(getIds=>getIds());
      const newActivities=activityIds?state.activities.map(keyed).filter(id=>!activityIds.has(id)):[];
      const newCategories=categoryIds?categories.map(keyed).filter(id=>!categoryIds.has(id)):[];
      return ()=>{
        if(requiredActivities.some(id=>!activityById(id)))return false;
        if(newActivities.length && Object.values(state.entries).some(ids=>ids.some(id=>newActivities.includes(id))))return false;
        if(newCategories.length && state.activities.some(item=>newCategories.includes(item.categoryId)))return false;
        const restores=changes.map(prepare=>prepare());
        if(restores.some(restore=>!restore))return false;
        restores.forEach(restore=>restore());
        if(scope==='catalog' || scope==='session')reconcileCategories();
        render();
        if(onboardingDialog.open)renderOnboarding();
        refreshSaveIndicators();
        return true;
      };
    };
  }
  function showSaveToast(message,undo){
    const opener=document.activeElement;
    const item=makeElement('div','save-toast-item');
    const clip=makeElement('div','save-toast-clip');
    const toast=makeElement('div','save-toast');
    const icon=makeElement('span','save-toast-icon');
    icon.innerHTML=collectionIcon('m5 12 4 4L19 6');
    let timer,exitTimer;
    const dismiss=()=>{
      if(item.hasAttribute('data-leaving'))return;
      clearTimeout(timer);
      if(item.contains(document.activeElement) && opener?.isConnected)opener.focus({preventScroll:true});
      item.setAttribute('data-leaving','');
      item.inert=true;
      if(matchMedia('(prefers-reduced-motion: reduce)').matches || !item.animate){
        removeSaveToast(item);
        return;
      }
      item.addEventListener('animationend',event=>{
        if(event.target===item && event.animationName==='save-toast-collapse')removeSaveToast(item);
      });
      exitTimer=setTimeout(()=>removeSaveToast(item),240);
    };
    const close=makeButton('',dismiss,'save-toast-close');
    close.innerHTML=collectionIcon('M6 6l12 12M18 6 6 18');
    close.setAttribute('aria-label','Fermer la notification : '+message);
    toast.append(icon,makeElement('span','save-toast-text',message));
    if(undo){
      const button=makeButton('Annuler',()=>{
        const restored=undo();
        dismiss();
        showSaveToast(restored?'Action annulée':'Annulation impossible · les données ont changé');
      },'save-toast-undo');
      button.setAttribute('aria-label','Annuler : '+message);
      toast.append(button);
    }
    toast.append(close);
    clip.append(toast);
    item.append(clip);
    activeSaveToasts.set(item,()=>{clearTimeout(timer);clearTimeout(exitTimer);});
    saveToast.append(item);
    const wasVisible=saveToast.hasAttribute('data-visible');
    saveToast.dataset.visible='true';
    const host=saveToast.parentElement;
    syncSaveToastHost();
    if(!wasVisible && host===saveToast.parentElement)saveToast.showPopover?.();
    saveToastMessage.textContent=message;
    saveToast.scrollTop=saveToast.scrollHeight;
    const pause=()=>clearTimeout(timer);
    const resume=()=>{
      pause();
      if(activeSaveToasts.has(item) && !item.hasAttribute('data-leaving') && !item.matches(':hover') && !item.contains(document.activeElement)){
        timer=setTimeout(dismiss,5000);
      }
    };
    item.addEventListener('pointerenter',pause);
    item.addEventListener('pointerleave',resume);
    item.addEventListener('focusin',pause);
    item.addEventListener('focusout',()=>queueMicrotask(resume));
    resume();
  }
  document.addEventListener('calendar-save-toast-dismiss',()=>{
    for(const item of activeSaveToasts.keys())removeSaveToast(item);
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
        // Count each recorded day once per goal instead of rescanning the entire activity history for every period.
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
  let goalCategoryIds=null,goalCategoryFilter=null,goalStatusFilter='all',goalActivityFilter=null,goalEditorOwner=null;
  function goalsOf(item) {return Array.isArray(item?.goals)?item.goals:item?.goal?[{id:'legacy-'+item.id,unit:'count',display:'bar',...item.goal}]:[];}
  function allowsGoalCheckbox(mode,target){
    return mode==='none' || (mode==='min' && target===1);
  }
  function normalizeGoalItem(item) {
    const goals=goalsOf(item).map((goal,index)=>{
      const normalized={unit:'count',display:'bar',...goal,id:goal.id || 'legacy-'+item.id+'-'+index};
      if(normalized.display==='check' && !allowsGoalCheckbox(goalType(normalized),measureValueForInput(normalized)))normalized.display='bar';
      return normalized;
    });
    const copy={...item,goals};
    delete copy.goal;
    return copy;
  }
  function measureValueForInput(goal){
    return goal.unit==='duration' && goal.scale==='hours'?goal.target/60:goal.target;
  }
  function validGoalDate(value){
    if(typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.slice(0,4)==='0000')return false;
    const date=new Date(value+'T12:00:00');
    return Number.isFinite(date.getTime()) && String(date.getFullYear()).padStart(4,'0')+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate())===value;
  }
  function validGoal(goal) {return (!goal.startDate || validGoalDate(goal.startDate)) && ['min','max'].includes(goal.mode) && ['day','week','month','year'].includes(goal.period) && ['count','distance','duration'].includes(goal.unit || 'count') && Number.isFinite(goal.target) && (goal.mode==='max'?goal.target>=0:goal.target>0) && goal.target<=1000000 && ((goal.unit || 'count')!=='count' || Number.isInteger(goal.target));}
  function measuredAmount(date,id,goal) {const detail=state.details[date]?.[id];return goal.unit==='distance'?Number(detail?.distance || 0):goal.unit==='duration'?Number(detail?.durationMinutes || 0):detail?.count || 1;}
  function measureValue(value,goal) {return new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(goal.unit==='duration' && goal.scale==='hours'?value/60:value);}
  function unitLabel(goal) {return goal.unit==='distance'?'km':goal.unit==='duration'?(goal.scale==='hours'?'h':'min'):'fois';}
  function goalType(goal) {return goal.mode==='max' && goal.target===0?'none':goal.mode;}
  function goalRuleLabel(goal) {
    if(goalType(goal)==='none')return goal.unit==='distance'?'Aucun':'Aucune';
    return goal.mode==='max'?'Au maximum':'Au moins';
  }
  function goalDescription(goal) {
    const periods={day:'jour',week:'semaine',month:'mois',year:'an'};
    const amount=goalType(goal)==='none'
      ? (goal.unit==='distance'?'kilomètre':goal.unit==='duration'?(goal.scale==='hours'?'heure':'minute'):'occurrence')
      : measureValue(goal.target,goal)+' '+unitLabel(goal);
    return `${goalRuleLabel(goal)} ${amount} par ${periods[goal.period]}`;
  }
  // Renders replace whole goal cards; retain previous values to animate between renders.
  const progressSnapshots={goals:new Map(),agenda:new Map(),calendar:new Map()};
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
    } else if(indicator.classList.contains('goal-track')) {
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
    const percent=goalFill(result,goal);
    const display=goal.display;
    const wrap=document.createElement('div');wrap.dataset.tone=result.tone;wrap.className=({ring:'progress-ring',percent:'goal-percentage',check:'goal-check-display'}[display] || 'goal-track')+(small?' progress-small':'');
    wrap.setAttribute('role','progressbar');wrap.setAttribute('aria-label',goalDescription(goal));wrap.setAttribute('aria-valuemin','0');wrap.setAttribute('aria-valuemax',String(zeroCap?1:goal.target));wrap.setAttribute('aria-valuenow',String(zeroCap?percent:Math.min(result.count,goal.target)));wrap.setAttribute('aria-valuetext',measureValue(result.count,goal)+' / '+measureValue(goal.target,goal)+' '+unitLabel(goal)+' · '+result.status);
    if(display==='check'){
      wrap.removeAttribute('role');
      for(const attribute of ['aria-label','aria-valuemin','aria-valuemax','aria-valuenow','aria-valuetext'])wrap.removeAttribute(attribute);
    }else if(display==='percent'){
      const achievement=zeroCap?(result.tone==='success'?100:0):Math.round(result.count/goal.target*100);
      wrap.textContent=result.tone==='future'?'—':statNumber.format(achievement)+' %';
    }else if(display==='ring'){
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
  function openNewGoalDialog(period,owner=null){
    const selectedPeriod=period ?? (calendarIsOpen('goals')?(calendarState.period==='life'?'week':calendarState.period):goalDatePeriod || selectedGoalFrequency(defaultViews.goals.period));
    const select=$('#newGoalCategory');select.replaceChildren();
    categories.forEach(category=>appendOption(select,category.id,categoryLabel(category)));
    const {categoryId}=activeQuickFilter(calendarIsOpen('goals')?'calendar':'goals');
    const initialCategory=owner?.categoryId || categoryId;
    if(initialCategory && categories.some(category=>category.id===initialCategory))select.value=initialCategory;
    populateNewGoalOwners();
    if(owner)$('#newGoalOwner').value=owner.id;
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
    persistItem(owner,{goals:[...goalsOf(owner),newGoalDraft]},'Objectif créé');$('#newGoalDialog').close();
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
    const nav=makeElement('div','period-navigation'),picker=makeElement('div','temporal-picker goal-date-picker'),input=makeElement('input');
    const id=++goalDatePickerId;
    input.id='goalStartDate-'+id;input.type='date';
    const trigger=makeElement('button','period-trigger');trigger.type='button';trigger.id='goalStartTrigger-'+id;
    const today=makeButton('Aujourd’hui',()=>{
      input.value=localDateKey(new Date());
      input.dispatchEvent(new Event('change',{bubbles:true}));
    },'today-button');
    nav.append(trigger,input,today);picker.append(nav);field.append(label,picker);form.append(field);
    const refresh=()=>{
      setDateControl(trigger,input,input.value);
      trigger.setAttribute('aria-label',input.value?'Date de début · '+formatDate(input.value):'Choisir la date de début');
      if(!input.value)trigger.dataset.compactLabel='Choisir';
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
        if(key==='display')group.classList.add('goal-display-field');
        const legend=document.createElement('legend');legend.textContent=labelText;
        const segments=document.createElement('div');segments.className='goal-segments';
        segments.style.setProperty('--segment-count',options.length);
        options.forEach(([option,text])=>{
          const label=document.createElement('label'),input=document.createElement('input'),span=document.createElement('span');
          input.type='radio';input.name=goal.id+'-'+key;input.value=option;input.checked=option===value;
          input.dataset.goalChoice=key;
          if(key==='display'){
            const preview=makeElement('span','goal-display-preview goal-display-preview-'+option);
            preview.setAttribute('aria-hidden','true');
            span.append(preview);
          }
          span.append(makeElement('span','goal-choice-label',text));label.append(input,span);segments.append(label);
        });
        Object.defineProperty(group,'value',{get:()=>group.querySelector('input:checked')?.value});
        group.append(legend,segments);form.append(group);return group;
      }
      function dropdown(label,options,value){
        const input=document.createElement('select');options.forEach(([key,name])=>appendOption(input,key,name));input.value=value;
        input.setAttribute('aria-label',label+' · '+owner.name);field(label,input);return input;
      }
      const mode=select('Type d’objectif',[['min','Au moins'],['max','Au maximum'],['none','Aucun']],goalType(goal),'mode');
      const target=document.createElement('input');target.type='number';target.required=true;target.max='1000000';target.value=measureValueForInput(goal);target.setAttribute('aria-label','Quantité visée · '+owner.name);field('Cible',target);
      const unit=select('Unité',[['count','Fois'],['distance','km'],['minutes','min'],['hours','h']],goal.unit==='duration'?goal.scale==='hours'?'hours':'minutes':goal.unit || 'count','unit');
      const period=dropdown('Fréquence',[['day','Par jour'],['week','Par semaine'],['month','Par mois'],['year','Par an']],goal.period);
      const startDate=appendGoalStartDate(form,goal.startDate || '');
      const display=select('Affichage',[['bar','Barre'],['ring','Cercle'],['percent','Pourcentage'],['check','Case à cocher']],goal.display || 'bar','display');
      const threshold=document.createElement('div');threshold.className='goal-threshold-fields';threshold.append(target.closest('label'),unit);mode.after(threshold);
      const frequencyLabel=period.closest('label');
      frequencyLabel.className='goal-frequency-field';
      threshold.append(frequencyLabel);
      if(isCreation)target.id='newGoalTarget';
      withNumberStepper(target);
      const stepButtons=target.parentElement.querySelectorAll('button');
      let editableTarget;
      const updateTarget=()=>{
        const fixed=mode.value==='none';
        if(fixed && !target.disabled)editableTarget=target.value==='0'?'1':target.value;
        if(fixed)target.value='0';
        else if(target.disabled)target.value=editableTarget;
        target.disabled=fixed;
        stepButtons.forEach(button=>{button.disabled=fixed;});
        target.step=unit.value==='count'?'1':'any';
        target.min=fixed?'0':unit.value==='count'?'1':mode.value==='min'?'0.01':'0';
      };
      const checkboxOption=display.querySelector('[value="check"]');
      const syncCheckboxDisplay=()=>{
        const allowed=allowsGoalCheckbox(mode.value,target.valueAsNumber);
        checkboxOption.disabled=!allowed;
        checkboxOption.closest('label').hidden=!allowed;
        display.querySelector('.goal-segments').style.setProperty('--segment-count',allowed?4:3);
        if(!allowed && checkboxOption.checked)display.querySelector('[value="bar"]').checked=true;
      };
      const update=()=>{
        updateTarget();
        syncCheckboxDisplay();
        const fixed=mode.value==='none';
        const next={...goal,mode:fixed?'max':mode.value,period:period.value,display:display.value,
          unit:['minutes','hours'].includes(unit.value)?'duration':unit.value,
          scale:unit.value==='hours'?'hours':'minutes',target:Number(target.value)*(unit.value==='hours'?60:1)};
        const savedDate=startDate.value;
        if(savedDate)next.startDate=savedDate;else delete next.startDate;
        if((!fixed && next.target===0) || !target.checkValidity() || !validGoal(next)){onChange(null);return;}
        onChange(next);
      };
      updateTarget();
      syncCheckboxDisplay();
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
    const created=[...goalEdits.values()].some(edit=>edit?.isNew);
    persistItem(owner,{goals},created?'Objectif créé':'Objectif mis à jour');
    $('#goalEditorDialog').close();
  });
  function editableSavedGoals(owner){
    return goalsOf(owner).filter(goal=>!goalEditorSelection || goal.id===goalEditorSelection);
  }
  function showGoalDeleteConfirmation(show){
    $('#goalEditorForm').hidden=show;
    $('#goalDeleteConfirmation').hidden=!show;
    const dialog=$('#goalEditorDialog');
    dialog.classList.toggle('confirmation-dialog',show);
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
    persistItem(owner,{goals:remaining},'Objectif supprimé');
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
  function confirmDiscard(action,description='Les modifications en cours seront perdues.',resetTitle){
    const confirm=$('#discardGoalDialog');
    if(confirm.open)return;
    discardAction=action;
    $('#discardGoalTitle').textContent=resetTitle || 'Quitter sans enregistrer ?';
    $('#keepGoalEditing').textContent=resetTitle?'Annuler':'Continuer';
    const accept=$('#discardGoalEdits');
    accept.textContent=resetTitle?'Réinitialiser':'Quitter sans enregistrer';
    accept.insertAdjacentHTML('afterbegin',catalogIcon('back'));
    $('#discardGoalDescription').textContent=description;
    confirm.showModal();
  }
  function confirmPreferencesReset(title,action){
    confirmDiscard(()=>{
      const undo=captureUndo('preferences');
      action();
      showSaveToast('Réglages réinitialisés',undo());
    },'Les préférences concernées reprendront leurs valeurs par défaut.',title);
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
  function chooseCategoryEmoji(value){if(!emojiOwner)return;if(emojiChooseAction)emojiChooseAction(value);else{emojiOwnerButton.textContent=value || '＋';persistItem(emojiOwner,{emoji:value},'Emoji mis à jour');}$('#emojiDialog').close();}
  function renderEmojiCatalog() {
    const query=normalizedSearch($('#emojiSearch').value.trim()),tone=$('#emojiTone').value;
    const matches=emojiCatalog.filter(entry=>(emojiCategory==='all' || entry.group===emojiCategory) && (tone==='all' || entry.tone===0 || String(entry.tone)===tone) && (!query || query.split(/\s+/).every(word=>entry.search.includes(word))));
    const root=$('#emojiCatalog');root.replaceChildren();matches.slice(0,emojiLimit).forEach(entry=>{const button=makeButton(entry.emoji,()=>chooseCategoryEmoji(entry.emoji));button.title=entry.label;button.setAttribute('aria-label','Choisir '+entry.emoji+' pour '+(emojiOwner?.name || 'la catégorie'));root.append(button);});
    if(!matches.length)appendWorkspaceEmpty(root,'Aucun emoji trouvé','Essayez un autre terme ou modifiez les filtres.');$('#moreEmojis').hidden=matches.length<=emojiLimit;$('#emojiCatalogStatus').textContent=matches.length+' emojis · '+Math.min(matches.length,emojiLimit)+' affichés';
  }
  $('#emojiSearch').addEventListener('input',()=>{emojiLimit=144;renderEmojiCatalog();});$('#emojiTone').addEventListener('change',()=>{emojiLimit=144;renderEmojiCatalog();});$('#moreEmojis').addEventListener('click',()=>{emojiLimit+=144;renderEmojiCatalog();});
  $('#customEmoji').addEventListener('input',()=>{const value=$('#customEmoji').value.trim();if([...new Intl.Segmenter('fr',{granularity:'grapheme'}).segment(value)].length===1 && /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(value))chooseCategoryEmoji(value);});
  $('#clearCategoryEmoji').addEventListener('click',()=>chooseCategoryEmoji(''));$('#closeEmojiDialog').addEventListener('click',()=>$('#emojiDialog').close());

  function initComponentReference(){
    const root=$('#componentsView');
    $('#referenceFont').textContent='Police : '+getComputedStyle(root.closest('#app') || document.body).fontFamily.split(',')[0].replace(/["']/g,'');
    const referenceOptions=[
      ['sport','🏃 Sport','','category'],['running','Course à pied','Sport','activity','sport'],
      ['cycling','Vélo','Sport','activity','sport'],['reading','📚 Lecture','','category'],
      ['novels','Romans','Lecture','activity','reading'],['work','💻 Travail','','category'],
      ['development','Développement','Travail','activity','work']
    ];
    let referenceSelection=null;
    const referencePicker=createMultiSelect('Catégories et activités','Toutes les catégories et activités',key=>{
      if(key===null)referenceSelection=null;
      else{
        const next=new Set(referenceSelection || []);
        const affected=referenceOptions.filter(([id,,,,parent])=>id===key || parent===key);
        const select=!next.has(key);
        for(const [id] of affected){
          if(select)next.add(id);
          else next.delete(id);
        }
        const parent=referenceOptions.find(([id])=>id===key)?.[4];
        if(parent)next.delete(parent);
        referenceSelection=next.size?[...next]:null;
      }
      referencePicker.update(referenceOptions,referenceSelection);
    },{grouped:true});
    referencePicker.root.classList.add('catalog-filter-picker');
    referencePicker.update(referenceOptions,referenceSelection);
    $('#referenceMultiSelect').append(referencePicker.root);
    const sidebar=root.querySelector('.reference-nav');
    const links=[...sidebar.querySelectorAll('a')];
    const sections=links.map(link=>document.getElementById(link.hash.slice(1)));
    const sectionToggles=[...sidebar.querySelectorAll('button[aria-controls]')];
    for(const button of sectionToggles){
      const group=document.getElementById(button.getAttribute('aria-controls'));
      button.addEventListener('click',()=>{
        const expanded=group.toggleAttribute('data-expanded');
        group.toggleAttribute('inert',!expanded);
        button.setAttribute('aria-expanded',String(expanded));
      });
    }
    function selectReferenceSection(id){
      for(const link of links){
        if(link.hash==='#'+id)link.setAttribute('aria-current','location');
        else link.removeAttribute('aria-current');
      }
      const group=sidebar.querySelector('[aria-current=location]')?.closest('.preferences-subnav');
      for(const button of sectionToggles){
        button.toggleAttribute('data-current',button.getAttribute('aria-controls')===group?.id);
      }
    }
    selectReferenceSection('referenceTypePanel');
    function syncReferenceScroll(){
      if(root.hidden)return;
      const header=$('#authenticatedApp .topbar');
      const sticky=document.getElementById('app').hasAttribute('data-sticky-header');
      const threshold=(sticky?Math.max(0,header.getBoundingClientRect().bottom):0)+26;
      let active=sections[0];
      for(const section of sections){
        if(section.getBoundingClientRect().top>threshold)break;
        active=section;
      }
      const page=document.scrollingElement || document.documentElement;
      if(page.scrollHeight>page.clientHeight && page.scrollHeight-page.scrollTop-page.clientHeight<=2)active=sections.at(-1);
      selectReferenceSection(active.id);
    }
    let referenceScrollFrame=null;
    function scheduleReferenceScroll(){
      if(root.hidden || referenceScrollFrame!==null)return;
      if(typeof requestAnimationFrame!=='function'){syncReferenceScroll();return;}
      referenceScrollFrame=requestAnimationFrame(()=>{
        referenceScrollFrame=null;syncReferenceScroll();
      });
    }
    window.addEventListener('scroll',scheduleReferenceScroll,{passive:true});
    window.addEventListener('resize',scheduleReferenceScroll);
    root.addEventListener('click',event=>{
      const link=event.target.closest('.reference-nav a');
      if(!link || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)return;
      const section=document.getElementById(link.hash.slice(1));
      if(!section?.classList.contains('reference-section'))return;
      event.preventDefault();
      selectReferenceSection(section.id);
      section.focus({preventScroll:true});
      section.scrollIntoView?.({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    });
    function referenceAccountControl(prefix){
      const control=makeElement('div','account-control reference-account');
      const toggle=$('#accountToggle').cloneNode(true);
      toggle.id=prefix+'Toggle';toggle.setAttribute('aria-controls',prefix+'Menu');
      toggle.querySelector('img').id=prefix+'Avatar';
      toggle.querySelector('span').id=prefix+'Initial';
      const menu=$('#accountMenu').cloneNode(true);
      menu.id=prefix+'Menu';
      const menuName=menu.querySelector('[id=accountMenuName]');
      menuName.id=prefix+'MenuName';
      menuName.textContent=$('#accountMenuName').textContent || 'Votre compte';
      for(const button of menu.querySelectorAll('button')){
        button.removeAttribute('id');button.removeAttribute('data-page');
        button.removeAttribute('aria-haspopup');button.removeAttribute('aria-controls');
      }
      function setOpen(open){setAccountDisclosure(toggle,menu,open);}
      menu.hidden=true;menu.toggleAttribute('inert',true);toggle.setAttribute('aria-expanded','false');
      toggle.addEventListener('click',()=>setOpen(toggle.getAttribute('aria-expanded')!=='true'));
      menu.addEventListener('click',event=>{
        if(event.target.closest('button')){setOpen(false);toggle.focus();}
      });
      document.addEventListener('click',event=>{if(!control.contains(event.target))setOpen(false);});
      control.addEventListener('keydown',event=>{
        if(event.key==='Escape' && toggle.getAttribute('aria-expanded')==='true'){setOpen(false);toggle.focus();}
      });
      control.append(toggle,menu);
      return control;
    }
    const referenceHeader=$('#referenceHeader');
    const brand=makeElement('span','brand');
    brand.innerHTML=$('#homeBrand').innerHTML;
    const headerNav=makeElement('nav','page-nav');
    headerNav.id='referenceHeaderNav';headerNav.setAttribute('aria-label','Navigation d’exemple');
    for(const key of ['day','calendar','statistics']){
      const source=$('#mainNavigation [data-page="'+key+'"]');
      const button=makeButton('',()=>{
        for(const item of headerNav.children)item.removeAttribute('aria-current');
        button.setAttribute('aria-current','page');
        updateSegmentIndicator(headerNav);
      });
      button.innerHTML=source.innerHTML;
      if(key==='day')button.setAttribute('aria-current','page');
      headerNav.append(button);
    }
    const referenceMenuToggle=makeButton('',()=>{
      const open=referenceMenuToggle.getAttribute('aria-expanded')!=='true';
      referenceMenuToggle.setAttribute('aria-expanded',String(open));
      headerNav.toggleAttribute('data-open',open);
      headerNav.toggleAttribute('inert',!open);
    },'reference-header-menu-toggle');
    referenceMenuToggle.id='referenceHeaderMenuToggle';
    referenceMenuToggle.setAttribute('aria-label','Ouvrir la navigation');
    referenceMenuToggle.setAttribute('aria-expanded','false');
    referenceMenuToggle.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
    headerNav.toggleAttribute('inert',true);
    referenceHeader.classList.add('topbar');
    referenceHeader.append(brand,headerNav,referenceMenuToggle,referenceAccountControl('referenceHeader'));
    if(typeof ResizeObserver==='function')new ResizeObserver(()=>{
      referenceHeader.toggleAttribute('data-mobile',referenceHeader.clientWidth<=600);
    }).observe(referenceHeader);
    referenceHeader.toggleAttribute('data-mobile',referenceHeader.clientWidth<=600);
    $('#referenceDropdown').append(referenceAccountControl('referenceDropdown'));
    if(typeof ResizeObserver==='function')new ResizeObserver(()=>updateSegmentIndicator(headerNav)).observe(headerNav);
    $('#referenceLogout').prepend($('#logout svg').cloneNode(true));
    const icons=[
      ...[...$('#mainNavigation').querySelectorAll('button')].map(button=>[button.textContent.trim(),button.querySelector('svg')]),
      ['Réglages',$('#openPreferences svg')],['Profil',$('#openProfile svg')],
      ['Catalogue',$('#openCatalog svg')],
      ['Réinitialiser',$('#workspaceFilterReset svg')],['Ajouter',$('#openDailyActivity svg')],
      ['Galerie',$('#activityFormats [aria-label=Galerie] svg')],['Liste',$('#activityFormats [aria-label=Liste] svg')],
      ['Fermer',$('#closeDailyActivity svg')],['Déconnexion',$('#logout svg')]
    ];
    icons.forEach(([name,icon])=>{
      if(!icon)return;
      const sample=makeElement('li');sample.append(icon.cloneNode(true),makeElement('span',null,name));$('#referenceIcons').append(sample);
    });
    const quickActions=$('#referenceQuickActions');
    const editIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16 12-12 4 4L8 20H4zM14 6l4 4"/></svg>';
    for(const [label,style,svg,toggle] of [
      ['Ajouter aux favoris','dashboard-pin',collectionIcon(collectionStarPath),true],
      ['Épingler','stats-key-pin',collectionIcon(collectionPinPath),true],
      ['Ajouter','catalog-icon-action',$('#openDailyActivity svg').outerHTML],
      ['Modifier','catalog-icon-action',editIcon],
      ['Fermer','catalog-icon-action',$('#closeDailyActivity svg').outerHTML],
      ['Déplacer','catalog-icon-action',catalogIcon('move')],
      ['Supprimer','catalog-icon-action catalog-delete',catalogIcon('delete')]
    ]){
      const action=makeButton('',()=>{},style);
      action.innerHTML=svg;action.title=label;action.setAttribute('aria-label',label);
      if(toggle){
        action.setAttribute('aria-pressed','false');
        action.addEventListener('click',()=>action.setAttribute('aria-pressed',String(action.getAttribute('aria-pressed')==='false')));
      }
      const icon=makeElement('li');
      icon.append(action.firstElementChild.cloneNode(true),makeElement('span',null,label));
      $('#referenceIcons').append(icon);
      quickActions.append(action);
    }
    root.querySelectorAll('.reference-fields input[type=number]').forEach(input=>withNumberStepper(input));
    const chipLabels=['Sport','Lecture','Travail'];
    chipLabels.forEach((label,index)=>{
      const chip=filterChip(label,index===0,()=>chip.setAttribute('aria-pressed',String(chip.getAttribute('aria-pressed')==='false')));
      $('#referenceChips').append(chip);
    });
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
    const grouped=$('#referenceGroupedDate');
    const viewGroup=makeElement('div','reference-date-views');
    viewGroup.hidden=true;
    viewGroup.setAttribute('aria-label','Vue du calendrier');
    const periodNav=makeElement('div','period-navigation');
    const dateTrigger=makeElement('button','period-trigger'),dateInput=makeElement('input');
    dateTrigger.type='button';dateInput.type='date';
    let samplePeriod='day';
    function updateGroupedDate(date){
      setDateControl(dateTrigger,dateInput,date,samplePeriod==='life'?'year':samplePeriod);
      if(samplePeriod==='life'){
        const label=date.slice(0,4)+'–'+(Number(date.slice(0,4))+99);
        dateTrigger.textContent=label;
        dateTrigger.dataset.compactLabel=label;
        dateTrigger.setAttribute('aria-label','Choisir une année · '+label);
      }
    }
    for(const [period,label] of [...periodOptions,['life','100 ans']]){
      const choice=makeButton(label,()=>{
        activeDatePicker?.close();
        samplePeriod=period;
        syncSegmentedSwitch(viewGroup,'period',period);syncCompactSwitch(viewGroup);
        updateGroupedDate(dateInput.value || initial);
      });
      choice.dataset.period=period;viewGroup.append(choice);
    }
    const changeDate=direction=>updateGroupedDate(shiftDate(dateInput.value,samplePeriod==='life'?'year':samplePeriod,direction*(samplePeriod==='life'?100:1)));
    const arrows=[['#agendaPrevious',-1,'Période précédente'],['#agendaNext',1,'Période suivante']].map(([id,direction,label])=>{
      const button=makeButton('',()=>changeDate(direction),'period-arrow');
      button.append($(id+' svg').cloneNode(true));button.setAttribute('aria-label',label);return button;
    });
    grouped.append(viewGroup,periodNav);
    const today=makeButton('Aujourd’hui',()=>updateGroupedDate(localDateKey(new Date())),'today-button');
    today.setAttribute('aria-label','Aujourd’hui');
    periodNav.append(arrows[0],dateTrigger,dateInput,arrows[1],today);
    addCompactSwitch(viewGroup);
    syncSegmentedSwitch(viewGroup,'period',samplePeriod);syncCompactSwitch(viewGroup);
    bindDatePicker(dateTrigger,dateInput,{maxYear:()=>samplePeriod==='life'?9900:9999});
    dateInput.addEventListener('change',()=>updateGroupedDate(dateInput.value || initial));
    updateGroupedDate(initial);

    Object.entries({day:'Jour',week:'Semaine',month:'Mois',year:'Année'}).forEach(([period,label])=>{
      const sample=makeElement('div','reference-date-example'),nav=makeElement('div','period-navigation');
      const trigger=makeElement('button','period-trigger'),input=makeElement('input');
      trigger.type='button';trigger.id='reference-date-'+period;input.type='date';input.id=trigger.id+'-value';
      const refresh=date=>setDateControl(trigger,input,date,period);
      const previous=makeButton('',()=>refresh(shiftDate(input.value,period,-1)),'period-arrow');
      const next=makeButton('',()=>refresh(shiftDate(input.value,period,1)),'period-arrow');
      previous.append($('#agendaPrevious svg').cloneNode(true));previous.setAttribute('aria-label','Période précédente');
      next.append($('#agendaNext svg').cloneNode(true));next.setAttribute('aria-label','Période suivante');
      nav.append(previous,trigger,input,next,makeButton({day:'Aujourd’hui',week:'Cette semaine',month:'Ce mois-ci',year:'Cette année'}[period],()=>refresh(initial),'today-button'));
      sample.append(makeElement('h3',null,label),nav);$('#referenceDateExamples').append(sample);
      bindDatePicker(trigger,input);input.addEventListener('change',()=>refresh(input.value));refresh(initial);
    });
    for(const [name,rows] of [
      ['🏃 Sport',[['Course à pied',2,'45 min'],['Vélo',1,'30 min'],['Natation',1,'35 min']]],
      ['📚 Lecture',[['Romans',2,'40 min'],['Essais',1,'25 min']]],
      ['💻 Travail',[['Développement',3,'2 h'],['Formation',1,'50 min'],['Écriture',1,'30 min']]]
    ]){
      const details=makeElement('details','stats-category-details');
      details.open=true;
      const heading=makeElement('summary','stats-category-summary');
      const chevron=makeElement('span','catalog-chevron');chevron.innerHTML=catalogIcon('chevron');
      const count=rows.reduce((total,[,occurrences])=>total+occurrences,0);
      heading.append(chevron,makeElement('strong',null,name),makeElement('span','stats-category-count',count+' occurrences'));
      details.append(heading);
      const table=listTable(details,'Activités · '+name,['Activité','Occurrences','Durée']);
      for(const [activity,occurrences,duration] of rows){
        const row=table.insertRow();rowLabel(row,activity);
        row.insertCell().textContent=occurrences;row.insertCell().textContent=duration;
      }
      $('#referenceTable').append(details);
    }
    const week=statisticsWindow(initial,'week',initial);
    for(const [period,label] of [['week','Semaine'],['month','Mois'],['year','Année']]){
      const button=makeButton(label,()=>renderReferenceStatsGraphs(period));
      button.dataset.period=period;
      $('#referenceStatsPeriods').append(button);
    }
    for(const [metric,label,value,prior] of [['count','Occurrences',12,8],['distance','Distance totale',11,16],['minutes','Durée totale',200,200]]){
      $('#referenceTiles').append(statCard(label,statValue(metric,value),null,metric,activityTrend(metric,value,prior,week)));
    }
    const goal={id:'reference-goal',mode:'min',period:'week',target:5,unit:'count',display:'bar'};
    const result={count:3,tone:'warning',status:'En progression'};
    $('#referenceGoalFields').append(buildGoalFields({name:'Course à pied'},goal,()=>{}));
    const summary=makeElement('div','day-total-progress');
    summary.setAttribute('role','img');summary.setAttribute('aria-label','2 objectifs tenus sur 4');
    appendGoalSegments(summary,['success','success','warning','pending'].map((tone,index)=>({
      name:'Objectif '+(index+1),goal,status:{success:'Atteint',warning:'En progression',pending:'À accomplir'}[tone],tone
    })));
    $('#referenceGoalSummary').append(summary);
    for(const [title,example] of [
      ['À accomplir',{count:1,tone:'pending',status:'À accomplir'}],
      ['En progression',result],
      ['Atteint',{count:5,tone:'success',status:'Atteint'}],
      ['Dépassé',{count:7,tone:'exceeded',status:'Dépassé'}]
    ]){
      for(const [id,display] of [['referenceProgress','bar'],['referenceProgressRings','ring']]){
        const sample=makeElement('div','reference-progress-example');
        sample.append(makeElement('span',null,title),createProgress(example,{...goal,display}));
        $('#'+id).append(sample);
      }
    }
    const measure=$('#referenceGoalMeasure');
    measure.append(createProgress(result,goal));
    const footer=makeElement('div','goal-logging');
    footer.id='referenceGoalFlameSample';
    footer.append(occurrenceStepper('l’objectif d’exemple',()=>{},{canRemove:true,canAdd:true}));
    measure.closest('.goal-card').append(footer);
    const statusLabels=[['success','Atteint'],['warning','En progression'],['danger','Non tenu'],['exceeded','Dépassé'],['pending','À accomplir'],['future','À venir']];
    statusLabels.forEach(([tone,label])=>{
      const chip=makeElement('span','list-status',label);chip.dataset.tone=tone;$('#referenceStatuses').append(chip);
    });
    appendWorkspaceEmpty($('#referenceEmpty'),'Aucun résultat','Essaie de modifier les filtres.');
    appendWorkspaceEmpty($('#referenceEmptyGoals'),'Aucun objectif à afficher','Choisis une autre fréquence ou modifie les filtres.');
    appendWorkspaceEmpty($('#referenceEmptyDashboard'),'Ton tableau de bord est vide','Ajoute un objectif ou une statistique avec l’étoile.');
    const deleteExample=$('#referenceDialog'),openDeleteExample=$('#referenceOpenDialog');
    openDeleteExample.addEventListener('click',()=>deleteExample.showModal());
    deleteExample.querySelectorAll('[data-reference-close]').forEach(close=>close.addEventListener('click',()=>deleteExample.close()));
    deleteExample.addEventListener('close',()=>openDeleteExample.focus({preventScroll:true}));
    $('#referenceShowToast').addEventListener('click',()=>showSaveToast('Modifications enregistrées',()=>true));
    $('#referenceStackToasts').addEventListener('click',()=>{
      for(const message of ['Activité enregistrée','Objectif mis à jour','Ajouté au tableau de bord'])showSaveToast(message,()=>true);
    });
    $('#referenceOpenSettings').addEventListener('click',event=>openPreferences(event.currentTarget));
    $('#referenceOpenDiscard').addEventListener('click',()=>confirmDiscard(()=>{}));
  }
  initComponentReference();renderStreakPreviews();

  const onboardingDialog=$('#onboardingDialog'),onboardingTitle=$('#onboardingTitle');
  const onboardingCategoryForm=$('#onboardingCategoryForm'),onboardingActivityForm=$('#onboardingActivityForm');
  const onboardingCategoryName=$('#onboardingCategoryName'),onboardingActivityName=$('#onboardingActivityName');
  const onboardingActivityCategory=$('#onboardingActivityCategory'),onboardingNext=$('#onboardingNext');
  const onboardingPanels=[...onboardingDialog.querySelectorAll('[data-onboarding-panel]')];
  const onboardingPageChoices=[...onboardingDialog.querySelectorAll('[data-onboarding-page]')];
  const lastOnboardingStep=onboardingPanels.length-1;
  let onboardingStep=0;

  function showOnboardingError(message=''){
    const error=$('#onboardingError');
    error.hidden=!message;error.textContent=message;
  }
  function renderOnboarding(){
    const firstName=currentAccount?.displayName?.trim().split(/\s+/)[0];
    const welcome=firstName?'Bienvenue, '+firstName+' !':'Bienvenue dans Year Tracker';
    const titles=[welcome,'Ta date de naissance','Tes catégories','Tes activités','Ton premier objectif',
      'Le calendrier','Ma journée','Le tableau de bord','Les statistiques'];
    const hasGoal=goalTargets().length>0;
    onboardingTitle.textContent=titles[onboardingStep];
    $('#onboardingStep').textContent='Étape '+(onboardingStep+1)+' sur '+onboardingPanels.length;
    onboardingPanels.forEach((panel,index)=>{panel.hidden=index!==onboardingStep;});
    $('#onboardingBack').hidden=onboardingStep===0;
    onboardingNext.textContent=onboardingStep===0?'Commencer':onboardingStep===lastOnboardingStep?'Terminer':
      ((onboardingStep===1 && !birthDate) || (onboardingStep===4 && !hasGoal))?'Passer':'Continuer';
    syncBirthDateControl('onboarding');
    onboardingNext.disabled=(onboardingStep===2 && !categories.length) || (onboardingStep===3 && !state.activities.length);
    $('#onboardingGoalStatus').textContent=hasGoal?'Un objectif est déjà configuré.':'';
    const onlyOne=Object.values(navigationTabs).filter(Boolean).length===1;
    for(const choice of onboardingPageChoices){
      choice.checked=navigationTabs[choice.dataset.onboardingPage];
      choice.disabled=onlyOne && choice.checked;
    }
    const displayedChoice=onboardingPanels[onboardingStep].querySelector('[data-onboarding-page]');
    $('#onboardingNavigationStatus').hidden=!displayedChoice?.disabled;
    const selected=onboardingActivityCategory.value;
    onboardingActivityCategory.replaceChildren();
    categories.forEach(category=>appendOption(onboardingActivityCategory,category.id,categoryLabel(category)));
    if(categories.some(category=>category.id===selected))onboardingActivityCategory.value=selected;
    $('#onboardingCategories').replaceChildren(...categories.map(category=>makeElement('li',null,categoryLabel(category))));
    renderOnboardingActivities();
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
    if(onboardingStep===lastOnboardingStep){
      onboardingStatus='complete';
      onboardingDialog.close();
      setPage('day');
      return;
    }
    goToOnboardingStep(onboardingStep+1);
  });
  $('#onboardingOpenGoal').addEventListener('click',()=>openNewGoalDialog('day',state.activities[0]));
  $('#newGoalDialog').addEventListener('close',()=>{
    if(onboardingDialog.open)renderOnboarding();
  });
  for(const choice of onboardingPageChoices){
    choice.addEventListener('change',()=>{
      if(choice.disabled)return;
      navigationTabs[choice.dataset.onboardingPage]=choice.checked;
      applyNavigationTabs();
      renderOnboarding();persist();
    });
  }
  [onboardingCategoryName,onboardingActivityName].forEach(input=>input.addEventListener('input',()=>showOnboardingError()));
  onboardingActivityCategory.addEventListener('change',()=>{showOnboardingError();renderOnboardingActivities();});
  onboardingCategoryForm.addEventListener('submit',event=>{
    event.preventDefault();
    if(!onboardingDialog.open)return;
    const name=onboardingCategoryName.value.trim();
    const error=categoryNameError(name);
    if(error){showOnboardingError(error);onboardingCategoryName.focus();return;}
    const undo=captureUndo('catalog');
    const category=addCatalogCategory(name,'🗂️');
    onboardingCategoryName.value='';
    commitCatalog('Catégorie ajoutée.',undo);
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
    const undo=captureUndo('catalog');
    addCatalogActivity(categoryId,name);
    onboardingActivityName.value='';
    commitCatalog('Activité ajoutée.',undo);
    renderOnboarding();onboardingActivityName.focus();
  });

  const draftClosers={dayPicker:closeDayEditor,calendarDayDialog:closeDayOverview,dailyActivityDialog:requestDailyActivityClose,onboardingDialog:dismissOnboarding};
  document.querySelectorAll('#app dialog').forEach(dialog=>{
    let outside=false;
    const isOutside=event=>{const rect=dialog.getBoundingClientRect();return event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom;};
    dialog.addEventListener('pointerdown',event=>{outside=event.target===dialog&&isOutside(event);});
    dialog.addEventListener('click',event=>{
      if(outside && event.target===dialog && isOutside(event)){
        if(draftClosers[dialog.id])draftClosers[dialog.id]();
        else if(dialog.id==='goalEditorDialog')requestGoalEditorClose();
        else if(dialog.id==='newGoalDialog')requestNewGoalClose();
        else{document.activeElement?.blur();persist();if(dialog.open)dialog.close();}
      }
      outside=false;
    });
    if(draftClosers[dialog.id])dialog.addEventListener('cancel',event=>{event.preventDefault();draftClosers[dialog.id]();});
    else if(!['goalEditorDialog','newGoalDialog'].includes(dialog.id))dialog.addEventListener('cancel',event=>{event.preventDefault();document.activeElement?.blur();if(dialog.id!=='discardGoalDialog')persist();if(dialog.open)dialog.close();});
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
    statsMetric='count';statsCalendarDates.clear();
    if(!rememberWorkspaceFilters)sharedFilters=normalizeWorkspaceFilters({});
    expandedStatsCategory=null;
    if(!rememberWorkspaceDates){
      sharedTemporalView=null;statsDate=null;
      agendaDate=focusDate=goalReference=localDateKey(new Date());
      state.year=Number(focusDate.slice(0,4));
      calendarView=defaultViews.activities.period;
      goalDatePeriod=null;
      if(shareWorkspaceDates){
        Object.assign(calendarState,{date:agendaDate,period:calendarView});
        statsPeriod='year';
      }
    }
    applySharedTemporalView('day');
    activityFormat=defaultViews.activities.format;goalFormat=defaultViews.goals.format;
    state.selections={};
    for(const page of workspaceFilterPages)applyPageFilter(page,{});
    clearTrackingCatalog();
    setPage('day',false);render();
    window.calendarApp.startStreakNotifications();
    if(onboardingStatus==='pending')openOnboarding();
  };




