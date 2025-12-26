export async function sendVerificationEmail(email: string, token: string) {
  const verifyLink = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`;

  // For now, we'll just log the email content to the console.
  // In a real application, you would use a service like SendGrid, Mailgun, or Nodemailer with a configured transport.
  console.log(`
    To: ${email}
    Subject: Verify Your Email

    Please click the following link to verify your email address:
    ${verifyLink}
  `);

  // Example with Nodemailer (uncomment and configure if you have an SMTP server)
  /*
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
    secure: process.env.EMAIL_SERVER_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Verify Your Email",
    html: `<p>Please click the following link to verify your email address:</p><p><a href="${verifyLink}">${verifyLink}</a></p>`,
  });
  */
}