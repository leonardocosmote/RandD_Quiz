// State Management
let quizState = {
    questions: [],
    currentQuestionIndex: 0,
    userName: '',
    score: 0,
    answers: [], // Track user answers
    isCompleted: false, // Track if quiz was completed
    googleAppsScriptUrl: 'https://script.google.com/macros/s/AKfycbzV4METVPHfnwMna8VsBDMskn8cZ9-Lokj_-SQHLPABGkBcC_oNn2LjcoUXs6EncHloDg/exec' // old: https://script.google.com/macros/s/AKfycbxc99n668g30Tt35xUCWyHIWy2S4NGlpZ-pLkjqdkAFgKNcra1RgCwsfno81vreD4-JAQ/exec
};

// DOM Elements
const startScreen = document.getElementById('startScreen');
const quizScreen = document.getElementById('quizScreen');
const resultsScreen = document.getElementById('resultsScreen');

const userNameInput = document.getElementById('userName');
const startBtn = document.getElementById('startBtn');
const submitBtn = document.getElementById('submitBtn');
const retryBtn = document.getElementById('retryBtn');
const nameError = document.getElementById('nameError');

const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('optionsContainer');
const feedbackContainer = document.getElementById('feedbackContainer'); // New element added
const feedbackText = document.getElementById('feedbackText'); // New element added
const progressBar = document.querySelector('.progress-fill');
const currentQuestionSpan = document.getElementById('currentQuestion');
const totalQuestionsSpan = document.getElementById('totalQuestions');
const currentScoreSpan = document.getElementById('currentScore'); // New element added

const resultUserName = document.getElementById('resultUserName');
const finalScore = document.getElementById('final-score');
const totalScore = document.getElementById('totalScore');
const percentage = document.getElementById('percentage');
const submitStatus = document.getElementById('submitStatus');

// QR Code elements
const qrCodeBtn = document.getElementById('qrCodeBtn');
const qrCodeModal = document.getElementById('qrCodeModal');
const qrModalClose = document.getElementById('qrModalClose');
const qrCodeContainer = document.getElementById('qrcode');

// QR Code URL
const QUIZ_URL = 'https://leonardocosmote.github.io/quiz/';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadQuestions();
    attachEventListeners();
    setupIncompleteQuizTracking();
    setupQRCode();
});

// Track incomplete quizzes when user leaves
function setupIncompleteQuizTracking() {
    // Track when user leaves/closes the page
    window.addEventListener('beforeunload', (e) => {
        // Only submit if user has answered at least 3 questions
        if (quizState.userName && quizState.answers.length >= 3 && !quizState.isCompleted) {
            // Use synchronous XMLHttpRequest for beforeunload (most reliable)
            submitIncompleteQuizSync();
        }
    });

    // Also track visibility change (tab switch, minimize, etc.)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && quizState.userName && quizState.answers.length >= 3 && !quizState.isCompleted) {
            // Use fetch with keepalive for visibility change
            submitIncompleteQuiz();
        }
    });
}

// Event Listeners
function attachEventListeners() {
    startBtn.addEventListener('click', startQuiz);
    // submitBtn.addEventListener('click', submitScore);
    retryBtn.addEventListener('click', retakeQuiz);

    // Clear inline error as user types and prevent numbers
    if (userNameInput && nameError) {
        userNameInput.addEventListener('input', (e) => {
            // Remove any numbers from the input immediately
            if (/\d/.test(e.target.value)) {
                e.target.value = e.target.value.replace(/\d/g, '');
                nameError.textContent = 'Το όνομά σου δεν πρέπει να περιέχει αριθμούς!';
                nameError.classList.remove('hidden');
            } else {
                nameError.classList.add('hidden');
            }
        });
    }
}

// Setup QR Code functionality
function setupQRCode() {
    if (!qrCodeBtn || !qrCodeModal || !qrModalClose) return;

    // Open modal when button is clicked
    qrCodeBtn.addEventListener('click', () => {
        showQRCode();
    });

    // Close modal when X is clicked
    qrModalClose.addEventListener('click', () => {
        hideQRCode();
    });

    // Close modal when clicking outside
    qrCodeModal.addEventListener('click', (e) => {
        if (e.target === qrCodeModal) {
            hideQRCode();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !qrCodeModal.classList.contains('hidden')) {
            hideQRCode();
        }
    });
}

// Show QR Code modal and generate QR code
function showQRCode() {
    if (!qrCodeModal || !qrCodeContainer) return;

    // Clear previous QR code
    qrCodeContainer.innerHTML = '';

    // Show modal first
    qrCodeModal.classList.remove('hidden');

    // Check if library is loaded
    if (typeof QRCode === 'undefined') {
        // Try waiting a bit for library to load
        let attempts = 0;
        const maxAttempts = 10;

        const checkLibrary = setInterval(() => {
            attempts++;
            if (typeof QRCode !== 'undefined') {
                clearInterval(checkLibrary);
                generateQRCode();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkLibrary);
                qrCodeContainer.innerHTML = '<p style="color: #f85149; padding: 20px;">QR Code library failed to load.<br>Please check your internet connection and refresh the page.</p>';
            }
        }, 200);
    } else {
        generateQRCode();
    }

    function generateQRCode() {
        try {
            // Use QRCode.js library
            new QRCode(qrCodeContainer, {
                text: QUIZ_URL,
                width: 256,
                height: 256,
                colorDark: '#0d1117',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
        } catch (error) {
            console.error('QR Code generation error:', error);
            qrCodeContainer.innerHTML = '<p style="color: #f85149; padding: 20px;">Error generating QR code.<br>Please try again.</p>';
        }
    }
}

// Hide QR Code modal
function hideQRCode() {
    if (qrCodeModal) {
        qrCodeModal.classList.add('hidden');
    }
}

// Load Questions from JSON
async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        if (!response.ok) {
            throw new Error('Failed to load questions');
        }
        quizState.allQuestions = await response.json(); // Store all questions separately

        // Initial display for total questions before starting
        const initialTotal = Math.min(10, quizState.allQuestions.length);
        totalQuestionsSpan.textContent = initialTotal;
        totalScore.textContent = initialTotal;
    } catch (error) {
        console.error('Error loading questions:', error);
        questionText.textContent = 'Error loading quiz. Please refresh the page.';
    }
}

// Randomize Array (Fisher-Yates Shuffle)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Start Quiz
function startQuiz() {
    const name = userNameInput.value.trim();

    if (!name) {
        if (nameError) {
            nameError.textContent = 'Παρακαλούμε γράψε το όνομά σου πριν ξεκινήσεις το quiz!';
            nameError.classList.remove('hidden');
        }
        return;
    }

    if (/\d/.test(name)) {
        if (nameError) {
            nameError.textContent = 'Το όνομά σου δεν πρέπει να περιέχει αριθμούς!';
            nameError.classList.remove('hidden');
        }
        return;
    }

    quizState.userName = name;
    quizState.score = 0;
    quizState.currentQuestionIndex = 0;
    quizState.answers = [];
    quizState.isCompleted = false;
    if (currentScoreSpan) currentScoreSpan.textContent = "0";

    // Randomize all questions and take up to 10
    const shuffledQuestions = shuffleArray(quizState.allQuestions);
    quizState.questions = shuffledQuestions.slice(0, 10);

    // Update the UI with the actual number of questions for this round
    totalQuestionsSpan.textContent = quizState.questions.length;
    totalScore.textContent = quizState.questions.length;

    // Show quiz screen
    startScreen.classList.remove('active');
    quizScreen.classList.add('active');

    // Display first question
    displayQuestion();
}

// Display Current Question
function displayQuestion() {
    if (quizState.currentQuestionIndex >= quizState.questions.length) {
        showResults();
        return;
    }

    const question = quizState.questions[quizState.currentQuestionIndex];

    // Update counter and progress
    currentQuestionSpan.textContent = quizState.currentQuestionIndex + 1;
    const progress = ((quizState.currentQuestionIndex + 1) / quizState.questions.length) * 100;
    progressBar.style.width = progress + '%';

    // Display question
    questionText.textContent = question.question;

    // Hide feedback from previous question
    if (feedbackContainer) {
        feedbackContainer.className = 'feedback-box hidden';
        feedbackText.textContent = '';
    }

    // Display options
    optionsContainer.innerHTML = '';
    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.textContent = option;
        button.addEventListener('click', () => selectAnswer(index, question.correctIndex));
        optionsContainer.appendChild(button);
    });
}

// Select Answer
function selectAnswer(selectedIndex, correctIndex) {
    const optionButtons = document.querySelectorAll('.option-btn');

    // Disable all buttons
    optionButtons.forEach(btn => btn.disabled = true);

    // Track answer
    quizState.answers.push({
        questionIndex: quizState.currentQuestionIndex,
        selectedIndex: selectedIndex,
        correctIndex: correctIndex,
        isCorrect: selectedIndex === correctIndex
    });

    // Show feedback
    const question = quizState.questions[quizState.currentQuestionIndex];
    optionButtons[correctIndex].classList.add('correct');

    if (selectedIndex !== correctIndex) {
        optionButtons[selectedIndex].classList.add('wrong');
        if (feedbackContainer) {
            feedbackContainer.className = 'feedback-box wrong';
            feedbackText.textContent = question.feedbackWrong || 'Λάθος απάντηση!';
        }
    } else {
        quizState.score++;
        if (feedbackContainer) {
            feedbackContainer.className = 'feedback-box correct';
            feedbackText.textContent = question.feedbackCorrect || 'Σωστά!';
        }
    }

    if (currentScoreSpan) currentScoreSpan.textContent = quizState.score;

    // Move to next question after delay
    setTimeout(() => {
        quizState.currentQuestionIndex++;
        displayQuestion();
    }, 5000); // Increased delay to 8 seconds so user can deeply read feedback
}

// Show Results
function showResults() {
    quizScreen.classList.remove('active');
    resultsScreen.classList.add('active');

    resultUserName.textContent = quizState.userName;
    finalScore.textContent = quizState.score;

    const percentageValue = Math.round((quizState.score / quizState.questions.length) * 100);
    percentage.textContent = `${percentageValue}% Σωστές απαντήσεις`;
    submitStatus.innerHTML = '';
    submitStatus.className = 'submit-status';

    // Mark as completed before submitting
    quizState.isCompleted = true;

    // Automatically submit score at the end of the quiz
    submitScore();
}

// Submit incomplete quiz (when user leaves before finishing) - async version
function submitIncompleteQuiz() {
    if (!quizState.userName || quizState.answers.length < 3 || quizState.isCompleted) {
        return;
    }

    const payload = {
        userName: quizState.userName,
        score: quizState.score,
        totalQuestions: quizState.answers.length, // Actual questions answered, not total
        percentage: Math.round((quizState.score / quizState.answers.length) * 100),
        timestamp: new Date().toISOString(),
        answers: quizState.answers,
        completed: false // Mark as incomplete
    };

    const payloadString = JSON.stringify(payload);

    // Use fetch with keepalive for reliable submission
    fetch(quizState.googleAppsScriptUrl, {
        method: 'POST',
        body: payloadString,
        mode: 'no-cors',
        keepalive: true // Keep request alive even if page is closing
    }).catch(err => console.error('Error submitting incomplete quiz:', err));
}

// Submit incomplete quiz synchronously (for beforeunload - most reliable)
function submitIncompleteQuizSync() {
    if (!quizState.userName || quizState.answers.length < 3 || quizState.isCompleted) {
        return;
    }

    const payload = {
        userName: quizState.userName,
        score: quizState.score,
        totalQuestions: quizState.answers.length,
        percentage: Math.round((quizState.score / quizState.answers.length) * 100),
        timestamp: new Date().toISOString(),
        answers: quizState.answers,
        completed: false
    };

    const payloadString = JSON.stringify(payload);

    // Use synchronous XMLHttpRequest for beforeunload (most reliable for page unload)
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', quizState.googleAppsScriptUrl, false); // false = synchronous
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(payloadString);
    } catch (err) {
        console.error('Error submitting incomplete quiz (sync):', err);
    }
}

// Submit Score to Google Sheet
async function submitScore() {
    // Make sure user added URL
    if (quizState.googleAppsScriptUrl === 'YOUR_APP_SCRIPT_URL_HERE') {
        alert('Error: The Google Apps Script URL has not been configured in script.js');
        return;
    }

    // Disable button and show loading
    // submitBtn.disabled = true;
    // submitStatus.textContent = 'Submitting...';
    // submitStatus.className = 'submit-status';

    try {
        const payload = {
            userName: quizState.userName,
            score: quizState.score,
            totalQuestions: quizState.questions.length,
            percentage: Math.round((quizState.score / quizState.questions.length) * 100),
            timestamp: new Date().toISOString(),
            answers: quizState.answers,
            completed: true // Mark as completed
        };

        // NOTE: Submission happens silently in the background at the end of the quiz.
        // The user is not notified and is not redirected automatically.
        const response = await fetch(quizState.googleAppsScriptUrl, {
            method: 'POST',
            body: JSON.stringify(payload),
            mode: 'no-cors'
        });

        submitStatus.innerHTML = submitStatus.innerHTML + '<br>✓ Ευχαριστούμε που συμμετείχες!';
        // submitStatus.className = 'submit-status success';

        // setTimeout(() => {
        //     retakeQuiz();
        // }, 2000);
    } catch (error) {
        console.error('Error submitting score:', error);
        // submitStatus.textContent = '✗ Error submitting score. Please try again.';
        // submitStatus.className = 'submit-status error';
        // submitBtn.disabled = false;
    }
}

// Retake Quiz
function retakeQuiz() {

    // Reset state
    quizState.currentQuestionIndex = 0;
    quizState.score = 0;
    quizState.answers = [];
    quizState.isCompleted = false;
    userNameInput.value = '';
    submitStatus.textContent = '';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Score';

    // Show start screen
    resultsScreen.classList.remove('active');
    startScreen.classList.add('active');
    userNameInput.focus();
}
