# Quick Start Guide

Get your Quiz Web App up and running in **5 minutes**!

## 📋 What You'll Need

- A GitHub account (free at github.com)
- A Google account (free at google.com)
- A web browser
- That's it! No installation required.

---

## 🚀 Step 1: Set Up Google Sheet (3 minutes)

### Setup Process

**1.1 Create a Google Sheet**
- Go to [sheets.google.com](https://sheets.google.com)
- Click **+ Create** > **Spreadsheet**
- Name it: `Quiz Results`
- Click **Create**

**1.2 Open Apps Script Editor**
- Click **Extensions > Apps Script**
- A new tab opens with the editor

**1.3 Paste the Code**
- Delete any existing code
- Open the file: `GoogleAppsScript-Template.gs`
- Copy ALL the code
- Paste it into the Apps Script editor
- Click **Save** (Ctrl+S)

**1.4 Deploy as Web App**
- Click **Deploy** (top right)
- Select **New deployment** (or + icon)
- Choose type: **Web App**
- Set:
  - Execute as: YOUR EMAIL
  - Who has access: **Anyone**
- Click **Deploy**
- Copy the **URL** shown (looks like: `https://script.google.com/macros/s/.../exec`)
- Click **Authorize** if prompted

---

## 🔗 Step 2: Configure the Quiz App & Deploy (3 minutes)

**2.1 Connect the App to Google Sheets**
- Open `script.js` in your code editor
- Find line 8: `googleAppsScriptUrl: 'YOUR_APP_SCRIPT_URL_HERE'`
- Replace `'YOUR_APP_SCRIPT_URL_HERE'` with the Web App URL you copied in Step 1.4
- Save the file

**2.2 Deploy to GitHub Pages**

### Option A: Command Line
```bash
git init
git add .
git commit -m "Configure Google Apps Script URL"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/quiz.git
git push -u origin main
```

### Option B: Web Browser
1. **Create a GitHub Repository**
   - Go to [github.com/new](https://github.com/new) and name it `quiz`
2. **Upload Files**
   - Click **Add file > Upload files**
   - Drag and drop `index.html`, `styles.css`, `script.js`, and `questions.json`
   - Click **Commit changes**

**2.3 Enable GitHub Pages**
- Go to **Settings > Pages** in your GitHub repo
- Branch: select `main`
- Folder: select `/ (root)`
- Click **Save**
- Wait 1-2 minutes for deployment
- Your Quiz will be live at: `https://YOUR-USERNAME.github.io/quiz/`

---

## ✅ Step 3: Test the Connection

1. Open your live quiz link
2. Enter your name and click **Start**
3. Complete the poll (rank questions: pick 1–3 options in order, then **Continue**)
4. On the thank-you page, responses are sent automatically; check your Google Sheet ✨

---

## 📊 Verify Everything Works

### Quiz App Check
- [ ] Questions load and display
- [ ] Options are clickable
- [ ] Progress bar advances
- [ ] Score calculated correctly
- [ ] Results screen shows final score

### Google Sheet Check
- [ ] New row appears with user name
- [ ] Score column has the right number
- [ ] Timestamp is recent
- [ ] Can see all columns: Timestamp, User Name, Score, Total Questions, Percentage

---

## 📝 Customize Questions

Edit `questions.json` in your GitHub repository:

```json
[
  {
    "question": "Your question?",
    "options": ["Wrong", "Wrong", "Correct", "Wrong"],
    "correctIndex": 2
  }
]
```

**Key points:**
- `correctIndex` is **zero-based** (0 = 1st option, 1 = 2nd, etc.)
- Can have 2 to 6 options
- Must be valid JSON (check at [jsonlint.com](https://jsonlint.com))

**To update:**
1. Go to your GitHub repository
2. Click `questions.json`
3. Click ✏️ (edit)
4. Make changes
5. Click **Commit changes**

Changes appear on your quiz immediately (clear browser cache if needed).

---

## 🎨 Customize Colors & Styling

Edit `styles.css` to change:

### Color Scheme
Find these lines and change the colors:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
/* Change these hex codes to your preferred colors */
```

### Common Color Changes
- Primary (purple/blue): `#667eea` → change to `#FF6B6B` (red), `#4ECDC4` (teal), etc.
- Success (green): `#4caf50`
- Error (red): `#f44336`

[Color picker here](https://htmlcolorcodes.com)

---

## ❓ Quick Troubleshooting

### Quiz shows "Error loading quiz"
- Verify `questions.json` exists in your repository
- Check JSON syntax: [jsonlint.com](https://jsonlint.com)
- Clear browser cache (Ctrl+Shift+Delete) and refresh

### Data not saving to Google Sheet
- Check Apps Script URL is correct (no extra spaces)
- Verify Apps Script is deployed to "Anyone"
- Check Execution log in Apps Script for errors
- Make sure JSON payload was received

### Questions always in same order
- Refresh browser (Ctrl+F5) - clear cache
- Check browser console (F12) for JavaScript errors

### Mobile looks broken
- Update browser to latest version
- Check in browser DevTools mobile view (F12 > toggle device toolbar)

---

## 💡 Pro Tips

1. **Keyboard shortcuts during quiz**: Use number keys 1-4 to select answers (if you want to add this)

2. **Analyze results**: In Google Sheets, create a pivot table to see:
   - Average score across all users
   - Score distribution
   - Most challenging questions

3. **Add timer**: Modify `script.js` to add a question timer

4. **Track detailed answers**: The "Answers JSON" column has all user selections for analysis

5. **Deploy multiple quizzes**: Create new repositories for different quizzes:
   - `https://github.com/username/quiz-history`
   - `https://github.com/username/quiz-science`
   - Point all to the same Google Sheet

---

## 📚 Next Steps

- Add or edit questions in `questions.json` (see README for format). Optionally keep `questions.md` in sync as a readable outline.
- Change the color scheme in `styles.css`
- Customize the Welcome message in `index.html`
- Share your quiz URL with others!

**Deployed? Great!** 🎉 

Your quiz is now live and collecting data. Check [README.md](README.md) for advanced customization options.

---

## 🆘 Need Help?

1. **Check Troubleshooting section above**
2. **Browser console** (F12 → Console tab) shows JavaScript errors
3. **Network tab** (F12 → Network) shows if `questions.json` loads
4. **Apps Script Execution log** shows server-side errors
5. All files should be in the same GitHub repository folder

Good luck! 🚀
