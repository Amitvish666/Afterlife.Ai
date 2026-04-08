"""
Simplified Auth Server for Testing - No database required
"""
from fastapi import FastAPI, HTTPException, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from typing import Optional
import jwt
import uuid
from datetime import datetime, timedelta

app = FastAPI(
    title="Beyond Life AI - Auth API",
    description="Simplified auth for testing",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for testing (use with caution)
users_db = {}
tokens_db = {}

# Secret keys (use environment variables in production)
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
REFRESH_TOKEN_EXPIRE_DAYS = 30

# Pydantic models
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class RefreshRequest(BaseModel):
    refresh_token: str

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_password(plain: str, hashed: str) -> bool:
    import hashlib
    return hashlib.sha256(plain.encode()).hexdigest() == hashed

def get_password_hash(password: str) -> str:
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest()

@app.post("/api/v1/auth/login")
async def login(request: LoginRequest):
    """Login with email and password"""
    user = users_db.get(request.email)
    
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user["id"], "email": user["email"]})
    refresh_token = create_refresh_token(data={"sub": user["id"]})
    
    response_data = {
        "success": True,
        "data": {
            "user": {
                "id": user["id"],
                "email": user["email"],
                "name": user["name"],
                "created_at": user["created_at"],
            },
            "tokens": {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            },
        },
    }
    
    return JSONResponse(content=response_data)

@app.post("/api/v1/auth/register", status_code=201)
async def register(request: RegisterRequest):
    """Register a new user"""
    if request.email in users_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_dict = {
        "id": user_id,
        "email": request.email,
        "name": request.name,
        "password_hash": get_password_hash(request.password),
        "created_at": datetime.utcnow().isoformat(),
    }
    
    users_db[request.email] = user_dict
    
    access_token = create_access_token(data={"sub": user_dict["id"], "email": user_dict["email"]})
    refresh_token = create_refresh_token(data={"sub": user_dict["id"]})
    
    response_data = {
        "success": True,
        "data": {
            "user": {
                "id": user_dict["id"],
                "email": user_dict["email"],
                "name": user_dict["name"],
                "created_at": user_dict["created_at"],
            },
            "tokens": {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            },
        },
    }
    
    return JSONResponse(content=response_data)

@app.post("/api/v1/auth/refresh")
async def refresh_token(request: RefreshRequest):
    """Refresh access token"""
    try:
        payload = jwt.decode(request.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    # Find user by ID
    user = None
    for u in users_db.values():
        if u["id"] == user_id:
            user = u
            break
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    access_token = create_access_token(data={"sub": user["id"], "email": user["email"]})
    new_refresh_token = create_refresh_token(data={"sub": user["id"]})
    
    response_data = {
        "success": True,
        "data": {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        },
    }
    
    return JSONResponse(content=response_data)

@app.get("/api/v1/auth/me")
async def get_me(authorization: str = None):
    """Get current user info"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = users_db.get(email)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    response_data = {
        "success": True,
        "data": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "created_at": user["created_at"],
        },
    }
    
    return JSONResponse(content=response_data)

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "beyond-life-auth"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
