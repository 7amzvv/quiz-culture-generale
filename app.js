const form = document.querySelector("#quiz-form");
const category = document.querySelector("#category");
const start = form.querySelector("button");
const statusMessage = document.querySelector("#quiz-status");
const questionPanel = document.querySelector("#question-panel");
const questionTitle = document.querySelector("#question-title");
const progress = document.querySelector("#progress");
const answersList = document.querySelector("#answers");

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (start.disabled) {
        return;
    }

    start.disabled = true;
    category.disabled = true;
    questionPanel.hidden = true;
    statusMessage.textContent = "Chargement des questions…";
    try {
        const questions = await fetchQuestions(category.value);
        showQuestion(questions[0], 0, questions.length);
        statusMessage.textContent = "";
    } catch {
        statusMessage.textContent = "Impossible de charger les questions. Réessaie dans un instant.";
    } finally {
        category.disabled = false;
        start.disabled = false;
    }
});

function showQuestion(question, index, total) {
    progress.textContent = `Question ${index + 1} sur ${total}`;
    questionTitle.textContent = decodeText(question.question);
    answersList.replaceChildren();

    const answers = [question.correct_answer, ...question.incorrect_answers];
    for (let i = answers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [answers[i], answers[j]] = [answers[j], answers[i]];
    }

    for (const answer of answers) {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = decodeText(answer);
        item.append(button);
        answersList.append(item);
    }
    questionPanel.hidden = false;
}

function decodeText(text) {
    const decoder = document.createElement("textarea");
    decoder.innerHTML = text;
    return decoder.value;
}

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
