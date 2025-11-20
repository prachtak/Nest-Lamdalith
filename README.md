# Guess the Number — AWS CDK + LocalStack + NestJS (API Gateway + Lambda + DynamoDB)

Tento repozitář implementuje zadání „Simple REST API Game“ (Guess the Number) jako serverless aplikaci na AWS s IaC (CDK) a lokálním během přes LocalStack.

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
│  └─ handler.ts                 # Entrypoint pro NestJS v AWS Lambda (Express + serverless-express)
├─ src/
│  ├─ app.module.ts                  # Root modul Nest aplikace
│  ├─ common/
│  │  ├─ response-envelope.interceptor.ts  # Jednotný response envelope + meta
│  │  ├─ app-exception.filter.ts           # Mapování AppError → HTTP odpovědi
│  │  ├─ http.util.ts                      # Utility pro HTTP kontext
│  │  └─ tokens.ts                         # DI tokeny (repo binding)
│  ├─ modules/
│  │  └─ game/
│  │     ├─ game.controller.ts       # REST controller (POST /games, POST /games/:gameId/guesses)
│  │     ├─ game.module.ts           # Feature modul
│  │     └─ dto/guess.dto.ts         # DTO + class-validator
│  │  └─ health/
│  │     ├─ health.controller.ts     # /health (liveness), /ready (readiness)
│  │     └─ health.module.ts
│  ├─ application/
│  │  └─ services/GameService.ts     # Business logika hry (startGame, makeGuess)
│  ├─ domain/
│  │  ├─ models/Game.ts              # Doménový model hry
│  │  └─ repositories/GameRepository.ts
│  ├─ infrastructure/
│     ├─ aws/aws.module.ts           # DI providers pro DynamoDB klienty
│     └─ repositories/DynamoGameRepository.ts  # Adapter na DynamoDB (AWS SDK v3)
│  
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

```bash
npm i -g aws-cdk-local
cdklocal bootstrap
cdklocal deploy
```

## 5) REST API — specifikace a příklady

Start nové hry

- Endpoint: `POST /games`
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
    "path": "/games",
    "method": "POST",
    "stage": "dev"
  }
}
```
Příklad:
```bash
curl -s -X POST "$API_URL/games"
```

Odeslání tipu

- Endpoint: `POST /games/{gameId}/guesses`
- Request body:
```json
{
  "guess": 42
}
```
- Response (envelope, příklady `data.message`):
```json
{
  "success": true,
  "data": { "message": "Too low. Try again!" },
  "meta": {
    "requestId": "...",
    "correlationId": "...",
    "timestamp": "...",
    "path": "/games/{gameId}/guesses",
    "method": "POST",
    "stage": "dev"
  }
}
```

Příklad:

```bash
curl -s -X POST "$API_URL/games/<GAME_ID>/guesses" -H 'Content-Type: application/json' -d '{"guess":42}'
```

## Validace a chybové stavy

- Kvůli bundlování přes esbuild se v prostředí AWS Lambda může ztrácet runtime metadata dekorátorů. Proto je na
  endpointu `POST /games/:gameId/guesses` použita lokální `DtoValidationPipe(GuessDto)` (
  `src/common/pipes/dto-validation.pipe.ts`), která provádí transformaci a validaci bez závislosti na metadatech.
- Aplikace zároveň používá globální `ValidationPipe` (whitelist, forbidNonWhitelisted, transform, stopAtFirstError)
  inicializovanou v `lambda/handler.ts` pro jednodušší scénáře.
- Parametr `:gameId` je validován přes `ParseUUIDPipe` (UUID v4). Při nevalidním `gameId` API vrací
  `400 VALIDATION_ERROR`.

## Konfigurace (multi-environment)

Konfigurace je centrálně přes `@nestjs/config` (globální `ConfigModule`) a validována přes Joi. Aplikace automaticky
načítá `.env.<stage>` podle hodnoty `STAGE` (nebo `NODE_ENV`), s fallbackem na `.env`:

- pro `dev` → `.env.dev`
- pro `stage` → `.env.stage`
- pro `prod` → `.env.prod`

V repozitáři jsou tyto soubory verzované a připravené k úpravě: `.env.dev`, `.env.stage`, `.env.prod`

Podporované proměnné prostředí:

- `TABLE_NAME` (default: `games`) – název DynamoDB tabulky
- `STAGE` (default: `dev`) – `dev` | `stage` | `prod`
- `REGION` (default: `eu-central-1`) – AWS region
- `APP_VERSION` (default: z `package.json`) – verze aplikace pro meta/logy
- `DYNAMO_ENDPOINT` (default: není) – endpoint pro LocalStack (např. `http://localhost:4566`), použijte jen v lokálu
- `ALLOWED_ORIGINS` (default: `*` v `dev`) – CSV seznam originů pro CORS v `stage/prod`

## Bezpečnost, CORS, logging

- `helmet` přidává bezpečnostní hlavičky.
- CORS je povolen přes `app.enableCors(...)` a je konfigurovatelný přes `ALLOWED_ORIGINS`. V produkci doporučujeme
  whitelist originů.
- Strukturované logy přes `nestjs-pino` (`pino`). V `dev` jsou logy „pretty“, v ostatních env JSON (vhodné pro
  CloudWatch/ELK). Logy zahrnují korelační ID a HTTP kontext.

## Health endpointy

- `GET /health` – liveness (rychlá odpověď 200)
- `GET /ready` – readiness; provádí lehký dotaz na DynamoDB a při chybě vrací 503 přes `ServiceUnavailableError`.

## Testování

```bash
npm test              # Spustí všechny testy
npm run test:unit     # Jen unit testy
npm run test:cov      # Testy s coverage reportem
npm run test:watch    # Watch mode pro vývoj
```

Testy používají **Jest** + **ts-jest** + **aws-sdk-client-mock** + **supertest**.
**Unit testy:**

- **GameService**  – Business logika hry
- **DynamoGameRepository**  – Persistence vrstva

**Integration testy:**

- **GameController**  – End-to-end REST API
