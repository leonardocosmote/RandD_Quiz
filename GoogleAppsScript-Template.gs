/**
 * Google Apps Script Web App for Quiz Results Storage
 * 
 * Instructions:
 * 1. Open your Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code in the editor
 * 4. Paste this entire code into the editor
 * 5. Click Deploy > New Deployment > Web App
 * 6. Set "Execute as" to your email, "Who has access" to "Anyone"
 * 7. Copy the deployment URL and use it in the quiz app
 * 
 * The script will automatically create sheets and store quiz data
 */

// Configure this sheet ID (optional - if empty, uses active sheet)
const SHEET_ID = ""; // Leave empty to use the current sheet

// Get the sheet to use
function getSheet() {
  if (SHEET_ID) {
    return SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
  }
  return SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
}

/** Map header label -> column index (0-based) */
function headerIndexMap(headers) {
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    if (headers[i]) map[String(headers[i]).trim()] = i;
  }
  return map;
}

/** Pull optional gender (Q11) into one cell for analysis — in addition to full Answers JSON. */
function extractGenderResponse(answers) {
  if (!answers || !answers.length) return "";
  for (var i = 0; i < answers.length; i++) {
    var a = answers[i];
    if (!a) continue;
    var qid = a.questionId;
    if (qid === 11 || qid === "11") {
      if (a.type === "single" && a.selectedLabel) {
        var line = String(a.selectedLabel).trim();
        if (a.freeText) line += " — " + String(a.freeText).trim();
        return line;
      }
    }
  }
  return "";
}

// Initialize sheet headers if needed (no scoring — poll columns + dedicated gender field)
function initializeSheet() {
  var sheet = getSheet();
  var firstRow = null;

  if (sheet.getLastColumn() > 0) {
    firstRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  }

  if (!firstRow || String(firstRow[0]).trim() !== "Timestamp") {
    if (sheet.getLastRow() > 0) {
      sheet.deleteRows(1, sheet.getLastRow());
    }

    var headers = [
      "Timestamp",
      "Project ID",
      "User Name",
      "Gender response",
      "Answered Count",
      "Poll Total",
      "Completed",
      "Answers JSON",
    ];

    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#4462a2");
    headerRange.setFontColor("white");
    headerRange.setFontWeight("bold");
    sheet.autoResizeColumns(1, headers.length);
  }
}

function isNewPollHeaders(headers) {
  return headers.indexOf("Poll Total") !== -1 && headers.indexOf("Project ID") !== -1;
}

function isLegacyQuizHeaders(headers) {
  return headers.indexOf("Score") !== -1 && headers.indexOf("Total Questions") !== -1;
}

// Main doPost function - receives data from the quiz app
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = getSheet();

    if (sheet.getLastRow() === 0) {
      initializeSheet();
    }

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var timestamp = new Date();
    var userName = data.userName || "Anonymous";
    var answers = data.answers || [];
    var answersJSON = JSON.stringify(answers);
    var genderResponse = extractGenderResponse(answers);

    if (isNewPollHeaders(headers)) {
      var projectId = data.projectId || "";
      var answeredCount =
        data.answeredCount !== undefined && data.answeredCount !== null
          ? Number(data.answeredCount)
          : answers.length;
      var pollTotal =
        data.pollTotal !== undefined && data.pollTotal !== null
          ? Number(data.pollTotal)
          : answeredCount;
      var completed = data.completed !== undefined ? data.completed : true;

      sheet.appendRow([
        timestamp,
        projectId,
        userName,
        genderResponse,
        answeredCount,
        pollTotal,
        completed ? "Yes" : "No",
        answersJSON,
      ]);
    } else if (isLegacyQuizHeaders(headers)) {
      var score = data.score || 0;
      var totalQuestions = data.totalQuestions || 0;
      var percentage = data.percentage || 0;
      var completedLegacy = data.completed !== undefined ? data.completed : true;
      sheet.appendRow([
        timestamp,
        userName,
        score,
        totalQuestions,
        completedLegacy ? "Yes" : "No",
        percentage,
        answersJSON,
      ]);
    } else {
      if (sheet.getLastRow() <= 1) {
        sheet.clear();
        initializeSheet();
        headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      } else {
        throw new Error(
          "Unrecognized sheet headers with existing rows. Add a new tab or clear the sheet, then redeploy."
        );
      }
      var projectId3 = data.projectId || "";
      var answeredCount3 =
        data.answeredCount !== undefined && data.answeredCount !== null
          ? Number(data.answeredCount)
          : answers.length;
      var pollTotal3 =
        data.pollTotal !== undefined && data.pollTotal !== null
          ? Number(data.pollTotal)
          : answeredCount3;
      var completed3 = data.completed !== undefined ? data.completed : true;
      sheet.appendRow([
        timestamp,
        projectId3,
        userName,
        genderResponse,
        answeredCount3,
        pollTotal3,
        completed3 ? "Yes" : "No",
        answersJSON,
      ]);
    }

    return ContentService.createTextOutput(
      JSON.stringify({
        result: "success",
        message: "Poll results saved successfully!",
        data: { userName: userName, timestamp: timestamp },
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log("Error: " + error.toString());
    return ContentService.createTextOutput(
      JSON.stringify({
        result: "error",
        message: "Failed to save quiz results",
        error: error.toString(),
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// For testing - can be called from the Script Editor
function testDoPost() {
  var testData = {
    postData: {
      contents: JSON.stringify({
        projectId: "6G-EWOC",
        userName: "Test User",
        answeredCount: 11,
        pollTotal: 11,
        completed: true,
        timestamp: new Date().toISOString(),
        answers: [
          { questionId: 1, type: "single", selectedLabel: "Yes" },
          {
            questionId: 11,
            type: "single",
            selectedLabel: "Prefer to self-describe:",
            freeText: "Agender",
          },
        ],
      }),
    },
  };

  var result = doPost(testData);
  Logger.log(result.getContent());
}

/**
 * ADVANCED: Create a separate results sheet for analysis
 * Uncomment to use - creates formulas to summarize quiz data
 * (Column letters assume the new poll header row: A Timestamp … H Answers JSON.)
 */
function createAnalyticsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var analyticsSheet = ss.getSheetByName("Analytics");

  if (!analyticsSheet) {
    analyticsSheet = ss.insertSheet("Analytics");
    var dataRef = "'" + getSheet().getName() + "'!";
    analyticsSheet.appendRow(["Poll analytics (6G-EWOC-style sheet)"]);
    analyticsSheet.appendRow(["Total submissions", "=COUNTA(" + dataRef + "A:A)-1"]);
    analyticsSheet.appendRow(["Avg. questions answered (completed)", "=AVERAGE(" + dataRef + "E:E)"]);
    analyticsSheet.appendRow(["Gender column (row count)", "=COUNTA(" + dataRef + "D:D)-1"]);
    analyticsSheet.setColumnWidth(1, 280);
    analyticsSheet.setColumnWidth(2, 120);
  }
}

function parseCompletedCell(val) {
  if (val === null || val === undefined || val === "") return true;
  var s = String(val).trim().toUpperCase();
  if (s === "NO" || s === "FALSE" || s === "0" || s === "N") return false;
  return true;
}

function rowCompletedPoll(row, col) {
  var pollTotal = col["Poll Total"];
  var answered = col["Answered Count"];
  if (pollTotal === undefined || answered === undefined) return null;
  var pt = Number(row[pollTotal]) || 0;
  var ac = Number(row[answered]) || 0;
  if (pt <= 0) return ac > 0;
  return ac >= pt;
}

// --- DASHBOARD API ---

// Handle GET requests to return dashboard metrics (?projectId=6G-EWOC filters when that column exists)
function doGet(e) {
  try {
    var projectFilter =
      e && e.parameter && e.parameter.projectId ? String(e.parameter.projectId).trim() : "";

    var sheet = getSheet();
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();

    if (values.length <= 1) {
      return ContentService.createTextOutput(
        JSON.stringify({
          result: "success",
          totalPlayers: 0,
          averageScore: 0,
          completedCount: 0,
          incompleteCount: 0,
          averageScoreCompleted: "0",
          averageScoreIncomplete: "0",
          topScores: [],
          topIncomplete: [],
          rawTimestamps: [],
          rawTimestampsIncomplete: [],
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    var headers = values[0];
    var rows = values.slice(1);
    var col = headerIndexMap(headers);

    var projectCol = col["Project ID"];
    if (projectFilter && projectCol !== undefined) {
      rows = rows.filter(function (row) {
        return String(row[projectCol] || "").trim() === projectFilter;
      });
    }

    var isPoll = isNewPollHeaders(headers);
    var isLegacy = isLegacyQuizHeaders(headers);

    if (!isPoll && !isLegacy) {
      throw new Error("Unrecognized sheet headers. Use a fresh sheet or the template header row.");
    }

    var nameIndex = col["User Name"];
    var timestampIndex = col["Timestamp"];
    var completedIndex = col["Completed"];
    var answersIndex = col["Answers JSON"];

    if (nameIndex === undefined) {
      throw new Error("Could not find required column: 'User Name'");
    }

    var players = [];
    var rawTimestamps = [];
    var rawTimestampsIncomplete = [];

    rows.forEach(function (row) {
      var name = row[nameIndex] || "Anonymous";
      var isCompleted = true;
      var answeredCount = 0;
      var pollTotal = 0;
      var scoreLabel = "";

      if (isPoll) {
        var pollDone = rowCompletedPoll(row, col);
        if (completedIndex !== undefined && row[completedIndex] !== "" && row[completedIndex] != null) {
          isCompleted = parseCompletedCell(row[completedIndex]);
          if (pollDone !== null && col["Poll Total"] !== undefined) {
            var ac0 = Number(row[col["Answered Count"]]) || 0;
            var pt0 = Number(row[col["Poll Total"]]) || 0;
            if (pt0 > 0 && ac0 < pt0) isCompleted = false;
          }
        } else if (pollDone !== null) {
          isCompleted = pollDone;
        }

        answeredCount =
          col["Answered Count"] !== undefined ? Number(row[col["Answered Count"]]) || 0 : 0;
        pollTotal = col["Poll Total"] !== undefined ? Number(row[col["Poll Total"]]) || 0 : 0;

        if (answersIndex !== undefined && row[answersIndex] && answeredCount === 0) {
          try {
            var parsed = JSON.parse(row[answersIndex]);
            if (Array.isArray(parsed)) answeredCount = parsed.length;
          } catch (ignore) {}
        }
        scoreLabel = pollTotal > 0 ? answeredCount + "/" + pollTotal : String(answeredCount);
      } else {
        var scoreIndex = col["Score"];
        var totalQuestionsIndex = col["Total Questions"];
        var score = scoreIndex !== undefined ? Number(row[scoreIndex]) || 0 : 0;
        var totalQuestions =
          totalQuestionsIndex !== undefined ? Number(row[totalQuestionsIndex]) || 0 : 0;
        var answersCount = 0;
        if (answersIndex !== undefined && row[answersIndex]) {
          try {
            var ans = JSON.parse(row[answersIndex]);
            if (Array.isArray(ans)) answersCount = ans.length;
          } catch (e2) {}
        }
        var finalTotalQuestions = totalQuestions > 0 ? totalQuestions : answersCount;

        if (completedIndex !== undefined && row[completedIndex] !== "" && row[completedIndex] != null) {
          isCompleted = parseCompletedCell(row[completedIndex]);
        }
        if (finalTotalQuestions < 10) isCompleted = false;

        answeredCount = finalTotalQuestions;
        pollTotal = 10;
        scoreLabel = String(score);
      }

      var rawTimestamp = "";
      var timeOfDay = "";
      if (timestampIndex !== undefined && row[timestampIndex]) {
        var timestampValue = row[timestampIndex];
        if (timestampValue instanceof Date) {
          rawTimestamp = timestampValue.toISOString();
          timeOfDay =
            pad2(timestampValue.getHours()) + ":" + pad2(timestampValue.getMinutes());
        } else if (typeof timestampValue === "string" && timestampValue.trim() !== "") {
          rawTimestamp = timestampValue.trim();
        } else {
          rawTimestamp = String(timestampValue);
        }
        if (rawTimestamp) {
          if (isCompleted) rawTimestamps.push(rawTimestamp);
          else rawTimestampsIncomplete.push(rawTimestamp);
        }
      }

      var answersArray = [];
      if (answersIndex !== undefined && row[answersIndex]) {
        try {
          var p2 = JSON.parse(row[answersIndex]);
          if (Array.isArray(p2)) answersArray = p2;
        } catch (e3) {}
      }

      players.push({
        name: name,
        score: scoreLabel,
        answeredCount: answeredCount,
        pollTotal: pollTotal,
        totalQuestions: answeredCount,
        time: timeOfDay,
        rawTimestamp: rawTimestamp,
        completed: isCompleted,
        answers: answersArray,
      });
    });

    var completedPlayers = players.filter(function (p) {
      return p.completed;
    });
    var incompletePlayers = players.filter(function (p) {
      return !p.completed;
    });

    function tsSort(a, b) {
      return new Date(b.rawTimestamp || 0).getTime() - new Date(a.rawTimestamp || 0).getTime();
    }
    completedPlayers.sort(tsSort);
    incompletePlayers.sort(tsSort);

    var completedCount = completedPlayers.length;
    var incompleteCount = incompletePlayers.length;

    var sumAnsComplete = 0;
    completedPlayers.forEach(function (p) {
      sumAnsComplete += p.answeredCount;
    });
    var averageScoreCompleted =
      completedCount > 0 ? (sumAnsComplete / completedCount).toFixed(1) : "0";

    var sumAnsInc = 0;
    incompletePlayers.forEach(function (p) {
      sumAnsInc += p.answeredCount;
    });
    var averageScoreIncomplete =
      incompleteCount > 0 ? (sumAnsInc / incompleteCount).toFixed(1) : "0";

    var averageScore = Number(averageScoreCompleted);

    return ContentService.createTextOutput(
      JSON.stringify({
        result: "success",
        totalPlayers: completedCount,
        averageScore: averageScore,
        completedCount: completedCount,
        incompleteCount: incompleteCount,
        averageScoreCompleted: averageScoreCompleted,
        averageScoreIncomplete: averageScoreIncomplete,
        topScores: completedPlayers,
        topIncomplete: incompletePlayers,
        rawTimestamps: rawTimestamps,
        rawTimestampsIncomplete: rawTimestampsIncomplete,
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        result: "error",
        message: "Failed to retrieve metrics",
        error: error.toString(),
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function pad2(n) {
  return (n < 10 ? "0" : "") + n;
}
