// 修正後的標頭名稱
const HEADERS = ['怪物名稱', '等級', '生命值', '基礎經驗', '掉落物品'];
let MONSTER_DROPS_RAW = []; 
let MONSTER_DROPS_MERGED = []; 

// 元素參考
const resultsGrid = document.getElementById('resultsGrid'); 
const searchInput = document.getElementById('searchInput'); 
const dataStatus = document.getElementById('dataStatus');
const levelFilterControls = document.getElementById('levelFilterControls');

// 定義等級區間
const LEVEL_RANGES = [
    { label: 'Lv. 1-10', min: 1, max: 10 },
    { label: 'Lv. 11-20', min: 11, max: 20 },
    { label: 'Lv. 21-30', min: 21, max: 30 },
    { label: 'Lv. 31-40', min: 31, max: 40 },
    { label: 'Lv. 41-50', min: 41, max: 50 },
    { label: 'Lv. 51-60', min: 51, max: 60 },
    { label: 'Lv. 61-70', min: 61, max: 70 },
    { label: 'Lv. 71-80', min: 71, max: 80 },
    { label: 'Lv. 81+', min: 81, max: 999 },
];

// --- 核心 CSV 解析函式 ---
async function loadData() {
    const CSV_FILE = 'data.csv';

    try {
        dataStatus.textContent = "數據載入中...";
        const response = await fetch(CSV_FILE);
        
        if (!response.ok) {
            dataStatus.textContent = `錯誤: 無法載入數據 (${response.status} ${response.statusText})。`;
            return;
        }
        
        const csvText = await response.text();
        const normalizedText = csvText.trim().replace(/^\uFEFF/, '');
        const lines = normalizedText.split(/\r?\n/);
        
        if (lines.length <= 1) {
            dataStatus.textContent = "數據載入成功，共 0 筆記錄。";
            return;
        }

        const actualHeaders = lines[0].split(',').map(h => h.trim());
        
        if (actualHeaders.length !== HEADERS.length) {
             dataStatus.textContent = `錯誤: 欄位數不匹配！預期 ${HEADERS.length} 欄位，實際找到 ${actualHeaders.length} 欄位。`;
             return;
        }
        
        MONSTER_DROPS_RAW = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split(',').map(v => v.trim()); 
            
            if (values.length === actualHeaders.length) {
                const row = {};
                actualHeaders.forEach((header, index) => {
                    row[header] = values[index];
                });
                MONSTER_DROPS_RAW.push(row);
            }
        }
        
        MONSTER_DROPS_MERGED = mergeMonsterDrops(MONSTER_DROPS_RAW);
        
        dataStatus.textContent = `數據載入成功，共 ${MONSTER_DROPS_MERGED.length} 筆怪物記錄。`;
        
        renderTable(MONSTER_DROPS_MERGED);
        initializeControls(); 
        
    } catch (error) {
        dataStatus.textContent = "發生致命錯誤，請檢查瀏覽器 Console。";
        console.error("An error occurred during data loading or parsing:", error);
    }
}

// --- 數據合併函式 (資料精簡) ---
function mergeMonsterDrops(rawDrops) {
    const mergedData = new Map();

    rawDrops.forEach(item => {
        const monsterName = item['怪物名稱'];
        
        if (!mergedData.has(monsterName)) {
            mergedData.set(monsterName, {
                '怪物名稱': monsterName,
                '等級': item['等級'],
                '生命值': item['生命值'],
                '基礎經驗': item['基礎經驗'],
                '掉落物品': []
            });
        }
        
        const dropItem = item['掉落物品'].trim();
        if (dropItem) {
            mergedData.get(monsterName)['掉落物品'].push(dropItem);
        }
    });

    return Array.from(mergedData.values());
}

// --- 表格渲染函式 (生成卡片結構與中英分行) ---
function renderTable(data) {
    resultsGrid.innerHTML = ''; // 清空結果容器
    
    if (data.length === 0) {
        resultsGrid.innerHTML = '<div class="no-results">查無資料。</div>';
        return;
    }

    data.forEach(item => {
        const dropListHTML = item['掉落物品'].map(drop => `<span>${drop}</span>`).join('');
        
        // ** 處理中英文名稱拆分 **
        const fullName = item['怪物名稱'].trim();
        let englishName = fullName;
        let chineseName = '';

        const match = fullName.match(/(.*)\s*\((.*)\)/); // 匹配格式: Name (中文)
        if (match) {
            englishName = match[1].trim();
            chineseName = match[2].trim();
        } else {
            // 如果沒有匹配到標準格式，假設怪物名稱全部是英文或中文
            englishName = fullName;
            chineseName = ''; 
        }

        const nameHTML = `
            <span class="name-en">${englishName}</span>
            <span class="name-cn">${chineseName}</span>
        `;
        // **********************************
        
        const cardHTML = `
            <div class="monster-card">
                <div class="monster-info-header">
                    <div class="name-container">
                        ${nameHTML} 
                    </div>
                    <span class="level">Lv. ${item['等級']}</span>
                    <span class="hp">HP: ${item['生命值']}</span>
                    <span class="exp">EXP: ${item['基礎經驗']}</span>
                </div>
                <div class="drop-list">
                    ${dropListHTML}
                </div>
            </div>
        `;
        resultsGrid.insertAdjacentHTML('beforeend', cardHTML);
    });
}


// --- 初始化控制項 ---
function initializeControls() {
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    } 

    if (levelFilterControls) {
        levelFilterControls.innerHTML = LEVEL_RANGES.map((range) => `
            <label>
                <input type="checkbox" data-min="${range.min}" data-max="${range.max}" checked>
                ${range.label}
            </label>
        `).join('');

        levelFilterControls.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', applyFilters);
        });
    }
    
    applyFilters(); 
}

// --- 單一搜尋邏輯 ---
function applyFilters() {
    const query = searchInput.value.toLowerCase().trim();
    
    const selectedRanges = Array.from(levelFilterControls.querySelectorAll('input:checked')).map(cb => ({
        min: parseInt(cb.dataset.min),
        max: parseInt(cb.dataset.max)
    }));
    
    let filtered = MONSTER_DROPS_MERGED; 
    
    // 步驟一：等級區間過濾
    if (selectedRanges.length > 0) {
        filtered = filtered.filter(item => {
            const level = parseInt(item['等級']);
            if (isNaN(level)) return false; 
            
            return selectedRanges.some(range => {
                return level >= range.min && level <= range.max;
            });
        });
    }

    // 步驟二：單一文字搜尋過濾 (怪物名稱 OR 掉落物品)
    if (query.length > 0) {
        filtered = filtered.filter(item => {
            // 檢查怪物名稱
            const monsterMatch = item['怪物名稱'].toLowerCase().includes(query);
            
            // 檢查掉落物品列表
            const dropMatch = item['掉落物品'].some(dropItem => 
                dropItem.toLowerCase().includes(query)
            );
            
            return monsterMatch || dropMatch;
        });
    }

    renderTable(filtered);
    dataStatus.textContent = `找到 ${filtered.length} 筆記錄。`;
}

// --- 初始化 ---
document.addEventListener('DOMContentLoaded', loadData);