import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOTPEmail = async (email, otp, userName) => {
  console.log("📧 Using Resend email service...");
  console.log("📧 RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY);
  console.log("📧 FROM_EMAIL:", process.env.FROM_EMAIL);
  console.log("📧 Sending OTP to:", email);
  
  // Fallback if API key missing
  if (!process.env.RESEND_API_KEY) {
    console.log("🔐 EMAIL FALLBACK - OTP:", otp);
    return { success: true, message: "Email service not configured" };
  }

  try {
    await resend.emails.send({
      from: "onboarding@resend.dev",  // Use Resend's verified domain
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
      `
    });
    
    console.log("✅ OTP email sent via Resend to:", email);
    return { success: true, message: "OTP sent to email" };
  } catch (error) {
    console.error("❌ Resend email send failed:", error.message);
    console.log("🔐 EMAIL FALLBACK - OTP:", otp);
    return { success: true, message: "Email failed, OTP logged" };
  }
};

export default { sendOTPEmail };
