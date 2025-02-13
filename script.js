import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// Initialize API clients
const apiKey = "AIzaSyA6nRUwDozn7hYsRbqGXAtWwm1QU09Umwk";
const genAI = new GoogleGenerativeAI(apiKey);

const generationConfig = {
  temperature: 0.5,
  topP: 0.8,
  topK: 5,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

const systemInstructionYouLearn = `
Bạn là YouLearn, một AI dạy học. Dựa trên thông tin được cung cấp, hãy tạo ra một phản hồi hữu ích và toàn diện nhất có thể.  Hãy đảm bảo câu trả lời chính xác, đầy đủ thông tin và được trình bày rõ ràng.  Vui lòng sử dụng ngôn ngữ lịch sự và chuyên nghiệp, tránh ngôn ngữ không phù hợp. Sử dụng Markdown để định dạng văn bản để tăng cường khả năng đọc và làm rõ cấu trúc.  Cụ thể hơn, hãy:

* **Ưu tiên tính chính xác và rõ ràng:**  Xác minh thông tin khi có thể và trình bày một cách dễ hiểu.
* **Cung cấp ngữ cảnh và giải thích:**  Đừng chỉ đưa ra câu trả lời; hãy giải thích lý do tại sao đó là câu trả lời đúng và cung cấp ngữ cảnh liên quan.
* **Sử dụng ví dụ minh họa:**  Khi thích hợp, hãy sử dụng ví dụ để minh họa các khái niệm và làm cho chúng dễ tiếp cận hơn.
* **Cấu trúc câu trả lời của bạn:** Sử dụng các tiêu đề, danh sách, bảng và các yếu tố định dạng khác để tổ chức thông tin và cải thiện khả năng đọc.
* **Duy trì giọng điệu dạy học:**  Hãy kiên nhẫn, khuyến khích và tập trung vào việc giúp người học hiểu tài liệu.
* **Chỉ trả lời dựa trên thông tin được cung cấp:**  Nếu không có đủ thông tin để trả lời đầy đủ, hãy nêu rõ điều đó và cho biết thông tin nào còn thiếu.  Tránh suy đoán hoặc bịa đặt thông tin.
* **Đề xuất các nguồn bổ sung (nếu có):**  Nếu có các nguồn bổ sung liên quan, hãy cung cấp các liên kết hoặc tài liệu tham khảo để người học có thể tìm hiểu thêm.

Bằng cách làm theo các hướng dẫn này, bạn có thể cung cấp trải nghiệm học tập hiệu quả và bổ ích.  
`;

const systemInstructionSummary = `
# Hãy tạo một bản tóm tắt chi tiết và toàn diện nhất có thể về các sự kiện, thông tin và kiến thức được trình bày trong video. Bản tóm tắt này KHÔNG PHẢI là một danh sách liệt kê tất cả các sự kiện, mà là một bản tóm tắt có cấu trúc, nhóm các sự kiện liên quan lại với nhau thành các chủ đề lớn.
# Nếu đang tạo mục lục cho video, hãy đảm bảo timestamp và nội dung phải trùng khớp với phần <transcript> đã được cung cấp.
`;

const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash", 
  tools: [{ googleSearch: {} }],
  generationConfig,
  systemInstruction: systemInstructionYouLearn
});

const summaryModel = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash", 
  tools: [{ googleSearch: {} }],
  generationConfig,
  systemInstruction: systemInstructionSummary 
});

let player;
let chatSession;
let chatHistory = []; // Lưu trữ lịch sử chat

// Biến toàn cục cho flashcards
let currentCardIndex = 0;
let flashcards = [];

// Khai báo biến toàn cục để lưu trữ dữ liệu transcript
let fullTextForChapters = '';
let summaryPrompt = '';

// Khi DOM đã sẵn sàng
document.addEventListener("DOMContentLoaded", () => {
  // Button "New"
  const newBtn = document.querySelector(".new");
  newBtn && newBtn.addEventListener("click", () => window.location.href = "index.html");

  // Sidebar, theme toggle, tab switching, và split panel
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const themeToggle = document.getElementById("themeToggle");

  // Thiết lập theme và trạng thái sidebar từ localStorage
  document.body.classList.toggle("dark", localStorage.getItem("theme") === "dark");
  const collapsed = localStorage.getItem("sidebarCollapsed") === "true";
  sidebar?.classList.toggle("collapsed", collapsed);
  updateSidebarIcon(collapsed);

  sidebarToggle?.addEventListener("click", () => {
    const isCollapsed = sidebar.classList.toggle("collapsed");
    localStorage.setItem("sidebarCollapsed", isCollapsed);
    updateSidebarIcon(isCollapsed);
  });

  themeToggle?.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });

  // Cấu hình chuyển đổi tab cho các section
  setupTabs(".transcript-chapters .tab-btn", ".transcript-chapters .tab-content");
  setupTabs(".ai-section .tab-btn", ".ai-section .tab-content");

  function setupTabs(btnSelector, contentSelector) {
    const buttons = document.querySelectorAll(btnSelector);
    const contents = document.querySelectorAll(contentSelector);
    buttons.forEach(button => {
      button.addEventListener("click", () => {
        buttons.forEach(btn => btn.classList.remove("active"));
        contents.forEach(c => c.classList.remove("active"));
        button.classList.add("active");
        document.getElementById(`${button.dataset.tab}Content`)?.classList.add("active");
      });
    });
  }

  function updateSidebarIcon(isCollapsed) {
    sidebarToggle.innerHTML = isCollapsed
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
           <path d="m9 18 6-6-6-6"/>
         </svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
           <path d="m15 18-6-6 6-6"/>
         </svg>`;
  }

  // Cấu hình Split (yêu cầu thư viện Split được import)
  if (typeof Split === "function") {
    Split(["#leftPanel", "#rightPanel"], {
      sizes: [50, 50],
      minSize: [600, 350],
      gutterSize: 1,
      cursor: "col-resize"
    });
  }

  // Cấu hình sự kiện cho chat UI
  const input = document.getElementById("input");
  const sendBtn = document.getElementById("send");
  sendBtn && sendBtn.addEventListener("click", sendMessage);
  input && input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // Setup regenerate buttons
  setupRegenerateButtons();
  
  // Khởi tạo container flashcard
  initFlashcardContainer();
});

// Hàm khởi tạo container flashcard
function initFlashcardContainer() {
  const flashcardContent = document.getElementById('flashcardContent');
  if (!flashcardContent) return;

  const container = document.createElement('div');
  container.id = 'flashcardContainer';
  container.innerHTML = `
    <div id="flashcardControls">
      <button id="prevCard" class="btn btn-ghost" aria-label="Previous card">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>
      <span id="cardCounter">0/0</span>
      <button id="nextCard" class="btn btn-ghost" aria-label="Next card">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </button>
    </div>
    <div class="flashcard">
      <div class="flashcard-inner">
        <div class="flashcard-front">
          <div class="question">
            <p><br><br><br>Nhấn vào nút "Tạo Flashcard" để bắt đầu<br><br><br></p>
          </div>
          <button class="btn btn-ghost hint-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <path d="M12 17h.01"/>
            </svg>
            Gợi ý
          </button>
          <div class="hint"></div>
        </div>
        <div class="flashcard-back">
          <div class="answer"></div>
          <button class="btn btn-ghost explanation-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            Giải thích
          </button>
          <div class="explanation">
            <div class="source"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  flashcardContent.appendChild(container);
}

function setupRegenerateButtons() {
  const regenerateButtons = document.querySelectorAll('.regenerate-btn');
  regenerateButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.classList.contains('loading')) return;
      
      // Add cosmic generation effect
      btn.classList.add('loading', 'cosmic-effect');
      
      try {
        if (btn.classList.contains('chapters-btn')) {
          if (!fullTextForChapters) {
            throw new Error('Transcript data not loaded yet');
          }
          const chaptersData = await generateChapters(fullTextForChapters);
          if (chaptersData && chaptersData.chapters) {
            renderChapters(chaptersData.chapters);
          }
        } else if (btn.classList.contains('flashcard-btn')) {
          if (!fullTextForChapters) {
            throw new Error('Transcript data not loaded yet');
          }
          const flashcardsData = await generateFlashcards(fullTextForChapters);
          if (flashcardsData && flashcardsData.flashcards) {
            initFlashcards(flashcardsData.flashcards);
          }
        } else if (btn.classList.contains('summary-btn')) {
          if (!summaryPrompt) {
            throw new Error('Summary prompt not generated yet');
          }
          const summaryResult = await summaryModel.generateContent(summaryPrompt);
          const summaryResponse = await summaryResult.response;
          let summaryText = await summaryResponse.text();
          summaryText = summaryText.replace(/\n{3,}/g, "\n\n").trim();
          document.getElementById('summaryContent').innerHTML = marked.parse(summaryText);
        }
        // After regeneration completes, hide the button
        btn.style.display = 'none';
      } catch (error) {
        console.error('Error regenerating content:', error);
        alert(error.message || 'Đã xảy ra lỗi khi tạo nội dung');
      } finally {
        // Remove cosmic generation effect after completion
        btn.classList.remove('loading', 'cosmic-effect');
      }
    });
  });
}

// Khởi tạo YouTube API
function initYouTubeAPI() {
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
}

window.onYouTubeIframeAPIReady = () => {
  const videoId = localStorage.getItem("videoId");
  if (videoId) {
    player = new YT.Player("youtube-player", {
      videoId,
      events: { onReady }
    });
  }
};

function onReady() {
  console.log("Player is ready");
}

// Hàm tạo chapters (mục lục) sử dụng AI
async function generateChapters(transcript) {
  const chapterPrompt = `
Hãy tạo ra các chapter (mục lục) cho video này dựa trên transcript. Trả về dữ liệu dưới dạng JSON với định dạng sau:
{
  "chapters": [
    {
      "title": "Tiêu đề của mục",
      "summary": "Tóm tắt ngắn gọn nội dung của mục này",
      "start": "Thời điểm bắt đầu (số giây)",
      "end": "Thời điểm kết thúc (số giây)"
    }
  ]
}

Lưu ý:
- Chỉ trả về JSON, không kèm markdown
- Mỗi chapter nên có độ dài hợp lý (tối thiểu 30 giây)
- Tóm tắt nên ngắn gọn, súc tích
- Thời gian start/end phải là số (không phải chuỗi) và phải chính xác với cột mốc tối đa của video.
- Ngôn ngữ: Tiếng Việt

Transcript:
<transcript>
${transcript}
</transcript>
`;

  try {
    const result = await summaryModel.generateContent(chapterPrompt);
    const response = await result.response;
    const text = await response.text();
    // Lấy JSON từ kết quả (loại bỏ markdown nếu có)
    const jsonMatch = text.match(/\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Error generating chapters:", error);
    return null;
  }
}

// Hàm render chapters lên giao diện
function renderChapters(chapters) {
  const chapterList = document.querySelector(".chapter-list");
  if (!chapterList) return;
  chapterList.innerHTML = chapters
    .map(
      (chapter) => `
    <div class="chapter-item" data-time="${chapter.start}">
      <div class="chapter-header">
        <span class="timestamp">${formatTime(chapter.start)}</span> - 
        <span class="timestamp">${formatTime(chapter.end)}</span>
      </div>
      <div class="chapter-content">
        <h3>${chapter.title}</h3>
        <p>${chapter.summary}</p>
      </div>
    </div>
  `
    )
    .join("");

  // Thêm sự kiện click cho từng chapter
  chapterList.querySelectorAll(".chapter-item").forEach((item) => {
    item.addEventListener("click", () => {
      const time = parseFloat(item.dataset.time);
      if (player && typeof player.seekTo === "function") {
        player.seekTo(time, true);
        player.playVideo();
      }
    });
  });
}

// Ước tính số token (giả sử trung bình 4 ký tự = 1 token)
function estimateTokenCount(text) {
  return Math.ceil(text.length / 4);
}

// Giản lược transcript nếu quá dài
function simplifyTranscript(transcript, maxTokens = 25000) {
  const combinedText = transcript.map((item) => item.text).join(" ");
  const estimatedTokens = estimateTokenCount(combinedText);
  if (estimatedTokens <= maxTokens) return transcript;

  const reductionFactor = Math.ceil(estimatedTokens / maxTokens);
  const importantMarkers = [
    "đầu tiên",
    "thứ nhất",
    "thứ hai",
    "tiếp theo",
    "cuối cùng",
    "tóm lại",
    "kết luận",
    "tổng kết",
    "ví dụ",
    "điều quan trọng",
    "lưu ý",
    "chú ý",
    "bây giờ",
    "vậy là",
  ];

  return transcript.filter((item, index) => {
    if (index === 0 || index === transcript.length - 1) return true;
    if (importantMarkers.some((marker) => item.text.toLowerCase().includes(marker)))
      return true;
    return index % reductionFactor === 0;
  });
}

// Hàm load video, transcript, tạo chapters và tóm tắt
async function loadVideo() {
  const videoId = localStorage.getItem("videoId");
  if (!videoId) {
    alert("URL không hợp lệ. Vui lòng nhập URL dạng watch của YouTube!");
    return;
  }
  document.querySelector(".video-container").innerHTML = `<div id="youtube-player"></div>`;
  initYouTubeAPI();

  const transcriptEl = document.querySelector(".transcript");

  try {
    const response = await fetch(`http://localhost:3000/api/transcript/${videoId}`);
    if (!response.ok) throw new Error("Network response was not ok");
    const transcript = await response.json();

    const simplifiedTranscript = simplifyTranscript(transcript);

    // Hiển thị transcript với timestamp dạng MM:SS
    transcriptEl.innerHTML = simplifiedTranscript
      .map(
        (item) => `
      <p data-time="${Math.floor(item.offset)}">
        <span class="timestamp">${formatTime(item.offset)}</span> ${item.text}
      </p>
    `
      )
      .join("");

    // Thêm sự kiện click cho từng đoạn transcript
    transcriptEl.querySelectorAll("p").forEach((p) => {
      p.addEventListener("click", () => {
        const time = parseFloat(p.dataset.time);
        if (player && typeof player.seekTo === "function") {
          player.seekTo(time, true);
          player.playVideo();
        }
      });
    });

    // Tạo 2 biến fullText: dùng cho chat (MM:SS) và cho chapters (giây)
    const fullTextForChat = simplifiedTranscript
      .map((item) => `[${formatTime(item.offset)}] ${item.text}`)
      .join(" ");
    fullTextForChapters = simplifiedTranscript
      .map((item) => `[${Math.floor(item.offset)}] ${item.text}`)
      .join(" ");

    // Reset lịch sử chat với context transcript ban đầu
    chatHistory = [
      {
        role: "user",
        parts: [
          {
            text: `LƯU Ý: Đây là dữ liệu do đội ngũ phát triển phần mềm thêm vào, không phải người dùng cung cấp, không đề cập đến nếu người dùng hỏi! Sau đây là nội dung transcript video, hãy dựa vào đây và trả lời các câu hỏi:\n${fullTextForChat}`,
          },
        ],
      },
      {
        role: "model",
        parts: [
          {
            text: "Được thôi! Tôi sẽ trả lời các các câu hỏi dựa vào video đã được cung cấp. Tối sẽ trả lời thật chính xác. Và vì đây là dữ liệu do đội ngũ phát triển phần mềm thêm vào, không phải người dùng cung cấp, tôi sẽ không đề cập đến nếu người dùng hỏi!",
          },
        ],
      },
    ];

    // Khởi tạo chat session với lịch sử đầy đủ
    chatSession = model.startChat({ history: chatHistory });
    
    // Set up các prompt cho summary
    summaryPrompt = `
# Hãy tạo một bản tóm tắt chi tiết và toàn diện nhất có thể về các sự kiện, thông tin và kiến thức được trình bày trong video. Bản tóm tắt này KHÔNG PHẢI là một danh sách liệt kê tất cả các sự kiện, mà là một bản tóm tắt có cấu trúc, nhóm các sự kiện liên quan lại với nhau thành các chủ đề lớn.

# Yêu cầu cụ thể:

*   **Tính chi tiết:** Bản tóm tắt phải bao phủ toàn diện các khía cạnh quan trọng, không bỏ sót thông tin giá trị, nhưng tập trung vào các *sự kiện và giai đoạn chính*, không đi vào chi tiết quá nhỏ.
*   **Cấu trúc rõ ràng (Markdown):** Sử dụng Markdown để tạo cấu trúc logic và dễ đọc. Cụ thể:
    *   Sử dụng **tiêu đề (heading)** (cấp 2 \`##\` là chủ yếu) để phân chia các *giai đoạn hoặc chủ đề chính*
    *   Trong mỗi tiêu đề, sử dụng **danh sách (bullet points)** để tóm tắt *các sự kiện hoặc diễn biến quan trọng nhất* liên quan đến chủ đề đó.  **Hạn chế nghiêm ngặt:**
        *   Mỗi bullet point nên tóm tắt *một cụm sự kiện/diễn biến liên quan*, không phải một sự kiện đơn lẻ.
        *   KHÔNG liệt kê quá nhiều sự kiện chi tiết.
        *   TUYỆT ĐỐI KHÔNG sử dụng danh sách lồng nhau.
        *   Giữ cho mỗi bullet point ngắn gọn (tối đa 1 câu).
    *   Sử dụng **in đậm (bold)** cho các thuật ngữ, khái niệm, hoặc kết luận quan trọng.
    *   Sử dụng **gạch nghiêng (italics)** cho các ví dụ ngắn, trích dẫn.
*   **Tính chính xác:** Tuyệt đối chính xác và trung thực với nội dung video.
*   **Tính khách quan:** Trình bày thông tin khách quan, không thêm ý kiến cá nhân.
*   **Độ dài phù hợp:** Đảm bảo tính chi tiết nhưng vẫn ngắn gọn, súc tích.
*   **KHÔNG có Timeline:** đối không hiển thị timeline.
*   **KHÔNG có Câu mở đầu:** Tuyệt đối không đưa ra các câu dẫn ở đầu
*   **Phong cách:** Sử dụng văn phong tóm tắt, súc tích, tập trung vào các điểm chính. Tránh lặp lại thông tin.
*   **Ngôn ngữ:** Tiếng Việt.

# Định dạng Output:
Markdown, tuân thủ chặt chẽ các yêu cầu trên.

# Transcript:
<transcript>
${fullTextForChat}
</transcript>      
`;

  } catch (error) {
    console.error("Error fetching transcript:", error);
    alert("Đã xảy ra lỗi khi tải transcript. Vui lòng thử lại.");
  }
}

// Hàm định dạng thời gian từ giây sang [DD:]HH:MM:SS
function formatTime(seconds) {
  const d = Math.floor(seconds / 86400),
    h = Math.floor((seconds % 86400) / 3600),
    m = Math.floor((seconds % 3600) / 60),
    s = Math.floor(seconds % 60);
  let result = "";
  if (d > 0) result += `${d}:`;
  if (h > 0 || d > 0) result += `${h.toString().padStart(2, "0")}:`;
  result += `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return result;
}

// Các hàm xử lý giao diện chat
function addMessage(text, isUser) {
  const messages = document.getElementById("messages");
  if (!messages) return;
  const div = document.createElement("div");
  div.className = isUser ? "message user" : "message bot";
  div.innerHTML = marked.parse(text);
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById("input");
  const text = input.value.trim();
  if (!text) return;

  // Thêm tin nhắn của người dùng
  chatHistory.push({ role: "user", parts: [{ text }] });
  addMessage(text, true);
  input.value = "";

  try {
    const response = await chatSession.sendMessageStream(text);
    let reply = "";
    for await (const chunk of response.stream) {
      reply += chunk.text().replace(/\n{3,}/g, "\n\n");
    }
    reply = reply.trim();
    chatHistory.push({ role: "model", parts: [{ text: reply }] });
    addMessage(reply, false);
    // Tạo lại chat session với lịch sử cập nhật để duy trì context
    chatSession = model.startChat({ history: chatHistory });
  } catch (error) {
    console.error("Error sending message:", error);
    addMessage("Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.", false);
  }
}

// Hàm tạo flashcards từ transcript sử dụng AI
async function generateFlashcards(transcript) {
  const flashcardPrompt = `
Hãy tạo ra các flashcard cho video này dựa trên transcript. Trả về dữ liệu dưới dạng JSON với định dạng sau:
{
  "flashcards": [
    {
      "question": "Câu hỏi",
      "hint": "Gợi ý để giúp người học nhớ câu trả lời",
      "answer": "Câu trả lời",
      "explanation": "Giải thích chi tiết tại sao đây là câu trả lời đúng",
      "timestamp": "Thời điểm trong video đề cập đến nội dung này (số giây)"
    }
  ]
}

Lưu ý:
- Chỉ trả về JSON, không kèm markdown
- Mỗi flashcard phải là một khái niệm hoặc ý tưởng quan trọng từ video
- Câu hỏi nên ngắn gọn, súc tích và rõ ràng
- Gợi ý nên giúp người học suy nghĩ về câu trả lời mà không tiết lộ hoàn toàn
- Giải thích phải đầy đủ và có ý nghĩa giáo dục
- Timestamp phải là số (không phải chuỗi)
- Ngôn ngữ: Tiếng Việt

Transcript:
<transcript>
${transcript}
</transcript>
`;

  try {
    const result = await summaryModel.generateContent(flashcardPrompt);
    const response = await result.response;
    const text = await response.text();
    const jsonMatch = text.match(/\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Error generating flashcards:", error);
    return null;
  }
}

// Hàm render và xử lý tương tác flashcard
function initFlashcards(cards) {
  flashcards = cards;
  currentCardIndex = 0;
  updateFlashcardDisplay();

  // Xử lý sự kiện click cho nút điều hướng
  document.getElementById('prevCard').addEventListener('click', () => {
    if (currentCardIndex > 0) {
      currentCardIndex--;
      updateFlashcardDisplay();
    }
  });

  document.getElementById('nextCard').addEventListener('click', () => {
    if (currentCardIndex < flashcards.length - 1) {
      currentCardIndex++;
      updateFlashcardDisplay();
    }
  });

  // Xử lý sự kiện lật flashcard
  const flashcard = document.querySelector('.flashcard');
  flashcard.addEventListener('click', (e) => {
    if (!e.target.matches('button')) {
      flashcard.classList.toggle('flipped');
    }
  });

  // Xử lý sự kiện hiển thị gợi ý và giải thích
  const hintBtn = document.querySelector('.hint-btn');
  const explanationBtn = document.querySelector('.explanation-btn');

  hintBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const hint = e.target.parentElement.querySelector('.hint');
    hint.style.display = hint.style.display === 'block' ? 'none' : 'block';
  });

  explanationBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const explanation = e.target.parentElement.querySelector('.explanation');
    explanation.style.display = explanation.style.display === 'block' ? 'none' : 'block';
  });
}

// Hàm cập nhật nội dung flashcard
function updateFlashcardDisplay() {
  if (flashcards.length === 0) return;

  const card = flashcards[currentCardIndex];
  document.querySelector('.question').textContent = card.question;
  document.querySelector('.hint').textContent = card.hint;
  document.querySelector('.answer').textContent = card.answer;
  document.querySelector('.explanation').innerHTML = `
    ${card.explanation}
    <div class="source">${formatTime(card.timestamp)}</div>
  `;

  // Reset trạng thái flashcard
  document.querySelector('.flashcard').classList.remove('flipped');
  document.querySelector('.hint').style.display = 'none';
  document.querySelector('.explanation').style.display = 'none';

  // Cập nhật bộ đếm thẻ
  document.getElementById('cardCounter').textContent = `${currentCardIndex + 1}/${flashcards.length}`;
}

loadVideo();