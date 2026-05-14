// =============================================================================
// 6G-EWOC tablet poll — questions loaded from questions.json (no right/wrong).
// =============================================================================

const PROJECT_ID = '6G-EWOC';

const FALLBACK_FEEDBACK = [
    'Thank you — your answer is noted.',
    'Thanks — we have recorded your response.',
    'Noted. Your input helps shape how we read these results.',
];

let quizState = {
    questions: [],
    allQuestions: [],
    currentQuestionIndex: 0,
    userName: '',
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
const retryBtn = document.getElementById('retryBtn');
const nameError = document.getElementById('nameError');

const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('optionsContainer');
const feedbackContainer = document.getElementById('feedbackContainer');
const feedbackText = document.getElementById('feedbackText');
const progressBar = document.querySelector('.progress-fill');
const currentQuestionSpan = document.getElementById('currentQuestion');
const totalQuestionsSpan = document.getElementById('totalQuestions');

const resultUserName = document.getElementById('resultUserName');
const submitStatus = document.getElementById('submitStatus');
const thankYouBlock = document.getElementById('thankYouBlock');

const rankFooter = document.getElementById('rankFooter');
const rankConfirmBtn = document.getElementById('rankConfirmBtn');
const freeTextPanel = document.getElementById('freeTextPanel');
const freeTextInput = document.getElementById('freeTextInput');
const freeTextLabel = document.getElementById('freeTextLabel');
const freeTextContinueBtn = document.getElementById('freeTextContinueBtn');
const freeTextBackBtn = document.getElementById('freeTextBackBtn');

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
                type = id >= 2 && id <= 9 ? 'rank' : 'single';
            }
            const options = Array.isArray(item.options) ? item.options.map((o) => String(o)) : [];
            let feedback = Array.isArray(item.feedback) ? item.feedback.map((f) => String(f).trim()) : [];
            if (feedback.length > options.length) feedback = feedback.slice(0, options.length);
            return {
                id,
                question: String(item.question || '').trim(),
                options,
                type,
                feedback,
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
    if (rankConfirmBtn) {
        rankConfirmBtn.addEventListener('click', confirmRankAndAdvance);
    }
    if (freeTextContinueBtn) {
        freeTextContinueBtn.addEventListener('click', submitFreeTextAndAdvance);
    }
    if (freeTextBackBtn) {
        freeTextBackBtn.addEventListener('click', cancelFreeTextAndReopenOptions);
    }
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (
            freeTextPanel &&
            pendingSingle &&
            !freeTextPanel.classList.contains('hidden')
        ) {
            e.preventDefault();
            cancelFreeTextAndReopenOptions();
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
    retryBtn.addEventListener('click', retakeQuiz);
    if (userNameInput && nameError) {
        userNameInput.addEventListener('input', () => {
            nameError.classList.add('hidden');
        });
    }
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
    quizState.currentQuestionIndex = 0;
    quizState.answers = [];
    quizState.isCompleted = false;
    quizState.questions = [...quizState.allQuestions];

    totalQuestionsSpan.textContent = quizState.questions.length;

    startScreen.classList.remove('active');
    quizScreenEl.classList.add('active');

    displayQuestion();
}

/** Per-option copy from questions.json; uses top rank (#1) or single selection. */
function getFeedbackForPrimaryChoice(question, optionIndex) {
    const fb = question.feedback;
    if (
        Array.isArray(fb) &&
        optionIndex >= 0 &&
        optionIndex < fb.length &&
        fb[optionIndex]
    ) {
        return fb[optionIndex];
    }
    return FALLBACK_FEEDBACK[Math.floor(Math.random() * FALLBACK_FEEDBACK.length)];
}

function displayQuestion() {
    hideFreeTextPanel();
    if (rankFooter) rankFooter.classList.add('hidden');
    rankOrder = [];

    if (quizState.currentQuestionIndex >= quizState.questions.length) {
        showResults();
        return;
    }

    const q = quizState.questions[quizState.currentQuestionIndex];
    currentQuestionSpan.textContent = quizState.currentQuestionIndex + 1;
    const progress = ((quizState.currentQuestionIndex + 1) / quizState.questions.length) * 100;
    progressBar.style.width = `${progress}%`;

    questionText.textContent = q.question;
    updateQuizLayoutDenseClass(q);

    if (feedbackContainer) {
        feedbackContainer.className = 'feedback-box hidden';
        feedbackText.textContent = '';
    }

    optionsContainer.innerHTML = '';

    if (q.type === 'rank') {
        if (rankFooter) rankFooter.classList.remove('hidden');
        if (rankConfirmBtn) rankConfirmBtn.disabled = rankOrder.length < 1;
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
}

function onRankOptionClick(optionIndex, question) {
    const pos = rankOrder.indexOf(optionIndex);
    if (pos !== -1) {
        rankOrder.splice(pos, 1);
    } else if (rankOrder.length < 3) {
        rankOrder.push(optionIndex);
    }
    updateRankButtonStates();
    if (rankConfirmBtn) rankConfirmBtn.disabled = rankOrder.length < 1;
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

function confirmRankAndAdvance() {
    const q = quizState.questions[quizState.currentQuestionIndex];
    if (q.type !== 'rank' || rankOrder.length < 1) return;

    const rankedTexts = rankOrder.map((i) => q.options[i]);
    quizState.answers.push({
        questionId: q.id,
        questionIndex: quizState.currentQuestionIndex,
        type: 'rank',
        rankedIndices: [...rankOrder],
        rankedLabels: rankedTexts,
    });

    if (rankConfirmBtn) rankConfirmBtn.disabled = true;
    const buttons = optionsContainer.querySelectorAll('.option-btn');
    buttons.forEach((b) => (b.disabled = true));

    if (feedbackContainer) {
        feedbackContainer.className = 'feedback-box info';
        feedbackText.textContent = getFeedbackForPrimaryChoice(q, rankOrder[0]);
    }

    setTimeout(() => {
        quizState.currentQuestionIndex++;
        displayQuestion();
    }, 2200);
}

let pendingSingle = null;

function onSingleOptionClick(selectedIndex, question) {
    const buttons = optionsContainer.querySelectorAll('.option-btn');
    const label = question.options[selectedIndex];

    if (optionNeedsFreeText(label)) {
        pendingSingle = { selectedIndex, question, label };
        buttons.forEach((b, i) => {
            b.disabled = true;
            b.classList.toggle('single-picked', i === selectedIndex);
        });
        showFreeTextPanel(label);
        return;
    }

    finalizeSingleAnswer(selectedIndex, question, '');
}

function showFreeTextPanel(forLabel) {
    if (!freeTextPanel || !freeTextInput) return;
    freeTextLabel.textContent = 'Add a short note (optional)';
    freeTextInput.value = '';
    freeTextPanel.classList.remove('hidden');
    freeTextInput.focus();
}

function hideFreeTextPanel() {
    if (freeTextPanel) freeTextPanel.classList.add('hidden');
    pendingSingle = null;
}

/** Close optional-text step and pick another option (Q10 Other / Q11 self-describe). */
function cancelFreeTextAndReopenOptions() {
    pendingSingle = null;
    if (freeTextInput) freeTextInput.value = '';
    if (freeTextPanel) freeTextPanel.classList.add('hidden');
    optionsContainer.querySelectorAll('.option-btn').forEach((b) => {
        b.disabled = false;
        b.classList.remove('single-picked');
    });
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
        b.disabled = true;
        b.classList.toggle('single-picked', i === selectedIndex);
    });

    quizState.answers.push({
        questionId: question.id,
        questionIndex: quizState.currentQuestionIndex,
        type: 'single',
        selectedIndex,
        selectedLabel: question.options[selectedIndex],
        freeText: freeText || undefined,
    });

    if (feedbackContainer) {
        feedbackContainer.className = 'feedback-box info';
        feedbackText.textContent = getFeedbackForPrimaryChoice(question, selectedIndex);
    }

    setTimeout(() => {
        quizState.currentQuestionIndex++;
        displayQuestion();
    }, 2200);
}

function showResults() {
    quizScreenEl.classList.remove('active');
    resultsScreen.classList.add('active');

    resultUserName.textContent = quizState.userName;
    if (thankYouBlock) thankYouBlock.classList.remove('hidden');
    submitStatus.textContent = '';
    submitStatus.className = 'submit-status';

    quizState.isCompleted = true;
    submitPollCompletion();
}

function buildPayload(completed) {
    const total = quizState.questions.length;
    const answered = quizState.answers.length;
    return {
        projectId: PROJECT_ID,
        userName: quizState.userName,
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

function retakeQuiz() {
    quizState.currentQuestionIndex = 0;
    quizState.answers = [];
    quizState.isCompleted = false;
    userNameInput.value = '';
    submitStatus.textContent = '';
    submitStatus.className = 'submit-status';
    hideFreeTextPanel();
    rankOrder = [];
    if (thankYouBlock) thankYouBlock.classList.add('hidden');

    resultsScreen.classList.remove('active');
    startScreen.classList.add('active');
    userNameInput.focus();
}
