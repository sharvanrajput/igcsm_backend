import mongoose from "mongoose";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"



const studentSchema = new mongoose.Schema(
    
    {
        instituteName: {
            type: String,
            // required: true,
            trim: true,
        },

        course: {
            type: String,
            default: "",
        },

        studentName: {
            type: String,
            required: true,
            trim: true,
        },

        fatherName: {
            type: String,
            // required: true,
            trim: true,
        },

        motherName: {
            type: String,
            // required: true,
            trim: true,
        },

        gender: {
            type: String,
            enum: ["male", "female", "other"],
            // required: true,
        },

        dob: {
            type: Date,
            // required: true,
        },

        email: {
            type: String,
            // required: true,
            lowercase: true,
            unique: true,
            trim: true,
        },
        isEmailVerified: {
            type: Boolean,
            default: false
        },
        otpExpiry: {
            type: Number,
            default: 0
        },
        otp: {
            type: String,
            default: 0
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
        alternateMobile: {
            type: String,
        },
        aadhaar: {
            type: String,
        },
        address: {
            type: String,
        },
        district: {
            type: String,
        },
        state: {
            type: String,
        },
        country: {
            type: String,
            default: "India",
        },
        pin: {
            type: String,
        },
        qualification: {
            type: String,
            default: "",
        },
        acceptTerms: {
            type: Boolean,
        },
        photo: {
            type: String,
            default: null,
        },
        signature: {
            type: String,
            default: null,
        },
        aadhaarDoc: {
            type: String,
            default: null,
        },
        qualificationCert: {
            type: String,
            default: null,
        },
        role:{
            type:String,
            enum:["student","admin"],
            default:"student"
        }
    },
    {
        timestamps: true,
    }
);


studentSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});
studentSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

studentSchema.methods.generateAcccessToken = function () {
    return jwt.sign({ id: this._id }, process.env.ACCESS_TOKEN_SECREAT, { expiresIn: "1d" })
}




export const Student = mongoose.model("Student", studentSchema);