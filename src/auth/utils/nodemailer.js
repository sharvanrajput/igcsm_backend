import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

export const sendmail = async ({ email, otp }) => {
    try {
        const html = `
      <div style="font-family: Arial; padding: 10px;">
        <h2>OTP Verification</h2>
        <p>Your OTP for login/verification is:</p>
        <h1 style="color:#4CAF50; letter-spacing:5px;">${otp}</h1>
        <p>This OTP will expire in 5 minutes.</p>
      </div>
    `;

        await transporter.sendMail({
            from: `"My App" <${process.env.MAIL_USER}>`,
            to: email,
            subject: "🔐 Your One-Time Password (OTP)",
            html,
        });

        console.log("✅ Email sent successfully to:", email);
        return true;
    } catch (error) {
        console.error("❌ OTP Mail Error:", error);
        return false;
    }
};