import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/Usermodel.js";
import nodemailer from "nodemailer";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Register Route
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!password || password.length < 8) {
      return res
        .status(402)
        .json({ error: "Password must be at least 8 characters long" });
    }
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) return res.status(409).json({ error: "User already exists" });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user to DB
    user = new User({ name, email, password: hashedPassword });
    await user.save();

    // Create JWT token
    // eslint-disable-next-line no-undef
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({
      token,
      user,
      message: "Registration successful, you can login now!",
    });
  } catch (err) {
    res.status(500).json({ msg: "Something went rong!" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Check if the password is correct
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Create a JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      // eslint-disable-next-line no-undef
      process.env.JWT_SECRET, // Make sure to set this in your .env file
      { expiresIn: "1h" } // The token will expire in 1 hour
    );

    // Send the token and user data
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Protected route to get the user's profile
router.get("/profile", verifyToken, async (req, res) => {
  try {
    // Access the user info from the `req.user` object (added by the middleware)
    const user = await User.findById(req.user.userId); // Assuming you attached userId in the JWT

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send user profile data
    res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        password: user?.password,
        campus: user?.campus,
        phone: user?.phone,
        department: user?.department,
      },
    });
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Backend Example (Express.js)

router.put("/updateProfile", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId; // Get user ID from decoded token
    const { name, email, phone, password, department, campus } = req.body;

    // // Find user and update their profile
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, email, department, password, campus, phone },
      { new: true } // Ensure the updated user is returned
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // // Send updated user info back
    res.json({ user: req.body });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user information" });
  }
});

router.get("/search", async (req, res) => {
  const { category, query } = req.query;
  const page = parseInt(req.query.page) || 1; // Default to page 1
  const limit = parseInt(req.query.limit) || 10; // Default to 10 results per page

  try {
    let results;
    let totalCount;

    if (category === "department") {
      // Search by department
      results = await User.find({
        department: { $regex: query, $options: "i" },
      })
        .skip((page - 1) * limit) // Skip results for previous pages
        .limit(limit); // Limit the number of results per page
      totalCount = await User.countDocuments({
        department: { $regex: query, $options: "i" },
      });
    } else if (category === "campus") {
      // Search by campus
      results = await User.find({
        campus: { $regex: query, $options: "i" },
      })
        .skip((page - 1) * limit) // Skip results for previous pages
        .limit(limit); // Limit the number of results per page
      totalCount = await User.countDocuments({
        campus: { $regex: query, $options: "i" },
      });
    }

    const totalPages = Math.ceil(totalCount / limit); // Calculate total pages

    // Send results and pagination info
    res.json({
      results,
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send("Error fetching data");
  }
});

router.post("/forgot-password", (req, res) => {
  const { email } = req.body;
  User.findOne({ email: email }).then((user) => {
    if (!user) {
      return res.send({ Status: "User not existed" });
    }
    const token = jwt.sign({ id: user._id }, "jwt_secret_key", {
      expiresIn: "1d",
    });
    var transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "esayasaregawi29@gmail.com",
        pass: "gtcbufvmpnktybyk",
      },
    });

    var mailOptions = {
      from: "esayasaregawi29@gmail.com",
      to: user.email,
      subject: "Reset Password Link",
      text: `http://localhost:5173/reset-password/${user._id}/${token}`,
    };

    // eslint-disable-next-line no-unused-vars
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        return res.send({ Status: "Success" });
      }
    });
  });
});
// Reset password route
router.post("/reset-password/:id/:token", (req, res) => {
  const { id, token } = req.params;
  const { password } = req.body;
  // eslint-disable-next-line no-unused-vars
  jwt.verify(token, "jwt_secret_key", (err, decoded) => {
    if (err) {
      return res.json({ Status: "Error with token" });
    } else {
      bcrypt
        .hash(password, 10)
        .then((hash) => {
          User.findByIdAndUpdate({ _id: id }, { password: hash })
            .then((u) => res.send({ Status: "Success" }))
            .catch((err) => res.send({ Status: err }));
        })
        .catch((err) => res.send({ Status: err }));
    }
  });
});
export default router;
