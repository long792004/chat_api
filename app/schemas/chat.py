from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from uuid import uuid4

# User Models
class UserCreate(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None

class User(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    created_at: datetime
    is_active: bool = True

# Session Models
class SessionCreate(BaseModel):
    user_id: str
    session_title: Optional[str] = None

class SessionUpdate(BaseModel):
    session_title: Optional[str] = None

class Session(BaseModel):
    id: str
    user_id: str
    started_at: datetime
    session_title: Optional[str]
    is_active: bool = True

# Question Models
class QuestionCreate(BaseModel):
    session_id: str
    content: str

class Question(BaseModel):
    id: str
    session_id: str
    content: str
    created_at: datetime

# Answer Models
class AnswerCreate(BaseModel):
    question_id: str
    content: str
    generated_by: str = "chatbot"

class Answer(BaseModel):
    id: str
    question_id: str
    content: str
    generated_by: str
    created_at: datetime

# Chat Models
class ChatMessage(BaseModel):
    session_id: str
    question: str

class ChatResponse(BaseModel):
    question_id: str
    answer_id: str
    question: str
    answer: str
    created_at: datetime

# Conversation Models
class ConversationItem(BaseModel):
    question_id: str
    question: str
    question_time: datetime
    answers: List[Answer]

class ConversationHistory(BaseModel):
    session_id: str
    conversation: List[ConversationItem]