const form = document.querySelector("#quiz-form");
const category = document.querySelector("#category");
const start = form.querySelector("button");
const statusMessage = document.querySelector("#quiz-status");

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (start.disabled) {
        return;
    }

    start.disabled = true;
    statusMessage.textContent = "Chargement des questions…";
    try {
        const questions = await fetchQuestions(category.value);
        statusMessage.textContent = `${questions.length} questions chargées.`;
    } catch {
        statusMessage.textContent = "Impossible de charger les questions. Réessaie dans un instant.";
    } finally {
        start.disabled = false;
    }
});

async function fetchQuestions(categoryId) {
    const url = new URL("https://opentdb.com/api.php");
    url.search = new URLSearchParams({ amount: "5", category: categoryId, type: "multiple" });
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Le service de quiz ne répond pas.");
    }

    const data = await response.json();
    return data.results;
}
