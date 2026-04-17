import mongoose from "mongoose";
import { registerService, userLoginLogic ,resetPasswordService} from "../service/userService.js";
import { generateAndSendOtp } from "../service/userService.js";
export async function userLandingLoad(req, res) {
  try {
    if (req.session.user) {
      return res.redirect("/homePage");
    }

    return res.render("Users/LandingPage");
  } catch (error) {
    console.log("Server error ", error);
    return res.redirect("/login");
  }
}
export async function userLoginLoad(req, res) {
  try {
    if (req.session.user) {
      return res.redirect("/homePage");
    }

    return res.render("Users/login");
  } catch (error) {
    console.log(error);
    res.redirect("/");
  }
}
export async function userSignUpLoad(req, res) {
  try {
    if (req.session.user) {
      return res.redirect("/homePage");
    }

    return res.render("Users/signUp");
  } catch (error) {
    console.log(error);
    res.redirect("/");
  }
}
export async function userForgotPasswordLoad(req, res) {
  try {
    return res.render("Users/emailVerification");
  } catch (error) {
    console.log(error);
    res.redirect("Users/login");
  }
}
export async function otpPageLoad(req, res) {
  try {
    if (!req.session.email) {
      return res.redirect("/login");
    }

    return res.render("Users/otpPage", {
      email: req.session.email,
    });
  } catch (error) {
    console.log(error);
    return res.redirect("/login");
  }
}

export const registerController = async (req, res) => {
  try {
    const result = await registerService(req.body);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const loginController = async (req, res) => {
  try {
    const result = await userLoginLogic(req, req.body.email, req.body.password);
    if (!result.success) {
      req.session.user = null;

      return res.status(401).json({
        success: false,
        message: result.message,
        field: result.field,
      });
    }

    return res.status(200).json({
      success: true,
      redirect: "/homePage",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const homeLoad = (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    return res.render("Users/homePage", {
      user: req.session.user,
    });
  } catch (err) {
    console.log(err);
    return res.redirect("/login");
  }
};

export async function verifyEmailController(req, res) {
  try {
    const { email } = req.body;

    if (!email || !email.includes("@")) {
      return res.status(400).send("Invalid email");
    }

    // store email in session
    req.session.email = email;

    // generate OTP ONCE
    await generateAndSendOtp(req, email);

    return res.json({success:true,redirect:"/otp"})
  } catch (error) {
    console.log(error);
    return res.redirect("/login");
  }
}







export async function resendOtpController(req, res) {
  try {
    const email = req.session.email;

    if (!email) {
      return res.status(400).send("Email not found in session");
    }

    
    if (req.session.otpExpires && Date.now() < req.session.otpExpires - 50000) {
      return res.status(429).send("Please wait before resending OTP");
    }

    await generateAndSendOtp(req, email);

    return res.json({success:true,redirect:"/reset-password"})
  } catch (error) {
    console.log(error);
    return res.status(500).send("Error resending OTP");
  }
}





export async function verifyOtpController(req, res) {
  try {
    const { otp } = req.body;

    if (!req.session.otp) {
      return res.status(400).send("OTP expired");
    }

    if (Date.now() > req.session.otpExpires) {
      return res.status(400).send("OTP expired");
    }

    if (Number(otp) !== req.session.otp) {
      return res.status(400).send("Invalid OTP");
    }

    // success
    req.session.otp = null;

    return res.json({success:true,redirect:"/reset-password"})
  } catch (error) {
    console.log(error);
    return res.status(500).send("Server error");
  }
}



export  async function resetPasswordLoad  (req, res)  {
  

  try {
    if (!req.session.email) {
      return res.redirect("/login");
    }

    res.render("Users/resetPassword");

  } catch (err) {
    console.log(err);
    res.redirect("/login");
  }
};



export const resetPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    const email = req.session.email;

    if (!email) {
      return res.json({ success: false, message: "Session expired" });
    }

    if (password !== confirmPassword) {
      return res.json({ success: false, message: "Passwords do not match" });
    }

    await resetPasswordService(email, password);

    req.session.email = null;

    return res.json({
      success: true,
      message: "Password updated successfully"
    });

  } catch (err) {
    console.log(err);
    return res.json({ success: false, message: "Server error" });
  }
};
