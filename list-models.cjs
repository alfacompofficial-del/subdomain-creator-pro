// using built-in fetch

async function listModels() {
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyAomcWfzjJaNoZsbaQbRo7yRWCRb7v2noA");
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}
listModels();
