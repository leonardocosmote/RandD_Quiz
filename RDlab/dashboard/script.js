// ======================================================================
// ⚠️ IMPORTANT: Paste YOUR Google Apps Script Web App URL below 
// (It should be the exact same URL you used in your main script.js)
// ======================================================================
// const googleAppsScriptUrl = 'https://script.google.com/macros/s/AKfycbxc99n668g30Tt35xUCWyHIWy2S4NGlpZ-pLkjqdkAFgKNcra1RgCwsfno81vreD4-JAQ/exec';
const googleAppsScriptUrl = 'https://script.google.com/macros/s/AKfycbzV4METVPHfnwMna8VsBDMskn8cZ9-Lokj_-SQHLPABGkBcC_oNn2LjcoUXs6EncHloDg/exec';
// DOM Elements
const loadingView = document.getElementById('loadingView');
const dashboardView = document.getElementById('dashboardView');
const errorView = document.getElementById('errorView');
const errorMsg = document.getElementById('errorMsg');

const totalPlayersVal = document.getElementById('totalPlayersVal');
const averageScoreVal = document.getElementById('averageScoreVal');
const leaderboardList = document.getElementById('leaderboardList');
const incompleteLeaderboardList = document.getElementById('incompleteLeaderboardList');
const completedLeaderboard = document.getElementById('completedLeaderboard');
const incompleteLeaderboard = document.getElementById('incompleteLeaderboard');
const completedTabBtn = document.getElementById('completedTabBtn');
const incompleteTabBtn = document.getElementById('incompleteTabBtn');
const trendChartCanvas = document.getElementById('trendChart');
const overviewTab = document.getElementById('overviewTab');
const advancedTab = document.getElementById('advancedTab');
const overviewTabBtn = document.getElementById('overviewTabBtn');
const advancedTabBtn = document.getElementById('advancedTabBtn');

// Chart instance and data
let trendChart = null;
let rawTimestampsData = [];
let rawTimestampsIncompleteData = [];
let currentInterval = 60; // Default: per hour (in minutes)
let dashboardData = null; // Store dashboard data for tab switching

// Fetch dashboard data
async function fetchDashboardData() {
    if (googleAppsScriptUrl === 'YOUR_APP_SCRIPT_URL_HERE' || !googleAppsScriptUrl) {
        showError('Please configure your Google Apps Script URL in dashboard/script.js');
        return;
    }

    try {
        const response = await fetch(googleAppsScriptUrl);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Debug logging
        console.log('Dashboard data received:', data);
        console.log('perHourBuckets:', data.perHourBuckets);

        if (data.result === 'success') {
            updateDashboard(data);
        } else {
            throw new Error(data.message || 'Error returning data');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        showError('Failed to load metrics. The Apps Script might be restricted or incorrect.');
    }
}

// Update the UI with fetched data
function updateDashboard(data) {
    // Hide loading, show dashboard
    loadingView.classList.add('hidden');
    dashboardView.classList.remove('hidden');

    // Store data globally for tab switching
    dashboardData = data;

    // Set initial metrics (default to completed)
    updateMetrics(true); // true = show completed metrics

    // Check if we have a total questions max reference (for clean UI).
    // Assuming 10 from the main game logic.
    totalPlayersVal.setAttribute('title', 'Total lifetime completions');
    averageScoreVal.setAttribute('title', 'Average score out of 10');

  // Build Leaderboards (separate for completed and incomplete)
    leaderboardList.innerHTML = '';
    incompleteLeaderboardList.innerHTML = '';

    // Update completed leaderboard
    if (data.topScores && data.topScores.length > 0) {
      data.topScores.forEach((player, index) => {
        const li = createLeaderboardItem(player, index + 1, false);
        leaderboardList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.style.justifyContent = 'center';
      li.style.color = '#8b949e';
      li.textContent = 'No completed quizzes yet.';
      leaderboardList.appendChild(li);
    }

    // Update incomplete leaderboard
    if (data.topIncomplete && data.topIncomplete.length > 0) {
      data.topIncomplete.forEach((player, index) => {
        const li = createLeaderboardItem(player, index + 1, true);
        incompleteLeaderboardList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.style.justifyContent = 'center';
      li.style.color = '#8b949e';
      li.textContent = 'No incomplete quizzes yet.';
      incompleteLeaderboardList.appendChild(li);
    }

  // Store raw timestamps for filtering (completed and incomplete)
  rawTimestampsData = data.rawTimestamps || [];
  rawTimestampsIncompleteData = data.rawTimestampsIncomplete || [];
  
  // Build per-hour trend chart (default view)
  updateTrendChart(currentInterval);
}

// Update metrics based on selected tab (completed or incomplete)
// Only changes values and color, keeps titles unchanged
function updateMetrics(showCompleted) {
  if (!dashboardData) return;

  if (showCompleted) {
    // Show completed quiz metrics with normal colors
    const completedCount = dashboardData.completedCount !== undefined ? dashboardData.completedCount : (dashboardData.totalPlayers || 0);
    const averageScoreCompleted = dashboardData.averageScoreCompleted !== undefined ? dashboardData.averageScoreCompleted : (dashboardData.averageScore || 0);
    
    totalPlayersVal.textContent = completedCount;
    averageScoreVal.textContent = averageScoreCompleted;
    
    // Reset to normal colors (remove inline style to use CSS classes)
    totalPlayersVal.style.color = '';
    averageScoreVal.style.color = '';
    
    // Remove any red styling classes if they exist
    totalPlayersVal.classList.remove('incomplete-metric');
    averageScoreVal.classList.remove('incomplete-metric');
  } else {
    // Show incomplete quiz metrics with red color
    const incompleteCount = dashboardData.incompleteCount || 0;
    const averageScoreIncomplete = dashboardData.averageScoreIncomplete || '0.0';
    
    totalPlayersVal.textContent = incompleteCount;
    averageScoreVal.textContent = averageScoreIncomplete;
    
    // Set to red color for incomplete
    totalPlayersVal.style.color = '#f85149';
    averageScoreVal.style.color = '#f85149';
    
    // Add class for additional styling if needed
    totalPlayersVal.classList.add('incomplete-metric');
    averageScoreVal.classList.add('incomplete-metric');
  }
}

// Helper function to create leaderboard item
function createLeaderboardItem(player, rank, isIncomplete) {
  const li = document.createElement('li');
  
  // Add class for incomplete styling
  if (isIncomplete) {
    li.classList.add('incomplete');
  }

  const rankSpan = document.createElement('span');
  rankSpan.className = 'lb-rank';
  rankSpan.textContent = `#${rank}`;

  const nameSpan = document.createElement('span');
  nameSpan.className = 'lb-name';
  nameSpan.textContent = player.name;
  if (isIncomplete) {
    nameSpan.textContent += ' ⚠️'; // Add warning icon for incomplete
  }

  // Parse time from rawTimestamp if available, otherwise use player.time
  let timeDisplay = player.time || '';
  if (player.rawTimestamp && !timeDisplay) {
    const date = parseTimestamp(player.rawTimestamp);
    if (date && !isNaN(date.getTime())) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      timeDisplay = `${hours}:${minutes}`;
    }
  }

  const timeSpan = document.createElement('span');
  timeSpan.className = 'lb-time';
  timeSpan.textContent = timeDisplay ? `(${timeDisplay})` : '';

  const scoreSpan = document.createElement('span');
  scoreSpan.className = 'lb-score';
  if (isIncomplete) {
    scoreSpan.classList.add('incomplete-score');
    // For incomplete quizzes, show "score/total" format (e.g., "2/5")
    const totalQuestions = player.totalQuestions || (player.answers && player.answers.length) || 0;
    scoreSpan.textContent = totalQuestions > 0 ? `${player.score}/${totalQuestions}` : player.score;
  } else {
    scoreSpan.textContent = player.score;
  }

  li.appendChild(rankSpan);
  li.appendChild(nameSpan);
  if (timeDisplay) {
    li.appendChild(timeSpan);
  }
  li.appendChild(scoreSpan);

  return li;
}

// Parse raw timestamp string to Date object
// Must be defined before it's used
function parseTimestamp(rawTimestamp) {
  if (!rawTimestamp) return null;
  
  // If it's already a number (milliseconds), convert to Date
  if (typeof rawTimestamp === 'number') {
    return new Date(rawTimestamp);
  }
  
  // If it's already a Date object
  if (rawTimestamp instanceof Date) {
    return rawTimestamp;
  }
  
  // Try parsing as ISO string first
  let date = new Date(rawTimestamp);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  // Remove comma and try different formats
  const cleaned = rawTimestamp.replace(/,/g, '').trim();
  
  // Try parsing date/time formats: "26/02/2026, 12:01:01" (DD/MM) or "2/26/2026 13:55:28" (MM/DD)
  // Use a smarter approach: if first number > 12, it's likely DD/MM, otherwise try MM/DD
  const dateTimeFormat = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/;
  const dateTimeMatch = cleaned.match(dateTimeFormat);
  if (dateTimeMatch) {
    const [, num1, num2, year, hours, minutes, seconds] = dateTimeMatch;
    const n1 = parseInt(num1);
    const n2 = parseInt(num2);
    
    // Heuristic: if first number > 12, it's likely day (DD/MM format)
    // Otherwise, try MM/DD format first (common in US)
    if (n1 > 12) {
      // DD/MM/YYYY format
      date = new Date(parseInt(year), n2 - 1, n1, parseInt(hours), parseInt(minutes), parseInt(seconds));
    } else if (n2 > 12) {
      // MM/DD/YYYY format (US)
      date = new Date(parseInt(year), n1 - 1, n2, parseInt(hours), parseInt(minutes), parseInt(seconds));
    } else {
      // Ambiguous: try both and use the one that creates a valid date
      // Try MM/DD first (US format is more common in newer entries)
      date = new Date(parseInt(year), n1 - 1, n2, parseInt(hours), parseInt(minutes), parseInt(seconds));
      if (isNaN(date.getTime()) || date.getDate() !== n2 || date.getMonth() !== n1 - 1) {
        // If invalid or doesn't match, try DD/MM
        date = new Date(parseInt(year), n2 - 1, n1, parseInt(hours), parseInt(minutes), parseInt(seconds));
      }
    }
    
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // Try DD/MM/YYYY HH:mm format (without seconds)
  const euFormatNoSec = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})$/;
  const euMatchNoSec = cleaned.match(euFormatNoSec);
  if (euMatchNoSec) {
    const [, day, month, year, hours, minutes] = euMatchNoSec;
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // Last resort: try direct Date parsing again
  date = new Date(cleaned);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  console.warn('Could not parse timestamp:', rawTimestamp);
  return null;
}

// Bucket timestamps by interval (in minutes)
function bucketTimestamps(rawTimestamps, intervalMinutes) {
  if (!rawTimestamps || rawTimestamps.length === 0) {
    return [];
  }

  const buckets = new Map();
  const intervalMs = intervalMinutes * 60 * 1000;

  rawTimestamps.forEach(rawTimestamp => {
    // Parse the raw timestamp string to a Date object
    const date = parseTimestamp(rawTimestamp);
    if (!date || isNaN(date.getTime())) {
      return; // Skip invalid timestamps
    }
    
    // Convert to milliseconds
    const timestamp = date.getTime();
    
    // Round down to the nearest interval
    const bucketTime = Math.floor(timestamp / intervalMs) * intervalMs;
    const bucketKey = bucketTime;

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, 0);
    }
    buckets.set(bucketKey, buckets.get(bucketKey) + 1);
  });

  // Convert to sorted array
  const sortedBuckets = Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([timestamp, count]) => ({
      timestamp: timestamp,
      count: count
    }));

  return sortedBuckets;
}

// Format label based on interval
function formatLabel(timestamp, intervalMinutes) {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  if (intervalMinutes >= 60) {
    return `${month}/${day} ${hours}:00`;
  } else if (intervalMinutes >= 30) {
    return `${month}/${day} ${hours}:${minutes}`;
  } else {
    return `${hours}:${minutes}`;
  }
}

// Update or create the trend chart
function updateTrendChart(intervalMinutes) {
  if (!trendChartCanvas) return;

  // Destroy existing chart if it exists
  if (trendChart) {
    trendChart.destroy();
  }

  // Bucket the data by the selected interval (both completed and incomplete)
  const buckets = bucketTimestamps(rawTimestampsData, intervalMinutes);
  const bucketsIncomplete = bucketTimestamps(rawTimestampsIncompleteData, intervalMinutes);

  // Combine all timestamps to get full label range
  const allTimestamps = new Set();
  buckets.forEach(b => allTimestamps.add(b.timestamp));
  bucketsIncomplete.forEach(b => allTimestamps.add(b.timestamp));
  const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

  if (sortedTimestamps.length === 0) {
    // Show message on canvas if no data
    const ctx = trendChartCanvas.getContext('2d');
    ctx.clearRect(0, 0, trendChartCanvas.width, trendChartCanvas.height);
    ctx.fillStyle = '#8b949e';
    ctx.font = '16px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('No submissions yet.', trendChartCanvas.width / 2, trendChartCanvas.height / 2);
    return;
  }

  // Create maps for quick lookup
  const completedMap = new Map(buckets.map(b => [b.timestamp, b.count]));
  const incompleteMap = new Map(bucketsIncomplete.map(b => [b.timestamp, b.count]));

  // Prepare data for chart
  const labels = sortedTimestamps.map(ts => formatLabel(ts, intervalMinutes));
  const completedCounts = sortedTimestamps.map(ts => completedMap.get(ts) || 0);
  const incompleteCounts = sortedTimestamps.map(ts => incompleteMap.get(ts) || 0);

  // Update chart title
  const titleElement = document.querySelector('#advancedTab h2');
  if (titleElement) {
    if (intervalMinutes === 60) {
      titleElement.textContent = 'Trend: Players per Hour';
    } else {
      titleElement.textContent = `Trend: Players per ${intervalMinutes} Minutes`;
    }
  }

  // Create line chart with two datasets
  trendChart = new Chart(trendChartCanvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Completed',
          data: completedCounts,
          borderColor: 'rgb(68, 98, 162)', // Cosmote Blue
          backgroundColor: 'rgba(68, 98, 162, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: 'rgb(68, 98, 162)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        },
        {
          label: 'Incomplete',
          data: incompleteCounts,
          borderColor: 'rgb(248, 81, 73)', // Red for incomplete
          backgroundColor: 'rgba(248, 81, 73, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: 'rgb(248, 81, 73)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          borderDash: [5, 5] // Dashed line for incomplete
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#c9d1d9',
            font: {
              family: 'Outfit',
              size: 14
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(22, 27, 34, 0.9)',
          titleColor: '#c9d1d9',
          bodyColor: '#c9d1d9',
          borderColor: 'rgba(48, 54, 61, 0.5)',
          borderWidth: 1,
          padding: 12,
          font: {
            family: 'Outfit'
          }
        }
      },
      scales: {
         x: {
           ticks: {
             color: '#8b949e',
             font: {
               family: 'Outfit',
               size: intervalMinutes <= 15 ? 10 : 12
             },
             maxRotation: intervalMinutes <= 15 ? 90 : 45,
             minRotation: intervalMinutes <= 15 ? 90 : 45,
             maxTicksLimit: intervalMinutes <= 15 ? 20 : intervalMinutes <= 30 ? 15 : 12
           },
           grid: {
             color: 'rgba(48, 54, 61, 0.3)'
           }
         },
        y: {
          beginAtZero: true,
          ticks: {
            color: '#8b949e',
            font: {
              family: 'Outfit',
              size: 12
            },
            stepSize: 1
          },
          grid: {
            color: 'rgba(48, 54, 61, 0.3)'
          }
        }
      }
    }
  });
}

// Show Error UI
function showError(message) {
    loadingView.classList.add('hidden');
    errorView.classList.remove('hidden');
    if (message) {
        errorMsg.textContent = message;
    }
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    fetchDashboardData();

    // Auto-refresh every 10 seconds
    setInterval(fetchDashboardData, 10000);

   // Tab switching
   if (overviewTabBtn && advancedTabBtn && overviewTab && advancedTab) {
     overviewTabBtn.addEventListener('click', () => {
       overviewTab.classList.remove('hidden');
       advancedTab.classList.add('hidden');
       overviewTabBtn.classList.add('active');
       advancedTabBtn.classList.remove('active');
     });

      advancedTabBtn.addEventListener('click', () => {
        overviewTab.classList.add('hidden');
        advancedTab.classList.remove('hidden');
        advancedTabBtn.classList.add('active');
        overviewTabBtn.classList.remove('active');
        // Resize chart when tab becomes visible
        if (trendChart) {
          setTimeout(() => {
            trendChart.resize();
          }, 100);
        }
      });
    }

    // Leaderboard tab event listeners (Completed/Incomplete)
    if (completedTabBtn && incompleteTabBtn && completedLeaderboard && incompleteLeaderboard) {
      completedTabBtn.addEventListener('click', () => {
        completedLeaderboard.classList.remove('hidden');
        incompleteLeaderboard.classList.add('hidden');
        completedTabBtn.classList.add('active');
        incompleteTabBtn.classList.remove('active');
        // Update metrics to show completed quiz stats
        updateMetrics(true);
      });

      incompleteTabBtn.addEventListener('click', () => {
        incompleteLeaderboard.classList.remove('hidden');
        completedLeaderboard.classList.add('hidden');
        incompleteTabBtn.classList.add('active');
        completedTabBtn.classList.remove('active');
        // Update metrics to show incomplete quiz stats
        updateMetrics(false);
      });
    }

    // Filter button event listeners
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        // Remove active class from all buttons
        filterButtons.forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        btn.classList.add('active');
        // Get interval from data attribute
        const interval = parseInt(btn.getAttribute('data-interval'));
        currentInterval = interval;
        // Update chart with new interval
        updateTrendChart(interval);
      });
    });
 });
