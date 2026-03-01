const express = require("express");
const User = require("../models/User");
const authenticate = require("../middleware/authenticate");
const { fetchWeatherByCity } = require("../services/weatherService");

const router = express.Router();

router.get("/weather", authenticate, async (req, res) => {
  try {
    const { city } = req.query;

    if (!city) {
      return res.status(400).json({ error: "City name is required" });
    }

    const weatherData = await fetchWeatherByCity(city);

    await User.findByIdAndUpdate(req.user.userId, {
      $push: {
        history: {
          $each: [{ ...weatherData, searchedAt: new Date() }],
          $slice: -20
        }
      }
    });

    res.json(weatherData);
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ error: "City not found" });
    }

    console.error("❌ Weather API error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
