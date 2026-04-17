# 1. Copy env file and fill in your values
cp .env.example .env

# 2. Generate JWT keys
openssl genrsa -out jwt_private.pem 2048
openssl rsa -in jwt_private.pem -pubout -out jwt_public.pem

# 3. Start everything
docker compose up --build

# 4. Test the health endpoint
curl http://localhost:8080/health
# → {"status":"ok","time":"...","version":"0.1.0"}

# 5. Open the frontend
# http://localhost:5173 — login page with live API health indicator