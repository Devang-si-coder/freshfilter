from pydantic import BaseModel, EmailStr, Field, ConfigDict


# Registration request
class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


# Login request
class UserLogin(BaseModel):
    email: EmailStr
    password: str


# User information returned by API
class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr

    model_config = ConfigDict(from_attributes=True)


# JWT response
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"