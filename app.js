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
    category.disabled = true;
    statusMessage.textContent = "Chargement des questions…";
    try {
        const questions = await fetchQuestions(category.value);
        statusMessage.textContent = `${questions.length} questions chargées.`;
    } catch {
        statusMessage.textContent = "Impossible de charger les questions. Réessaie dans un instant.";
    } finally {
        category.disabled = false;
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
    if (data.response_code !== 0 || !Array.isArray(data.results) || data.results.length !== 5
        || !data.results.every(isMultipleChoiceQuestion)) {
        throw new Error("Le service n’a pas fourni cinq questions valides.");
    }
    return data.results;
}

function isMultipleChoiceQuestion(question) {
    return question?.type === "multiple"
        && typeof question.question === "string"
        && typeof question.correct_answer === "string"
        && Array.isArray(question.incorrect_answers)
        && question.incorrect_answers.length === 3
        && question.incorrect_answers.every((answer) => typeof answer === "string");
}
