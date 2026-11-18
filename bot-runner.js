const WebSocket = require('ws');

const WAIT_BEFORE_RECONNECT_MS = 5000;
const SEND_INTERVAL_MS = 500;
const ARENA = 230;

function createBot(number, url, stopped) {
    const name = `Bot-${number}`;
    let socket;
    let timer;
    let x = Math.round((Math.random() - 0.5) * 120);
    let y = Math.round((Math.random() - 0.5) * 120);
    let direction = Math.random() * 360;
    let playerId = null;

    const connect = () => {
        if (stopped.value) return;
        socket = new WebSocket(url);

        socket.on('open', () => console.log(`${name} conectado al servidor del juego`));
        socket.on('message', (data) => {
            const text = data.toString();
            const match = text.match(/^J(\d+)$/);
            if (match) {
                playerId = Number(match[1]);
                console.log(`${name} ocupa el jugador ${playerId}`);
            }
        });
        socket.on('error', (error) => console.error(`${name}: ${error.message}`));
        socket.on('close', () => {
            clearInterval(timer);
            if (!stopped.value) setTimeout(connect, WAIT_BEFORE_RECONNECT_MS).unref();
        });

        timer = setInterval(() => {
            if (!playerId || socket.readyState !== WebSocket.OPEN) return;

            // El formato N... reproduce el estado Pos X/Pos Y/Nombre/Menu/Item/
            // Direccion/Ataque que usa el proyecto TurboWarp para representar jugadores.
            direction += (Math.random() - 0.5) * 34;
            const radians = direction * Math.PI / 180;
            x = Math.max(-ARENA, Math.min(ARENA, x + Math.cos(radians) * 12));
            y = Math.max(-ARENA, Math.min(ARENA, y + Math.sin(radians) * 12));
            if (Math.abs(x) === ARENA || Math.abs(y) === ARENA) direction += 150;

            const packet = `N${playerId} |Tamaño de /${playerId}/: 30,Pos X: ${Math.round(x)},Pos Y: ${Math.round(y)}: ${Date.now()},Nombre: ${name},Menu: 2,Item: 0,Direccion: ${Math.round(direction)},Ataque: 0`;
            socket.send(packet);
        }, SEND_INTERVAL_MS);
    };

    connect();
    return () => {
        clearInterval(timer);
        if (socket && socket.readyState < WebSocket.CLOSING) socket.close();
    };
}

function startBots({ count, url }) {
    const stopped = { value: false };
    const stopEach = [];
    for (let number = 1; number <= count; number++) {
        stopEach.push(createBot(number, url, stopped));
    }
    console.log(`Bots WebSocket activos: ${count}; sin Chromium`);
    return async () => {
        stopped.value = true;
        stopEach.forEach((stop) => stop());
    };
}

module.exports = { startBots };
