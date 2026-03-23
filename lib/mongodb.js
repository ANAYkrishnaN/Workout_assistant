import mongoose from "mongoose";

const MONGODB_URI = process.env.NEXT_MONGODB_URI;


if (!MONGODB_URI) {
    throw new Error("❌ NEXT_MONGODB_URI is not defined. Copy .env.example to .env.local and set NEXT_MONGODB_URI.");
}

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

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

const connectDB = async () => {
    // readyState: 1 = connected
    if (cached.conn && mongoose.connection.readyState === 1) {
        return cached.conn;
    }
    if (cached.conn && mongoose.connection.readyState !== 1) {
        cached.conn = null;
        cached.promise = null;
    }

    if (!cached.promise) {
        cached.promise = mongoose
            .connect(MONGODB_URI, {
                dbName: "fitness_database",
                serverSelectionTimeoutMS: 4000,
                connectTimeoutMS: 4000,
                socketTimeoutMS: 8000,
            })
            .then((mongoose) => mongoose);
    }

    try {
        cached.conn = await cached.promise;
        return cached.conn;
    } catch (error) {
        // Reset promise so future retries can reconnect once MongoDB is back.
        cached.promise = null;
        if (!isMongoOfflineError(error)) {
            throw error;
        }
        const wrappedError = new Error("MongoDB is offline. Please start MongoDB and try again.");
        wrappedError.code = "MONGODB_OFFLINE";
        wrappedError.cause = error;
        throw wrappedError;
    }
}

export { connectDB };