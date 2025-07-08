document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const authContainer = document.getElementById('auth-container');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginFormElement = document.getElementById('login-form-element');
    const registerFormElement = document.getElementById('register-form-element');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const chatContainer = document.getElementById('chat-container');
    const statusDiv = document.getElementById('status');
    const chatLog = document.getElementById("chat-log");
    const sessionList = document.getElementById("session-list");
    const sessionInfo = document.getElementById("session-info");
    const chatForm = document.getElementById("chat-form");

    // State
    let authToken = null;
    const API_URL = "http://127.0.0.1:8000";
    let sessions = [];
    let currentSessionId = null;
    let refreshTokenInterval = null;


    // --- UTILITY FUNCTIONS ---

    /**
     * Hiển thị một thông báo trạng thái không chặn thay cho alert().
     * @param {string} message - Nội dung thông báo.
     * @param {boolean} isError - True nếu là thông báo lỗi.
     */
    function showStatusMessage(message, isError = false) {
        statusDiv.textContent = message;
        statusDiv.style.backgroundColor = isError ? '#f8d7da' : '#d4edda';
        statusDiv.style.color = isError ? '#721c24' : '#155724';
        statusDiv.style.display = 'block';
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 4000); // Ẩn sau 4 giây
    }

    /**
     * Helper function for making API calls.
     */
    async function apiCall(endpoint, method, body, requiresAuth = false) {
        const headers = { 'Content-Type': 'application/json' };
        if (requiresAuth && authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        const config = { method, headers };
        if (body) {
            config.body = JSON.stringify(body);
        }
        const response = await fetch(`${API_URL}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            // Ném lỗi với thông điệp từ server để khối catch có thể bắt được
            throw new Error(data.detail || `HTTP Error ${response.status}`);
        }
        return data;
    }

    // --- AUTHENTICATION ---

    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    registerFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const fullName = document.getElementById('register-name').value;
        const password = document.getElementById('register-password').value;

        try {
            const userData = await apiCall('/auth/register/', 'POST', { email, password, full_name: fullName });
            showStatusMessage(`Đăng ký thành công! User ID: ${userData.id}. Vui lòng đăng nhập.`);
            showLoginLink.click();
        } catch (error) {
            console.error('Lỗi đăng ký:', error);
            showStatusMessage(`Lỗi đăng ký: ${error.message}`, true);
        }
    });

    loginFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const data = await apiCall('/auth/login', 'POST', { email, password });
            authToken = data.access_token;
            localStorage.setItem('authToken', authToken);
            await initializeChatView();
        } catch (error) {
            console.error('Lỗi đăng nhập:', error);
            showStatusMessage(`Lỗi đăng nhập: ${error.message}`, true);
        }
    });

    function logout() {
        authToken = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
        if (refreshTokenInterval) {
            clearInterval(refreshTokenInterval);
        }
        authContainer.classList.remove('hidden');
        chatContainer.classList.add('hidden');
        showStatusMessage("Bạn đã đăng xuất.");
    }

    // --- TOKEN REFRESH ---

    async function refreshToken() {
        try {
            const data = await apiCall('/auth/refresh', 'POST', null, true);
            authToken = data.access_token;
            localStorage.setItem('authToken', authToken);
            console.log("✅ Token đã được làm mới.");
        } catch (err) {
            console.error("❌ Lỗi refresh token:", err);
            showStatusMessage("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.", true);
            logout();
        }
    }

    function startRefreshTokenLoop() {
        if (refreshTokenInterval) {
            clearInterval(refreshTokenInterval);
        }
        // Mỗi 10 phút làm mới token 1 lần
        refreshTokenInterval = setInterval(refreshToken, 10 * 60 * 1000);
    }


    // --- CHAT VIEW INITIALIZATION ---

    async function initializeChatView() {
        try {
            const userInfo = await apiCall('/auth/me', 'GET', null, true);
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            
            document.getElementById('user-name-display').innerText = `Xin chào, ${userInfo.full_name || userInfo.email}`;
            
            authContainer.classList.add('hidden');
            chatContainer.classList.remove('hidden');
            
            await loadSessionsFromServer();
            startRefreshTokenLoop();
        } catch (error) {
            console.error("Lỗi khi khởi tạo giao diện chat:", error);
            showStatusMessage("Token không hợp lệ hoặc hết hạn. Vui lòng đăng nhập lại.", true);
            logout();
        }
    }

    // --- SESSION MANAGEMENT ---

    document.getElementById("new-session-btn").addEventListener("click", async () => {
        const sessionName = `Phiên mới ${new Date().toLocaleTimeString()}`;
        const storedUser = localStorage.getItem('userInfo');
        if (!storedUser) {
            showStatusMessage("Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.", true);
            logout();
            return;
        }
        const userInfo = JSON.parse(storedUser);

        try {
            const createdSession = await apiCall('/chat/sessions/', 'POST', {
                "user_id": userInfo.id,
                "session_title": sessionName
            }, true);
            
            // Thêm vào đầu danh sách để hiển thị trên cùng
            sessions.unshift({ id: createdSession.id, name: createdSession.session_title });
            renderSessionList();
            await loadSession(createdSession.id); // Tự động chọn phiên mới tạo

        } catch (err) {
            console.error("Lỗi khi tạo phiên mới:", err);
            showStatusMessage(`Không thể tạo phiên mới: ${err.message}`, true);
        }
    });

    function renderSessionList() {
        sessionList.innerHTML = "";
        sessions.forEach(session => {
            const li = document.createElement("li");
            li.dataset.sessionId = session.id;
            // Đánh dấu phiên đang được chọn
            if (session.id === currentSessionId) {
                li.classList.add('active-session');
            }

            const nameSpan = document.createElement("span");
            nameSpan.textContent = session.name || `Phiên không tên`;
            nameSpan.classList.add("session-name");
            nameSpan.onclick = () => loadSession(session.id);

            const renameBtn = document.createElement("button");
            renameBtn.textContent = "✏️";
            renameBtn.classList.add("rename-btn");
            renameBtn.onclick = (e) => { e.stopPropagation(); renameSession(session.id); };

            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "🗑️";
            deleteBtn.classList.add("delete-btn");
            deleteBtn.onclick = (e) => { e.stopPropagation(); deleteSession(session.id); };

            li.appendChild(nameSpan);
            li.appendChild(renameBtn);
            li.appendChild(deleteBtn);
            sessionList.appendChild(li);
        });
    }

    async function renameSession(id) {
        const session = sessions.find(s => s.id === id);
        const newName = prompt("Nhập tên mới cho phiên:", session.name || "");

        if (newName && newName.trim() !== "") {
            try {
                const updatedSession = await apiCall(`/chat/sessions/${id}`, 'PUT', {
                    session_title: newName.trim()
                }, true);
                session.name = updatedSession.session_title;
                renderSessionList();
                if (id === currentSessionId) {
                    sessionInfo.textContent = `Phiên chat: ${session.name}`;
                }
            } catch (err) {
                console.error("Lỗi đổi tên session:", err);
                showStatusMessage(`Không thể đổi tên phiên: ${err.message}`, true);
            }
        }
    }

    async function deleteSession(id) {
        // Thay thế confirm bằng một phương thức khác nếu cần (ví dụ: modal)
        // Vì mục đích sửa lỗi, tạm thời xóa không cần xác nhận
        try {
            await apiCall(`/chat/sessions/${id}`, 'DELETE', null, true);
            sessions = sessions.filter(s => s.id !== id);
            
            if (currentSessionId === id) {
                currentSessionId = null;
                chatLog.innerHTML = "";
                sessionInfo.textContent = "Chưa có phiên nào được chọn";
                // Tùy chọn: tự động chọn phiên gần nhất
                if (sessions.length > 0) {
                    await loadSession(sessions[0].id);
                }
            }
            renderSessionList();
            showStatusMessage("Đã xóa phiên chat.");
        } catch (err) {
            console.error("Lỗi xóa session:", err);
            showStatusMessage(`Không thể xóa phiên chat: ${err.message}`, true);
        }
    }

    async function loadSessionsFromServer() {
        try {
            const sessionData = await apiCall('/chat/sessions/', 'GET', null, true);
            sessions = sessionData.map(s => ({
                id: s.id,
                name: s.session_title || `Phiên lúc ${new Date(s.started_at).toLocaleString()}`
            })).reverse(); // Hiển thị phiên mới nhất lên đầu
            
            renderSessionList();

            if (sessions.length > 0) {
                await loadSession(sessions[0].id);
            } else {
                chatLog.innerHTML = "";
                sessionInfo.textContent = "Chưa có phiên nào được chọn. Hãy tạo một phiên mới!";
            }
        } catch (err) {
            console.error("Không thể tải danh sách session:", err);
            showStatusMessage("Lỗi khi tải các phiên chat.", true);
        }
    }

    async function loadSession(id) {
        currentSessionId = id;
        const session = sessions.find(s => s.id === id);
        try {
            const sessionData = await apiCall(`/chat/sessions/${id}/conversation`, 'GET', null, true);
            sessionInfo.textContent = `Phiên chat: ${session ? session.name : id}`;
            chatLog.innerHTML = ""; // Xóa tin nhắn cũ

            sessionData.conversation.forEach(item => {
                addMessage(item.question, "user");
                item.answers.forEach(ans => {
                    addMessage(ans.content, "bot");
                });
            });
            renderSessionList(); // Cập nhật lại list để highlight session active
        } catch (err) {
            console.error("Lỗi tải nội dung session:", err);
            showStatusMessage(`Không thể tải nội dung phiên chat: ${err.message}`, true);
        }
    }

    // --- CHAT & FILE HANDLING ---

    function addMessage(text, sender) {
        const msgDiv = document.createElement("div");
        msgDiv.classList.add("message-container", sender === "user" ? "user-message" : "bot-message");
        msgDiv.innerHTML = text; // Dùng innerHTML để render <br> và các thẻ khác
        chatLog.appendChild(msgDiv);
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    async function uploadFile(file) {
        const formData = new FormData();
        formData.append("file", file);

        try {
            // Dùng fetch riêng cho upload file vì không dùng 'Content-Type: application/json'
            const response = await fetch(`${API_URL}/file/upload-file/`, {
                method: "POST",
                headers: { Authorization: `Bearer ${authToken}` },
                body: formData
            });

            const text = await response.text();
            let result;
            try {
                result = JSON.parse(text);
            } catch {
                result = { detail: text };
            }
            if (!response.ok) {
                throw new Error(result.detail || "Upload failed");
            }

            console.log("✅ Upload thành công:", result);
            showStatusMessage(`Đã tải lên thành công file: ${file.name}`);
            return result; // Trả về kết quả để xử lý tiếp nếu cần

        } catch (error) {
            console.error("❌ Lỗi upload:", error);
            // Ném lỗi ra ngoài để hàm gọi nó (chat form submit) có thể bắt được
            throw error;
        }
    }

    chatForm.addEventListener("submit", async function(e) {
        e.preventDefault(); // Ngăn reload trang
        
        const messageInput = document.getElementById("message-input");
        const fileInput = document.getElementById("file-input");
        const sendBtn = document.getElementById("send-btn");
        
        const message = messageInput.value.trim();
        const file = fileInput.files[0];

        if (!currentSessionId) {
            showStatusMessage("Vui lòng chọn hoặc tạo một phiên chat trước.", true);
            return;
        }
        if (!message && !file) {
            return; // Không có gì để gửi
        }

        sendBtn.disabled = true; // Vô hiệu hóa nút gửi để tránh double-click
        sendBtn.textContent = "Đang gửi...";

        try {
            // 1. Hiển thị tin nhắn của người dùng ngay lập tức
            let userMessageContent = message;
            if (file) {
                userMessageContent += `<br><small class="file-info">📎 Đang gửi file: ${file.name}</small>`;
            }
            addMessage(userMessageContent, "user");

            // 2. Xử lý upload file nếu có
            if (file) {
                await uploadFile(file);
                // Sau khi upload thành công, có thể gửi một tin nhắn hệ thống hoặc cập nhật tin nhắn cũ
            }

            // 3. Gửi tin nhắn văn bản (nếu có) đến backend để nhận phản hồi
            if (message) {
                const res = await apiCall('/chat/', 'POST', {
                    session_id: currentSessionId,
                    question: message
                }, true);

                const reply = res.answer || "Không có phản hồi.";
                addMessage(reply, "bot");
            }

        } catch (error) {
            // Bắt lỗi từ cả uploadFile và apiCall
            console.error("❌ Lỗi khi gửi tin nhắn hoặc file:", error);
            const fallback = `⚠️ Gửi thất bại: ${error.message}`;
            addMessage(fallback, "bot"); // Hiển thị lỗi trong khung chat
        } finally {
            // 4. Dọn dẹp và kích hoạt lại form
            messageInput.value = "";
            fileInput.value = "";
            sendBtn.disabled = false;
            sendBtn.textContent = "Gửi";
        }
    });


    // --- INITIAL LOAD ---

    window.addEventListener('load', () => {
        const storedToken = localStorage.getItem('authToken');
        if (storedToken) {
            authToken = storedToken;
            initializeChatView();
        }
    });
});
