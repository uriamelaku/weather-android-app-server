const express = require("express");
const User = require("../models/User");
const authenticate = require("../middleware/authenticate");

const router = express.Router();

router.get("/history", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("history");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const history = [...user.history].reverse();
    res.json({ history });
  } catch (error) {
    console.error("❌ History error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/history", authenticate, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.userId, { $set: { history: [] } });
    res.json({ message: "History cleared" });
  } catch (error) {
    console.error("❌ Clear history error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
