import nodemailer from "nodemailer";

let transporter = null;
let initialized = false;

function initializeTransporter() {
  if (initialized) return;
  
  console.log("📧 Email Service Initializing...");
  console.log("Gmail User:", process.env.GMAIL_USER);
  console.log("Gmail Password exists:", !!process.env.GMAIL_PASSWORD);
  
  try {
    if (process.env.GMAIL_USER && process.env.GMAIL_PASSWORD) {
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASSWORD
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection
      transporter.verify((error, success) => {
        if (error) {
          console.warn("⚠️ Email service warning:", error.message);
          console.log("📧 OTPs will be logged to console for testing");
        } else {
          console.log("✅ Email service ready - Emails will be sent!");
        }
      });
    }
  } catch (error) {
    console.warn("⚠️ Email service error:", error.message);
    console.log("📧 OTPs will be logged to console for testing");
  }
  
  initialized = true;
}

export const sendOTPEmail = async (email, otp, userName) => {
  try {
    // Initialize transporter on first use (when env vars are loaded)
    initializeTransporter();
    
    console.log("📧 Attempting to send OTP email...");
    console.log("📧 Gmail User configured:", !!process.env.GMAIL_USER);
    console.log("📧 Gmail Password configured:", !!process.env.GMAIL_PASSWORD);
    console.log("📧 Transporter available:", !!transporter);
    
    // If transporter is not available, log to console (for development)
    if (!transporter) {
      console.log("\n🔐 OTP FOR TESTING (EMAIL SERVICE NOT CONFIGURED):");
      console.log(`Email: ${email}`);
      console.log(`User: ${userName}`);
      console.log(`OTP: ${otp}`);
      console.log(`Expires: 10 minutes\n`);
      return { success: true, message: "OTP logged to console (email service not configured)" };
    }

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: "🔐 AI Counsellor - Verify Your Email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h2 style="margin: 0;">🎓 AI Counsellor</h2>
          </div>
          
          <div style="background: #f5f5f5; padding: 30px; border-radius: 0 0 10px 10px;">
            <h3>Welcome, ${userName}!</h3>
            <p>Thank you for signing up for AI Counsellor. To complete your account setup, please verify your email using the code below:</p>
            
            <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <div style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 5px;">
                ${otp}
              </div>
              <p style="color: #888; margin-top: 10px;">This code will expire in 10 minutes</p>
            </div>
            
            <p><strong>How to use:</strong></p>
            <ol>
              <li>Go back to the signup form</li>
              <li>Enter the 6-digit code above</li>
              <li>Click Verify to complete signup</li>
            </ol>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            
            <p style="color: #888; font-size: 12px;">
              If you didn't request this email, please ignore it or contact support.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 OTP email sent to ${email}`);
    return { success: true, message: "OTP sent to email" };
  } catch (error) {
    console.error("❌ Email send error:", error.message);
    // Fallback: log to console instead of failing
    console.log("\n🔐 OTP FOR TESTING (EMAIL FAILED):");
    console.log(`Email: ${email}`);
    console.log(`User: ${userName}`);
    console.log(`OTP: ${otp}`);
    console.log(`Expires: 10 minutes\n`);
    return { success: true, message: "OTP logged to console (email service unavailable)" };
  }
};

export default { sendOTPEmail };
