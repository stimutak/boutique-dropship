const nodemailer = require('nodemailer');

// Create transporter with environment configuration
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send wholesaler notification email
const sendWholesalerNotification = async (wholesalerEmail, orderData) => {
  const transporter = createTransporter();
  
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

module.exports = {
  sendWholesalerNotification
};