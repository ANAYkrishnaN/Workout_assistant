import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export default async function handler(req, res) {
    await connectDB();

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Only POST method allowed" });
    }

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // Check if user exists
        const user = await User.findOne({ "login.email": email });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Compare password (plain text for now — hash later)
        if (user.login.password !== password) {
            return res.status(401).json({ error: "Invalid password" });
        }

        return res.status(200).json({
            success: true,
            user: {
                id: user._id,
                fullName: user.login.fullName,
                email: user.login.email,
            }
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
