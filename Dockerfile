FROM node:20-alpine

WORKDIR /app

# Create non-root user for running the application
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev && npm cache clean --force

# Copy app code
COPY --chown=nodejs:nodejs . .

# Create logs directory
RUN mkdir -p logs && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start app
CMD ["node", "app-standalone.js"]
