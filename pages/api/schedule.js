import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export default async function handler(req, res) {
    await connectDB();

    try {
        if (req.method === "GET") {
            const { userId } = req.query;
            const user = await User.findById(userId, "schedule");
            return res.status(200).json({ success: true, schedule: user.schedule });
        }

        if (req.method === "PATCH") {
            const { userId, updateData } = req.body;
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { schedule: updateData },
                { new: true }
            );
            return res.status(200).json({ success: true, schedule: updatedUser.schedule });
        }

        res.setHeader("Allow", ["GET", "PATCH"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
