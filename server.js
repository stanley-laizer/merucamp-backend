// server.js
import express from "express";
import path from "path";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../frontend")));

// Test route
app.get("/", (req, res) => {
  res.send("MeruEcoCamp Backend is live!");
});

// Payment endpoint placeholders
app.post("/api/pay/tigo", (req, res) => {
  const { phone, amount } = req.body;
  console.log(`Tigo Payment requested: ${phone}, ${amount}`);
  // TODO: integrate Tigo STK push
  res.json({ status: "success", message: "Tigo payment simulated" });
});

app.post("/api/pay/airtel", (req, res) => {
  const { phone, amount } = req.body;
  console.log(`Airtel Payment requested: ${phone}, ${amount}`);
  // TODO: integrate Airtel STK push
  res.json({ status: "success", message: "Airtel payment simulated" });
});

// PDF/email placeholder endpoints
app.post("/api/send-receipt", (req, res) => {
  const { email, amount } = req.body;
  console.log(`Receipt requested: ${email}, ${amount}`);
  // TODO: generate PDF and send email
  res.json({ status: "success", message: "Receipt simulated" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
