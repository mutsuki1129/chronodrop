// 修正後的標頭名稱
const HEADERS = ['怪物名稱', '等級', '生命值', '基礎經驗', '掉落物品'];
let MONSTER_DROPS_RAW = []; 
let MONSTER_DROPS_MERGED = []; 

// 元素參考
const resultsGrid = document.getElementById('resultsGrid'); 
const searchInput = document.getElementById('searchInput'); 
const dataStatus = document.getElementById('dataStatus');
const levelFilterControls = document.getElementById('levelFilterControls');

// 新增： Min/Max 等級輸入框參考
let minLevelInput;
let maxLevelInput;


// --- 核心 CSV 解析函式 (略) ---
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


function highlightText(text, query) {
    if (!query) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    
    return text.replace(regex, (match) => `<span class="highlight">${match}</span>`);
}


function renderTable(data) {
    resultsGrid.innerHTML = ''; 
    
    if (data.length === 0) {
        resultsGrid.innerHTML = '<div class="no-results">查無資料。</div>';
        return;
    }

    const currentQuery = searchInput.value.trim();

    data.forEach(item => {
        
        const dropListHTML = item['掉落物品'].map(drop => {
            const highlightedDrop = highlightText(drop, currentQuery);
            return `<span>${highlightedDrop}</span>`;
        }).join('');
        
        const fullName = item['怪物名稱'].trim();
        let englishName = fullName;
        let chineseName = '';

        const match = fullName.match(/(.*)\s*\((.*)\)/); 
        if (match) {
            englishName = match[1].trim();
            chineseName = match[2].trim();
        } else {
            englishName = fullName;
            chineseName = ''; 
        }

        const highlightedEn = highlightText(englishName, currentQuery);
        const highlightedCn = highlightText(chineseName, currentQuery);

        const nameHTML = `
            <span class="name-en">${highlightedEn}</span>
            <span class="name-cn">${highlightedCn}</span>
        `;
        
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


// --- 核心修正：初始化 Min/Max 輸入框 ---
function initializeControls() {
    // 1. 生成新的 Min/Max 輸入框 HTML
    levelFilterControls.innerHTML = `
        <label for="minLevelInput">等級：</label>
        <input type="number" id="minLevelInput" placeholder="最小 Lv." value="1" min="1" class="level-input">
        <span class="level-separator">~</span>
        <input type="number" id="maxLevelInput" placeholder="最大 Lv." value="999" min="1" class="level-input">
    `;

    // 2. 取得新的輸入框參考
    minLevelInput = document.getElementById('minLevelInput');
    maxLevelInput = document.getElementById('maxLevelInput');
    
    // 3. 綁定事件：當輸入值改變時立即過濾
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    } 
    if (minLevelInput) {
        // 使用 'input' 事件實現即時過濾
        minLevelInput.addEventListener('input', applyFilters);
    }
    if (maxLevelInput) {
        maxLevelInput.addEventListener('input', applyFilters);
    }
    
    // 初始載入時應用過濾
    applyFilters(); 
}

// --- 核心修正：應用自訂等級範圍過濾 ---
function applyFilters() {
    const query = searchInput.value.trim(); 
    
    // 1. 讀取等級過濾數值並進行校驗
    let minLevel = parseInt(minLevelInput.value);
    let maxLevel = parseInt(maxLevelInput.value);
    
    // 數值校驗與設定預設值
    minLevel = isNaN(minLevel) ? 1 : Math.max(1, minLevel);
    maxLevel = isNaN(maxLevel) ? 999 : Math.max(1, maxLevel);

    // 確保 min <= max (如果 min > max 則交換數值)
    if (minLevel > maxLevel) {
        [minLevel, maxLevel] = [maxLevel, minLevel];
        minLevelInput.value = minLevel;
        maxLevelInput.value = maxLevel;
    }

    let filtered = MONSTER_DROPS_MERGED; 
    
    // 步驟一：自訂等級範圍過濾
    filtered = filtered.filter(item => {
        const level = parseInt(item['等級']);
        if (isNaN(level)) return false; 
        
        // 檢查等級是否在 [minLevel, maxLevel] 範圍內
        return level >= minLevel && level <= maxLevel;
    });

    // 步驟二：單一文字搜尋過濾 (保持不變)
    if (query.length > 0) {
        const lowerCaseQuery = query.toLowerCase(); 
        filtered = filtered.filter(item => {
            const monsterMatch = item['怪物名稱'].toLowerCase().includes(lowerCaseQuery);
            const dropMatch = item['掉落物品'].some(dropItem => 
                dropItem.toLowerCase().includes(lowerCaseQuery)
            );
            return monsterMatch || dropMatch;
        });
    }

    renderTable(filtered);
    dataStatus.textContent = `找到 ${filtered.length} 筆記錄。`;
}

// --- 初始化 ---
document.addEventListener('DOMContentLoaded', loadData);
