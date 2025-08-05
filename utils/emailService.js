const nodemailer = require('nodemailer');
const { formatPrice } = require('./currency');
// getErrorMessage removed - not used in this file

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

// Email template translations
const emailTranslations = {
  en: {
    orderConfirmation: {
      subject: 'Order Confirmation - {orderNumber}',
      greeting: 'Dear {customerName},',
      thankYou: 'Thank you for your order! We\'re excited to help you on your holistic wellness journey.',
      orderDetails: 'ORDER DETAILS:',
      orderNumber: 'Order Number: {orderNumber}',
      orderTotal: 'Order Total: {total}',
      itemsOrdered: 'ITEMS ORDERED:',
      shippingAddress: 'SHIPPING ADDRESS:',
      processingMessage: 'Your order is being processed and you\'ll receive another email once it ships.',
      signature: 'With gratitude,\nThe Holistic Store Team'
    },
    orderStatusUpdate: {
      subject: 'Order Update - {orderNumber}',
      greeting: 'Dear {customerName},',
      updateMessage: 'We have an update on your order {orderNumber}.',
      status: 'Status: {status}',
      trackingNumber: 'Tracking Number: {trackingNumber}',
      statusMessages: {
        processing: 'Your order is being processed and will ship soon.',
        shipped: 'Great news! Your order has been shipped.',
        delivered: 'Your order has been delivered. We hope you enjoy your holistic products!'
      },
      thankYou: 'Thank you for your patience!',
      signature: 'Best regards,\nThe Holistic Store Team'
    },
    paymentReceipt: {
      subject: 'Payment Receipt - {orderNumber}',
      greeting: 'Dear {customerName},',
      successMessage: 'Your payment has been successfully processed!',
      paymentDetails: 'PAYMENT DETAILS:',
      orderNumber: 'Order Number: {orderNumber}',
      amountPaid: 'Amount Paid: {total}',
      paymentMethod: 'Payment Method: {paymentMethod}',
      transactionId: 'Transaction ID: {transactionId}',
      paymentDate: 'Payment Date: {date}',
      preparingMessage: 'Your order is now being prepared for shipment.',
      thankYou: 'Thank you for choosing our holistic products!',
      signature: 'Best regards,\nThe Holistic Store Team'
    },
    welcomeEmail: {
      subject: 'Welcome to Our Holistic Store!',
      greeting: 'Dear {firstName},',
      welcome: 'Welcome to our holistic wellness community!',
      description: 'We\'re thrilled to have you join us on this journey of spiritual and physical well-being. Our carefully curated collection of crystals, herbs, essential oils, and wellness products is here to support your holistic lifestyle.',
      benefits: 'As a member, you\'ll enjoy:',
      benefitsList: ['Exclusive access to new products', 'Special member discounts', 'Wellness tips and spiritual guidance', 'Priority customer support'],
      startExploring: 'Start exploring our collection and discover products that resonate with your energy.',
      signature: 'Namaste,\nThe Holistic Store Team'
    },
    passwordReset: {
      subject: 'Password Reset Request',
      greeting: 'Dear {firstName},',
      resetMessage: 'We received a request to reset your password for your Holistic Store account.',
      resetInstruction: 'To reset your password, please click the following link:',
      expiryMessage: 'This link will expire in 1 hour for security reasons.',
      ignoreMessage: 'If you didn\'t request this password reset, please ignore this email.',
      signature: 'Best regards,\nThe Holistic Store Team'
    }
  },
  es: {
    orderConfirmation: {
      subject: 'Confirmación de Pedido - {orderNumber}',
      greeting: 'Estimado/a {customerName},',
      thankYou: '¡Gracias por tu pedido! Estamos emocionados de ayudarte en tu viaje de bienestar holístico.',
      orderDetails: 'DETALLES DEL PEDIDO:',
      orderNumber: 'Número de Pedido: {orderNumber}',
      orderTotal: 'Total del Pedido: {total}',
      itemsOrdered: 'ARTÍCULOS PEDIDOS:',
      shippingAddress: 'DIRECCIÓN DE ENVÍO:',
      processingMessage: 'Tu pedido está siendo procesado y recibirás otro email una vez que sea enviado.',
      signature: 'Con gratitud,\nEl Equipo de Holistic Store'
    },
    orderStatusUpdate: {
      subject: 'Actualización de Pedido - {orderNumber}',
      greeting: 'Estimado/a {customerName},',
      updateMessage: 'Tenemos una actualización sobre tu pedido {orderNumber}.',
      status: 'Estado: {status}',
      trackingNumber: 'Número de Seguimiento: {trackingNumber}',
      statusMessages: {
        processing: 'Tu pedido está siendo procesado y será enviado pronto.',
        shipped: '¡Buenas noticias! Tu pedido ha sido enviado.',
        delivered: 'Tu pedido ha sido entregado. ¡Esperamos que disfrutes tus productos holísticos!'
      },
      thankYou: '¡Gracias por tu paciencia!',
      signature: 'Saludos cordiales,\nEl Equipo de Holistic Store'
    },
    paymentReceipt: {
      subject: 'Recibo de Pago - {orderNumber}',
      greeting: 'Estimado/a {customerName},',
      successMessage: '¡Tu pago ha sido procesado exitosamente!',
      paymentDetails: 'DETALLES DEL PAGO:',
      orderNumber: 'Número de Pedido: {orderNumber}',
      amountPaid: 'Cantidad Pagada: {total}',
      paymentMethod: 'Método de Pago: {paymentMethod}',
      transactionId: 'ID de Transacción: {transactionId}',
      paymentDate: 'Fecha de Pago: {date}',
      preparingMessage: 'Tu pedido ahora está siendo preparado para el envío.',
      thankYou: '¡Gracias por elegir nuestros productos holísticos!',
      signature: 'Saludos cordiales,\nEl Equipo de Holistic Store'
    },
    welcomeEmail: {
      subject: '¡Bienvenido/a a Nuestra Tienda Holística!',
      greeting: 'Estimado/a {firstName},',
      welcome: '¡Bienvenido/a a nuestra comunidad de bienestar holístico!',
      description: 'Estamos emocionados de tenerte en este viaje de bienestar espiritual y físico. Nuestra colección cuidadosamente seleccionada de cristales, hierbas, aceites esenciales y productos de bienestar está aquí para apoyar tu estilo de vida holístico.',
      benefits: 'Como miembro, disfrutarás de:',
      benefitsList: ['Acceso exclusivo a nuevos productos', 'Descuentos especiales para miembros', 'Consejos de bienestar y orientación espiritual', 'Atención al cliente prioritaria'],
      startExploring: 'Comienza a explorar nuestra colección y descubre productos que resuenen con tu energía.',
      signature: 'Namaste,\nEl Equipo de Holistic Store'
    },
    passwordReset: {
      subject: 'Solicitud de Restablecimiento de Contraseña',
      greeting: 'Estimado/a {firstName},',
      resetMessage: 'Recibimos una solicitud para restablecer tu contraseña de tu cuenta de Holistic Store.',
      resetInstruction: 'Para restablecer tu contraseña, por favor haz clic en el siguiente enlace:',
      expiryMessage: 'Este enlace expirará en 1 hora por razones de seguridad.',
      ignoreMessage: 'Si no solicitaste este restablecimiento de contraseña, por favor ignora este email.',
      signature: 'Saludos cordiales,\nEl Equipo de Holistic Store'
    }
  },
  fr: {
    orderConfirmation: {
      subject: 'Confirmation de Commande - {orderNumber}',
      greeting: 'Cher/Chère {customerName},',
      thankYou: 'Merci pour votre commande ! Nous sommes ravis de vous aider dans votre parcours de bien-être holistique.',
      orderDetails: 'DÉTAILS DE LA COMMANDE :',
      orderNumber: 'Numéro de Commande : {orderNumber}',
      orderTotal: 'Total de la Commande : {total}',
      itemsOrdered: 'ARTICLES COMMANDÉS :',
      shippingAddress: 'ADRESSE DE LIVRAISON :',
      processingMessage: 'Votre commande est en cours de traitement et vous recevrez un autre email une fois qu\'elle sera expédiée.',
      signature: 'Avec gratitude,\nL\'Équipe Holistic Store'
    },
    orderStatusUpdate: {
      subject: 'Mise à Jour de Commande - {orderNumber}',
      greeting: 'Cher/Chère {customerName},',
      updateMessage: 'Nous avons une mise à jour concernant votre commande {orderNumber}.',
      status: 'Statut : {status}',
      trackingNumber: 'Numéro de Suivi : {trackingNumber}',
      statusMessages: {
        processing: 'Votre commande est en cours de traitement et sera expédiée bientôt.',
        shipped: 'Bonne nouvelle ! Votre commande a été expédiée.',
        delivered: 'Votre commande a été livrée. Nous espérons que vous apprécierez vos produits holistiques !'
      },
      thankYou: 'Merci pour votre patience !',
      signature: 'Cordialement,\nL\'Équipe Holistic Store'
    },
    paymentReceipt: {
      subject: 'Reçu de Paiement - {orderNumber}',
      greeting: 'Cher/Chère {customerName},',
      successMessage: 'Votre paiement a été traité avec succès !',
      paymentDetails: 'DÉTAILS DU PAIEMENT :',
      orderNumber: 'Numéro de Commande : {orderNumber}',
      amountPaid: 'Montant Payé : {total}',
      paymentMethod: 'Méthode de Paiement : {paymentMethod}',
      transactionId: 'ID de Transaction : {transactionId}',
      paymentDate: 'Date de Paiement : {date}',
      preparingMessage: 'Votre commande est maintenant en cours de préparation pour l\'expédition.',
      thankYou: 'Merci d\'avoir choisi nos produits holistiques !',
      signature: 'Cordialement,\nL\'Équipe Holistic Store'
    },
    welcomeEmail: {
      subject: 'Bienvenue dans Notre Magasin Holistique !',
      greeting: 'Cher/Chère {firstName},',
      welcome: 'Bienvenue dans notre communauté de bien-être holistique !',
      description: 'Nous sommes ravis de vous avoir avec nous dans ce voyage de bien-être spirituel et physique. Notre collection soigneusement sélectionnée de cristaux, herbes, huiles essentielles et produits de bien-être est là pour soutenir votre mode de vie holistique.',
      benefits: 'En tant que membre, vous bénéficierez de :',
      benefitsList: ['Accès exclusif aux nouveaux produits', 'Réductions spéciales membres', 'Conseils de bien-être et guidance spirituelle', 'Support client prioritaire'],
      startExploring: 'Commencez à explorer notre collection et découvrez les produits qui résonnent avec votre énergie.',
      signature: 'Namaste,\nL\'Équipe Holistic Store'
    },
    passwordReset: {
      subject: 'Demande de Réinitialisation de Mot de Passe',
      greeting: 'Cher/Chère {firstName},',
      resetMessage: 'Nous avons reçu une demande de réinitialisation de votre mot de passe pour votre compte Holistic Store.',
      resetInstruction: 'Pour réinitialiser votre mot de passe, veuillez cliquer sur le lien suivant :',
      expiryMessage: 'Ce lien expirera dans 1 heure pour des raisons de sécurité.',
      ignoreMessage: 'Si vous n\'avez pas demandé cette réinitialisation, veuillez ignorer cet email.',
      signature: 'Cordialement,\nL\'Équipe Holistic Store'
    }
  },
  de: {
    orderConfirmation: {
      subject: 'Bestellbestätigung - {orderNumber}',
      greeting: 'Liebe/r {customerName},',
      thankYou: 'Vielen Dank für Ihre Bestellung! Wir freuen uns, Sie auf Ihrer ganzheitlichen Wellness-Reise zu begleiten.',
      orderDetails: 'BESTELLDETAILS:',
      orderNumber: 'Bestellnummer: {orderNumber}',
      orderTotal: 'Bestellsumme: {total}',
      itemsOrdered: 'BESTELLTE ARTIKEL:',
      shippingAddress: 'VERSANDADRESSE:',
      processingMessage: 'Ihre Bestellung wird bearbeitet und Sie erhalten eine weitere E-Mail, sobald sie versendet wird.',
      signature: 'Mit Dankbarkeit,\nDas Holistic Store Team'
    },
    orderStatusUpdate: {
      subject: 'Bestellupdate - {orderNumber}',
      greeting: 'Liebe/r {customerName},',
      updateMessage: 'Wir haben ein Update zu Ihrer Bestellung {orderNumber}.',
      status: 'Status: {status}',
      trackingNumber: 'Sendungsverfolgungsnummer: {trackingNumber}',
      statusMessages: {
        processing: 'Ihre Bestellung wird bearbeitet und bald versendet.',
        shipped: 'Gute Nachrichten! Ihre Bestellung wurde versendet.',
        delivered: 'Ihre Bestellung wurde zugestellt. Wir hoffen, Sie genießen Ihre ganzheitlichen Produkte!'
      },
      thankYou: 'Vielen Dank für Ihre Geduld!',
      signature: 'Mit freundlichen Grüßen,\nDas Holistic Store Team'
    },
    paymentReceipt: {
      subject: 'Zahlungsbeleg - {orderNumber}',
      greeting: 'Liebe/r {customerName},',
      successMessage: 'Ihre Zahlung wurde erfolgreich verarbeitet!',
      paymentDetails: 'ZAHLUNGSDETAILS:',
      orderNumber: 'Bestellnummer: {orderNumber}',
      amountPaid: 'Gezahlter Betrag: {total}',
      paymentMethod: 'Zahlungsmethode: {paymentMethod}',
      transactionId: 'Transaktions-ID: {transactionId}',
      paymentDate: 'Zahlungsdatum: {date}',
      preparingMessage: 'Ihre Bestellung wird nun für den Versand vorbereitet.',
      thankYou: 'Vielen Dank, dass Sie sich für unsere ganzheitlichen Produkte entschieden haben!',
      signature: 'Mit freundlichen Grüßen,\nDas Holistic Store Team'
    },
    welcomeEmail: {
      subject: 'Willkommen in unserem Ganzheitlichen Store!',
      greeting: 'Liebe/r {firstName},',
      welcome: 'Willkommen in unserer ganzheitlichen Wellness-Gemeinschaft!',
      description: 'Wir freuen uns, Sie auf dieser Reise des spirituellen und körperlichen Wohlbefindens begrüßen zu dürfen. Unsere sorgfältig kuratierte Sammlung von Kristallen, Kräutern, ätherischen Ölen und Wellness-Produkten unterstützt Ihren ganzheitlichen Lebensstil.',
      benefits: 'Als Mitglied genießen Sie:',
      benefitsList: ['Exklusiven Zugang zu neuen Produkten', 'Spezielle Mitgliederrabatte', 'Wellness-Tipps und spirituelle Führung', 'Prioritären Kundensupport'],
      startExploring: 'Beginnen Sie, unsere Sammlung zu erkunden und entdecken Sie Produkte, die mit Ihrer Energie in Resonanz stehen.',
      signature: 'Namaste,\nDas Holistic Store Team'
    },
    passwordReset: {
      subject: 'Passwort-Zurücksetzen Anfrage',
      greeting: 'Liebe/r {firstName},',
      resetMessage: 'Wir haben eine Anfrage erhalten, Ihr Passwort für Ihr Holistic Store Konto zurückzusetzen.',
      resetInstruction: 'Um Ihr Passwort zurückzusetzen, klicken Sie bitte auf den folgenden Link:',
      expiryMessage: 'Dieser Link läuft aus Sicherheitsgründen in 1 Stunde ab.',
      ignoreMessage: 'Wenn Sie diese Passwort-Zurücksetzung nicht angefordert haben, ignorieren Sie bitte diese E-Mail.',
      signature: 'Mit freundlichen Grüßen,\nDas Holistic Store Team'
    }
  },
  zh: {
    orderConfirmation: {
      subject: '订单确认 - {orderNumber}',
      greeting: '亲爱的 {customerName}，',
      thankYou: '感谢您的订单！我们很高兴能在您的整体健康之旅中为您提供帮助。',
      orderDetails: '订单详情：',
      orderNumber: '订单号：{orderNumber}',
      orderTotal: '订单总额：{total}',
      itemsOrdered: '已订购商品：',
      shippingAddress: '配送地址：',
      processingMessage: '您的订单正在处理中，发货后您将收到另一封邮件。',
      signature: '谨致敬意，\n整体健康商店团队'
    },
    orderStatusUpdate: {
      subject: '订单更新 - {orderNumber}',
      greeting: '亲爱的 {customerName}，',
      updateMessage: '我们有您订单 {orderNumber} 的更新信息。',
      status: '状态：{status}',
      trackingNumber: '快递单号：{trackingNumber}',
      statusMessages: {
        processing: '您的订单正在处理中，很快就会发货。',
        shipped: '好消息！您的订单已发货。',
        delivered: '您的订单已送达。希望您喜欢我们的整体健康产品！'
      },
      thankYou: '感谢您的耐心等待！',
      signature: '此致敬礼，\n整体健康商店团队'
    },
    paymentReceipt: {
      subject: '付款收据 - {orderNumber}',
      greeting: '亲爱的 {customerName}，',
      successMessage: '您的付款已成功处理！',
      paymentDetails: '付款详情：',
      orderNumber: '订单号：{orderNumber}',
      amountPaid: '付款金额：{total}',
      paymentMethod: '付款方式：{paymentMethod}',
      transactionId: '交易ID：{transactionId}',
      paymentDate: '付款日期：{date}',
      preparingMessage: '您的订单现在正在准备发货。',
      thankYou: '感谢您选择我们的整体健康产品！',
      signature: '此致敬礼，\n整体健康商店团队'
    },
    welcomeEmail: {
      subject: '欢迎来到我们的整体健康商店！',
      greeting: '亲爱的 {firstName}，',
      welcome: '欢迎加入我们的整体健康社区！',
      description: '我们很高兴您加入这个身心健康的旅程。我们精心挑选的水晶、草药、精油和健康产品系列将支持您的整体生活方式。',
      benefits: '作为会员，您将享受：',
      benefitsList: ['独家新产品访问权', '会员专享折扣', '健康贴士和精神指导', '优先客户支持'],
      startExploring: '开始探索我们的产品系列，发现与您能量共鸣的产品。',
      signature: 'Namaste，\n整体健康商店团队'
    },
    passwordReset: {
      subject: '密码重置请求',
      greeting: '亲爱的 {firstName}，',
      resetMessage: '我们收到了重置您整体健康商店账户密码的请求。',
      resetInstruction: '要重置您的密码，请点击以下链接：',
      expiryMessage: '出于安全考虑，此链接将在1小时后过期。',
      ignoreMessage: '如果您没有请求重置密码，请忽略此邮件。',
      signature: '此致敬礼，\n整体健康商店团队'
    }
  },
  ja: {
    orderConfirmation: {
      subject: 'ご注文確認 - {orderNumber}',
      greeting: '{customerName} 様',
      thankYou: 'ご注文ありがとうございます！あなたのホリスティックウェルネスの旅をお手伝いできることを嬉しく思います。',
      orderDetails: 'ご注文詳細：',
      orderNumber: 'ご注文番号：{orderNumber}',
      orderTotal: 'ご注文合計：{total}',
      itemsOrdered: 'ご注文商品：',
      shippingAddress: 'お届け先住所：',
      processingMessage: 'ご注文を処理中です。発送完了後に再度メールをお送りいたします。',
      signature: '感謝を込めて，\nホリスティックストアチーム'
    },
    orderStatusUpdate: {
      subject: 'ご注文状況更新 - {orderNumber}',
      greeting: '{customerName} 様',
      updateMessage: 'ご注文 {orderNumber} の状況更新をお知らせします。',
      status: 'ステータス：{status}',
      trackingNumber: '追跡番号：{trackingNumber}',
      statusMessages: {
        processing: 'ご注文を処理中です。まもなく発送いたします。',
        shipped: '朗報です！ご注文商品を発送いたしました。',
        delivered: 'ご注文商品をお届けいたしました。ホリスティック商品をお楽しみください！'
      },
      thankYou: 'お待ちいただきありがとうございます！',
      signature: '敬具，\nホリスティックストアチーム'
    },
    paymentReceipt: {
      subject: 'お支払い受領書 - {orderNumber}',
      greeting: '{customerName} 様',
      successMessage: 'お支払いが正常に処理されました！',
      paymentDetails: 'お支払い詳細：',
      orderNumber: 'ご注文番号：{orderNumber}',
      amountPaid: 'お支払い金額：{total}',
      paymentMethod: 'お支払い方法：{paymentMethod}',
      transactionId: '取引ID：{transactionId}',
      paymentDate: 'お支払い日：{date}',
      preparingMessage: 'ご注文商品の発送準備を開始いたします。',
      thankYou: 'ホリスティック商品をお選びいただきありがとうございます！',
      signature: '敬具，\nホリスティックストアチーム'
    },
    welcomeEmail: {
      subject: 'ホリスティックストアへようこそ！',
      greeting: '{firstName} 様',
      welcome: 'ホリスティックウェルネスコミュニティへようこそ！',
      description: '心身の健康の旅にご参加いただき、大変嬉しく思います。厳選されたクリスタル、ハーブ、エッセンシャルオイル、ウェルネス商品のコレクションが、あなたのホリスティックなライフスタイルをサポートします。',
      benefits: '会員として、以下の特典をお楽しみいただけます：',
      benefitsList: ['新商品への優先アクセス', '会員限定割引', 'ウェルネスのヒントとスピリチュアルガイダンス', '優先カスタマーサポート'],
      startExploring: 'コレクションを探索し、あなたのエネルギーと共鳴する商品を見つけてください。',
      signature: 'ナマステ，\nホリスティックストアチーム'
    },
    passwordReset: {
      subject: 'パスワードリセット要求',
      greeting: '{firstName} 様',
      resetMessage: 'ホリスティックストアアカウントのパスワードリセット要求を受信いたしました。',
      resetInstruction: 'パスワードをリセットするには、以下のリンクをクリックしてください：',
      expiryMessage: 'セキュリティ上の理由により、このリンクは1時間で期限切れとなります。',
      ignoreMessage: 'このパスワードリセットをリクエストしていない場合は、このメールを無視してください。',
      signature: '敬具，\nホリスティックストアチーム'
    }
  },
  ar: {
    orderConfirmation: {
      subject: 'تأكيد الطلب - {orderNumber}',
      greeting: 'عزيزي/عزيزتي {customerName}،',
      thankYou: 'شكراً لك على طلبك! نحن متحمسون لمساعدتك في رحلة العافية الشاملة.',
      orderDetails: 'تفاصيل الطلب:',
      orderNumber: 'رقم الطلب: {orderNumber}',
      orderTotal: 'إجمالي الطلب: {total}',
      itemsOrdered: 'المنتجات المطلوبة:',
      shippingAddress: 'عنوان الشحن:',
      processingMessage: 'يتم معالجة طلبك وستتلقى بريداً إلكترونياً آخر بمجرد الشحن.',
      signature: 'مع الامتنان،\nفريق المتجر الشامل'
    },
    orderStatusUpdate: {
      subject: 'تحديث الطلب - {orderNumber}',
      greeting: 'عزيزي/عزيزتي {customerName}،',
      updateMessage: 'لدينا تحديث حول طلبك {orderNumber}.',
      status: 'الحالة: {status}',
      trackingNumber: 'رقم التتبع: {trackingNumber}',
      statusMessages: {
        processing: 'يتم معالجة طلبك وسيتم شحنه قريباً.',
        shipped: 'أخبار رائعة! تم شحن طلبك.',
        delivered: 'تم تسليم طلبك. نأمل أن تستمتع بمنتجاتك الشاملة!'
      },
      thankYou: 'شكراً لصبرك!',
      signature: 'مع أطيب التحيات،\nفريق المتجر الشامل'
    },
    paymentReceipt: {
      subject: 'إيصال الدفع - {orderNumber}',
      greeting: 'عزيزي/عزيزتي {customerName}،',
      successMessage: 'تم معالجة دفعتك بنجاح!',
      paymentDetails: 'تفاصيل الدفع:',
      orderNumber: 'رقم الطلب: {orderNumber}',
      amountPaid: 'المبلغ المدفوع: {total}',
      paymentMethod: 'طريقة الدفع: {paymentMethod}',
      transactionId: 'معرف المعاملة: {transactionId}',
      paymentDate: 'تاريخ الدفع: {date}',
      preparingMessage: 'يتم الآن تحضير طلبك للشحن.',
      thankYou: 'شكراً لاختيارك منتجاتنا الشاملة!',
      signature: 'مع أطيب التحيات،\nفريق المتجر الشامل'
    },
    welcomeEmail: {
      subject: 'مرحباً بك في متجرنا الشامل!',
      greeting: 'عزيزي/عزيزتي {firstName}،',
      welcome: 'مرحباً بك في مجتمع العافية الشاملة!',
      description: 'نحن متحمسون لانضمامك إلينا في هذه الرحلة من العافية الروحية والجسدية. مجموعتنا المختارة بعناية من الكريستال والأعشاب والزيوت الأساسية ومنتجات العافية هنا لدعم نمط حياتك الشامل.',
      benefits: 'كعضو، ستستمتع بـ:',
      benefitsList: ['وصول حصري للمنتجات الجديدة', 'خصومات خاصة للأعضاء', 'نصائح العافية والإرشاد الروحي', 'دعم عملاء مفضل'],
      startExploring: 'ابدأ في استكشاف مجموعتنا واكتشف المنتجات التي تتجاوب مع طاقتك.',
      signature: 'ناماستي،\nفريق المتجر الشامل'
    },
    passwordReset: {
      subject: 'طلب إعادة تعيين كلمة المرور',
      greeting: 'عزيزي/عزيزتي {firstName}،',
      resetMessage: 'تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك في المتجر الشامل.',
      resetInstruction: 'لإعادة تعيين كلمة المرور، يرجى النقر على الرابط التالي:',
      expiryMessage: 'ستنتهي صلاحية هذا الرابط خلال ساعة واحدة لأسباب أمنية.',
      ignoreMessage: 'إذا لم تطلب إعادة تعيين كلمة المرور هذه، يرجى تجاهل هذا البريد الإلكتروني.',
      signature: 'مع أطيب التحيات،\nفريق المتجر الشامل'
    }
  },
  he: {
    orderConfirmation: {
      subject: 'אישור הזמנה - {orderNumber}',
      greeting: '{customerName} יקר/ה,',
      thankYou: 'תודה על ההזמנה! אנחנו נרגשים לעזור לך במסע הבריאות ההוליסטית שלך.',
      orderDetails: 'פרטי ההזמנה:',
      orderNumber: 'מספר הזמנה: {orderNumber}',
      orderTotal: 'סך הזמנה: {total}',
      itemsOrdered: 'פריטים שהוזמנו:',
      shippingAddress: 'כתובת משלוח:',
      processingMessage: 'ההזמנה שלך מעובדת ותקבל/י אימייל נוסף ברגע שתישלח.',
      signature: 'בהכרת תודה,\nצוות החנות ההוליסטית'
    },
    orderStatusUpdate: {
      subject: 'עדכון הזמנה - {orderNumber}',
      greeting: '{customerName} יקר/ה,',
      updateMessage: 'יש לנו עדכון על ההזמנה שלך {orderNumber}.',
      status: 'סטטוס: {status}',
      trackingNumber: 'מספר מעקב: {trackingNumber}',
      statusMessages: {
        processing: 'ההזמנה שלך מעובדת ותישלח בקרוב.',
        shipped: 'חדשות טובות! ההזמנה שלך נשלחה.',
        delivered: 'ההזמנה שלך נמסרה. אנחנו מקווים שתהנה/י מהמוצרים ההוליסטיים!'
      },
      thankYou: 'תודה על הסבלנות!',
      signature: 'בברכה,\nצוות החנות ההוליסטית'
    },
    paymentReceipt: {
      subject: 'קבלה על תשלום - {orderNumber}',
      greeting: '{customerName} יקר/ה,',
      successMessage: 'התשלום שלך עובד בהצלחה!',
      paymentDetails: 'פרטי התשלום:',
      orderNumber: 'מספר הזמנה: {orderNumber}',
      amountPaid: 'סכום ששולם: {total}',
      paymentMethod: 'אמצעי תשלום: {paymentMethod}',
      transactionId: 'מזהה עסקה: {transactionId}',
      paymentDate: 'תאריך תשלום: {date}',
      preparingMessage: 'ההזמנה שלך מוכנה כעת למשלוח.',
      thankYou: 'תודה שבחרת במוצרים ההוליסטיים שלנו!',
      signature: 'בברכה,\nצוות החנות ההוליסטית'
    },
    welcomeEmail: {
      subject: 'ברוכים הבאים לחנות ההוליסטית שלנו!',
      greeting: '{firstName} יקר/ה,',
      welcome: 'ברוכים הבאים לקהילת הבריאות ההוליסטית שלנו!',
      description: 'אנחנו נרגשים שהצטרפת אלינו למסע הזה של בריאות רוחנית ופיזית. האוסף שלנו שנבחר בקפידה של קריסטלים, עשבי תיבול, שמנים אתריים ומוצרי בריאות כאן כדי לתמוך באורח החיים ההוליסטי שלך.',
      benefits: 'כחבר/ה, תהנה/י מ:',
      benefitsList: ['גישה בלעדית למוצרים חדשים', 'הנחות מיוחדות לחברים', 'טיפים לבריאות והדרכה רוחנית', 'תמיכת לקוחות מועדפת'],
      startExploring: 'התחל/י לחקור את האוסף שלנו וגלה/י מוצרים שמהדהדים עם האנרגיה שלך.',
      signature: 'נמסטה,\nצוות החנות ההוליסטית'
    },
    passwordReset: {
      subject: 'בקשת איפוס סיסמה',
      greeting: '{firstName} יקר/ה,',
      resetMessage: 'קיבלנו בקשה לאיפוס הסיסמה עבור החשבון שלך בחנות ההוליסטית.',
      resetInstruction: 'כדי לאפס את הסיסמה שלך, אנא לחץ/י על הקישור הבא:',
      expiryMessage: 'קישור זה יפוג תוך שעה אחת מסיבות אבטחה.',
      ignoreMessage: 'אם לא ביקשת איפוס סיסמה זה, אנא התעלם/י מאימייל זה.',
      signature: 'בברכה,\nצוות החנות ההוליסטית'
    }
  }
};

// Helper function to replace placeholders in text
function replacePlaceholders(text, data) {
  return text.replace(/\{([^}]+)\}/g, (match, key) => {
    return data[key] || match;
  });
}

// Generate localized email templates
const emailTemplates = {
  orderConfirmation: (orderData, locale = 'en') => {
    const { orderNumber, customerName, items, total, shippingAddress, currency = 'USD' } = orderData;
    const t = emailTranslations[locale] || emailTranslations['en'];
    const template = t.orderConfirmation;
    
    const itemsList = items.map(item => 
      `- ${item.productName || 'Product'} (Qty: ${item.quantity}) - ${formatPrice(item.price, currency)}`
    ).join('\n');

    const data = {
      orderNumber,
      customerName,
      total: formatPrice(total, currency)
    };

    return {
      subject: replacePlaceholders(template.subject, data),
      text: `
${replacePlaceholders(template.greeting, data)}

${template.thankYou}

${template.orderDetails}
${replacePlaceholders(template.orderNumber, data)}
${replacePlaceholders(template.orderTotal, data)}

${template.itemsOrdered}
${itemsList}

${template.shippingAddress}
${shippingAddress.firstName} ${shippingAddress.lastName}
${shippingAddress.street}
${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}
${shippingAddress.country}

${template.processingMessage}

${template.signature}
      `.trim(),
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: ${['ar', 'he'].includes(locale) ? 'rtl' : 'ltr'};">
  <h2 style="color: #4a5568;">${replacePlaceholders(template.subject, data).replace(' - ' + orderNumber, '')}</h2>
  
  <p>${replacePlaceholders(template.greeting, data)}</p>
  
  <p>${template.thankYou}</p>
  
  <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="color: #2d3748; margin-top: 0;">${template.orderDetails}</h3>
    <p><strong>${template.orderNumber.split(':')[0]}:</strong> ${orderNumber}</p>
    <p><strong>${template.orderTotal.split(':')[0]}:</strong> ${formatPrice(total, currency)}</p>
  </div>
  
  <h3 style="color: #2d3748;">${template.itemsOrdered}</h3>
  <ul>
    ${items.map(item => `<li>${item.productName || 'Product'} (Qty: ${item.quantity}) - ${formatPrice(item.price, currency)}</li>`).join('')}
  </ul>
  
  <h3 style="color: #2d3748;">${template.shippingAddress}</h3>
  <p>
    ${shippingAddress.firstName} ${shippingAddress.lastName}<br>
    ${shippingAddress.street}<br>
    ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}<br>
    ${shippingAddress.country}
  </p>
  
  <p>${template.processingMessage}</p>
  
  <p style="margin-top: 30px;">${template.signature.replace('\n', '<br>')}</p>
</div>
      `.trim()
    };
  },

  paymentReceipt: (paymentData, locale = 'en') => {
    const { orderNumber, customerName, total, paymentMethod, transactionId, paidAt, currency = 'USD' } = paymentData;
    const t = emailTranslations[locale] || emailTranslations['en'];
    const template = t.paymentReceipt;
    
    const data = {
      orderNumber,
      customerName,
      total: formatPrice(total, currency),
      paymentMethod,
      transactionId,
      date: new Date(paidAt).toLocaleDateString()
    };

    return {
      subject: replacePlaceholders(template.subject, data),
      text: `
${replacePlaceholders(template.greeting, data)}

${template.successMessage}

${template.paymentDetails}
${replacePlaceholders(template.orderNumber, data)}
${replacePlaceholders(template.amountPaid, data)}
${replacePlaceholders(template.paymentMethod, data)}
${replacePlaceholders(template.transactionId, data)}
${replacePlaceholders(template.paymentDate, data)}

${template.preparingMessage}

${template.thankYou}

${template.signature}
      `.trim(),
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: ${['ar', 'he'].includes(locale) ? 'rtl' : 'ltr'};">
  <h2 style="color: #4a5568;">${replacePlaceholders(template.subject, data).replace(' - ' + orderNumber, '')}</h2>
  
  <p>${replacePlaceholders(template.greeting, data)}</p>
  
  <p>${template.successMessage}</p>
  
  <div style="background: #f0fff4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #48bb78;">
    <h3 style="color: #2d3748; margin-top: 0;">${template.paymentDetails}</h3>
    <p><strong>${template.orderNumber.split(':')[0]}:</strong> ${orderNumber}</p>
    <p><strong>${template.amountPaid.split(':')[0]}:</strong> ${formatPrice(total, currency)}</p>
    <p><strong>${template.paymentMethod.split(':')[0]}:</strong> ${paymentMethod}</p>
    <p><strong>${template.transactionId.split(':')[0]}:</strong> ${transactionId}</p>
    <p><strong>${template.paymentDate.split(':')[0]}:</strong> ${new Date(paidAt).toLocaleDateString()}</p>
  </div>
  
  <p>${template.preparingMessage}</p>
  
  <p>${template.thankYou}</p>
  
  <p style="margin-top: 30px;">${template.signature.replace('\n', '<br>')}</p>
</div>
      `.trim()
    };
  },

  orderStatusUpdate: (statusData, locale = 'en') => {
    const { orderNumber, customerName, status, trackingNumber } = statusData;
    const t = emailTranslations[locale] || emailTranslations['en'];
    const template = t.orderStatusUpdate;
    
    const data = {
      orderNumber,
      customerName,
      status: status.charAt(0).toUpperCase() + status.slice(1),
      trackingNumber
    };

    const statusMessage = template.statusMessages[status] || `Your order status has been updated to ${status}.`;

    return {
      subject: replacePlaceholders(template.subject, data),
      text: `
${replacePlaceholders(template.greeting, data)}

${replacePlaceholders(template.updateMessage, data)}

${replacePlaceholders(template.status, data)}

${statusMessage}

${trackingNumber ? replacePlaceholders(template.trackingNumber, data) : ''}

${template.thankYou}

${template.signature}
      `.trim(),
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: ${['ar', 'he'].includes(locale) ? 'rtl' : 'ltr'};">
  <h2 style="color: #4a5568;">${replacePlaceholders(template.subject, data).replace(' - ' + orderNumber, '')}</h2>
  
  <p>${replacePlaceholders(template.greeting, data)}</p>
  
  <p>${replacePlaceholders(template.updateMessage, data)}</p>
  
  <div style="background: #ebf8ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4299e1;">
    <h3 style="color: #2d3748; margin-top: 0;">${replacePlaceholders(template.status, data)}</h3>
    <p>${statusMessage}</p>
    ${trackingNumber ? `<p><strong>${template.trackingNumber.split(':')[0]}:</strong> ${trackingNumber}</p>` : ''}
  </div>
  
  <p>${template.thankYou}</p>
  
  <p style="margin-top: 30px;">${template.signature.replace('\n', '<br>')}</p>
</div>
      `.trim()
    };
  },

  welcomeEmail: (userData, locale = 'en') => {
    const { firstName, email } = userData;
    const t = emailTranslations[locale] || emailTranslations['en'];
    const template = t.welcomeEmail;
    
    const data = { firstName, email };

    return {
      subject: template.subject,
      text: `
${replacePlaceholders(template.greeting, data)}

${template.welcome}

${template.description}

${template.benefits}
${template.benefitsList.map(benefit => `- ${benefit}`).join('\n')}

${template.startExploring}

${template.signature}
      `.trim(),
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: ${['ar', 'he'].includes(locale) ? 'rtl' : 'ltr'};">
  <h2 style="color: #4a5568;">${template.subject}</h2>
  
  <p>${replacePlaceholders(template.greeting, data)}</p>
  
  <p>${template.welcome}</p>
  
  <p>${template.description}</p>
  
  <div style="background: #fef5e7; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="color: #2d3748; margin-top: 0;">${template.benefits}</h3>
    <ul style="color: #4a5568;">
      ${template.benefitsList.map(benefit => `<li>${benefit}</li>`).join('')}
    </ul>
  </div>
  
  <p>${template.startExploring}</p>
  
  <p style="margin-top: 30px;">${template.signature.replace('\n', '<br>')}</p>
</div>
      `.trim()
    };
  },

  passwordReset: (resetData, locale = 'en') => {
    const { firstName, resetToken, resetUrl } = resetData;
    const t = emailTranslations[locale] || emailTranslations['en'];
    const template = t.passwordReset;
    
    const data = { firstName, resetToken, resetUrl };

    return {
      subject: template.subject,
      text: `
${replacePlaceholders(template.greeting, data)}

${template.resetMessage}

${template.resetInstruction}
${resetUrl}

${template.expiryMessage}

${template.ignoreMessage}

${template.signature}
      `.trim(),
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: ${['ar', 'he'].includes(locale) ? 'rtl' : 'ltr'};">
  <h2 style="color: #4a5568;">${template.subject}</h2>
  
  <p>${replacePlaceholders(template.greeting, data)}</p>
  
  <p>${template.resetMessage}</p>
  
  <div style="background: #fed7d7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f56565;">
    <p>${template.resetInstruction}</p>
    <a href="${resetUrl}" style="display: inline-block; background: #4299e1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">Reset Password</a>
    <p style="font-size: 14px; color: #718096;">${template.expiryMessage}</p>
  </div>
  
  <p>${template.ignoreMessage}</p>
  
  <p style="margin-top: 30px;">${template.signature.replace('\n', '<br>')}</p>
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
const sendOrderConfirmation = async (customerEmail, orderData, locale = 'en') => {
  const transporter = createTransporter();
  if (!transporter) {
    return { success: true, message: 'Email skipped - not configured' };
  }
  
  const template = emailTemplates.orderConfirmation(orderData, locale);
  
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
const sendPaymentReceipt = async (customerEmail, paymentData, locale = 'en') => {
  const transporter = createTransporter();
  if (!transporter) {
    return { success: true, message: 'Email skipped - not configured' };
  }
  const template = emailTemplates.paymentReceipt(paymentData, locale);
  
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
const sendOrderStatusUpdate = async (customerEmail, statusData, locale = 'en') => {
  const transporter = createTransporter();
  if (!transporter) {
    return { success: true, message: 'Email skipped - not configured' };
  }
  const template = emailTemplates.orderStatusUpdate(statusData, locale);
  
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
const sendWelcomeEmail = async (customerEmail, userData, locale = 'en') => {
  const transporter = createTransporter();
  if (!transporter) {
    return { success: true, message: 'Email skipped - not configured' };
  }
  const template = emailTemplates.welcomeEmail(userData, locale);
  
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
const sendPasswordResetEmail = async (customerEmail, resetData, locale = 'en') => {
  const transporter = createTransporter();
  if (!transporter) {
    return { success: true, message: 'Email skipped - not configured' };
  }
  const template = emailTemplates.passwordReset(resetData, locale);
  
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
  emailTemplates,
  emailTranslations
};