// ── Download utilities ────────────────────────────────────────────────────────
export const downloadCSV = (filename, headers, rows) => {
  const escape = v => {
    const s = String(v ?? '').replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  };
  const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export const downloadTimesheetCSV = (shifts) => {
  // Group by week (Sun-Sat) and employee
  const rows = [];
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  
  // Get all unique employee names
  const employees = [...new Set(shifts.map(s => s.staffName))].sort();
  
  // Get all unique dates sorted
  const dates = [...new Set(shifts.map(s => s.date))].sort();
  
  // Get week start (Sunday) for each date
  const getWeekStart = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d.toISOString().split('T')[0];
  };
  
  const weeks = [...new Set(dates.map(getWeekStart))].sort();
  
  // Header
  const headers = ['Employee', 'Week', 'Sun','Mon','Tue','Wed','Thu','Fri','Sat',
                   'Sun In','Sun Out','Mon In','Mon Out','Tue In','Tue Out',
                   'Wed In','Wed Out','Thu In','Thu Out','Fri In','Fri Out',
                   'Sat In','Sat Out','Total Hours'];
  
  weeks.forEach(weekStart => {
    const weekDates = days.map((_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    });
    
    employees.forEach(emp => {
      const row = [emp, `Week of ${weekStart}`];
      let totalHours = 0;
      
      // Daily hours
      const dailyHours = weekDates.map(date => {
        const shift = shifts.find(s => s.staffName === emp && s.date === date);
        if (shift) { totalHours += Number(shift.hours || 0); }
        return shift ? Number(shift.hours || 0) : '';
      });
      row.push(...dailyHours);
      
      // Clock in/out per day
      weekDates.forEach(date => {
        const shift = shifts.find(s => s.staffName === emp && s.date === date);
        row.push(shift?.clockIn || '');
        row.push(shift?.clockOut || '');
      });
      
      row.push(totalHours.toFixed(2));
      rows.push(row);
    });
  });
  
  downloadCSV(`timesheet_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
};

// ── API endpoint — proxy server for production, direct for dev ────────────────
// Always use relative path — React proxy forwards to server.js (no CORS issues)
export const IS_ARTIFACT = typeof window !== "undefined" && window.location.hostname.includes("claude.ai");
export const API_URL = (() => {
  if (typeof window === "undefined") return "/api/claude";
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return "http://localhost:3001/api/claude";
  if (h.includes("claude.ai")) return "https://api.anthropic.com/v1/messages";
  return "/api/claude"; // Vercel
})();
