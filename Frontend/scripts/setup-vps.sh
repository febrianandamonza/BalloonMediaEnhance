#!/bin/bash
# ============================================================
# SkyStar GeoInt — VPS Setup Script
# KEBIJAKAN ISOLASI: TIDAK mengubah apapun yang sudah ada
# ============================================================
set -e

echo "============================================"
echo "  SkyStar GeoInt VPS Setup (ISOLATED)"
echo "============================================"

# --- Step 0: Audit existing services ---
echo ""
echo ">>> AUDIT: Checking existing services..."
echo "--- Running processes ---"
pm2 list 2>/dev/null || echo "PM2 not installed yet"
echo "--- Active ports ---"
ss -tlnp | grep -E ':(80|443|3000|3001|8080)' 2>/dev/null || echo "No matching ports"
echo "--- Existing Nginx sites ---"
ls /etc/nginx/sites-enabled/ 2>/dev/null || echo "No sites-enabled dir"
echo "--- Existing /var/www ---"
ls /var/www/ 2>/dev/null || echo "No /var/www"
echo ""

# --- Step 1: Install Node.js 20 LTS (only if not installed) ---
if ! command -v node &> /dev/null; then
    echo ">>> Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo ">>> Node.js already installed: $(node -v)"
fi

# --- Step 2: Install PM2 globally (only if not installed) ---
if ! command -v pm2 &> /dev/null; then
    echo ">>> Installing PM2..."
    npm install -g pm2
else
    echo ">>> PM2 already installed: $(pm2 -v)"
fi

# --- Step 3: Install Nginx (only if not installed) ---
if ! command -v nginx &> /dev/null; then
    echo ">>> Installing Nginx..."
    apt-get update
    apt-get install -y nginx
else
    echo ">>> Nginx already installed: $(nginx -v 2>&1)"
fi

# --- Step 4: Install Certbot (only if not installed) ---
if ! command -v certbot &> /dev/null; then
    echo ">>> Installing Certbot..."
    apt-get install -y certbot python3-certbot-nginx
else
    echo ">>> Certbot already installed"
fi

# --- Step 5: Clone repo to ISOLATED directory ---
echo ""
echo ">>> Setting up /var/www/balon (ISOLATED)..."
mkdir -p /var/www/balon

if [ ! -d "/var/www/balon/.git" ]; then
    echo ">>> Cloning repository..."
    cd /var/www/balon
    git clone https://github.com/fesri-haris/balon.git .
else
    echo ">>> Repository already cloned, pulling latest..."
    cd /var/www/balon
    git pull origin master
fi

# --- Step 6: Build Next.js ---
echo ""
echo ">>> Building Next.js app..."
cd /var/www/balon/app
npm ci --production=false
npm run build

# --- Step 7: Start PM2 process on PORT 3001 (ISOLATED) ---
echo ""
echo ">>> Starting PM2 process 'skystar-balon' on port 3001..."
export PORT=3001
pm2 delete skystar-balon 2>/dev/null || true
cd /var/www/balon/app
PORT=3001 pm2 start npm --name skystar-balon -- start
pm2 save
pm2 startup 2>/dev/null || true

# --- Step 8: Add Nginx server block (ADD-ONLY, never modify existing) ---
echo ""
echo ">>> Adding Nginx config for balon.demo-apps.id..."
NGINX_CONF="/etc/nginx/sites-available/balon.conf"

if [ ! -f "$NGINX_CONF" ]; then
    cat > "$NGINX_CONF" << 'NGINX_EOF'
# SkyStar GeoInt — balon.demo-apps.id
# This is a NEW, ISOLATED server block
server {
    server_name balon.demo-apps.id;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen 80;
}
NGINX_EOF
    echo ">>> Nginx config created."
else
    echo ">>> Nginx config already exists, skipping."
fi

# Symlink if not exists
if [ ! -L "/etc/nginx/sites-enabled/balon.conf" ]; then
    ln -s "$NGINX_CONF" /etc/nginx/sites-enabled/
    echo ">>> Symlink created."
fi

# TEST before reload (SAFETY)
echo ">>> Testing Nginx config..."
nginx -t
if [ $? -eq 0 ]; then
    echo ">>> Nginx config OK, reloading (zero-downtime)..."
    systemctl reload nginx
else
    echo "!!! Nginx config FAILED. NOT reloading. Please check manually."
    exit 1
fi

# --- Final status ---
echo ""
echo "============================================"
echo "  DEPLOYMENT COMPLETE"
echo "============================================"
echo ""
echo ">>> PM2 processes:"
pm2 list
echo ""
echo ">>> Verify existing services still running:"
ss -tlnp | grep -E ':(80|443|3000|3001|8080)'
echo ""
echo "Website should be available at: http://balon.demo-apps.id"
echo "(After DNS pointing is configured)"
echo ""
echo "To add SSL later, run:"
echo "  certbot --nginx -d balon.demo-apps.id"
