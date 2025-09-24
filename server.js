import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../frontend")));

const transactions = {};

// Your live credentials
const consumerKey = "LIVE_CONSUMER_KEY";
const consumerSecret = "LIVE_CONSUMER_SECRET";
const shortcode = "YOUR_LIPA_NAMBA";
const passkey = "LIVE_PASSKEY";

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: 'yourEmail@gmail.com', pass: 'yourEmailPassword' }
});

async function getToken() {
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const res = await fetch("https://api.safaricom.co.tz/oauth/v1/generate?grant_type=client_credentials", {
    headers: { Authorization: `Basic ${auth}` }
  });
  const data = await res.json();
  return data.access_token;
}

app.post("/api/pay", async (req, res) => {
  const { phone, amount, email } = req.body;
  const transactionId = uuidv4();
  transactions[transactionId] = { status: "PENDING", phone, amount, email };

  try {
    const token = await getToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0,14);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

    await fetch("https://api.safaricom.co.tz/mpesa/stkpush/v1/processrequest", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerBuyGoodsOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: shortcode,
        PhoneNumber: phone,
        CallBackURL: `https://yourdomain.com/api/callback?tid=${transactionId}`,
        AccountReference: "MeruEcoCamp",
        TransactionDesc: "Camp Booking Payment"
      })
    });

    res.json({ message: "Check your phone for PIN prompt!", transactionId });
  } catch (err) {
    transactions[transactionId].status = "FAILED";
    res.status(500).json({ message: "Payment request failed", transactionId });
  }
});

app.post("/api/callback", async (req, res) => {
  const { tid } = req.query;
  const resultCode = req.body.Body.stkCallback.ResultCode;

  if(resultCode === 0) {
    transactions[tid].status = "SUCCESS";

    // Generate PDF receipt
    const pdfPath = path.join(__dirname, `receipt-${tid}.pdf`);
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(pdfPath));
    doc.fontSize(20).text('MeruEcoCamp Payment Receipt', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Transaction ID: ${tid}`);
    doc.text(`Amount Paid: TZS ${transactions[tid].amount}`);
    doc.text(`Phone: ${transactions[tid].phone}`);
    doc.text(`Date: ${new Date().toLocaleString()}`);
    doc.end();

    // Send email
    await transporter.sendMail({
      from: 'yourEmail@gmail.com',
      to: transactions[tid].email,
      subject: 'MeruEcoCamp Payment Receipt',
      text: `Thank you for your payment. Transaction ID: ${tid}`,
      attachments: [{ filename: `receipt-${tid}.pdf`, path: pdfPath }]
    });

  } else {
    transactions[tid].status = "FAILED";
  }

  res.sendStatus(200);
});

app.get("/api/status/:id", (req, res) => {
  const tid = req.params.id;
  res.json({ status: transactions[tid]?.status || "PENDING" });
});

app.listen(3000, () => console.log("MeruEcoCamp backend running at http://localhost:3000"));
