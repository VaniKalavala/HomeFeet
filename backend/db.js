const mongoose = require('mongoose');

mongoose.connect(
  'mongodb+srv://HomeFeet_db:J7N6VOFOspRrcBEL@cluster0.ztld8k3.mongodb.net/homefeet?retryWrites=true&w=majority&appName=Cluster0'
).then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

async function disconnectDB() {
  await mongoose.disconnect();
  console.log("🔌 MongoDB disconnected");
}

module.exports = { disconnectDB };
