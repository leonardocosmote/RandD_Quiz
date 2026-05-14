# 6G-EWOC tablet poll

Static poll for tablets (e.g. EuCNC): questions load from **`questions.json`**, answers are opinions (no scoring), and responses are stored via **Google Apps Script** with **`projectId: 6G-EWOC`**. The dashboard requests metrics with `?projectId=6G-EWOC` so this project stays separate when the same backend stores other polls.

The file **`questions.md`** is an optional human-readable outline of the same content; the browser only fetches **`questions.json`**.

## Features

- **JSON questions** — edit `questions.json`; each item has `id`, `question`, `options`, and `type` (`"single"` or `"rank"`). If `type` is omitted, ids **2–9** default to **rank** (up to three ordered picks), **1, 10, 11** to **single**.
- **Rank (optional depth)** — for `type: "rank"`, participants tap **one to three** options in priority order, then **Continue** (they may stop after one or two).
- **Optional free text** — when an option asks for “Other” / “self-describe”, an optional note can be added.
- **Contextual feedback** — optional parallel **`feedback`** array (one string per option). After **rank** questions, the line for **#1** is shown; after **single** choice, the line for the chosen option. If `feedback` is missing or short, a short neutral fallback is used.
- **Incomplete sessions** — partial responses may be logged if the user leaves after a few answers.

## Project structure

```
quiz/
├── index.html
├── styles.css
├── script.js
├── questions.json              # Loaded by the app (required for deploy)
├── questions.md                # Optional draft / reference (not loaded by the app)
├── GoogleAppsScript-Template.gs
├── dashboard/
│   ├── index.html
│   └── script.js
└── README.md
```

## Setup

1. Create a Google Sheet and **Extensions → Apps Script**.
2. Paste **`GoogleAppsScript-Template.gs`**, save, **Deploy → Web app** (Execute as: you, Anyone).
3. Copy the **Web App URL** into `script.js` and `dashboard/script.js` (`googleAppsScriptUrl`).
4. **Redeploy** the script after changing the template.

On first POST to an empty sheet, the template creates headers:

`Timestamp`, `Project ID`, `User Name`, `Gender response` (Q11 summary), `Answered Count`, `Poll Total`, `Completed`, `Answers JSON`

## `questions.json` format

```json
[
  {
    "id": 1,
    "type": "single",
    "question": "…",
    "options": ["…", "…"],
    "feedback": ["…", "…"]
  },
  {
    "id": 2,
    "type": "rank",
    "question": "…",
    "options": ["…", "…", "…"],
    "feedback": ["…", "…", "…"]
  }
]
```

## Payload (POST body)

```json
{
  "projectId": "6G-EWOC",
  "userName": "…",
  "answeredCount": 11,
  "pollTotal": 11,
  "completed": true,
  "timestamp": "…",
  "answers": [ … ]
}
```

## Dashboard

Open `dashboard/index.html`. It fetches:

`{googleAppsScriptUrl}?projectId=6G-EWOC`

## GitHub Pages

Upload at least: `index.html`, `styles.css`, `script.js`, **`questions.json`**, and the `dashboard/` folder if you use the dashboard.

## Troubleshooting

- **Questions not loading** — ensure `questions.json` is next to `index.html` and JSON is valid.
- **Sheet empty** — confirm the Web App URL, deployment access “Anyone”, and Apps Script execution log.
- **Dashboard empty** — ensure rows include **Project ID** `6G-EWOC` when using the filtered GET.

## License

Free to use and modify.
