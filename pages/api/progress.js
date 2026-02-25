import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export default async function handler(req, res) {
    await connectDB();

    try {
        if (req.method === "GET") {
            const { userId } = req.query;
            const user = await User.findById(userId, "progress");
            return res.status(200).json({ success: true, progress: user.progress });
        }

        if (req.method === "PATCH") {
            const { userId, updateData } = req.body;
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { progress: updateData },
                { new: true }
            );
            return res.status(200).json({ success: true, progress: updatedUser.progress });
        }

        res.setHeader("Allow", ["GET", "PATCH"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
