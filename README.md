# Year Tracker

A minimal annual activity calendar built with HTML, CSS and JavaScript.

## Run locally

```bash
python3 -m http.server 8000
```

Open http://localhost:8000.

## Files

- `index.html`: page structure.
- `style.css`: calendar layout and responsive styles.
- `script.js`: state, calendar generation, activity selection and local persistence.
- `.github/workflows/pages.yml`: deployment after every push to `main`.

## GitHub Pages

Create a repository named `year-tracker`, push these files to `main`, and select **GitHub Actions** in **Settings > Pages**. The included workflow publishes only the three frontend files.

## Data

Default activities: Running, Natation, Vélo, Randonnée, Musculation and Renfo. Example entries are included for the current year. Change `defaultActivities` and `sampleEntries` in `script.js` to customize them.

Activities and entries are saved under `year-tracker-v2` in localStorage. Data stays in the current browser and is not uploaded to GitHub. It is not synchronized across devices.

## How it works

The HTML loads the stylesheet and deferred script using relative paths, so the app also works under a GitHub Pages repository subdirectory. The script loads the saved state, generates each month, and adds click handlers to the day buttons. Activity buttons support multiple selection. All toggles between all and none. Clicking a day adds the selected activities, or removes them when all are present. The activity manager supports names, colors and confirmed deletion; Save commits the draft, while Cancel, Escape and outside clicks discard it.
