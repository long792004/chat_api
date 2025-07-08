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
    // ... (các element khác của chat view) ...
    
    // State
    let authToken = null;
    const API_URL = "http://127.0.0.1:8000"; // Đặt URL gốc ở đây

    // --- TOGGLE FORMS ---
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

    // --- API CALL HELPER ---
    async function apiCall(endpoint, method , body, requiresAuth = false) {
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
            throw new Error(data.detail || `HTTP Error ${response.status}`);
        }
        return data;
    }
    



    // --- EVENT HANDLERS ---
    
    // Xử lý Đăng ký
    registerFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const fullName = document.getElementById('register-name').value;
        const password  = document.getElementById('register-password').value;
        
        try {
            // Note: Your backend's /v1/users/ endpoint should be updated to accept
            // only 'email' and 'full_name' for registration, and return the 'id'.
            const userData = await apiCall('/auth/register/', 'POST', { email, password ,full_name: fullName });
            alert(`Đăng ký thành công! User ID của bạn là: ${userData.id}. Vui lòng đăng nhập.`);
            showLoginLink.click(); // Tự chuyển qua form đăng nhập
        } catch (error) {
        console.error('Chi tiết lỗi:', error);
        alert(`Lỗi đăng ký: ${error}`);
         }
    });

    // Xử lý Đăng nhập
    loginFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            // IMPORTANT: This assumes your /v1/token endpoint on the backend
            // is updated to accept a JSON body with a 'user_id' field for authentication,
            // and returns the access_token.
            // If your backend still expects form data with 'username' and 'password',
            // you'll need to adapt the backend or revert this part of the frontend.
            const data = await apiCall('/auth/login', 'POST', {
                            email: email,
                            password: password });
            
            authToken = data.access_token;
            localStorage.setItem('authToken', authToken);
            // Chuyển sang giao diện chat
            authContainer.classList.add('hidden');
            chatContainer.classList.remove('hidden');
            // Bắt đầu tải các session của user...
            const userInfo = await apiCall('/auth/me', 'GET', null, true);
            await loadSessionsFromServer();
            console.log('User info:', userInfo);
            document.getElementById('user-name-display').innerText =
            `Xin chào, ${userInfo.full_name || userInfo.email}`;
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            startRefreshTokenLoop();


        } catch (error) {
            if (error.detail) {
                alert(`Lỗi đăng nhập: ${error.detail}`);
            } else {
                alert(` ${error}`);
            }
        }
    });
    

    //  Tạo phần tử div chứa tin nhắn.
    function addMessage(text, sender) {
        const chatLog = document.getElementById("chat-log");
        const msgDiv = document.createElement("div");
        msgDiv.classList.add("message-container", sender === "user" ? "user-message" : "bot-message");
        msgDiv.textContent = text;
        chatLog.appendChild(msgDiv);
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    let sessions = []; // Mảng chứa các phiên chat
    let currentSessionId = null;

    // Tạo phiên mới: 
    document.getElementById("new-session-btn").addEventListener("click", async () => {
        try {
                
            const sessionName = `Phiên ${sessions.length + 1}`;

            const storedUser = localStorage.getItem('userInfo');
            if (!storedUser) {
                throw new Error("Không tìm thấy thông tin người dùng.");
            }
            const userInfo = JSON.parse(storedUser);

            console.log("📦 Gửi tạo session:", {
                user_id: userInfo.id,
                session_title: sessionName
            });

            const createdSession = await apiCall('/chat/sessions/', 'POST', {
                "user_id": userInfo.id, 
                "session_title": sessionName}, true);
            const id = createdSession.id;
            sessions.push({ id, name: sessionName });
            currentSessionId = id;
            renderSessionList();
            const log = document.getElementById("chat-log");
            document.getElementById("session-info").textContent = `Phiên chat: ${id}`;
            log.innerHTML = "";
        } catch (err) {
            console.error("Lỗi khi tạo phiên mới hoặc xác thực user:", err);
            alert("Bạn cần đăng nhập lại!");
            logout(); // nếu bạn có hàm logout()
        
        }
       
    });

    // Hiển thị danh sách phiên 
    function renderSessionList() {
        // Làm sạch danh sách cũ để render lại từ đầu.
        const list = document.getElementById("session-list");
        list.innerHTML = "";

        //Hiển thị tên phiên.
        // Khi click vào tên, sẽ chuyển sang phiên đó.
        sessions.slice().reverse().forEach((session, index) => {
            const li = document.createElement("li");

            const nameSpan = document.createElement("span");
            nameSpan.textContent = session.name || `Phiên ${index + 1}`;
            nameSpan.classList.add("session-name");
            nameSpan.onclick = () => {
                currentSessionId = session.id;
                loadSession(session.id);
            };
            // Nút đổi tên và nút xóa mỗi phiên.
            const renameBtn = document.createElement("button");
            renameBtn.textContent = "✏️";
            renameBtn.classList.add("rename-btn");
            renameBtn.onclick = () => renameSession(session.id);

            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "X";
            deleteBtn.classList.add("delete-btn");
            deleteBtn.onclick = () => deleteSession(session.id);

            li.appendChild(nameSpan);
            li.appendChild(renameBtn);
            li.appendChild(deleteBtn);

            list.appendChild(li);
        });
    }
    // Đổi tên phiên
    async function renameSession(id) {
        const session = sessions.find(s => s.id === id);
        const newName = prompt("Nhập tên mới cho phiên:", session.name || "");
        
        if (newName !== null && newName.trim() !== "") {
            try {
                const updatedSession = await apiCall(`/chat/sessions/${id}`, 'PUT', {
                    session_title: newName.trim()
                }, true);

                // Cập nhật lại dữ liệu session local
                session.name = updatedSession.session_title;
                renderSessionList();

            } catch (err) {
                console.error("❌ Lỗi cập nhật session:", err);
                alert("Không thể đổi tên phiên chat. Vui lòng thử lại.");
            }
        }
    }
    // Xóa phiên 
    async function deleteSession(id) {
        
        if (!confirm("Bạn có chắc muốn xóa phiên chat này không?")) return;
        try {            
            await apiCall(`/chat/sessions/${id}`, 'DELETE', null, true);
            sessions = sessions.filter(s => s.id !== id);                     

        } catch (err) {
            console.error("❌ Lỗi cập nhật session:", err);
            alert("Không thể xóa phiên chat. Vui lòng thử lại.");
        }
        if (currentSessionId === id) {
                currentSessionId = null;
                document.getElementById("chat-log").innerHTML = "";
                document.getElementById("session-info").textContent = "Chưa có phiên nào được chọn";
            }
        
        renderSessionList();
    }
    //Load lại
    async function loadSessionsFromServer() {
        try {
            const sessionData = await apiCall('/chat/sessions/', 'GET', null, true);
            sessions = sessionData.map(s => ({
                id: s.id,
                name: s.session_title || `Phiên bắt đầu lúc ${new Date(s.started_at).toLocaleString()}`
            }));
            renderSessionList();

            if (sessions.length > 0) {
                currentSessionId = sessions[0].id;
                loadSession(currentSessionId);
            } else {
                document.getElementById("session-info").textContent = "Chưa có phiên nào được chọn";
            }
        } catch (err) {
            console.error("Không thể tải danh sách session:", err);
            alert("Lỗi khi tải phiên chat.");
        }
    }


    // Tải lại nội dung phiên chat
    async function loadSession(id) {
        // const session = sessions.find(s => s.id === id);
        try{
            const sessionData = await apiCall(`/chat/sessions/${id}/conversation`, 'GET', null, true)     

            const log = document.getElementById("chat-log");
            document.getElementById("session-info").textContent = `Phiên chat: ${id}`;
            log.innerHTML = "";
            const messages = [];

            sessionData.conversation.forEach(item => {
                // Tin nhắn của user
                messages.push({ text: item.question, sender: "user" });
                // Mỗi câu trả lời từ bot
                item.answers.forEach(ans => {
                    messages.push({ text: ans.content, sender: "bot" });
                });
            });
            // Gọi addMessage cho từng dòng
            messages.forEach(msg => addMessage(msg.text, msg.sender));
        } catch (err){
            console.error("❌ Lỗi:", err);
            alert("Vui lòng thử lại.");
        }
    }

    // Xử lý gửi tin nhắn
    document.getElementById("chat-form").addEventListener("submit", async function(e) {
        e.preventDefault();
        const input = document.getElementById("message-input");
        const fileInput = document.getElementById("file-input");
        const file = fileInput.files[0]
        const message = input.value.trim();

        if (!message && !file) return;
        if (!message || !currentSessionId) return;

        // const session = sessions.find(s => s.id === currentSessionId);
        // session.messages.push({ text: message, sender: "user" });
     
        // Hiển thị message và file nếu có
        if (message && file) {
            addMessage(`${message}<br><br>📎 Đã gửi file: ${file.name}`, "user");
            console.log("📁 File đã được xử lý:", file.name);
            // 
            await uploadFile(file);
        } else {
            addMessage(message, "user");
        }

        // setTimeout(() => {
        //     const reply = "Đây là phản hồi từ chatbot.";
        //     session.messages.push({ text: reply, sender: "bot" });
        //     addMessage(reply, "bot");
        // }, 500);

        input.value = "";
        fileInput.value = "";
        try {
            const res = await apiCall('/chat/', 'POST', {
                session_id: currentSessionId,
                question: message
            }, true); // gửi kèm token

            const reply = res.answer || "Không có phản hồi.";
            // session.messages.push({ text: reply, sender: "bot" });
            addMessage(reply, "bot");
        } catch (error) {
            console.error("❌ Lỗi gửi:", error);
            const fallback = "⚠️ Gửi thất bại. Vui lòng thử lại.";
            // session.messages.push({ text: fallback, sender: "bot" });
            addMessage(fallback, "bot");
        }
    });

    
    // thêm giao diện chat
    function addMessage(text, sender) {
        const chatLog = document.getElementById("chat-log");
        const msgDiv = document.createElement("div");
        msgDiv.classList.add("message-container", sender === "user" ? "user-message" : "bot-message");
        msgDiv.innerHTML  = text;
        chatLog.appendChild(msgDiv);
        chatLog.scrollTop = chatLog.scrollHeight;
    }
    

    // log file đang up
    document.getElementById("file-input").addEventListener("change", async (e) => {
        e.preventDefault(); // Ngăn hành vi mặc định
        e.stopPropagation(); // Ngăn lan truyền sự kiện
    const file = e.target.files[0];
    if (file) {
        console.log("Đã chọn file:", file.name);
        // TODO: Gửi file đến server hoặc hiển thị tên file
        //append tên file vào chat-log nếu muốn
    }
    });
    // Xử ý file
    async function uploadFile(file) {
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("http://127.0.0.1:8000/file/upload-file/", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${authToken}`
                },
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
            // addMessage(`📎 Đã tải lên file: ${result.file_info.filename}`, "user");

            // if (result.file_info.extracted_content) {
            //     addMessage(`📄 Nội dung trích xuất:\n${result.file_info.extracted_content}`, "bot");
            // }

        } catch (error) {
            console.error("❌ Lỗi upload:", error);
            alert(`Lỗi upload file: ${error.message}`);
        }
        

    }
    //----------------------------------------------------------------------------------------------------------------------

    async function refreshToken() {
        try {
            const data = await apiCall('/auth/refresh', 'POST', null, true);
            authToken = data.access_token;
            console.log("✅ Token mới:", authToken);
        } catch (err) {
            console.error("❌ Lỗi refresh token:", err);
            alert("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
            authContainer.classList.remove('hidden');
            chatContainer.classList.add('hidden');
        }
    }

    function startRefreshTokenLoop() {
        // Mỗi 10 phút làm mới token 1 lần
        setInterval(refreshToken, 10 * 60 * 1000);
    }

    // Khi load trang
    window.addEventListener('DOMContentLoaded', async () => {
        const storedToken = localStorage.getItem('authToken');
        if (storedToken) {
            authToken = storedToken;

            try {
                const userInfo = await apiCall('/auth/me', 'GET', null, true);
                await loadSessionsFromServer();
                
                // Hiển thị thông tin user
                const nameDisplay = document.getElementById('user-name-display');
                if (nameDisplay) {
                    nameDisplay.innerText = `Xin chào, ${userInfo.full_name }`;
                }

                // Hiện giao diện chat
                authContainer.classList.add('hidden');
                chatContainer.classList.remove('hidden');

                startRefreshTokenLoop(); // tiếp tục refresh token định kỳ

            } catch (err) {
                console.error('Token không hợp lệ hoặc hết hạn:', err);
                localStorage.removeItem('authToken');
            }
        }
    });

    function logout() {
        authToken = null;
        localStorage.removeItem('authToken');
        authContainer.classList.remove('hidden');
        chatContainer.classList.add('hidden');
    }


});