import { Router } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { sendOtp, resendSubmissionOtp, verifySubmissionOtp, finalizeSubmission } from "../controllers/studentSubmission.controller.js";

const studentSubmit = Router();

// ensure upload directory exists
const uploadDirDocs = path.join(process.cwd(), "public", "uploads", "docs");
fs.mkdirSync(uploadDirDocs, { recursive: true });

const storageDocs = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDirDocs);
  },
  filename: function (req, file, cb) {
    const iso = new Date().toISOString().replace(/[:.]/g, "-");
    const ext = path.extname(file.originalname) || '';
    cb(null, `${iso}-${file.fieldname}${ext}`);
  }
});

const upload = multer({ storage: storageDocs });

// Step 1: Send OTP (no files)
studentSubmit.post("/send-otp", sendOtp);

// Step 2: Verify OTP (no files)
studentSubmit.post("/verify-otp", verifySubmissionOtp);

// Step 3: Finalize with files (after OTP is verified)
studentSubmit.post(
  "/finalize",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "signature", maxCount: 1 },
    { name: "aadhaarDoc", maxCount: 1 },
    { name: "qualificationCert", maxCount: 1 },
  ]),
  finalizeSubmission
);

// Legacy: Resend OTP
studentSubmit.post("/resend-otp", resendSubmissionOtp);

export default studentSubmit;
