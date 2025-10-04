// 預設的怪物數據（使用您提供的格式）
const monsterData = [
    { nameEn: "Snail", nameCn: "蝸牛", level: 1, hp: 8, exp: 3, drops: ["Green Headband (綠色頭巾)", "White Undershirt (白色內衣)", "Brown Rocky Suit (棕色岩石裝)", "Sword (劍)", "Red Potion (紅色藥水)", "Green Apple (綠色蘋果)", "Scroll for Helmet for Defense 10% (頭盔防禦力 10% 捲軸)", "Scroll for Cape for Defense 60% (披風防禦力 60% 捲軸)", "Snail Shell (蝸牛殼)", "Bronze Ore (銅礦石)", "Garnet Ore (石榴石礦石)"] },
    { nameEn: "Blue Snail", nameCn: "藍蝸牛", level: 2, hp: 15, exp: 4, drops: ["Blue One-lined T-Shirt (藍色橫紋T恤)", "Grey / Brown Training Shirt (灰/棕色訓練服)", "Red-Striped T-Shirt (黃紅條紋T恤)", "Grey Thick Sweat Pants (灰色厚運動褲)", "Grey / Brown Training Pants (灰/棕色訓練褲)", "Red Potion (紅色藥水)", "Green Apple (青蘋果)", "Scroll for Cape for Defense 100% (披風防禦力 100% 捲軸)", "Blue Snail Shell (藍色蝸牛殼)"] },
    { nameEn: "Jr. Balrog", nameCn: "小巴洛古", level: 80, hp: 50000, exp: 2000, drops: ["Wooden Legend Shield (古老木盾)", "Silver Ancient Shield (銀古老盾牌)", "Scroll for Shoes for Jump 10% (鞋子跳躍 10% 捲軸)"] },
    // 您可以在此添加更多怪物數據
];

const searchInput = document.getElementById('searchInput');
const minLevelInput = document.getElementById('minLevel');
const maxLevelInput = document.getElementById('maxLevel');
const resetFiltersButton = document.getElementById('resetFilters');
const resultsGrid = document.getElementById('resultsGrid');
const statusMessage = document.getElementById('statusMessage');
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

// 儲存原始數據以供重置
const originalMonsterData = JSON.parse(JSON.stringify(monsterData)); 

/**
 * 創建怪物卡片的 HTML 內容
 * @param {Object} monster - 怪物物件
 * @param {string} highlightText - 需要標記的文字
 * @returns {string} - 怪物卡片的 HTML 字串
 */
function createMonsterCard(monster, highlightText) {
    const highlightRegex = highlightText ? new RegExp(escapeRegExp(highlightText), 'gi') : null;

    // 輔助函數：對文字進行螢光標記
    const applyHighlight = (text) => {
        if (!highlightRegex) return text;
        return text.replace(highlightRegex, (match) => `<span class="highlight">${match}</span>`);
    };

    // --- 新增邏輯：計算 HP/EXP ---
    let hpPerExpValue = 'N/A';
    const hp = parseInt(monster.hp);
    const exp = parseInt(monster.exp);

    if (!isNaN(hp) && !isNaN(exp) && exp > 0) {
        hpPerExpValue = (hp / exp).toFixed(2);
    } else if (monster.hp === 'none' || monster.exp === 'none' || exp === 0) {
         hpPerExpValue = 'None';
    }

    // 應用標記到怪物名稱
    const nameEnHighlighted = applyHighlight(monster.nameEn);
    const nameCnHighlighted = applyHighlight(monster.nameCn);

    // 應用標記到掉落物品
    const dropItemsHtml = monster.drops.map(drop => {
        return `<span>${applyHighlight(drop)}</span>`;
    }).join('');

    return `
        <div class="monster-card">
            <div class="monster-info-header">
                <div class="name-container">
                    <span class="name-en">${nameEnHighlighted}</span>
                    <span class="name-cn">${nameCnHighlighted}</span>
                </div>
                <span class="level">Lv. ${monster.level}</span>
                <span class="hp">HP: ${monster.hp}</span>
                <span class="exp">EXP: ${monster.exp}</span>
            </div>
            <div class="monster-stats">
                HP/EXP: <strong>${hpPerExpValue}</strong>
            </div>
            <div class="drop-list">
                ${dropItemsHtml}
            </div>
        </div>
    `;
}

/**
 * 執行篩選、排序和渲染結果
 */
function filterAndRender() {
    const searchText = searchInput.value.trim().toLowerCase();
    const minLevel = parseInt(minLevelInput.value) || 1;
    const maxLevel = parseInt(maxLevelInput.value) || Infinity;
    
    // 1. 執行過濾
    const filteredResults = originalMonsterData.filter(monster => {
        const monsterLevel = parseInt(monster.level);

        // 等級過濾：如果等級是 'none' 或不在範圍內，則跳過
        if (!isNaN(monsterLevel) && (monsterLevel < minLevel || monsterLevel > maxLevel)) {
            return false;
        }

        if (!searchText) {
            return true;
        }

        // 搜尋文字過濾
        // 檢查怪物名稱 (中/英) 或掉落物品是否包含搜尋詞
        const matchesName = monster.nameEn.toLowerCase().includes(searchText) || 
                            monster.nameCn.toLowerCase().includes(searchText);
        
        const matchesDrop = monster.drops.some(drop => 
            drop.toLowerCase().includes(searchText)
        );

        return matchesName || matchesDrop;
    });

    // 2. 渲染結果
    resultsGrid.innerHTML = '';

    if (filteredResults.length === 0) {
        resultsGrid.innerHTML = '<div class="no-results">未找到符合條件的怪物。</div>';
        statusMessage.textContent = '找到 0 筆記錄。';
    } else {
        const resultsHtml = filteredResults.map(monster => createMonsterCard(monster, searchText)).join('');
        resultsGrid.innerHTML = resultsHtml;
        statusMessage.textContent = `找到 ${filteredResults.length} 筆記錄。`;
    }
}

/**
 * 重置篩選條件並重新渲染
 */
function resetFilters() {
    searchInput.value = '';
    minLevelInput.value = '';
    maxLevelInput.value = '';
    filterAndRender();
}

/**
 * 逃逸正則表達式中的特殊字符
 * @param {string} string - 輸入字串
 * @returns {string} - 逃逸後的字串
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& 意指整個匹配到的字串
}

// --- 主題切換功能 ---

// 儲存主題設定
function saveTheme(theme) {
    localStorage.setItem('theme', theme);
}

// 載入主題設定
function loadTheme() {
    return localStorage.getItem('theme') || 'light';
}

// 應用主題
function applyTheme(theme) {
    const isDark = theme === 'dark';
    body.classList.toggle('dark-theme', isDark);
    body.classList.toggle('light-theme', !isDark);
    themeToggle.textContent = isDark ? '日間模式' : '夜間模式';
}

// 初始化/切換主題
function initTheme() {
    const currentTheme = loadTheme();
    applyTheme(currentTheme);

    themeToggle.addEventListener('click', () => {
        const newTheme = body.classList.contains('dark-theme') ? 'light' : 'dark';
        applyTheme(newTheme);
        saveTheme(newTheme);
    });
}


// --- 事件監聽器 ---

// 搜尋/篩選事件
searchInput.addEventListener('input', filterAndRender);
minLevelInput.addEventListener('input', filterAndRender);
maxLevelInput.addEventListener('input', filterAndRender);
resetFiltersButton.addEventListener('click', resetFilters);

// 頁面載入時執行初次渲染
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    filterAndRender();
});