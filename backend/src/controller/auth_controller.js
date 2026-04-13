import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";
import { registerSchema, loginSchema } from "../validators/auth_validation.js";
import {
    generateAccessToken,
    generateRefreshToken,
} from "../utils/jwt.js";

/* ================= REGISTER ================= */
export const register = async (req, res) => {
    try {
        const parsed = registerSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                errors: parsed.error.flatten().fieldErrors,
            });
        }

        const { name, email, password } = parsed.data;

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(409).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = await prisma.user.create({
            data: { name, email, password: hashedPassword },
        });

        // tokens
        const accessToken = generateAccessToken(newUser);
        const refreshToken = generateRefreshToken();

        const tokenHash = await bcrypt.hash(refreshToken, 10);

        // delete old tokens (optional but recommended)
        await prisma.refreshToken.deleteMany({
            where: { userId: newUser.id },
        });

        await prisma.refreshToken.create({
            data: {
                tokenHash,
                userId: newUser.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/api/auth/refresh",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(201)
            .header("Authorization", `Bearer ${accessToken}`)
            .json({
                message: "User registered successfully",
               
                user: { id: newUser.id, name: newUser.name, email: newUser.email },
            });

    } catch (error) {
        console.error("Register Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/* ================= LOGIN ================= */
export const login = async (req, res) => {
    try {
        const parsed = loginSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                errors: parsed.error.flatten().fieldErrors,
            });
        }

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken();
        const tokenHash = await bcrypt.hash(refreshToken, 10);

        // remove old tokens (single device login)
        await prisma.refreshToken.deleteMany({
            where: { userId: user.id },
        });

        await prisma.refreshToken.create({
            data: {
                tokenHash,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/api/auth/refresh",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(200)
            .header("Authorization", `Bearer ${accessToken}`)
            .json({
                
                user: { id: user.id, name: user.name, email: user.email },
            });

    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/* ================= REFRESH ================= */
export const refresh = async (req, res) => {
    try {
        const token = req.cookies.refreshToken;

        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const tokens = await prisma.refreshToken.findMany();

        let validToken = null;

        for (const t of tokens) {
            const isMatch = await bcrypt.compare(token, t.tokenHash);
            if (isMatch) {
                validToken = t;
                break;
            }
        }

        if (!validToken || validToken.expiresAt < new Date()) {
            return res.status(403).json({ message: "Invalid token" });
        }

        // rotate token
        await prisma.refreshToken.delete({
            where: { id: validToken.id },
        });

        const newRefreshToken = generateRefreshToken();
        const newTokenHash = await bcrypt.hash(newRefreshToken, 10);

        await prisma.refreshToken.create({
            data: {
                tokenHash: newTokenHash,
                userId: validToken.userId,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });

        const user = await prisma.user.findUnique({
            where: { id: validToken.userId },
        });

        const accessToken = generateAccessToken(user);

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/api/auth/refresh",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.json({ accessToken });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/* ================= LOGOUT ================= */
export const logout = async (req, res) => {
    try {
        const token = req.cookies.refreshToken;

        if (token) {
            const tokens = await prisma.refreshToken.findMany();

            for (const t of tokens) {
                const isMatch = await bcrypt.compare(token, t.tokenHash);
                if (isMatch) {
                    await prisma.refreshToken.delete({
                        where: { id: t.id },
                    });
                    break;
                }
            }
        }

        res.clearCookie("refreshToken", {
            path: "/api/auth/refresh",
        });

        return res.json({ message: "Logged out" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }
};