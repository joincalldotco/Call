## QUICK START TO CONTRIBUTING

### Prerequisites

- **Node.js** 20 or higher
- **pnpm** package manager
- **Docker** and Docker Compose
- **Git**
- **Microsoft Visual C++ Redistributable for Visual Studio 2022** (For Windows)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/joincalldotco/call.git
   cd call
   ```

2.1 **Start the development environment**

```bash
./setup-dev.sh
```

2.2 **Start the development environment (Windows)**

```bash
./setup_dev_windows.sh
```

This script will automatically:

- Create a `.env` file if it doesn't exist
- Install dependencies if needed
- Start Docker services (PostgreSQL)
- Wait for the database to be ready
- Start the development environment

> **Note:** If you encounter any issues during setup, check the [ERRORS.md](ERRORS.md) file for troubleshooting guidance.

3. **Open your browser**
   - Web app: http://localhost:3000
   - Server: http://localhost:1284

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/call

# Google OAuth (for authentication)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email Configuration (for notifications)
EMAIL_FROM=your_email@domain.com
RESEND_API_KEY=your_resend_api_key

# App URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:1284

# App Configuration
NODE_ENV=development


go to https://www.better-auth.com/docs/installation and click on 'Generate Secret'.

BETTER_AUTH_SECRET=your_generated_secret
```

### Docker Services

The project uses Docker Compose to run PostgreSQL:

```bash
# Start services
pnpm docker:up

# Stop services
pnpm docker:down

# Clean up (removes volumes)
pnpm docker:clean
```

---

## Project Structure

```
call/
├── apps/                    # Applications
│   ├── web/                # Next.js web application
│   │   ├── app/           # App Router pages
│   │   │   ├── (app)/     # Main app routes
│   │   │   ├── (auth)/    # Authentication routes
│   │   │   └── (waitlist)/ # Landing page
│   │   ├── components/    # React components
│   │   ├── lib/          # Utilities and configs
│   │   └── public/       # Static assets
│   └── server/            # Hono backend API
│       ├── routes/        # API routes
│       ├── config/        # Server configuration
│       ├── utils/         # Server utilities
│       └── validators/    # Request validation
├── packages/               # Shared packages
│   ├── auth/              # Authentication utilities
│   ├── db/                # Database schemas and migrations
│   ├── ui/                # Shared UI components (shadcn/ui)
│   ├── eslint-config/     # ESLint configuration
│   └── typescript-config/ # TypeScript configuration
├── docker-compose.yml      # Docker services
├── setup-dev.sh             # Development setup script
└── turbo.json             # Turborepo configuration
```

---

## Development

### Available Scripts

```bash
# Development
pnpm dev                    # Start all applications
pnpm dev --filter web      # Start only web app
pnpm dev --filter server   # Start only server

# Building
pnpm build                 # Build all packages
pnpm build --filter web    # Build only web app

# Linting & Formatting
pnpm lint                  # Lint all packages
pnpm lint:fix             # Fix linting issues
pnpm format               # Check formatting
pnpm format:fix           # Fix formatting

# Database
pnpm db:generate          # Generate database types
pnpm db:migrate           # Run database migrations
pnpm db:push              # Push schema changes
pnpm db:studio            # Open database studio

# Docker
pnpm docker:up            # Start Docker services
pnpm docker:down          # Stop Docker services
pnpm docker:clean         # Clean up Docker volumes
```

### Package Management

We use pnpm workspaces to manage this monorepo:

```bash
# Install a dependency in a specific workspace
pnpm add <package> --filter <workspace-name>

# Install a dependency in all workspaces
pnpm add -w <package>

# Link a local package in another workspace
pnpm add @call/<package-name> --filter <workspace-name> --workspace
```

### Development Workflow

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Run checks before committing**

   ```bash
   pnpm lint      # Lint all packages
   pnpm build     # Build all packages
   ```

4. **Commit your changes** using conventional commits:

   ```
   feat: add new feature
   fix: resolve bug
   docs: update documentation
   chore: update dependencies
   refactor: improve code structure
   test: add tests
   ui: for ui changes
   ```

5. **Push and create a pull request**

### Package Organization

- Place shared code in `packages/`
- Keep applications in `apps/`
- Use consistent naming conventions:
  - Applications: `@call/app-name`
  - Packages: `@call/package-name`

### Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---