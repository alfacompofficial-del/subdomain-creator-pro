import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on("console", msg => console.log("BROWSER LOG:", msg.type(), msg.text()));
  page.on("pageerror", error => console.log("BROWSER ERROR:", error.message, error.stack));
  
  console.log("Navigating to preview server...");
  await page.goto("http://localhost:8080/");
  
  await page.waitForTimeout(5000); // Wait for crash
  
  await browser.close();
})();
