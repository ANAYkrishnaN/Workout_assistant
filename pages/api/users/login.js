import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

const isMongoOfflineError = (error) => {
    const message = String(error?.message || "");
    const causeMessage = String(error?.cause?.message || "");
    const name = String(error?.name || "");
    return (
        error?.code === "MONGODB_OFFLINE" ||
        name === "MongoServerSelectionError" ||
        /ECONNREFUSED|server selection|topology|connect ECONNREFUSED/i.test(message) ||
        /ECONNREFUSED|server selection|topology|connect ECONNREFUSED/i.test(causeMessage)
    );
};

export default async function handler(req, res) {
    try {
        await connectDB();

        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST method allowed" });
        }

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
        if (isMongoOfflineError(error)) {
            return res.status(503).json({
                error: "MongoDB is offline. Please start MongoDB and try again.",
                code: "MONGODB_OFFLINE",
            });
        }
        return res.status(500).json({ error: error.message });
    }
}
