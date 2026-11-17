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
const corrections = document.querySelector("#corrections");
const replay = document.querySelector("#replay");
let questions = [];
let choices = [];
let currentIndex = 0;
let selectedAnswer = null;

class QuestionLoadError extends Error {}

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
        form.hidden = true;
        showQuestion();
        statusMessage.textContent = "";
    } catch (error) {
        statusMessage.textContent = error instanceof QuestionLoadError
            ? error.message
            : "Impossible de charger les questions. Réessaie dans un instant.";
    } finally {
        category.disabled = false;
        start.disabled = false;
    }
});

next.addEventListener("click", () => {
    if (questionPanel.hidden || selectedAnswer === null) {
        return;
    }

    choices.push(selectedAnswer);
    currentIndex++;
    if (currentIndex < questions.length) {
        showQuestion();
        return;
    }

    showResults();
});

replay.addEventListener("click", () => {
    resultPanel.hidden = true;
    form.hidden = false;
    category.focus();
});

function showQuestion() {
    const question = questions[currentIndex];
    progress.textContent = `Question ${currentIndex + 1} sur ${questions.length}`;
    questionTitle.textContent = decodeText(question.question);
    answersList.replaceChildren();
    selectedAnswer = null;
    next.hidden = true;
    next.textContent = currentIndex === questions.length - 1 ? "Voir mon score" : "Suivant";

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
    if (questionPanel.hidden) {
        return;
    }

    selectedAnswer = answer;
    for (const option of answersList.querySelectorAll("button")) {
        option.setAttribute("aria-pressed", String(option === button));
    }
    next.hidden = false;
}

function showResults() {
    questionPanel.hidden = true;
    const score = choices.filter((answer, index) => answer === questions[index].correct_answer).length;
    scoreTitle.textContent = `Score : ${score} sur ${questions.length}`;
    corrections.replaceChildren();

    questions.forEach((question, index) => {
        const item = document.createElement("li");
        const title = document.createElement("strong");
        const choice = document.createElement("div");
        const correct = document.createElement("div");
        title.textContent = decodeText(question.question);
        choice.textContent = `Ta réponse : ${decodeText(choices[index])}`;
        correct.textContent = `Bonne réponse : ${decodeText(question.correct_answer)}`;
        item.append(title, choice, correct);
        corrections.append(item);
    });

    resultPanel.hidden = false;
    scoreTitle.focus();
}

function decodeText(text) {
    const decoder = document.createElement("textarea");
    decoder.innerHTML = text;
    return decoder.value;
}

async function fetchQuestions(categoryId) {
    const url = new URL("https://opentdb.com/api.php");
    url.search = new URLSearchParams({ amount: "5", category: categoryId, type: "multiple" });
    const response = await fetch(url).catch(() => {
        throw new QuestionLoadError("Connexion au service impossible. Vérifie ta connexion et réessaie.");
    });
    if (response.status === 429) {
        throw new QuestionLoadError("Trop de demandes. Attends quelques secondes avant de réessayer.");
    }
    if (!response.ok) {
        throw new QuestionLoadError("Le service de quiz est indisponible. Réessaie dans un instant.");
    }

    const data = await response.json();
    if (data.response_code === 1) {
        throw new QuestionLoadError("Pas assez de questions pour cette catégorie. Essaies-en une autre.");
    }
    if (data.response_code === 5) {
        throw new QuestionLoadError("Trop de demandes. Attends quelques secondes avant de réessayer.");
    }
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
