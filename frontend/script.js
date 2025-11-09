document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = 'http://127.0.0.1:5000';
    const ENDPOINTS = { ADD: `${API_BASE}/add_note`, GET: `${API_BASE}/notes`, DELETE: (id) => `${API_BASE}/notes/${id}` };
    let calendar;

    // --- SETTINGS LOGIC ---
    function initSettings() {
        // Theme
        const themeBtns = document.querySelectorAll('.theme-btn');
        const setTheme = (theme) => {
            if (theme === 'system') {
                localStorage.removeItem('theme');
                if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.classList.add('dark');
                else document.documentElement.classList.remove('dark');
            } else {
                localStorage.theme = theme;
                if (theme === 'dark') document.documentElement.classList.add('dark');
                else document.documentElement.classList.remove('dark');
            }
            themeBtns.forEach(btn => btn.classList.toggle('active', btn.id === `theme-${theme}`));
            if (calendar) {
                 calendar.settings.visibility.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
                 calendar.update();
            }
        };
        document.getElementById('theme-light').addEventListener('click', () => setTheme('light'));
        document.getElementById('theme-dark').addEventListener('click', () => setTheme('dark'));
        document.getElementById('theme-system').addEventListener('click', () => setTheme('system'));
        const savedTheme = localStorage.theme || 'system';
        themeBtns.forEach(btn => btn.classList.toggle('active', btn.id === `theme-${savedTheme}`));

        // Notifications Toggle
        const notifToggle = document.getElementById('notifications-toggle');
        notifToggle.checked = localStorage.getItem('notificationsEnabled') !== 'false'; // Default true
        notifToggle.addEventListener('change', () => {
            localStorage.setItem('notificationsEnabled', notifToggle.checked);
            loadNotes(); // Reload to apply change immediately
        });
    }

    const navLinks = document.querySelectorAll('.nav-link');
    const tabContents = document.querySelectorAll('.tab-content');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            tabContents.forEach(c => c.classList.toggle('hidden', c.id !== `tab-${link.dataset.tab}`));
            if (link.dataset.tab === 'calendar' && calendar) calendar.update();
        });
    });

    const noteInput = document.getElementById('note-input');
    const analyzeBtn = document.getElementById('analyze-button');
    const clearBtn = document.getElementById('clear-button');
    const statusMsg = document.getElementById('status-message');
    const resultsContainer = document.getElementById('results-container');
    const calendarToggle = document.getElementById('calendar-toggle');

    async function loadNotes() {
        try {
            const res = await fetch(ENDPOINTS.GET);
            if (!res.ok) throw new Error('Failed');
            const notes = await res.json();
            renderResults(notes);
            updateCalendarAndNotifications(notes);
        } catch (err) { console.error(err); }
    }

    function renderResults(notes) {
        resultsContainer.innerHTML = '';
        if (notes.length === 0) {
            resultsContainer.innerHTML = '<p class="text-dark-muted text-center py-12 bg-dark-card border border-dark-border rounded-2xl">No results yet.</p>';
            return;
        }
        notes.sort((a, b) => b.id - a.id).forEach(note => renderNoteItem(note));
    }

    function renderNoteItem(data) {
        let actionItemsHtml = '';
        if (data.action_items && data.action_items.length > 0) {
            actionItemsHtml = `<div class="mt-4 pt-3 border-t border-dark-border"><p class="text-sm font-semibold text-primary mb-2">Action Items:</p><ul class="space-y-2">${data.action_items.map(i => `<li class="flex items-start text-sm text-dark-text"><input type="checkbox" class="mt-1 mr-2 w-4 h-4 rounded border-dark-border bg-dark-bg text-primary focus:ring-primary flex-shrink-0"><span class="leading-tight">${i}</span></li>`).join('')}</ul></div>`;
        }
        let calendarBtn = '';
        if (data.due_date_iso) {
            const gCalUrl = generateGoogleCalendarUrl(data);
            if (gCalUrl) calendarBtn = `<a href="${gCalUrl}" target="_blank" class="p-2 text-primary hover:bg-primary/10 rounded-lg mr-2 transition-colors" title="Open in Google Calendar"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg></a>`;
        }
        const div = document.createElement('div');
        div.className = 'result-item flex flex-col sm:flex-row justify-between items-start gap-4 group';
        div.innerHTML = `<div class="flex-grow w-full"><div class="flex items-center justify-between sm:justify-start mb-1"><span class="result-task mr-3">${data.task_description || 'Untitled Task'}</span>${data.due_date_iso ? `<span class="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">${formatDate(data.due_date_iso)}</span>` : ''}</div>${actionItemsHtml}<p class="text-sm text-dark-muted italic mt-4 pt-3 border-t border-dark-border/50">Original: "${data.original_text}"</p></div><div class="flex items-center self-end sm:self-start sm:mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">${calendarBtn}<button class="delete-btn p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button></div>`;
        if (data.id) div.querySelector('.delete-btn').addEventListener('click', () => deleteNote(data.id));
        resultsContainer.append(div);
    }

    function updateCalendarAndNotifications(notes) {
        const notifContainer = document.getElementById('notifications-container');
        notifContainer.innerHTML = '';

        // Check notification setting
        if (localStorage.getItem('notificationsEnabled') === 'false') {
            notifContainer.innerHTML = '<div class="bg-dark-card border border-dark-border rounded-2xl p-6 text-center text-dark-muted opacity-75">Notifications are disabled in Settings.</div>';
        } else {
            const now = new Date();
            const upcoming = notes.filter(n => n.due_date_iso && new Date(n.due_date_iso) > now).sort((a, b) => new Date(a.due_date_iso) - new Date(b.due_date_iso)).slice(0, 5);
            if (upcoming.length === 0) notifContainer.innerHTML = '<div class="bg-dark-card border border-dark-border rounded-2xl p-6 text-center text-dark-muted">No upcoming reminders found.</div>';
            else upcoming.forEach(n => notifContainer.innerHTML += `<div class="notification-item bg-dark-card border border-dark-border border-l-4 border-l-primary p-4 rounded-xl mb-3 shadow-sm"><p class="font-semibold text-dark-text text-lg">${n.task_description}</p><p class="text-sm text-dark-muted mt-2 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${formatDate(n.due_date_iso)}</p></div>`);
        }

        const highlightedDates = notes.filter(n => n.due_date_iso).map(n => n.due_date_iso.split(' ')[0]);
        const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        if (!calendar) {
            if (typeof VanillaCalendar === 'undefined') { setTimeout(() => updateCalendarAndNotifications(notes), 500); return; }
            calendar = new VanillaCalendar('#calendar', { settings: { visibility: { theme: currentTheme }, selected: { dates: highlightedDates, month: new Date().getMonth(), year: new Date().getFullYear() } } });
            calendar.init();
        } else {
            calendar.settings.visibility.theme = currentTheme;
            calendar.settings.selected.dates = highlightedDates;
            calendar.update();
        }
    }

    async function deleteNote(id) {
        if (!confirm('Delete permanently?')) return;
        await fetch(ENDPOINTS.DELETE(id), { method: 'DELETE' });
        loadNotes();
    }

    function formatDate(iso) {
        if (!iso) return '';
        const d = new Date(iso.replace(' ', 'T'));
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    function generateGoogleCalendarUrl(data) {
        try {
            const startDate = new Date(data.due_date_iso.replace(' ', 'T'));
            const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
            const formatGCal = (d) => d.toISOString().replace(/-|:|\.\d{3}/g, '');
            let details = `Original note: "${data.original_text}"`;
            if (data.action_items && data.action_items.length > 0) details += `\n\nAction Items:\n- ${data.action_items.join('\n- ')}`;
            const url = new URL('https://www.google.com/calendar/render');
            url.searchParams.append('action', 'TEMPLATE');
            url.searchParams.append('text', data.task_description);
            url.searchParams.append('details', details);
            url.searchParams.append('dates', `${formatGCal(startDate)}/${formatGCal(endDate)}`);
            return url.toString();
        } catch (e) { return null; }
    }

    clearBtn.addEventListener('click', () => { noteInput.value = ''; noteInput.focus(); });
    analyzeBtn.addEventListener('click', async () => {
        const text = noteInput.value.trim();
        if (!text) return;
        analyzeBtn.disabled = true; analyzeBtn.innerHTML = '<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Processing...';
        try {
            const res = await fetch(ENDPOINTS.ADD, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
            const result = await res.json();
            if (result.data.due_date_iso && calendarToggle.checked) {
                const gCalUrl = generateGoogleCalendarUrl(result.data);
                if (gCalUrl) window.open(gCalUrl, '_blank');
            }
            document.querySelector('[data-tab="results"]').click();
            loadNotes();
            noteInput.value = '';
        } catch (e) { alert('Error during analysis.'); }
        analyzeBtn.disabled = false; analyzeBtn.textContent = 'Analyze Note';
    });

    initSettings();
    loadNotes();
});