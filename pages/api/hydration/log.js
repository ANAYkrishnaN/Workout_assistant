import { connectDB } from "@/lib/mongodb";
import HydrationLog from "@/models/HydrationLog";
import User from "@/models/User";

const getDateKey = () => new Date().toISOString().slice(0, 10);

export default async function handler(req, res) {
    await connectDB();

    try {
        if (req.method === "GET") {
            const { userId } = req.query;
            if (!userId) {
                return res.status(400).json({ success: false, error: "userId required" });
            }
            const date = req.query.date || getDateKey();
            const log = await HydrationLog.findOne({ userId, date });
            return res.status(200).json({
                success: true,
                log: log
                    ? { date: log.date, entries: log.entries || [], total: log.total || 0 }
                    : { date, entries: [], total: 0 },
            });
        }

        if (req.method === "POST") {
            const { userId, time, amount, reset } = req.body;
            if (!userId) {
                return res.status(400).json({ success: false, error: "userId required" });
            }
            const date = req.body.date || getDateKey();

            if (reset) {
                const log = await HydrationLog.findOneAndUpdate(
                    { userId, date },
                    { $set: { entries: [], total: 0 } },
                    { new: true, upsert: true }
                );
                await User.findByIdAndUpdate(userId, { $set: { "hydration.currentProgress": 0 } });
                return res.status(200).json({
                    success: true,
                    log: { date: log.date, entries: [], total: 0 },
                });
            }

            if (time == null || amount == null) {
                return res.status(400).json({ success: false, error: "time and amount required" });
            }
            const numAmount = Number(amount);
            if (!Number.isFinite(numAmount) || numAmount <= 0) {
                return res.status(400).json({ success: false, error: "amount must be a positive number" });
            }

            const log = await HydrationLog.findOneAndUpdate(
                { userId, date },
                {
                    $push: { entries: { time: String(time), amount: numAmount } },
                    $inc: { total: numAmount },
                },
                { new: true, upsert: true }
            );

            const newTotal = log.total || 0;
            await User.findByIdAndUpdate(userId, { $set: { "hydration.currentProgress": newTotal } });

            return res.status(200).json({
                success: true,
                log: { date: log.date, entries: log.entries || [], total: newTotal },
            });
        }

        res.setHeader("Allow", ["GET", "POST"]);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    } catch (error) {
        console.error("Hydration log API error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
