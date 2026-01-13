/**
 * 五子棋游戏主逻辑
 * 包含游戏初始化、落子、胜负判定等功能
 */

// 游戏配置常量
const BOARD_SIZE = 15; // 棋盘大小 15x15
const CELL_SIZE = 40; // 每个格子的大小
const PADDING = 20; // 棋盘边距
const EMPTY = 0; // 空位
const BLACK = 1; // 黑棋
const WHITE = 2; // 白棋

// 五子棋游戏类
class GomokuGame {
    constructor(canvasId) {
        // 获取canvas元素和上下文
        this.canvas = document.getElementById(canvasId);

        // 验证canvas元素是否存在
        if (!this.canvas) {
            throw new Error(`找不到ID为 "${canvasId}" 的canvas元素`);
        }

        this.ctx = this.canvas.getContext('2d');

        // 动态计算并设置canvas尺寸
        const canvasSize = PADDING * 2 + (BOARD_SIZE - 1) * CELL_SIZE;
        this.canvas.width = canvasSize;
        this.canvas.height = canvasSize;

        // 初始化游戏状态
        this.board = []; // 棋盘数组
        this.history = []; // 历史记录（用于悔棋）
        this.currentPlayer = BLACK; // 当前玩家，黑棋先手
        this.gameOver = false; // 游戏是否结束

        // 初始化游戏
        this.initGame();

        // 绑定事件
        this.bindEvents();
    }

    /**
     * 初始化游戏
     */
    initGame() {
        // 创建空棋盘
        this.board = Array(BOARD_SIZE).fill(null)
            .map(() => Array(BOARD_SIZE).fill(EMPTY));

        // 重置游戏状态
        this.currentPlayer = BLACK;
        this.gameOver = false;
        this.history = [];

        // 更新UI显示
        this.updateUI();

        // 绘制棋盘
        this.drawBoard();
    }

    /**
     * 绘制棋盘
     */
    drawBoard() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制网格线
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;

        for (let i = 0; i < BOARD_SIZE; i++) {
            // 绘制横线
            this.ctx.beginPath();
            this.ctx.moveTo(PADDING, PADDING + i * CELL_SIZE);
            this.ctx.lineTo(PADDING + (BOARD_SIZE - 1) * CELL_SIZE, PADDING + i * CELL_SIZE);
            this.ctx.stroke();

            // 绘制竖线
            this.ctx.beginPath();
            this.ctx.moveTo(PADDING + i * CELL_SIZE, PADDING);
            this.ctx.lineTo(PADDING + i * CELL_SIZE, PADDING + (BOARD_SIZE - 1) * CELL_SIZE);
            this.ctx.stroke();
        }

        // 绘制天元和星位（标准15路棋盘的星位点）
        const starPoints = [
            [3, 3], [3, 7], [3, 11],
            [7, 3], [7, 7], [7, 11],
            [11, 3], [11, 7], [11, 11]
        ];

        this.ctx.fillStyle = '#333';
        starPoints.forEach(([x, y]) => {
            this.ctx.beginPath();
            this.ctx.arc(
                PADDING + x * CELL_SIZE,
                PADDING + y * CELL_SIZE,
                4,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        });

        // 绘制所有棋子
        this.drawPieces();
    }

    /**
     * 绘制棋盘上所有棋子
     */
    drawPieces() {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.board[row][col] !== EMPTY) {
                    this.drawPiece(row, col, this.board[row][col]);
                }
            }
        }
    }

    /**
     * 绘制单个棋子
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     * @param {number} player - 玩家（黑棋或白棋）
     * @param {boolean} isLastMove - 是否为最后一步
     */
    drawPiece(row, col, player, isLastMove = false) {
        const x = PADDING + col * CELL_SIZE;
        const y = PADDING + row * CELL_SIZE;
        const radius = CELL_SIZE / 2 - 3;

        // 绘制棋子阴影
        this.ctx.beginPath();
        this.ctx.arc(x + 2, y + 2, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fill();

        // 绘制棋子
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);

        // 设置棋子颜色（渐变效果）
        const gradient = this.ctx.createRadialGradient(
            x - radius / 3, y - radius / 3, radius / 10,
            x, y, radius
        );

        if (player === BLACK) {
            gradient.addColorStop(0, '#555');
            gradient.addColorStop(1, '#000');
        } else {
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(1, '#ddd');
        }

        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        // 标记最后一步
        if (isLastMove) {
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, Math.PI * 2);
            this.ctx.fillStyle = player === BLACK ? '#fff' : '#f00';
            this.ctx.fill();
        }
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 棋盘点击事件
        this.canvas.addEventListener('click', (e) => this.handleBoardClick(e));

        // 重新开始按钮
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.initGame();
        });

        // 悔棋按钮
        document.getElementById('undoBtn').addEventListener('click', () => {
            this.undoMove();
        });
    }

    /**
     * 处理棋盘点击事件
     * @param {MouseEvent} e - 鼠标事件
     */
    handleBoardClick(e) {
        // 如果游戏已结束，不允许落子
        if (this.gameOver) {
            return;
        }

        // 获取点击位置相对于canvas的坐标
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        // 计算最近的交叉点
        const col = Math.round((clickX - PADDING) / CELL_SIZE);
        const row = Math.round((clickY - PADDING) / CELL_SIZE);

        // 验证落子位置是否有效
        if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
            return;
        }

        // 检查该位置是否已有棋子
        if (this.board[row][col] !== EMPTY) {
            return;
        }

        // 落子
        this.makeMove(row, col);
    }

    /**
     * 落子
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     */
    makeMove(row, col) {
        // 保存到历史记录
        this.history.push({ row, col, player: this.currentPlayer });

        // 在棋盘上放置棋子
        this.board[row][col] = this.currentPlayer;

        // 重绘棋盘并标记最后一步
        this.drawBoard();
        this.drawPiece(row, col, this.currentPlayer, true);

        // 检查是否获胜
        if (this.checkWin(row, col)) {
            this.gameOver = true;
            const winner = this.currentPlayer === BLACK ? '⚫ 黑棋' : '⚪ 白棋';
            document.getElementById('gameStatus').textContent = `${winner}获胜！`;
            document.getElementById('gameStatus').style.color = '#e74c3c';
            return;
        }

        // 检查是否平局
        if (this.history.length === BOARD_SIZE * BOARD_SIZE) {
            this.gameOver = true;
            document.getElementById('gameStatus').textContent = '平局！';
            document.getElementById('gameStatus').style.color = '#f39c12';
            return;
        }

        // 切换玩家
        this.currentPlayer = this.currentPlayer === BLACK ? WHITE : BLACK;
        this.updateUI();
    }

    /**
     * 悔棋
     */
    undoMove() {
        // 如果没有历史记录，不允许悔棋
        if (this.history.length === 0) {
            return;
        }

        // 获取最后一步
        const lastMove = this.history.pop();
        this.board[lastMove.row][lastMove.col] = EMPTY;

        // 切换回上一个玩家
        this.currentPlayer = lastMove.player;

        // 如果之前游戏已结束，悔棋后恢复游戏状态
        if (this.gameOver) {
            this.gameOver = false;
        }

        // 重绘棋盘
        this.drawBoard();

        // 标记新的最后一步
        if (this.history.length > 0) {
            const prevMove = this.history[this.history.length - 1];
            this.drawPiece(prevMove.row, prevMove.col, prevMove.player, true);
        }

        this.updateUI();
    }

    /**
     * 检查是否获胜
     * @param {number} row - 最后落子的行
     * @param {number} col - 最后落子的列
     * @returns {boolean} 是否获胜
     */
    checkWin(row, col) {
        const player = this.board[row][col];

        // 检查四个方向：横、竖、左斜、右斜
        const directions = [
            [0, 1],   // 横向
            [1, 0],   // 纵向
            [1, 1],   // 右斜（左上到右下）
            [1, -1]   // 左斜（右上到左下）
        ];

        for (const [dx, dy] of directions) {
            let count = 1; // 当前棋子

            // 向一个方向计数
            count += this.countDirection(row, col, dx, dy, player);
            // 向相反方向计数
            count += this.countDirection(row, col, -dx, -dy, player);

            // 如果连成五子或以上，获胜
            if (count >= 5) {
                return true;
            }
        }

        return false;
    }

    /**
     * 统计某个方向上连续相同棋子的数量
     * @param {number} row - 起始行
     * @param {number} col - 起始列
     * @param {number} dx - 行方向
     * @param {number} dy - 列方向
     * @param {number} player - 玩家
     * @returns {number} 连续棋子数量
     */
    countDirection(row, col, dx, dy, player) {
        let count = 0;
        let newRow = row + dx;
        let newCol = col + dy;

        while (
            newRow >= 0 && newRow < BOARD_SIZE &&
            newCol >= 0 && newCol < BOARD_SIZE &&
            this.board[newRow][newCol] === player
        ) {
            count++;
            newRow += dx;
            newCol += dy;
        }

        return count;
    }

    /**
     * 更新UI显示
     */
    updateUI() {
        // 更新当前玩家显示
        const playerSpan = document.getElementById('currentPlayer');
        playerSpan.textContent = this.currentPlayer === BLACK ? '⚫ 黑棋' : '⚪ 白棋';

        // 更新游戏状态
        if (!this.gameOver) {
            const status = document.getElementById('gameStatus');
            status.textContent = '游戏进行中';
            status.style.color = '#28a745';
        }
    }
}

// 游戏启动入口
document.addEventListener('DOMContentLoaded', () => {
    // 创建游戏实例
    new GomokuGame('gameBoard');
});
