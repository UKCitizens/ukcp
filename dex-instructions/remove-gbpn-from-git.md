# Dex Task: Remove GBPN.csv from git

## Why
The file data-build/sources/GBPN.csv is 69.9MB. It is frozen source data that will never change. 
It should not be in the repo — it makes the repo unnecessarily large.

## What to do

1. Add it to .gitignore so git ignores it from now on:
   - Open .gitignore in the project root
   - Add this line: data-build/sources/GBPN.csv

2. Remove it from git's tracking (does NOT delete the file from disk):
```bash
cd C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP
git rm --cached data-build/sources/GBPN.csv
git commit -m "Remove GBPN.csv from tracking — frozen source data, too large for git"
git push
```

## Result
- The file stays on Phil's computer, untouched
- Git stops tracking it
- The repo is smaller for anyone who downloads it in future
