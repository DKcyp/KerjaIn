# Setup Hosts File untuk SSO Development

Untuk testing SSO dengan cookie sharing antara Hub dan Logbook di localhost, kita perlu setup hosts file.

## Windows

1. **Open Notepad as Administrator**
   - Press `Win + R`
   - Type: `notepad C:\Windows\System32\drivers\etc\hosts`
   - Click OK

2. **Add these lines at the end of the file:**
   ```
   127.0.0.1 hub.local
   127.0.0.1 log.local
   ```

3. **Save the file** (Ctrl + S)

4. **Flush DNS cache** (optional but recommended)
   - Open Command Prompt as Administrator
   - Run: `ipconfig /flushdns`

## Mac/Linux

1. **Open Terminal**

2. **Edit hosts file:**
   ```bash
   sudo nano /etc/hosts
   ```

3. **Add these lines at the end:**
   ```
   127.0.0.1 hub.local
   127.0.0.1 log.local
   ```

4. **Save and exit** (Ctrl + X, then Y, then Enter)

5. **Flush DNS cache** (optional)
   ```bash
   # Mac
   sudo dscacheutil -flushcache
   
   # Linux
   sudo systemctl restart systemd-resolved
   ```

## Testing

After setup, access:
- **Hub:** http://hub.local:3000
- **Logbook:** http://log.local:3002

Now cookies will be shared across both apps!

## Troubleshooting

### Cookies still not shared?
1. Clear browser cookies for both domains
2. Restart your browser
3. Check DevTools → Application → Cookies
4. Verify cookie domain is `.local`

### Can't access hub.local or log.local?
1. Verify hosts file was saved correctly
2. Flush DNS cache
3. Try accessing in a different browser
4. Restart your computer

### Still having issues?
Check the console logs:
```
🍪 Cookie Debug: {
  domain: ".local",
  ...
}
```

If domain is not set, verify `COOKIE_DOMAIN=".local"` in `.env.local`
