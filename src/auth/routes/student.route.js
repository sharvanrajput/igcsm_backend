import { Router } from "express"
import fs from "fs"
import path from "path"
import multer from "multer"
import { getStudentInfo, resendOtp, studentInfo, studentLogin, studentRegister, updateStudentInfo, verifyEmailOtp } from "../controllers/student.controller.js"
import { userAuth } from "../middleware/authMiddleware.js";

const studentSave = Router()

// ensure upload directory exists (docs)
const uploadDirDocs = path.join(process.cwd(), "public", "uploads", "docs");
fs.mkdirSync(uploadDirDocs, { recursive: true });

const storageDocs = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, uploadDirDocs);
	},
	filename: function (req, file, cb) {
		// use ISO date string without characters invalid in filenames
		const iso = new Date().toISOString().replace(/[:.]/g, "-");
		const ext = path.extname(file.originalname) || '';
		cb(null, `${iso}-${file.fieldname}${ext}`);
	}
});

const upload = multer({ storage: storageDocs });

studentSave.post("/register", studentRegister);
studentSave.post("/verify-email", verifyEmailOtp);
studentSave.post("/resend-otp", resendOtp);
studentSave.post("/login", studentLogin);

// accept file uploads for student-update
studentSave.patch("/student-update", userAuth, upload.fields([
	{ name: 'photo', maxCount: 1 },
	{ name: 'signature', maxCount: 1 },
	{ name: 'aadhaarDoc', maxCount: 1 },
	{ name: 'qualificationCert', maxCount: 1 },
]), updateStudentInfo)
studentSave.get("/get-student-data", getStudentInfo)

// studentSave.post("/student-update", userAuth, studentInfo)

export default studentSave