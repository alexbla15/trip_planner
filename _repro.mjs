import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

page.on("console", (msg) => console.log("[console]", msg.type(), msg.text()));
page.on("pageerror", (err) => console.log("[pageerror]", err.message));

await page.goto("http://localhost:3000/explore", { waitUntil: "networkidle" });
console.log("URL:", page.url());

await page.waitForTimeout(1500);
const buttons = await page.locator("button").allTextContents();
console.log("Top buttons sample:", JSON.stringify(buttons.slice(0, 60)));

await browser.close();
