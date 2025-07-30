# JWT Migration Plan: localStorage to httpOnly Cookies

## Overview
Migrate JWT storage from vulnerable localStorage to secure httpOnly cookies to prevent XSS attacks.

## Current State Analysis
- **10 files** with direct localStorage.token references
- **Backend**: Already uses `cookie-parser` middleware
- **Frontend**: Axios configured in `/client/src/api/config.js`
- **Auth Flow**: Login/Register store token in localStorage

## Migration Strategy

### Phase 1: Backend Updates (Day 1)

#### 1.1 Update Auth Routes to Set Cookies
```javascript
// routes/auth.js - Login endpoint
res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});
```

#### 1.2 Update Middleware to Read from Cookies
```javascript
// middleware/auth.js
const token = req.cookies.token || 
  (req.headers.authorization?.split(' ')[1]);
```

#### 1.3 Add Logout Endpoint to Clear Cookie
```javascript
// routes/auth.js - Logout
res.clearCookie('token');
```

### Phase 2: Frontend Updates (Day 2)

#### 2.1 Configure Axios for Cookies
```javascript
// api/config.js
axios.defaults.withCredentials = true; // Send cookies with requests
```

#### 2.2 Remove localStorage References
- Update `authSlice.js` - Remove all localStorage calls
- Update `App.jsx` - Remove token check from localStorage
- Update other components

#### 2.3 Update Auth State Management
- Token presence determined by API calls
- Add `/api/auth/verify` endpoint for checking auth status

### Phase 3: Testing & Cleanup (Day 3)

#### 3.1 Test All Auth Flows
- Login/Register
- Token refresh
- Logout
- Protected routes
- Guest checkout

#### 3.2 Migration Script for Existing Users
- Check localStorage for token
- Call API to set cookie
- Clear localStorage

## File-by-File Changes

### Backend Files

1. **routes/auth.js**
   - Add cookie setting on login/register
   - Add logout endpoint
   - Add verify endpoint

2. **middleware/auth.js**
   - Read token from cookies first
   - Keep header fallback for API clients

3. **server.js**
   - Ensure cookie-parser is configured
   - Add CORS credentials support

### Frontend Files

1. **client/src/api/config.js**
   - Add `withCredentials: true`
   - Remove localStorage token interceptor

2. **client/src/store/slices/authSlice.js**
   - Remove all localStorage references
   - Update auth check logic

3. **client/src/App.jsx**
   - Remove localStorage token check
   - Use API call to verify auth

4. **Other Components**
   - Update any direct localStorage usage

## Security Considerations

### Cookie Settings
```javascript
{
  httpOnly: true,      // Prevent JS access
  secure: true,        // HTTPS only (production)
  sameSite: 'strict',  // CSRF protection
  maxAge: 7 days,      // Auto-expire
  path: '/'           // Available site-wide
}
```

### CORS Configuration
```javascript
cors({
  origin: process.env.FRONTEND_URL,
  credentials: true // Allow cookies
})
```

## Breaking Changes

1. **API Clients**: Must send cookies or use Authorization header
2. **Mobile Apps**: Need to handle cookies or use refresh tokens
3. **Testing**: Need to handle cookies in tests

## Rollback Plan

If issues arise:
1. Keep localStorage code commented
2. Add feature flag to toggle between storage methods
3. Gradual rollout to percentage of users

## Success Criteria

- [ ] No localStorage references for JWT
- [ ] All auth flows working with cookies
- [ ] Security headers properly set
- [ ] Tests updated and passing
- [ ] No regression in user experience

## Timeline

- **Day 1**: Backend implementation (4-6 hours)
- **Day 2**: Frontend migration (6-8 hours)
- **Day 3**: Testing and cleanup (4-6 hours)

Total: 2-3 days as estimated