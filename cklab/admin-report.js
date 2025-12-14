/* admin-report.js (Final: With Top 10 Software Chart) */

// Global variables
let monthlyFacultyChartInstance, monthlyOrgChartInstance;
let pieChartInstance, pcAvgChartInstance, satisfactionChartInstance, topSoftwareChartInstance; // เพิ่มตัวแปรใหม่
let allLogs; 

// Master Lists (เหมือนเดิม)
const FACULTY_LIST = ["คณะวิทยาศาสตร์", "คณะเกษตรศาสตร์", "คณะวิศวกรรมศาสตร์", "คณะศิลปศาสตร์", "คณะเภสัชศาสตร์", "คณะบริหารศาสตร์", "คณะพยาบาลศาสตร์", "วิทยาลัยแพทยศาสตร์และการสาธารณสุข", "คณะศิลปประยุกต์และสถาปัตยกรรมศาสตร์", "คณะนิติศาสตร์", "คณะรัฐศาสตร์", "คณะศึกษาศาสตร์"];
const ORG_LIST = ["สำนักคอมพิวเตอร์และเครือข่าย", "สำนักบริหารทรัพย์สินและสิทธิประโยชน์", "สำนักวิทยบริการ", "กองกลาง", "กองแผนงาน", "กองคลัง", "กองบริการการศึกษา", "กองการเจ้าหน้าที่", "สำนักงานส่งเสริมและบริหารงานวิจัย ฯ", "สำนักงานพัฒนานักศึกษา", "สำนักงานบริหารกายภาพและสิ่งแวดล้อม", "สำนักงานวิเทศสัมพันธ์", "สำนักงานกฏหมายและนิติการ", "สำนักงานตรวจสอบภายใน", "สำนักงานรักษาความปลอดภัย", "สภาอาจารย์", "สหกรณ์ออมทรัพย์มหาวิทยาลัยอุบลราชธานี", "อุทยานวิทยาศาสตร์มหาวิทยาลัยอุบลราชธานี", "ศูนย์การจัดการความรู้ (KM)", "ศูนย์การเรียนรู้และพัฒนา \"งา\" เชิงเกษตรอุตสาหกรรมครัวเรือนแบบยั่งยืน", "สถานปฏิบัติการโรงแรมฯ (U-Place)", "ศูนย์วิจัยสังคมอนุภาคลุ่มน้ำโขง ฯ", "ศูนย์เครื่องมือวิทยาศาสตร์", "โรงพิมพ์มหาวิทยาลัยอุบลราชธานี"];

document.addEventListener('DOMContentLoaded', () => {
    const session = DB.getSession();
    if (!session || !session.user || session.user.role !== 'admin') {
        // window.location.href = 'admin-login.html';
    }
    allLogs = DB.getLogs(); 
    populateFilterOptions(allLogs); 
    autoSetDates();
    renderLifetimeStats(); 
    initializeReports(allLogs); 
});

// ... (Functions: populateFilterOptions, getFilterParams, applyFilters, clearFilters, filterLogs เหมือนเดิม) ...
// (เพื่อความกระชับ ใช้โค้ดเดิมได้เลยครับ)

function populateFilterOptions(logs) {
    const faculties = new Set(FACULTY_LIST);
    const organizations = new Set(ORG_LIST);
    const levels = new Set();
    const years = new Set();
    const sortThai = (a, b) => String(a).localeCompare(String(b), 'th');
    const sortNum = (a, b) => parseInt(a) - parseInt(b);

    logs.forEach(log => {
        if (log.userLevel) levels.add(log.userLevel);
        if (log.userYear && log.userYear !== '-') years.add(log.userYear);
        // เพิ่มเติมถ้ามีนอกเหนือจาก Master List
        if (log.userFaculty && !faculties.has(log.userFaculty) && !organizations.has(log.userFaculty)) {
             if (log.userFaculty.startsWith("คณะ") || log.userFaculty.startsWith("วิทยาลัย")) faculties.add(log.userFaculty);
             else if (log.userFaculty !== "บุคคลภายนอก" && log.userFaculty !== "ไม่ระบุสังกัด") organizations.add(log.userFaculty);
        }
    });

    populateSelect('filterFaculty', faculties, sortThai);
    populateSelect('filterOrganization', organizations, sortThai);
    populateSelect('filterLevel', levels, sortThai);
    populateSelect('filterYear', years, sortNum);
}
function populateSelect(id, set, sortFn) {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = '<option value="">-- ทั้งหมด --</option>';
    Array.from(set).sort(sortFn).forEach(val => { select.innerHTML += `<option value="${val}">${val}</option>`; });
}
function getFilterParams() {
    return {
        startDate: document.getElementById('filterStartDate').value,
        endDate: document.getElementById('filterEndDate').value,
        faculty: document.getElementById('filterFaculty').value,
        organization: document.getElementById('filterOrganization').value,
        userType: document.getElementById('filterUserType').value,
        level: document.getElementById('filterLevel').value,
        year: document.getElementById('filterYear').value,
    };
}
function applyFilters() { initializeReports(filterLogs(allLogs, getFilterParams())); }
function clearFilters() { document.getElementById('reportFilterForm').reset(); autoSetDates(); initializeReports(allLogs); }
function filterLogs(logs, params) {
    let filtered = logs;
    const { startDate, endDate, faculty, organization, userType, level, year } = params;
    if (startDate) { filtered = filtered.filter(log => new Date(log.timestamp).getTime() >= new Date(startDate).setHours(0,0,0,0)); }
    if (endDate) { filtered = filtered.filter(log => new Date(log.timestamp).getTime() <= new Date(endDate).setHours(23,59,59,999)); }
    if (faculty) filtered = filtered.filter(log => log.userFaculty === faculty);
    if (organization) filtered = filtered.filter(log => log.userFaculty === organization);
    if (userType) {
        if (userType === 'Internal') filtered = filtered.filter(log => log.userRole === 'student' || log.userRole === 'staff');
        else if (userType === 'External') filtered = filtered.filter(log => log.userRole === 'external');
    }
    if (level) filtered = filtered.filter(log => log.userLevel === level);
    if (year) filtered = filtered.filter(log => log.userYear === year);
    return filtered;
}

// ==========================================
// 1. CHARTS & RENDER
// ==========================================

function initializeReports(logs) {
    if (monthlyFacultyChartInstance) monthlyFacultyChartInstance.destroy();
    if (monthlyOrgChartInstance) monthlyOrgChartInstance.destroy();
    if (pieChartInstance) pieChartInstance.destroy();
    if (pcAvgChartInstance) pcAvgChartInstance.destroy();
    if (satisfactionChartInstance) satisfactionChartInstance.destroy();
    if (topSoftwareChartInstance) topSoftwareChartInstance.destroy(); // Destroy new chart

    renderLogHistory(logs); 

    const statsLogs = logs.filter(l => l.action === 'END_SESSION'); 
    if (statsLogs.length === 0) return;

    const processedData = processLogs(statsLogs);
    
    monthlyFacultyChartInstance = drawStackedBarChart(processedData.monthlyFacultyData, 'monthlyFacultyChart', 5);
    monthlyOrgChartInstance = drawStackedBarChart(processedData.monthlyOrgData, 'monthlyOrgChart', 5);
    
    // ✅ เรียกกราฟ Top 10 Software
    topSoftwareChartInstance = drawTopSoftwareChart(processedData.softwareStats);

    pieChartInstance = drawAIUsagePieChart(processedData.aiUsageData); 
    pcAvgChartInstance = drawPCAvgTimeChart(processedData.pcAvgTimeData);
    satisfactionChartInstance = drawSatisfactionChart(processedData.satisfactionData);
}

function processLogs(filteredStatsLogs) {
    const monthlyFacultyData = {};
    const monthlyOrgData = {};
    const aiUsageData = { ai: 0, nonAI: 0 };
    const pcUsageMap = new Map();
    const satisfactionData = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, total: 0 };
    const softwareCount = {}; // เก็บจำนวนการใช้ Software

    filteredStatsLogs.forEach(log => {
        const date = new Date(log.timestamp);
        const monthYear = date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short' });
        const faculty = log.userFaculty || 'Unknown';
        
        let targetData = null;
        if (FACULTY_LIST.includes(faculty) || faculty.startsWith("คณะ") || faculty.startsWith("วิทยาลัย")) targetData = monthlyFacultyData;
        else if (faculty !== "บุคคลภายนอก" && faculty !== "ไม่ระบุสังกัด") targetData = monthlyOrgData;

        if (targetData) {
            if (!targetData[monthYear]) targetData[monthYear] = {};
            targetData[monthYear][faculty] = (targetData[monthYear][faculty] || 0) + 1;
        }

        if (log.isAIUsed) aiUsageData.ai++; else aiUsageData.nonAI++;

        // Count Software Usage
        if (Array.isArray(log.usedSoftware)) {
            log.usedSoftware.forEach(sw => {
                const name = sw.split('(')[0].trim(); // ตัด Version ออก
                softwareCount[name] = (softwareCount[name] || 0) + 1;
            });
        }

        const pcId = log.pcId || 'Unknown';
        if (!pcUsageMap.has(pcId)) pcUsageMap.set(pcId, { totalDuration: 0, count: 0 });
        pcUsageMap.get(pcId).totalDuration += (log.durationMinutes || 0);
        pcUsageMap.get(pcId).count++;

        if (log.satisfactionScore) {
            const score = parseInt(log.satisfactionScore);
            if (score >= 1 && score <= 5) {
                satisfactionData[score]++;
                satisfactionData.total++;
            }
        }
    });

    const pcAvgTimeData = Array.from(pcUsageMap.entries()).map(([pcId, data]) => ({
        pcId: `PC-${pcId}`,
        avgTime: (data.totalDuration / data.count).toFixed(1)
    }));

    return { monthlyFacultyData, monthlyOrgData, aiUsageData, pcAvgTimeData, satisfactionData, softwareStats: softwareCount };
}

// ✅ ฟังก์ชันวาดกราฟ Top 10 Software (Horizontal Bar)
function drawTopSoftwareChart(data) {
    const ctx = document.getElementById('topSoftwareChart');
    if(!ctx) return;

    // Sort Descending & Take Top 10
    const sorted = Object.entries(data).sort(([,a], [,b]) => b - a).slice(0, 10);
    const labels = sorted.map(x => x[0]);
    const values = sorted.map(x => x[1]);

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'จำนวนการใช้งาน',
                data: values,
                backgroundColor: [
                    '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b',
                    '#858796', '#5a5c69', '#2c9faf', '#3c5a99', '#d63384'
                ],
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y', // แนวนอน
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { 
                    callbacks: { label: (context) => ` ถูกใช้งาน ${context.raw} ครั้ง` }
                }
            },
            scales: { x: { beginAtZero: true } }
        }
    });
}

// ... (Stacked Bar Chart, Pie, Doughnut, Helper Functions เดิม - คงไว้เหมือนเดิม) ...
// (เพื่อประหยัดพื้นที่ ผมขออนุญาตละส่วนที่ซ้ำเดิมไว้ แต่คุณสามารถใช้โค้ดเดิมในส่วนนั้นได้เลยครับ)

// *** สำคัญ: อย่าลืมก๊อปปี้ฟังก์ชัน drawStackedBarChart, drawSatisfactionChart ฯลฯ มาด้วยนะครับ ถ้าต้องการให้ผมรวมให้ทั้งหมด บอกได้เลย ***

// ... (ส่วน Helper Functions ที่เหลือ) ...
function autoSetDates() {
    const period = document.getElementById('filterPeriod').value;
    const today = new Date();
    let start, end;
    switch(period) {
        case 'today': start = end = today; break;
        case 'this_month': start = new Date(today.getFullYear(), today.getMonth(), 1); end = new Date(today.getFullYear(), today.getMonth() + 1, 0); break;
        case 'this_year': start = new Date(today.getFullYear(), 0, 1); end = new Date(today.getFullYear(), 11, 31); break;
        default: return; 
    }
    document.getElementById('filterStartDate').value = formatDateForInput(start);
    document.getElementById('filterEndDate').value = formatDateForInput(end);
}
function formatDateForInput(date) { return date.toISOString().split('T')[0]; }
function formatDateStr(date) { return date.toISOString().split('T')[0]; }

function exportReport(mode) {
    const today = new Date();
    let startDate, endDate, fileNamePrefix;
    switch(mode) {
        case 'daily': startDate = endDate = new Date(today); fileNamePrefix = `Daily_${formatDateStr(today)}`; break;
        case 'monthly': startDate = new Date(today.getFullYear(), today.getMonth(), 1); endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); fileNamePrefix = `Monthly_${today.getFullYear()}_${today.getMonth()+1}`; break;
        case 'quarterly': const q = Math.floor(today.getMonth() / 3); startDate = new Date(today.getFullYear(), q * 3, 1); endDate = new Date(today.getFullYear(), (q * 3) + 3, 0); fileNamePrefix = `Quarterly_${today.getFullYear()}_Q${q+1}`; break;
        case 'yearly': startDate = new Date(today.getFullYear(), 0, 1); endDate = new Date(today.getFullYear(), 11, 31); fileNamePrefix = `Yearly_${today.getFullYear()}`; break;
        default: exportCSV(); return;
    }
    generateCSV(startDate, endDate, fileNamePrefix);
}

function renderLifetimeStats() {
    const logs = DB.getLogs();
    const total = logs.length;
    let internal = 0, external = 0;
    logs.forEach(l => { (l.userRole === 'external' || l.userRole === 'Guest') ? external++ : internal++; });
    document.getElementById('lifetimeTotalCount').innerText = total.toLocaleString();
    document.getElementById('lifetimeInternal').innerText = internal.toLocaleString();
    document.getElementById('lifetimeExternal').innerText = external.toLocaleString();
    document.getElementById('progInternal').style.width = `${total>0?(internal/total)*100:0}%`;
    document.getElementById('progExternal').style.width = `${total>0?(external/total)*100:0}%`;
}

function generateCSV(startDateObj, endDateObj, fileNamePrefix) {
    const allLogs = DB.getLogs();
    const filteredLogs = allLogs.filter(log => {
        const logDate = new Date(log.timestamp).setHours(0,0,0,0);
        return logDate >= startDateObj.setHours(0,0,0,0) && logDate <= endDateObj.setHours(0,0,0,0);
    });
    if (filteredLogs.length === 0) { alert('ไม่พบข้อมูลในช่วงเวลาดังกล่าว'); return; }
    let csvContent = "ลำดับ,วันที่,เวลาเข้า,เวลาออก,ชื่อผู้ใช้,รหัส/ID,คณะ/หน่วยงาน,ประเภท,PC ID,Software/AI ที่ใช้,ระยะเวลา(นาที),ความพึงพอใจ\n";
    filteredLogs.forEach((log, index) => {
        const dateStr = new Date(log.timestamp).toLocaleDateString('th-TH');
        const timeIn = log.startTime ? new Date(log.startTime).toLocaleTimeString('th-TH') : '-';
        const timeOut = new Date(log.timestamp).toLocaleTimeString('th-TH');
        let swStr = (log.usedSoftware && log.usedSoftware.length > 0) ? log.usedSoftware.join('; ') : "-";
        const clean = (text) => text ? String(text).replace(/,/g, " ") : "-";
        const row = [ index + 1, dateStr, timeIn, timeOut, clean(log.userName), clean(log.userId), clean(log.userFaculty), clean(getUserType(log)), clean(log.pcId), `"${swStr}"`, log.durationMinutes || 0, log.satisfactionScore || "-" ];
        csvContent += row.join(",") + "\n";
    });
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", `${fileNamePrefix}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

function exportCSV() {
    const filteredLogs = filterLogs(allLogs, getFilterParams());
    if (filteredLogs.length === 0) { alert("ไม่พบข้อมูล Log ตามเงื่อนไขที่เลือกสำหรับดาวน์โหลด"); return; }
    const headers = ["ลำดับ", "วันที่", "เวลาเข้า", "เวลาออก", "ผู้ใช้ / ID", "คณะ / สังกัด", "PC ที่ใช้", "AI/Software ที่ใช้", "สถานะ", "ระยะเวลา (นาที)", "ความพึงพอใจ (Score)"];
    const csvRows = filteredLogs.map((log, index) => {
        const startTimeStr = log.startTime ? formatExportDateTime(log.startTime) : formatExportDateTime(log.timestamp);
        const endTimeStr = formatExportDateTime(log.timestamp);
        const userNameDisplay = log.userName || log.userId || '';
        const userFaculty = log.userFaculty || (log.userRole === 'external' ? 'บุคคลภายนอก' : '');
        const pcName = `PC-${log.pcId || 'N/A'}`;
        const softwareList = formatSoftwareForCSV(log.usedSoftware);
        let statusText = log.action;
        if (log.action === 'START_SESSION') statusText = 'Check in'; else if (log.action === 'END_SESSION') statusText = 'Check out'; else if (!statusText) statusText = 'Undefined';
        const durationMinutes = log.durationMinutes ? log.durationMinutes.toFixed(0) : '';
        const satisfactionScore = log.satisfactionScore !== undefined ? log.satisfactionScore : '';
        return [`"${index + 1}"`, `"${endTimeStr.split(' ')[0]}"`, `"${startTimeStr.split(' ')[1]}"`, `"${endTimeStr.split(' ')[1]}"`, `"${userNameDisplay}"`, `"${userFaculty}"`, `"${pcName}"`, `"${softwareList}"`, `"${statusText}"`, `"${durationMinutes}"`, `"${satisfactionScore}"`].join(',');
    });
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.setAttribute('href', URL.createObjectURL(blob)); link.setAttribute('download', `Usage_Report_Filtered_${new Date().toISOString().slice(0, 10)}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

function processImportCSV(inputElement) { const file = inputElement.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function(e) { parseAndSaveCSV(e.target.result); }; reader.readAsText(file); inputElement.value = ''; }
function parseAndSaveCSV(csvText) { /* ... Logic เดิม ... */ } // (คงไว้เหมือนเดิม)
function parseCSVLine(text) { /* ... Logic เดิม ... */ }
function convertToISO(dateStr, timeStr) { /* ... Logic เดิม ... */ }
function getUserType(log) { if (log.userRole === 'external' || log.userRole === 'Guest') return 'External'; return 'Internal'; }
function formatExportDateTime(isoString) { if (!isoString) return ''; const date = new Date(isoString); return date.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
function formatSoftwareForCSV(softwareArray) { if (!Array.isArray(softwareArray) || softwareArray.length === 0) return ''; return softwareArray.join('; '); }
function getSatisfactionDisplay(score) { if (score === undefined || score === null) return '<span class="text-muted">-</span>'; const scoreNum = parseFloat(score); if (scoreNum >= 4) return `<span class="badge bg-success fw-bold"><i class="bi bi-star-fill"></i> ${score}</span>`; else if (scoreNum >= 2) return `<span class="badge bg-warning text-dark"><i class="bi bi-star-half"></i> ${score}</span>`; else return `<span class="badge bg-danger"><i class="bi bi-star"></i> ${score}</span>`; }
function formatLogDate(isoString) { if (!isoString) return '-'; const date = new Date(isoString); return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }); }
function formatLogTime(isoString) { if (!isoString) return '-'; const date = new Date(isoString); return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }); }
function renderLogHistory(logs) { /* ... Logic เดิม ... */ } // (ใช้โค้ดเดิมได้เลยครับ)

// Stacked Bar Chart Function
function drawStackedBarChart(data, canvasId, topN = 5) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const months = Object.keys(data).sort((a, b) => {
        const [mA, yA] = a.split(' '); const [mB, yB] = b.split(' ');
        const monthMap = { "ม.ค.":0, "ก.พ.":1, "มี.ค.":2, "เม.ย.":3, "พ.ค.":4, "มิ.ย.":5, "ก.ค.":6, "ส.ค.":7, "ก.ย.":8, "ต.ค.":9, "พ.ย.":10, "ธ.ค.":11 };
        return new Date(parseInt(yA) - 543, monthMap[mA], 1) - new Date(parseInt(yB) - 543, monthMap[mB], 1);
    });
    const groupTotals = {}; const allGroups = new Set();
    months.forEach(m => { Object.keys(data[m]).forEach(group => { allGroups.add(group); groupTotals[group] = (groupTotals[group] || 0) + data[m][group]; }); });
    const sortedGroups = Array.from(allGroups).sort((a, b) => groupTotals[b] - groupTotals[a]);
    const topGroups = sortedGroups.slice(0, topN); const hasOthers = sortedGroups.length > topN;
    const datasets = topGroups.map((group, index) => {
        return { label: group, data: months.map(m => data[m][group] || 0), backgroundColor: getChartColor(index), borderRadius: 4, stack: 'Stack 0' };
    });
    if (hasOthers) {
        datasets.push({ label: 'อื่นๆ (รวม)', data: months.map(m => { let sum = 0; sortedGroups.slice(topN).forEach(g => sum += (data[m][g] || 0)); return sum; }), backgroundColor: '#e0e0e0', borderRadius: 4, stack: 'Stack 0' });
    }
    return new Chart(ctx, { type: 'bar', data: { labels: months, datasets }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, grid: { borderDash: [2, 4] } } }, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { mode: 'index', intersect: false } } } });
}

// 🎨 Palette สีที่คัดมาแล้วว่าสวยและแยกแยะง่าย
function getChartColor(index) {
    const colors = [
        '#4e73df', // Blue (Primary)
        '#1cc88a', // Green (Success)
        '#36b9cc', // Cyan (Info)
        '#f6c23e', // Yellow (Warning)
        '#e74a3b', // Red (Danger)
        '#6f42c1', // Purple
        '#fd7e14', // Orange
        '#20c997'  // Teal
    ];
    return colors[index % colors.length];
}

// ... (Chart functions อื่นๆ คงเดิม) ...

function drawSatisfactionChart(data) {
    const ctx = document.getElementById('satisfactionChart').getContext('2d');
    const total = data.total || 1; 
    const p1 = ((data[1]/total)*100).toFixed(1);
    const p2 = ((data[2]/total)*100).toFixed(1);
    const p3 = ((data[3]/total)*100).toFixed(1);
    const p4 = ((data[4]/total)*100).toFixed(1);
    const p5 = ((data[5]/total)*100).toFixed(1);

    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [`1 ดาว (${p1}%)`, `2 ดาว (${p2}%)`, `3 ดาว (${p3}%)`, `4 ดาว (${p4}%)`, `5 ดาว (${p5}%)`],
            datasets: [{
                data: [data[1], data[2], data[3], data[4], data[5]],
                backgroundColor: ['#dc3545', '#fd7e14', '#ffc107', '#28a745', '#198754'],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right' } }
        }
    });
}

function drawAIUsagePieChart(data) {
    const ctx = document.getElementById('aiUsagePieChart').getContext('2d');
    const total = data.ai + data.nonAI || 1;
    return new Chart(ctx, {
        type: 'pie',
        data: {
            labels: [`ใช้งาน AI (${((data.ai/total)*100).toFixed(1)}%)`, `ใช้งานทั่วไป (${((data.nonAI/total)*100).toFixed(1)}%)`],
            datasets: [{
                data: [data.ai, data.nonAI],
                backgroundColor: ['#4e73df', '#858796'],
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function drawPCAvgTimeChart(data) {
    const ctx = document.getElementById('pcAvgTimeChart').getContext('2d');
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.pcId),
            datasets: [{
                label: 'นาที/ครั้ง',
                data: data.map(d => d.avgTime),
                backgroundColor: 'rgba(78, 115, 223, 0.7)',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
}

function autoSetDates() {
    const period = document.getElementById('filterPeriod').value;
    const today = new Date();
    let start, end;
    switch(period) {
        case 'today': start = end = today; break;
        case 'this_month': start = new Date(today.getFullYear(), today.getMonth(), 1); end = new Date(today.getFullYear(), today.getMonth() + 1, 0); break;
        case 'this_year': start = new Date(today.getFullYear(), 0, 1); end = new Date(today.getFullYear(), 11, 31); break;
        default: return; 
    }
    document.getElementById('filterStartDate').value = formatDateForInput(start);
    document.getElementById('filterEndDate').value = formatDateForInput(end);
}
function formatDateForInput(date) { return date.toISOString().split('T')[0]; }
function formatDateStr(date) { return date.toISOString().split('T')[0]; }

function exportReport(mode) {
    const today = new Date();
    let startDate, endDate, fileNamePrefix;
    switch(mode) {
        case 'daily': startDate = endDate = new Date(today); fileNamePrefix = `Daily_${formatDateStr(today)}`; break;
        case 'monthly': startDate = new Date(today.getFullYear(), today.getMonth(), 1); endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); fileNamePrefix = `Monthly_${today.getFullYear()}_${today.getMonth()+1}`; break;
        case 'quarterly': const q = Math.floor(today.getMonth() / 3); startDate = new Date(today.getFullYear(), q * 3, 1); endDate = new Date(today.getFullYear(), (q * 3) + 3, 0); fileNamePrefix = `Quarterly_${today.getFullYear()}_Q${q+1}`; break;
        case 'yearly': startDate = new Date(today.getFullYear(), 0, 1); endDate = new Date(today.getFullYear(), 11, 31); fileNamePrefix = `Yearly_${today.getFullYear()}`; break;
        default: exportCSV(); return;
    }
    generateCSV(startDate, endDate, fileNamePrefix);
}

function renderLifetimeStats() {
    const logs = DB.getLogs();
    const total = logs.length;
    let internal = 0, external = 0;
    logs.forEach(l => { (l.userRole === 'external' || l.userRole === 'Guest') ? external++ : internal++; });
    document.getElementById('lifetimeTotalCount').innerText = total.toLocaleString();
    document.getElementById('lifetimeInternal').innerText = internal.toLocaleString();
    document.getElementById('lifetimeExternal').innerText = external.toLocaleString();
    document.getElementById('progInternal').style.width = `${total>0?(internal/total)*100:0}%`;
    document.getElementById('progExternal').style.width = `${total>0?(external/total)*100:0}%`;
}

function generateCSV(startDateObj, endDateObj, fileNamePrefix) {
    const allLogs = DB.getLogs();
    const filteredLogs = allLogs.filter(log => {
        const logDate = new Date(log.timestamp).setHours(0,0,0,0);
        return logDate >= startDateObj.setHours(0,0,0,0) && 
               logDate <= endDateObj.setHours(0,0,0,0);
    });

    if (filteredLogs.length === 0) {
        alert('ไม่พบข้อมูลในช่วงเวลาดังกล่าว');
        return;
    }

    let csvContent = "ลำดับ,วันที่,เวลาเข้า,เวลาออก,ชื่อผู้ใช้,รหัส/ID,คณะ/หน่วยงาน,ประเภท,PC ID,Software/AI ที่ใช้,ระยะเวลา(นาที),ความพึงพอใจ\n";

    filteredLogs.forEach((log, index) => {
        const dateStr = new Date(log.timestamp).toLocaleDateString('th-TH');
        const timeIn = log.startTime ? new Date(log.startTime).toLocaleTimeString('th-TH') : '-';
        const timeOut = new Date(log.timestamp).toLocaleTimeString('th-TH');
        let swStr = (log.usedSoftware && log.usedSoftware.length > 0) ? log.usedSoftware.join('; ') : "-";
        const clean = (text) => text ? String(text).replace(/,/g, " ") : "-";

        const row = [
            index + 1, dateStr, timeIn, timeOut, clean(log.userName), clean(log.userId), clean(log.userFaculty),
            clean(getUserType(log)), clean(log.pcId), `"${swStr}"`, log.durationMinutes || 0, log.satisfactionScore || "-"
        ];
        csvContent += row.join(",") + "\n";
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileNamePrefix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportCSV() {
    const filteredLogs = filterLogs(allLogs, getFilterParams());
    if (filteredLogs.length === 0) {
        alert("ไม่พบข้อมูล Log ตามเงื่อนไขที่เลือกสำหรับดาวน์โหลด");
        return;
    }
    const headers = ["ลำดับ", "วันที่", "เวลาเข้า", "เวลาออก", "ผู้ใช้ / ID", "คณะ / สังกัด", "PC ที่ใช้", "AI/Software ที่ใช้", "สถานะ", "ระยะเวลา (นาที)", "ความพึงพอใจ (Score)"];
    const csvRows = filteredLogs.map((log, index) => {
        const startTimeStr = log.startTime ? formatExportDateTime(log.startTime) : formatExportDateTime(log.timestamp);
        const endTimeStr = formatExportDateTime(log.timestamp);
        const userNameDisplay = log.userName || log.userId || '';
        const userFaculty = log.userFaculty || (log.userRole === 'external' ? 'บุคคลภายนอก' : '');
        const pcName = `PC-${log.pcId || 'N/A'}`;
        const softwareList = formatSoftwareForCSV(log.usedSoftware);
        let statusText = log.action;
        if (log.action === 'START_SESSION') statusText = 'Check in';
        else if (log.action === 'END_SESSION') statusText = 'Check out';
        else if (!statusText) statusText = 'Undefined';
        const durationMinutes = log.durationMinutes ? log.durationMinutes.toFixed(0) : '';
        const satisfactionScore = log.satisfactionScore !== undefined ? log.satisfactionScore : '';
        return [`"${index + 1}"`, `"${endTimeStr.split(' ')[0]}"`, `"${startTimeStr.split(' ')[1]}"`, `"${endTimeStr.split(' ')[1]}"`, `"${userNameDisplay}"`, `"${userFaculty}"`, `"${pcName}"`, `"${softwareList}"`, `"${statusText}"`, `"${durationMinutes}"`, `"${satisfactionScore}"`].join(',');
    });
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Usage_Report_Filtered_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert(`✅ ดาวน์โหลดไฟล์ CSV ${filteredLogs.length} รายการ เรียบร้อยแล้ว`);
    }
}

function processImportCSV(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) { parseAndSaveCSV(e.target.result); };
    reader.readAsText(file);
    inputElement.value = '';
}

function parseAndSaveCSV(csvText) {
    const lines = csvText.split(/\r\n|\n/);
    if (lines.length < 2) { alert("ไฟล์ CSV ว่างเปล่าหรือรูปแบบไม่ถูกต้อง"); return; }
    let successCount = 0;
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const columns = parseCSVLine(line);
        if (columns.length < 9) continue;
        const dateStr = columns[1];
        const timeOutStr = columns[3];
        const timestamp = convertToISO(dateStr, timeOutStr);
        let softwareArr = [];
        let cleanSoftwareStr = columns[7].replace(/^"|"$/g, '');
        if (cleanSoftwareStr && cleanSoftwareStr !== '-') softwareArr = cleanSoftwareStr.split(';').map(s => s.trim());
        const newLog = {
            action: 'Imported Log', timestamp: timestamp, startTime: convertToISO(dateStr, columns[2]),
            userName: columns[4], userId: columns[4], userFaculty: columns[5],
            userRole: 'student', pcId: columns[6].replace("PC-", "").trim(),
            usedSoftware: softwareArr, durationMinutes: parseInt(columns[9]) || 0, satisfactionScore: parseInt(columns[10]) || null
        };
        DB.saveLog(newLog);
        successCount++;
    }
    alert(`✅ นำเข้าข้อมูลสำเร็จ ${successCount} รายการ`);
    location.reload();
}

function parseCSVLine(text) {
    const result = [];
    let start = 0;
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '"') inQuotes = !inQuotes;
        else if (text[i] === ',' && !inQuotes) {
            result.push(text.substring(start, i));
            start = i + 1;
        }
    }
    result.push(text.substring(start));
    return result;
}

function convertToISO(dateStr, timeStr) {
    if (!dateStr || dateStr === '-') return new Date().toISOString();
    try {
        const [day, month, year] = dateStr.split('/');
        let jsYear = parseInt(year);
        if (jsYear > 2400) jsYear -= 543;
        const timePart = (timeStr && timeStr !== '-') ? timeStr : "00:00:00";
        return new Date(`${jsYear}-${month}-${day}T${timePart}`).toISOString();
    } catch (e) { return new Date().toISOString(); }
}

function getUserType(log) {
    if (log.userRole === 'external' || log.userRole === 'Guest') return 'External';
    return 'Internal';
}

function formatExportDateTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' ' +
           date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatSoftwareForCSV(softwareArray) {
    if (!Array.isArray(softwareArray) || softwareArray.length === 0) return '';
    return softwareArray.join('; ');
}

function getSatisfactionDisplay(score) {
    if (score === undefined || score === null) return '<span class="text-muted">-</span>';
    const scoreNum = parseFloat(score);
    if (scoreNum >= 4) return `<span class="badge bg-success fw-bold"><i class="bi bi-star-fill"></i> ${score}</span>`;
    else if (scoreNum >= 2) return `<span class="badge bg-warning text-dark"><i class="bi bi-star-half"></i> ${score}</span>`;
    else return `<span class="badge bg-danger"><i class="bi bi-star"></i> ${score}</span>`;
}

function formatLogDate(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString); 
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatLogTime(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString); 
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

function renderLogHistory(logs) {
    const tbody = document.getElementById('logHistoryTableBody');
    const COLSPAN_COUNT = 10;
    if (!tbody) return;
    if (!logs || logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${COLSPAN_COUNT}" class="text-center text-muted p-4">ไม่พบข้อมูลประวัติการใช้งาน</td></tr>`;
        return;
    }
    const sortedLogs = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    tbody.innerHTML = sortedLogs.map((log, index) => {
        const displayNameOrId = log.userName || log.userId || 'N/A';
        const displayFaculty = log.userFaculty || (log.userRole === 'external' ? 'บุคคลภายนอก' : 'ไม่ระบุสังกัด');
        const userNameDisplay = `<span class="fw-bold text-dark">${displayNameOrId}</span><br><span class="small text-muted">${displayFaculty}</span>`;
        let statusText = log.action || 'Undefined';
        let statusClass = 'bg-secondary';
        let rowClass = '';
        switch(log.action) {
            case 'START_SESSION': statusText = 'Check in'; statusClass = 'bg-primary'; rowClass = 'table-info bg-opacity-10'; break;
            case 'END_SESSION': statusText = 'Check out'; statusClass = 'bg-success'; rowClass = 'table-success bg-opacity-10'; break;
            case 'Admin Check-in': statusText = 'Admin Check-in'; statusClass = 'bg-warning text-dark'; rowClass = 'table-warning bg-opacity-10'; break;
            case 'Force Check-out': statusText = 'Force Check-out'; statusClass = 'bg-danger'; rowClass = 'table-danger bg-opacity-10'; break;
            default: statusClass = 'bg-secondary'; statusText = log.action;
        }
        let softUsedDisplay = '<span class="text-muted">-</span>';
        if (Array.isArray(log.usedSoftware) && log.usedSoftware.length > 0) {
            softUsedDisplay = log.usedSoftware.map(s => {
                let isAI = s.toLowerCase().includes('gpt') || s.toLowerCase().includes('ai') || s.toLowerCase().includes('gemini');
                let color = isAI ? 'bg-info text-dark border-info' : 'bg-light text-dark border';
                return `<span class="badge ${color} border fw-normal mb-1 me-1">${s}</span>`;
            }).join('');
        }
        const startTime = log.startTime || log.timestamp;
        const endTime = log.timestamp;
        const durationText = log.durationMinutes ? `${log.durationMinutes.toFixed(0)} min` : '-';
        const satisfactionScoreDisplay = getSatisfactionDisplay(log.satisfactionScore);
        return `<tr class="${rowClass}"><td class="text-center">${index + 1}</td><td class="small text-nowrap">${formatLogDate(endTime)}</td><td class="small text-nowrap">${formatLogTime(startTime)}</td><td class="small text-nowrap">${formatLogTime(endTime)}</td><td>${userNameDisplay}</td><td><span class="badge bg-dark fw-normal">PC-${log.pcId || '-'}</span></td><td>${softUsedDisplay}</td><td><span class="badge ${statusClass} fw-normal">${statusText}</span></td><td class="text-end text-nowrap">${durationText}</td><td class="text-center">${satisfactionScoreDisplay}</td></tr>`;
    }).join('');
}