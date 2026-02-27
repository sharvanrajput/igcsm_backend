import mongoose from "mongoose";



const studentSchema = new mongoose.Schema(
    {
        // reference to authentication document
        auth: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Auth",
            required: true,
        },

        instituteName: {
            type: String,
            // required: true,
            trim: true,
        },

        course: {
            type: String,
            default: "",
        },

        duration: {
            type: String,
            enum: ["Certification", "Diploma", "Advance Diploma", "P. G. Diploma Course", "Certificate", "Crash Course"],
            default: null,
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
    },
    {
        timestamps: true,
    }
);






export const Student = mongoose.model("Student", studentSchema);