# Dex Task: GitHub Repo Initialisation

## Objective
Create a GitHub repo for the UKCP project, wire it to the local project folder, and push the initial commit.

---

## Steps

### 1. Create the remote repo
Using the GitHub CLI (`gh`), create a new repo:
```bash
gh repo create ukcp --private --description "UK Census Places — React SPA + Express" --confirm
```
If `--confirm` flag is not valid in your gh version, use `--source=. --remote=origin` after init (step 3).

---

### 2. Create .gitignore
In the UKCP project root (`C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP\`), create `.gitignore`:
```
node_modules/
dist/
.env
.env.*
*.log
public/data/newplace.csv
public/data/place-corrections.json
```
> `newplace.csv` is 54K rows — too large for routine commits. `place-corrections.json` is a build artefact derived from it.

---

### 3. Initialise git and push
```bash
cd C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP
git init
git add .
git commit -m "Initial commit — UKCP project"
gh repo create spraglack/ukcp --private --source=. --remote=origin --push
```
> Use Phil's GitHub account: spraglack@googlemail.com. Check `gh auth status` first to confirm the authenticated user.

---

### 4. Verify
```bash
git remote -v
git log --oneline -5
gh repo view
```
Confirm remote is set, initial commit is present, and repo is visible on GitHub.

---

## Notes
- Project root is `Ali-Projects/UKCP/` — that is the git root. Do not go up to `Ali-Projects/`.
- Branch strategy: `main` only for now. Branching model TBD when Vercel/Railway are wired.
- Do not commit `dist/` — Vercel will build from source.
- Report back: repo URL, commit SHA, any errors.
