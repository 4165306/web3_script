window.__mase__ = '';
const _upEl = document.querySelector('div.grid > button:nth-child(2)')
const _leftEl = document.querySelector('div.grid > button:nth-child(4)')
const _downEl = document.querySelector('div.grid > button:nth-child(5)')
const _rightEl = document.querySelector('div.grid > button:nth-child(6)')
function findMazePath(walls, start, goal) {
    const rows = walls.length; 
    const cols = rows > 0 ? walls[0].length : 0;
    const visited = Array.from({  length: rows }, () => Array(cols).fill(false));
    const parent = Array.from({  length: rows }, () => Array(cols).fill(null));
    const directions = [
        { name: '上', dx: -1, dy: 0, mask: 0b0001 },  // 上方向对应第1位（权值1）
        { name: '右', dx: 0, dy: 1, mask: 0b0010 },   // 右方向对应第2位（权值2）
        { name: '下', dx: 1, dy: 0, mask: 0b0100 },   // 下方向对应第3位（权值4）
        { name: '左', dx: 0, dy: -1, mask: 0b1000 }   // 左方向对应第4位（权值8）
    ];

    const queue = [{ x: start[0], y: start[1] }];
    visited[start[0]][start[1]] = true;

    while (queue.length  > 0) {
        const { x, y } = queue.shift(); 

        // 到达终点，回溯生成路径 
        if (x === goal[0] && y === goal[1]) {
            const path = [];
            let currentX = x, currentY = y;
            while (currentX !== start[0] || currentY !== start[1]) {
                const step = parent[currentX][currentY];
                path.push(step.name); 
                currentX = step.x;
                currentY = step.y;
            }
            return path.reverse(); 
        }

        // 遍历四个方向 
        for (const dir of directions) {
            const nx = x + dir.dx; 
            const ny = y + dir.dy; 

            // 检查边界合法性 
            if (nx < 0 || nx >= rows || ny < 0 || ny >= cols) continue;

            // 检查是否已访问 
            if (visited[nx][ny]) continue;

            // 检查当前单元格是否有墙阻挡 
            if ((walls[x][y] & dir.mask)  !== 0) continue;

            // 更新父节点和访问状态 
            visited[nx][ny] = true;
            parent[nx][ny] = { name: dir.name,  x, y };
            queue.push({  x: nx, y: ny });
        }
    }

    return null; // 无解 
}
const originalFetch = window.fetch;   
window.fetch  = async (input, init) => {  
    const controller = new AbortController();  
    const signal = controller.signal;   
    try {  
        const response = await originalFetch(input, { ...init, signal });  
        if (response.url.includes('/api/trpc/faucet.getMaze'))  {  
            const text = await response.clone().text();   
            // 加入计时队列，让页面先处理完数据再来走迷宫
            setTimeout(async () => {
                const mazeData = []
                for (const line of text.split('\n')) {
                    // 忽略空行和解析失败的，它不是一个标准的json,是由3段json组合出来的数据
                    try {
                        const maze = JSON.parse(line)
                        mazeData.push(maze)
                    } catch (error) {}
                }
                const maze = mazeData[3].json[2][0][0]
                const mazeEndPoint = [maze.goalPos.row, maze.goalPos.col]
                const mazeStartPoint = [0,0]
                const steps = findMazePath(maze.walls, mazeStartPoint, mazeEndPoint)
                if (steps === null ) {
                    console.log('解谜失败')
                }
                // step: 上右下左
                // 该版本为提示版，未绕过网站js事件检测
                // 如果需要绕过event.isTrusted 可以使用外部服务，发送一个HTTP请求模拟按键
                // 也可使用指纹浏览器来模拟按键
                for (const step of steps) {
                    step === '上' ? _upEl.click() : 
                    step === '下' ? _downEl.click() : 
                    step === '左' ? _leftEl.click() : 
                    step === '右' ? _rightEl.click() : ''
                    await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random()  * 51) + 50))
                }
            }, 500)
        }  
        return response;  
    } catch (err) {  
        if (err.name  === 'AbortError') {  
        console.log(' 请求被安全中止');  
        return new Response(null, { status: 499 }); // 自定义中止状态码  
        }  
        throw err;  
    }  
}; 