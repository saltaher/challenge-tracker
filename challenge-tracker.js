
// ===============================
// Challenge Tracker Script (challenge-tracker.js)
// ===============================

const TOTAL_DAYS = 30;

// DOM elements
const trackerContainer = document.getElementById("tracker");
const progressFillEl = document.getElementById("progress-fill");
const progressTextEl = document.getElementById("progress-text");
const progressPercentEl = document.getElementById("progress-percent");
const exportBtn = document.getElementById("export-btn");
const resetBtn = document.getElementById("reset-btn");
const clearNotesBtn = document.getElementById("clear-notes-btn");
const startDateInput = document.getElementById("start-date");

// Storage keys
const STORAGE_KEYS = {
  progress: "noSocial_challenge_progress_v1",
  notes: "noSocial_challenge_notes_v1",
  startDate: "noSocial_challenge_startDate_v1"
};

// In-memory state (progress: day -> { done: bool, time: ISOString|null }, notes: day -> { text, time })
let challengeProgress = {};
let challengeNotes = {};
let challengeStartDate = "";

/* -----------------------
   Utilities
   ----------------------- */
function formatShortTime(iso){
  if (!iso) return '';
  try { return new Date(iso).toLocaleString(); } catch(e) { return iso; }
}

function saveProgressToStorage(){
  localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(challengeProgress));
}
function saveNotesToStorage(){
  localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(challengeNotes));
}
function saveStartDateToStorage(){
  localStorage.setItem(STORAGE_KEYS.startDate, challengeStartDate);
}

/* -----------------------
   Load / Init
   ----------------------- */
function loadData(){
  const rawProg = localStorage.getItem(STORAGE_KEYS.progress);
  const rawNotes = localStorage.getItem(STORAGE_KEYS.notes);
  const rawStart = localStorage.getItem(STORAGE_KEYS.startDate);

  // Start date: if saved use it, otherwise set to 2 days ago and persist
  if (rawStart) {
    challengeStartDate = rawStart;
  } else {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    challengeStartDate = twoDaysAgo.toISOString().split("T")[0]; // yyyy-mm-dd
    saveStartDateToStorage();
  }

  // Load progress if present, else initialize and pre-mark days 1 & 2 done
  if (rawProg) {
    try { challengeProgress = JSON.parse(rawProg) || {}; }
    catch(e) { challengeProgress = {}; }
  } else {
    // default shape: mark day 1 & 2 done (times set to startDate and startDate+1)
    challengeProgress = {};
    const base = new Date(challengeStartDate);
    const day1Time = new Date(base);
    const day2Time = new Date(base);
    day2Time.setDate(day2Time.getDate() + 1);
    challengeProgress[1] = { done: true, time: day1Time.toISOString() };
    challengeProgress[2] = { done: true, time: day2Time.toISOString() };
  }

  // Load notes if present, else initialize blank notes
  if (rawNotes) {
    try { challengeNotes = JSON.parse(rawNotes) || {}; } catch(e) { challengeNotes = {}; }
  } else {
    challengeNotes = {};
  }

  // Ensure every day has a default object shape
  for (let d = 1; d <= TOTAL_DAYS; d++){
    if (!challengeProgress[d]) challengeProgress[d] = { done:false, time:null };
    if (!challengeNotes[d]) challengeNotes[d] = { text:'', time:null };
  }

  // Set input value
  startDateInput.value = challengeStartDate;
}

/* -----------------------
   Stats + UI updates
   ----------------------- */
function calcStats(){
  let completed = 0;
  for (let d = 1; d <= TOTAL_DAYS; d++){
    if (challengeProgress[d] && challengeProgress[d].done) completed++;
  }
  const pct = Math.round((completed / TOTAL_DAYS) * 100);
  return { completed, pct };
}

function updateChallengeProgress(){
  const { completed, pct } = calcStats();
  progressTextEl.textContent = `${completed} / ${TOTAL_DAYS}`;
  progressPercentEl.textContent = `${pct}%`;
  progressFillEl.style.width = `${pct}%`;
  progressFillEl.setAttribute('aria-valuenow', String(pct));
}

/* -----------------------
   Rendering
   ----------------------- */
function renderChallengeTracker(){
  trackerContainer.innerHTML = '';

  for (let day = 1; day <= TOTAL_DAYS; day++){
    const prog = challengeProgress[day] || { done:false, time:null };
    const note = challengeNotes[day] || { text:'', time:null };

    const dayDiv = document.createElement('div');
    dayDiv.className = 'challenge-day';
    dayDiv.setAttribute('data-day', String(day));

    // Header
    const header = document.createElement('div');
    header.className = 'challenge-day-header';

    const left = document.createElement('div');
    left.className = 'day-left';

    const badge = document.createElement('div');
    badge.className = 'challenge-badge';
    badge.textContent = 'Day ' + day;
    badge.setAttribute('aria-hidden','true');

    const small = document.createElement('div');
    small.className = 'challenge-date';
    small.textContent = prog.done ? `Completed — ${formatShortTime(prog.time)}` : (challengeStartDate ? (function(){
      const d = new Date(challengeStartDate);
      d.setDate(d.getDate() + (day - 1));
      return d.toDateString();
    })() : 'No date set');

    left.appendChild(badge);
    left.appendChild(small);

    const controls = document.createElement('div');

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn';
    toggleBtn.type = 'button';
    toggleBtn.setAttribute('aria-pressed', prog.done ? 'true' : 'false');
    toggleBtn.textContent = prog.done ? '✅ Done' : 'Mark Done';
    toggleBtn.title = prog.done ? 'Mark as not done' : 'Mark this day as done';

    // Toggle (allows undo)
    toggleBtn.addEventListener('click', () => {
      const nowIso = new Date().toISOString();
      if (challengeProgress[day] && challengeProgress[day].done){
        challengeProgress[day] = { done:false, time:null };
      } else {
        challengeProgress[day] = { done:true, time: nowIso };
      }
      saveProgressToStorage();
      // re-render only this day to preserve scroll
      renderDay(day);
      updateChallengeProgress();
    });

    controls.appendChild(toggleBtn);
    header.appendChild(left);
    header.appendChild(controls);

    // Note area
    const noteWrap = document.createElement('div');
    noteWrap.className = 'note-area';
    noteWrap.style.display = 'flex';
    noteWrap.style.gap = '10px';
    noteWrap.style.alignItems = 'flex-start';

    const textarea = document.createElement('textarea');
    textarea.placeholder = "What did you learn today in ALX frontend?";
    textarea.value = note.text || '';
    textarea.setAttribute('aria-label', `Note for day ${day}`);

    const noteMeta = document.createElement('div');
    noteMeta.style.minWidth = '120px';
    noteMeta.style.display = 'flex';
    noteMeta.style.flexDirection = 'column';
    noteMeta.style.gap = '6px';
    noteMeta.style.alignItems = 'flex-end';

    const savedLabel = document.createElement('div');
    savedLabel.className = 'challenge-date';
    savedLabel.style.textAlign = 'right';
    savedLabel.textContent = note.time ? `Saved: ${formatShortTime(note.time)}` : '';

    const saveStatus = document.createElement('div');
    saveStatus.className = 'challenge-saved';
    saveStatus.style.visibility = 'hidden';
    saveStatus.textContent = '💾 Saved';

    // Autosave with debounce
    let saveTimeout = null;
    textarea.addEventListener('input', () => {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveStatus.style.visibility = 'visible';
      saveStatus.textContent = 'Saving...';
      saveTimeout = setTimeout(() => {
        const now = new Date().toISOString();
        challengeNotes[day] = { text: textarea.value, time: now };
        saveNotesToStorage();
        savedLabel.textContent = `Saved: ${formatShortTime(now)}`;
        saveStatus.textContent = '💾 Saved';
        setTimeout(()=> { saveStatus.style.visibility = 'hidden'; }, 1200);
        saveTimeout = null;
      }, 500);
    });

    noteMeta.appendChild(savedLabel);
    noteMeta.appendChild(saveStatus);

    noteWrap.appendChild(textarea);
    noteWrap.appendChild(noteMeta);

    dayDiv.appendChild(header);
    dayDiv.appendChild(noteWrap);

    trackerContainer.appendChild(dayDiv);
  }
}

// Re-render a single day (keeps scroll)
function renderDay(day){
  const existing = trackerContainer.querySelector(`.challenge-day[data-day="${day}"]`);
  if (existing) existing.remove();
  const allChildren = Array.from(trackerContainer.children);
  const insertBefore = trackerContainer.children[day - 1] || null;

  // create node for this day (reuse logic but minimal)
  const prog = challengeProgress[day] || { done:false, time:null };
  const note = challengeNotes[day] || { text:'', time:null };

  const dayDiv = document.createElement('div');
  dayDiv.className = 'challenge-day';
  dayDiv.setAttribute('data-day', String(day));

  const header = document.createElement('div');
  header.className = 'challenge-day-header';

  const left = document.createElement('div');
  left.className = 'day-left';

  const badge = document.createElement('div');
  badge.className = 'challenge-badge';
  badge.textContent = 'Day ' + day;

  const small = document.createElement('div');
  small.className = 'challenge-date';
  small.textContent = prog.done ? `Completed — ${formatShortTime(prog.time)}` : (challengeStartDate ? (function(){
    const d = new Date(challengeStartDate);
    d.setDate(d.getDate() + (day - 1));
    return d.toDateString();
  })() : 'No date set');

  left.appendChild(badge);
  left.appendChild(small);

  const controls = document.createElement('div');
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'btn';
  toggleBtn.type = 'button';
  toggleBtn.setAttribute('aria-pressed', prog.done ? 'true' : 'false');
  toggleBtn.textContent = prog.done ? '✅ Done' : 'Mark Done';
  toggleBtn.addEventListener('click', () => {
    const nowIso = new Date().toISOString();
    if (challengeProgress[day] && challengeProgress[day].done){
      challengeProgress[day] = { done:false, time:null };
    } else {
      challengeProgress[day] = { done:true, time: nowIso };
    }
    saveProgressToStorage();
    renderDay(day);
    updateChallengeProgress();
  });
  controls.appendChild(toggleBtn);

  header.appendChild(left);
  header.appendChild(controls);

  const noteWrap = document.createElement('div');
  noteWrap.style.display = 'flex';
  noteWrap.style.gap = '10px';
  noteWrap.style.alignItems = 'flex-start';

  const textarea = document.createElement('textarea');
  textarea.placeholder = "What did you learn today in ALX frontend?";
  textarea.value = note.text || '';

  const noteMeta = document.createElement('div');
  noteMeta.style.minWidth = '120px';
  noteMeta.style.display = 'flex';
  noteMeta.style.flexDirection = 'column';
  noteMeta.style.gap = '6px';
  noteMeta.style.alignItems = 'flex-end';

  const savedLabel = document.createElement('div');
  savedLabel.className = 'challenge-date';
  savedLabel.textContent = note.time ? `Saved: ${formatShortTime(note.time)}` : '';

  const saveStatus = document.createElement('div');
  saveStatus.className = 'challenge-saved';
  saveStatus.style.visibility = 'hidden';
  saveStatus.textContent = '💾 Saved';

  let saveTimeout = null;
  textarea.addEventListener('input', () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveStatus.style.visibility = 'visible';
    saveStatus.textContent = 'Saving...';
    saveTimeout = setTimeout(() => {
      const now = new Date().toISOString();
      challengeNotes[day] = { text: textarea.value, time: now };
      saveNotesToStorage();
      savedLabel.textContent = `Saved: ${formatShortTime(now)}`;
      saveStatus.textContent = '💾 Saved';
      setTimeout(()=> { saveStatus.style.visibility = 'hidden'; }, 1000);
      saveTimeout = null;
    }, 500);
  });

  noteMeta.appendChild(savedLabel);
  noteMeta.appendChild(saveStatus);

  noteWrap.appendChild(textarea);
  noteWrap.appendChild(noteMeta);

  dayDiv.appendChild(header);
  dayDiv.appendChild(noteWrap);

  // insert at correct position
  if (trackerContainer.children.length >= day) {
    trackerContainer.insertBefore(dayDiv, trackerContainer.children[day - 1]);
  } else {
    trackerContainer.appendChild(dayDiv);
  }
}

/* -----------------------
   Controls: Export / Reset / Clear
   ----------------------- */

exportBtn.addEventListener('click', () => {
  const payload = {
    exportedAt: new Date().toISOString(),
    totalDays: TOTAL_DAYS,
    startDate: challengeStartDate,
    progress: challengeProgress,
    notes: challengeNotes
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'no-social-challenge-export.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

resetBtn.addEventListener('click', () => {
  const ok = confirm('Reset entire challenge (progress + notes)? This cannot be undone.');
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEYS.progress);
  localStorage.removeItem(STORAGE_KEYS.notes);
  localStorage.removeItem(STORAGE_KEYS.startDate);
  // re-init defaults
  loadData();
  renderChallengeTracker();
  updateChallengeProgress();
  alert('Reset complete. Days 1 and 2 are pre-marked as done (your earlier 2 days).');
});

clearNotesBtn.addEventListener('click', () => {
  const ok = confirm('Clear only notes? Progress will be kept.');
  if (!ok) return;
  challengeNotes = {};
  for (let d = 1; d <= TOTAL_DAYS; d++) challengeNotes[d] = { text:'', time:null };
  saveNotesToStorage();
  renderChallengeTracker();
  updateChallengeProgress();
});

/* -----------------------
   Start-date input change
   ----------------------- */
startDateInput.addEventListener('change', () => {
  challengeStartDate = startDateInput.value;
  saveStartDateToStorage();
  renderChallengeTracker();
});

/* -----------------------
   Boot
   ----------------------- */
function boot(){
  loadData();
  renderChallengeTracker();
  updateChallengeProgress();
  // ensure storage is current
  saveProgressToStorage();
  saveNotesToStorage();
}

boot();
