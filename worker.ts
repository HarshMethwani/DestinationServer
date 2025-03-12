import fs from "fs";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const QUEUE_FILE = "events.log";
const TEMP_FILE = "events.log.processing";
const FORWARDING_URL = process.env.FORWARDING_URL || ""; // External API
const INTERVAL = 3 * 60 * 1000; // 3 minutes

async function forwardEvent(eventData: any, retries = 3) {
    if (!FORWARDING_URL) return;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(FORWARDING_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(eventData),
            });

            if (response.ok) {
                console.log(`Event forwarded successfully.`);
                return;
            } else {
                console.error(`Failed to forward event (Attempt ${attempt}): ${response.status}`);
            }
        } catch (error) {
            console.error(`Error forwarding event (Attempt ${attempt}):`, error);
        }

        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait before retrying
    }
}

async function processQueue() {
    if (!fs.existsSync(QUEUE_FILE)) {
        console.log("No events to process.");
        return;
    }

    try {
        fs.renameSync(QUEUE_FILE, TEMP_FILE);
        const data = fs.readFileSync(TEMP_FILE, "utf-8");
        const events = data.trim().split("\n").map(line => JSON.parse(line));

        for (const event of events) {
            await forwardEvent(event);
        }

        fs.unlinkSync(TEMP_FILE);
        console.log("Processed all events.");
    } catch (error) {
        console.error("Error processing queue:", error);

        if (fs.existsSync(TEMP_FILE)) {
            fs.renameSync(TEMP_FILE, QUEUE_FILE);
        }
    }
}

setInterval(processQueue, INTERVAL);
console.log(`Worker running. Processing queue every ${INTERVAL / 1000 / 60} minutes.`);
