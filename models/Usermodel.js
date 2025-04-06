import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true }, // ✅ Fixed name field
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
  },
  password: {
    type: String, // ✅ Fixed password field
    required: [true, "Password is required"],
    minlength: [8, "Password must be at least 8 characters long"],
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[1-9]\d{6,14}$/, "Invalid phone number format"],
  },
  department: { type: String },
  campus: { type: String },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
});

const User = mongoose.model("User", userSchema);

export default User;
