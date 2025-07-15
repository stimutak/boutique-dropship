# Agent Hook Examples for Holistic Dropship Store

## 1. Auto-notify Wholesalers Hook

**Name**: Auto-notify Wholesalers
**Trigger**: File change in `models/Order.js` or when order status changes
**Description**: Automatically send email notifications to wholesalers when orders are paid

**Prompt Template**:
```
Check for any orders with status 'paid' or 'processing' where wholesaler notifications haven't been sent yet. For each order:

1. Extract wholesaler email and product codes from order items
2. Generate a professional email notification with:
   - Order number and date
   - Customer shipping address
   - Product details with wholesaler product codes
   - Quantities needed
3. Send email using nodemailer
4. Update order items to mark wholesaler as notified

Use the existing Order model and nodemailer configuration from the environment variables.
```

## 2. SEO Optimization Hook

**Name**: Product SEO Optimizer
**Trigger**: File change in `models/Product.js` or manual trigger
**Description**: Auto-generate SEO metadata for products based on their properties

**Prompt Template**:
```
For any products missing SEO data or recently updated products:

1. Generate SEO title incorporating:
   - Product name
   - Primary category
   - Key spiritual properties (chakra, element)
2. Create meta description (150-160 chars) highlighting:
   - Product benefits
   - Spiritual properties
   - Call to action
3. Generate relevant keywords from:
   - Category and tags
   - Spiritual properties
   - Product name variations

Update the product's seo field with the generated content. Focus on holistic/spiritual wellness keywords.
```

## 3. API Testing Hook

**Name**: Route Testing
**Trigger**: File save in `routes/` directory
**Description**: Run tests for modified API endpoints

**Prompt Template**:
```
When route files are modified:

1. Identify which endpoints were changed in the saved file
2. Run relevant API tests for those endpoints
3. Check for:
   - Proper error handling
   - Input validation
   - Authentication requirements
   - Response format consistency
4. Report any issues found
5. Suggest fixes for common problems

Focus on the RESTful patterns and security middleware usage defined in our steering rules.
```

## 4. Environment Validation Hook

**Name**: Environment Validator
**Trigger**: File change in `.env` or `.env.example`
**Description**: Validate environment configuration

**Prompt Template**:
```
When environment files are modified:

1. Check that all required variables from .env.example are present
2. Validate format of:
   - MongoDB URI
   - JWT secret strength
   - Email configuration
   - Mollie API keys format
   - CORS origins format
3. Check for security issues:
   - Default/weak secrets
   - Exposed sensitive data
   - Missing production configurations
4. Provide recommendations for any issues found

Reference the tech stack requirements from our steering documentation.
```

## 5. Cross-Site Integration Hook

**Name**: Referral Tracker
**Trigger**: File change in `models/Order.js` when orders have referralSource
**Description**: Track and report cross-site referral effectiveness

**Prompt Template**:
```
When orders are created with referralSource data:

1. Analyze referral patterns from sister sites
2. Generate summary report of:
   - Orders by referral source
   - Revenue attribution
   - Popular products by source
   - Conversion rates
3. Update cross-site integration tracking
4. Suggest optimization opportunities for underperforming referral sources

Focus on the multi-site integration aspects defined in our product overview.
```

## Setup Instructions:

1. Open the Kiro Hook UI (Cmd+Shift+P → "Open Kiro Hook UI")
2. Create new hooks using the names and prompts above
3. Configure appropriate triggers for each hook
4. Test hooks with sample scenarios
5. Adjust prompts based on your specific workflow needs

## Recommended Priority Order:

1. **Auto-notify Wholesalers** - Critical for business operations
2. **Environment Validator** - Prevents deployment issues
3. **SEO Optimization** - Improves product visibility
4. **API Testing** - Maintains code quality
5. **Referral Tracker** - Optimizes cross-site integration