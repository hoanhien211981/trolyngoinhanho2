// server.js

// --- 1. Import các thư viện cần thiết ---
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config(); // Tải các biến môi trường từ file .env

// --- 2. Khởi tạo ứng dụng Express ---
const app = express();
const PORT = process.env.PORT || 3001; // Sử dụng cổng do Render cung cấp hoặc 3001 khi chạy local

// --- 3. Cấu hình Middleware ---
// Kích hoạt CORS để cho phép frontend gọi tới
// Trong môi trường production, bạn nên chỉ định rõ domain của frontend
app.use(cors()); 
// Cho phép server đọc dữ liệu JSON từ request body
app.use(express.json({ limit: '10mb' }));

// --- ROUTE CHO HEALTH CHECK ---
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is up and running" });
});

// --- 4. Lấy API Key từ biến môi trường ---
// Đây là cách an toàn để quản lý API Key.
// Chúng ta sẽ thiết lập biến này trên Render sau.
const XAI_API_KEY = process.env.XAI_API_KEY;

// --- 5. Định nghĩa một Route (API Endpoint) ---
// Frontend sẽ gửi yêu cầu POST đến '/api/chat'
app.post('/api/chat', async (req, res) => {
    if (!XAI_API_KEY) {
        return res.status(500).json({
            error: 'XAI_API_KEY chưa được cấu hình trên server.'
        });
    }

    try {
        const { question, context } = req.body;

        if (!question || !context) {
            return res.status(400).json({
                error: 'Vui lòng cung cấp đủ "question" và "context".'
            });
        }

        const prompt = `Bạn là một trợ lý AI chuyên gia về tra cứu thông tin. Nhiệm vụ của bạn là tìm câu trả lời cho câu hỏi của người dùng CHỈ từ trong VĂN BẢN NGUỒN được cung cấp.

**QUY TẮC BẮT BUỘC PHẢI TUÂN THEO:**

1.  **PHẠM VI TRẢ LỜI:** Chỉ được phép sử dụng thông tin có trong VĂN BẢN NGUỒN. TUYỆT ĐỐI KHÔNG được dùng kiến thức của riêng bạn hoặc thông tin từ bên ngoài.
2.  **TRƯỜNG HỢP KHÔNG TÌM THẤY:** Nếu bạn đọc kỹ VĂN BẢN NGUỒN và không tìm thấy câu trả lời cho câu hỏi, bạn BẮT BUỘC phải trả lời bằng một câu duy nhất, chính xác là: "Thông tin này không có trong tài liệu được cung cấp." Không giải thích, không xin lỗi, không thêm bất cứ điều gì khác.
3.  **TRÍCH DẪN TRỰC TIẾP:** Cố gắng trích dẫn câu trả lời càng gần với nguyên văn trong tài liệu càng tốt. Không suy diễn, không tóm tắt nếu không cần thiết.

--- VĂN BẢN NGUỒN ---
${context}
--- KẾT THÚC VĂN BẢN NGUỒN ---

Dựa vào các quy tắc và ví dụ trên, hãy trả lời câu hỏi sau:

Câu hỏi của người dùng: ${question}

Câu trả lời của bạn:`;

        const response = await axios.post('https://api.xai.com/v1/chat/completions', {
            model: "grok-1",
            messages: [
                { role: "user", content: prompt }
            ],
            stream: false
        }, {
            headers: {
                'Authorization': `Bearer ${XAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const answer = response.data.choices?.[0]?.message?.content || "Không có phản hồi hợp lệ từ xAI.";
        res.json({ answer });

    } catch (error) {
        console.error('Lỗi khi gọi xAI API:', error.response ? error.response.data : error.message);
        res.status(500).json({
            error: 'Đã có lỗi xảy ra phía server khi xử lý yêu cầu của bạn.'
        });
    }
});

// --- 6. Khởi động máy chủ ---
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
