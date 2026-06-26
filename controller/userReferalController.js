import { generateReferalLink, referalLinkFetch } from "../service/referalService.js";
import { findUserByEmail } from "../service/userService.js";
import { getCartCount } from "../service/cartService.js";
import { userModel } from "../model/usermodel.js";
import { generateUserReferalCode } from "../service/referalService.js";


export const referalPageLoad = async (req, res) => {
  try {
    const userId = req.session.user._id || req.session.user.id;


    
    
             const isBlockedUser = await findUserBlocked(userId);
        if (isBlockedUser) {
          req.session.user = null;
          req.session.flashMessage = { type: "error", message: "Your account has been blocked." };
          return res.redirect("/login");
        }
    

    let user = await userModel.findById(userId);

    if (!user.referalCode) {
      user = await generateUserReferalCode(userId);
    }

    let referaLink = await referalLinkFetch(userId);
    if (!referaLink) {
      await generateReferalLink(userId);
      referaLink = await referalLinkFetch(userId);
    }

    const cart = await getCartCount(userId);

    return res.render('Users/referalPage', {
      isLogged:     req.session.user || '',
      name:         user.fullName,
      email:        user.email,
      mobile:       user.phoneNumber || '',
      pageActive:   "LINK",
      link:         referaLink ? referaLink.token : null,
      referralCode: user.referalCode,
      balance:      user.wallet ? user.wallet.toFixed(2) : 0,
      cart:         cart.count || 0
    });

  } catch (error) {
    console.log("referalPageLoad error:", error);
    return res.status(500).redirect('/login');
  }
};
export const referalLinkGenerator = async (req, res) => {
    try {
        const userId = req.session.user._id || req.session.user.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorised" });
        }

        const result = await generateReferalLink(userId);
        return res.status(result.success ? 200 : 400).json(result);

    } catch (error) {
        console.log("referalLinkGenerator error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};