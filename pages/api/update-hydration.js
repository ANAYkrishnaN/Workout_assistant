import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        await connectDB();
        const { userId, dailyGoal, currentProgress } = req.body;

        const updateData = {};
        if (dailyGoal !== undefined) updateData["hydration.dailyGoal"] = dailyGoal;
        if (currentProgress !== undefined) updateData["hydration.currentProgress"] = currentProgress;

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({ success: true, user });
    } catch (error) {
        console.error("Error updating hydration:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}