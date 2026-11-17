const form = document.querySelector("#quiz-form");
const category = document.querySelector("#category");
const start = form.querySelector("button");
const statusMessage = document.querySelector("#quiz-status");
const questionPanel = document.querySelector("#question-panel");
const questionTitle = document.querySelector("#question-title");
const progress = document.querySelector("#progress");
const answersList = document.querySelector("#answers");
const next = document.querySelector("#next-question");
const resultPanel = document.querySelector("#result-panel");
const scoreTitle = document.querySelector("#score-title");
let questions = [];
let choices = [];
let currentIndex = 0;

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (start.disabled) {
        return;
    }

    start.disabled = true;
    category.disabled = true;
    questionPanel.hidden = true;
    resultPanel.hidden = true;
    statusMessage.textContent = "Chargement des questions…";
    try {
        questions = await fetchQuestions(category.value);
        choices = [];
        currentIndex = 0;
        showQuestion();
        statusMessage.textContent = "";
    } catch {
        statusMessage.textContent = "Impossible de charger les questions. Réessaie dans un instant.";
    } finally {
        category.disabled = false;
        start.disabled = false;
    }
});

next.addEventListener("click", () => {
    if (questionPanel.hidden || choices.length !== currentIndex + 1) {
        return;
    }

    currentIndex++;
    if (currentIndex < questions.length) {
        showQuestion();
        return;
    }

    questionPanel.hidden = true;
    const score = choices.filter((answer, index) => answer === questions[index].correct_answer).length;
    scoreTitle.textContent = `Score : ${score} sur ${questions.length}`;
    resultPanel.hidden = false;
    scoreTitle.focus();
});

function showQuestion() {
    const question = questions[currentIndex];
    progress.textContent = `Question ${currentIndex + 1} sur ${questions.length}`;
    questionTitle.textContent = decodeText(question.question);
    answersList.replaceChildren();
    next.hidden = true;

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
        button.setAttribute("aria-pressed", "false");
        button.addEventListener("click", () => chooseAnswer(answer, button));
        item.append(button);
        answersList.append(item);
    }
    questionPanel.hidden = false;
    questionTitle.focus();
}

function chooseAnswer(answer, button) {
    if (questionPanel.hidden || choices.length !== currentIndex) {
        return;
    }

    choices.push(answer);
    button.setAttribute("aria-pressed", "true");
    for (const option of answersList.querySelectorAll("button")) {
        option.disabled = true;
    }
    next.hidden = false;
    next.focus();
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
