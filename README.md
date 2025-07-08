# Chat API (FastAPI + Supabase + Qdrant)

Dự án này là một ứng dụng web backend sử dụng:

- ⚡ [FastAPI](https://fastapi.tiangolo.com/) – Web API framework
- 🗃️ [Supabase](https://supabase.com/) – Realtime database & authentication
- 🔍 [Qdrant](https://qdrant.tech/) – Vector search engine
- 🎨 Frontend đơn giản bằng HTML/CSS/JS

---

## 📁 Cấu trúc thư mục

```
chat_api/
├── app/
│   ├── config/           # Cấu hình Supabase, Qdrant
│   ├── models/           # Định nghĩa schema/model
│   ├── routers/          # Các route: auth, search, user,...
│   ├── schemas/          # Định dạng dữ liệu (Pydantic)
│   ├── __init__.py
│   └── main.py
│
├── Frontend/             # HTML/CSS/JS giao diện người dùng
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── ss.js
│
├── .env                  # Biến môi trường (giấu key/API)
├── requirements.txt      # Thư viện cần cài
├── README.md             # File này
└── venv/                 # Môi trường ảo Python
```

---

## 🚀 Cách chạy dự án

### 1. Tạo & kích hoạt môi trường ảo

```bash
python -m venv venv
venv\Scripts\activate  # Windows
# hoặc
source venv/bin/activate  # macOS/Linux
```

### 2. Cài đặt thư viện Python

```bash
pip install -r requirements.txt
```

### 3. Tạo file `.env`

Tạo file `.env` ở thư mục gốc với nội dung:

```dotenv
# Supabase
SUPABASE_URL=https://vfvvvisxlsrcbdeqadxo.supabase.co
SUPABASE_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Qdrant
QDRANT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
QDRANT_HOST=https://fdf2fd1d-d7d7-4a3a-b280-e91fcb97055e.europe-west3-0.gcp.cloud.qdrant.io:6333
```

> 📌 Gợi ý: dùng thư viện `python-dotenv` để load `.env`

### 4. Chạy FastAPI

```bash
uvicorn app.main:app --reload
```

- Truy cập API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🔐 Tính năng xác thực (Auth)

- `/auth/register` – Đăng ký người dùng (dùng Supabase)
- `/auth/login` – Đăng nhập và nhận JWT token
- `get_current_user` – Xác thực người dùng dựa trên token
- Supabase hỗ trợ lưu trữ user và session

---

## 🔎 Tích hợp Qdrant

- Lưu trữ vector dữ liệu (ví dụ: embedding từ AI model)
- Tìm kiếm gần đúng vector (semantic search)
- Kết nối qua HTTP API hoặc thư viện `qdrant-client`

---

## 🌐 Frontend

- Giao diện đơn giản tại thư mục `Frontend/`
- Gửi request đến API backend qua `fetch()` trong `script.js`
- Có thể thêm đăng nhập, tìm kiếm, gửi chat,...

---

## ✅ TODO

- [ ] Tạo bảng chat/user trong Supabase
- [ ] Kết nối Supabase realtime (WebSocket)
- [ ] Tự động indexing dữ liệu vào Qdrant
- [ ] Tách frontend thành SPA riêng (React/Vue)

---

## 📝 License

MIT License – dùng tự do cho mục đích học tập & phát triển.

---

## 📩 Liên hệ

Người phát triển: **chinhlq/longnt**
