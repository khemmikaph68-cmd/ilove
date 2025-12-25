/* admin-manage.js (Updated: Hide AI from General PC in Table) */

let pcModal; 

document.addEventListener('DOMContentLoaded', () => {
    if (typeof DB === 'undefined') {
        alert("Error: ไม่พบไฟล์ mock-db.js");
        return;
    }

    const modalEl = document.getElementById('pcModal');
    if (modalEl) {
        pcModal = new bootstrap.Modal(modalEl);
    }

    renderPcTable();
});

// --- 1. RENDER TABLE (แก้ไข Logic การแสดงผลตรงนี้) ---
function renderPcTable() {
    const tbody = document.getElementById('pcTableBody');
    if (!tbody) return;

    let pcs = (DB.getPCs && typeof DB.getPCs === 'function') ? DB.getPCs() : [];
    const searchVal = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase() : '';

    if (searchVal) {
        pcs = pcs.filter(pc => pc.name.toLowerCase().includes(searchVal));
    }
    
    pcs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    updateStats(pcs);

    tbody.innerHTML = '';

    if (pcs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted">ไม่พบข้อมูล</td></tr>`;
        return;
    }

    pcs.forEach(pc => {
        let statusBadge = '';
        switch(pc.status) {
            case 'available': statusBadge = '<span class="badge bg-success">ว่าง</span>'; break;
            case 'in_use': statusBadge = '<span class="badge bg-danger">กำลังใช้งาน</span>'; break;
            case 'reserved': statusBadge = '<span class="badge bg-warning text-dark">จองแล้ว</span>'; break;
            default: statusBadge = '<span class="badge bg-secondary">แจ้งซ่อม</span>';
        }

        const typeBadge = pc.pcType === 'AI' 
            ? '<span class="badge bg-primary"><i class="bi bi-robot me-1"></i>AI Station</span>' 
            : '<span class="badge bg-light text-dark border">General</span>';

        const timeSlot = pc.timeSlot || '<span class="text-muted">-</span>';

        // ✅✅✅ ส่วนที่แก้ไข: กรอง Software ที่จะแสดง ✅✅✅
        let displaySoftware = pc.installedSoftware || [];

        // ถ้าเครื่องเป็น "General" ให้ซ่อน AI ทั้งหมดออกจากรายการแสดงผล
        if (pc.pcType !== 'AI') {
            displaySoftware = displaySoftware.filter(name => {
                const n = name.toLowerCase();
                // รายชื่อ Keyword ของ AI (ถ้าเจอคำพวกนี้ ให้ return false เพื่อซ่อน)
                const isAI = n.includes('gpt') || n.includes('claude') || n.includes('midjourney') || 
                             n.includes('perplexity') || n.includes('botnoi') || n.includes('gamma') || 
                             n.includes('scispace') || n.includes('grammarly') || n.includes('ai');
                return !isAI; // เอาเฉพาะที่ไม่ใช่ AI
            });
        }
        // ====================================================

        let softBadges = '<span class="text-muted small">-</span>';
        if (displaySoftware.length > 0) {
            softBadges = displaySoftware.map(s => {
                const sName = s || "";
                const n = sName.toLowerCase();
                const isAI = n.includes('gpt') || n.includes('ai') || n.includes('claude');
                
                // General จะไม่มีทางได้สี AI เพราะถูกกรองออกไปแล้ว แต่ใส่ไว้กันพลาด
                const color = isAI ? 'bg-primary bg-opacity-10 text-primary border border-primary' : 'bg-light text-dark border';
                return `<span class="badge ${color} me-1 mb-1 fw-normal">${sName.split('(')[0]}</span>`;
            }).join('');
        }

        tbody.innerHTML += `
            <tr>
                <td class="ps-4 fw-bold text-muted">#${pc.id}</td>
                <td><span class="fw-bold text-primary">${pc.name}</span></td>
                <td>${statusBadge}</td>
                <td>${typeBadge}</td>
                <td class="small">${timeSlot}</td>
                <td>${softBadges}</td>
                <td class="text-end pe-4">
                    <button onclick="openPcModal('${pc.id}')" class="btn btn-sm btn-outline-primary me-1"><i class="bi bi-pencil-fill"></i></button>
                    <button onclick="deletePc('${pc.id}')" class="btn btn-sm btn-outline-danger"><i class="bi bi-trash-fill"></i></button>
                </td>
            </tr>
        `;
    });
}

function updateStats(pcs) {
    if(document.getElementById('totalPcCount')) document.getElementById('totalPcCount').innerText = pcs.length;
    if(document.getElementById('availablePcCount')) document.getElementById('availablePcCount').innerText = pcs.filter(p => p.status === 'available').length;
    if(document.getElementById('maintPcCount')) document.getElementById('maintPcCount').innerText = pcs.filter(p => p.status === 'maintenance').length;
}

// --- 2. OPEN MODAL & LOAD CARD UI ---
function openPcModal(id = null) {
    if (!pcModal) return;

    const modalTitle = document.getElementById('pcModalTitle');
    
    // Reset Form
    document.getElementById('editPcId').value = '';
    document.getElementById('editPcName').value = '';
    document.getElementById('editPcStatus').value = 'available';
    document.getElementById('editPcType').value = 'General';
    document.getElementById('editPcTime').value = 'ตลอดวัน';

    renderSoftwareCheckboxes(id);

    if (id) {
        if(modalTitle) modalTitle.innerHTML = '<i class="bi bi-pencil-square me-2"></i> แก้ไขข้อมูลเครื่อง';
        const pcs = DB.getPCs();
        const pc = pcs.find(p => String(p.id) === String(id));
        if (pc) {
            document.getElementById('editPcId').value = pc.id;
            document.getElementById('editPcName').value = pc.name;
            document.getElementById('editPcStatus').value = pc.status;
            document.getElementById('editPcType').value = pc.pcType || 'General';
            document.getElementById('editPcTime').value = pc.timeSlot || 'ตลอดวัน';
        }
    } else {
        if(modalTitle) modalTitle.innerHTML = '<i class="bi bi-plus-lg me-2"></i> เพิ่มเครื่องใหม่';
        const pcs = DB.getPCs();
        let maxId = 0;
        pcs.forEach(p => { let num = parseInt(p.id); if(!isNaN(num) && num > maxId) maxId = num; });
        document.getElementById('editPcName').value = `PC-${(maxId + 1).toString().padStart(2,'0')}`;
    }
    
    toggleSoftwareRequire(); 
    pcModal.show();
}

function renderSoftwareCheckboxes(pcId) {
    const container = document.getElementById('softwareCheckboxList');
    if (!container) return;

    let lib = DB.getSoftwareLib();
    let installed = [];
    if (pcId) {
        const pc = DB.getPCs().find(p => String(p.id) === String(pcId));
        if (pc && pc.installedSoftware) installed = pc.installedSoftware;
    }

    container.innerHTML = '';
    if (lib.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted py-3">ไม่พบรายการ Software</div>';
        return;
    }

    lib.forEach(sw => {
        const fullName = `${sw.name} (${sw.version})`;
        const isChecked = installed.includes(fullName);
        const activeClass = isChecked ? 'active' : '';
        const iconClass = isChecked ? 'bi-check-circle-fill text-primary' : 'bi-circle text-muted opacity-25';
        
        const typeIcon = sw.type === 'AI' 
            ? '<i class="bi bi-robot text-primary fs-4"></i>' 
            : '<i class="bi bi-hdd-network text-secondary fs-4"></i>';

        container.innerHTML += `
            <div class="col-md-6" onclick="toggleSoftwareCard('${sw.id}')">
                <div class="card h-100 shadow-sm soft-card ${activeClass}" id="card_${sw.id}">
                    <div class="card-body p-2 d-flex align-items-center">
                        <div class="me-3 bg-white rounded-circle p-2 shadow-sm d-flex align-items-center justify-content-center" style="width: 45px; height: 45px;">
                            ${typeIcon}
                        </div>
                        <div class="flex-grow-1 lh-1">
                            <h6 class="mb-1 small fw-bold text-dark">${sw.name}</h6>
                            <span class="text-muted" style="font-size: 0.75rem;">Ver. ${sw.version}</span>
                        </div>
                        <div class="ms-2">
                            <i class="bi ${iconClass} fs-5" id="icon_${sw.id}"></i>
                        </div>
                        <input class="hidden-checkbox" type="checkbox" name="pcSoftware" 
                               value="${fullName}" id="sw_${sw.id}" 
                               data-sw-type="${sw.type}" ${isChecked ? 'checked' : ''}>
                    </div>
                </div>
            </div>
        `;
    });
}

function toggleSoftwareCard(id) {
    const checkbox = document.getElementById(`sw_${id}`);
    const card = document.getElementById(`card_${id}`);
    const icon = document.getElementById(`icon_${id}`);

    if (!checkbox || checkbox.disabled) return;

    checkbox.checked = !checkbox.checked;

    if (checkbox.checked) {
        card.classList.add('active');
        icon.className = 'bi bi-check-circle-fill text-primary fs-5';
    } else {
        card.classList.remove('active');
        icon.className = 'bi bi-circle text-muted fs-5 opacity-25';
    }
}

function toggleSoftwareRequire() {
    const typeEl = document.getElementById('editPcType');
    const type = typeEl.value;
    const checkboxes = document.querySelectorAll('input[name="pcSoftware"]');

    checkboxes.forEach(cb => {
        const swType = cb.getAttribute('data-sw-type');
        const swId = cb.id.replace('sw_', '');
        const card = document.getElementById(`card_${swId}`);
        const icon = document.getElementById(`icon_${swId}`);

        if (type === 'General' && swType === 'AI') {
            cb.checked = false; // เอาติ๊กออก
            cb.disabled = true; // ห้ามกด
            if (card) {
                card.classList.remove('active');
                card.style.opacity = '0.5';
                card.style.pointerEvents = 'none';
                if(icon) icon.className = 'bi bi-lock-fill text-secondary fs-5';
            }
        } else {
            cb.disabled = false;
            if (card) {
                card.style.opacity = '1';
                card.style.pointerEvents = 'auto';
                if (cb.checked) {
                    card.classList.add('active');
                    if(icon) icon.className = 'bi bi-check-circle-fill text-primary fs-5';
                } else {
                    card.classList.remove('active');
                    if(icon) icon.className = 'bi bi-circle text-muted fs-5 opacity-25';
                }
            }
        }
    });
}

// --- 3. SAVE & DELETE ---
function savePC() {
    const id = document.getElementById('editPcId').value;
    const name = document.getElementById('editPcName').value.trim();
    const status = document.getElementById('editPcStatus').value;
    const type = document.getElementById('editPcType').value;
    const timeSlot = document.getElementById('editPcTime').value;

    if (!name) { alert("กรุณากรอกชื่อเครื่อง"); return; }

    const checkboxes = document.querySelectorAll('input[name="pcSoftware"]:checked');
    const selectedSoftware = Array.from(checkboxes).map(cb => cb.value);

    // Validation: AI ต้องเลือก Software อย่างน้อย 1
    if (type === 'AI' && selectedSoftware.length === 0) {
        alert("⚠️ สำหรับเครื่องประเภท AI Workstation\nกรุณาเลือก Software/AI ที่ติดตั้งอย่างน้อย 1 รายการ");
        return; 
    }

    let pcs = DB.getPCs();
    const pcData = {
        name, status, pcType: type, timeSlot: timeSlot, installedSoftware: selectedSoftware
    };

    if (id) {
        const index = pcs.findIndex(p => String(p.id) === String(id));
        if (index !== -1) {
            pcs[index] = { ...pcs[index], ...pcData };
        }
    } else {
        const newId = Date.now().toString(); 
        pcs.push({ id: newId, ...pcData });
    }

    DB.savePCs(pcs); 
    
    if (pcModal) pcModal.hide(); 
    
    renderPcTable(); 
}

function deletePc(id) {
    if(confirm("ยืนยันการลบเครื่องนี้?")) {
        let pcs = DB.getPCs().filter(p => String(p.id) !== String(id));
        DB.savePCs(pcs);
        renderPcTable(); 
    }
}