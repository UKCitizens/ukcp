# DEX INSTRUCTION — GitHub Remote Setup & First Push
> One-time task. Execute in order. Report each step result before proceeding to next.

---

## Context

UKCP already has a local `.git` repo. Phil has created a new dedicated GitHub account for UKCP. This task sets that account as the remote origin and pushes the codebase for the first time.

Phil will provide the remote URL before Dex starts. It will be in the form:
`https://github.com/<new-account>/ukcp.git`

---

## Pre-flight checks

Run these before touching anything:

```bash
# Confirm current git status — should be clean or show known untracked files only
git status

# Confirm no existing remote is set
git remote -v
```

Report both outputs to Phil before proceeding.

---

## Step 1 — Set remote origin

```bash
git remote add origin <URL-Phil-provides>
```

Confirm: `git remote -v` — should show fetch and push for origin.

---

## Step 2 — Stage and commit any uncommitted changes

```bash
git add -A
git status
```

Report what is staged. Then commit:

```bash
git commit -m "Initial commit — UKCP baseline pre-GitHub push"
```

If nothing to commit, report that and skip to Step 3.

---

## Step 3 — Push to remote

```bash
git push -u origin main
```

If the branch is named `master` rather than `main`, use `master`. Report the branch name from `git status` output in pre-flight if unsure.

---

## Step 4 — Verify

```bash
git log --oneline -5
git remote -v
```

Report both outputs. Confirm push succeeded and remote is correctly set.

---

## On failure

Report the full error verbatim. Do not attempt to fix authentication issues — those require Phil to action in the GitHub account or credential manager. Stop and report.

---
