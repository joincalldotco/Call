# Contributing to Call-SO

Thank you for your interest in contributing to Call-SO! This document will guide you through the contribution process.

## 🏗 Project Structure

```
.
├── apps/                   # Application code
│   └── web/               # Next.js web application
│   └── server/               # Node Hono backend
├── packages/              # Shared packages
│   ├── db/               # Database schemas and utilities
│   ├── auth/               # Authentication schemas and utilities
│   ├── eslint-config/    # Shared ESLint configurations
│   ├── typescript-config/ # Shared TypeScript configurations
│   └── ui/               # Shared UI components (shadcn/ui)
└── package.json          # Root package.json
```

## 🚀 Getting Started

1. Fork and clone the repository

2. Run the development script:

   ```bash
   # Start all applications
   ./run-dev.sh

   # Start a specific application
   ./run-dev.sh --filter web
   ```

   This script will:

   - Create a `.env` file if it doesn't exist
   - Install dependencies if needed
   - Start Docker services
   - Wait for the database to be ready
   - Start the development environment

## 🔐 Environment Variables

1. Create a `.env` file in the root:

   ```bash
   # Database Configuration
   DATABASE_URL=postgresql://postgres:postgres@localhost:5434/call

   # App Configuration
   NODE_ENV=development
   ```

2. The `.env` file is automatically loaded by the development script.

## 🔑 Setting Up OAuth Providers

You need to create OAuth applications in Google and GitHub to enable social login during development.

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Navigate to **APIs & Services > Credentials**
4. Click **"Create Credentials" → OAuth 2.0 Client IDs**
5. Select **Web Application** and configure:

   **Authorized JavaScript origins**:

```

[http://localhost:3000](http://localhost:3000)

```

**Authorized redirect URIs**:

```

[http://localhost:1284/api/auth/callback/google](http://localhost:1284/api/auth/callback/google)

```

6. Copy the generated **Client ID** and **Client Secret** into your `.env` file.

---

### GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Under **OAuth Apps**, click **"New OAuth App"**
3. Fill in:

- **Application Name**: `Call`
- **Homepage URL**: `http://localhost:3000`
- **Authorization Callback URL**:
  ```
  http://localhost:1284/api/auth/callback/github
  ```

4. Register the application, then copy the **Client ID** and **Client Secret** into your `.env`.

## 📦 Package Management

We use pnpm workspaces to manage this monorepo. Key commands:

```bash
# Install a dependency in a specific workspace
pnpm add <package> --filter <workspace-name>

# Install a dependency in all workspaces
pnpm add -w <package>

# Link a local package in another workspace
pnpm add @call/<package-name> --filter <workspace-name> --workspace
```

## 🛠 Development Workflow

1. Create a new branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our coding standards

3. Run the following checks before committing:

   ```bash
   pnpm lint      # Lint all packages
   pnpm test      # Run all tests
   pnpm build     # Build all packages
   ```

4. Commit your changes using conventional commits:
   ```
   feat: add new feature
   fix: resolve bug
   docs: update documentation
   chore: update dependencies
   refactor: improve code structure
   test: add tests
   ```

## 🏗 Package Organization

- Place shared code in `packages/`
- Keep applications in `apps/`
- Use consistent naming conventions:
  - Applications: `@call/app-name`
  - Packages: `@call/package-name`

## 📜 License

By contributing, you agree that your contributions will be licensed under the project's license.
