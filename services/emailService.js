import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOTPEmail = async (email, otp, userName) => {
  // Fallback if API key missing
  if (!process.env.RESEND_API_KEY) {
    console.log("🔐 OTP (EMAIL DISABLED):", otp);
    return { success: true, message: "OTP logged to console" };
  }

  try {
    await resend.emails.send({
      from: `AI Counsellor <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: "🔐 Verify your email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
          <div style="background:#4f46e5;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center">
            <h2>🎓 AI Counsellor</h2>
          </div>

          <div style="background:#f9f9f9;padding:25px;border-radius:0 0 8px 8px">
            <p>Hello <strong>${userName}</strong>,</p>
            <p>Your verification code is:</p>

            <div style="font-size:36px;font-weight:bold;letter-spacing:6px;text-align:center;margin:20px 0">
              ${otp}
            </div>

            <p>This code will expire in <strong>10 minutes</strong>.</p>
            <p style="font-size:12px;color:#777">
              If you didn’t request this, you can safely ignore this email.
            </p>
          </div>
        </div>
      `
    });

    console.log(`📧 OTP email sent → ${email}`);
    return { success: true, message: "OTP sent to email" };
  } catch (error) {
    console.error("❌ Email send failed:", error.message);

    // Absolute fallback — auth flow never breaks
    console.log("🔐 OTP FALLBACK:", otp);
    return { success: true, message: "OTP logged to console" };
  }
};

export default { sendOTPEmail };