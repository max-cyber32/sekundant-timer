let startTime = null;
let elapsedBeforePause = 0;
let timerInterval = null;

// Данные и настройки
let shifts = JSON.parse(localStorage.getItem('shifts')) || [];
let savedRate = localStorage.getItem('hourlyRate') || 150;
let savedTheme = localStorage.getItem('theme') || 'dark';
let savedAccent = localStorage.getItem('accentColor') || '#ff8fab';

// Элементы DOM
const timeDisplay = document.getElementById('time');
const shiftMoneyDisplay = document.getElementById('shiftMoney');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');

const menuBtn = document.getElementById('menuBtn');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const sideMenu = document.getElementById('sideMenu');
const overlay = document.getElementById('overlay');

const openStatsBtn = document.getElementById('openStatsBtn');
const closeStatsBtn = document.getElementById('closeStatsBtn');
const statsModal = document.getElementById('statsModal');

const rateInput = document.getElementById('hourlyRate');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const colorPresets = document.getElementById('colorPresets');
const customColorPicker = document.getElementById('customColorPicker');
const clearWeekBtn = document.getElementById('clearWeekBtn');

const barChart = document.getElementById('barChart');
const shiftsList = document.getElementById('shiftsList');

// Применение темы и цвета
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    themeToggleBtn.textContent = theme === 'dark' ? 'Светлая' : 'Темная';
}

function adjustHex(hex, amount) {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function applyAccent(color) {
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--accent-hover', adjustHex(color, -18));
    localStorage.setItem('accentColor', color);
    customColorPicker.value = color;

    document.querySelectorAll('.color-dot').forEach(dot => {
        dot.classList.toggle('active', dot.dataset.accent.toLowerCase() === color.toLowerCase());
    });
}

rateInput.value = savedRate;
applyTheme(savedTheme);
applyAccent(savedAccent);

// Меню и модалка
function openMenu() {
    sideMenu.classList.add('open');
    overlay.classList.add('active');
}

function closeMenu() {
    sideMenu.classList.remove('open');
    if (!statsModal.classList.contains('open')) {
        overlay.classList.remove('active');
    }
}

menuBtn.addEventListener('click', openMenu);
closeMenuBtn.addEventListener('click', closeMenu);

overlay.addEventListener('click', () => {
    closeMenu();
    statsModal.classList.remove('open');
    overlay.classList.remove('active');
});

openStatsBtn.addEventListener('click', () => {
    sideMenu.classList.remove('open');
    statsModal.classList.add('open');
    overlay.classList.add('active');
    renderStats();
});

closeStatsBtn.addEventListener('click', () => {
    statsModal.classList.remove('open');
    overlay.classList.remove('active');
});

// Настройки ставки, темы и цвета
rateInput.addEventListener('change', () => {
    localStorage.setItem('hourlyRate', rateInput.value);
    updateTimerUI();
});

themeToggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
});

colorPresets.addEventListener('click', (e) => {
    const btn = e.target.closest('.color-dot');
    if (!btn) return;
    applyAccent(btn.dataset.accent);
});

customColorPicker.addEventListener('input', (e) => {
    applyAccent(e.target.value);
});

// Форматирование времени
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
        .map(v => v < 10 ? "0" + v : v)
        .join(":");
}

function updateTimerUI() {
    const currentElapsed = startTime ? (Date.now() - startTime + elapsedBeforePause) : elapsedBeforePause;
    timeDisplay.textContent = formatTime(currentElapsed);

    const hours = currentElapsed / (1000 * 60 * 60);
    const rate = parseFloat(rateInput.value) || 0;
    shiftMoneyDisplay.textContent = (hours * rate).toFixed(2);
}

// Управление таймером
startBtn.addEventListener('click', () => {
    startTime = Date.now();
    timerInterval = setInterval(updateTimerUI, 250);

    startBtn.disabled = true;
    pauseBtn.disabled = false;
    stopBtn.disabled = false;
});

pauseBtn.addEventListener('click', () => {
    clearInterval(timerInterval);
    elapsedBeforePause += Date.now() - startTime;
    startTime = null;

    startBtn.disabled = false;
    startBtn.textContent = "Продолжить";
    pauseBtn.disabled = true;
});

stopBtn.addEventListener('click', () => {
    clearInterval(timerInterval);
    const totalMs = startTime ? (Date.now() - startTime + elapsedBeforePause) : elapsedBeforePause;

    if (totalMs > 1000) {
        const rate = parseFloat(rateInput.value) || 0;
        const money = (totalMs / (1000 * 60 * 60)) * rate;
        const now = new Date();

        shifts.push({
            timestamp: now.getTime(),
            date: now.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' }),
            durationMs: totalMs,
            money: money
        });

        localStorage.setItem('shifts', JSON.stringify(shifts));
    }

    startTime = null;
    elapsedBeforePause = 0;
    updateTimerUI();

    startBtn.disabled = false;
    startBtn.textContent = "Старт";
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
});

// Начало текущей недели (понедельник 00:00:00)
function getStartOfCurrentWeek() {
    const now = new Date();
    const day = now.getDay(); // 0 - вс, 1 - пн...
    const diffToMonday = day === 0 ? -6 : 1 - day;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0).getTime();
}

function renderStats() {
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const currentWeekStart = getStartOfCurrentWeek();
    const prevWeekStart = currentWeekStart - weekMs;
    const prev2WeekStart = currentWeekStart - 2 * weekMs;

    const totals = [
        { ms: 0, money: 0 }, // 0: эта неделя
        { ms: 0, money: 0 }, // 1: прошлая
        { ms: 0, money: 0 }  // 2: позапрошлая
    ];

    // Дни недели для графика текущей недели (Пн..Вс)
    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const dayHours = [0, 0, 0, 0, 0, 0, 0];

    shifts.forEach(shift => {
        const ts = shift.timestamp || Date.now();
        if (ts >= currentWeekStart) {
            totals[0].ms += shift.durationMs;
            totals[0].money += shift.money;

            const d = new Date(ts).getDay();
            const idx = d === 0 ? 6 : d - 1;
            dayHours[idx] += shift.durationMs / (1000 * 60 * 60);
        } else if (ts >= prevWeekStart) {
            totals[1].ms += shift.durationMs;
            totals[1].money += shift.money;
        } else if (ts >= prev2WeekStart) {
            totals[2].ms += shift.durationMs;
            totals[2].money += shift.money;
        }
    });

    [0, 1, 2].forEach(i => {
        const hrs = (totals[i].ms / (1000 * 60 * 60)).toFixed(1);
        document.getElementById(`w${i}Hours`).textContent = `${hrs} ч`;
        document.getElementById(`w${i}Money`).textContent = `${totals[i].money.toFixed(2)} грн`;
    });

    // Отрисовка графика
    const maxHours = Math.max(8, ...dayHours);
    barChart.innerHTML = '';
    dayHours.forEach((h, idx) => {
        const pct = Math.min(100, Math.round((h / maxHours) * 100));
        const col = document.createElement('div');
        col.className = 'bar-col';
        col.innerHTML = `
            <div class="bar-track">
                <div class="bar-fill" style="height: 0%;" data-target="${pct}"></div>
            </div>
            <span class="bar-label">${dayNames[idx]}</span>
        `;
        barChart.appendChild(col);
    });

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.querySelectorAll('.bar-fill').forEach(bar => {
                bar.style.height = `${bar.dataset.target}%`;
            });
        });
    });

    // Список последних смен (сверху свежие)
    shiftsList.innerHTML = '';
    [...shifts].reverse().slice(0, 15).forEach(shift => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${shift.date} · ${formatTime(shift.durationMs)}</span><strong>${shift.money.toFixed(2)} грн</strong>`;
        shiftsList.appendChild(li);
    });
}

clearWeekBtn.addEventListener('click', () => {
    if (confirm('Очистить всю историю смен?')) {
        shifts = [];
        localStorage.setItem('shifts', JSON.stringify(shifts));
        renderStats();
    }
});

updateTimerUI();