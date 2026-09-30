from pydantic import BaseModel, EmailStr
from typing import List, Optional
import datetime

class RoleBase(BaseModel):
    role_id: str
    role_name: str
    description: Optional[str] = None
    permitted_categories: List[str] = []

class RoleCreate(RoleBase):
    pass

class RoleResponse(RoleBase):
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role_id: str

class UserCreate(UserBase):
    user_id: Optional[str] = None

class UserResponse(UserBase):
    user_id: str
    is_active: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class UserWithRoleResponse(UserResponse):
    role: RoleResponse

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserWithRoleResponse

class LoginRequest(BaseModel):
    email: EmailStr
