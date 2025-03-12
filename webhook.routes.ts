import express from "express";
import crypto from "crypto";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const QUEUE_FILE = "events.log"; 
const SHARED_SECRET = process.env.SEGMENT_SHARED_SECRET || "";

// Middleware to verify X-Signature (if Shared Secret is used)
const verifySegmentSignature = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    if (!SHARED_SECRET) {
        next(); 
        return;
    }

    const signature = req.headers["x-signature"] as string;
    if (!signature) {
        res.status(401).json({ error: "Missing X-Signature header" });
        return;
    }

    const expectedSignature = crypto.createHmac("sha1", SHARED_SECRET)
        .update(JSON.stringify(req.body))
        .digest("hex");

    if (signature !== expectedSignature) {
        res.status(401).json({ error: "Invalid signature" });
        return;
    }

    next(); 
};

// Store event in a queue (file-based for now)
const queueEvent = (eventData: any) => {
    fs.appendFile(QUEUE_FILE, JSON.stringify(eventData) + "\n", (err) => {
        if (err) console.error("Failed to write to queue:", err);
    });
};

// Webhook endpoint to receive Segment events
router.post("/webhook",verifySegmentSignature, async (req, res) => {
    console.log("Received Segment Webhook:", JSON.stringify(req.body, null, 2));
    queueEvent(req.body);
    res.status(200).json({ message: "Webhook received successfully" });
});

export default router;
