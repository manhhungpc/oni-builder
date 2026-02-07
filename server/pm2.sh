#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Functions
build() {
    echo -e "${YELLOW}Building project...${NC}"
    npm run build
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Build successful${NC}"
    else
        echo -e "${RED}Build failed${NC}"
        exit 1
    fi
}

migrate_stg() {
    echo -e "${YELLOW}Running database migrations (staging)...${NC}"
    npx dotenv -e .env.dev -- npx prisma migrate deploy
    npx dotenv -e .env.dev -- npx prisma generate
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Migration successful${NC}"
    else
        echo -e "${RED}Migration failed${NC}"
        exit 1
    fi
}

migrate_prod() {
    echo -e "${YELLOW}Running database migrations (prod)...${NC}"
    npx dotenv -e .env.prod -- npx prisma migrate deploy
    npx dotenv -e .env.prod -- npx prisma generate
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Migration successful${NC}"
    else
        echo -e "${RED}Migration failed${NC}"
        exit 1
    fi
}

start_stg() {
    echo -e "${GREEN}Starting staging server (port 3003)...${NC}"
    pm2 start "node --env-file=.env.dev dist/server.js" --name "oni-api-stg"
}

stop_stg() {
    echo -e "${YELLOW}Stopping staging server...${NC}"
    pm2 delete oni-api-stg 2>/dev/null || true
}

start_prod() {
    echo -e "${GREEN}Starting production server (port 8008)...${NC}"
    pm2 start "node --env-file=.env.prod dist/server.js" --name "oni-api-prod"
}

stop_prod() {
    echo -e "${YELLOW}Stopping production server...${NC}"
    pm2 delete oni-api-prod 2>/dev/null || true
}

status() {
    echo ""
    echo -e "${YELLOW}=== ONI Builder API Status ===${NC}"
    echo ""

    # Check production
    PROD_STATUS=$(pm2 jlist 2>/dev/null | grep -o '"name":"oni-api-prod"[^}]*"status":"[^"]*"' | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    if [ "$PROD_STATUS" = "online" ]; then
        echo -e "  Production (port 8008):  ${GREEN}● ONLINE${NC}"
    elif [ -n "$PROD_STATUS" ]; then
        echo -e "  Production (port 8008):  ${RED}● $PROD_STATUS${NC}"
    else
        echo -e "  Production (port 8008):  ${RED}● NOT RUNNING${NC}"
    fi

    # Check staging
    STG_STATUS=$(pm2 jlist 2>/dev/null | grep -o '"name":"oni-api-stg"[^}]*"status":"[^"]*"' | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    if [ "$STG_STATUS" = "online" ]; then
        echo -e "  Staging (port 3003):     ${GREEN}● ONLINE${NC}"
    elif [ -n "$STG_STATUS" ]; then
        echo -e "  Staging (port 3003):     ${RED}● $STG_STATUS${NC}"
    else
        echo -e "  Staging (port 3003):     ${RED}● NOT RUNNING${NC}"
    fi

    echo ""

    # Show detailed PM2 list
    echo -e "${YELLOW}=== PM2 Details ===${NC}"
    pm2 list
}

logs() {
    case "$2" in
        prod)
            pm2 logs oni-api-prod
            ;;
        stg)
            pm2 logs oni-api-stg
            ;;
        *)
            pm2 logs
            ;;
    esac
}

usage() {
    echo "Usage: $0 {stg|prod|all|stop|restart|status|logs|build}"
    echo ""
    echo "Commands:"
    echo "  stg      - Start staging server (port 3003)"
    echo "  prod     - Start production server (port 8008)"
    echo "  all      - Start both servers"
    echo "  stop     - Stop all servers (or: stop stg|prod)"
    echo "  restart  - Restart all servers (or: restart stg|prod)"
    echo "  status   - Show server status"
    echo "  logs     - Show logs (or: logs stg|prod)"
    echo "  build    - Build the project"
    exit 1
}

# Main
case "$1" in
    stg)
        migrate_stg
        build
        stop_stg
        start_stg
        pm2 save
        ;;
    prod)
        migrate_prod
        build
        stop_prod
        start_prod
        pm2 save
        ;;
    all)
        migrate_stg
        migrate_prod
        build
        stop_stg
        stop_prod
        start_prod
        start_stg
        pm2 save
        ;;
    stop)
        case "$2" in
            stg)
                stop_stg
                ;;
            prod)
                stop_prod
                ;;
            *)
                stop_stg
                stop_prod
                ;;
        esac
        pm2 save
        ;;
    restart)
        case "$2" in
            stg)
                pm2 restart oni-api-stg
                ;;
            prod)
                pm2 restart oni-api-prod
                ;;
            *)
                pm2 restart all
                ;;
        esac
        ;;
    status)
        status
        ;;
    logs)
        logs "$@"
        ;;
    build)
        build
        ;;
    *)
        usage
        ;;
esac
