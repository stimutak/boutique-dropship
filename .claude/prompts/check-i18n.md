# Check i18n Coverage

Check if all user-facing text in the specified file(s) is using i18n translations.

## What to check:
1. All hardcoded strings that users see
2. Button text, labels, messages
3. Error messages and notifications
4. Placeholder text
5. Alt text for images

## What to ignore:
- Console.log statements
- Code comments
- Technical identifiers
- URLs and API endpoints

## For each hardcoded string found:
1. Identify the string
2. Suggest the i18n key
3. Show the replacement code

## Example output:
```
File: /client/src/pages/Cart.jsx
Line 45: "Your cart is empty"
Suggest: {t('cart.empty')}

File: /client/src/components/Product.jsx  
Line 23: "Add to Cart"
Suggest: {t('products.addToCart')}
```

Remember: This project supports 7 languages - every user-facing string must be translatable!