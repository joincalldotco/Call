#!/bin/bash

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_step() {
  echo -e "${BLUE}==>${NC} $1"
}

print_success() {
  echo -e "${GREEN}==>${NC} $1"
}

print_error() {
  echo -e "${RED}==>${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}==>${NC} $1"
}

install_build_essentials() {
  print_step "Checking for build essentials..."

  if ! command -v make &> /dev/null; then
    print_warning "make is not installed. Installing build essentials..."

    if [[ "$OSTYPE" == "darwin"* ]]; then
      if command -v brew &> /dev/null; then
        print_step "Installing build essentials via Homebrew..."
        brew install make gcc python3
        print_success "Build essentials installed via Homebrew"
      else
        print_error "Homebrew is not installed. Please install Homebrew first:"
        echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        echo "Then run: brew install make gcc python3"
        exit 1
      fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
      if command -v apt-get &> /dev/null; then
        print_step "Installing build essentials via apt..."
        sudo apt-get update
        sudo apt-get install -y build-essential python3
        print_success "Build essentials installed via apt"
      elif command -v yum &> /dev/null; then
        print_step "Installing build essentials via yum..."
        sudo yum groupinstall -y "Development Tools"
        sudo yum install -y python3
        print_success "Build essentials installed via yum"
      elif command -v dnf &> /dev/null; then
        print_step "Installing build essentials via dnf..."
        sudo dnf groupinstall -y "Development Tools"
        sudo dnf install -y python3
        print_success "Build essentials installed via dnf"
      else
        print_error "Could not detect package manager. Please install build-essential and python3 manually."
        exit 1
      fi
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]] || [[ -n "$WINDIR" ]]; then
      print_step "Detected Windows system..."

      if grep -q Microsoft /proc/version 2>/dev/null; then
        print_step "Detected WSL (Windows Subsystem for Linux)..."
        if command -v apt-get &> /dev/null; then
          print_step "Installing build essentials via apt in WSL..."
          sudo apt-get update
          sudo apt-get install -y build-essential python3
          print_success "Build essentials installed via apt in WSL"
        else
          print_error "WSL detected but apt-get not available. Please install build-essential and python3 manually."
          exit 1
        fi
      else
        print_warning "Native Windows detected. For mediasoup compilation, you need:"
        echo "  1. Visual Studio Build Tools or Visual Studio Community"
        echo "  2. Python 3.x"
        echo "  3. Node.js with npm/pnpm"
        echo ""
        echo "Please install these manually:"
        echo "  - Visual Studio Build Tools: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022"
        echo "  - Python: https://www.python.org/downloads/"
        echo ""
        echo "After installation, run this script again."
        exit 1
      fi
    else
      print_error "Unsupported OS: $OSTYPE. Please install build essentials manually."
      exit 1
    fi
  else
    print_success "Build essentials are already installed"
  fi
}

compile_mediasoup_worker() {
  print_step "Checking for mediasoup worker compilation..."

  local worker_dir="apps/server/node_modules/mediasoup/worker"

  if [ ! -d "$worker_dir" ]; then
    print_warning "mediasoup worker directory not found. Skipping compilation."
    return 0
  fi

  if [ -f "$worker_dir/out/Release/mediasoup-worker" ] || [ -f "$worker_dir/out/Release/mediasoup-worker.exe" ]; then
    print_success "mediasoup worker binary already exists"
    return 0
  fi

  print_step "Compiling mediasoup worker..."
  cd "$worker_dir"

  if make; then
    print_success "mediasoup worker compiled successfully"
  else
    print_error "Failed to compile mediasoup worker"
    print_warning "You may need to install additional dependencies or check the error above"
    return 1
  fi

  cd - > /dev/null
}

if [ ! -f .env ]; then
  print_step "Creating .env file from .env.example..."
  if [ -f .env.example ]; then
    cp .env.example .env
    print_success "Created .env file. Please update it with your configuration."
  else
    print_step "Creating default .env file..."
    cat >.env <<EOL
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/call

# App Configuration
NODE_ENV=development
EOL
    print_success "Created default .env file"
  fi
fi

if ! docker compose version &> /dev/null; then
  print_error "'docker compose' not found. Install Docker Compose plugin:"
  echo "  https://docs.docker.com/compose/install/linux/"
  exit 1
fi

if [ ! -d "node_modules" ]; then
  print_step "Installing dependencies..."
  pnpm install
  print_success "Dependencies installed"
fi

install_build_essentials
compile_mediasoup_worker

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
  if docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
    print_success "PostgreSQL is ready"
    
    print_step "Waiting for Redis to be ready..."
    for j in {1..30}; do
      if docker compose exec -T redis redis-cli ping | grep -q PONG; then
        print_success "Redis is ready"
        break
      fi
      if [ $j -eq 30 ]; then
        print_error "Redis failed to start within 30 seconds"
        exit 1
      fi
      sleep 1
    done

    print_step "Migrating db..."
    pnpm run db:migrate
    if [ $? -eq 0 ]; then
      print_success "Database migrations applied successfully"
    else
      print_error "Failed to apply database migrations."
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


print_success "Setup completed successfully! 🎉"
echo ""
echo -e "${GREEN}Next steps to get started:${NC}"
echo "1. Update your .env file with your configuration"
echo "2. Start the development server:"
echo "   - For all apps: pnpm dev"
echo "   - For specific app: pnpm dev --filter <app-name>"
echo ""
echo -e "${BLUE}Available apps:${NC}"
echo "  - apps/web (Next.js frontend)"
echo "  - apps/server (Express.js backend)"
echo ""
echo -e "${YELLOW}Note:${NC} The database is ready and migrations have been applied."
echo "Docker services are running in the background."
