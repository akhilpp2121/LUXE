import walletModel from "../model/walletModel.js"
import { userModel } from "../model/usermodel.js"

export const walletTransaction=async(userId)=>{

    try {

        const transaction= await walletModel.find({userId}).sort({createdAt:-1})

        if (!transaction.length) {
    return { success: false, message: "No transactions found" }
}
        return{success:true,data:transaction}
        
    } catch (error) {
        console.log(error);
            return { success: false, message: "Server error" }; 

        
        
    }

}


export const creditWallet = async (userId, amount, reason, orderId = null) => {
  try {
    await userModel.findByIdAndUpdate(userId, { $inc: { wallet: amount } });
    await walletModel.create({
      userId, amount, orderId,
      type: "credit",
      reason,
      status: "completed"
    });
    return { success: true };
  } catch (e) {
    console.error("creditWallet error:", e);
    return { success: false };
  }
};

export const debitWallet = async (userId, amount, reason, orderId = null) => {
  try {
    const user = await userModel.findById(userId);
    if (!user || user.wallet < amount) {
      return { success: false, message: "Insufficient wallet balance" };
    }
    await userModel.findByIdAndUpdate(userId, { $inc: { wallet: -amount } });
    await walletModel.create({
      userId, amount, orderId,
      type: "debit",
      reason,
      status: "completed"
    });
    return { success: true };
  } catch (e) {
    console.error("debitWallet error:", e);
    return { success: false };
  }
};

export const walletBalanceCheck = async (userId) => {
    const user = await userModel.findById(userId).select("wallet");
    return user?.wallet || 0;
    
};