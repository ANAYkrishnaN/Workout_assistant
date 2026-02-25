import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export default async function handler(req, res) {
    await connectDB();

    try {
        if (req.method === "GET") {
            const { userId } = req.query;

            if (!userId) {
                return res.status(400).json({ error: "userId is required" });
            }
            console.log(userId);

            const user = await User.findById(userId, "login personalDetails fitnessGoals schedule progress hydration");

            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            return res.status(200).json({ success: true, user });
        }

        if (req.method === "PUT" || req.method === "PATCH") {
            const { userId, updateData } = req.body;

            if (!userId) {
                return res.status(400).json({ error: "userId is required" });
            }

            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $set: updateData },
                { new: true, runValidators: true }
            );

            if (!updatedUser) {
                return res.status(404).json({ error: "User not found" });
            }

            return res.status(200).json({ success: true, user: updatedUser });
        }

        res.setHeader("Allow", ["GET", "PUT", "PATCH"]);
        return res.status(405).json({ error: "Method not allowed" });
    } catch (error) {
        console.error("User Me API Error:", error);
        return res.status(500).json({ error: error.message });
    }
}