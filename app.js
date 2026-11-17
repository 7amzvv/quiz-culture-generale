const form = document.querySelector("#quiz-form");
const language = document.querySelector("#language");
const category = document.querySelector("#category");
const start = form.querySelector("button");
const statusMessage = document.querySelector("#quiz-status");
const questionPanel = document.querySelector("#question-panel");
const questionTitle = document.querySelector("#question-title");
const progress = document.querySelector("#progress");
const timeLeft = document.querySelector("#time-left");
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
const questionDurationMs = 10_000;
const frenchCategories = { "9": "culture_generale", "17": "science", "22": "geographie" };
let deadline = 0;
let timerId;

class QuestionLoadError extends Error {}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (start.disabled || form.hidden) {
        return;
    }

    start.disabled = true;
    language.disabled = true;
    category.disabled = true;
    questionPanel.hidden = true;
    resultPanel.hidden = true;
    statusMessage.textContent = "Chargement des questions…";
    try {
        questions = await fetchQuestions(category.value, language.value);
        choices = [];
        currentIndex = 0;
        questionTitle.lang = language.value;
        answersList.lang = language.value;
        form.hidden = true;
        showQuestion();
        statusMessage.textContent = "";
    } catch (error) {
        statusMessage.textContent = error instanceof QuestionLoadError
            ? error.message
            : "Impossible de charger les questions. Réessaie dans un instant.";
    } finally {
        language.disabled = false;
        category.disabled = false;
        start.disabled = false;
    }
});

next.addEventListener("click", () => {
    if (questionPanel.hidden || selectedAnswer === null) {
        return;
    }

    completeQuestion(performance.now() < deadline ? selectedAnswer : null);
});

function completeQuestion(answer) {
    clearInterval(timerId);
    choices.push(answer);
    statusMessage.textContent = answer === null ? "Temps écoulé. Question ignorée." : "";
    currentIndex++;
    if (currentIndex < questions.length) {
        showQuestion();
        return;
    }

    showResults();
}

replay.addEventListener("click", () => {
    resultPanel.hidden = true;
    form.hidden = false;
    language.focus();
});

function showQuestion() {
    const question = questions[currentIndex];
    progress.textContent = `Question ${currentIndex + 1} sur ${questions.length}`;
    questionTitle.textContent = question.question;
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
        button.textContent = answer;
        button.setAttribute("aria-pressed", "false");
        button.addEventListener("click", () => chooseAnswer(answer, button));
        item.append(button);
        answersList.append(item);
    }
    questionPanel.hidden = false;
    deadline = performance.now() + questionDurationMs;
    timeLeft.textContent = "10 s";
    timerId = setInterval(updateTimer, 100);
    questionTitle.focus();
}

function updateTimer() {
    const remaining = deadline - performance.now();
    if (remaining <= 0) {
        completeQuestion(null);
        return;
    }

    const seconds = `${Math.ceil(remaining / 1000)} s`;
    if (timeLeft.textContent !== seconds) {
        timeLeft.textContent = seconds;
    }
}

function chooseAnswer(answer, button) {
    if (questionPanel.hidden || performance.now() >= deadline) {
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
        title.lang = questionTitle.lang;
        title.textContent = question.question;
        if (choices[index] === null) {
            choice.textContent = "Question ignorée (temps écoulé).";
        } else {
            appendAnswer(choice, "Ta réponse", choices[index]);
        }
        appendAnswer(correct, "Bonne réponse", question.correct_answer);
        item.append(title, choice, correct);
        corrections.append(item);
    });

    resultPanel.hidden = false;
    scoreTitle.focus();
}

function appendAnswer(element, label, value) {
    const answer = document.createElement("span");
    answer.lang = questionTitle.lang;
    answer.textContent = value;
    element.append(`${label} : `, answer);
}

function decodeText(text) {
    const decoder = document.createElement("textarea");
    decoder.innerHTML = text;
    return decoder.value;
}

async function fetchQuestions(categoryId, questionLanguage) {
    const french = questionLanguage === "fr";
    const url = new URL(french ? "https://quizzapi.fr/api/v2/quiz" : "https://opentdb.com/api.php");
    url.search = new URLSearchParams(french
        ? { limit: "5", category: frenchCategories[categoryId] }
        : { amount: "5", category: categoryId, type: "multiple" });
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
    const results = french ? data?.quizzes : data?.results;
    if ((!french && data?.response_code === 1)
        || (french && Array.isArray(results) && results.length < 5)) {
        throw new QuestionLoadError("Pas assez de questions pour cette catégorie. Essaies-en une autre.");
    }
    if (!french && data?.response_code === 5) {
        throw new QuestionLoadError("Trop de demandes. Attends quelques secondes avant de réessayer.");
    }
    if ((!french && data?.response_code !== 0) || !Array.isArray(results) || results.length !== 5) {
        throw new Error("Le service n’a pas fourni cinq questions valides.");
    }
    const normalized = french ? results.map((question) => ({
        type: "multiple",
        question: question?.question,
        correct_answer: question?.answer,
        incorrect_answers: question?.badAnswers
    })) : results;
    if (!normalized.every(isMultipleChoiceQuestion)) {
        throw new Error("Le service n’a pas fourni cinq questions valides.");
    }
    return french ? normalized : normalized.map((question) => ({
        question: decodeText(question.question),
        correct_answer: decodeText(question.correct_answer),
        incorrect_answers: question.incorrect_answers.map(decodeText)
    }));
}

function isMultipleChoiceQuestion(question) {
    return question?.type === "multiple"
        && typeof question.question === "string"
        && typeof question.correct_answer === "string"
        && Array.isArray(question.incorrect_answers)
        && question.incorrect_answers.length === 3
        && question.incorrect_answers.every((answer) => typeof answer === "string");
}
