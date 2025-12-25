/* timer.js (Updated: Precise Slot Countdown) */

let timerInterval; 

document.addEventListener('DOMContentLoaded', () => {
    // 0. ตรวจสอบ Mock DB
    if (typeof DB === 'undefined') {
        document.body.innerHTML = '<div class="alert alert-danger m-5 text-center"><h3>❌ Error</h3><p>ไม่พบฐานข้อมูล (DB is not defined)</p></div>';
        return;
    }

    // 1. ดึงข้อมูล Session
    const session = DB.getSession();

    if (!session || !session.startTime) {
        alert('⚠️ ไม่พบข้อมูลการใช้งาน กรุณาลงชื่อเข้าใช้ใหม่');
        window.location.href = 'index.html';
        return;
    }

    // 2. แสดงข้อมูลผู้ใช้
    const userName = session.user ? session.user.name : 'ผู้ใช้ไม่ระบุชื่อ';
    const userElement = document.getElementById('userNameDisplay');
    if (userElement) userElement.innerText = userName;
    
    // แสดงข้อมูลเครื่อง
    const pcIdDisplay = session.pcId ? session.pcId.toString().padStart(2,'0') : '??';
    const pcElement = document.getElementById('pcNameDisplay');
    if (pcElement) pcElement.innerText = `Station: PC-${pcIdDisplay}`;
    
    // 3. ตรวจสอบโหมดจับเวลา
    // ถ้ามี forceEndTime (นาทีจากเที่ยงคืน เช่น 10:30 = 630) ให้เป็นโหมดนับถอยหลัง
    if (session.forceEndTime) {
        console.log("Mode: Countdown (Slot-based)");
        updateCountdownSlot(); // เรียกครั้งแรกทันที
        timerInterval = setInterval(updateCountdownSlot, 1000); 
    } else {
        console.log("Mode: Normal Timer (Elapsed)");
        updateTimer(); 
        timerInterval = setInterval(updateTimer, 1000); 
    }
});

// --- ฟังก์ชัน 1: นับเวลาเดินหน้า (General Use) ---
function updateTimer() {
    const session = DB.getSession(); 
    if (!session) return;

    const now = Date.now();
    let diff = now - session.startTime;
    
    if (diff < 0) diff = 0;

    const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
    const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
    const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');

    const display = document.getElementById('timerDisplay');
    if (display) display.innerText = `${h}:${m}:${s}`;
}

// --- ฟังก์ชัน 2: นับถอยหลังตามรอบ (AI/Slot Use) ---
// 
function updateCountdownSlot() {
    const session = DB.getSession();
    if (!session) return;

    // 1. แปลง forceEndTime (เช่น 630 นาที) ให้เป็น Date Object ของวันนี้
    const endMinutesTotal = session.forceEndTime; // ค่าจาก DB เช่น 630 (คือ 10:30)
    const targetDate = new Date();
    
    const targetHour = Math.floor(endMinutesTotal / 60);
    const targetMin = endMinutesTotal % 60;
    
    targetDate.setHours(targetHour, targetMin, 0, 0); // ตั้งเวลาจบของวันนี้

    // 2. หาผลต่างเวลา (Milliseconds)
    const now = new Date();
    const diff = targetDate - now;

    // 3. เช็คว่าหมดเวลาหรือยัง
    if (diff <= 0) {
        if (timerInterval) clearInterval(timerInterval);
        
        const display = document.getElementById('timerDisplay');
        if (display) {
            display.innerText = "00:00:00";
            display.classList.add('text-danger', 'fw-bold');
        }
        
        setTimeout(() => {
            alert("⏰ หมดเวลาใช้งานในรอบนี้แล้ว ระบบจะทำการ Check-out");
            doCheckout(true); 
        }, 100);
        return;
    }

    // 4. แปลงเป็น ชั่วโมง:นาที:วินาที
    const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
    const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
    const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');

    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
        // แสดงผล
        timerDisplay.innerText = `เหลือเวลา ${h}:${m}:${s}`;

        // 5. แจ้งเตือนช่วงโค้งสุดท้าย (น้อยกว่า 5 นาที)
        if (diff < 5 * 60 * 1000) { 
            timerDisplay.style.color = '#dc3545'; // สีแดง
            // ทำให้กระพริบถ้าน้อยกว่า 1 นาที
            if (diff < 60 * 1000) {
                timerDisplay.style.opacity = (new Date().getMilliseconds() < 500) ? '1' : '0.5';
            }
        } else {
            timerDisplay.style.color = ''; // สีปกติ
        }
    }
}

// --- ฟังก์ชัน Check-out ---
function doCheckout(isAuto = false) {
    if (!isAuto && !confirm('คุณต้องการเลิกใช้งานและออกจากระบบใช่หรือไม่?')) {
        return;
    }
    
    if (timerInterval) clearInterval(timerInterval);

    const session = DB.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    const endTime = Date.now();
    const durationMilliseconds = endTime - session.startTime;
    const durationMinutes = Math.round(durationMilliseconds / 60000); 

    session.durationMinutes = durationMinutes; 
    DB.setSession(session);
    
    window.location.href = 'feedback.html';
}

// --- ฟังก์ชัน Force Logout ---
function forceLogout() {
    if (timerInterval) clearInterval(timerInterval);

    const session = DB.getSession(); 
    if (!session) {
        window.location.href = 'index.html';
        return;
    }
    
    DB.saveLog({
        action: 'Force Check-out',
        userId: session.user.id || 'N/A',
        userName: session.user.name || 'N/A',
        pcId: session.pcId,
        startTime: new Date(session.startTime).toISOString(),
        timestamp: new Date().toISOString(),
        durationMinutes: 0, 
        usedSoftware: session.software || [], // บันทึก software ที่เลือกตอนแรก
        satisfactionScore: 'N/A',
    });

    DB.updatePCStatus(session.pcId, 'available', null);
    DB.clearSession();
    alert("❌ ระบบทำการล็อคเอาท์ฉุกเฉินแล้ว");
    window.location.href = 'index.html';
}