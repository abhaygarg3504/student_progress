
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MY_EMAIL,
    pass: process.env.MY_EMAIL_PASSWORD, // 16-digit App Password if using Gmail
  },
});

/**
 * Send an email using Gmail via Nodemailer
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} htmlContent - Email HTML content
 */
export const sendEmail = async (to, subject, htmlContent) => {
  const mailOptions = {
    from: process.env.MY_EMAIL,
    to,
    subject,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    // console.log(`Email sent to: ${to}`);
  } catch (error) {
    console.error('Error sending email:', error.message);
    throw error;
  }
};
