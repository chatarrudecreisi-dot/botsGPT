# Comer: bots online de bajo consumo

`server.js` sirve `comer.html` y retransmite mensajes WebSocket. `bot-runner.js` conecta clientes WebSocket desde Node.js y emite actualizaciones de jugador mientras recorren el escenario. No abre Chromium ni carga una copia del juego por cada bot.

## Render

- Build command: `npm install`
- Start command: `npm start`
- `BOT_COUNT`: número de bots (por defecto `1`, hasta `8`; usa `0` para desactivarlos).
- `BOT_SOCKET_URL`: dirección WebSocket del servidor; por defecto conecta al propio servicio (`ws://127.0.0.1:<PORT>`).

El bot usa los campos de jugador que aparecen en el proyecto TurboWarp: tamaño, posición, nombre, menú, objeto, dirección y ataque. Se mueve de forma aleatoria por el escenario. El protocolo del juego no publica la posición de la comida al servidor, así que estos bots todavía no pueden perseguirla ni recogerla como un jugador con visión del escenario.
