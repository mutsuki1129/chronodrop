// 修正後的標頭名稱
const HEADERS = ['怪物名稱', '等級', '生命值', '基礎經驗', '掉落物品'];
let MONSTER_DROPS_RAW = []; 
let MONSTER_DROPS_MERGED = []; 

// 元素參考
const resultsGrid = document.getElementById('resultsGrid'); 
const searchInput = document.getElementById('searchInput'); 
const dataStatus = document.getElementById('dataStatus');
const levelFilterControls = document.getElementById('levelFilterControls');
const themeToggleContainer = document.getElementById('themeToggleContainer'); // 新增

// 新增： Min/Max 等級輸入框參考
let minLevelInput;
let maxLevelInput;


// --- 主題切換相關函式 ---

// 在頁面載入時從 Local Storage 讀取主題偏好
function loadThemePreference() {
    // 預設為 'light'
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.body.className = currentTheme + '-theme';

    // 更新按鈕文字 (在初始化按鈕後處理)
    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
        toggleBtn.textContent = currentTheme === 'light' ? '夜間模式' : '日間模式';
    }
}

// 切換主題並儲存偏好
function toggleTheme() {
    const isDark = document.body.classList.contains('dark-theme');
    const newTheme = isDark ? 'light' : 'dark';
    
    // 更新 body class
    document.body.className = newTheme + '-theme';
    // 儲存偏好
    localStorage.setItem('theme', newTheme);
    
    // 更新按鈕文字
    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
        toggleBtn.textContent = newTheme === 'light' ? '夜間模式' : '日間模式';
    }
}

// --- 核心 CSV 解析函式 (保持不變) ---
async function loadData() {
    const CSV_FILE = 'data.csv';

    try {
        // 先載入主題偏好，避免閃爍
        loadThemePreference();

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


function resetLevelFilters() {
    minLevelInput.value = ''; 
    maxLevelInput.value = ''; 
    applyFilters(); 
}


// --- 初始化所有控制項 (新增主題切換按鈕) ---
function initializeControls() {
    // 1. 生成等級篩選區塊 HTML
    levelFilterControls.innerHTML = `
        <label for="minLevelInput">等級：</label>
        <input type="number" id="minLevelInput" placeholder="最小 Lv." min="1" class="level-input">
        <span class="level-separator">~</span>
        <input type="number" id="maxLevelInput" placeholder="最大 Lv." min="1" class="level-input">
        <button id="resetLevelBtn" class="reset-button">重置</button>
    `;

    // 2. 新增主題切換按鈕 HTML
    themeToggleContainer.innerHTML = `
        <button id="themeToggleBtn" class="theme-toggle-button"></button>
    `;
    
    // 3. 取得所有參考
    minLevelInput = document.getElementById('minLevelInput');
    maxLevelInput = document.getElementById('maxLevelInput');
    const resetBtn = document.getElementById('resetLevelBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    
    // 4. 綁定事件
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    } 
    if (minLevelInput) {
        minLevelInput.addEventListener('input', applyFilters);
    }
    if (maxLevelInput) {
        maxLevelInput.addEventListener('input', applyFilters);
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', resetLevelFilters);
    }
    // 新增：綁定主題切換按鈕事件
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
    
    // 因為 loadThemePreference 在 loadData 中已經執行過一次，這裡只需要確保按鈕文字被更新
    loadThemePreference(); 
    
    // 初始載入時應用過濾
    applyFilters(); 
}

// --- 應用篩選 (保持不變) ---
function applyFilters() {
    const query = searchInput.value.trim(); 
    
    let minLevel = parseInt(minLevelInput.value);
    let maxLevel = parseInt(maxLevelInput.value);
    
    minLevel = (isNaN(minLevel) || minLevel < 1) ? 1 : minLevel;
    maxLevel = (isNaN(maxLevel) || maxLevel < 1) ? 999 : maxLevel;
    
    let filtered = MONSTER_DROPS_MERGED; 
    
    filtered = filtered.filter(item => {
        const level = parseInt(item['等級']);
        if (isNaN(level)) return false; 
        
        return level >= minLevel && level <= maxLevel;
    });

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