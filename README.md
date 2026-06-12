# 💬 CommentBox API

> **AI-powered code commenting engine** — paste code, get it documented instantly.

![Java](https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.2.7-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Railway](https://img.shields.io/badge/Deployed_on-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## ✨ What is CommentBox?

**CommentBox** is a production-ready REST API that uses an LLM (via OpenRouter) to automatically generate inline, block, or JSDoc-style comments for your source code.

Submit raw code → get back clean, well-documented code. That's it.

---

## 🚀 Features

- 🤖 **LLM-Powered** — Uses OpenRouter (GPT-4o-mini) for intelligent comment generation
- 🔑 **BYOK Support** — Users can supply their own OpenRouter API key
- 🌐 **Language Aware** — Supports Java, Python, C++, and more
- 🎛️ **Configurable Style** — Choose `inline`, `block`, or `jsdoc` comment style
- 📊 **Density Control** — `minimal`, `normal`, or `verbose` output
- 📜 **History Tracking** — Stores comment sessions per user in PostgreSQL
- 🐳 **Docker Ready** — Multi-stage Alpine build for lean containers
- ⚡ **Railway Deployed** — Live and accessible via Railway

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Language | Java 17 |
| Framework | Spring Boot 3.2.7 |
| HTTP Client | Spring WebFlux (WebClient) |
| Database (dev) | H2 (in-memory) |
| Database (prod) | PostgreSQL |
| LLM Provider | OpenRouter API |
| Build Tool | Maven |
| Containerization | Docker (Alpine JRE) |
| Deployment | Railway / Vercel |

---

## 📁 Project Structure

```
commentbox-api/
├── src/
│   └── main/
│       ├── java/com/commentbox/api/
│       │   ├── CommentboxApiApplication.java   # App entry point
│       │   ├── controller/
│       │   │   └── CommentController.java       # POST /api/v1/comments/generate
│       │   ├── service/
│       │   │   └── CommentService.java          # Core LLM call logic
│       │   ├── model/
│       │   │   ├── CommentRequest.java
│       │   │   └── CommentResponse.java
│       │   ├── util/
│       │   │   └── PromptBuilder.java           # Prompt construction
│       │   └── config/
│       │       └── OpenRouterConfig.java        # WebClient config
│       └── resources/
│           ├── application.properties           # Local config
│           ├── application-prod.properties      # Production config
│           ├── schema.sql                       # DB schema
│           └── static/                          # Frontend assets
├── Dockerfile
├── railway.toml
├── vercel.json
├── SMOKE_TEST.md
└── pom.xml
```

---

## ⚙️ Prerequisites

- **Java 17 JDK**
- **Maven** (or use the included `./mvnw` wrapper)
- **Docker** for container builds
- **Railway CLI** or **Vercel CLI** for deployment

---

## 🧑‍💻 Local Development

### 1. Clone the repository

```bash
git clone https://github.com/sakthivelvelmurugan/commentbox-api.git
cd commentbox-api
```

### 2. Build the project

```bash
./mvnw clean package
```

### 3. Run locally

```bash
./mvnw spring-boot:run
```

### 4. Hit the API

```
http://localhost:8085
```

---

## 📡 API Reference

### `POST /api/v1/comments/generate`

Generate commented code from raw source input.

**Request Body**

```json
{
  "language": "java",
  "style": "jsdoc",
  "density": "normal",
  "code": "public int add(int a, int b) { return a + b; }",
  "apiKey": "sk-or-your-optional-key"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `language` | `string` | ✅ | `java` · `python` · `cpp` · `other` |
| `style` | `string` | ✅ | `inline` · `block` · `jsdoc` |
| `density` | `string` | ✅ | `minimal` · `normal` · `verbose` |
| `code` | `string` | ✅ | Raw source code (max 50,000 chars) |
| `apiKey` | `string` | ❌ | Your own OpenRouter key (BYOK) |

**Response Body**

```json
{
  "outputCode": "/** Adds two integers. */ public int add(int a, int b) { return a + b; }",
  "language": "java",
  "generatesRemaining": 9,
  "byokActive": false,
  "provider": "openai/gpt-4o-mini",
  "historyId": "abc123"
}
```

---

## 🐳 Docker

**Build the image**

```bash
docker build -t commentbox-api .
```

**Run the container**

```bash
docker run --rm -p 8085:8085 \
  -e JWT_SECRET="${JWT_SECRET}" \
  -e OPENROUTER_API_KEY="${OPENROUTER_API_KEY}" \
  -e SPRING_PROFILES_ACTIVE=prod \
  commentbox-api
```

---

## 🌍 Deployment

### Railway

```bash
# Set environment variables on Railway dashboard, then:
railway up
```

### Vercel

```bash
# vercel.json is pre-configured for Docker builds
vercel
```

---

## 🔐 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | ✅ | Platform LLM API key |
| `JWT_SECRET` | ✅ | Secret for JWT signing |
| `SPRING_PROFILES_ACTIVE` | ✅ | Set to `prod` in production |
| `CORS_ALLOWED_ORIGINS` | ⚠️ | Allowed frontend origins |
| `SPRING_DATASOURCE_URL` | ⚠️ | PostgreSQL connection URL (prod) |
| `SPRING_DATASOURCE_USERNAME` | ⚠️ | DB username (prod) |
| `SPRING_DATASOURCE_PASSWORD` | ⚠️ | DB password (prod) |

---

## 🏥 Health Check

```
GET http://localhost:8085/actuator/health
```

```json
{ "status": "UP" }
```

---

## 🧪 QA & Validation

A full 15-step smoke test checklist is available in [`SMOKE_TEST.md`](./SMOKE_TEST.md).  
Run through it after every deployment to verify the service is healthy.

---

## 🗄️ Database Schema

Three core tables power the backend:

| Table | Purpose |
|---|---|
| `users` | Accounts, roles, daily usage counters |
| `user_api_keys` | Encrypted BYOK keys per user |
| `comment_history` | Input/output code, language, sharing metadata |

---

## 👤 Author

**Sakthivel Velmurugan**  
[![LinkedIn](https://img.shields.io/badge/LinkedIn-sakthivelvelmurugan-0A66C2?style=flat&logo=linkedin)](https://linkedin.com/in/sakthivelvelmurugan)
[![GitHub](https://img.shields.io/badge/GitHub-sakthivelvelmurugan-181717?style=flat&logo=github)](https://github.com/sakthivelvelmurugan)

---

> *Built with Java, Spring Boot, and a little bit of AI magic. ✨*
