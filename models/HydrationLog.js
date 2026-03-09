import mongoose from "mongoose";

const HydrationEntrySchema = new mongoose.Schema({
    time: { type: String, required: true },  // e.g. "10:00 AM"
    amount: { type: Number, required: true }, // ml
}, { _id: false });

const HydrationLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },  // YYYY-MM-DD
    entries: { type: [HydrationEntrySchema], default: [] },
    total: { type: Number, default: 0 },
}, { timestamps: true });

HydrationLogSchema.index({ userId: 1, date: 1 }, { unique: true });

const HydrationLog = mongoose.models.HydrationLog || mongoose.model("HydrationLog", HydrationLogSchema);
export default HydrationLog;
