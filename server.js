// 쿼리도 온라인 서버: 정적 파일(public/) + WebSocket 방(room) 중계
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/healthz') { res.writeHead(200); res.end('ok'); return; }
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server, maxPayload: 4096 });
const rooms = new Map(); // code -> { code, mode, n, seats: [{ws,name}], started, created }
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ACTS = new Set(['move', 'wall', 'ell', 'remove', 'ctrl', 'extra', 'plus', 'undo']);

const newCode = () => {
  for (let i = 0; i < 100; i++) {
    let c = '';
    for (let k = 0; k < 4; k++) c += ALPHA[crypto.randomInt(ALPHA.length)];
    if (!rooms.has(c)) return c;
  }
  return null;
};
const clean = (s) => String(s || '').replace(/[<>&"'`]/g, '').trim().slice(0, 8) || '플레이어';
const send = (ws, m) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };
const roomMsg = (room, seat) => ({ t: 'room', code: room.code, mode: room.mode, n: room.n, seat, names: room.seats.map((s) => s.name) });
const broadcast = (room, m) => room.seats.forEach((s) => send(s.ws, m));
const pushRoom = (room) => room.seats.forEach((s, i) => { s.ws.seat = i; send(s.ws, roomMsg(room, i)); });

function leave(ws) {
  const room = rooms.get(ws.room);
  if (!room) return;
  const i = room.seats.findIndex((s) => s.ws === ws);
  if (i < 0) return;
  const name = room.seats[i].name;
  room.seats.splice(i, 1);
  ws.room = null;
  if (room.seats.length === 0) { rooms.delete(room.code); return; }
  if (room.started) {
    broadcast(room, { t: 'left', seat: i, name });
    rooms.delete(room.code);                         // 시작한 방은 한 명이 나가면 종료
    room.seats.forEach((s) => { s.ws.room = null; });
  } else {
    pushRoom(room);
  }
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.room = null;
  ws.seat = -1;
  ws.count = 0;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    ws.count++;
    if (ws.count > 60) return;                      // 초당 60개 초과 무시
    let m;
    try { m = JSON.parse(raw.toString()); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;

    if (m.t === 'create') {
      if (ws.room) leave(ws);
      const mode = m.mode === 'item' ? 'item' : 'normal';
      const n = m.n === 4 ? 4 : 2;
      const code = newCode();
      if (!code) return send(ws, { t: 'error', msg: '방을 만들 수 없어요' });
      const room = { code, mode, n, seats: [{ ws, name: clean(m.name) }], started: false, created: Date.now() };
      rooms.set(code, room);
      ws.room = code;
      pushRoom(room);
    } else if (m.t === 'join') {
      const room = rooms.get(String(m.code || '').toUpperCase());
      if (!room) return send(ws, { t: 'error', msg: '방을 찾을 수 없어요' });
      if (room.started) return send(ws, { t: 'error', msg: '이미 시작한 방이에요' });
      if (room.seats.length >= room.n) return send(ws, { t: 'error', msg: '방이 가득 찼어요' });
      if (ws.room) leave(ws);
      room.seats.push({ ws, name: clean(m.name) });
      ws.room = room.code;
      pushRoom(room);
    } else if (m.t === 'begin' || m.t === 'rematch') {
      const room = rooms.get(ws.room);
      if (!room || room.seats[0].ws !== ws) return;             // 방장만
      if (room.seats.length < room.n) return;
      if (m.t === 'begin' && room.started) return;
      if (m.t === 'rematch' && !room.started) return;
      room.started = true;
      broadcast(room, { t: 'start', mode: room.mode, n: room.n, names: room.seats.map((s) => s.name), seed: crypto.randomInt(0, 2 ** 31) });
    } else if (m.t === 'act') {
      const room = rooms.get(ws.room);
      if (!room || !room.started) return;
      const a = m.a;
      if (!a || typeof a.t !== 'string' || !ACTS.has(a.t)) return;
      const i = room.seats.findIndex((s) => s.ws === ws);
      if (i < 0) return;
      broadcast(room, { t: 'act', a, from: i });
    }
  });

  ws.on('close', () => leave(ws));
  ws.on('error', () => {});
});

// 연결 확인(ping) + 속도 제한 초기화 + 오래된 방 정리
setInterval(() => wss.clients.forEach((ws) => { ws.count = 0; }), 1000);
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) { ws.terminate(); return; }
    ws.isAlive = false;
    try { ws.ping(); } catch (e) {}
  });
}, 1000 * 30);
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.created > 1000 * 60 * 60 * 6) {
      room.seats.forEach((s) => { try { s.ws.close(); } catch (e) {} });
      rooms.delete(code);
    }
  }
}, 1000 * 60 * 10);

server.listen(PORT, () => console.log(`Quoridor server on :${PORT}`));
