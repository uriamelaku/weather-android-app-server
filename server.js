require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// 🔹 Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});

// 🔹 התחברות ל-MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// 🔹 User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true }
});

const User = mongoose.model("User", userSchema);

// 🔹 REGISTER
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const existing = await User.findOne({ username });
  if (existing) {
    return res.status(409).json({ error: "User already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await User.create({ username, passwordHash });

  res.json({ message: "User registered" });
});

// 🔹 LOGIN
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  res.json({ message: "logged in" });
});

// 🔹 WEATHER API ENDPOINT
app.get("/api/weather", async (req, res) => {
  try {
    const { city } = req.query;

    // Validation: city missing
    if (!city) {
      return res.status(400).json({ error: "City name is required" });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;

    // Use https module for compatibility
    const https = require('https');
    
    try {
      const data = await new Promise((resolve, reject) => {
        https.get(url, (response) => {
          let body = '';
          
          // Handle 404 - city not found
          if (response.statusCode === 404) {
            return reject({ status: 404, message: "City not found" });
          }
          
          // Handle other API errors
          if (response.statusCode !== 200) {
            return reject({ status: response.statusCode, message: `OpenWeather API error: ${response.statusCode}` });
          }
          
          response.on('data', chunk => body += chunk);
          response.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(e);
            }
          });
        }).on('error', reject);
      });

      // Clean JSON response
      const weatherData = {
        city: data.name,
        country: data.sys.country,
        temp: data.main.temp,
        feelsLike: data.main.feels_like,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        timestamp: data.dt
      };

      res.json(weatherData);
    } catch (err) {
      if (err.status === 404) {
        return res.status(404).json({ error: "City not found" });
      }
      throw err;
    }
  } catch (error) {
    console.error("❌ Weather API error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 🔹 HEALTH CHECK
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/ping", (req, res) => {
  res.json({ message: "pong" });
});

const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`🚀 Server running on http://localhost:${port}`)
);