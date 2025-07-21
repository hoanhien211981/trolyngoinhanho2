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
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// --- 6. Route xử lý chat ---
app.post('/api/chat', async (req, res) => {
    if (!OPENROUTER_API_KEY) {
        return res.status(500).json({ error: 'OPENROUTER_API_KEY chưa được cấu hình trên server.' });
    }

    try {
        const { question, context } = req.body;

        if (!question || !context) {
            return res.status(400).json({ error: 'Vui lòng cung cấp đủ "question" và "context".' });
        }

        const systemPrompt = `
Bạn là một trợ lý AI chuyên gia về tra cứu thông tin. Nhiệm vụ của bạn là tìm câu trả lời cho câu hỏi của người dùng CHỈ từ trong VĂN BẢN NGUỒN được cung cấp.

**QUY TẮC BẮT BUỘC PHẢI TUÂN THEO:**
1. CHỈ dùng thông tin trong VĂN BẢN NGUỒN. KHÔNG dùng kiến thức bên ngoài.
2. Nếu không tìm thấy thông tin, trả lời đúng một câu: "Thông tin này không có trong tài liệu được cung cấp."
3. Trích dẫn nguyên văn nếu có thể, không suy diễn.

--- VĂN BẢN NGUỒN ---
${context}
--- HẾT VĂN BẢN NGUỒN ---
        `;

        const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
			const payload = {
				model: "nousresearch/nous-hermes-2-mixtral",
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: question }
				],
				temperature: 0.0,
				max_tokens: 2048
			};
			const response = await axios.post(apiUrl, payload, {
				timeout: 20000, // Thêm timeout 20 giây
				headers: {
					'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
					'Content-Type': 'application/json',
					'HTTP-Referer': 'http://localhost:3000', // hoặc domain thật của bạn
					'X-Title': 'doc-ai-chat'
				}
			});

        const answer = response.data.choices[0]?.message?.content || "Không nhận được câu trả lời hợp lệ từ AI.";
        res.json({ answer });

    } catch (error) {
        console.error('Lỗi khi gọi OpenRouter API:', error.response?.data || error.message);
        res.status(500).json({ error: 'Đã có lỗi xảy ra khi gọi mô hình AI.' });
    }
});

// --- 6. Khởi động máy chủ ---
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
