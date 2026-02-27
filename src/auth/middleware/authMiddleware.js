import jwt from "jsonwebtoken";
import { Student } from "../models/student.model.js";
import { Auth } from "../models/auth.model.js";

export const userAuth = async (req, res, next) => {
    try {
        const { token } = req.cookies;
        if (!token) {
            return res.status(401).json({ success: false, message: "Unauthorized request" });
        }

        const decode = jwt.verify(token, process.env.ACCESS_TOKEN_SECREAT);

        // find auth record first
        const auth = await Auth.findById(decode.id).select("-password");
        if (!auth) {
            return res.status(401).json({ success: false, message: "Invalid access token" });
        }

        // try loading associated student profile
        const student = await Student.findOne({ auth: auth._id });
        // merge auth + student so that client sees all fields; student fields override if any overlap
        req.user = student ? { ...auth.toObject(), ...student.toObject() } : auth;

        next();

    } catch (error) {
        return res.status(500).send({ success: false, message: `Internal Server Error: ${error.message}` });
    }
};