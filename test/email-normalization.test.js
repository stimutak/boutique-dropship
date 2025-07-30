const validator = require('validator');

describe('Email Normalization Issue', () => {
  it('should demonstrate how normalizeEmail modifies emails', () => {
    const testEmails = [
      'gloed@mac.com',
      'oed@mac.com',
      'john.doe@gmail.com',
      'jane.smith@outlook.com',
      'test.user@yandex.com'
    ];

    console.log('\nEmail normalization test results:');
    console.log('=================================');
    
    testEmails.forEach(email => {
      const normalized = validator.normalizeEmail(email);
      console.log(`Original: ${email}`);
      console.log(`Normalized: ${normalized}`);
      console.log(`Changed: ${email !== normalized ? 'YES' : 'NO'}`);
      console.log('---');
    });
  });

  it('should test different normalizeEmail options', () => {
    const email = 'john.doe@gmail.com';
    
    console.log('\nTesting normalizeEmail with different options:');
    console.log('=============================================');
    
    // Default behavior
    const defaultNormalized = validator.normalizeEmail(email);
    console.log(`Default: ${email} -> ${defaultNormalized}`);
    
    // With gmail_remove_dots: false
    const noDotRemoval = validator.normalizeEmail(email, { gmail_remove_dots: false });
    console.log(`No dot removal: ${email} -> ${noDotRemoval}`);
    
    // With all transformations disabled
    const minimal = validator.normalizeEmail(email, {
      all_lowercase: false,
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      gmail_convert_googlemaildotcom: false,
      outlookdotcom_remove_subaddress: false,
      yahoo_remove_subaddress: false,
      icloud_remove_subaddress: false
    });
    console.log(`Minimal normalization: ${email} -> ${minimal}`);
  });
});