import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const authSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            unique: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
            trim: true,
        },
        mobile: {
            type: String,
            required: true,
        },
        studentName: {
            type: String,
            required: true,
            trim: true,
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        otpExpiry: {
            type: Number,
            default: 0,
        },
        otp: {
            type: String,
            default: 0,
        },
        role: {
            type: String,
            enum: ["student", "admin"],
            default: "student",
        },
    },
    {
        timestamps: true,
    }
);

// hash password before saving
authSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
});

// compare plain/text password with stored hash
authSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// generate JWT token using auth document id
authSchema.methods.generateAcccessToken = function () {
    return jwt.sign({ id: this._id }, process.env.ACCESS_TOKEN_SECREAT, { expiresIn: "1d" });
};

export const Auth = mongoose.model("Auth", authSchema);
