# Guess the Number — AWS CDK + LocalStack + NestJS (API Gateway + Lambda + DynamoDB)

Tento repozitář implementuje zadání „Simple REST API Game“ (Guess the Number) jako serverless aplikaci na AWS s IaC (CDK) a lokálním během přes LocalStack.

Poznámka: I když zadání říká „Infrastructure as Code not required“, zde je IaC záměrně zahrnuto (AWS CDK v2), abyste mohli celý systém opakovatelně spouštět lokálně i v cloudu.

## Struktura projektu
```
.
├─ bin/
│  └─ app.ts                         # CDK app entry – instancuje ServiceStack
├─ lib/
│  ├─ constructs/
│  │  ├─ api.ts                      # API Gateway (proxy: true → předává do Nest)
│  │  ├─ database.ts                 # DynamoDB (tabulka games, PK: gameId)
│  │  └─ functions.ts                # Lambda funkce (1× ApiFunction s NestJS)
│  └─ service-stack.ts               # Kompozice constructů (DB + Functions + API)
├─ lambda/
│  └─ nest-lambda.ts                 # Entrypoint pro NestJS v AWS Lambda (Express + serverless-express)
├─ src/
│  ├─ app.module.ts                  # Root modul Nest aplikace
│  ├─ common/
│  │  ├─ response-envelope.interceptor.ts  # Jednotný response envelope + meta
│  │  ├─ app-exception.filter.ts           # Mapování AppError → HTTP odpovědi
│  │  └─ tokens.ts                         # DI tokeny (repo binding)
│  ├─ modules/
│  │  └─ game/
│  │     ├─ game.controller.ts       # REST controller (POST /start-game, POST /guess)
│  │     ├─ game.module.ts           # Feature modul
│  │     └─ dto/guess.dto.ts         # DTO + class-validator
│  ├─ application/
│  │  └─ services/GameService.ts     # Business logika hry (startGame, makeGuess)
│  ├─ domain/
│  │  ├─ models/Game.ts              # Doménový model hry
│  │  └─ repositories/GameRepository.ts
│  ├─ infrastructure/
│  │  └─ repositories/DynamoGameRepository.ts  # Adapter na DynamoDB (AWS SDK v3)
│  └─ config/index.ts                # Načtení konfigurace z env proměnných
├─ cdk.json
├─ package.json
├─ tsconfig.json
└─ docker-compose.yml
```

## Předpoklady
- Docker
- Node.js (doporučeno 20 LTS)
- `npm`

## 1) Spusť LocalStack
```bash
docker compose up localstack -d
```
LocalStack poběží na `http://localhost:4566`.

## 2) Instalace a build
```bash
npm install
npm run build
```

## 3) CDK bootstrap pro LocalStack
```bash
npm run cdk:bootstrap:local
```

## 4) Deploy do LocalStacku
```bash
npm run cdk:deploy:local
```
Nasadí se:
- DynamoDB tabulka `games` (PK: `gameId`)
- Lambda funkce `ApiFunction` (NestJS, Express)
- API Gateway REST API v proxy režimu (ANY /{proxy+}) – routy obsluhuje Nest controller

Po deploy konzole vypíše URL API (např. `http://localhost:4566/restapis/.../dev/_user_request_/`).

Poznámka: Nástroj `cdklocal` poskytuje balíček `aws-cdk-local` (je uveden v devDependencies). 
Po `npm install` je binárka dostupná lokálně přes npm skripty výše. Alternativně můžete nainstalovat globálně:

```bash
npm i -g aws-cdk-local
cdklocal bootstrap
cdklocal deploy
```

## 5) REST API — specifikace a příklady

Start nové hry
- Endpoint: `POST /start-game`
- Response (envelope):
```json
{
  "success": true,
  "data": {
    "gameId": "unique-game-id",
    "message": "Game started. Make a guess between 1 and 100."
  },
  "meta": {
    "requestId": "...",
    "correlationId": "...",
    "timestamp": "...",
    "durationMs": 12,
    "path": "/start-game",
    "method": "POST",
    "stage": "dev"
  }
}
```
Příklad:
```bash
curl -s -X POST "$API_URL/start-game"
```

Odeslání tipu
- Endpoint: `POST /guess`
- Request body:
```json
{
  "gameId": "unique-game-id",
  "guess": 42
}
```
- Response (envelope, příklady `data.message`):
```json
{
  "success": true,
  "data": { "message": "Too low. Try again!" },
  "meta": { "requestId": "...", "correlationId": "...", "timestamp": "...", "path": "/guess", "method": "POST", "stage": "dev" }
}
```
Příklad:
```bash
curl -s -X POST "$API_URL/guess" \
  -H 'Content-Type: application/json' \
  -d '{"gameId":"<GAME_ID>","guess":42}'
```

## Validace a chyby
- Chybějící/špatný `gameId` → 400/404
- `guess` mimo rozsah 1..100 nebo nečíselný → 400
- Neočekávaná chyba → 500

NestJS vrstva používá:
- Globální `ValidationPipe` (class-validator/class-transformer) pro DTO validaci
- `ResponseEnvelopeInterceptor` pro jednotný response envelope (`success`, `data|error`, `meta` s `requestId`, `correlationId`, `timestamp`, `durationMs`, `path`, `method`, `stage`)
- `AppExceptionFilter` pro mapování našich `AppError` typů na HTTP status kód a jednotné error body

## Architektura a best‑practices
- NestJS (controllers, modules, DI) – "Spring Boot pro Node.js"
- Jedna Lambda s NestJS (Express) za API Gateway proxy (ANY /{proxy+})
- Doména/aplikace/infrastruktura oddělené; `GameService` beze změn pro byznys logiku
- `DynamoGameRepository` injektován do `GameService` přes DI (viz `src/modules/game/game.module.ts`)
- Jednotný response model a standardizované chyby (`src/application/errors/AppError.ts`)
- AWS SDK v3 + CDK v2; LocalStack pro lokální běh
- IaC (CDK) – `Api` používá `LambdaRestApi` v proxy režimu a jednu funkci `ApiFunction`

## Poznámky
- Pro reálnou produkci doplnit: autentizaci/autorizaci (Cognito/JWT), observabilitu (strukturované logy, tracing), CI/CD, testy.

### Poznámka k nasazení s LocalStack
CDK (i `cdklocal`) vyžaduje nastavené AWS kredenciály a region, i když jsou to dummy hodnoty pro LocalStack:
```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_REGION=eu-central-1
export AWS_DEFAULT_REGION=eu-central-1
export CDK_DEFAULT_ACCOUNT=000000000000
export CDK_DEFAULT_REGION=eu-central-1
```
Pak spusťte `npm run cdk:bootstrap:local` a `npm run cdk:deploy:local`.
  AWS_PROFILE=localstack npm run cdk:bootstrap:local
