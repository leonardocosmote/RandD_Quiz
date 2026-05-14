# Quiz Web App - EWOC

This Quiz regards the **EWOC** version. Questions are altered and mechanisms to facilitate a 'non orrect answer' logic to follow the quest needs.

A responsive, interactive quiz application with question randomization, score tracking, and automatic result submission to Google Sheets.

## Features

✅ **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices  
✅ **Question Randomization** - Questions are shuffled on every page load  
✅ **Real-time Feedback** - Animated correct/incorrect feedback for each answer  
✅ **Progress Tracking** - Visual progress bar and question counter  
✅ **Score Calculation** - Secure client-side score calculation  
✅ **User Tracking** - Captures user name at the start of quiz  
✅ **Google Sheets Integration** - Automatically saves results to a Google Sheet  
✅ **Modern UI** - Beautiful card-based layout with smooth animations  

## Project Structure

```
quiz/
├── index.html                      # Main HTML file
├── styles.css                      # CSS styling (responsive, animations)
├── script.js                       # Quiz logic (fetch, shuffle, score tracking)
├── questions.json                  # Sample quiz questions
├── GoogleAppsScript-Template.gs    # Google Apps Script backend template
└── README.md                       # This file
```

## File Descriptions

### index.html
- Three screens: Start (name input), Quiz (questions), Results (score + submit)
- Clean semantic HTML structure
- Responsive meta viewport tag

### styles.css
- **Gradient background** with purple/blue color scheme
- **Card layout** with shadow effects and animations
- **Progress bar** that fills as user progresses through quiz
- **Responsive buttons** with hover states and feedback animations
- **Mobile-first responsive design** (media queries for devices < 600px)
- **Animations**: fadeIn, slideUp, correctPulse, incorrectShake

### script.js
- **Fetch API**: Loads questions.json asynchronously
- **Shuffle algorithm**: Fisher-Yates shuffle for random question order
- **State management**: Tracks current question, score, answers, and user name
- **Answer validation**: Checks selected answer against correct index
- **Feedback animations**: Shows correct/incorrect visual feedback
- **Google Sheets submission**: POSTs quiz results to Google Apps Script URL

### questions.json
Sample questions with structure:
```json
{
  "question": "Question text?",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "correctIndex": 2
}
```

### GoogleAppsScript-Template.gs
Google Apps Script code that:
- Receives POST requests from the quiz app
- Creates/initializes a Google Sheet with headers
- Stores user name, score, and timestamp
- Includes error handling and response logging
- Optional analytics sheet creation

## Setup Instructions

### 1. Set Up Google Sheet & Apps Script

#### Step 1: Create a Google Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet and name it "Quiz Results" (or any name)
3. Keep the sheet open for the next steps

#### Step 2: Create Google Apps Script Web App
1. In your Google Sheet, click **Extensions > Apps Script**
2. A new tab will open with the Script Editor
3. Delete any existing code
4. **Copy and paste the entire code** from `GoogleAppsScript-Template.gs`
5. Click **Save** (icon or Ctrl+S)

#### Step 3: Deploy as Web App
1. Click **Deploy** > **New Deployment** (or + icon)
2. Select deployment type: **Web App**
3. Configure:
   - **Execute as**: Your Google account email
   - **Who has access**: "Anyone"
4. Click **Deploy**
5. Copy the **Deployment URL** (it looks like: `https://script.google.com/macros/s/.../exec`)
6. Click **Authorize** and grant permission to the script

#### Step 4: Connect Quiz App to Google Sheet
1. Open `script.js` in your code editor
2. Find line 8: `googleAppsScriptUrl: 'YOUR_APP_SCRIPT_URL_HERE'`
3. Replace `'YOUR_APP_SCRIPT_URL_HERE'` with the Web App URL you just copied
4. Save the file. The data will now be sent here automatically when users click "Submit Score"!

### 2. Deploy on GitHub Pages

#### Option A: Using Git Command Line
```bash
git init
git add .
git commit -m "Configure Google Apps Script URL"
git branch -M main
git remote add origin https://github.com/your-username/quiz.git
git push -u origin main
```
Then go to **Settings > Pages** in your repo. Under "Build and deployment", select **Deploy from a branch** (`main` branch, `/ (root)` folder) and save.

#### Option B: Using GitHub Web Interface
1. Create a new GitHub repository named `quiz`
2. Click **Add file > Upload files** and push all your files
3. Go to **Settings > Pages**
4. Under "Build and deployment", select **Deploy from a branch**
5. Select branch `main` and folder `/ (root)`
6. Your quiz will be live at: `https://your-username.github.io/quiz/`

## Question Format

Edit `questions.json` to customize questions:

```json
[
  {
    "question": "Your question here?",
    "options": ["Wrong 1", "Wrong 2", "Correct Answer", "Wrong 3"],
    "correctIndex": 2
  }
]
```

**Important**: `correctIndex` is **zero-based** (0 = first option, 1 = second, etc.)

## How It Works

### Frontend Flow
1. User enters name → Click "Start Quiz"
2. Questions load from `questions.json`
3. Questions are randomized using Fisher-Yates shuffle
4. One question displayed at a time with 4 options
5. User clicks option → Visual feedback (green for correct, red for incorrect)
6. After 1.5 seconds → Next question appears
7. Progress bar fills as user progresses
8. After last question → Results screen shows score and percentage
9. User clicks "Submit Score" → Data sent to Google Apps Script → Saved to Google Sheet

### Data Flow
```
Quiz App (client-side)
  ↓ (Fetch)
questions.json (local)
  ↓
User answers questions
  ↓ (Score calculated in browser)
Results displayed
  ↓ (POST request - no-cors mode)
Google Apps Script Web App
  ↓
Receives data & stores in Google Sheet
```

### Security Notes
✅ Score is calculated in the browser (user cannot manipulate it without console access)  
✅ Final submission happens only once at the end  
✅ Google Apps Script URL is privately hardcoded, hiding sheet access from public users  
✅ Uses `no-cors` mode to prevent CORS issues with Google Apps Script  
✅ All data is sent over HTTPS when using Google's services  

## Customization

### Change Color Scheme
Edit these colors in `styles.css`:
- Primary: `#667eea` and `#764ba2` (purple/blue gradient)
- Success: `#4caf50` (green)
- Error: `#f44336` (red)

### Adjust Question Timing
In `script.js`, line ~170, change the setTimeout delay:
```javascript
setTimeout(() => {
  quizState.currentQuestionIndex++;
  displayQuestion();
}, 1500); // Change 1500 (milliseconds) as needed
```

### Add More Questions
Simply add objects to `questions.json`:
```json
[
  { "question": "...", "options": [...], "correctIndex": 0 },
  { "question": "...", "options": [...], "correctIndex": 2 },
  ...
]
```

### Analyze Results in Google Sheet
The script stores:
- **Timestamp**: When the quiz was submitted
- **User Name**: Name entered at start
- **Score**: Number of correct answers
- **Total Questions**: Total questions in quiz
- **Percentage**: Percentage score (0-100)
- **Answers JSON**: Detailed answer data (all selections and correctness)

Create pivot tables or charts in Google Sheets to analyze results!

## Browser Compatibility

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Android)

## Troubleshooting

### "Error loading quiz. Please refresh the page."
- Check that `questions.json` is in the same folder as `index.html`
- Check browser console (F12) for specific errors
- Ensure JSON syntax is valid (use [jsonlint.com](https://jsonlint.com))

### "Error submitting score"
- Verify the Google Apps Script URL is correct
- Ensure the Web App deployment has "Who has access" set to "Anyone"
- Check the Apps Script for errors (Execution Log in Apps Script editor)
- Try testing the deployment by visiting the URL in browser (should show blank page)

### Questions not randomizing
- Check browser console for JavaScript errors
- Ensure `script.js` is loading correctly
- Clear browser cache and refresh

### Google Sheets not receiving data
1. In Google Apps Script, click **Execution log** to see errors
2. Run **testDoPost()** function in Apps Script editor to verify
3. Check that Sheet ID (if configured) is correct

## Advanced Features

### Analytics Sheet (Optional)
Uncomment the `createAnalyticsSheet()` function call in Google Apps Script to automatically create a summary sheet with:
- Total submissions count
- Average score
- Highest and lowest scores

### Track Detailed Answers
All answer selections are stored in the "Answers JSON" column. Parse this in Google Sheets using:
```
=JSON_EXTRACT(range, "$[0].selectedIndex")
```

## License

Free to use and modify. No attribution required.

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review browser console for error messages (F12)
3. Verify all files are in correct locations
4. Validate JSON syntax in `questions.json`

---

**Happy Quizzing! 🎉**
