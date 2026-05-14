# План: Сайт-каталог филаментов с весами катушек

> Референс данных: [lDOCI.github.io/filaments.html](https://github.com/lDOCI/lDOCI.github.io/blob/main/filaments.html)
> Референс стиля: минималистичный интерактив на **Anime.js** (как у animejs.com)
> Основная фишка: **точные веса пустых катушек** всех производителей, чтобы по показаниям весов можно было высчитать остаток филамента.

---

## 1. Цель и контекст

Пользователь печатает на 3D-принтере и хочет знать, **сколько филамента реально осталось на катушке**. Для этого нужно:

1. Взвесить катушку с филаментом.
2. Вычесть вес **пустой катушки конкретного производителя** (он у всех разный — от 145 до 256 г).
3. Получить остаток нити в граммах → в метрах.

Существующая страница `filaments.html` решает эту задачу, но выглядит как стандартная HTML-таблица. Мы делаем **визуально премиальный** аналог в стиле Anime.js с расширенной базой данных.

---

## 2. Объём работ по сбору данных

Это **самая трудоёмкая часть**. Нужно собрать **исчерпывающую базу** филаментов российского и мирового рынка.

### 2.1. Источники для сбора
- Существующий JSON [filaments_data/filaments.json](https://github.com/lDOCI/lDOCI.github.io/blob/main/filaments_data/filaments.json) (~125 позиций) — базовая выгрузка
- Официальные сайты производителей (раздел "Технические характеристики", "Спецификация катушки")
- Карточки товаров на **Ozon / Wildberries / Яндекс.Маркет** — там часто пишут вес катушки в описании
- Профильные форумы: **3dtoday.ru**, **Reddit r/3Dprinting**, **r/FixMyPrint**
- Базы: **Filament Friday**, **All3DP**, **Filaween**
- YouTube-обзоры с распаковками (там нередко взвешивают пустую катушку)
- Telegram-чаты сообществ 3D-печати (закреплённые таблицы)

### 2.2. Производители для покрытия (минимум)

**Россия / СНГ (приоритет — у них самая слабая агрегация инфы):**
Bestfilament, FDplast, FILAMENTARNO!, REC, U3Print, MAKO, EXOFLEX, Cyberfiber, НИТ, SynTech, Hi-Tech Plast, Некрасовский, СТРИМПЛАСТ, ABS Maker, SolidFilament, MY3D, PrintProduct, Print Product, Strimplast, PLEX, Tiger3D, 3DPlast, Filamentpm.

**Зарубежные (массовые):**
eSUN, SUNLU, Polymaker (PolyLite/PolyTerra/PolyMax), Prusament, Bambu Lab (PLA Basic / Matte / Silk / PETG HF / ABS / ASA / Support / PAHT-CF / PET-CF / TPU), Creality (CR-PLA / Hyper PLA / Ender), Anycubic, Elegoo, Overture, Hatchbox, MatterHackers Build/PRO, ColorFabb, Fillamentum, Das Filament, Extrudr, Formfutura, AddNorth, 3DJake, Geeetech, ERYONE, Kingroon, PopBit, Tinmorry, JAYO, IEMAI, FlashForge, Raise3D, Ultimaker, MakerBot, Verbatim.

**Инженерные / композитные:**
ColorFabb XT/HT, Polymaker PC/PA/PEEK, Markforged Onyx/Nylon, 3DXTech CarbonX/EcoMax, Kimya, Mitsubishi Chemical, Owens Corning, Push Plastic.

### 2.3. Поля для каждой записи
| Поле | Тип | Пример |
|---|---|---|
| `id` | string | `bambu-pla-basic-1kg` |
| `manufacturer` | string | `Bambu Lab` |
| `productLine` | string | `PLA Basic` |
| `material` | enum | `PLA / PLA+ / PETG / ABS / ASA / TPU / Nylon / PC / HIPS / PVA / PEEK / PEI / PA-CF / PET-CF / Wood / Metal / Silk / Matte / Glow` |
| `netWeight` | number (г) | `1000` |
| `spoolWeight` | number (г) | `135` — **главная метрика** |
| `grossWeight` | number (г) | `1135` (расчётно) |
| `diameter` | enum | `1.75 / 2.85 / 3.0` мм |
| `spoolType` | enum | `plastic / cardboard / refill / reusable` |
| `spoolOuterDiameter` | number (мм) | `200` |
| `spoolWidth` | number (мм) | `68` |
| `spoolInnerDiameter` | number (мм) | `54` |
| `density` | number (г/см³) | `1.24` (для расчёта метров) |
| `printTemp` | string | `190–220°C` |
| `bedTemp` | string | `45–60°C` |
| `color` | string (optional) | `Black / White / ...` |
| `country` | string | `Russia / China / Czech Republic` |
| `links.official` | url | — |
| `links.ozon` | url | — |
| `links.wildberries` | url | — |
| `sourceConfidence` | enum | `official / measured / community / estimated` |
| `lastVerified` | date | `2026-05-13` |
| `notes` | string | свободный комментарий |

**Объём цели:** минимум **300–400 записей** для серьёзной базы, оптимум **600+**.

### 2.4. Формат хранения
- `data/filaments.json` — основной массив записей
- `data/manufacturers.json` — справочник производителей (логотип, сайт, страна)
- `data/materials.json` — справочник материалов (описание, типичная плотность, режимы печати)

Каждая запись помечается `sourceConfidence`, чтобы пользователь видел уверенность данных.

---

## 3. Технический стек

- **Чистый HTML + ES-модули + Vite** (быстрый dev-server, единый бандл для GitHub Pages)
- **Anime.js v4** (`npm i animejs`) — единственная зависимость для анимации
- **Без фреймворков** (React/Vue) — чтобы остаться "минимальными", как требует стиль
- **Web Components** для карточки филамента и калькулятора (изоляция стилей)
- **CSS Grid + Container Queries** — адаптив без media-query-зоопарка
- **Fuse.js** (опционально, ~5 КБ) — fuzzy-поиск по бренду/материалу

Деплой: **GitHub Pages** (статика, как у референса).

---

## 4. Структура страницы

```
┌──────────────────────────────────────────────────────────┐
│ HERO — крупный заголовок с staggered-анимацией текста    │
│        подзаголовок "База весов катушек филаментов"      │
│        счётчик: "423 записи / 67 брендов / обновлено …" │
├──────────────────────────────────────────────────────────┤
│ КАЛЬКУЛЯТОР ОСТАТКА (sticky-блок)                        │
│   [выбор бренда ▾] [выбор линейки ▾] [вес катушки на     │
│   весах: __ г] → выводит: остаток = X г ≈ Y м            │
├──────────────────────────────────────────────────────────┤
│ ФИЛЬТРЫ (chips)                                          │
│   материал · производитель · вес нетто · диаметр · стр.  │
├──────────────────────────────────────────────────────────┤
│ ТАБЛИЦА / СЕТКА КАРТОЧЕК                                 │
│   sortable: бренд, материал, нетто, **вес катушки**,     │
│              диаметр                                     │
│   каждая строка раскрывается в детальную карточку        │
├──────────────────────────────────────────────────────────┤
│ FOOTER — методология, как мерили, как контрибьютить       │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Анимации (стиль Anime.js)

Принцип: **UI минимален → движение становится контентом**. Никаких декоративных частиц — каждая анимация имеет смысл.

| Элемент | Анимация | Anime.js API |
|---|---|---|
| Заголовок hero | посимвольный stagger fade-in + blur(8px → 0) | `animate(chars, { y: [40,0], opacity:[0,1], filter:[…], delay: stagger(30) })` |
| Счётчик записей | tween 0 → N с easing `outExpo` | `animate({n:0}, {n: total, round:1})` |
| Появление карточек при скролле | grid-stagger по сетке (`stagger(50, {grid:[cols, rows], from:'center'})` | IntersectionObserver + `animate` |
| Фильтр-chip активация | scale 1 → 1.05 → 1 + colour morph | `animate(chip, {scale:[…], duration:400, ease:'outElastic(1,.6)'})` |
| Сортировка таблицы | FLIP-анимация (record positions → reorder DOM → animate from delta) | `animate(rows, {translateY:…})` |
| Раскрытие детальной карточки | height 0 → auto через `animate` с `update`-колбэком + clip-path морфинг | timeline |
| Калькулятор результата | цифра «прыгает» при изменении (scale 1.2 → 1, цвет акцент → норма) | `animate(numNode, …)` |
| Курсор | мягкая SVG-точка следует за мышью с easing (lerp через `onUpdate`) | `animate({x:0,y:0}, …)` + RAF |
| Hover на строке | плавный градиент сдвигается слева направо | CSS-переменная `--mx` обновляется анимацией |
| Переход тем (свет/тьма) | круговой clip-path reveal из точки клика | `animate(root, {'--reveal': […]})` |
| Лого/иконка материала | SVG line-draw на первом появлении (`strokeDashoffset`) | `animate(path, {strokeDashoffset:[len,0]})` |

Все длительности 300–800 мс, easing — `outExpo` / `outQuart` / редко `outElastic` для подтверждений. Никаких бесконечных лупов, кроме курсора.

---

## 6. Калькулятор остатка (ключевая фича)

```
Остаток_грамм   = Вес_на_весах − spoolWeight(выбранный филамент)
Остаток_метров  = Остаток_грамм / (π × (d/2)² × density / 1000)
```

Где `d` — диаметр нити (1.75 / 2.85), `density` — плотность из карточки материала.

UX:
- Большое поле ввода веса (моноширинный шрифт, авто-фокус)
- Под ним — два крупных числа с tween-анимацией: **«осталось ≈ 643 г / 215 м»**
- Кнопка «скопировать в буфер» с micro-bounce подтверждением
- Сохранение последних 5 расчётов в `localStorage`

---

## 7. Дизайн-система

- **Цвета:** монохром (off-white `#fafaf7`, ink `#0a0a0a`), 1 акцент (`#ff5b22` — оранжевый, как у animejs.com), `#10b981` для подтверждений
- **Шрифты:**
  - заголовки — `'PP Neue Montreal'` / fallback `'Inter Tight'`
  - моноспейс для чисел — `'JetBrains Mono'`
- **Сетка:** 12 колонок, max-width 1280px, gutter 24 px
- **Радиусы:** 0 для таблицы, 12 px для карточек, 999 px для chip
- **Тёмная тема:** инверсия + изменение акцента на чуть светлее

---

## 8. Этапы реализации

| # | Этап | Срок | Результат |
|---|---|---|---|
| 1 | **Сбор данных, фаза 1** — выгрузить и распарсить существующий JSON, добавить недостающие поля для имеющихся 125 позиций | 1 день | `data/filaments.json` v0.1, ~125 записей |
| 2 | **Сбор данных, фаза 2** — пройти по списку производителей из §2.2, добавить минимум 200 новых SKU. Веса катушек брать с офсайтов / Ozon / форумов, проставить `sourceConfidence` | 3–5 дней | `data/filaments.json` v0.2, ~325 записей |
| 3 | **Сбор данных, фаза 3** — инженерные и композитные филаменты, экзотика | 2 дня | v0.3, ~400+ записей |
| 4 | Инициализация Vite-проекта, базовый layout, шрифты, токены | 0.5 дня | `index.html`, `src/main.js`, `src/styles/` |
| 5 | Hero-секция с staggered-анимацией текста и счётчиком | 0.5 дня | работающий hero |
| 6 | Таблица: рендер, сортировка, FLIP-анимация при reorder | 1 день | сортируемый список |
| 7 | Фильтры (chips) + поиск | 0.5 дня | работающая фильтрация |
| 8 | Калькулятор остатка | 0.5 дня | sticky-блок с расчётом |
| 9 | Детальная карточка (модалка/раскрытие) с line-draw SVG | 0.5 дня | карточка |
| 10 | Курсор, hover-эффекты, переход тем | 0.5 дня | финальный полиш |
| 11 | Адаптив (mobile-first ревью), a11y (focus rings, prefers-reduced-motion) | 0.5 дня | мобильная версия |
| 12 | Деплой на GitHub Pages + open-source гайд по контрибьюту в `data/filaments.json` | 0.5 дня | прод |

**Итого:** ~10–12 рабочих дней, из которых 6–8 — это сбор и валидация данных.

---

## 9. Структура файлов

```
.
├── index.html
├── package.json                  # animejs, vite, fuse.js
├── vite.config.js
├── public/
│   └── icons/                    # SVG-иконки материалов
├── src/
│   ├── main.js                   # точка входа
│   ├── styles/
│   │   ├── tokens.css            # CSS-переменные
│   │   ├── base.css
│   │   └── components.css
│   ├── components/
│   │   ├── hero.js
│   │   ├── filament-table.js     # Web Component
│   │   ├── filament-card.js      # Web Component
│   │   ├── calculator.js
│   │   ├── filters.js
│   │   └── cursor.js
│   ├── lib/
│   │   ├── animate.js            # обёртки над anime.js
│   │   ├── flip.js               # FLIP helper для сортировки
│   │   └── search.js             # Fuse-обёртка
│   └── data/
│       └── loader.js             # fetch + кэш
├── data/
│   ├── filaments.json            # ⭐ главный артефакт
│   ├── manufacturers.json
│   └── materials.json
└── docs/
    ├── METHODOLOGY.md            # как мы измеряли / классифицировали
    └── CONTRIBUTING.md           # как добавить новый филамент
```

---

## 10. Открытые вопросы (надо подтвердить перед стартом)

1. **Хостинг:** GitHub Pages подходит, или нужен свой домен?  GitHub Pages
2. **Язык интерфейса:** только русский, или мультиязычный (RU/EN)? Ru/en упор на RU в первую очередь
3. **Калькулятор:** считать ли только остаток в граммах/метрах, или ещё процент? в граммах, процент думаю не так важен
4. **Контрибьюции:** оставить базу закрытой (только мейнтейнер правит JSON) или открыть PR-флоу? сложно будет сделать открытое комьюннити
5. **Источник истины:** если производитель меняет вес катушки в новой партии — версионируем или перезаписываем? версионируем 
6. **Цены:** включаем ли цены/ссылки на маркетплейсы, как в референсе, или фокус только на технических данных? ссылки желательны, но парсить из та еще задача

---

## 11. Риски

- **Данные:** многие производители не указывают вес пустой катушки → нужно искать обзоры или просить сообщество. Решение: помечать `sourceConfidence: 'community'/'estimated'` и просить уточнений через GitHub Issues.
- **Анимации vs производительность:** при 400+ строках наивная анимация всех `enter`-карточек убьёт FPS. Решение: virtualised list + анимировать только видимые.
- **Мобильные:** курсор и hover-эффекты бессмысленны на тач-устройствах. Решение: `@media (hover:hover)` + `pointer:fine`.
- **A11y:** Anime.js легко делает движение чрезмерным. Решение: глобальная проверка `prefers-reduced-motion` в обёртке `animate.js`.
