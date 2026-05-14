# spool.weights — каталог весов катушек филаментов

Минималистичный каталог пустых весов катушек филаментов для 3D-печати + калькулятор остатка нити по показаниям весов.

**441 запись · 93 бренда · 159 материалов** — фокус на российские бренды (243 RU + 8 UA).

Стиль и компоновка вдохновлены [3dfilamentprofiles.com](https://3dfilamentprofiles.com/), но без мыльных нейро-favicon-ов.

## Возможности

- **Каталог** карточек, сгруппированных по производителям
- **Логотипы брендов** (77 настоящих лого / остальным буква-аватарка)
- **Фильтры**: материал (12 семейств: PLA / PETG / ABS / TPU / Nylon / Composite / Engineering / ...), страна
- **Сортировка**: бренд / вес катушки / нетто / материал
- **Калькулятор остатка** в модалке: бренд → филамент → вес на весах → остаток в граммах и метрах с учётом плотности материала
- **Контрибьюция данных**: пользователь может прислать вес своей пустой катушки (вес + фото + комментарий) — данные летят в Google Sheet через Apps Script
- **Темы**: авто (по системе) + ручной toggle, тёмная и светлая
- **Двуязычный** интерфейс (RU / EN)
- **Поля каждой записи**: ID, бренд, материал + семейство, нетто, вес катушки, диаметр нити, плотность, страна, ссылки (сайт / Ozon / WB / Ali), источник данных

## Стек

- **Vite 5** + ES-модули, без фреймворков
- **Anime.js v4** — единственная JS-зависимость рантайма
- Чистый CSS с custom properties и container queries
- **Playwright** + Python — для скрапа данных и логотипов брендов

## Запуск

```bash
npm install
npm run dev      # dev-сервер на :5173
npm run build    # сборка в ./dist
npm run preview  # просмотр сборки
```

## Структура

```
.
├── index.html
├── data/
│   ├── filaments.json         — главная база (441 запись, генерируется)
│   ├── russian_brands.json    — курируемые российские/CIS бренды (исходник)
│   ├── manufacturers.json     — индекс производителей
│   ├── materials.json         — индекс материалов
│   └── logos.json             — манифест путей к логотипам брендов
├── public/
│   └── logos/                 — 77 PNG/SVG логотипов брендов
├── src/
│   ├── main.js
│   ├── styles/main.css
│   ├── components/            — hero, groups, filters, calc, sheet, contribute-form
│   └── lib/                   — animate, i18n, contribute, logo
├── scripts/
│   ├── build_database.py      — собирает filaments.json из russian_brands + reference + NEW_DATA
│   ├── scrape_logos.mjs       — авто-скрап лого с сайтов брендов
│   ├── scrape_logos_pw.mjs    — Playwright-проход для защищённых сайтов
│   └── ...
├── docs/
│   └── apps-script.gs         — приёмник пользовательских данных (Google Apps Script)
└── .github/workflows/deploy.yml — авто-деплой на GitHub Pages
```

## Контрибьюция данных

Каждый филамент в детальной карточке имеет кнопку **«Отправить вес»** (или «Уточнить вес»). Открывается модалка → юзер вводит вес пустой катушки + фото весов + ник + коммент → данные летят в Google Sheet через Apps Script Web App.

Для модерации:
1. Открой `data/russian_brands.json`
2. Найди соответствующий бренд → запись
3. Поставь измеренный вес в `spoolWeight`, измени `confidence` на `measured`
4. Перезапусти `python3 scripts/build_database.py`

## Деплой на GitHub Pages

1. Создай репозиторий на GitHub (любое имя — например `filaments`)
2. Запушь ветку `main`
3. Settings → Pages → Build and deployment → **GitHub Actions**
4. Workflow `deploy.yml` соберёт и опубликует автоматически
5. Сайт будет доступен по `https://<username>.github.io/<repo>/`

`base`-путь Vite автоматически выставляется в `/<repo>/` через переменную `VITE_BASE` в workflow. Для деплоя на свой домен или `username.github.io` — заведи в Settings → Variables `VITE_BASE` со значением `/`.

## Источники данных

- Существующая база [lDOCI/lDOCI.github.io](https://github.com/lDOCI/lDOCI.github.io) — стартовые 80 русских записей
- Каталог [Scuk's Empty Spool Weight Catalog](https://www.printables.com/model/464663-empty-spool-weight-catalog) — 200+ международных брендов
- [softed.su](https://softed.su/ves-pusth-katushek-ot-filamenta/), [3dtoday](https://3dtoday.ru/blogs/hexagonsector3d/proizvoditeli-filamenta-i-ix-materialy-dlya-3d-pecati-iz-rf-ekstruziya-materiala-fdm) — измеренные веса русских брендов
- Официальные карточки производителей (Bestfilament BF-1, FDplast PDF, REC Wiki, и др.)

## Лицензия

MIT — данные собраны из открытых источников.
