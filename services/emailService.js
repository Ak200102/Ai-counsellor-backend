import nodemailer from "nodemailer";

let transporter = null;

function initializeTransporter() {
  if (transporter) return;
  
  console.log("📧 Initializing Gmail email service...");
  console.log("📧 Gmail User:", process.env.GMAIL_USER);
  console.log("📧 Gmail Password length:", process.env.GMAIL_PASSWORD?.length || 0);
  
  try {
    if (process.env.GMAIL_USER && process.env.GMAIL_PASSWORD) {
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection
      transporter.verify((error, success) => {
        if (error) {
          console.error("❌ Gmail verification failed:", error.message);
          console.log("🔐 EMAIL FALLBACK - OTP will be logged");
        } else {
          console.log("✅ Gmail service ready");
        }
      });
    } else {
      console.error("❌ Gmail credentials missing");
    }
  } catch (error) {
    console.error("❌ Gmail service initialization failed:", error.message);
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
    console.log("✅ OTP email sent via Gmail to:", email);
    return { success: true, message: "OTP sent to email" };
  } catch (error) {
    console.error("❌ Gmail send failed:", error.message);
    console.log("🔐 EMAIL FALLBACK - OTP:", otp);
    return { success: true, message: "Email failed, OTP logged" };
  }
};

export default { sendOTPEmail };
