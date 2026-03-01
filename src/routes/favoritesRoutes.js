const express = require("express");
const User = require("../models/User");
const authenticate = require("../middleware/authenticate");
const { fetchWeatherByCity } = require("../services/weatherService");

const router = express.Router();

router.get("/favorites", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("favorites");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ favorites: user.favorites });
  } catch (error) {
    console.error("❌ Favorites error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/favorites", authenticate, async (req, res) => {
  try {
    const { city } = req.body;

    if (!city || typeof city !== "string" || !city.trim()) {
      return res.status(400).json({ error: "City name is required" });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const cityInput = city.trim();
    const alreadyExists = user.favorites.some(
      (fav) => fav.city.toLowerCase() === cityInput.toLowerCase()
    );

    if (alreadyExists) {
      return res.status(409).json({ error: "City already in favorites" });
    }

    const weatherData = await fetchWeatherByCity(cityInput);

    user.favorites.push({
      city: weatherData.city,
      country: weatherData.country,
      addedAt: new Date()
    });

    await user.save();

    res.status(201).json({ message: "Added to favorites", favorites: user.favorites });
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ error: "City not found" });
    }

    console.error("❌ Add favorite error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/favorites/:city", authenticate, async (req, res) => {
  try {
    const cityParam = req.params.city;

    if (!cityParam) {
      return res.status(400).json({ error: "City name is required" });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const initialLength = user.favorites.length;
    user.favorites = user.favorites.filter(
      (fav) => fav.city.toLowerCase() !== cityParam.toLowerCase()
    );

    if (user.favorites.length === initialLength) {
      return res.status(404).json({ error: "City not found in favorites" });
    }

    await user.save();

    res.json({ message: "Removed from favorites", favorites: user.favorites });
  } catch (error) {
    console.error("❌ Remove favorite error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
