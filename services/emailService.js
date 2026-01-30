import nodemailer from "nodemailer";

let transporter = null;

function initializeTransporter() {
  if (transporter) return;
  
  try {
    if (process.env.GMAIL_USER && process.env.GMAIL_PASSWORD) {
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASSWORD,
        },
      });
    }
  } catch (error) {
    console.error("Email service initialization failed:", error.message);
  }
}

export const sendOTPEmail = async (email, otp, userName) => {
  try {
    initializeTransporter();
    
    if (!transporter) {
      console.log("Email service not configured, OTP:", otp);
      return { success: true, message: "Email service not configured" };
    }

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
    
    console.log("OTP email sent to:", email);
    return { success: true, message: "OTP sent to email" };
  } catch (error) {
    console.error("Email send error:", error.message);
    console.log("Fallback OTP:", otp);
    return { success: true, message: "Email failed, OTP logged" };
  }
};

export default { sendOTPEmail };
