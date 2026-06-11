
import crypto from 'crypto';
import referalModel from "../model/referalModel.js";
import { userModel } from '../model/usermodel.js';
import { creditWallet } from "./walletService.js";

export const referalLinkFetch = async (userId) => {
    try {
        const data = await referalModel.findOne({ referrer: userId });

        if (!data) {
            return null;
        }

        return data;

    } catch (error) {
        console.log("referalLinkFetch error:", error);
        return null;
    }
};

export const generateReferalLink = async (userId) => {
    try {
        const existing = await referalModel.findOne({ referrer: userId });
        if (existing) {
            return {
                success: false,
                message: "Referral link already exists for this user"
            };
        }

        const token = crypto.randomBytes(16).toString("hex");

        const tokenExists = await referalModel.findOne({ token });
        if (tokenExists) {
            return {
                success: false,
                message: "Token collision, please try again"
            };
        }

        await referalModel.create({
            token,
            referrer: userId
        });

        return {
            success: true,
            token
        };

    } catch (error) {
        console.log("generateReferalLink error:", error);
        return {
            success: false,
            message: "Server error"
        };
    }
};



// export const applyReferralReward = async (newUser, refToken) => {
//   try {
//     if (!refToken) {
//       return;
//     }

//     let referrer = null;

//     // First try to find by referral token
//     const referalEntry = await referalModel.findOne({ token: refToken });
//     if (referalEntry) {
//       referrer = await userModel.findById(referalEntry.referrer);
//     } else {
//       // If not found, try to find by referral code directly
//       referrer = await userModel.findOne({ referalCode: refToken });
//     }

//     if (!referrer) {
//       console.log("Invalid referral token or code:", refToken);
//       return;
//     }

//     // Avoid self-referral
//     if (referrer._id.toString() === newUser._id.toString()) {
//       console.log("Self referral attempt blocked");
//       return;
//     }

//     const REFERRER_REWARD = 100;
//     const REFEREE_REWARD  = 50;

//     // Credit referrer wallet and create transaction history
//     await creditWallet(referrer._id, REFERRER_REWARD, `Referral bonus for inviting ${newUser.fullName}`);

//     // Credit new user (referee) wallet and create transaction history
//     await creditWallet(newUser._id, REFEREE_REWARD, `Referral sign-up bonus from ${referrer.fullName}`);

//     // Link new user to referrer in the user record
//     await userModel.findByIdAndUpdate(newUser._id, {
//       $set: { referredBy: referrer._id }
//     });

//     console.log(`Referral reward applied and wallet transactions created: referrer ${referrer.email} +${REFERRER_REWARD}, new user +${REFEREE_REWARD}`);

//   } catch (error) {
//     console.log("applyReferralReward error:", error);
//   }
// };



export const applyReferralReward = async (newUser, refToken) => {
  try {
    if (!refToken) return;

    const freshUser = await userModel.findById(newUser._id);
    if (freshUser.referredBy) {
      console.log("Referral already applied for this user");
      return;
    }

    let referrer = null;
    let referalEntry = await referalModel.findOne({ token: refToken, used: false });

    if (referalEntry) {
      referrer = await userModel.findById(referalEntry.referrer);
    } else {
      referrer = await userModel.findOne({ referalCode: refToken });
    }

    if (!referrer) {
      console.log("Invalid referral token or code:", refToken);
      return;
    }

    if (referrer._id.toString() === newUser._id.toString()) {
      console.log("Self referral attempt blocked");
      return;
    }

    const REFERRER_REWARD = 100;
    const REFEREE_REWARD = 50;

    const referrerCredit = await creditWallet(
      referrer._id, REFERRER_REWARD, `Referral bonus for inviting ${newUser.fullName}`
    );
    if (!referrerCredit.success) {
      console.log("Failed to credit referrer, aborting referral reward");
      return; 
    }

    const refereeCredit = await creditWallet(
      newUser._id, REFEREE_REWARD, `Referral sign-up bonus from ${referrer.fullName}`
    );
    if (!refereeCredit.success) {
      console.log("Referrer credited but referee credit failed — manual reconciliation needed");
      
    }

    await userModel.findByIdAndUpdate(newUser._id, { $set: { referredBy: referrer._id } });

    if (referalEntry) {
      referalEntry.used = true;
      await referalEntry.save();
    }

    console.log(`Referral reward applied: referrer ${referrer.email} +${REFERRER_REWARD}, new user +${REFEREE_REWARD}`);
  } catch (error) {
    console.log("applyReferralReward error:", error);
  }
};







  export const generateUserReferalCode = async (userId) => {
  try {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase(); 
 
    const codeExists = await userModel.findOne({ referalCode: code });
    if (codeExists) {
      return generateUserReferalCode(userId);
    }
 
    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { referalCode: code },
      { returnDocument: "after" }
    );
 
    return updatedUser;
  } catch (error) {
    console.log("generateUserReferalCode error:", error);
    return null;
  }
};
