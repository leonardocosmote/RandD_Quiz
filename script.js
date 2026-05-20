// =============================================================================
// 6G-EWOC tablet poll — questions loaded from questions.json (no right/wrong).
// =============================================================================

const PROJECT_ID = '6G-EWOC';

let quizState = {
    questions: [],
    allQuestions: [],
    currentQuestionIndex: 0,
    userName: '',
    userEmail: '',
    answers: [],
    isCompleted: false,
    googleAppsScriptUrl:
        'https://script.google.com/macros/s/AKfycbymAWalVqzdDRN7pD3PyGytcBGVcE8iJkGLeaBa-o7V_tnw1a1voiUZpEK6j7uPDkUg/exec',
};

let rankOrder = []; // option indices in rank order (length 1–3)

const quizScreenEl = document.getElementById('quizScreen');

const startScreen = document.getElementById('startScreen');

const userNameInput = document.getElementById('userName');
const startBtn = document.getElementById('startBtn');
const nameError = document.getElementById('nameError');
const emailScreen = document.getElementById('emailScreen');
const userEmailInput = document.getElementById('userEmail');
const emailError = document.getElementById('emailError');
const emailContinueBtn = document.getElementById('emailContinueBtn');
const homeBtn = document.getElementById('homeBtn');

const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('optionsContainer');
const progressBar = document.querySelector('.progress-fill');
const currentQuestionSpan = document.getElementById('currentQuestion');
const totalQuestionsSpan = document.getElementById('totalQuestions');

const resultUserName = document.getElementById('resultUserName');
const submitStatus = document.getElementById('submitStatus');
const rankFooter = document.getElementById('rankFooter');
const freeTextPanel = document.getElementById('freeTextPanel');
const prevQuestionBtn = document.getElementById('prevQuestionBtn');
const nextQuestionBtn = document.getElementById('nextQuestionBtn');
const nextQuestionLabel = document.getElementById('nextQuestionLabel');
const resultsScreen = document.getElementById('resultsScreen');
const freeTextInput = document.getElementById('freeTextInput');
const freeTextLabel = document.getElementById('freeTextLabel');
const freeTextContinueBtn = document.getElementById('freeTextContinueBtn');

const qrCodeBtn = document.getElementById('qrCodeBtn');
const qrCodeModal = document.getElementById('qrCodeModal');
const qrModalClose = document.getElementById('qrModalClose');
const qrCodeContainer = document.getElementById('qrcode');

const QUIZ_URL = typeof window !== 'undefined' && window.location ? window.location.href.split('?')[0] : '';

function optionNeedsFreeText(label) {
    const t = (label || '').toLowerCase();
    return (
        /\bother\b/.test(t) ||
        /self-describe/.test(t) ||
        /please specify/.test(t) ||
        /prefer to self-describe/.test(t)
    );
}

/** Normalize items from questions.json (type defaults from id if omitted). */
function normalizeQuestionsFromJson(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item, index) => {
            const id = typeof item.id === 'number' ? item.id : index + 1;
            let type = item.type;
            if (type !== 'rank' && type !== 'single') {
                type = 'single';
            }
            const options = Array.isArray(item.options) ? item.options.map((o) => String(o)) : [];
            return {
                id,
                question: String(item.question || '').trim(),
                options,
                type,
            };
        })
        .filter((q) => q.question && q.options.length > 0)
        .sort((a, b) => a.id - b.id);
}

/** Tighter typography + scrollable option list for long stems / many options. */
function updateQuizLayoutDenseClass(question) {
    if (!quizScreenEl || !question) return;
    const stemLen = (question.question || '').length;
    const manyOptions = question.options.length >= 8;
    const longOptionLine = question.options.some((o) => (o || '').length > 52);
    quizScreenEl.classList.toggle('quiz-layout--dense', manyOptions || stemLen > 130 || longOptionLine);
}

document.addEventListener('DOMContentLoaded', () => {
    loadQuestions();
    attachEventListeners();
    setupIncompleteQuizTracking();
    setupQRCode();
    if (prevQuestionBtn) prevQuestionBtn.addEventListener('click', goToPreviousQuestion);
    if (nextQuestionBtn) nextQuestionBtn.addEventListener('click', goToNextQuestion);
    if (freeTextContinueBtn) {
        freeTextContinueBtn.addEventListener('click', submitFreeTextAndAdvance);
    }
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (isFreeTextPanelOpen() && pendingSingle) {
            e.preventDefault();
            submitFreeTextAndAdvance();
        }
    });
});

function setupIncompleteQuizTracking() {
    window.addEventListener('beforeunload', () => {
        if (quizState.userName && quizState.answers.length >= 2 && !quizState.isCompleted) {
            submitIncompleteQuizSync();
        }
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && quizState.userName && quizState.answers.length >= 2 && !quizState.isCompleted) {
            submitIncompleteQuiz();
        }
    });
}

function attachEventListeners() {
    startBtn.addEventListener('click', startQuiz);
    if (emailContinueBtn) emailContinueBtn.addEventListener('click', () => finishEmailStepFromInput());
    if (homeBtn) homeBtn.addEventListener('click', goHome);
    if (userNameInput && nameError) {
        userNameInput.addEventListener('input', () => {
            nameError.classList.add('hidden');
        });
    }
    if (userEmailInput && emailError) {
        userEmailInput.addEventListener('input', () => {
            emailError.classList.add('hidden');
        });
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function finishEmailStepFromInput() {
    const raw = userEmailInput ? userEmailInput.value.trim() : '';
    if (!raw) {
        finishEmailStep('');
        return;
    }
    if (!isValidEmail(raw)) {
        if (emailError) {
            emailError.textContent = 'Please enter a valid email address, or leave the field empty to continue.';
            emailError.classList.remove('hidden');
        }
        return;
    }
    finishEmailStep(raw);
}

async function finishEmailStep(email) {
    quizState.userEmail = email || '';
    if (emailError) emailError.classList.add('hidden');
    quizState.isCompleted = true;
    showThankYouScreen();
    await submitPollCompletion();
}

function setupQRCode() {
    if (!qrCodeBtn || !qrCodeModal || !qrModalClose) return;
    qrCodeBtn.addEventListener('click', () => showQRCode());
    qrModalClose.addEventListener('click', () => hideQRCode());
    qrCodeModal.addEventListener('click', (e) => {
        if (e.target === qrCodeModal) hideQRCode();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !qrCodeModal.classList.contains('hidden')) hideQRCode();
    });
}

function showQRCode() {
    if (!qrCodeModal || !qrCodeContainer) return;
    qrCodeContainer.innerHTML = '';
    qrCodeModal.classList.remove('hidden');
    const tryGen = () => {
        if (typeof QRCode === 'undefined') return false;
        try {
            new QRCode(qrCodeContainer, {
                text: QUIZ_URL || window.location.href,
                width: 256,
                height: 256,
                colorDark: '#0d1117',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H,
            });
        } catch (err) {
            console.error(err);
            qrCodeContainer.textContent = 'Could not generate QR code.';
        }
        return true;
    };
    if (!tryGen()) {
        let n = 0;
        const t = setInterval(() => {
            n++;
            if (tryGen() || n >= 12) clearInterval(t);
        }, 200);
    }
}

function hideQRCode() {
    if (qrCodeModal) qrCodeModal.classList.add('hidden');
}

async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        if (!response.ok) throw new Error('Failed to load questions.json');
        const raw = await response.json();
        quizState.allQuestions = normalizeQuestionsFromJson(raw);
        if (!quizState.allQuestions.length) {
            throw new Error('No valid questions in questions.json');
        }
        totalQuestionsSpan.textContent = quizState.allQuestions.length;
    } catch (error) {
        console.error(error);
        if (questionText) {
            questionText.textContent = 'Could not load questions. Please refresh or check questions.json.';
        }
    }
}

function startQuiz() {
    const name = userNameInput.value.trim();
    if (!name) {
        if (nameError) {
            nameError.textContent = 'Please enter your name or initials to continue.';
            nameError.classList.remove('hidden');
        }
        return;
    }

    quizState.userName = name;
    quizState.userEmail = '';
    quizState.currentQuestionIndex = 0;
    quizState.answers = [];
    quizState.isCompleted = false;
    quizState.questions = [...quizState.allQuestions];

    totalQuestionsSpan.textContent = quizState.questions.length;

    startScreen.classList.remove('active');
    quizScreenEl.classList.add('active');

    displayQuestion();
}

function getAnswerForQuestion(questionIndex) {
    return quizState.answers.find((a) => a.questionIndex === questionIndex);
}

function saveAnswer(answer) {
    const i = quizState.answers.findIndex((a) => a.questionIndex === answer.questionIndex);
    if (i >= 0) quizState.answers[i] = answer;
    else quizState.answers.push(answer);
    quizState.answers.sort((a, b) => a.questionIndex - b.questionIndex);
}

function removeAnswerForQuestion(questionIndex) {
    quizState.answers = quizState.answers.filter((a) => a.questionIndex !== questionIndex);
}

function isFreeTextPanelOpen() {
    return freeTextPanel && !freeTextPanel.classList.contains('hidden');
}

function buildRankAnswer(question) {
    return {
        questionId: question.id,
        questionIndex: quizState.currentQuestionIndex,
        type: 'rank',
        rankedIndices: [...rankOrder],
        rankedLabels: rankOrder.map((i) => question.options[i]),
    };
}

function buildSingleAnswer(question, selectedIndex, freeText) {
    return {
        questionId: question.id,
        questionIndex: quizState.currentQuestionIndex,
        type: 'single',
        selectedIndex,
        selectedLabel: question.options[selectedIndex],
        freeText: freeText || undefined,
    };
}

function persistCurrentQuestionFromUI() {
    if (isFreeTextPanelOpen()) return;
    const q = quizState.questions[quizState.currentQuestionIndex];
    if (!q) return;
    if (q.type === 'rank') {
        if (rankOrder.length < 1) {
            removeAnswerForQuestion(quizState.currentQuestionIndex);
            return;
        }
        saveAnswer(buildRankAnswer(q));
    }
}

function currentQuestionHasAnswer() {
    if (isFreeTextPanelOpen()) return false;
    const q = quizState.questions[quizState.currentQuestionIndex];
    if (!q) return false;
    if (q.type === 'rank') return rankOrder.length >= 1;
    return !!getAnswerForQuestion(quizState.currentQuestionIndex);
}

function updateQuizNavButtons() {
    const idx = quizState.currentQuestionIndex;
    const total = quizState.questions.length;
    const isLast = idx >= total - 1;

    if (prevQuestionBtn) {
        prevQuestionBtn.disabled = idx <= 0 || isFreeTextPanelOpen();
    }
    if (nextQuestionBtn) {
        nextQuestionBtn.disabled = !currentQuestionHasAnswer();
    }
    if (nextQuestionLabel) {
        nextQuestionLabel.textContent = isLast ? 'Finish' : 'Next';
    }
    if (nextQuestionBtn) {
        nextQuestionBtn.setAttribute('aria-label', isLast ? 'Finish poll' : 'Next question');
    }
}

function applySavedAnswerToUI(question, saved) {
    if (!saved) return;
    if (saved.type === 'rank') {
        updateRankButtonStates();
    } else if (saved.type === 'single') {
        optionsContainer.querySelectorAll('.option-btn').forEach((btn, i) => {
            btn.classList.toggle('single-picked', i === saved.selectedIndex);
        });
    }
}

function goToPreviousQuestion() {
    if (quizState.currentQuestionIndex <= 0 || isFreeTextPanelOpen()) return;
    persistCurrentQuestionFromUI();
    quizState.currentQuestionIndex--;
    displayQuestion();
}

function goToNextQuestion() {
    if (!currentQuestionHasAnswer() || isFreeTextPanelOpen()) return;
    persistCurrentQuestionFromUI();
    quizState.currentQuestionIndex++;
    displayQuestion();
}

function displayQuestion() {
    hideFreeTextPanel();

    if (quizState.currentQuestionIndex >= quizState.questions.length) {
        showResults();
        return;
    }

    const q = quizState.questions[quizState.currentQuestionIndex];
    const saved = getAnswerForQuestion(quizState.currentQuestionIndex);

    if (q.type === 'rank') {
        rankOrder = saved?.type === 'rank' ? [...saved.rankedIndices] : [];
        if (rankFooter) rankFooter.classList.remove('hidden');
    } else {
        rankOrder = [];
        if (rankFooter) rankFooter.classList.add('hidden');
    }

    currentQuestionSpan.textContent = quizState.currentQuestionIndex + 1;
    const progress = ((quizState.currentQuestionIndex + 1) / quizState.questions.length) * 100;
    progressBar.style.width = `${progress}%`;

    questionText.textContent = q.question;
    updateQuizLayoutDenseClass(q);

    optionsContainer.innerHTML = '';

    if (q.type === 'rank') {
        q.options.forEach((label, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'option-btn';
            button.textContent = label;
            button.dataset.index = String(index);
            button.addEventListener('click', () => onRankOptionClick(index, q));
            optionsContainer.appendChild(button);
        });
        updateRankButtonStates();
    } else {
        q.options.forEach((label, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'option-btn';
            button.textContent = label;
            button.addEventListener('click', () => onSingleOptionClick(index, q));
            optionsContainer.appendChild(button);
        });
    }

    applySavedAnswerToUI(q, saved);
    updateQuizNavButtons();
}

function onRankOptionClick(optionIndex, question) {
    const pos = rankOrder.indexOf(optionIndex);
    if (pos !== -1) {
        rankOrder.splice(pos, 1);
    } else if (rankOrder.length < 3) {
        rankOrder.push(optionIndex);
    }
    updateRankButtonStates();
    persistCurrentQuestionFromUI();
    updateQuizNavButtons();
}

function updateRankButtonStates() {
    const buttons = optionsContainer.querySelectorAll('.option-btn');
    buttons.forEach((btn) => {
        btn.classList.remove('rank-1', 'rank-2', 'rank-3', 'selected');
        const idx = parseInt(btn.dataset.index, 10);
        const r = rankOrder.indexOf(idx);
        if (r === 0) btn.classList.add('rank-1');
        else if (r === 1) btn.classList.add('rank-2');
        else if (r === 2) btn.classList.add('rank-3');
    });
}

let pendingSingle = null;

function onSingleOptionClick(selectedIndex, question) {
    const buttons = optionsContainer.querySelectorAll('.option-btn');
    const label = question.options[selectedIndex];

    if (optionNeedsFreeText(label)) {
        pendingSingle = { selectedIndex, question, label };
        buttons.forEach((b, i) => {
            b.classList.toggle('single-picked', i === selectedIndex);
        });
        showFreeTextPanel(label);
        updateQuizNavButtons();
        return;
    }

    hideFreeTextPanel();
    finalizeSingleAnswer(selectedIndex, question, '');
}

function showFreeTextPanel(forLabel) {
    if (!freeTextPanel || !freeTextInput) return;
    freeTextLabel.textContent = 'Add a short note (optional)';
    const saved = getAnswerForQuestion(quizState.currentQuestionIndex);
    const sameOption =
        saved?.type === 'single' &&
        pendingSingle &&
        saved.selectedIndex === pendingSingle.selectedIndex;
    freeTextInput.value = sameOption && saved.freeText ? saved.freeText : '';
    freeTextPanel.classList.remove('hidden');
    freeTextInput.focus();
    updateQuizNavButtons();
}

function hideFreeTextPanel() {
    if (freeTextPanel) freeTextPanel.classList.add('hidden');
    pendingSingle = null;
}

function submitFreeTextAndAdvance() {
    if (!pendingSingle) return;
    const extra = freeTextInput ? freeTextInput.value.trim() : '';
    const { selectedIndex, question } = pendingSingle;
    hideFreeTextPanel();
    finalizeSingleAnswer(selectedIndex, question, extra);
}

function finalizeSingleAnswer(selectedIndex, question, freeText) {
    const buttons = optionsContainer.querySelectorAll('.option-btn');
    buttons.forEach((b, i) => {
        b.classList.toggle('single-picked', i === selectedIndex);
    });

    saveAnswer(buildSingleAnswer(question, selectedIndex, freeText));
    updateQuizNavButtons();
}

function showResults() {
    quizScreenEl.classList.remove('active');
    if (resultsScreen) resultsScreen.classList.remove('active');
    if (emailScreen) {
        emailScreen.classList.add('active');
        if (userEmailInput) userEmailInput.value = '';
        if (emailError) emailError.classList.add('hidden');
    }
    if (homeBtn) homeBtn.classList.add('hidden');
    document.body.classList.remove('thank-you-mode');
}

function showThankYouScreen() {
    document.body.classList.add('thank-you-mode');
    if (emailScreen) emailScreen.classList.remove('active');
    if (resultsScreen) resultsScreen.classList.add('active');
    if (resultUserName) resultUserName.textContent = quizState.userName;
    if (submitStatus) {
        submitStatus.textContent = '';
        submitStatus.className = 'submit-status';
    }
    if (homeBtn) homeBtn.classList.remove('hidden');
}

function buildPayload(completed) {
    const total = quizState.questions.length;
    const answered = quizState.answers.length;
    return {
        projectId: PROJECT_ID,
        userName: quizState.userName,
        email: quizState.userEmail || '',
        answeredCount: answered,
        pollTotal: total,
        timestamp: new Date().toISOString(),
        answers: quizState.answers,
        completed,
    };
}

function submitIncompleteQuiz() {
    if (!quizState.userName || quizState.answers.length < 2 || quizState.isCompleted) return;
    const payload = buildPayload(false);
    fetch(quizState.googleAppsScriptUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        mode: 'no-cors',
        keepalive: true,
    }).catch((err) => console.error(err));
}

function submitIncompleteQuizSync() {
    if (!quizState.userName || quizState.answers.length < 2 || quizState.isCompleted) return;
    const payload = buildPayload(false);
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', quizState.googleAppsScriptUrl, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(payload));
    } catch (err) {
        console.error(err);
    }
}

async function submitPollCompletion() {
    if (
        !quizState.googleAppsScriptUrl ||
        quizState.googleAppsScriptUrl === 'YOUR_APP_SCRIPT_URL_HERE' ||
        quizState.googleAppsScriptUrl === 'TBD'
    ) {
        submitStatus.textContent =
            'Responses could not be sent: configure the Google Apps Script URL in script.js.';
        submitStatus.classList.add('error');
        return;
    }

    try {
        await fetch(quizState.googleAppsScriptUrl, {
            method: 'POST',
            body: JSON.stringify(buildPayload(true)),
            mode: 'no-cors',
        });
        submitStatus.textContent = 'Your responses were submitted. Thank you.';
        submitStatus.classList.add('success');
    } catch (error) {
        console.error(error);
        submitStatus.textContent = 'Something went wrong while sending responses. Staff can still use on-device notes if needed.';
        submitStatus.classList.add('error');
    }
}

function goHome() {
    quizState.currentQuestionIndex = 0;
    quizState.answers = [];
    quizState.userEmail = '';
    quizState.isCompleted = false;
    userNameInput.value = '';
    if (submitStatus) {
        submitStatus.textContent = '';
        submitStatus.className = 'submit-status';
    }
    hideFreeTextPanel();
    rankOrder = [];
    document.body.classList.remove('thank-you-mode');
    if (homeBtn) homeBtn.classList.add('hidden');

    if (resultsScreen) resultsScreen.classList.remove('active');
    if (emailScreen) emailScreen.classList.remove('active');
    if (quizScreenEl) quizScreenEl.classList.remove('active');
    startScreen.classList.add('active');
    userNameInput.focus();
}
