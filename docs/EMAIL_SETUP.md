# Email Service Setup

The application supports email notifications for order confirmations, password resets, and other transactional emails. However, email is currently **disabled** because the required environment variables are not configured.

## Quick Setup

### Option 1: Use Gmail (Recommended for Development)

1. Add these environment variables to your `.env` file:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

2. Generate an App Password for Gmail:
   - Go to https://myaccount.google.com/security
   - Enable 2-factor authentication
   - Click on "2-Step Verification" → "App passwords"
   - Generate a new app password for "Mail"
   - Use this password as EMAIL_PASS

### Option 2: Use Other Email Services

#### SendGrid
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
```

#### Mailgun
```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@your-domain.mailgun.org
EMAIL_PASS=your-mailgun-password
```

## Development Mode (No Email)

When email is not configured, the application will:
1. Skip sending emails without errors
2. Log password reset URLs to the console
3. Continue functioning normally

To see password reset URLs in development:
1. Click "Forgot Password"
2. Enter an email address
3. Check the server console for the reset URL
4. Copy and paste the URL into your browser

## Testing Email Configuration

After setting up email, restart the server and test by:
1. Creating a new account (should receive welcome email)
2. Using forgot password (should receive reset email)
3. Placing an order (should receive confirmation)

## Troubleshooting

- **Gmail**: Make sure "Less secure app access" is disabled and use App Passwords
- **Port 587**: Use for TLS/STARTTLS (recommended)
- **Port 465**: Use for SSL (set EMAIL_SECURE=true)
- **Port 25**: Usually blocked by ISPs, not recommended

## Security Notes

- Never commit email credentials to version control
- Use environment variables or secrets management
- Consider using dedicated transactional email services in production
- Rate limit password reset requests to prevent abuse