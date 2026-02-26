import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import studentRoutes from "./src/auth/routes/student.route.js"
import { connectDb } from "./src/auth/config/db.js"
import cookieParser from "cookie-parser";

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


connectDb().then(() => {
    app.listen(port, () => {
        console.log(`app is running http://localhost:${port}`)
    })
})