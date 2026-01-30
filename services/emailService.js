import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
});

export const sendOTPEmail = async (email, otp, userName) => {
  await transporter.sendMail({
    from: `"AI Counsellor" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Verify your email",
    html: `
      <h2>AI Counsellor</h2>
      <p>Hello ${userName}</p>
      <h1>${otp}</h1>
      <p>Valid for 10 minutes</p>
    `,
  });
};

export default { sendOTPEmail }
