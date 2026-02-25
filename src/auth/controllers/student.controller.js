import { Student } from "../models/student.model.js"
import { sendmail } from "../utils/nodemailer.js"

const options = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/"
}

export const studentRegister = async (req, res) => {
    try {
        const { email, password, mobile, studentName } = req.body;

        if (!email || !password || !mobile || !studentName) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        const existingUser = await Student.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User already exists",
            });
        }

        const user = await Student.create({
            email,
            password,
            mobile,
            studentName,
        });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        user.otp = otp;
        user.otpExpiry = Date.now() + 5 * 60 * 1000;
        await user.save();

        await sendmail({ email, otp });

        return res.status(201).json({
            success: true,
            message: "OTP sent to email",
            otp,
            user,
        });

    } catch (error) {
        console.log("Register Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Register error",
        });
    }
};


export const verifyEmailOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP required",
            });
        }

        const user = await Student.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // check otp
        if (user.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP",
            });
        }

        // check expiry
        if (Date.now() > user.otpExpiry) {
            return res.status(400).json({
                success: false,
                message: "OTP expired",
            });
        }

        // update verification
        user.isEmailVerified = true;
        user.otp = null;
        user.otpExpiry = null;

        await user.save();

        const token = user.generateAcccessToken();

        const options = {
            httpOnly: true,
            secure: false, // true in production (HTTPS)
            sameSite: "lax",

        };

        return res
            .status(200)
            .cookie("token", token, options)
            .json({
                success: true,
                message: "Email verified successfully ✅",
                token,
                user,
            });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "OTP verification error",
        });
    }
};


export const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await Student.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        user.otp = otp;
        user.otpExpiry = Date.now() + 5 * 60 * 1000;

        await user.save();

        await sendmail({ email, otp });

        res.status(200).json({
            success: true,
            message: "OTP resent successfully",
            otp
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Resend OTP error",
        });
    }
};

export const studentLogin = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email?.trim() || !password?.trim()) return res.status(400).json({ success: false, message: "All fields are required" })

        const user = await Student.findOne({ email })

        if (!user) return res.status(400).json({ success: false, message: "User not found" })

        const checkpassword = await user.isPasswordCorrect(password)
        if (!checkpassword) return res.status(400).json({ success: false, message: "Incrroct Password" })




        res.status(200).send({ success: true, user, message: "User Login Successfully" })

        const token = user.generateAcccessToken();


        return res.cookie("token", token, options).status(200).send({ success: true, message: "User Login successfully", user })


    } catch (error) {
        console.log(error.message)
        res.send({ status: 500, message: "student login error" })
    }
}

export const updateStudentInfo = async (req, res) => {
    try {
        const { id } = req.user;
        // Find the student and update fields, ensuring pre-save hooks run (e.g., password hashing)
        const student = await Student.findById(id);
        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        // Update scalar fields from req.body
        Object.entries(req.body || {}).forEach(([key, value]) => {
            // skip empty values
            if (value === undefined) return;
            student[key] = value;
        });

        // Handle uploaded files (multer places them on req.files)
        if (req.files) {
            // files are arrays for each field and are now saved under /uploads/docs
            if (req.files.photo && req.files.photo[0]) {
                student.photo = `/uploads/docs/${req.files.photo[0].filename}`;
            }
            if (req.files.signature && req.files.signature[0]) {
                student.signature = `/uploads/docs/${req.files.signature[0].filename}`;
            }
            if (req.files.aadhaarDoc && req.files.aadhaarDoc[0]) {
                student.aadhaarDoc = `/uploads/docs/${req.files.aadhaarDoc[0].filename}`;
            }
            if (req.files.qualificationCert && req.files.qualificationCert[0]) {
                student.qualificationCert = `/uploads/docs/${req.files.qualificationCert[0].filename}`;
            }
        }

        await student.save();

        return res.status(200).json({ success: true, message: "Student updated successfully", data: student });


    } catch (error) {
        console.error("Get students error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failet to update student",
        });
    }
}

export const studentInfo = async (req, res) => {
    try {
        const data = req.body
        const createdStudent = await Student.create(data)
        res.send({ status: 201, success: true, message: "student saved successfully", createdStudent })
    } catch (error) {
        console.log(error.message)
        res.send({ status: 500, message: "student save error" })
    }
}

export const getStudentInfo = async (req, res) => {
    try {
        const data = await Student.find();
        console.log(data)
        return res.send({
            status: 200,
            success: true,
            message: "Students fetched successfully",
            data,
        })
    } catch (error) {
        console.error("Get students error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch students",
        });
    }
};


