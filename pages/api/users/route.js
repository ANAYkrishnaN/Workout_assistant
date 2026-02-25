import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export default async function handler(req, res) {
    await connectDB();

    try {
        if (req.method === "POST") {
            const data = req.body; // Pages Router parses JSON automatically if using `body-parser` (Next.js does this)
            const user = await User.create(data);
            return res.status(200).json({ success: true, user });
        }

        if (req.method === "GET") {
            const users = await User.find({});
            return res.status(200).json(users);
        }

        // Method not allowed
        res.setHeader("Allow", ["GET", "POST"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
