# Meeting Room Project

Sistema completo para gerenciamento de salas de reunião, incluindo backend em **.NET 8**, frontend em **Vite + Vue/React** (dependendo do seu projeto) com deploy via **Docker** e **Nginx**, além de um processo automático de **migrations**.

---

## 🚀 Tecnologias Utilizadas

### **Backend (.NET 8 / C#)**
- ASP.NET Core 8 (Minimal API ou Controllers)
- Entity Framework Core 8
- SQLite (local) — facilmente substituível por SQL Server/Postgres
- Dotnet-ef para migrations
- Docker multi-stage (SDK + ASPNET Runtime)

### **Frontend (Vite + JS/TS)**
- Vite 5
- Node 20
- Framework SPA moderno (React/Vue/Svelte)
- Build otimizado servido no **Nginx 1.25-alpine**

### **Infraestrutura / DevOps**
- Docker & Docker Compose
- Multi-stage builds
- Nginx para servir arquivos estáticos
- Rede interna entre containers
- Healthcheck no frontend
- Entrypoint customizado para aguardar migrations

---

## 🧱 Estrutura do Projeto
```
meeting_room_project/
│
├── backend/
│   ├── backend.sln
│   ├── MeetingRoom.Api.csproj
│   ├── Program.cs
│   ├── Controllers/
│   ├── Models/
│   ├── Services/
│   ├── Data/
│   │   └── meeting.db
│   ├── Migrations/
│   ├── Dockerfile
│   └── docker-entrypoint.sh
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── dist/
│   ├── nginx.conf
│   ├── package.json
│   ├── Dockerfile
│   └── vite.config.ts
│
└── docker-compose.yml
```

---

## 🐳 Como Rodar com Docker

Certifique-se de ter **Docker** e **Docker Compose** instalados.

### 📌 1. Subir todos os serviços (migrator → api → frontend)
```bash
docker-compose up --build
```
A ordem acontece automaticamente via `depends_on`.
O backend sobe em:
```
http://localhost:5000
```
O frontend sobe em:
```
http://localhost:3000
```

### 📌 2. Rodar apenas backend + frontend (sem migrator)
Após as migrations já terem sido aplicadas:
```bash
docker-compose up --build api frontend
```

### 📌 3. Rodar backend em modo DEV (hot reload)
```bash
docker-compose up --build api-dev frontend
```
Backend dev fica acessível em:
```
http://localhost:5001
```
---

## 🔧 Como Rodar sem Docker (modo desenvolvimento local)

### **Backend**
```bash
cd backend
rm -rf bin obj
 dotnet restore
 dotnet watch run
```
API em:
```
http://localhost:5000
```

### **Frontend**
```bash
cd frontend
npm install
npm run dev
```
Frontend dev em:
```
http://localhost:5173
```

---

## 🗄️ Migrations
Para criar novas migrations:
```bash
cd backend
dotnet ef migrations add NomeDaMigration
```
Aplicar migrations localmente:
```bash
dotnet ef database update
```
As migrations também rodam automaticamente via container **migrator** no Docker Compose.

---

## 🌐 Variáveis de Ambiente Importantes

### Backend
| Variável | Função |
|---------|--------|
| `ASPNETCORE_ENVIRONMENT` | Ambiente (Development/Production) |
| `ConnectionStrings__DefaultConnection` | Caminho do banco SQLite |

### Frontend
| Variável | Função |
|---------|--------|
| `VITE_API_BASE_URL` | URL do backend (interno: `http://api`) |

---

## 🔒 CORS
No backend, a política atual permite:
- `http://localhost:5173`
- `http://localhost:3000`
- `http://api`

Configuração encontra-se no `Program.cs`:
```csharp
app.UseCors("AllowFrontend");
```

---

## 🧪 Testes
Adicionar testes (se usar xUnit / NUnit):
```bash
dotnet test
```

---

## 📦 Build de Produção
```bash
docker-compose -f docker-compose.yml up --build -d
```

---

## 🤝 Contribuição
1. Faça um fork
2. Crie uma branch feature:
```bash
git checkout -b feature/nova-feature
```
3. Commit:
```bash
git commit -m "feat: adicionada nova funcionalidade"
```
4. Envie a branch:
```bash
git push origin feature/nova-feature
```
5. Abra um Pull Request

---

## 📄 Licença
Este projeto é distribuído sob a licença MIT.

---

## 💬 Suporte
Qualquer dúvida, abra uma issue ou me chame!
