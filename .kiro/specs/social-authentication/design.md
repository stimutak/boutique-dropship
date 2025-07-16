# Design Document

## Architecture Overview

The social authentication system will integrate with the existing Express.js/MongoDB stack using Passport.js as the OAuth middleware. The design follows a modular approach where each social provider is implemented as a separate Passport strategy, allowing for easy addition or removal of providers.

## Technical Stack

### Core Dependencies
- **passport** - Authentication middleware for Node.js
- **passport-google-oauth20** - Google OAuth 2.0 strategy
- **passport-facebook** - Facebook OAuth strategy  
- **passport-twitter** - X (Twitter) OAuth strategy
- **passport-apple** - Apple Sign In strategy
- **passport-snapchat** - Snapchat OAuth strategy
- **passport-instagram** - Instagram OAuth strategy
- **express-session** - Session management for OAuth flows

### Database Schema Extensions

#### User Model Updates
```javascript
// Add to existing User schema
socialAccounts: [{
  provider: {
    type: String,
    enum: ['google', 'facebook', 'twitter', 'apple', 'snapchat', 'instagram'],
    required: true
  },
  providerId: {
    type: String,
    required: true
  },
  email: String,
  displayName: String,
  profilePicture: String,
  linkedAt: {
    type: Date,
    default: Date.now
  }
}],
authMethod: {
  type: String,
  enum: ['local', 'social', 'hybrid'],
  default: 'local'
}
```

## Component Design

### 1. OAuth Configuration Manager
**Location:** `utils/oauthConfig.js`

Centralized configuration for all OAuth providers with environment-based settings.

```javascript
const providers = {
  google: {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  },
  facebook: {
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: '/auth/facebook/callback'
  },
  // ... other providers
}
```

### 2. Passport Strategy Setup
**Location:** `middleware/passport.js`

Initialize all Passport strategies with unified user handling logic.

```javascript
// Strategy registration for each provider
passport.use(new GoogleStrategy(config.google, handleOAuthCallback));
passport.use(new FacebookStrategy(config.facebook, handleOAuthCallback));
// ... other strategies

// Unified callback handler
async function handleOAuthCallback(accessToken, refreshToken, profile, done) {
  // Find or create user logic
  // Link social account to existing user if email matches
  // Handle profile data extraction
}
```

### 3. Social Authentication Routes
**Location:** `routes/socialAuth.js`

RESTful endpoints for each provider's OAuth flow.

```javascript
// Initiate OAuth flow
router.get('/auth/:provider', (req, res, next) => {
  const provider = req.params.provider;
  passport.authenticate(provider, getProviderScope(provider))(req, res, next);
});

// Handle OAuth callback
router.get('/auth/:provider/callback', (req, res, next) => {
  const provider = req.params.provider;
  passport.authenticate(provider, {
    successRedirect: '/dashboard',
    failureRedirect: '/login?error=oauth'
  })(req, res, next);
});
```

### 4. Account Linking Service
**Location:** `utils/socialAccountService.js`

Business logic for linking/unlinking social accounts and managing user profiles.

```javascript
class SocialAccountService {
  async linkAccount(userId, provider, profileData) {
    // Link new social account to existing user
  }
  
  async unlinkAccount(userId, provider) {
    // Remove social account link with validation
  }
  
  async findOrCreateUser(provider, profile) {
    // Find existing user by email or create new one
  }
}
```

## User Interface Design

### 1. Login Page Updates
**Location:** Frontend login component

Add social sign-in buttons below the traditional login form:

```html
<div class="social-login-section">
  <div class="divider">
    <span>Or sign in with</span>
  </div>
  <div class="social-buttons">
    <button class="social-btn google" onclick="signInWith('google')">
      <img src="/icons/google.svg" alt="Google"> Google
    </button>
    <button class="social-btn facebook" onclick="signInWith('facebook')">
      <img src="/icons/facebook.svg" alt="Facebook"> Facebook
    </button>
    <!-- ... other provider buttons -->
  </div>
</div>
```

### 2. Profile Management Section
**Location:** User profile/settings page

Display connected accounts with link/unlink functionality:

```html
<div class="connected-accounts">
  <h3>Connected Accounts</h3>
  <div class="account-list">
    <!-- Show linked accounts with unlink option -->
    <!-- Show available providers to link -->
  </div>
</div>
```

## Security Considerations

### 1. OAuth State Parameter
- Generate and validate state parameters to prevent CSRF attacks
- Store state in secure session storage

### 2. Token Management
- Store OAuth tokens securely (encrypted in database)
- Implement token refresh logic for long-lived sessions
- Clear tokens on account unlinking

### 3. Data Privacy
- Request minimal necessary permissions from each provider
- Allow users to control what profile data is imported
- Implement data retention policies for social account data

### 4. Error Handling
- Graceful fallback when social providers are unavailable
- Clear error messages for OAuth failures
- Logging for security monitoring

## Integration Points

### 1. Existing Authentication Middleware
- Extend current JWT middleware to handle social authentication
- Maintain session compatibility between local and social auth

### 2. User Registration Flow
- Merge social sign-up with existing user onboarding
- Handle missing required fields from social providers
- Maintain existing user preferences and cart data

### 3. Email Verification
- Skip email verification for verified social accounts
- Handle cases where social email differs from existing account

## Configuration Management

### Environment Variables
```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Facebook OAuth
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# Twitter OAuth
TWITTER_CONSUMER_KEY=your_twitter_consumer_key
TWITTER_CONSUMER_SECRET=your_twitter_consumer_secret

# Apple Sign In
APPLE_CLIENT_ID=your_apple_client_id
APPLE_TEAM_ID=your_apple_team_id
APPLE_KEY_ID=your_apple_key_id
APPLE_PRIVATE_KEY_PATH=path_to_apple_private_key

# Snapchat OAuth
SNAPCHAT_CLIENT_ID=your_snapchat_client_id
SNAPCHAT_CLIENT_SECRET=your_snapchat_client_secret

# Instagram OAuth (via Facebook)
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret

# Session configuration
SESSION_SECRET=your_session_secret
```

## Error Handling Strategy

### 1. OAuth Provider Errors
- Network timeouts: Retry with exponential backoff
- Invalid credentials: Log error and show generic message to user
- Rate limiting: Queue requests and inform user of delay

### 2. User Account Conflicts
- Email already exists: Offer to link accounts or sign in with existing method
- Multiple social accounts with same email: Allow linking all accounts

### 3. Missing Profile Data
- Required fields missing: Prompt user to complete profile
- Invalid email format: Request alternative email or manual entry

## Performance Considerations

### 1. Caching Strategy
- Cache OAuth provider configurations
- Store frequently accessed social account data in Redis
- Implement connection pooling for database queries

### 2. Async Processing
- Handle OAuth callbacks asynchronously
- Queue profile data updates for non-critical information
- Use background jobs for social account synchronization

## Testing Strategy

### 1. Unit Tests
- Test each Passport strategy configuration
- Mock OAuth provider responses
- Validate user creation and linking logic

### 2. Integration Tests
- Test complete OAuth flows for each provider
- Verify error handling scenarios
- Test account linking/unlinking functionality

### 3. Security Tests
- CSRF protection validation
- Token security and encryption
- Rate limiting and abuse prevention