import jwt from "jsonwebtoken";
import { Student } from "../models/student.model.js";

export const userAuth = async (req, res, next) => {
    try {
        console.log("getting token or not")
        const { token } = req.cookies
        if (!token) {
            return res.status(401).json({ success: false, message: "Unauthorized request" });
        }

        const decode = jwt.verify(token, process.env.ACCESS_TOKEN_SECREAT)

        const user = await Student.findById(decode.id).select("-password")

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid access token" });
        }
        
        req.user = user;

        next();

    } catch (error) {
        return res.status(500).send({ success: false, message: `Internal Server Error: ${error.message}` });
    }
};