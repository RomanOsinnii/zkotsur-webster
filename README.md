# Webster Monorepo

Monorepo bootstrap for Webster with a minimal deployment-ready setup:

- `client`: React + TypeScript + Vite
- `server`: NestJS + TypeScript
- `docker-compose.yml`: client, server, PostgreSQL
- `.github/workflows/deploy.yml`: GitHub-hosted tests and VPS deployment through a self-hosted runner
- `deploy.sh`: container rebuild, startup, and optional Telegram notification

## Project Structure

```text
.
|-- client
|-- server
|-- .github
|   `-- workflows
|-- docker-compose.yml
|-- deploy.sh
`-- README.md
```

## Run Locally with Docker

```bash
docker compose up --build
```

After startup:

- Client: `http://localhost:8080`
- Server health endpoint: `http://localhost:3000/api/health`
- PostgreSQL: `localhost:5432`

## Run Locally without Docker

### Server

```bash
cd server
npm install
npm run start:dev
```

### Client

```bash
cd client
npm install
npm run dev
```

Vite proxies `/api` requests to the Nest server in local development.

## CI/CD

Workflow file: `.github/workflows/deploy.yml`

- `test`: runs on a GitHub-hosted runner (`ubuntu-latest`)
- `deploy`: runs only after successful tests on a self-hosted runner on the VPS

### Deployment Flow

1. Push to `main`
2. GitHub starts the `test` job
3. If the tests pass, GitHub starts the `deploy` job
4. The `deploy` job runs directly on the VPS through the self-hosted runner
5. The runner performs `actions/checkout` and then runs `./deploy.sh`
6. `deploy.sh` executes `docker compose up --build -d`

In this setup:

- checks run on GitHub
- deployment runs on the server
- `git pull` on the server is not required
- `appleboy/ssh-action` is not required

## Self-Hosted Runner Setup on VPS

The example below assumes Ubuntu.

### 1. Install Base Packages

```bash
sudo apt update
sudo apt install -y curl git
```

Install Docker and the Docker Compose plugin if they are not already available.

### 2. Create the Runner Directory

```bash
mkdir -p ~/actions-runner
cd ~/actions-runner
```

### 3. Download the Runner

Open:

`Repository -> Settings -> Actions -> Runners -> New self-hosted runner`

Use the current Linux x64 download command from GitHub. Example:

```bash
curl -o actions-runner-linux-x64-2.325.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.325.0/actions-runner-linux-x64-2.325.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.325.0.tar.gz
```

### 4. Register the Runner

Run the `config.sh` command provided by GitHub:

```bash
./config.sh --url https://github.com/OWNER/REPO --token YOUR_TOKEN
```

When prompted for labels, enter:

```text
webster-prod
```

Use a repository-level runner for this project instead of an organization-wide runner.

### 5. Install the Runner as a Service

```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

Check status:

```bash
sudo ./svc.sh status
```

## VPS Requirements

The self-hosted runner checks out the repository into its own working directory, so a separate `git clone` for deployment is not needed.

The VPS must have:

- Docker
- Docker Compose plugin
- permission for the runner user to execute Docker
- open ports `8080`, `3000`, and `5432`, or custom values through environment variables

If the runner does not run as `root`, add its user to the `docker` group:

```bash
sudo usermod -aG docker YOUR_USER
```

After that, re-login or restart the runner service.

## GitHub Secrets

Only these secrets are needed for the current deployment flow:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

SSH deployment secrets are no longer required.

## Manual Deployment on the Server

To test deployment without GitHub Actions:

```bash
chmod +x deploy.sh
./deploy.sh
```

## Security Note

The deploy job runs directly on the VPS through the self-hosted runner. Keep this runner dedicated to this repository and avoid running untrusted workflows on it.
