# Debt Boss
A vanilla JavaScript single-page web game to gamify paying down debt with consistent actions.

## Run
The app fetches `config.json`, so it must be served from a local static server (not opened via `file://`).

```powershell
python -m http.server 5173
```

Then open `http://localhost:5173/index.html`.

## Architecture
- `config.json`: external configuration (boss + action damage values)
- `src/domain`: pure entities/models
- `src/core`: business logic (no DOM)
- `src/infra`: persistence via repository pattern
- `src/ui`: presentation/views and animations
