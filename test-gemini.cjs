const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
  try {
    const genAI = new GoogleGenerativeAI("AIzaSyAomcWfzjJaNoZsbaQbRo7yRWCRb7v2noA");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent("Say: works");
    console.log("✅ SUCCESS:", result.response.text().trim());
  } catch (e) {
    console.error("❌ Error:", e.message.split('\n')[0]);
  }
}
test();
