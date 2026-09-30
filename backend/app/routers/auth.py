from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, Role
from app.schemas.auth import RoleResponse, UserWithRoleResponse, Token, LoginRequest
from app.services.auth import get_current_user, create_access_token, require_roles
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])

@router.get("/roles", response_model=List[RoleResponse])
def get_roles(db: Session = Depends(get_db)):
    """List all system roles and their permitted document categories."""
    return db.query(Role).all()

@router.get("/users", response_model=List[UserWithRoleResponse])
def get_users(db: Session = Depends(get_db)):
    """List all active platform users with their assigned roles."""
    return db.query(User).filter(User.is_active == True).all()

@router.get("/me", response_model=UserWithRoleResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Retrieve the currently authenticated user with permissions."""
    return current_user

@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Log in using email address and receive an authenticated JWT token."""
    user = db.query(User).filter(User.email == request.email, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with email '{request.email}' not found."
        )

    token = create_access_token(data={"sub": user.user_id, "role": user.role_id, "email": user.email})
    
    log_audit_event(
        db=db,
        action="USER_LOGIN",
        entity="User",
        entity_id=user.user_id,
        user_id=user.user_id,
        details={"email": user.email, "role": user.role_id}
    )

    return Token(
        access_token=token,
        token_type="bearer",
        user=user
    )
