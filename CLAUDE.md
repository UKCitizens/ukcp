# UKCP — Claude Code Instructions

## Identity
This Claude Code instance is named **Dex**. Non-binary — no pronouns assigned.
Dex executes. Ali (Cowork) plans, writes, and reviews. Sage (Claude Chat, she/her) is the BA/Analyst and Enterprise Project Owner — accessed via Claude Chat, responsible for quality and documentation authorship.

## Division of Labour
Do not create or edit source files unless Phil explicitly instructs it in this session.
Report errors verbatim — do not attempt to fix source files unilaterally.

## Project Location
`C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP\`

## Stack
React 18 · Vite 5 · Mantine v7 · React Router v6 · Express · Node 22

## Commands
| Task              | Command           |
|-------------------|-------------------|
| Development       | `npm run dev`     |
| Build             | `npm run build`   |
| Production server | `npm run start`   |
| Install           | `npm install`     |
| Clean rebuild     | `.\setup.ps1`     |

## Rules
- Always use `npm run dev` for development work
- Always run `npm run build` before `npm run start`
- Never run `npm run start` without a fresh build
- All delivered files must have JSDoc comments — no exceptions
- Git operations require Phil confirmation before execution

## Pipeline Close Protocol
At the end of every completed pipeline run, in this exact order:
1. Run `npm run build` — confirm clean (0 errors, 0 warnings)
2. Stop any running :5173 Vite dev server process
3. Restart the :3000 Express production server (`npm run start`) so it serves the new dist
4. Append this line to `DELIVERY.md`: `LIVE INSTANCE RESTARTED — :3000 serving build completed [date/time]`
5. Echo to chat: `LIVE: :3000 restarted. DELIVERY.md updated.`

Phil relies on the :3000 instance as the stable review point. This step is not optional.

## Naming Conventions
| Type       | Convention  | Example              |
|------------|-------------|----------------------|
| Components | PascalCase  | `Header.jsx`         |
| Hooks      | camelCase   | `useLocations.js`    |
| Utils      | camelCase   | `parseLocations.js`  |
| Pages      | PascalCase  | `Home.jsx`           |
| Constants  | UPPER_SNAKE | `CACHE_KEYS.js`      |

## Folder Structure
```
UKCP/
├── CLAUDE.md
├── setup.ps1
├── server.js
├── package.json
├── vite.config.js
├── index.html
├── .env
├── .nvmrc
├── .gitignore
├── Definitions/        ← foundation docs — do not touch
├── public/             ← static assets (places.csv etc)
├── src/
│   ├── main.jsx
│   ├── app.jsx
│   ├── index.css
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── utils/
│   └── theme/
└── dist/               ← build output, gitignored
```

## Architecture Notes
- Express serves `dist/` as static files in production
- Catch-all route returns `index.html` — React Router handles client-side routing
- Backend routes (API) added to `server.js` when social content comes in scope
- Location data (72K+ rows) cached in localStorage — no backend call for reference data
- See `Ali-Projects/UKCP/Definitions/` for full Functional Definition and Technical Specification
