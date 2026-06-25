
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


const generateCode = (length) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bytes = crypto.randomBytes(length);
    return Array.from(bytes, byte => chars[byte % chars.length]).join('');
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

        const CODE_LENGTH = 6; // Change to any value between 5–7
        const MAX_RETRIES = 5;

        let token;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            const candidate = generateCode(CODE_LENGTH);
            const tokenExists = await referalModel.findOne({ token: candidate });
            if (!tokenExists) {
                token = candidate;
                break;
            }
        }

        if (!token) {
            return {
                success: false,
                message: "Could not generate a unique code, please try again"
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
