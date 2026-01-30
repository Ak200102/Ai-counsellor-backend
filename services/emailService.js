import nodemailer from "nodemailer";

let transporter = null;

function initializeTransporter() {
  if (transporter) return;
  
  console.log("📧 Initializing email service...");
  console.log("📧 Gmail User:", process.env.GMAIL_USER);
  console.log("📧 Gmail Password length:", process.env.GMAIL_PASSWORD?.length || 0);
  console.log("📧 Gmail Password format:", process.env.GMAIL_PASSWORD?.includes(' ') ? "HAS SPACES" : "NO SPACES");
  
  try {
    if (process.env.GMAIL_USER && process.env.GMAIL_PASSWORD) {
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASSWORD,
        },
      });

      // Verify connection
      transporter.verify((error, success) => {
        if (error) {
          console.error("❌ Email verification failed:", error.message);
          console.log("🔧 Error code:", error.code);
          console.log("🔧 Common fixes:");
          console.log("  1. Check app password format (no spaces)");
          console.log("  2. Regenerate app password");
          console.log("  3. Make sure 2FA is enabled");
        } else {
          console.log("✅ Email service ready");
        }
      });
    } else {
      console.error("❌ Gmail credentials missing");
      console.error("  - GMAIL_USER:", !!process.env.GMAIL_USER);
      console.error("  - GMAIL_PASSWORD:", !!process.env.GMAIL_PASSWORD);
    }
  } catch (error) {
    console.error("❌ Email service initialization failed:", error.message);
  }
}

export const sendOTPEmail = async (email, otp, userName) => {
  try {
    initializeTransporter();
    
    if (!transporter) {
      console.log("🔐 EMAIL FALLBACK - OTP:", otp);
      return { success: true, message: "Email service not configured" };
    }

    const mailOptions = {
      from: `"AI Counsellor" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Verify your AI Counsellor account",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #4f46e5; color: white; padding: 20px; text-align: center;">
            <h2>🎓 AI Counsellor</h2>
          </div>
          <div style="padding: 20px; background: #f9f9f9;">
            <p>Hello <strong>${userName}</strong>,</p>
            <p>Your verification code is:</p>
            <div style="font-size: 32px; font-weight: bold; text-align: center; margin: 20px 0; letter-spacing: 5px;">
              ${otp}
            </div>
            <p>This code will expire in <strong>10 minutes</strong>.</p>
            <p style="font-size: 12px; color: #666;">
              If you didn't request this, please ignore this email.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ OTP email sent to:", email);
    return { success: true, message: "OTP sent to email" };
  } catch (error) {
    console.error("❌ Email send failed:", error.message);
    console.log("🔐 EMAIL FALLBACK - OTP:", otp);
    return { success: true, message: "Email failed, OTP logged" };
  }
};

export default { sendOTPEmail };
