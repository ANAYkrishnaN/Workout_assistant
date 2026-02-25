import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export default async function handler(req, res) {
    await connectDB();

    try {
        if (req.method === "POST") {
            const { login } = req.body;
            // Check if email already exists
            const existingUser = await User.findOne({ "login.email": login.email });
            if (existingUser) {
                return res.status(400).json({ success: false, error: "Email already registered" });
            }

            // Create new user
            console.log(req.body);

            const user = await User.create(req.body);
            return res.status(200).json({ success: true, user });
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
