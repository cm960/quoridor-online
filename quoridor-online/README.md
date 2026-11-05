# 쿼리도 온라인 (Quoridor Online)

브라우저에서 친구와 온라인으로 즐기는 쿼리도예요. 일반전 / 아이템전, 2인 / 4인을 지원해요.
Node.js 서버 하나가 웹페이지(`public/index.html`)와 실시간 연결(WebSocket)을 함께 제공해요.

## 내 컴퓨터에서 실행

```bash
npm install
npm start
```

브라우저에서 http://localhost:3000 을 열어요. 같은 와이파이의 다른 기기는 `http://내컴퓨터IP:3000` 으로 접속해요.

## GitHub + Render로 배포하기 (무료)

### 1) GitHub에 올리기
1. https://github.com/new 에서 새 저장소를 만들어요 (이름 예: `quoridor-online`).
2. 저장소 화면에서 **uploading an existing file** 을 눌러요.
3. 이 폴더 안의 파일을 드래그해서 올려요. **`node_modules` 폴더는 올리지 마세요.**
   - 올릴 것: `server.js`, `package.json`, `package-lock.json`, `render.yaml`, `.gitignore`, `README.md`, `public` 폴더
4. **Commit changes** 를 눌러요.

### 2) Render에 배포하기
1. https://render.com 에 GitHub 계정으로 가입해요.
2. **New +** → **Web Service** → 방금 만든 저장소를 선택해요.
3. 설정은 이렇게 해요.
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: `Free`
4. **Create Web Service** 를 누르고 배포가 끝나길 기다려요 (1~3분).
5. 위쪽에 나오는 주소(`https://이름.onrender.com`)로 접속하면 끝이에요.

> `render.yaml` 이 들어 있어서 **New + → Blueprint** 로 올려도 같은 설정으로 만들어져요.

### 3) 친구와 하기
1. 메인 화면에서 **온라인 대전**을 눌러요.
2. 이름을 적고 모드·인원을 골라 **만들기** → 4글자 방 코드가 나와요.
3. 친구는 같은 주소로 접속해서 **방 코드**를 입력하고 **참가**해요. 방 화면의 **링크 복사**를 보내면 코드가 자동으로 채워져요.
4. 인원이 다 차면 방장(방을 만든 사람)이 **시작**을 눌러요.

## 알아둘 점
- 무료 플랜은 15분 동안 접속이 없으면 서버가 잠들어요. 다시 접속하면 켜지는 데 최대 1분쯤 걸려요.
- 방 정보는 서버 메모리에만 있어서 서버가 재시작되면 사라져요.
- 게임 중 누가 나가면 그 판은 끝나요 (재접속은 아직 없어요).
- 데스크톱 앱(EXE)에서 온라인 대전을 쓰려면 "서버" 칸에 `wss://이름.onrender.com` 을 입력해요.
