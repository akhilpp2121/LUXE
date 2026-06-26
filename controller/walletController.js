import { findUserByEmail } from "../service/userService.js"
import { walletTransaction } from "../service/walletService.js";
import { findUserBlocked } from "../service/userService.js";
export const walletPageLoad = async (req, res) => {
    try {

        const userId = req.session.user._id || req.session.user.id;


         const isBlockedUser = await findUserBlocked(userId);
    if (isBlockedUser) {
      req.session.user = null;
      req.session.flashMessage = { type: "error", message: "Your account has been blocked." };
      return res.redirect("/login");
    }

        const user = await findUserByEmail(req.session.user.email);
        const transaction = await walletTransaction(userId);
        const time= new Date().toDateString()

        if (!user || !transaction.success) {
            return res.render("Users/wallet", {
                isLogged: req.session.user || '',
                pageActive: "WALLET",
                balance: 0,
                transaction: [],
                time:time
            });
        }

        return res.render("Users/wallet", {
            isLogged: req.session.user || '',
            pageActive: "WALLET",
            balance: user.wallet.toFixed(2) || 0,
            transaction: transaction.data,
            time:time
        });

    } catch (error) {
        console.log(error);
        return res.redirect('/login');
    }
}