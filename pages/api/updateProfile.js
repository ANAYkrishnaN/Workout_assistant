import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export default async function handler(req, res) {
    await connectDB();

    try {
        // Accept both POST and PUT methods
        if (req.method === "POST" || req.method === "PUT") {
            const { userId, email, personalDetails, fitnessGoals, schedule } = req.body;

            // Check if either userId or email is provided
            if (!userId && !email) {
                return res.status(400).json({
                    success: false,
                    error: "Either userId or email is required"
                });
            }

            // Build the query based on what's provided
            const query = userId ? { _id: userId } : { "login.email": email };

            const updatedUser = await User.findOneAndUpdate(
                query,
                {
                    personalDetails,
                    fitnessGoals,
                    schedule,
                },
                { new: true, runValidators: true }
            );

            if (!updatedUser) {
                return res.status(404).json({
                    success: false,
                    error: "User not found"
                });
            }

            return res.status(200).json({ success: true, user: updatedUser });
        }

        return res.status(405).json({
            success: false,
            error: "Method not allowed. Use POST or PUT."
        });
    } catch (error) {
        console.error("Update profile error:", error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}