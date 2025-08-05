#!/bin/bash

# Docker Helper Script for Boutique Store
# Makes Docker commands easier to use

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    printf "${2}${1}${NC}\n"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_color "Docker is not running. Please start Docker first." "$RED"
        exit 1
    fi
}

# Function to check if .env file exists
check_env() {
    if [ ! -f .env ]; then
        print_color "No .env file found. Creating from .env.docker..." "$YELLOW"
        cp .env.docker .env
        print_color "Please update .env with your actual values!" "$YELLOW"
        exit 1
    fi
}

# Main script
case "$1" in
    "dev"|"development")
        check_docker
        check_env
        print_color "Starting development environment..." "$GREEN"
        docker compose -f docker-compose.yml -f docker-compose.dev.yml up
        ;;
    
    "dev:build")
        check_docker
        check_env
        print_color "Building and starting development environment..." "$GREEN"
        docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
        ;;
    
    "prod"|"production")
        check_docker
        check_env
        print_color "Starting production environment..." "$GREEN"
        docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
        ;;
    
    "prod:build")
        check_docker
        check_env
        print_color "Building and starting production environment..." "$GREEN"
        docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
        ;;
    
    "stop")
        check_docker
        print_color "Stopping all containers..." "$YELLOW"
        docker compose down
        ;;
    
    "clean")
        check_docker
        print_color "Stopping and removing all containers, networks, and volumes..." "$RED"
        docker compose down -v
        ;;
    
    "logs")
        check_docker
        if [ -z "$2" ]; then
            docker compose logs -f
        else
            docker compose logs -f "$2"
        fi
        ;;
    
    "shell")
        check_docker
        service="${2:-backend}"
        print_color "Opening shell in $service container..." "$GREEN"
        docker compose exec "$service" sh
        ;;
    
    "test")
        check_docker
        print_color "Running tests in backend container..." "$GREEN"
        docker compose exec backend npm test
        ;;
    
    "migrate")
        check_docker
        print_color "Running database migrations..." "$GREEN"
        docker compose exec backend node populate-simple.js
        ;;
    
    "status")
        check_docker
        print_color "Container status:" "$GREEN"
        docker compose ps
        ;;
    
    "restart")
        check_docker
        service="${2}"
        if [ -z "$service" ]; then
            print_color "Restarting all containers..." "$YELLOW"
            docker compose restart
        else
            print_color "Restarting $service..." "$YELLOW"
            docker compose restart "$service"
        fi
        ;;
    
    "scale")
        check_docker
        if [ -z "$2" ] || [ -z "$3" ]; then
            print_color "Usage: ./docker-helper.sh scale <service> <count>" "$RED"
            print_color "Example: ./docker-helper.sh scale backend 3" "$YELLOW"
            exit 1
        fi
        print_color "Scaling $2 to $3 instances..." "$GREEN"
        docker compose up -d --scale "$2=$3"
        ;;
    
    "backup")
        check_docker
        timestamp=$(date +%Y%m%d_%H%M%S)
        backup_dir="backups/mongodb_$timestamp"
        mkdir -p "$backup_dir"
        print_color "Backing up MongoDB to $backup_dir..." "$GREEN"
        docker compose exec -T mongodb mongodump --archive="/tmp/backup.archive"
        docker cp "$(docker compose ps -q mongodb)":/tmp/backup.archive "$backup_dir/"
        print_color "Backup completed!" "$GREEN"
        ;;
    
    "restore")
        check_docker
        if [ -z "$2" ]; then
            print_color "Usage: ./docker-helper.sh restore <backup_file>" "$RED"
            exit 1
        fi
        print_color "Restoring MongoDB from $2..." "$YELLOW"
        docker cp "$2" "$(docker compose ps -q mongodb)":/tmp/restore.archive
        docker compose exec mongodb mongorestore --archive="/tmp/restore.archive"
        print_color "Restore completed!" "$GREEN"
        ;;
    
    *)
        print_color "Boutique Store Docker Helper" "$GREEN"
        echo ""
        echo "Usage: ./docker-helper.sh [command] [options]"
        echo ""
        echo "Commands:"
        echo "  dev, development    Start development environment"
        echo "  dev:build          Build and start development environment"
        echo "  prod, production   Start production environment"
        echo "  prod:build         Build and start production environment"
        echo "  stop               Stop all containers"
        echo "  clean              Remove all containers, networks, and volumes"
        echo "  logs [service]     Show logs (all services or specific)"
        echo "  shell [service]    Open shell in container (default: backend)"
        echo "  test               Run tests"
        echo "  migrate            Run database population script"
        echo "  status             Show container status"
        echo "  restart [service]  Restart containers"
        echo "  scale <service> <count>  Scale service to N instances"
        echo "  backup             Backup MongoDB database"
        echo "  restore <file>     Restore MongoDB database"
        echo ""
        echo "Examples:"
        echo "  ./docker-helper.sh dev"
        echo "  ./docker-helper.sh logs backend"
        echo "  ./docker-helper.sh shell frontend"
        echo "  ./docker-helper.sh scale backend 3"
        ;;
esac