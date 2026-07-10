const chat = document.getElementById("chat");
const form = document.getElementById("chat-form");
const input = document.getElementById("chat-input");

function addMessage(text, sender) {
  const el = document.createElement("div");
  el.className = `message ${sender}`;
  el.textContent = text;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
  return el;
}

addMessage(
  'Hi! Ask me about any World Cup 2026 match — try "score of Brazil vs Morocco".',
  "bot"
);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const question = input.value.trim();
  if (!question) return;

  addMessage(question, "user");
  input.value = "";
  const loadingEl = addMessage("Checking the latest match data...", "bot-loading");

  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();
    loadingEl.remove();
    addMessage(data.answer || data.error || "Something went wrong.", "bot");
  } catch (err) {
    loadingEl.remove();
    addMessage("Couldn't reach the server. Try again in a moment.", "bot");
  }
});
