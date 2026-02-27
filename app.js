import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import studentRoutes from "./src/auth/routes/student.route.js"

import { Auth } from "./src/auth/models/auth.model.js";
import { Student } from "./src/auth/models/student.model.js";
import { connectDb } from "./src/auth/config/db.js"
import cookieParser from "cookie-parser";
import studentSubmit from "./src/auth/routes/studentSubmission.route.js";

dotenv.config()
const port = process.env.PORT
const app = express()

app.use(
    cors({
        origin: [`${process.env.FRONTEND_URL}`, `${process.env.FRONTEND_URL1}`],
        // origin: "*",
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        exposedHeaders: ["Authorization"],
    })
);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded files
app.use('/uploads', express.static('public/uploads'));


app.use('/api/student', studentRoutes)
app.use('/api/student-submission', studentSubmit)


connectDb().then(() => {
    app.listen(port, () => {
        console.log(`app is running http://localhost:${port}`)
    })
    
    // cleanup job: remove unverified auths (and linked student profiles) whose OTP expired
    const cleanupExpiredUnverified = async () => {
        try {
            const now = Date.now();
            const expired = await Auth.find({ isEmailVerified: false, otpExpiry: { $lt: now } });
            if (!expired || expired.length === 0) return;
            const ids = expired.map(a => a._id);
            // remove linked student profiles
            await Student.deleteMany({ auth: { $in: ids } });
            // remove auth records
            await Auth.deleteMany({ _id: { $in: ids } });
            console.log(`Cleanup: removed ${ids.length} expired unverified account(s)`);
        } catch (err) {
            console.error('Cleanup error:', err.message || err);
        }
    };

    // run once immediately, then every minute
    cleanupExpiredUnverified();
    setInterval(cleanupExpiredUnverified, 60 * 1000);
})