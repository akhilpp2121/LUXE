import nodemailer from "nodemailer";

export const sendOtpEmail = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD, // Gmail App Password
  },
});

    

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Your OTP Code",
      html: `
        <h2>Your OTP Code</h2>
        <h1>${otp}</h1>
        <p>This OTP is valid for 1 minutes.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(" OTP sent to email");

  } catch (error) {
    console.log(" Email error:", error);
  }
};