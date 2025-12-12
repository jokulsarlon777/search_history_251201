# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment variables
ARG NEXT_PUBLIC_REACT_AGENT_URL
ARG NEXT_PUBLIC_LANGGRAPH_URL
ARG NEXT_PUBLIC_ELASTICSEARCH_URL
ARG NEXT_PUBLIC_REACT_ASSISTANT_ID=react_agent
ARG NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID=Deep Researcher

# Set environment variables for build
ENV NEXT_PUBLIC_REACT_AGENT_URL=${NEXT_PUBLIC_REACT_AGENT_URL}
ENV NEXT_PUBLIC_LANGGRAPH_URL=${NEXT_PUBLIC_LANGGRAPH_URL}
ENV NEXT_PUBLIC_ELASTICSEARCH_URL=${NEXT_PUBLIC_ELASTICSEARCH_URL}
ENV NEXT_PUBLIC_REACT_ASSISTANT_ID=${NEXT_PUBLIC_REACT_ASSISTANT_ID}
ENV NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID=${NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID}

# Build Next.js app
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built assets from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
