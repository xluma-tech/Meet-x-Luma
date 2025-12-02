# How to Restart and Test Auth

## ✅ What I Fixed

1. **Deleted proxy.ts** - This was causing JWE errors by trying to use Auth0 middleware
2. **Implemented custom OAuth flow** - Direct integration with Auth0 API
3. **Custom session management** - Using cookies instead of Auth0 SDK
4. **Custom useUser hook** - Replaced Auth0's useUser

## 🔄 Steps to Restart

### 1. Stop the Frontend Server
Press `Ctrl+C` in the terminal where frontend is running

### 2. Clear Browser Data
**Important:** Clear cookies and cache for localhost:3000
- Chrome: Press `Ctrl+Shift+Delete` → Select "Cookies" and "Cached images" → Clear data
- Or use Incognito/Private mode

### 3. Delete .next folder (optional but recommended)
```bash
cd frontend
rmdir /s /q .next
```

### 4. Restart Frontend
```bash
npm run dev
```

### 5. Test Authentication

1. Go to http://localhost:3000
2. Click "Sign In"
3. You should be redirected to Auth0 login page
4. After login, you'll be redirected back to /dashboard

## 🐛 If You Still See Errors

### Error: "JWEInvalid: Invalid Compact JWE"
This means old Auth0 SDK cookies are still present.

**Solution:**
1. Clear all cookies for localhost:3000
2. Or use Incognito mode
3. Restart the dev server

### Error: "404 Not Found" on homepage
This is normal during the first load after deleting .next folder.
Just refresh the page.

### Error: Auth0 redirect doesn't work
Make sure you've configured Auth0 dashboard:
- Allowed Callback URLs: `http://localhost:3000/api/auth/callback`
- Allowed Logout URLs: `http://localhost:3000`
- Allowed Web Origins: `http://localhost:3000`

## ✅ Expected Behavior

### Before Sign In:
- Homepage shows "Sign In" button
- Clicking "Sign In" redirects to Auth0

### After Sign In:
- Redirected to /dashboard
- See your name and profile picture
- Can create meetings
- Can view notifications

### Sign Out:
- Click "Sign Out"
- Redirected to homepage
- Session cleared

## 📝 Technical Details

### How Auth Works Now:

1. **Login Flow:**
   - User clicks "Sign In"
   - Redirected to Auth0 (`/api/auth/login`)
   - Auth0 redirects back to `/api/auth/callback`
   - We exchange code for tokens
   - Create session cookie
   - Redirect to dashboard

2. **Session Management:**
   - Session stored in `appSession` cookie
   - Cookie is httpOnly and secure
   - Expires with access token

3. **User Info:**
   - `useUser()` hook fetches from `/api/auth/me`
   - Returns user from session cookie
   - Auto-syncs with backend on login

## 🎯 Next Steps After Auth Works

1. Test creating a meeting
2. Test guest mode
3. Test inviting participants
4. Test cohost assignment
5. Test notifications

---

**The auth system is now completely custom and should work!** 🎉

Just follow the restart steps above and clear your browser cookies.
