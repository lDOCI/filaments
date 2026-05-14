// Minimal i18n: data-i18n="key" elements get text content swapped on language change.
const dict = {
  ru: {
    'sidebar.search': 'Поиск',
    'sidebar.sort': 'Сортировка',
    'crumbs.home': 'Главная',
    'crumbs.catalog': 'Каталог катушек',
    'calc.open': 'Открыть калькулятор',
    'hero.eyebrow': 'База открытых данных · 2026',
    'hero.title': 'Веса катушек филаментов',
    'hero.lede': 'Взвесь катушку. Вычти вес пустой. Узнай, сколько грамм и метров нити осталось.',
    'hero.records': 'записей',
    'hero.brands': 'брендов',
    'hero.materials': 'материалов',
    'calc.title': 'Калькулятор остатка',
    'calc.hint': 'Выбери филамент и введи показания весов — посчитаем, сколько осталось.',
    'calc.brand': 'Производитель',
    'calc.model': 'Филамент',
    'calc.measured': 'Вес на весах, г',
    'calc.remaining': 'осталось',
    'calc.length': 'длина',
    'calc.spool': 'вес катушки',
    'calc.density': 'плотность',
    'catalog.title': 'Каталог',
    'filters.material': 'Материал',
    'filters.country': 'Страна',
    'sort.label': 'Сортировка:',
    'sort.brand': 'бренд',
    'sort.spool': 'вес катушки',
    'sort.net': 'нетто',
    'sort.material': 'материал',
    'card.spool': 'катушка',
    'card.noData': 'нет данных',
    'sheet.brand': 'Бренд',
    'sheet.material': 'Материал',
    'sheet.net': 'Нетто',
    'sheet.spool': 'Катушка',
    'sheet.gross': 'Брутто',
    'sheet.dia': 'Ø нити',
    'sheet.density': 'Плотность',
    'sheet.country': 'Страна',
    'sheet.links': 'Где купить',
    'sheet.helpTitle': 'Помоги — пришли вес своей пустой катушки',
    'sheet.helpText': 'Точных данных нет. Сними нить, взвесь катушку и пришли число. Все правки модерируются вручную.',
    'sheet.helpCta': 'Отправить вес',
    'sheet.contributeQuiet': 'Уточнить вес',
    'calc.noData': 'У этого филамента нет данных о весе катушки',
    'contribute.title': 'Отправить вес катушки',
    'contribute.currentWeight': 'сейчас в базе',
    'contribute.weight': 'Вес пустой катушки, г',
    'contribute.photo': 'Фото весов',
    'contribute.photoHint': 'Опционально — для подтверждения. Сжимаем до 1024 px.',
    'contribute.nick': 'Ник или имя',
    'contribute.nickPh': 'Опционально — упомянем как контрибьютора',
    'contribute.comment': 'Комментарий',
    'contribute.commentPh': 'Партия, цвет, особенности — что-то полезное',
    'contribute.note': 'Данные попадут в очередь на модерацию. Не публикуем без проверки.',
    'contribute.cancel': 'Отмена',
    'contribute.submit': 'Отправить',
    'contribute.sending': 'Отправляем…',
    'contribute.thanks': 'Спасибо! Получили — добавим после проверки.',
    'contribute.failed': 'Не получилось отправить',
    'contribute.notConfigured': 'Приёмник пока не настроен — данные не отправятся. Зайди позже.',
    'search.placeholder': 'Поиск по бренду или материалу…',
    'all': 'Все',
    'empty': 'Ничего не найдено',
    'more': 'подробнее →'
  },
  en: {
    'sidebar.search': 'Search',
    'sidebar.sort': 'Sort',
    'crumbs.home': 'Home',
    'crumbs.catalog': 'Spool catalog',
    'calc.open': 'Open calculator',
    'hero.eyebrow': 'Open data · 2026',
    'hero.title': 'Filament spool weights',
    'hero.lede': 'Weigh the spool. Subtract the empty spool. Know exactly how many grams and meters remain.',
    'hero.records': 'records',
    'hero.brands': 'brands',
    'hero.materials': 'materials',
    'calc.title': 'Remaining calculator',
    'calc.hint': 'Pick a filament, enter the scale reading, get what is left.',
    'calc.brand': 'Manufacturer',
    'calc.model': 'Filament',
    'calc.measured': 'Scale reading, g',
    'calc.remaining': 'remaining',
    'calc.length': 'length',
    'calc.spool': 'spool weight',
    'calc.density': 'density',
    'catalog.title': 'Catalog',
    'filters.material': 'Material',
    'filters.country': 'Country',
    'sort.label': 'Sort:',
    'sort.brand': 'brand',
    'sort.spool': 'spool weight',
    'sort.net': 'net weight',
    'sort.material': 'material',
    'card.spool': 'spool',
    'card.noData': 'no data',
    'sheet.brand': 'Brand',
    'sheet.material': 'Material',
    'sheet.net': 'Net',
    'sheet.spool': 'Spool',
    'sheet.gross': 'Gross',
    'sheet.dia': 'Ø filament',
    'sheet.density': 'Density',
    'sheet.country': 'Country',
    'sheet.links': 'Where to buy',
    'sheet.helpTitle': 'Help us — send your empty spool weight',
    'sheet.helpText': 'No exact data yet. Take the filament off, weigh the spool and send the number. All edits are reviewed manually.',
    'sheet.helpCta': 'Send weight',
    'sheet.contributeQuiet': 'Refine weight',
    'calc.noData': 'No spool weight data for this filament',
    'contribute.title': 'Submit a spool weight',
    'contribute.currentWeight': 'currently in DB',
    'contribute.weight': 'Empty spool weight, g',
    'contribute.photo': 'Scale photo',
    'contribute.photoHint': 'Optional — for verification. Compressed to 1024 px.',
    'contribute.nick': 'Nick or name',
    'contribute.nickPh': 'Optional — credited if used',
    'contribute.comment': 'Comment',
    'contribute.commentPh': 'Batch, color, anything useful',
    'contribute.note': 'Submissions are reviewed before publishing.',
    'contribute.cancel': 'Cancel',
    'contribute.submit': 'Submit',
    'contribute.sending': 'Sending…',
    'contribute.thanks': 'Thanks! Received — will be added after review.',
    'contribute.failed': 'Could not submit',
    'contribute.notConfigured': 'Receiver not configured yet — try again later.',
    'search.placeholder': 'Search by brand or material…',
    'all': 'All',
    'empty': 'No results',
    'more': 'details →'
  }
};

let current = localStorage.getItem('lang') || (navigator.language?.startsWith('en') ? 'en' : 'ru');
const subs = new Set();

export function t(key) { return dict[current]?.[key] ?? key; }
export function getLang() { return current; }
export function setLang(l) {
  if (!dict[l] || l === current) return;
  current = l;
  localStorage.setItem('lang', l);
  document.documentElement.lang = l;
  applyDOM();
  subs.forEach(fn => fn(l));
}
export function onLang(fn) { subs.add(fn); return () => subs.delete(fn); }

function applyDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    el.textContent = t(k);
  });
  // Update specific placeholders
  const search = document.querySelector('[data-search]');
  if (search) search.placeholder = t('search.placeholder');
  // Lang toggle marker
  document.querySelectorAll('[data-lang]').forEach(el => {
    el.classList.toggle('is-active', el.dataset.lang === current);
  });
}

export function initI18n() {
  document.documentElement.lang = current;
  applyDOM();
}
