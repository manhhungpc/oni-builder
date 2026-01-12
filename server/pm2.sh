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

start_prod() {
    echo -e "${GREEN}Starting production server (port 3003)...${NC}"
    pm2 start "node --env-file=.env.prod dist/server.js" --name "oni-api-prod"
}

start_dev() {
    echo -e "${GREEN}Starting development server (port 3004)...${NC}"
    pm2 start "node --env-file=.env.dev dist/server.js" --name "oni-api-dev"
}

stop_prod() {
    echo -e "${YELLOW}Stopping production server...${NC}"
    pm2 delete oni-api-prod 2>/dev/null || true
}

stop_dev() {
    echo -e "${YELLOW}Stopping development server...${NC}"
    pm2 delete oni-api-dev 2>/dev/null || true
}

status() {
    echo ""
    echo -e "${YELLOW}=== ONI Builder API Status ===${NC}"
    echo ""

    # Check production
    PROD_STATUS=$(pm2 jlist 2>/dev/null | grep -o '"name":"oni-api-prod"[^}]*"status":"[^"]*"' | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    if [ "$PROD_STATUS" = "online" ]; then
        echo -e "  Production (port 3003):  ${GREEN}● ONLINE${NC}"
    elif [ -n "$PROD_STATUS" ]; then
        echo -e "  Production (port 3003):  ${RED}● $PROD_STATUS${NC}"
    else
        echo -e "  Production (port 3003):  ${RED}● NOT RUNNING${NC}"
    fi

    # Check development
    DEV_STATUS=$(pm2 jlist 2>/dev/null | grep -o '"name":"oni-api-dev"[^}]*"status":"[^"]*"' | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    if [ "$DEV_STATUS" = "online" ]; then
        echo -e "  Development (port 3004): ${GREEN}● ONLINE${NC}"
    elif [ -n "$DEV_STATUS" ]; then
        echo -e "  Development (port 3004): ${RED}● $DEV_STATUS${NC}"
    else
        echo -e "  Development (port 3004): ${RED}● NOT RUNNING${NC}"
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
        dev)
            pm2 logs oni-api-dev
            ;;
        *)
            pm2 logs
            ;;
    esac
}

usage() {
    echo "Usage: $0 {dev|prod|all|stop|restart|status|logs|build}"
    echo ""
    echo "Commands:"
    echo "  dev      - Start development server (port 3004)"
    echo "  prod     - Start production server (port 3003)"
    echo "  all      - Start both servers"
    echo "  stop     - Stop all servers (or: stop dev|prod)"
    echo "  restart  - Restart all servers (or: restart dev|prod)"
    echo "  status   - Show server status"
    echo "  logs     - Show logs (or: logs dev|prod)"
    echo "  build    - Build the project"
    exit 1
}

# Main
case "$1" in
    dev)
        build
        stop_dev
        start_dev
        pm2 save
        ;;
    prod)
        build
        stop_prod
        start_prod
        pm2 save
        ;;
    all)
        build
        stop_dev
        stop_prod
        start_prod
        start_dev
        pm2 save
        ;;
    stop)
        case "$2" in
            dev)
                stop_dev
                ;;
            prod)
                stop_prod
                ;;
            *)
                stop_dev
                stop_prod
                ;;
        esac
        pm2 save
        ;;
    restart)
        case "$2" in
            dev)
                pm2 restart oni-api-dev
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
