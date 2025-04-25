const playBtn = document.querySelector("#play");
const startScreen = document.querySelector("#start");
const gameScreen = document.querySelector("#game");
const levelSelect = document.querySelector("#level");
const nameInput = document.querySelector("#player-name");
const board = document.querySelector("#gameboard");
const ctx = board.getContext("2d");
const startModal = document.querySelector("#start-modal");
const closeModal = document.querySelector("#start-modalclose");
const tooltip = document.querySelector("#tooltip");
const timer = document.querySelector("#time");
const scoreDisplay = document.querySelector("#score");
const evoScoreDisplay = document.querySelector("#evolution-scores");
const gameOverModal = document.querySelector("#game-over-modal");
const finalScore = document.querySelector("#final-score");
const finalEvoScore = document.querySelector("#final-evolution-scores");
const restartBtn = document.querySelector("#restart-game");

let tooltipTimeout = null;
let hoveredItem = null;
let items = new Map();
let draggedItem = null;
let dragStartPos = null;
let timeLeft = 0;
let score = 0;
let timerInterval = null;
let evoScores = new Map();

closeModal.addEventListener("click", () => {
    startModal.style.display = "none";
});

function getLevelTime() {
    const level = levelSelect.value;
    return levels[level].time * 60;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateTimer() {
    timeLeft--;
    timer.textContent = formatTime(timeLeft);
    
    if (timeLeft <= 0) {
        clearInterval(timerInterval);
        endGame();
    }
}

function addScore(points) {
    score += points;
    scoreDisplay.textContent = score;
}

function updateEvoScores() {
    evoScoreDisplay.innerHTML = '';
    
    evolutions.forEach(evo => {
        const points = evoScores.get(evo.name) || 0;
        const scoreEl = document.createElement('div');
        scoreEl.className = 'evolution-score-item';
        scoreEl.innerHTML = `
            <span>${evo.name}</span>
            <span class="score">${points} points</span>
        `;
        evoScoreDisplay.appendChild(scoreEl);
    });
}

function startGame() {
    timeLeft = getLevelTime();
    score = 0;
    evoScores.clear();
    timer.textContent = formatTime(timeLeft);
    scoreDisplay.textContent = "0";
    updateEvoScores();
    
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    timerInterval = setInterval(updateTimer, 1000);
}

function drawCell(row, col, width, height) {
    const x = col * width;
    const y = row * height;

    ctx.strokeStyle = "#947c6d";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
}

function showTooltip(item, x, y) {
    const evo = evolutions.find(e => 
        e.steps.some(step => step.name === item.name)
    );

    if (!evo) return;

    const tooltipContent = `
        <h3>${evo.name}</h3>
        <p>${evo.description}</p>
        <div class="evolution-chain">
            ${evo.steps.map(step => `
                <div class="evolution-step">
                    <img src="logos/${step.img}" alt="${step.name}">
                    <span>${step.name}</span>
                </div>
            `).join('')}
        </div>
    `;

    tooltip.innerHTML = tooltipContent;
    tooltip.style.left = `${x + 10}px`;
    tooltip.style.top = `${y + 10}px`;
    tooltip.classList.add("show");
}

function hideTooltip() {
    tooltip.classList.remove("show");
    if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
    }
    hoveredItem = null;
}

function isInCell(mouseX, mouseY, cellX, cellY, cellWidth, cellHeight) {
    return (
        mouseX >= cellX && mouseX <= cellX + cellWidth &&
        mouseY >= cellY && mouseY <= cellY + cellHeight
    );
}

function setupTooltip(item, cellX, cellY, cellWidth, cellHeight) {
    const cell = { item, cellX, cellY, cellWidth, cellHeight };

    board.addEventListener("mousemove", (e) => onMouseMove(e, cell));
    board.addEventListener("mouseout", hideTooltip);
}

function onMouseMove(e, { item, cellX, cellY, cellWidth, cellHeight }) {
    const rect = board.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isInCell(mouseX, mouseY, cellX, cellY, cellWidth, cellHeight)) {
        if (hoveredItem !== item) {
            hoveredItem = item;
            if (tooltipTimeout) clearTimeout(tooltipTimeout);
            tooltipTimeout = setTimeout(() => {
                showTooltip(item, cellX, cellY);
            }, 3000);
        }
    } else if (hoveredItem === item) {
        hideTooltip();
    }
}

function getEmptyCell(rows, cols) {
    const empty = [];
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const key = `${row},${col}`;
            if (!items.has(key)) {
                empty.push({ row, col });
            }
        }
    }
    return empty.length > 0 ? empty[Math.floor(Math.random() * empty.length)] : null;
}

function getItem(row, col) {
    return items.get(`${row},${col}`);
}

function removeItem(row, col) {
    items.delete(`${row},${col}`);
    redrawBoard();
}

function redrawBoard() {
    const { rows, cols } = levels[levelSelect.value];
    const cellWidth = board.width / cols;
    const cellHeight = board.height / rows;

    ctx.clearRect(0, 0, board.width, board.height);

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            drawCell(row, col, cellWidth, cellHeight);
        }
    }

    items.forEach((item, key) => {
        const [row, col] = key.split(',').map(Number);
        const x = col * cellWidth;
        const y = row * cellHeight;

        const img = new Image();
        img.src = "logos/" + item.img;
        img.onload = () => {
            ctx.clearRect(x, y, cellWidth, cellHeight);
            drawCell(row, col, cellWidth, cellHeight);
            ctx.drawImage(img, x + 5, y + 5, cellWidth - 10, cellHeight - 10);
        };

        setupTooltip(item, x, y, cellWidth, cellHeight);
    });
}

function getNextEvo(tech) {
    for (let evo of evolutions) {
        for (let step of evo.steps) {
            if (step.name === tech.name) {
                const idx = evo.steps.indexOf(step);
                if (idx < evo.steps.length - 1) {
                    return evo.steps[idx + 1];
                }
                return null;
            }
        }
    }
    return null;
}

function getMergeScore(tech) {
    for (let evo of evolutions) {
        for (let step of evo.steps) {
            if (step.name === tech.name) {
                const idx = evo.steps.indexOf(step);
                const points = evo.points * (idx + 1);
                
                let multiplier = 1;
                if (levelSelect.value === "medium") multiplier = 2;
                if (levelSelect.value === "hard") multiplier = 3;
                
                const total = points * multiplier;
                const current = evoScores.get(evo.name) || 0;
                evoScores.set(evo.name, current + total);
                updateEvoScores();
                return total;
            }
        }
    }
    return 0;
}

function mergeTechs(tech1, tech2, targetRow, targetCol) {
    if (tech1.name !== tech2.name) return false;
    
    const nextStep = getNextEvo(tech1);
    if (!nextStep) return false;
    
    items.delete(`${tech1.row},${tech1.col}`);
    items.delete(`${tech2.row},${tech2.col}`);
    
    const newTech = {
        ...nextStep,
        row: targetRow,
        col: targetCol
    };
    
    items.set(`${targetRow},${targetCol}`, newTech);
    addScore(getMergeScore(tech1));
    redrawBoard();
    return true;
}

function onMouseDown(e) {
    const rect = board.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const { rows, cols } = levels[levelSelect.value];
    const cellWidth = board.width / cols;
    const cellHeight = board.height / rows;

    const clickedCol = Math.floor(mouseX / cellWidth);
    const clickedRow = Math.floor(mouseY / cellHeight);

    const clickedItem = getItem(clickedRow, clickedCol);
    if (clickedItem) {
        draggedItem = clickedItem;
        dragStartPos = { row: clickedRow, col: clickedCol };
    }
}

function onMouseUp(e) {
    if (!draggedItem) return;

    const rect = board.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const { rows, cols } = levels[levelSelect.value];
    const cellWidth = board.width / cols;
    const cellHeight = board.height / rows;

    const targetCol = Math.floor(mouseX / cellWidth);
    const targetRow = Math.floor(mouseY / cellHeight);

    const targetItem = getItem(targetRow, targetCol);

    if (targetItem && targetItem !== draggedItem) {
        if (!mergeTechs(draggedItem, targetItem, targetRow, targetCol)) {
            redrawBoard();
        }
    } else if (!targetItem) {
        removeItem(draggedItem.row, draggedItem.col);
        draggedItem.row = targetRow;
        draggedItem.col = targetCol;
        items.set(`${targetRow},${targetCol}`, draggedItem);
        redrawBoard();
    } else {
        redrawBoard();
    }

    draggedItem = null;
    dragStartPos = null;
}

function onClick(e) {
    const rect = board.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const { rows, cols } = levels[levelSelect.value];
    const cellWidth = board.width / cols;
    const cellHeight = board.height / rows;

    const clickedCol = Math.floor(mouseX / cellWidth);
    const clickedRow = Math.floor(mouseY / cellHeight);

    spawnTech(rows, cols, clickedRow, clickedCol);
}

function spawnTech(rows, cols, clickedRow, clickedCol) {
    const cellKey = `${clickedRow},${clickedCol}`;
    if (items.has(cellKey)) return;
    
    let allowedLevels = ["easy"];
    if (levelSelect.value === "medium") allowedLevels.push("medium");
    if (levelSelect.value === "hard") allowedLevels.push("hard");
    
    let availableTechs = [];
    for (let evo of evolutions) {
        if (allowedLevels.includes(evo.difficulty)) {
            let firstStep = evo.steps[0];
            if (firstStep) availableTechs.push(firstStep);
        }
    }
    
    if (availableTechs.length === 0) return;
    
    const randomTech = availableTechs[Math.floor(Math.random() * availableTechs.length)];
    const newTech = {
        ...randomTech,
        row: clickedRow,
        col: clickedCol
    };
    
    items.set(cellKey, newTech);
    redrawBoard();
}

function initBoard(rows, cols) {
    ctx.clearRect(0, 0, board.width, board.height);
    items.clear();

    const cellWidth = board.width / cols;
    const cellHeight = board.height / rows;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            drawCell(row, col, cellWidth, cellHeight);
        }
    }

    let allowedLevels = ["easy"];
    if (levelSelect.value === "medium") allowedLevels.push("medium");
    if (levelSelect.value === "hard") allowedLevels.push("hard");
    
    let availableTechs = [];
    for (let evo of evolutions) {
        if (allowedLevels.includes(evo.difficulty)) {
            let firstStep = evo.steps[0];
            if (firstStep) availableTechs.push(firstStep);
        }
    }
    
    availableTechs.sort(() => Math.random() - 0.5);
    const techCount = Math.min(cols, availableTechs.length);
    const selectedTechs = availableTechs.slice(0, techCount);
    
    let positions = [];
    while (positions.length < selectedTechs.length) {
        const row = Math.floor(Math.random() * rows);
        const col = Math.floor(Math.random() * cols);
        const pos = `${row},${col}`;
        
        if (!positions.some(p => p === pos)) {
            positions.push(pos);
            const tech = {
                ...selectedTechs[positions.length - 1],
                row: row,
                col: col
            };
            items.set(pos, tech);
        }
    }

    redrawBoard();

    board.addEventListener('mousedown', onMouseDown);
    board.addEventListener('mouseup', onMouseUp);
    board.addEventListener('click', onClick);
}

function endGame() {
    board.removeEventListener('mousedown', onMouseDown);
    board.removeEventListener('mouseup', onMouseUp);
    board.removeEventListener('click', onClick);
    
    finalScore.textContent = score;
    
    finalEvoScore.innerHTML = '';
    evolutions.forEach(evo => {
        const points = evoScores.get(evo.name) || 0;
        const item = document.createElement('div');
        item.className = 'evolution-score-item';
        item.innerHTML = `
            <span>${evo.name}</span>
            <span class="score">${points} points</span>
        `;
        finalEvoScore.appendChild(item);
    });
    
    gameOverModal.style.display = "flex";
}

function resetGame() {
    gameOverModal.style.display = "none";
    
    score = 0;
    evoScores.clear();
    scoreDisplay.textContent = "0";
    updateEvoScores();
    
    timeLeft = getLevelTime();
    timer.textContent = formatTime(timeLeft);
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
    
    const { rows, cols } = levels[levelSelect.value];
    initBoard(rows, cols);
}

playBtn.addEventListener("click", () => {
    if (!nameInput.value || !levelSelect.value) {
        startModal.style.display = "flex";
    } else {
        startScreen.style.display = "none";
        gameScreen.style.display = "block";
        document.querySelector("#name-info").textContent = nameInput.value;
        document.querySelector("#level-info").textContent = levelSelect.value;

        const { rows, cols } = levels[levelSelect.value];
        initBoard(rows, cols);
        startGame();
    }
});

restartBtn.addEventListener("click", resetGame);
