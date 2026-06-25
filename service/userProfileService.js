import { userModel } from "../model/usermodel.js";
import path from "path";
import fs from "fs";
import { addressModel } from "../model/addressModel.js";


export const addressFetcher = (userId=>addressModel.find({userId}))

export const addressIdFetcher = (_id=>addressModel.find({_id}))


const deleteOldAvatar = (avatarPath) => {
  if (!avatarPath || avatarPath.includes("default-avatar")) return;
  const filePath = path.join(process.cwd(), "public", avatarPath.replace(/^\//, ""));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
};

export const getUserProfileService = async (userId) => {
  if (!userId) return null;
  return await userModel.findById(userId);
};






export const updateProfileService = async (req) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) return { success: false, message: "Not authenticated" };

    const user = await userModel.findById(userId);
    if (!user) return { success: false, message: "User not found" };

    const { fullName, phoneNumber } = req.body;

    let nameChanged = false;
    let phoneChanged = false;

    //  Name validation
    if (!fullName || fullName.trim().length < 3) {
      return { success: false, message: "Full name must be at least 3 characters" };
    }

    if (user.fullName !== fullName.trim()) {
      user.fullName = fullName.trim();
      nameChanged = true;
    }

    //  Phone validation
    if (phoneNumber && phoneNumber.trim()) {
      const cleaned = phoneNumber.trim();

      if (!/^\+?[0-9]{10,15}$/.test(cleaned.replace(/[\s\-()]/g, ""))) {
        return { success: false, message: "Enter a valid phone number" };
      }

      const phoneExists = await userModel.findOne({
        phoneNumber: cleaned,
        _id: { $ne: userId },
      });

      if (phoneExists) {
        return { success: false, message: "Phone number already in use" };
      }

      if (user.phoneNumber !== cleaned) {
        user.phoneNumber = cleaned;
        phoneChanged = true;
      }
    }

    await user.save();

    
    let message = "Profile updated successfully";

    if (nameChanged && phoneChanged) {
      message = "Name and phone number updated successfully";
    } else if (nameChanged) {
      message = "Name updated successfully";
    } else if (phoneChanged) {
      message = "Phone number updated successfully";
    } else {
      message = "No changes made";
    }

    return {
      success: true,
      message, 
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      avatar: user.avatar,
    };

  } catch (error) {
    console.error("updateProfileService error:", error);
    return { success: false, message: "Server error" };
  }
};


export const uploadAvatarService = async (userId, file, currentAvatar) => {
  try {
    deleteOldAvatar(currentAvatar);
    const newAvatarPath = "/uploads/avatars/" + file.filename;
    const user = await userModel.findByIdAndUpdate(
      userId,
      { avatar: newAvatarPath },
      {  returnDocument: "after"}
    );
    return { success: true, avatar: user.avatar,message: "Profile image updated successfully" };
  } catch (error) {
    console.error("uploadAvatarService error:", error);
    return { success: false, message: "Server error" };
  }
};

export const deleteAvatarService = async (userId, currentAvatar) => {
  try {
    deleteOldAvatar(currentAvatar);
    await userModel.findByIdAndUpdate(userId, { avatar: "" });
    return { success: true, message: "image deleted successfully" };

  } catch (error) {
    console.error("deleteAvatarService error:", error);
    return { success: false, message: "Server error" };
  }
};

export const getAllAddressesService = async (userId) => {
  const addresses = await addressModel.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
  return addresses;
};

export const addAddressService = async (userId, addressData) => {
  const { fullName, phoneNumber, houseNumber, streetName, landmark, city, state, pincode, country, isDefault } = addressData;

  if (!fullName || !phoneNumber || !houseNumber || !streetName || !city || !state || !pincode || !country) {
    const error = new Error('All required fields must be provided.');
    error.statusCode = 400;
    throw error;
  }

  const phoneDigits = phoneNumber.replace(/\D/g, '');
  if (phoneDigits.length !== 10) {
    const error = new Error('Phone number must be exactly 10 digits.');
    error.statusCode = 400;
    throw error;
  }

  if (!/^\d{6}$/.test(pincode)) {
    const error = new Error('Pincode must be exactly 6 digits.');
    error.statusCode = 400;
    throw error;
  }

  if (isDefault) {
    await addressModel.updateMany({ userId }, { isDefault: false });
  }

  const newAddress = await addressModel.create({
    userId, fullName, phoneNumber: phoneDigits, houseNumber, streetName,
    landmark: landmark || '', city, state, pincode, country,
    isDefault: isDefault ?? false,
  });

  return newAddress;
};

export const editAddressService = async (userId, addressId, addressData) => {
  const { fullName, phoneNumber, houseNumber, streetName, landmark, city, state, pincode, country, isDefault } = addressData;

  // Empty field check
  if (!fullName || !phoneNumber || !houseNumber || !streetName || !city || !state || !pincode || !country) {
    const error = new Error('All required fields must be provided.');
    error.statusCode = 400;
    throw error;
  }

  // Phone: exactly 10 digits
  const phoneDigits = phoneNumber.replace(/\D/g, '');

if (phoneDigits.length !== 10) {
  throw new Error('Phone number must be exactly 10 digits.');
}

if (/^(\d)\1{9}$/.test(phoneDigits)) {
  throw new Error('Invalid phone number.');
}


  // Pincode: exactly 6 digits
  if (!/^\d{6}$/.test(pincode)) {
    const error = new Error('Pincode must be exactly 6 digits.');
    error.statusCode = 400;
    throw error;
  }

  const existing = await addressModel.findOne({ _id: addressId, userId });
  if (!existing) {
    const error = new Error('Address not found.');
    error.statusCode = 404;
    throw error;
  }

  if (isDefault) {
    await addressModel.updateMany({ userId }, { isDefault: false });
  }

  const updated = await addressModel.findByIdAndUpdate(
    addressId,
    { fullName, phoneNumber: phoneDigits, houseNumber, streetName, landmark: landmark || '', city, state, pincode, country, isDefault: isDefault ?? existing.isDefault },
    { returnDocument: 'after' }
  );

  return updated;
};


export const deleteAddressService = async (userId, addressId) => {
  const existing = await addressModel.findOne({ _id: addressId, userId });
  if (!existing) {
    const error = new Error('Address not found.');
    error.statusCode = 404;
    throw error;
  }

  await addressModel.findByIdAndDelete(addressId); 

  if (existing.isDefault) {
    const nextAddress = await addressModel.findOne({ userId }).sort({ createdAt: -1 });
    if (nextAddress) {
      nextAddress.isDefault = true;
      await nextAddress.save();
    }
  }

  return { deletedId: addressId, wasDefault: existing.isDefault };
};

export const setDefaultAddressService = async (userId, addressId) => {
  const existing = await addressModel.findOne({ _id: addressId, userId });
  if (!existing) {
    const error = new Error('Address not found.');
    error.statusCode = 404;
    throw error;
  }

  if (existing.isDefault) return existing;

  await addressModel.updateMany(
    { userId, _id: { $ne: addressId } }, 
    { $set: { isDefault: false } }
  );

  existing.isDefault = true;
  await existing.save();

  return existing;
};