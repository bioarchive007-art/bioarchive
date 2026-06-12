const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const parts = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (parts) {
        const key = parts[1];
        let val = parts[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        process.env[key] = val;
      }
    });
  }
}

loadEnv();

async function getAccessToken() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  return data.access_token;
}

async function checkCount() {
  try {
    const token = await getAccessToken();
    const sheetId = process.env.SHEET_ID;

    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1:T200`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    const rows = data.values || [];
    console.log(`Loaded ${rows.length} rows.`);

    const courseCode = "B201";
    const semester = "3";
    const year = "2024";
    const fileType = "slides";
    const professor = "Dr. R. Srinivasan";

    const matching = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (
        row[5]?.toLowerCase() === courseCode.toLowerCase() &&
        row[3]?.toString() === semester.toString() &&
        row[4]?.toString() === year.toString() &&
        row[11]?.toLowerCase() === fileType.toLowerCase() &&
        row[7]?.toLowerCase() === professor.toLowerCase()
      ) {
        matching.push({ rowNum: i + 1, fileName: row[12], fileId: row[0] });
      }
    }

    console.log(`Matching files count: ${matching.length}`);
    console.log("Matching files details:");
    console.log(JSON.stringify(matching, null, 2));

  } catch (err) {
    console.error(err);
  }
}

checkCount();
