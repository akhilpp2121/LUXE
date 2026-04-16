import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
const connect = async () => {
  try {
    console.log("connecting to DB>>>", process.env.MONGO_URI);

    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ Database connected");
  } catch (error) {
    console.log("❌ Database error FULL:", error);
  }
};

export default connect