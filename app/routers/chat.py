from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from dateutil.parser import isoparse
from supabase import Client
from typing import List
from datetime import datetime
import traceback
from app.schemas.chat import (
    UserCreate, User, UserUpdate,
    SessionCreate, Session, SessionUpdate,
    QuestionCreate, Question,
    AnswerCreate, Answer,
    ChatMessage, ChatResponse,
    ConversationHistory, ConversationItem
)
from app.models.security import get_current_active_user, TokenData
from app.config.database import get_supabase


router = APIRouter(prefix="/chat", tags=["chat"])

def generate_ai_response(question: str) -> str:
    """
    Mock AI response generator.
    Thay thế bằng logic AI thực tế
    """
    return f"Đây là câu trả lời mẫu từ chatbot cho câu hỏi: {question}"



@router.get("/users/me", response_model=User)
async def get_my_profile(
    current_user: TokenData = Depends(get_current_active_user),
    db: Client = Depends(get_supabase)
):
    """Lấy thông tin profile của user hiện tại"""
    try:
        result = db.table("users").select("*").eq("id", current_user.user_id).execute()
        
        if result.data:
            return User(**result.data[0])
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy user")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi lấy user: {str(e)}")

@router.put("/users/me", response_model=User)
async def update_my_profile(
    user_update: UserUpdate,
    current_user: TokenData = Depends(get_current_active_user),
    db: Client = Depends(get_supabase)
):
    """Cập nhật thông tin profile của user hiện tại"""
    try:
        update_data = {k: v for k, v in user_update.dict().items() if v is not None}
        
        result = db.table("users").update(update_data).eq("id", current_user.user_id).execute()
        
        if result.data:
            return User(**result.data[0])
        else:
            raise HTTPException(status_code=400, detail="Không thể cập nhật user")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi cập nhật user: {str(e)}")

# Session Endpoints
@router.post("/sessions/", response_model=Session)
async def create_session(
    session: SessionCreate,
    current_user: TokenData = Depends(get_current_active_user),
    db: Client = Depends(get_supabase)
):
    """Tạo phiên chat mới"""
    try:
        # Chỉ cho phép tạo session cho chính mình
        if session.user_id != current_user.user_id:
            raise HTTPException(status_code=403, detail="Không có quyền tạo session cho user khác")
        
        result = db.table("sessions").insert({
            "user_id": session.user_id,
            "session_title": session.session_title or f"Chat Session {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        }).execute()        
        if result.data:
            return Session(**result.data[0])
        else:
            raise HTTPException(status_code=400, detail="Không thể tạo session")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi tạo session: {str(e)}")

@router.get("/sessions/", response_model=List[Session])
async def get_my_sessions(
    current_user: TokenData = Depends(get_current_active_user),
    db: Client = Depends(get_supabase)
):
    """Lấy tất cả sessions của user hiện tại"""
    try:
        result = db.table("sessions").select("*").eq("user_id", current_user.user_id).order("started_at", desc=True).execute()
        return [Session(**session) for session in result.data]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi lấy sessions: {str(e)}")

@router.get("/sessions/{session_id}", response_model=Session)
async def get_session(
    session_id: str,
    current_user: TokenData = Depends(get_current_active_user),
    db: Client = Depends(get_supabase)
):
    """Lấy thông tin session theo ID"""
    try:
        result = db.table("sessions").select("*").eq("id", session_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy session")
        
        session = result.data[0]
        
        # Kiểm tra quyền truy cập
        if session["user_id"] != current_user.user_id:
            raise HTTPException(status_code=403, detail="Không có quyền truy cập session này")
        
        return Session(**session)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi lấy session: {str(e)}")

@router.put("/sessions/{session_id}", response_model=Session)
async def update_session(
    session_id: str,
    session_update: SessionUpdate,
    current_user: TokenData = Depends(get_current_active_user),
    db: Client = Depends(get_supabase)
):
    """Cập nhật thông tin session"""
    try:
        # Kiểm tra session tồn tại và thuộc về user hiện tại
        session_result = db.table("sessions").select("*").eq("id", session_id).execute()
        if not session_result.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy session")
        
        if session_result.data[0]["user_id"] != current_user.user_id:
            raise HTTPException(status_code=403, detail="Không có quyền cập nhật session này")
        
        update_data = {k: v for k, v in session_update.dict().items() if v is not None}
        
        result = db.table("sessions").update(update_data).eq("id", session_id).execute()
        
        if result.data:
            return Session(**result.data[0])
        else:
            raise HTTPException(status_code=400, detail="Không thể cập nhật session")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi cập nhật session: {str(e)}")

@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: str,
    current_user: TokenData = Depends(get_current_active_user),
    db: Client = Depends(get_supabase)
):
    """Xoá session nếu thuộc về user hiện tại"""
    try:
        # Kiểm tra session tồn tại và thuộc về user hiện tại
        session_result = db.table("sessions").select("*").eq("id", session_id).execute()
        if not session_result.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy session")

        if session_result.data[0]["user_id"] != current_user.user_id:
            raise HTTPException(status_code=403, detail="Không có quyền xoá session này")

        # Xoá session
        delete_result = db.table("sessions").delete().eq("id", session_id).execute()

        if delete_result.data:
            return  JSONResponse(content={"success": True}, status_code=200)
        else:
            raise HTTPException(status_code=400, detail="Không thể xoá session")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi xoá session: {str(e)}")

# Question Endpoints
@router.get("/sessions/{session_id}/questions", response_model=List[Question])
async def get_session_questions(
    session_id: str,
    current_user: TokenData = Depends(get_current_active_user),
    db: Client = Depends(get_supabase)
):
    """Lấy tất cả câu hỏi trong một session"""
    try:
        # Kiểm tra quyền truy cập session
        session_result = db.table("sessions").select("user_id").eq("id", session_id).execute()
        if not session_result.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy session")
        
        if session_result.data[0]["user_id"] != current_user.user_id:
            raise HTTPException(status_code=403, detail="Không có quyền truy cập session này")
        
        result = db.table("questions").select("*").eq("session_id", session_id).order("created_at", desc=False).execute()
        return [Question(**question) for question in result.data]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi lấy questions: {str(e)}")

# Answer Endpoints
@router.get("/questions/{question_id}/answers", response_model=List[Answer])
async def get_question_answers(
    question_id: str,
    current_user: TokenData = Depends(get_current_active_user),
    db: Client = Depends(get_supabase)
):
    """Lấy tất cả câu trả lời của một câu hỏi"""
    try:
        # Kiểm tra quyền truy cập question thông qua session
        question_result = db.table("questions").select("session_id").eq("id", question_id).execute()
        if not question_result.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy question")
        
        session_id = question_result.data[0]["session_id"]
        session_result = db.table("sessions").select("user_id").eq("id", session_id).execute()
        
        if not session_result.data or session_result.data[0]["user_id"] != current_user.user_id:
            raise HTTPException(status_code=403, detail="Không có quyền truy cập")
        
        result = db.table("answers").select("*").eq("question_id", question_id).order("created_at", desc=False).execute()
        return [Answer(**answer) for answer in result.data]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi lấy answers: {str(e)}")

# Chat Endpoint - Main functionality
@router.post("/", response_model=ChatResponse)
async def chat(
    message: ChatMessage,
    current_user: TokenData = Depends(get_current_active_user),
    db: Client = Depends(get_supabase)
):
    """
    - **Chức năng**:  ENDPOINT CHÍNH - Xử lý chat
    - Flow:
        1. Kiểm tra session tồn tại
        2. Tạo question mới
        3. Gọi AI để tạo response
        4. Lưu answer vào database
        5. Trả về kết quả đầy đủ
    - Input: session_id + câu hỏi
    - Output: question_id, answer_id, nội dung Q&A, timestamp
    - Error handling: Rollback nếu có lỗi
    """
    try:
        # Kiểm tra session tồn tại và thuộc về user hiện tại
        session_result = db.table("sessions").select("*").eq("id", message.session_id).execute()
        if not session_result.data:
            raise HTTPException(status_code=404, detail="Session không tồn tại")
        
        if session_result.data[0]["user_id"] != current_user.user_id:
            raise HTTPException(status_code=403, detail="Không có quyền truy cập session này")
        
        # Tạo question
        question_result = db.table("questions").insert({
            "session_id": message.session_id,
            "content": message.question
        }).execute()
        
        if not question_result.data:
            raise HTTPException(status_code=400, detail="Không thể tạo question")
        
        question_data = question_result.data[0]
        
        # kiểm tra đầu vào "message.question"
        #
        #
        #

        
        # Generate AI response
        ai_response = generate_ai_response(message.question)
        
        # Tạo answer
        answer_result = db.table("answers").insert({
            "question_id": question_data["id"],
            "content": ai_response,
            "generated_by": "chatbot"
        }).execute()
        
        if not answer_result.data:
            raise HTTPException(status_code=400, detail="Không thể tạo answer")
        
        answer_data = answer_result.data[0]
        
        return ChatResponse(
            question_id=question_data["id"],
            answer_id=answer_data["id"],
            question=message.question,
            answer=ai_response,
            created_at=datetime.fromisoformat(question_data["created_at"].replace('Z', '+00:00'))
        )
        
    # except HTTPException:
    #     raise
    # except Exception as e:
    #     raise HTTPException(status_code=500, detail=f"Lỗi chat: {str(e)}")
    except Exception as e:
        print("🔥 Lỗi chi tiết khi xử lý câu hỏi:", str(e))
        traceback.print_exc()  # In stacktrace chi tiết
        raise HTTPException(status_code=500, detail=f"Lỗi chat: {str(e)}")

# Get full conversation history
@router.get("/sessions/{session_id}/conversation", response_model=ConversationHistory)
async def get_conversation(
    session_id: str,
    current_user: TokenData = Depends(get_current_active_user),
    db: Client = Depends(get_supabase)
):
    """Lấy toàn bộ lịch sử chat"""
    try:
        # Kiểm tra quyền truy cập session
        session_result = db.table("sessions").select("user_id").eq("id", session_id).execute()
        if not session_result.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy session")
        
        if session_result.data[0]["user_id"] != current_user.user_id:
            raise HTTPException(status_code=403, detail="Không có quyền truy cập session này")
        
        # Lấy questions với answers
        result = db.table("questions").select("""
            id,
            content,
            created_at,
            answers (
                id,
                question_id,                              
                content,
                generated_by,
                created_at
            )
        """).eq("session_id", session_id).order("created_at", desc=False).execute()
        
        conversation = []
        for question in result.data:
            question_data = ConversationItem(
                question_id=question["id"],
                question=question["content"],
                question_time=isoparse(question["created_at"]),
                answers=[Answer(**answer) for answer in question.get("answers", [])]
            )
            conversation.append(question_data)
        
        return ConversationHistory(session_id=session_id, conversation=conversation)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi lấy conversation: {str(e)}")