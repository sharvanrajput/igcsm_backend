import mongoose from "mongoose";

const studentSubmissionSchema = new mongoose.Schema(
  {
    // contact & identity fields
    email: { type: String, required: true, lowercase: true, trim: true },
    mobile: { type: String, required: true },
    studentName: { type: String, required: true, trim: true },

    // profile fields (mirror of Student for easy copy)
    instituteName: { type: String, trim: true },
    course: { type: String, default: "" },
    duration: { type: String, default: null },
    fatherName: { type: String, trim: true },
    motherName: { type: String, trim: true },
    gender: { type: String, enum: ["male", "female", "other"] },
    dob: { type: Date },
    alternateMobile: { type: String },
    aadhaar: { type: String },
    address: { type: String },
    district: { type: String },
    state: { type: String, default: "India" },
    country: { type: String, default: "India" },
    pin: { type: String },
    qualification: { type: String, default: "" },
    acceptTerms: { type: Boolean },

    // uploaded file paths
    photo: { type: String, default: null },
    signature: { type: String, default: null },
    aadhaarDoc: { type: String, default: null },
    qualificationCert: { type: String, default: null },

    // OTP & verification
    otp: { type: String, default: null },
    otpExpiry: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const StudentSubmission = mongoose.model("StudentSubmission", studentSubmissionSchema);
