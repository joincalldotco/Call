#!/bin/bash

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color


print_step() {
    echo -e "${BLUE}==>${NC} $1"
}


print_success() {
    echo -e "${GREEN}==>${NC} $1"
}


print_error() {
    echo -e "${RED}==>${NC} $1"
}


if [ ! -f .env ]; then
    print_step "Creating .env file from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        print_success "Created .env file. Please update it with your configuration."
    else

        print_step "Creating default .env file..."
        cat > .env << EOL
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/call

# App Configuration
NODE_ENV=development
EOL
        print_success "Created default .env file"
    fi
fi

# Symlink .env to packages/db if it doesn't exist
if [ ! -f packages/db/.env ]; then
    print_step "Linking root .env to packages/db..."
    ln -s "$(realpath .env)" packages/db/.env
    print_success "Linked .env to packages/db"
fi

if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi


if [ ! -d "node_modules" ]; then
    print_step "Installing dependencies..."
    pnpm install
    print_success "Dependencies installed"
fi

print_step "Starting Docker services..."
docker compose up -d
if [ $? -eq 0 ]; then
    print_success "Docker services started successfully"
else
    print_error "Failed to start Docker services"
    exit 1
fi

print_step "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        print_success "PostgreSQL is ready"

        print_step "Running database migration..."
        pnpm --filter @call/db run db:migrate
        if [ $? -eq 0 ]; then
            print_success "Database migration completed successfully"
        else
            print_error "Database migration failed"
            exit 1
        fi

        break
    fi
    if [ $i -eq 30 ]; then
        print_error "PostgreSQL failed to start within 30 seconds"
        exit 1
    fi
    sleep 1
done

print_step "Starting development environment..."
if [ "$1" = "--filter" ] && [ -n "$2" ]; then
    print_step "Starting development for $2..."
    pnpm dev --filter $2
else
    pnpm dev
fi
