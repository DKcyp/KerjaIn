# GitHub PR Management - Documentation

Sistem untuk review, approve, dan resolve conflicts Pull Request langsung dari aplikasi.

## 🚀 Quick Start

### 1. Setup GitHub Token

1. Buka: https://github.com/settings/tokens
2. Generate new token (classic)
3. **Centang scope: `repo`** (ini yang paling penting!)
4. Copy token (format: `ghp_xxxxx`)

### 2. Update .env

```env
GITHUB_TOKEN=ghp_your_token_here
GITHUB_ORG=your-organization-name
```

### 3. Restart App

```bash
npm run dev
```

### 4. Akses Dashboard

Buka: `http://localhost:3000/github`

---

## ✨ Fitur Utama

### 1. Dashboard (`/github`)
- List semua repositories
- Jumlah open PRs per repo
- Quick access ke PR list

### 2. PR Detail (`/github/pr/[repo]/[number]`)
- Info PR lengkap (title, author, branch)
- File changes dengan diff viewer
- Inline editor untuk quick edit
- Merge button dengan pilihan target branch

### 3. Conflict Resolver (`/github/conflict/[repo]/[number]`)
- **Side-by-side comparison** (Current vs Incoming)
- 3 tombol action:
  - **Accept Current** - Pakai versi dari branch kamu
  - **Accept Incoming** - Pakai versi dari base branch
  - **Accept Both** - Gabung keduanya
- Multi-file support
- Auto-save ke GitHub

---

## 🎯 Cara Pakai

### Review PR

1. Buka dashboard → Klik repository
2. Pilih PR yang mau direview
3. Lihat file changes dan diff
4. Kalo ada conflict → Klik "Resolve Conflicts"

### Resolve Conflicts

1. Klik button "Resolve Conflicts" (merah)
2. Lihat comparison:
   ```
   Current (tabrak)     |  Incoming (main)
   --------------------|--------------------
   Your changes        |  Their changes
   ```
3. Pilih salah satu:
   - Accept Current → Pakai punya kamu
   - Accept Incoming → Pakai punya mereka
   - Accept Both → Gabung keduanya
4. Klik "Save All Changes"
5. Done! ✅

### Merge PR

1. Pastikan no conflicts
2. Pilih target branch (staging/main)
3. Klik "Approve & Merge"
4. Confirm → Done!

---

## ⚠️ Troubleshooting

### Error: "Bad credentials"
**Fix:** Token salah/expired. Generate token baru, update `.env`, restart app.

### Error: "Resource not accessible"
**Fix:** Token kurang permission. Pastikan centang scope `repo` waktu generate token.

### Repositories tidak muncul
**Fix:** 
- Cek `GITHUB_ORG` di `.env` (harus exact match)
- Pastikan token punya akses ke org
- Refresh page

### Conflict resolver kosong
**Fix:** Ini normal! Sekarang langsung tampil side-by-side comparison. Tinggal pilih mana yang mau dipakai.

### Merge button disabled
**Fix:** Resolve conflicts dulu, baru bisa merge.

---

## 📁 File Structure

```
src/app/(admin)/github/
├── page.tsx                          # Dashboard
├── repo/[repo]/page.tsx             # Repo detail + PR list
├── pr/[repo]/[number]/page.tsx      # PR detail
└── conflict/[repo]/[number]/page.tsx # Conflict resolver

src/app/api/github/
├── repositories/route.ts            # List repos
├── pull-requests/route.ts           # List PRs
├── pull-requests/[repo]/[number]/   # PR detail
├── file-content/route.ts            # Get/Update files
├── merge/route.ts                   # Merge PR
└── merge-branch/route.ts            # Merge branches
```

---

## 🔒 Security

- ✅ Jangan commit `.env` ke git
- ✅ Token harus punya scope `repo` minimal
- ✅ Rotate token setiap 90 hari
- ✅ Beda token untuk dev/staging/prod

---

## 💡 Tips

- **Conflict resolution:** Kalo ragu, pilih "Accept Incoming" (biasanya lebih aman)
- **Multi-file conflicts:** Resolve satu-satu, jangan buru-buru
- **Testing:** Test dulu di staging sebelum merge ke main
- **Communication:** Kalo conflict kompleks, diskusi dulu sama team

---

## 🐛 Known Issues

1. **Conflict markers not auto-generated** - Ini by design. Sistem langsung fetch kedua versi file dan tampilkan side-by-side.
2. **Light mode colors** - Sudah difix, sekarang support light & dark mode.

---

## 📞 Need Help?

1. Check browser console (F12) untuk error details
2. Verify token permissions di GitHub settings
3. Test API dengan curl:
   ```bash
   curl -H "Authorization: token YOUR_TOKEN" \
        https://api.github.com/user
   ```
4. Contact development team

---

That's it! Simple kan? 🎉
