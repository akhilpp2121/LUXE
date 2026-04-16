import mongoose from "mongoose";
import { registerService, userLoginLogic } from "../service/userService.js";

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

    if (!email) {
      return res.send("Invalid Email");
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    // save in session
    req.session.email = email;
    req.session.otp = otp;
    req.session.otpExpires = Date.now() + 5 * 60 * 1000; // 5 min

    // send email
    await sendOtpEmail(email, otp);

    req.session.save(() => {
      res.redirect("/otp");
    });
  } catch (error) {
    console.log(error);
  }
}
