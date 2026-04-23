const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.error('❌ MONGO_URI is missing in .env file');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected Successfully!');
        console.log(`🔗 Host: ${mongoose.connection.host}`);
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        throw error; // Rethrow to be caught by start()
    }
};

module.exports = connectDB;

// If run directly, test the connection
if (require.main === module) {
    connectDB().then(() => {
        if (mongoose.connection.readyState === 1) {
            process.exit(0);
        }
    });
}