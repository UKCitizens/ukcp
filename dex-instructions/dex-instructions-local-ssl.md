# Dex Instructions -- Local SSL for Auth Testing

## Context

Supabase will not redirect auth tokens to HTTP URLs. Local dev runs on
http://localhost:3000 so magic link auth always fails locally -- the token
is stripped before it reaches the app. The fix is to run the local server
on HTTPS. server.js has been updated to auto-detect cert files and switch
to HTTPS when they exist. This instruction generates those cert files.

Production (Railway) is unaffected -- Railway provides SSL termination
externally and cert.pem / key.pem will not exist in the deployed environment.

Working directory for all commands: C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP

---

## Step 1 -- Generate self-signed cert

Run in the UKCP project root:

```
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"
```

This creates two files in the project root:
- cert.pem  (the certificate)
- key.pem   (the private key)

If openssl is not available, install it via:
- Windows: winget install ShiningLight.OpenSSL.Light
- Or download from https://slproweb.com/products/Win32OpenSSL.html

---

## Step 2 -- Add cert files to .gitignore

cert.pem and key.pem must never be committed to GitHub.
Add these lines to .gitignore if not already present:

```
cert.pem
key.pem
```

---

## Step 3 -- Add Supabase redirect URL

In Supabase dashboard -> Authentication -> URL Configuration -> Redirect URLs,
add:

```
https://localhost:3443
https://localhost:3443/**
```

---

## Step 4 -- Rebuild and restart

```
npm run build
node server.js
```

Expected log output:
  UKCP running on https://localhost:3443 (local SSL)

---

## Step 5 -- First browser visit

Navigate to https://localhost:3443 in Edge.
The browser will show a security warning ("Your connection is not private").
This is expected for a self-signed cert.
Click "Advanced" -> "Proceed to localhost (unsafe)".
This only needs to be done once per browser profile.

---

## Step 6 -- Test auth

1. Go to https://localhost:3443
2. Enter email, click "Send sign-in link"
3. Check email -- link will redirect back to https://localhost:3443
4. Click link -- should land on /locations logged in

---

## Notes

- HTTPS_PORT defaults to 3443. Set HTTPS_PORT=xxxx in .env to change it.
- HTTP on port 3000 continues to work if cert files are absent (production mode).
- cert.pem expires in 365 days. Regenerate with the same openssl command when it does.
- Do not use these certs for anything other than local dev.
