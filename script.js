const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const healthDisplay = document.getElementById('health');
const scoreDisplay = document.getElementById('score');
const bombsDisplay = document.getElementById('bombs');
const questTitleDisplay = document.getElementById('quest-title');
const questDescriptionDisplay = document.getElementById('quest-description');
const questObjectivesDisplay = document.getElementById('quest-objectives');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreDisplay = document.getElementById('final-score');
const victoryScreen = document.getElementById('victory-screen');
const finalVictoryScoreDisplay = document.getElementById('final-victory-score');


// Game Settings
canvas.width = 800;
canvas.height = 600;
const groundHeight = 50;
let gameSpeed = 5; // For parallax scrolling of background elements
let gameRunning = true;

// Player
let player = {
    x: 50,
    y: canvas.height - groundHeight - 50,
    width: 40,
    height: 60,
    color: '#ff6347', // Tomato
    dx: 0,
    dy: 0,
    speed: 5,
    jumpForce: 15,
    gravity: 0.8,
    isJumping: false,
    health: 100,
    score: 0,
    bombs: 5,
    bombCooldown: 0,
    maxBombCooldown: 60 // 1 second at 60fps
};

// Enemies
let enemies = [];
const enemyTypes = {
    grunt: { color: '#8b0000', width: 30, height: 50, speed: 2, health: 30, damage: 10, points: 50 },
    flyer: { color: '#4b0082', width: 40, height: 30, speed: 3, health: 20, damage: 15, points: 75, flies: true, y: 100 }
};

// Coins
let coins = [];

// Bombs (Projectiles)
let activeBombs = [];
const bombSpeed = 7;
const bombRadius = 10;
const explosionRadius = 50;
const explosionDuration = 30; // frames

// --- QUEST SYSTEM ---
let quests = [
    {
        id: 1,
        title: "Basic Training",
        description: "Get accustomed to the controls.",
        objectives: [
            { type: 'collect_coins', target: 5, current: 0, text: "Collect 5 Coins", completed: false },
            { type: 'defeat_enemies', enemyType: 'grunt', target: 2, current: 0, text: "Defeat 2 Grunts", completed: false }
        ],
        reward: { bombs: 3, score: 100 },
        isActive: false,
        isCompleted: false
    },
    {
        id: 2,
        title: "Pest Control",
        description: "Clear out the remaining hostiles.",
        objectives: [
            { type: 'defeat_enemies', enemyType: 'grunt', target: 3, current: 0, text: "Defeat 3 Grunts", completed: false },
            { type: 'defeat_enemies', enemyType: 'flyer', target: 1, current: 0, text: "Defeat 1 Flyer", completed: false }
        ],
        reward: { bombs: 5, score: 250 },
        isActive: false,
        isCompleted: false
    },
    {
        id: 3,
        title: "Treasure Hunter",
        description: "Amass a small fortune.",
        objectives: [
            { type: 'collect_coins', target: 15, current: 0, text: "Collect 15 Coins", completed: false }
        ],
        reward: { health: 50, score: 300 },
        isActive: false,
        isCompleted: false
    }
];
let currentQuest = null;

// --- GAME FUNCTIONS ---

function initGame() {
    player = {
        x: 50,
        y: canvas.height - groundHeight - 60, // Adjusted for height
        width: 40,
        height: 60,
        color: '#ff6347',
        dx: 0,
        dy: 0,
        speed: 5,
        jumpForce: 15,
        gravity: 0.8,
        isJumping: false,
        health: 100,
        score: 0,
        bombs: 5,
        bombCooldown: 0,
        maxBombCooldown: 60
    };
    enemies = [];
    coins = [];
    activeBombs = [];
    quests.forEach(q => {
        q.isCompleted = false;
        q.isActive = false;
        q.objectives.forEach(obj => {
            obj.current = 0;
            obj.completed = false;
        });
    });
    currentQuest = null;
    gameRunning = true;
    gameOverScreen.style.display = 'none';
    victoryScreen.style.display = 'none';

    spawnInitialEntities();
    activateNextQuest();
    updateUI();
    gameLoop();
}

function spawnInitialEntities() {
    // Spawn some initial coins
    for (let i = 0; i < 10; i++) {
        spawnCoin(200 + i * 70, canvas.height - groundHeight - 30 - Math.random() * 50);
    }
    // Spawn some initial enemies
    spawnEnemy(400, 'grunt');
    spawnEnemy(600, 'grunt');
    spawnEnemy(700, 'flyer');
}


function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    // Simple gun representation
    ctx.fillStyle = '#555';
    ctx.fillRect(player.x + player.width -10, player.y + player.height / 2 - 5, 15, 10);
}

function updatePlayer() {
    // Horizontal movement
    player.x += player.dx;

    // Vertical movement (jump & gravity)
    player.y += player.dy;
    if (player.y + player.height < canvas.height - groundHeight) {
        player.dy += player.gravity;
        player.isJumping = true;
    } else {
        player.dy = 0;
        player.isJumping = false;
        player.y = canvas.height - groundHeight - player.height;
    }

    // Keep player within bounds (simple left/right for now)
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    // Bomb cooldown
    if (player.bombCooldown > 0) player.bombCooldown--;
}

function spawnEnemy(x, type) {
    const proto = enemyTypes[type];
    enemies.push({
        x: x,
        y: proto.flies ? proto.y : canvas.height - groundHeight - proto.height,
        width: proto.width,
        height: proto.height,
        color: proto.color,
        speed: proto.speed * (Math.random() < 0.5 ? 1 : -1), // Random initial direction
        health: proto.health,
        type: type,
        damage: proto.damage,
        points: proto.points,
        flies: !!proto.flies,
        initialY: proto.flies ? proto.y : 0, // For flyer bobbing
        bobOffset: 0,
        bobSpeed: 0.05
    });
}

function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        // Health bar for enemy
        if (enemy.health < enemyTypes[enemy.type].health) {
            ctx.fillStyle = 'red';
            ctx.fillRect(enemy.x, enemy.y - 10, enemy.width, 5);
            ctx.fillStyle = 'green';
            ctx.fillRect(enemy.x, enemy.y - 10, enemy.width * (enemy.health / enemyTypes[enemy.type].health), 5);
        }
    });
}

function updateEnemies() {
    enemies.forEach((enemy, index) => {
        enemy.x += enemy.speed;

        // Basic AI: bounce off screen edges or predefined patrol area
        if (enemy.x < 0 || enemy.x + enemy.width > canvas.width) {
            enemy.speed *= -1;
        }
        if (enemy.flies) {
            enemy.bobOffset += enemy.bobSpeed;
            enemy.y = enemy.initialY + Math.sin(enemy.bobOffset) * 20; // Bob up and down
        }

        // Check collision with player
        if (checkCollision(player, enemy)) {
            player.health -= enemy.damage;
            // Simple knockback / bounce
            player.x += (player.x > enemy.x ? 20 : -20); // Knockback player
            enemy.speed *= -1; // Enemy bounces off
            if (player.health <= 0) {
                player.health = 0;
                endGame(false);
            }
        }
    });
}

function spawnCoin(x, y) {
    coins.push({ x: x, y: y, size: 15, value: 10, color: '#ffd700' }); // Gold
}

function drawCoins() {
    coins.forEach(coin => {
        ctx.fillStyle = coin.color;
        ctx.beginPath();
        ctx.arc(coin.x + coin.size / 2, coin.y + coin.size / 2, coin.size / 2, 0, Math.PI * 2);
        ctx.fill();
    });
}

function updateCoins() {
    coins.forEach((coin, index) => {
        if (checkCollision(player, { ...coin, width: coin.size, height: coin.size })) {
            player.score += coin.value;
            coins.splice(index, 1); // Remove collected coin
            checkQuestProgress('collect_coins', 1);
            // Potentially spawn a new coin elsewhere
            if (Math.random() < 0.3) spawnCoin(Math.random() * (canvas.width - 50) + 25, canvas.height - groundHeight - 30 - Math.random() * 100);
        }
    });
}

function shootBomb() {
    if (player.bombs > 0 && player.bombCooldown <= 0) {
        player.bombs--;
        player.bombCooldown = player.maxBombCooldown;
        activeBombs.push({
            x: player.x + player.width,
            y: player.y + player.height / 2,
            dx: bombSpeed, // Shoots right by default
            // dy: 0, // Could add arc later
            radius: bombRadius,
            color: '#333',
            timer: 120, // 2 seconds before auto-explode
            isExploding: false,
            explosionTimer: 0
        });
    }
}

function drawBombs() {
    activeBombs.forEach(bomb => {
        if (bomb.isExploding) {
            ctx.fillStyle = 'rgba(255, 165, 0, 0.5)'; // Orange, semi-transparent
            ctx.beginPath();
            ctx.arc(bomb.x, bomb.y, explosionRadius * (bomb.explosionTimer / explosionDuration), 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = bomb.color;
            ctx.beginPath();
            ctx.arc(bomb.x, bomb.y, bomb.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function updateBombs() {
    activeBombs.forEach((bomb, bombIndex) => {
        if (bomb.isExploding) {
            bomb.explosionTimer++;
            if (bomb.explosionTimer >= explosionDuration) {
                activeBombs.splice(bombIndex, 1); // Remove after explosion finishes
            }
            return; // Skip other logic if exploding
        }

        bomb.x += bomb.dx;
        // bomb.y += bomb.dy; // If bomb has vertical movement
        bomb.timer--;

        // Check collision with enemies or auto-explode
        let exploded = false;
        if (bomb.timer <= 0) {
            exploded = true;
        } else {
            enemies.forEach((enemy, enemyIndex) => {
                if (checkCollision(
                    { x: bomb.x - bomb.radius, y: bomb.y - bomb.radius, width: bomb.radius * 2, height: bomb.radius * 2 },
                    enemy
                )) {
                    exploded = true;
                }
            });
        }
        
        // Boundary check for bombs
        if (bomb.x - bomb.radius > canvas.width || bomb.x + bomb.radius < 0) {
            activeBombs.splice(bombIndex, 1); // Remove if off-screen
            return;
        }


        if (exploded) {
            bomb.isExploding = true;
            bomb.explosionTimer = 0;
            // Damage enemies in radius
            enemies.forEach((enemy, enemyIndex) => {
                const dist = Math.sqrt(Math.pow(enemy.x + enemy.width / 2 - bomb.x, 2) + Math.pow(enemy.y + enemy.height / 2 - bomb.y, 2));
                if (dist < explosionRadius + Math.max(enemy.width, enemy.height) / 2) { // A bit generous with hit detection
                    enemy.health -= 50; // Bomb damage
                    if (enemy.health <= 0) {
                        player.score += enemy.points;
                        checkQuestProgress('defeat_enemies', 1, enemy.type);
                        enemies.splice(enemyIndex, 1);
                        // Spawn a new enemy of a random type (or specific if needed)
                        const enemyTypesArray = Object.keys(enemyTypes);
                        const randomEnemyType = enemyTypesArray[Math.floor(Math.random() * enemyTypesArray.length)];
                        spawnEnemy(canvas.width + Math.random() * 100, randomEnemyType);
                    }
                }
            });
        }
    });
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function drawGround() {
    ctx.fillStyle = '#556b2f'; // Dark Olive Green
    ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);
}

function drawBackground() {
    // Simple parallax could be added here with multiple layers moving at different speeds
    ctx.fillStyle = '#add8e6'; // Light blue sky
    ctx.fillRect(0, 0, canvas.width, canvas.height - groundHeight);

    // Some static clouds for minimal "realism"
    drawCloud(100, 50, 60);
    drawCloud(300, 80, 80);
    drawCloud(550, 60, 50);
    drawCloud(700, 100, 70);
}

function drawCloud(x, y, size) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
    ctx.arc(x + size * 0.3, y - size * 0.1, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x + size * 0.7, y, size * 0.35, 0, Math.PI * 2);
    ctx.arc(x + size * 0.4, y + size * 0.15, size * 0.3, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
}


function updateUI() {
    healthDisplay.textContent = player.health;
    scoreDisplay.textContent = player.score;
    bombsDisplay.textContent = player.bombs;

    if (currentQuest) {
        questTitleDisplay.textContent = currentQuest.title;
        questDescriptionDisplay.textContent = currentQuest.description;
        questObjectivesDisplay.innerHTML = '';
        currentQuest.objectives.forEach(obj => {
            const li = document.createElement('li');
            li.textContent = `${obj.text} (${obj.current}/${obj.target})`;
            if (obj.completed) {
                li.classList.add('completed');
            }
            questObjectivesDisplay.appendChild(li);
        });
    } else {
        questTitleDisplay.textContent = "No Quest Active";
        questDescriptionDisplay.textContent = "";
        questObjectivesDisplay.innerHTML = '';
    }
}

function activateNextQuest() {
    if (currentQuest && !currentQuest.isCompleted) return; // Don't activate if current one isn't done

    const nextQuest = quests.find(q => !q.isCompleted && !q.isActive);
    if (nextQuest) {
        currentQuest = nextQuest;
        currentQuest.isActive = true;
        console.log(`New Quest: ${currentQuest.title}`);
    } else {
        currentQuest = null;
        // Check if all quests are completed
        if (quests.every(q => q.isCompleted)) {
            endGame(true); // Victory
        }
        console.log("All quests completed or no new quests!");
    }
    updateUI();
}

function checkQuestProgress(type, amount, detail = null) {
    if (!currentQuest || currentQuest.isCompleted) return;

    let questObjectiveChanged = false;
    currentQuest.objectives.forEach(obj => {
        if (!obj.completed && obj.type === type) {
            if (type === 'collect_coins') {
                obj.current += amount;
            } else if (type === 'defeat_enemies' && obj.enemyType === detail) {
                obj.current += amount;
            }
            // Add other objective types here

            if (obj.current >= obj.target) {
                obj.current = obj.target; // Cap at target
                obj.completed = true;
                console.log(`Objective completed: ${obj.text}`);
            }
            questObjectiveChanged = true;
        }
    });

    if (questObjectiveChanged) {
        updateUI(); // Update immediately to show progress

        // Check if all objectives for the current quest are completed
        if (currentQuest.objectives.every(obj => obj.completed)) {
            completeCurrentQuest();
        }
    }
}

function completeCurrentQuest() {
    if (!currentQuest) return;

    console.log(`Quest Completed: ${currentQuest.title}`);
    currentQuest.isCompleted = true;
    currentQuest.isActive = false;

    // Apply rewards
    if (currentQuest.reward) {
        if (currentQuest.reward.bombs) player.bombs += currentQuest.reward.bombs;
        if (currentQuest.reward.score) player.score += currentQuest.reward.score;
        if (currentQuest.reward.health) {
            player.health += currentQuest.reward.health;
            if (player.health > 100) player.health = 100; // Max health
        }
    }

    // Optionally, show a quest completion message on screen for a bit

    activateNextQuest(); // Try to activate the next one
    updateUI();
}


function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function gameLoop() {
    if (!gameRunning) return;

    clearCanvas();

    drawBackground();
    drawGround();

    drawPlayer();
    updatePlayer();

    drawEnemies();
    updateEnemies();

    drawCoins();
    updateCoins();

    drawBombs();
    updateBombs();

    updateUI(); // Continuously update UI for stats

    requestAnimationFrame(gameLoop);
}

function endGame(isVictory) {
    gameRunning = false;
    if (isVictory) {
        finalVictoryScoreDisplay.textContent = player.score;
        victoryScreen.style.display = 'flex';
    } else {
        finalScoreDisplay.textContent = player.score;
        gameOverScreen.style.display = 'flex';
    }
}

function restartGame() {
    initGame();
}

// Event Listeners
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === 'ArrowLeft') player.dx = -player.speed;
    if (e.key === 'ArrowRight') player.dx = player.speed;
    if ((e.key === 'ArrowUp' || e.key === ' ') && !player.isJumping && e.target === document.body) {
        // e.target check prevents jump when button focused
        player.dy = -player.jumpForce;
        player.isJumping = true;
    }
    if (e.key === 'Control' || e.key.toLowerCase() === 'f') { // Use 'f' or Ctrl as bomb key
        e.preventDefault(); // Prevent browser find
        shootBomb();
    }
     // Allow space to shoot bomb too, but prioritize jump if on ground.
    if (e.key === ' ' && player.isJumping && e.target === document.body) {
        e.preventDefault();
        shootBomb();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    if (e.key === 'ArrowLeft' && player.dx < 0) player.dx = 0;
    if (e.key === 'ArrowRight' && player.dx > 0) player.dx = 0;
});


// Start the game
initGame();
