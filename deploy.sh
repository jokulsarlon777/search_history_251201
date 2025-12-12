#!/bin/bash

# Research Agent Docker Deployment Script
# Usage: ./deploy.sh [VM_IP_ADDRESS]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
DEFAULT_VM_IP="192.168.1.100"
VM_IP="${1:-$DEFAULT_VM_IP}"

echo -e "${GREEN}=== Research Agent Deployment ===${NC}"
echo -e "VM IP Address: ${YELLOW}${VM_IP}${NC}"
echo ""

# Validate IP address format
if ! [[ $VM_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
    echo -e "${RED}Error: Invalid IP address format${NC}"
    echo "Usage: ./deploy.sh [VM_IP_ADDRESS]"
    exit 1
fi

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    echo "Please install Docker Compose first: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}Step 1: Updating docker-compose.yml with VM IP...${NC}"

# Backup original docker-compose.yml
if [ -f docker-compose.yml.bak ]; then
    cp docker-compose.yml.bak docker-compose.yml
else
    cp docker-compose.yml docker-compose.yml.bak
fi

# Update IP addresses in docker-compose.yml
sed -i "s|NEXT_PUBLIC_REACT_AGENT_URL:.*|NEXT_PUBLIC_REACT_AGENT_URL: http://${VM_IP}:2025|g" docker-compose.yml
sed -i "s|NEXT_PUBLIC_LANGGRAPH_URL:.*|NEXT_PUBLIC_LANGGRAPH_URL: http://${VM_IP}:2024|g" docker-compose.yml
sed -i "s|NEXT_PUBLIC_ELASTICSEARCH_URL:.*|NEXT_PUBLIC_ELASTICSEARCH_URL: http://${VM_IP}:9200|g" docker-compose.yml

echo -e "${GREEN}✓ Configuration updated${NC}"
echo ""

echo -e "${GREEN}Step 2: Stopping existing containers...${NC}"
docker-compose down || true
echo -e "${GREEN}✓ Containers stopped${NC}"
echo ""

echo -e "${GREEN}Step 3: Building Docker images...${NC}"
docker-compose build --no-cache
echo -e "${GREEN}✓ Images built${NC}"
echo ""

echo -e "${GREEN}Step 4: Starting containers...${NC}"
docker-compose up -d
echo -e "${GREEN}✓ Containers started${NC}"
echo ""

echo -e "${GREEN}Step 5: Waiting for services to be healthy...${NC}"
sleep 10

# Check service health
check_service() {
    local service_name=$1
    local url=$2
    local max_attempts=30
    local attempt=1

    echo -n "Checking ${service_name}... "

    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "${url}" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Healthy${NC}"
            return 0
        fi
        sleep 2
        attempt=$((attempt + 1))
    done

    echo -e "${RED}✗ Failed${NC}"
    return 1
}

check_service "Elasticsearch" "http://${VM_IP}:9200/_cluster/health"
check_service "React Agent" "http://${VM_IP}:2025/ok"
check_service "Deep Research Agent" "http://${VM_IP}:2024/ok"
check_service "Frontend" "http://${VM_IP}:3000"

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo -e "Access the application at: ${YELLOW}http://${VM_IP}:3000${NC}"
echo ""
echo -e "Service URLs:"
echo -e "  Frontend:          ${YELLOW}http://${VM_IP}:3000${NC}"
echo -e "  React Agent:       ${YELLOW}http://${VM_IP}:2025${NC}"
echo -e "  Deep Research:     ${YELLOW}http://${VM_IP}:2024${NC}"
echo -e "  Elasticsearch:     ${YELLOW}http://${VM_IP}:9200${NC}"
echo ""
echo -e "Useful commands:"
echo -e "  View logs:         ${YELLOW}docker-compose logs -f${NC}"
echo -e "  Check status:      ${YELLOW}docker-compose ps${NC}"
echo -e "  Stop services:     ${YELLOW}docker-compose stop${NC}"
echo -e "  Restart services:  ${YELLOW}docker-compose restart${NC}"
echo ""
