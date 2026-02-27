import { StudentSubmission } from "../models/studentSubmission.model.js";
import { Auth } from "../models/auth.model.js";
import { Student } from "../models/student.model.js";
import { sendmail } from "../utils/nodemailer.js";

const OTP_VALID_MS = 2 * 60 * 1000; // 2 minutes

// Step 1: Send OTP for email verification (minimal data only, no files)
export const sendOtp = async (req, res) => {
  try {
    let { email, mobile, studentName } = req.body;
    
    // Handle array values (take first element if it's an array)
    email = Array.isArray(email) ? email[0] : email;
    mobile = Array.isArray(mobile) ? mobile[0] : mobile;
    studentName = Array.isArray(studentName) ? studentName[0] : studentName;

    if (!email || !mobile || !studentName) {
      return res.status(400).json({ success: false, message: "email, mobile and studentName are required" });
    }

    // create submission with minimal data only
    const submissionData = { email, mobile, studentName };
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    submissionData.otp = otp;
    submissionData.otpExpiry = Date.now() + OTP_VALID_MS;
    submissionData.isVerified = false;

    const created = await StudentSubmission.create(submissionData);

    // send OTP to email
    await sendmail({ email, otp });

    return res.status(201).json({ success: true, message: "OTP sent to your email. Please verify to continue.", submissionId: created._id });
  } catch (error) {
    console.error("sendOtp error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};

export const resendSubmissionOtp = async (req, res) => {
  try {
    const { submissionId, email } = req.body;
    if (!submissionId || !email) return res.status(400).json({ success: false, message: "submissionId and email required" });

    const sub = await StudentSubmission.findOne({ _id: submissionId, email });
    if (!sub) return res.status(404).json({ success: false, message: "Submission not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    sub.otp = otp;
    sub.otpExpiry = Date.now() + OTP_VALID_MS;
    await sub.save();

    await sendmail({ email, otp });
    return res.status(200).json({ success: true, message: "OTP resent", otp });
  } catch (error) {
    console.error("resendSubmissionOtp error:", error.message);
    return res.status(500).json({ success: false, message: "Resend OTP error" });
  }
};

// Step 3: Finalize submission after OTP is verified (with files and complete data)
export const finalizeSubmission = async (req, res) => {
  try {
    const { submissionId, email } = req.body;
    if (!submissionId || !email) return res.status(400).json({ success: false, message: "submissionId and email required" });

    const sub = await StudentSubmission.findOne({ _id: submissionId, email });
    if (!sub) return res.status(404).json({ success: false, message: "Submission not found" });
    if (!sub.isVerified) return res.status(400).json({ success: false, message: "Email not verified yet" });

    // update submission with remaining form data
    Object.entries(req.body || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      // Skip sensitive keys
      if (["submissionId"].includes(key)) return;
      
      // Handle array values (take first element if it's an array)
      let finalValue = Array.isArray(value) ? value[0] : value;
      if (finalValue === "" || finalValue === undefined || finalValue === null) return;

      // Map form field names to model field names
      if (key === "aadhaarNo") {
        sub.aadhaar = finalValue;
      } else if (key === "educationalQualification") {
        sub.qualification = finalValue;
      } else if (key === "altMobile") {
        sub.alternateMobile = finalValue;
      } else {
        sub[key] = finalValue;
      }
    });

    // handle file uploads (save paths)
    if (req.files) {
      if (req.files.photo && req.files.photo[0]) sub.photo = `/uploads/docs/${req.files.photo[0].filename}`;
      if (req.files.signature && req.files.signature[0]) sub.signature = `/uploads/docs/${req.files.signature[0].filename}`;
      if (req.files.aadhaarDoc && req.files.aadhaarDoc[0]) sub.aadhaarDoc = `/uploads/docs/${req.files.aadhaarDoc[0].filename}`;
      if (req.files.qualificationCert && req.files.qualificationCert[0]) sub.qualificationCert = `/uploads/docs/${req.files.qualificationCert[0].filename}`;
    }

    await sub.save();

    // ensure Auth exists or create one
    let auth = await Auth.findOne({ email });
    if (!auth) {
      const randomPassword = Math.random().toString(36).slice(-8) + "A1";
      auth = await Auth.create({
        email,
        password: randomPassword,
        mobile: sub.mobile,
        studentName: sub.studentName,
        isEmailVerified: true,
      });
    } else {
      auth.isEmailVerified = true;
      if (sub.mobile) auth.mobile = sub.mobile;
      if (sub.studentName) auth.studentName = sub.studentName;
      await auth.save();
    }

    // create or update Student linked to auth
    let student = await Student.findOne({ auth: auth._id });
    const studentData = {
      auth: auth._id,
      instituteName: sub.instituteName,
      course: sub.course,
      duration: sub.duration,
      fatherName: sub.fatherName,
      motherName: sub.motherName,
      gender: sub.gender,
      dob: sub.dob,
      alternateMobile: sub.alternateMobile,
      aadhaar: sub.aadhaar,
      address: sub.address,
      district: sub.district,
      state: sub.state,
      country: sub.country,
      pin: sub.pin,
      qualification: sub.qualification,
      acceptTerms: sub.acceptTerms,
      photo: sub.photo,
      signature: sub.signature,
      aadhaarDoc: sub.aadhaarDoc,
      qualificationCert: sub.qualificationCert,
    };

    if (student) {
      Object.assign(student, studentData);
      await student.save();
    } else {
      student = await Student.create(studentData);
    }

    // delete the temporary submission
    await StudentSubmission.deleteOne({ _id: sub._id });

    // issue token and return merged user
    const token = auth.generateAcccessToken();
    const user = { ...auth.toObject(), ...student.toObject() };

    return res
      .cookie("token", token, { httpOnly: true, secure: false, sameSite: "lax" })
      .status(200)
      .json({ success: true, message: "Registration completed successfully! Welcome!", token, user });
  } catch (error) {
    console.error("finalizeSubmission error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to finalize submission" });
  }
};

export const verifySubmissionOtp = async (req, res) => {
  try {
    const { submissionId, email, otp } = req.body;
    if (!submissionId || !email || !otp) return res.status(400).json({ success: false, message: "submissionId, email and otp required" });

    const sub = await StudentSubmission.findOne({ _id: submissionId, email });
    if (!sub) return res.status(404).json({ success: false, message: "Submission not found" });

    if (sub.otp !== otp) return res.status(400).json({ success: false, message: "Invalid OTP" });
    if (Date.now() > sub.otpExpiry) return res.status(400).json({ success: false, message: "OTP expired" });

    // mark verified only (do not create Auth/Student yet)
    sub.isVerified = true;
    await sub.save();

    return res.status(200).json({ success: true, message: "Email verified successfully. Please complete your registration." });
  } catch (error) {
    console.error("verifySubmissionOtp error:", error.message);
    return res.status(500).json({ success: false, message: "OTP verification error" });
  }
};
