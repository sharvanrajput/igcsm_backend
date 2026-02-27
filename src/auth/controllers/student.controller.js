import { Student } from "../models/student.model.js"
import { Auth } from "../models/auth.model.js"
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

        const existingAuth = await Auth.findOne({ email });
        if (existingAuth) {
            return res.status(400).json({
                success: false,
                message: "User already exists",
            });
        }

        // create authentication record first
        const auth = await Auth.create({
            email,
            password,
            mobile,
            studentName,
        });

        // create an empty student profile linked to auth
        await Student.create({ auth: auth._id });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        auth.otp = otp;
        // OTP valid for 2 minutes
        auth.otpExpiry = Date.now() + 2 * 60 * 1000;
        await auth.save();

        await sendmail({ email, otp });

        // return auth fields (client previously relied on these)
        return res.status(201).json({
            success: true,
            message: "OTP sent to email",
            otp,
            user: auth,
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

        const auth = await Auth.findOne({ email });

        if (!auth) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // check otp
        if (auth.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP",
            });
        }

        // check expiry
        if (Date.now() > auth.otpExpiry) {
            return res.status(400).json({
                success: false,
                message: "OTP expired",
            });
        }

        // update verification
        auth.isEmailVerified = true;
        auth.otp = null;
        auth.otpExpiry = null;

        await auth.save();

        const token = auth.generateAcccessToken();

        const options = {
            httpOnly: true,
            secure: false, // true in production (HTTPS)
            sameSite: "lax",

        };

        // fetch linked student profile (if any) so we can merge data
        const student = await Student.findOne({ auth: auth._id });
        const user = student ? { ...auth.toObject(), ...student.toObject() } : auth;

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

        const auth = await Auth.findOne({ email });

        if (!auth) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        auth.otp = otp;
        // Resent OTP valid for 2 minutes
        auth.otpExpiry = Date.now() + 2 * 60 * 1000;

        await auth.save();

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

        if (!email?.trim() || !password?.trim())
            return res.status(400).json({ success: false, message: "All fields are required" })

        const auth = await Auth.findOne({ email })

        if (!auth)
            return res.status(400).json({ success: false, message: "User not found" })

        const checkpassword = await auth.isPasswordCorrect(password)
        if (!checkpassword)
            return res.status(400).json({ success: false, message: "Incorrect Password" })

        const token = auth.generateAcccessToken();
        // set cookie and return user
        const student = await Student.findOne({ auth: auth._id });
        const user = student ? { ...auth.toObject(), ...student.toObject() } : auth;
        return res
            .cookie("token", token, options)
            .status(200)
            .json({ success: true, message: "User Login successfully", user });

    } catch (error) {
        console.log(error.message)
        res.status(500).json({ success: false, message: "student login error" })
    }
}






export const updateStudentInfo = async (req, res) => {
    try {
        // pull student _id (not auth id) from attached user object
        const studentId = req.user?._id || req.user?.id || null;
        // Find the student and update fields
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        // keep track of auth fields that might be present
        const authUpdates = {};
        ["email", "password", "mobile", "studentName"].forEach((field) => {
            if (req.body && req.body[field] !== undefined) {
                authUpdates[field] = req.body[field];
            }
        }); 

        // Update scalar fields on student profile from req.body
        Object.entries(req.body || {}).forEach(([key, value]) => {
            // skip undefined values and auth-related properties
            if (value === undefined) return;
            if (["email", "password", "mobile", "studentName"].includes(key)) return;
            // Do not set empty strings (prevents enum/validation errors)
            if (typeof value === 'string' && value.trim() === '') return;
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

        // if auth-related values were provided, update the Auth document too
        if (Object.keys(authUpdates).length > 0) {
            const auth = await Auth.findById(student.auth);
            if (auth) {
                Object.entries(authUpdates).forEach(([k, v]) => {
                    auth[k] = v;
                });
                await auth.save();
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

// return currently authenticated user
export const Me = (req, res) => {
    try {
        // userAuth middleware already attached user to req
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }
        return res.status(200).json({ success: true, user: req.user });
    } catch (error) {
        console.error("getMe error", error.message);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};


