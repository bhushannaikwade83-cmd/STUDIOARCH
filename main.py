"""
StudioArch FastAPI Backend
MySQL Database + JWT Authentication
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
import jwt
import os
from dotenv import load_dotenv

load_dotenv()

# Database
from database import init_db, query, insert, update, delete

# Initialize
app = FastAPI(title="StudioArch API", version="1.0.0")
init_db()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Config
JWT_SECRET = os.getenv("JWT_SECRET", "your_secret_key")
JWT_ALGORITHM = "HS256"

print("🚀 StudioArch FastAPI Backend Starting...")
print("📍 Database:", os.getenv("DB_NAME", "digitrix_studioarchwebsite"))

# ===== AUTH =====

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: dict

@app.post("/api/auth/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    """Login endpoint - returns JWT token"""
    try:
        print(f"🔐 [Auth] Login attempt: {req.email}")

        # Get user from database
        users = await query("SELECT * FROM users WHERE email = %s", (req.email,))

        if not users:
            print(f"❌ [Auth] User not found: {req.email}")
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user = users[0]

        # Verify password (for now, simple comparison - in production use bcrypt)
        # In production: import bcrypt; bcrypt.checkpw(password.encode(), user['password'])
        if user['password'] != req.password:
            print(f"❌ [Auth] Password mismatch")
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Generate JWT token
        token_data = {
            "id": user['id'],
            "email": user['email'],
            "role": user.get('role', 'admin'),
            "exp": datetime.utcnow() + timedelta(hours=24)
        }
        token = jwt.encode(token_data, JWT_SECRET, algorithm=JWT_ALGORITHM)

        print(f"✅ [Auth] Login successful: {req.email}")

        return LoginResponse(
            token=token,
            user={
                "id": user['id'],
                "email": user['email'],
                "role": user.get('role', 'admin')
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [Auth] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== PROJECTS =====

class Project(BaseModel):
    name: str
    location: str = ""
    year: str = ""
    category: str = ""
    description: str = ""
    images: list = []

@app.get("/api/projects")
async def get_projects():
    """Get all projects"""
    try:
        print("📥 [API] Getting projects...")
        projects = await query("SELECT * FROM projects ORDER BY display_order ASC")
        print(f"✅ [API] Found {len(projects)} projects")
        return projects
    except Exception as e:
        print(f"❌ [API] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/projects")
async def create_project(project: Project, token: str = Depends(lambda: None)):
    """Create project (requires auth)"""
    try:
        # TODO: Verify JWT token
        print(f"📝 [API] Creating project: {project.name}")

        result = await insert(
            "INSERT INTO projects (name, location, year, category, description, images) VALUES (%s, %s, %s, %s, %s, %s)",
            (project.name, project.location, project.year, project.category, project.description, str(project.images))
        )

        print(f"✅ [API] Project created")
        return {"id": result, **project.dict()}

    except Exception as e:
        print(f"❌ [API] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/projects/{id}")
async def update_project(id: int, project: Project):
    """Update project"""
    try:
        print(f"✏️ [API] Updating project: {id}")

        await update(
            "UPDATE projects SET name=%s, location=%s, year=%s, category=%s, description=%s WHERE id=%s",
            (project.name, project.location, project.year, project.category, project.description, id)
        )

        print(f"✅ [API] Project updated")
        return {"success": True}

    except Exception as e:
        print(f"❌ [API] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/projects/{id}")
async def delete_project(id: int):
    """Delete project"""
    try:
        print(f"🗑️ [API] Deleting project: {id}")

        await delete("DELETE FROM projects WHERE id=%s", (id,))

        print(f"✅ [API] Project deleted")
        return {"success": True}

    except Exception as e:
        print(f"❌ [API] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== HEALTH =====

@app.get("/health")
async def health():
    """Health check"""
    return {"status": "ok"}

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "StudioArch API", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
