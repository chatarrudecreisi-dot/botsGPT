const WebSocket = require('ws');
const { createServer } = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT || 8080);
const requestedBotCount = Number.parseInt(process.env.BOT_COUNT || '1', 10);
const botCount = Number.isFinite(requestedBotCount) ? Math.max(0, Math.min(8, requestedBotCount)) : 1;
const botSocketUrl = process.env.BOT_SOCKET_URL || `ws://127.0.0.1:${port}`;

const server = createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname === '/healthz') {
        response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({ ok: true, bots: botCount }));
        return;
    }
    if ((pathname === '/' || pathname === '/comer.html') && (request.method === 'GET' || request.method === 'HEAD')) {
        response.writeHead(200, {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'public, max-age=300'
        });
        if (request.method === 'HEAD') {
            response.end();
            return;
        }
        fs.createReadStream(path.join(__dirname, 'comer.html')).pipe(response);
        return;
    }
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
});

const wss = new WebSocket.Server({ server });
const salas = Array(30).fill(null);
let mensajeBuffer = [];

wss.on('connection', (ws) => {
    const seatIndex = salas.indexOf(null);
    if (seatIndex === -1) {
        ws.send('ERROR,SALA_LLENA');
        ws.close();
        return;
    }

    salas[seatIndex] = ws;
    const playerId = `J${seatIndex + 1}`;
    console.log(`Conectado ${playerId}. Asientos libres: ${salas.filter((seat) => seat === null).length}/30`);
    ws.send(playerId);

    ws.on('message', (data) => {
        mensajeBuffer.push({ emisor: ws, contenido: data.toString() });
    });

    ws.on('close', () => {
        console.log(`Desconectado ${playerId}`);
        if (salas[seatIndex] === ws) salas[seatIndex] = null;
        for (const client of wss.clients) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(`DESCONECTADO,J/${seatIndex + 1}/`);
            }
        }
    });
});

setInterval(() => {
    if (mensajeBuffer.length === 0) return;
    const messages = mensajeBuffer;
    mensajeBuffer = [];

    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;
        const payload = messages
            .filter((message) => message.emisor !== client)
            .map((message) => message.contenido);
        if (payload.length > 0) client.send(payload.join('|'));
    }
}, 16);

let stopBots = null;
async function startBotService() {
    if (botCount === 0) {
        console.log('Bots desactivados (BOT_COUNT=0)');
        return;
    }

    try {
        const { startBots } = require('./bot-runner');
        stopBots = startBots({ count: botCount, url: botSocketUrl });
    } catch (error) {
        console.error('No se pudieron iniciar los bots; se volverá a intentar en 30 segundos:', error);
        setTimeout(startBotService, 30000).unref();
    }
}

server.listen(port, '0.0.0.0', () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
    console.log(`Juego disponible en /comer.html; bots solicitados: ${botCount}`);
    startBotService();
});

async function shutdown() {
    if (stopBots) await stopBots();
    server.close(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
