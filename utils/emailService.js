const nodemailer = require('nodemailer');
const { formatPrice } = require('./currency');

// Create transporter with environment configuration
const createTransporter = () => {
  // Return null if email is not configured
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
    console.log('Email service not configured - emails will be skipped');
    return null;
  }
  
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Email templates
const emailTemplates = {
  orderConfirmation: (orderData) => {
    const { orderNumber, customerName, items, total, shippingAddress, currency = 'USD' } = orderData;
    
    const itemsList = items.map(item => 
      `- ${item.productName || 'Product'} (Qty: ${item.quantity}) - ${formatPrice(item.price, currency)}`
    ).join('\n');

    return {
      subject: `Order Confirmation - ${orderNumber}`,
      text: `
Dear ${customerName},

Thank you for your order! We're excited to help you on your holistic wellness journey.

ORDER DETAILS:
Order Number: ${orderNumber}
Order Total: ${formatPrice(total, currency)}

ITEMS ORDERED:
${itemsList}

SHIPPING ADDRESS:
${shippingAddress.firstName} ${shippingAddress.lastName}
${shippingAddress.street}
${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}
${shippingAddress.country}

Your order is being processed and you'll receive another email once it ships.

With gratitude,
The Holistic Store Team
      `.trim(),
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #4a5568;">Order Confirmation</h2>
  
  <p>Dear ${customerName},</p>
  
  <p>Thank you for your order! We're excited to help you on your holistic wellness journey.</p>
  
  <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="color: #2d3748; margin-top: 0;">Order Details</h3>
    <p><strong>Order Number:</strong> ${orderNumber}</p>
    <p><strong>Order Total:</strong> ${formatPrice(total, currency)}</p>
  </div>
  
  <h3 style="color: #2d3748;">Items Ordered</h3>
  <ul>
    ${items.map(item => `<li>${item.productName || 'Product'} (Qty: ${item.quantity}) - ${formatPrice(item.price, currency)}</li>`).join('')}
  </ul>
  
  <h3 style="color: #2d3748;">Shipping Address</h3>
  <p>
    ${shippingAddress.firstName} ${shippingAddress.lastName}<br>
    ${shippingAddress.street}<br>
    ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}<br>
    ${shippingAddress.country}
  </p>
  
  <p>Your order is being processed and you'll receive another email once it ships.</p>
  
  <p style="margin-top: 30px;">With gratitude,<br>The Holistic Store Team</p>
</div>
      `.trim()
    };
  },

  paymentReceipt: (paymentData) => {
    const { orderNumber, customerName, total, paymentMethod, transactionId, paidAt, currency = 'USD' } = paymentData;
    
    return {
      subject: `Payment Receipt - ${orderNumber}`,
      text: `
Dear ${customerName},

Your payment has been successfully processed!

PAYMENT DETAILS:
Order Number: ${orderNumber}
Amount Paid: ${formatPrice(total, currency)}
Payment Method: ${paymentMethod}
Transaction ID: ${transactionId}
Payment Date: ${new Date(paidAt).toLocaleDateString()}

Your order is now being prepared for shipment.

Thank you for choosing our holistic products!

Best regards,
The Holistic Store Team
      `.trim(),
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #4a5568;">Payment Receipt</h2>
  
  <p>Dear ${customerName},</p>
  
  <p>Your payment has been successfully processed!</p>
  
  <div style="background: #f0fff4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #48bb78;">
    <h3 style="color: #2d3748; margin-top: 0;">Payment Details</h3>
    <p><strong>Order Number:</strong> ${orderNumber}</p>
    <p><strong>Amount Paid:</strong> ${formatPrice(total, currency)}</p>
    <p><strong>Payment Method:</strong> ${paymentMethod}</p>
    <p><strong>Transaction ID:</strong> ${transactionId}</p>
    <p><strong>Payment Date:</strong> ${new Date(paidAt).toLocaleDateString()}</p>
  </div>
  
  <p>Your order is now being prepared for shipment.</p>
  
  <p>Thank you for choosing our holistic products!</p>
  
  <p style="margin-top: 30px;">Best regards,<br>The Holistic Store Team</p>
</div>
      `.trim()
    };
  },

  orderStatusUpdate: (statusData) => {
    const { orderNumber, customerName, status, trackingNumber } = statusData;
    
    const statusMessages = {
      processing: 'Your order is being processed and will ship soon.',
      shipped: 'Great news! Your order has been shipped.',
      delivered: 'Your order has been delivered. We hope you enjoy your holistic products!'
    };

    return {
      subject: `Order Update - ${orderNumber}`,
      text: `
Dear ${customerName},

We have an update on your order ${orderNumber}.

Status: ${status.charAt(0).toUpperCase() + status.slice(1)}

${statusMessages[status] || 'Your order status has been updated.'}

${trackingNumber ? `Tracking Number: ${trackingNumber}` : ''}

Thank you for your patience!

Best regards,
The Holistic Store Team
      `.trim(),
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #4a5568;">Order Update</h2>
  
  <p>Dear ${customerName},</p>
  
  <p>We have an update on your order <strong>${orderNumber}</strong>.</p>
  
  <div style="background: #ebf8ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4299e1;">
    <h3 style="color: #2d3748; margin-top: 0;">Status: ${status.charAt(0).toUpperCase() + status.slice(1)}</h3>
    <p>${statusMessages[status] || 'Your order status has been updated.'}</p>
    ${trackingNumber ? `<p><strong>Tracking Number:</strong> ${trackingNumber}</p>` : ''}
  </div>
  
  <p>Thank you for your patience!</p>
  
  <p style="margin-top: 30px;">Best regards,<br>The Holistic Store Team</p>
</div>
      `.trim()
    };
  },

  welcomeEmail: (userData) => {
    const { firstName, email } = userData;
    
    return {
      subject: 'Welcome to Our Holistic Store!',
      text: `
Dear ${firstName},

Welcome to our holistic wellness community!

We're thrilled to have you join us on this journey of spiritual and physical well-being. Our carefully curated collection of crystals, herbs, essential oils, and wellness products is here to support your holistic lifestyle.

As a member, you'll enjoy:
- Exclusive access to new products
- Special member discounts
- Wellness tips and spiritual guidance
- Priority customer support

Start exploring our collection and discover products that resonate with your energy.

Namaste,
The Holistic Store Team
      `.trim(),
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #4a5568;">Welcome to Our Holistic Store!</h2>
  
  <p>Dear ${firstName},</p>
  
  <p>Welcome to our holistic wellness community!</p>
  
  <p>We're thrilled to have you join us on this journey of spiritual and physical well-being. Our carefully curated collection of crystals, herbs, essential oils, and wellness products is here to support your holistic lifestyle.</p>
  
  <div style="background: #fef5e7; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="color: #2d3748; margin-top: 0;">As a member, you'll enjoy:</h3>
    <ul style="color: #4a5568;">
      <li>Exclusive access to new products</li>
      <li>Special member discounts</li>
      <li>Wellness tips and spiritual guidance</li>
      <li>Priority customer support</li>
    </ul>
  </div>
  
  <p>Start exploring our collection and discover products that resonate with your energy.</p>
  
  <p style="margin-top: 30px;">Namaste,<br>The Holistic Store Team</p>
</div>
      `.trim()
    };
  },

  passwordReset: (resetData) => {
    const { firstName, resetToken, resetUrl } = resetData;
    
    return {
      subject: 'Password Reset Request',
      text: `
Dear ${firstName},

We received a request to reset your password for your Holistic Store account.

To reset your password, please click the following link:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email.

Best regards,
The Holistic Store Team
      `.trim(),
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #4a5568;">Password Reset Request</h2>
  
  <p>Dear ${firstName},</p>
  
  <p>We received a request to reset your password for your Holistic Store account.</p>
  
  <div style="background: #fed7d7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f56565;">
    <p>To reset your password, please click the button below:</p>
    <a href="${resetUrl}" style="display: inline-block; background: #4299e1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">Reset Password</a>
    <p style="font-size: 14px; color: #718096;">This link will expire in 1 hour for security reasons.</p>
  </div>
  
  <p>If you didn't request this password reset, please ignore this email.</p>
  
  <p style="margin-top: 30px;">Best regards,<br>The Holistic Store Team</p>
</div>
      `.trim()
    };
  }
};

// Send wholesaler notification email
const sendWholesalerNotification = async (wholesalerEmail, orderData) => {
  const transporter = createTransporter();
  if (!transporter) {
    return { success: true, message: 'Email skipped - not configured' };
  }
  
  const { orderNumber, orderDate, shippingAddress, items, notes } = orderData;
  
  // Build product list for email
  const productList = items.map(item => 
    `- Product Code: ${item.wholesaler.productCode}\n  Quantity: ${item.quantity}\n  Product: ${item.productName || 'N/A'}`
  ).join('\n\n');
  
  const emailContent = `
Dear Wholesaler,

We have received a new order that requires fulfillment. Please process and ship the following items directly to the customer.

ORDER DETAILS:
Order Number: ${orderNumber}
Order Date: ${orderDate}

SHIPPING ADDRESS:
${shippingAddress.firstName} ${shippingAddress.lastName}
${shippingAddress.street}
${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}
${shippingAddress.country}
${shippingAddress.phone ? `Phone: ${shippingAddress.phone}` : ''}

PRODUCTS TO SHIP:
${productList}

${notes ? `SPECIAL NOTES:\n${notes}` : ''}

Please confirm receipt of this order and provide tracking information once shipped.

Best regards,
Holistic Store Team
  `.trim();

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: wholesalerEmail,
    subject: `New Order - ${orderNumber}`,
    text: emailContent
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Send order confirmation email
const sendOrderConfirmation = async (customerEmail, orderData) => {
  const transporter = createTransporter();
  if (!transporter) {
    return { success: true, message: 'Email skipped - not configured' };
  }
  
  const template = emailTemplates.orderConfirmation(orderData);
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: customerEmail,
    subject: template.subject,
    text: template.text,
    html: template.html
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Send payment receipt email
const sendPaymentReceipt = async (customerEmail, paymentData) => {
  const transporter = createTransporter();
  if (!transporter) {
    return { success: true, message: 'Email skipped - not configured' };
  }
  const template = emailTemplates.paymentReceipt(paymentData);
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: customerEmail,
    subject: template.subject,
    text: template.text,
    html: template.html
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Send order status update email
const sendOrderStatusUpdate = async (customerEmail, statusData) => {
  const transporter = createTransporter();
  if (!transporter) {
    return { success: true, message: 'Email skipped - not configured' };
  }
  const template = emailTemplates.orderStatusUpdate(statusData);
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: customerEmail,
    subject: template.subject,
    text: template.text,
    html: template.html
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Send welcome email
const sendWelcomeEmail = async (customerEmail, userData) => {
  const transporter = createTransporter();
  if (!transporter) {
    return { success: true, message: 'Email skipped - not configured' };
  }
  const template = emailTemplates.welcomeEmail(userData);
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: customerEmail,
    subject: template.subject,
    text: template.text,
    html: template.html
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Send password reset email
const sendPasswordResetEmail = async (customerEmail, resetData) => {
  const transporter = createTransporter();
  if (!transporter) {
    return { success: true, message: 'Email skipped - not configured' };
  }
  const template = emailTemplates.passwordReset(resetData);
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: customerEmail,
    subject: template.subject,
    text: template.text,
    html: template.html
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Generic email sender for custom templates
const sendEmail = async (to, subject, textContent, htmlContent = null) => {
  const transporter = createTransporter();
  if (!transporter) {
    return { success: true, message: 'Email skipped - not configured' };
  }
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text: textContent,
    ...(htmlContent && { html: htmlContent })
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendWholesalerNotification,
  sendOrderConfirmation,
  sendPaymentReceipt,
  sendOrderStatusUpdate,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendEmail,
  emailTemplates
};