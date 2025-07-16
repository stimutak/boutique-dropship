# Email Notification System

This document describes the comprehensive email notification system implemented for the holistic dropship store.

## Overview

The email system provides automated transactional emails throughout the customer journey, from registration to order fulfillment. It includes email preference management, template-based emails with both text and HTML versions, and integration with the order and payment workflows.

## Features

### Email Types

1. **Welcome Email** - Sent when users register
2. **Order Confirmation** - Sent when orders are placed (guest and registered users)
3. **Payment Receipt** - Sent when payments are successfully processed
4. **Order Status Updates** - Sent when order status changes (processing, shipped, delivered)
5. **Password Reset** - Sent when users request password reset
6. **Wholesaler Notifications** - Sent to wholesalers when orders need fulfillment

### Email Preferences

Users can control which emails they receive through granular preferences:

- `orderConfirmations` - Order confirmation emails
- `paymentReceipts` - Payment receipt emails
- `orderUpdates` - Order status update emails
- `promotionalEmails` - Marketing and promotional emails
- `welcomeEmails` - Welcome and password reset emails

### Email Templates

All emails include both text and HTML versions with:
- Professional styling with holistic/spiritual branding
- Responsive design for mobile devices
- Clear call-to-action buttons where appropriate
- Consistent branding and messaging

## Configuration

### Environment Variables

```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
FRONTEND_URL=http://localhost:3000
```

### Nodemailer Setup

The system uses Nodemailer with SMTP configuration. For production, configure with your email service provider (Gmail, SendGrid, etc.).

## API Endpoints

### Email Preferences Management

#### Get Email Preferences
```
GET /api/auth/email-preferences
Authorization: Bearer <token>
```

#### Update Email Preferences
```
PUT /api/auth/email-preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "emailPreferences": {
    "orderConfirmations": true,
    "paymentReceipts": true,
    "orderUpdates": false,
    "promotionalEmails": false,
    "welcomeEmails": true
  }
}
```

## Email Service Functions

### Core Functions

- `sendOrderConfirmation(customerEmail, orderData)` - Send order confirmation
- `sendPaymentReceipt(customerEmail, paymentData)` - Send payment receipt
- `sendOrderStatusUpdate(customerEmail, statusData)` - Send status update
- `sendWelcomeEmail(customerEmail, userData)` - Send welcome email
- `sendPasswordResetEmail(customerEmail, resetData)` - Send password reset
- `sendWholesalerNotification(wholesalerEmail, orderData)` - Send wholesaler notification
- `sendEmail(to, subject, text, html)` - Generic email sender

### Email Templates

The `emailTemplates` object contains template generators for each email type, producing both text and HTML versions.

## Integration Points

### User Registration
- Welcome email sent automatically on successful registration
- Respects user's `welcomeEmails` preference

### Order Placement
- Order confirmation sent immediately after order creation
- Works for both guest checkout and registered users
- Respects user's `orderConfirmations` preference

### Payment Processing
- Payment receipt sent via webhook when payment is confirmed
- Wholesaler notifications triggered automatically
- Respects user's `paymentReceipts` preference

### Order Status Updates
- Status update emails sent when order status changes
- Includes tracking numbers when available
- Only sent for meaningful status changes (processing, shipped, delivered)
- Respects user's `orderUpdates` preference

### Password Reset
- Secure token-based password reset flow
- Tokens expire after 1 hour
- Respects user's `welcomeEmails` preference

## User Model Extensions

### New Fields
- `passwordResetToken` - Secure reset token
- `passwordResetExpiry` - Token expiration date
- `preferences.emailPreferences` - Granular email preferences

### New Methods
- `wantsEmail(emailType)` - Check if user wants specific email type
- `updateEmailPreferences(preferences)` - Update email preferences

## Error Handling

- All email sending operations are wrapped in try-catch blocks
- Failed email sends are logged but don't break the user flow
- Email service returns success/failure status for monitoring

## Testing

Comprehensive test suite includes:
- Unit tests for email service functions
- Integration tests for email workflows
- Email preference management tests
- Mock email service for testing

### Running Tests

```bash
# Run all email tests
npm test -- --testPathPattern=email

# Run specific test files
npm test test/utils/emailService.test.js
npm test test/routes/emailPreferences.test.js
npm test test/routes/emailIntegration.test.js
```

## Security Considerations

- Password reset tokens are cryptographically secure
- Tokens have short expiration times (1 hour)
- Email enumeration is prevented in password reset flow
- All email preferences respect user's global notification settings

## Future Enhancements

- Email analytics and tracking
- A/B testing for email templates
- Advanced segmentation for promotional emails
- Email scheduling and queuing
- Integration with email service providers (SendGrid, Mailgun)
- Email template editor in admin interface