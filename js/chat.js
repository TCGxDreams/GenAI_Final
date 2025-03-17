// API endpoints
const API_ENDPOINT = "https://46b5-27-3-88-107.ngrok-free.app/generate";
const API_HISTORY_ENDPOINT = "https://67d3d8158bca322cc26b4105.mockapi.io/Chat";

// DOM elements
const chatBody = document.getElementById("chat-body");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const statusIndicator = document.getElementById("status-indicator");
const chatList = document.getElementById("chat-list");
const userNameElement = document.getElementById("user-name");
const userAvatarElement = document.getElementById("user-avatar");
const logoutBtn = document.getElementById("logout-btn");
const newChatBtn = document.getElementById("new-chat-btn");
const startNewChatBtn = document.getElementById("start-new-chat-btn");
const currentChatTitle = document.getElementById("current-chat-title");
const emptyState = document.getElementById("empty-state");
const chatInputArea = document.getElementById("chat-input");
const sidebarToggle = document.getElementById("sidebar-toggle");
const sidebar = document.getElementById("sidebar");
const searchInput = document.getElementById("search-input");
const exportButton = document.getElementById("export-button");
const clearButton = document.getElementById("clear-button");

// User information
let currentUser = {
  id: null,
  name: null
};

// Chat data
let userChats = []; // List of all user's chats
let currentChatId = null; // Currently selected chat ID
let chatHistory = []; // Current chat's history
let isProcessing = false; // Flag to prevent multiple message submissions

// Event listeners
document.addEventListener("DOMContentLoaded", function() {
  initializeApp();
});

// Initialize the application
async function initializeApp() {
  // Check authentication
  if (!checkAuthentication()) {
    return;
  }

  // Initialize UI and listeners
  setupEventListeners();
  
  // Add custom CSS for formatting
  addCustomCSS();
  
  // Load user's chats
  await loadUserChats();
  
  // Handle mobile sidebar
  setupMobileSidebar();
  
  // Initial UI update
  updateStatus("Đã kết nối");
}

// Add custom CSS for markdown formatting
function addCustomCSS() {
  const style = document.createElement('style');
  style.textContent = `
    .message-content {
      white-space: pre-wrap;
      word-break: break-word;
      display: inline-block;
      width: calc(100% - 40px);
    }
    
    .markdown-bold {
      font-weight: bold;
      display: inline;
    }
    
    .markdown-italic {
      font-style: italic;
      display: inline;
    }
    
    /* Fix for bullet points */
    .message-content ul {
      margin-top: 0;
      margin-bottom: 0;
      padding-left: 20px;
    }
  `;
  document.head.appendChild(style);
}

// Check if user is authenticated
function checkAuthentication() {
  const userData = localStorage.getItem("currentUser");
  if (!userData) {
    window.location.href = "login.html";
    return false;
  }
  
  try {
    const user = JSON.parse(userData);
    currentUser.id = user.id_Users;
    currentUser.name = user.name;
    
    // Update user info in sidebar
    if (userNameElement) {
      userNameElement.textContent = user.name;
    }
    
    if (userAvatarElement) {
      userAvatarElement.textContent = getInitials(user.name);
    }
    
    return true;
  } catch (e) {
    console.error("Error parsing user data:", e);
    window.location.href = "login.html";
    return false;
  }
}

// Get user initials for avatar
function getInitials(name) {
  if (!name) return "U";
  return name.split(" ").map(word => word[0]).join("").toUpperCase().substring(0, 2);
}

// Setup all event listeners
function setupEventListeners() {
  // Logout button
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function() {
      localStorage.removeItem("currentUser");
      localStorage.removeItem("chatUserId");
      window.location.href = "login.html";
    });
  }
  
  // New chat buttons
  if (newChatBtn) {
    newChatBtn.addEventListener("click", createNewChat);
  }
  
  if (startNewChatBtn) {
    startNewChatBtn.addEventListener("click", createNewChat);
  }
  
  // Send message
  if (sendButton) {
    sendButton.addEventListener("click", handleSendMessage);
  }
  
  // Enter key press
  if (messageInput) {
    messageInput.addEventListener("keypress", function(event) {
      if (event.key === "Enter") {
        handleSendMessage();
      }
    });
  }
  
  // Search functionality
  if (searchInput) {
    searchInput.addEventListener("input", function() {
      filterChats(this.value.toLowerCase());
    });
  }
  
  // Export button
  if (exportButton) {
    exportButton.addEventListener("click", exportChatAsJSON);
  }
  
  // Clear button
  if (clearButton) {
    clearButton.addEventListener("click", clearCurrentChat);
  }
  
  // Chat title rename (double click or right click)
  if (currentChatTitle) {
    currentChatTitle.addEventListener("dblclick", function(e) {
      e.preventDefault();
      if (currentChatId) {
        promptChatRename();
      }
    });
    
    currentChatTitle.addEventListener("contextmenu", function(e) {
      e.preventDefault();
      if (currentChatId) {
        promptChatRename();
      }
    });
  }
  
  // Window resize handler
  window.addEventListener("resize", handleResize);
}

// Handle window resize
function handleResize() {
  // Close sidebar on small screens when resizing
  if (window.innerWidth <= 768 && sidebar.classList.contains("open")) {
    sidebar.classList.remove("open");
  }
}

// Prompt for chat rename
function promptChatRename() {
  const newName = prompt("Nhập tên mới cho cuộc trò chuyện:", currentChatTitle.textContent);
  if (newName !== null && newName.trim() !== "") {
    renameChat(newName);
  }
}

// Setup mobile sidebar
function setupMobileSidebar() {
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", function() {
      sidebar.classList.toggle("open");
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener("click", function(e) {
      if (window.innerWidth <= 768 &&
          sidebar.classList.contains("open") &&
          !sidebar.contains(e.target) &&
          e.target !== sidebarToggle) {
        sidebar.classList.remove("open");
      }
    });
  }
}

// Filter chats based on search term
function filterChats(searchTerm) {
  if (searchTerm === "") {
    // Show all chats
    displayChatList(userChats);
    return;
  }
  
  // Filter chats
  const filteredChats = userChats.filter(chat => {
    // Search in chat name
    if (chat.Name && chat.Name.toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    // Search in chat messages
    try {
      const history = typeof chat.Chat_history === 'string' 
        ? JSON.parse(chat.Chat_history) 
        : (chat.Chat_history || []);
        
      return history.some(msg => 
        msg.content && msg.content.toLowerCase().includes(searchTerm)
      );
    } catch (e) {
      return false;
    }
  });
  
  displayChatList(filteredChats);
}

// Load all chats for the current user
async function loadUserChats() {
  try {
    updateStatus("Đang tải danh sách trò chuyện...");
    
    // Get all chats for this user
    const response = await fetch(`${API_HISTORY_ENDPOINT}?id_Users=${currentUser.id}`);
    const chats = await response.json();
    
    userChats = chats;
    
    // Clear the chat list
    chatList.innerHTML = "";
    
    if (chats.length === 0) {
      // No chats yet, show empty state
      showEmptyChatState();
    } else {
      // Display all chats in the sidebar
      displayChatList(chats);
      
      // Load most recent chat by default
      const latestChat = chats.sort((a, b) => {
        return new Date(b.Created_Date) - new Date(a.Created_Date);
      })[0];
      
      loadChat(latestChat.id);
    }
    
    updateStatus("Đã tải danh sách trò chuyện");
  } catch (error) {
    console.error("Error loading user chats:", error);
    updateStatus("Lỗi khi tải danh sách trò chuyện");
    showEmptyChatState();
  }
}

// Display all chats in the sidebar
function displayChatList(chats) {
  // Sort chats by creation date (newest first)
  const sortedChats = [...chats].sort((a, b) => 
    new Date(b.Created_Date) - new Date(a.Created_Date)
  );
  
  // Clear the chat list
  chatList.innerHTML = "";
  
  // Add each chat to the list
  sortedChats.forEach(chat => {
    const chatItem = document.createElement("div");
    chatItem.classList.add("chat-item");
    chatItem.dataset.id = chat.id;
    
    // Get the chat title (either custom name or first message or default)
    let chatName = chat.Name || "Cuộc trò chuyện";
    
    // Try to get first message if it's a default chat name
    if (chatName.startsWith("Chat ") || chatName === currentUser.name) {
      try {
        const history = typeof chat.Chat_history === 'string' 
          ? JSON.parse(chat.Chat_history) 
          : (chat.Chat_history || []);
          
        if (history.length > 0) {
          // Get the first user message, or the first message if no user messages
          const firstUserMsg = history.find(msg => msg.role === 'user');
          const firstMsg = firstUserMsg || history[0];
          
          if (firstMsg) {
            // Use the first few words of the message as the title
            const words = firstMsg.content.split(" ").slice(0, 4).join(" ");
            chatName = words + (words.length < firstMsg.content.length ? "..." : "");
          }
        }
      } catch (e) {
        console.error("Error parsing chat history for title:", e);
      }
    }
    
    // Create chat item HTML
    chatItem.innerHTML = `
      <div class="chat-item-text">${chatName}</div>
      <div class="delete-chat" data-id="${chat.id}">×</div>
    `;
    
    // Add click event to load this chat
    chatItem.addEventListener("click", function(e) {
      // If clicked on delete button, don't load the chat
      if (e.target.classList.contains("delete-chat")) {
        e.stopPropagation();
        deleteChat(chat.id);
        return;
      }
      
      loadChat(chat.id);
    });
    
    // Highlight active chat
    if (chat.id === currentChatId) {
      chatItem.classList.add("active");
    }
    
    chatList.appendChild(chatItem);
  });
}

// Show the empty state when no chat is selected
function showEmptyChatState() {
  emptyState.style.display = "flex";
  chatBody.style.display = "none";
  chatInputArea.style.display = "none";
  currentChatTitle.textContent = "Khung Chat Với Khôi Bot";
  currentChatId = null;
}

// Hide the empty state and show chat
function hideEmptyChatState() {
  emptyState.style.display = "none";
  chatBody.style.display = "flex";
  chatInputArea.style.display = "flex";
}

// Create a new chat
async function createNewChat() {
  try {
    updateStatus("Đang tạo cuộc trò chuyện mới...");
    
    // First message is a welcome message
    const initialHistory = [{
      role: 'bot',
      content: `Xin chào ${currentUser.name || 'bạn'}! Tôi là Khôi Bot. Tôi có thể giúp gì cho bạn?`
    }];
    
    const newChat = {
      Created_Date: new Date().toISOString(),
      Name: `Chat với Khôi Bot`,  // Default name
      Chat_history: JSON.stringify(initialHistory),
      id_Users: currentUser.id
    };
    
    const response = await fetch(API_HISTORY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newChat)
    });
    
    const createdChat = await response.json();
    
    // Add to local chats list
    userChats.unshift(createdChat);
    
    // Refresh chat list
    displayChatList(userChats);
    
    // Load the new chat
    loadChat(createdChat.id);
    
    updateStatus("Đã tạo cuộc trò chuyện mới");
  } catch (error) {
    console.error("Error creating new chat:", error);
    updateStatus("Lỗi khi tạo cuộc trò chuyện mới");
  }
}

// Delete a chat
async function deleteChat(chatId) {
  if (!confirm("Bạn có chắc chắn muốn xóa cuộc trò chuyện này?")) {
    return;
  }
  
  try {
    updateStatus("Đang xóa cuộc trò chuyện...");
    
    // Delete from API
    await fetch(`${API_HISTORY_ENDPOINT}/${chatId}`, {
      method: 'DELETE'
    });
    
    // Remove from local list
    userChats = userChats.filter(chat => chat.id !== chatId);
    
    // Update UI
    displayChatList(userChats);
    
    // If deleted the current chat, show empty state or load another chat
    if (chatId === currentChatId) {
      if (userChats.length > 0) {
        loadChat(userChats[0].id);
      } else {
        showEmptyChatState();
      }
    }
    
    updateStatus("Đã xóa cuộc trò chuyện");
  } catch (error) {
    console.error("Error deleting chat:", error);
    updateStatus("Lỗi khi xóa cuộc trò chuyện");
  }
}

// Load a specific chat
async function loadChat(chatId) {
  try {
    updateStatus("Đang tải cuộc trò chuyện...");
    
    // Close sidebar on mobile after selecting a chat
    if (window.innerWidth <= 768) {
      sidebar.classList.remove("open");
    }
    
    // Highlight the selected chat in the sidebar
    document.querySelectorAll(".chat-item").forEach(item => {
      item.classList.remove("active");
      if (item.dataset.id === chatId) {
        item.classList.add("active");
      }
    });
    
    // Find the chat in our local list
    const chat = userChats.find(c => c.id === chatId);
    
    if (!chat) {
      // If not found, try to fetch it
      const response = await fetch(`${API_HISTORY_ENDPOINT}/${chatId}`);
      const fetchedChat = await response.json();
      
      if (!fetchedChat || !fetchedChat.id) {
        updateStatus("Cuộc trò chuyện không tồn tại");
        return;
      }
      
      currentChatId = chatId;
      currentChatTitle.textContent = fetchedChat.Name || "Cuộc trò chuyện";
      
      // Parse chat history
      if (typeof fetchedChat.Chat_history === 'string') {
        try {
          chatHistory = JSON.parse(fetchedChat.Chat_history) || [];
        } catch (e) {
          chatHistory = [];
        }
      } else {
        chatHistory = fetchedChat.Chat_history || [];
      }
    } else {
      // Use the chat from our local list
      currentChatId = chatId;
      currentChatTitle.textContent = chat.Name || "Cuộc trò chuyện";
      
      // Parse chat history
      if (typeof chat.Chat_history === 'string') {
        try {
          chatHistory = JSON.parse(chat.Chat_history) || [];
        } catch (e) {
          chatHistory = [];
        }
      } else {
        chatHistory = chat.Chat_history || [];
      }
    }
    
    // Display the chat history
    displayChatHistory();
    
    // Hide empty state and show chat
    hideEmptyChatState();
    
    // Focus on input
    messageInput.focus();
    
    updateStatus("Đã tải cuộc trò chuyện");
  } catch (error) {
    console.error("Error loading chat:", error);
    updateStatus("Lỗi khi tải cuộc trò chuyện");
  }
}

// Display current chat history
function displayChatHistory() {
  chatBody.innerHTML = ""; // Clear the chat body
  
  if (!chatHistory || chatHistory.length === 0) {
    updateStatus("Không có lịch sử trò chuyện");
    return;
  }
  
  chatHistory.forEach(message => {
    const className = message.role === "user" ? "message-me" : "message-user";
    displayMessage(message.content, className);
  });
  
  // Scroll to bottom
  scrollToBottom();
}

// Update status indicator
function updateStatus(message) {
  if (statusIndicator) {
    statusIndicator.textContent = message;
    
    // Auto-hide status after 3 seconds if it's not an error or loading message
    if (!message.includes("Lỗi") && !message.includes("Đang")) {
      setTimeout(() => {
        statusIndicator.textContent = "Đã kết nối";
      }, 3000);
    }
  }
}

// Handle sending a new message
async function handleSendMessage() {
  const message = messageInput.value.trim();
  if (message === "" || !currentChatId || isProcessing) return;
  
  // Set processing flag to prevent multiple submissions
  isProcessing = true;
  
  // Disable input while processing
  messageInput.disabled = true;
  sendButton.disabled = true;
  
  // Update status
  updateStatus("Đang gửi tin nhắn...");
  
  // Clear input field
  messageInput.value = "";
  
  // Display user message
  displayMessage(message, "message-me");
  
  // Add message to chat history
  chatHistory.push({ role: 'user', content: message });
  
  // Save chat history
  await saveChatHistory();
  
  // Show loading animation
  const loadingElement = addLoadingAnimation();
  
  try {
    // Send message to API
    const response = await sendMessageToAPI(message);
    
    // Remove loading animation
    removeLoadingAnimation(loadingElement);
    
    // Enable input
    messageInput.disabled = false;
    sendButton.disabled = false;
    messageInput.focus();
    
    // Process API response
    if (response && response.response) {
      // Display bot's response with gradual rendering
      graduallyRenderMessage(response.response, "message-user");
      
      // Add bot response to chat history
      chatHistory.push({ role: 'bot', content: response.response });
      
      // Save chat history again with bot's response
      await saveChatHistory();
      
      // Update chat list in case first message changed title
      displayChatList(userChats);
    } else {
      displayMessage("Sorry, something went wrong.", "message-user");
    }
  } catch (error) {
    console.error("API Error:", error);
    removeLoadingAnimation(loadingElement);
    displayMessage("Sorry, something went wrong.", "message-user");
    
    // Enable input
    messageInput.disabled = false;
    sendButton.disabled = false;
  } finally {
    // Reset processing flag
    isProcessing = false;
  }
}

// Save chat history to API
async function saveChatHistory() {
  try {
    if (!currentChatId) {
      console.error("Cannot save chat history: No current chat ID");
      return;
    }
    
    updateStatus("Đang lưu lịch sử trò chuyện...");
    
    // Find the chat in our local list
    const chatIndex = userChats.findIndex(c => c.id === currentChatId);
    
    if (chatIndex !== -1) {
      // Update local copy
      userChats[chatIndex].Chat_history = JSON.stringify(chatHistory);
    }
    
    // Update on API
    const response = await fetch(`${API_HISTORY_ENDPOINT}/${currentChatId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        Chat_history: JSON.stringify(chatHistory),
        id_Users: currentUser.id,
        Updated_Date: new Date().toISOString()
      })
    });
    
    updateStatus("Đã lưu lịch sử trò chuyện");
  } catch (error) {
    console.error("Error saving chat history:", error);
    updateStatus("Lỗi khi lưu lịch sử trò chuyện");
  }
}

// Send message to API
async function sendMessageToAPI(message) {
  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: message,
      chatHistory: chatHistory,
      userId: currentUser.id
    }),
  });
  
  return await response.json();
}

// Find all markdown patterns in the text
function findMarkdownPatterns(text) {
  const patterns = [];
  
  // Find bold (4 asterisks)
  let match;
  const boldQuadRegex = /\*\*\*\*(.*?)\*\*\*\*/g;
  while ((match = boldQuadRegex.exec(text)) !== null) {
    patterns.push({
      type: 'bold',
      start: match.index,
      end: match.index + match[0].length,
      innerStart: match.index + 4,
      innerEnd: match.index + match[0].length - 4,
      content: match[1]
    });
  }
  
  // Find bold (2 asterisks)
  const boldRegex = /\*\*(.*?)\*\*/g;
  while ((match = boldRegex.exec(text)) !== null) {
    // Skip if this is part of a 4-asterisk pattern
    if (!patterns.some(p => 
      p.type === 'bold' && 
      (match.index >= p.start && match.index < p.end)
    )) {
      patterns.push({
        type: 'bold',
        start: match.index,
        end: match.index + match[0].length,
        innerStart: match.index + 2,
        innerEnd: match.index + match[0].length - 2,
        content: match[1]
      });
    }
  }
  
  // Find italic
  const italicRegex = /(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g;
  while ((match = italicRegex.exec(text)) !== null) {
    // Skip if this is part of a bold pattern
    if (!patterns.some(p => 
      (match.index >= p.start && match.index < p.end)
    )) {
      patterns.push({
        type: 'italic',
        start: match.index,
        end: match.index + match[0].length,
        innerStart: match.index + 1,
        innerEnd: match.index + match[0].length - 1,
        content: match[1]
      });
    }
  }
  
  // Find bullet points
  let lines = text.split('\n');
  let lineIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('* ')) {
      patterns.push({
        type: 'bullet',
        start: lineIndex,
        end: lineIndex + 2,
        innerStart: lineIndex + 2,
        innerEnd: lineIndex + lines[i].length,
        content: lines[i].substring(2)
      });
    }
    lineIndex += lines[i].length + 1; // +1 for the newline
  }
  
  return patterns;
}

// Format text with found patterns
function formatTextWithPatterns(text, patterns) {
  const container = document.createElement('span');
  container.style.whiteSpace = 'pre-wrap';
  
  let currentIndex = 0;
  
  // Process each character checking if it falls within a pattern
  while (currentIndex < text.length) {
    // Find if current position is within any pattern
    const activePattern = patterns.find(p => 
      currentIndex >= p.start && currentIndex < p.end
    );
    
    if (activePattern) {
      // We're inside a pattern
      
      // Handle the start marker (like ** or *)
      if (currentIndex === activePattern.start) {
        // Skip the marker characters
        if (activePattern.type === 'bold') {
          // Skip 2 or 4 asterisks
          const markerLength = activePattern.innerStart - activePattern.start;
          // Add the formatted content
          const formatted = document.createElement('span');
          formatted.className = 'markdown-bold';
          
          // Calculate how much of the content we should show
          const endPos = Math.min(text.length, activePattern.innerEnd);
          const contentToShow = text.substring(activePattern.innerStart, endPos);
          
          formatted.textContent = contentToShow;
          container.appendChild(formatted);
          
          // Move past this pattern or to the end of text
          currentIndex = endPos;
          
          // If we reached the end of the pattern content, skip the end marker too
          if (endPos === activePattern.innerEnd && text.length >= activePattern.end) {
            currentIndex = activePattern.end;
          }
        } 
        else if (activePattern.type === 'italic') {
          // Skip the asterisk
          const formatted = document.createElement('span');
          formatted.className = 'markdown-italic';
          
          // Calculate how much of the content we should show
          const endPos = Math.min(text.length, activePattern.innerEnd);
          const contentToShow = text.substring(activePattern.innerStart, endPos);
          
          formatted.textContent = contentToShow;
          container.appendChild(formatted);
          
          // Move past this pattern or to the end of text
          currentIndex = endPos;
          
          // If we reached the end of the pattern content, skip the end marker too
          if (endPos === activePattern.innerEnd && text.length >= activePattern.end) {
            currentIndex = activePattern.end;
          }
        }
        else if (activePattern.type === 'bullet') {
          // Replace bullet with dash
          container.appendChild(document.createTextNode('- '));
          currentIndex += 2;
        }
      }
      else {
        // We're in the middle of a pattern, handle specially
        // This shouldn't usually happen with our logic, but just in case
        currentIndex++;
      }
    } 
    else {
      // Regular text, process until next pattern or end
      let nextPatternStart = text.length;
      
      // Find the next pattern start
      for (const pattern of patterns) {
        if (pattern.start > currentIndex && pattern.start < nextPatternStart) {
          nextPatternStart = pattern.start;
        }
      }
      
      // Add text until the next pattern
      const textNode = document.createTextNode(
        text.substring(currentIndex, nextPatternStart)
      );
      container.appendChild(textNode);
      
      // Move past this text
      currentIndex = nextPatternStart;
    }
  }
  
  return container;
}

// Format partial text with found patterns
function formatPartialText(partialText, patterns) {
  return formatTextWithPatterns(partialText, patterns);
}

// Display a message in the chat
function displayMessage(message, className = "message-me") {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", className);

  const avatar = document.createElement("img");
  avatar.src = className === "message-me" ? "./img/Sinh.png" : "./img/Khoi.png";
  avatar.classList.add("message-avatar");
  avatar.onerror = function() {
    // Fallback if image fails to load
    this.src = className === "message-me" ? 
      "https://ui-avatars.com/api/?name=User&background=E6F0FF&color=4263EB" :
      "https://ui-avatars.com/api/?name=Bot&background=5D7CF6&color=FFFFFF";
  };

  const messageContent = document.createElement("div");
  messageContent.classList.add("message-content");
  
  if (className === "message-user") {
    // For bot messages, handle both markdown, HTML, and LaTeX rendering
    
    // Bold pattern (preserve HTML tags)
    let processedMessage = message.replace(/\*\*([\s\S]*?)\*\*/g, '<span class="markdown-bold">$1</span>');
    
    // Italic pattern (preserve HTML tags)
    processedMessage = processedMessage.replace(/\b\*([^\*]+)\*/g, '<span class="markdown-italic">$1</span>');
    
    // Process bullet points
    const lines = processedMessage.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('* ')) {
        lines[i] = '- ' + lines[i].substring(2);
      }
    }
    processedMessage = lines.join('\n');
    
    // Use innerHTML to allow HTML tags to render
    messageContent.innerHTML = processedMessage;
    
    // Render LaTeX math expressions if KaTeX is available
    if (typeof renderMathInElement === 'function') {
      renderMathInElement(messageContent, {
        delimiters: [
          {left: "$$", right: "$$", display: true},
          {left: "$", right: "$", display: false},
          {left: "\\(", right: "\\)", display: false},
          {left: "\\[", right: "\\]", display: true}
        ],
        throwOnError: false
      });
    }
  } else {
    // For user messages, use the original approach
    const patterns = findMarkdownPatterns(message);
    const formattedContent = formatTextWithPatterns(message, patterns);
    messageContent.appendChild(formattedContent);
  }

  messageElement.appendChild(avatar);
  messageElement.appendChild(messageContent);

  chatBody.appendChild(messageElement);
  scrollToBottom();
}

// Add loading animation
function addLoadingAnimation() {
  const loadingElement = document.createElement("div");
  loadingElement.classList.add("message", "message-user");
  
  const avatar = document.createElement("img");
  avatar.src = "./img/Khoi.png";
  avatar.classList.add("message-avatar");
  avatar.onerror = function() {
    this.src = "https://ui-avatars.com/api/?name=Bot&background=5D7CF6&color=FFFFFF";
  };
  
  const loadingContent = document.createElement("div");
  loadingContent.classList.add("message-content");
  loadingContent.innerHTML = "<div class='loading'></div>";
  
  loadingElement.appendChild(avatar);
  loadingElement.appendChild(loadingContent);
  
  chatBody.appendChild(loadingElement);
  scrollToBottom();
  return loadingElement;
}

// Remove loading animation
function removeLoadingAnimation(loadingElement) {
  if (loadingElement && loadingElement.parentNode) {
    chatBody.removeChild(loadingElement);
  }
}

// Gradually render a message with real-time formatting
function graduallyRenderMessage(message, className = "message-user") {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", className);

  const avatar = document.createElement("img");
  avatar.src = className === "message-me" ? "./img/Sinh.png" : "./img/Khoi.png";
  avatar.classList.add("message-avatar");
  avatar.onerror = function() {
    this.src = className === "message-me" ? 
      "https://ui-avatars.com/api/?name=User&background=E6F0FF&color=4263EB" :
      "https://ui-avatars.com/api/?name=Bot&background=5D7CF6&color=FFFFFF";
  };

  const messageContent = document.createElement("div");
  messageContent.classList.add("message-content");
  
  messageElement.appendChild(avatar);
  messageElement.appendChild(messageContent);

  chatBody.appendChild(messageElement);
  scrollToBottom();

  // Set up typing animation
  let charIndex = 0;
  const typingSpeed = 5;
  
  if (className === "message-user") {
    // For bot messages - handle both markdown, HTML, and LaTeX
    const interval = setInterval(() => {
      if (charIndex > message.length) {
        clearInterval(interval);
        
        // When typing is complete, render LaTeX on the final content
        if (typeof renderMathInElement === 'function') {
          renderMathInElement(messageContent, {
            delimiters: [
              {left: "$$", right: "$$", display: true},
              {left: "$", right: "$", display: false},
              {left: "\\(", right: "\\)", display: false},
              {left: "\\[", right: "\\]", display: true}
            ],
            throwOnError: false
          });
        }
        
        return;
      }
      
      // Get the partial message
      const partialMessage = message.substring(0, charIndex);
      
      // Bold pattern 
      let processedPartial = partialMessage.replace(/\*\*([\s\S]*?)\*\*/g, '<span class="markdown-bold">$1</span>');
      
      // Italic pattern
      processedPartial = processedPartial.replace(/\b\*([^\*]+)\*/g, '<span class="markdown-italic">$1</span>');
      
      // Process bullet points - only if we complete a line
      if (partialMessage.includes('\n')) {
        const lines = processedPartial.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith('* ')) {
            lines[i] = '- ' + lines[i].substring(2);
          }
        }
        processedPartial = lines.join('\n');
      }
      
      // Set innerHTML to allow HTML tags to render
      messageContent.innerHTML = processedPartial;
      
      charIndex++;
      scrollToBottom();
    }, typingSpeed);
  } else {
    // For user messages, use the original approach
    const patterns = findMarkdownPatterns(message);
    const interval = setInterval(() => {
      if (charIndex > message.length) {
        clearInterval(interval);
        return;
      }
      
      messageContent.innerHTML = '';
      messageContent.appendChild(formatPartialText(message.substring(0, charIndex), patterns));
      
      charIndex++;
      scrollToBottom();
    }, typingSpeed);
  }
}

// Scroll chat to bottom
function scrollToBottom() {
  chatBody.scrollTop = chatBody.scrollHeight;
}

// Rename the current chat
async function renameChat(newName) {
  if (!currentChatId || !newName || newName.trim() === "") {
    return;
  }
  
  try {
    updateStatus("Đang đổi tên cuộc trò chuyện...");
    
    // Update on API
    const response = await fetch(`${API_HISTORY_ENDPOINT}/${currentChatId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        Name: newName.trim(),
        Updated_Date: new Date().toISOString()
      })
    });
    
    const updatedChat = await response.json();
    
    // Update local data
    const chatIndex = userChats.findIndex(c => c.id === currentChatId);
    if (chatIndex !== -1) {
      userChats[chatIndex].Name = newName.trim();
    }
    
    // Update UI
    currentChatTitle.textContent = newName.trim();
    displayChatList(userChats);
    
    updateStatus("Đã đổi tên cuộc trò chuyện");
  } catch (error) {
    console.error("Error renaming chat:", error);
    updateStatus("Lỗi khi đổi tên cuộc trò chuyện");
  }
}

// Function to export a chat as JSON
function exportChatAsJSON() {
  if (!currentChatId || !chatHistory || chatHistory.length === 0) {
    alert("Không có cuộc trò chuyện để xuất");
    return;
  }
  
  try {
    // Find current chat
    const chat = userChats.find(c => c.id === currentChatId);
    if (!chat) {
      alert("Không tìm thấy cuộc trò chuyện");
      return;
    }
    
    // Prepare export data
    const exportData = {
      name: chat.Name,
      createdAt: chat.Created_Date,
      messages: chatHistory
    };
    
    // Convert to JSON string
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // Create download link
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${chat.Name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
    
  } catch (error) {
    console.error("Error exporting chat:", error);
    alert("Lỗi khi xuất cuộc trò chuyện: " + error.message);
  }
}

// Function to clear all messages from current chat
async function clearCurrentChat() {
  if (!currentChatId) {
    alert("Không có cuộc trò chuyện để xóa");
    return;
  }
  
  if (!confirm("Bạn có chắc chắn muốn xóa tất cả tin nhắn trong cuộc trò chuyện này?")) {
    return;
  }
  
  try {
    updateStatus("Đang xóa tin nhắn...");
    
    // Keep only the welcome message
    const welcomeMessage = {
      role: 'bot',
      content: `Xin chào ${currentUser.name || 'bạn'}! Tôi là Khôi Bot. Tôi có thể giúp gì cho bạn?`
    };
    
    chatHistory = [welcomeMessage];
    
    // Save to API
    await saveChatHistory();
    
    // Update UI
    displayChatHistory();
    
    updateStatus("Đã xóa tất cả tin nhắn");
  } catch (error) {
    console.error("Error clearing chat:", error);
    updateStatus("Lỗi khi xóa tin nhắn");
  }
}
// Add these functions to your existing chat.js file

// Additional DOM elements for user profile and password change
const userInfoTrigger = document.getElementById("user-info-trigger");
const userProfileModal = document.getElementById("user-profile-modal");
const closeProfileModal = document.getElementById("close-profile-modal");
const profileAvatar = document.getElementById("profile-avatar");
const profileName = document.getElementById("profile-name");
const profileEmail = document.getElementById("profile-email");
const profilePhone = document.getElementById("profile-phone");
const changePasswordBtn = document.getElementById("change-password-btn");
const passwordChangeModal = document.getElementById("password-change-modal");
const closePasswordModal = document.getElementById("close-password-modal");
const changePasswordForm = document.getElementById("change-password-form");
const currentPasswordInput = document.getElementById("current-password");
const newPasswordInput = document.getElementById("new-password");
const confirmNewPasswordInput = document.getElementById("confirm-new-password");
const passwordError = document.getElementById("password-error");
const cancelPasswordChange = document.getElementById("cancel-password-change");
const submitPasswordChange = document.getElementById("submit-password-change");

// API URL for users
const API_USER_URL = 'https://67d3d8158bca322cc26b4105.mockapi.io/Users';

// Original setup event listeners function - we'll modify it to add our new listeners
function setupEventListeners() {
  // Original event listeners remain the same...
  
  // Logout button
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function() {
      localStorage.removeItem("currentUser");
      localStorage.removeItem("chatUserId");
      window.location.href = "login.html";
    });
  }
  
  // New chat buttons
  if (newChatBtn) {
    newChatBtn.addEventListener("click", createNewChat);
  }
  
  if (startNewChatBtn) {
    startNewChatBtn.addEventListener("click", createNewChat);
  }
  
  // Send message
  if (sendButton) {
    sendButton.addEventListener("click", handleSendMessage);
  }
  
  // Enter key press
  if (messageInput) {
    messageInput.addEventListener("keypress", function(event) {
      if (event.key === "Enter") {
        handleSendMessage();
      }
    });
  }
  
  // Search functionality
  if (searchInput) {
    searchInput.addEventListener("input", function() {
      filterChats(this.value.toLowerCase());
    });
  }
  
  // Export button
  if (exportButton) {
    exportButton.addEventListener("click", exportChatAsJSON);
  }
  
  // Clear button
  if (clearButton) {
    clearButton.addEventListener("click", clearCurrentChat);
  }
  
  // User Profile and Password Change
  if (userInfoTrigger) {
    userInfoTrigger.addEventListener("click", openUserProfile);
  }
  
  if (closeProfileModal) {
    closeProfileModal.addEventListener("click", closeUserProfile);
  }
  
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener("click", openPasswordChange);
  }
  
  if (closePasswordModal) {
    closePasswordModal.addEventListener("click", closePasswordChange);
  }
  
  if (cancelPasswordChange) {
    cancelPasswordChange.addEventListener("click", closePasswordChange);
  }
  
  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", handlePasswordChange);
  }
  
  // Password toggles
  const passwordToggles = document.querySelectorAll('.password-toggle');
  passwordToggles.forEach(toggle => {
    toggle.addEventListener('click', function() {
      const targetId = this.getAttribute('data-target');
      togglePasswordVisibility(targetId, this);
    });
  });
  
  // Window resize handler
  window.addEventListener("resize", handleResize);
  
  // Close modals when clicking outside
  window.addEventListener("click", function(e) {
    if (e.target === userProfileModal) {
      closeUserProfile();
    }
    if (e.target === passwordChangeModal) {
      closePasswordChange();
    }
  });
}

// Toggle password visibility
function togglePasswordVisibility(inputId, toggleElement) {
  const input = document.getElementById(inputId);
  if (input) {
    if (input.type === 'password') {
      input.type = 'text';
      toggleElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
    } else {
      input.type = 'password';
      toggleElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
    }
  }
}

// Open user profile modal
function openUserProfile() {
  // Get current user data
  const userData = localStorage.getItem("currentUser");
  if (!userData) {
    return;
  }
  
  try {
    const user = JSON.parse(userData);
    
    // Set user profile information
    profileAvatar.textContent = getInitials(user.name);
    profileName.textContent = user.name || 'N/A';
    profileEmail.textContent = user.email || 'N/A';
    profilePhone.textContent = user.number || 'N/A';
    
    // Show the modal
    userProfileModal.style.display = "block";
  } catch (error) {
    console.error("Error parsing user data:", error);
  }
}

// Close user profile modal
function closeUserProfile() {
  userProfileModal.style.display = "none";
}

// Open password change modal
function openPasswordChange() {
  // Close the profile modal
  closeUserProfile();
  
  // Reset form and errors
  changePasswordForm.reset();
  passwordError.style.display = "none";
  passwordError.textContent = "";
  
  // Reset button state
  submitPasswordChange.disabled = false;
  const btnText = submitPasswordChange.querySelector('.btn-text');
  if (btnText) {
    btnText.textContent = "Đổi mật khẩu";
  }
  
  // Remove loading spinner if exists
  const loadingSpinner = submitPasswordChange.querySelector('.loading');
  if (loadingSpinner) {
    submitPasswordChange.removeChild(loadingSpinner);
  }
  
  // Show password change modal
  passwordChangeModal.style.display = "block";
}

// Close password change modal
function closePasswordChange() {
  passwordChangeModal.style.display = "none";
}

// Handle password change submission
async function handlePasswordChange(e) {
  e.preventDefault();
  
  // Get the values
  const currentPassword = currentPasswordInput.value;
  const newPassword = newPasswordInput.value;
  const confirmNewPassword = confirmNewPasswordInput.value;
  
  // Reset error
  passwordError.style.display = "none";
  passwordError.textContent = "";
  
  // Validate form
  if (!currentPassword || !newPassword || !confirmNewPassword) {
    passwordError.textContent = "Please fill in all fields!";
    passwordError.style.display = "block";
    return;
  }
  
  if (newPassword !== confirmNewPassword) {
    passwordError.textContent = "Password confirmation does not match";
    passwordError.style.display = "block";
    return;
  }
  
  if (currentPassword === newPassword) {
    passwordError.textContent = "New password must be different";
    passwordError.style.display = "block";
    return;
  }
  
  // Set loading state
  submitPasswordChange.disabled = true;
  const btnText = submitPasswordChange.querySelector('.btn-text');
  if (btnText) {
    btnText.textContent = "Đang xử lý...";
  }
  
  // Add loading spinner
  if (!submitPasswordChange.querySelector('.loading')) {
    const loadingSpinner = document.createElement('span');
    loadingSpinner.className = 'loading';
    submitPasswordChange.appendChild(loadingSpinner);
  }
  
  try {
    // Get current user data
    const userData = localStorage.getItem("currentUser");
    if (!userData) {
      throw new Error("User data not found");
    }
    
    const user = JSON.parse(userData);
    
    // Verify current password
    if (user.password !== currentPassword) {
      passwordError.textContent = "Current password is incorrect";
      passwordError.style.display = "block";
      resetSubmitButton();
      return;
    }
    
    // Get the correct user ID
    const userId = user.id || user.id_Users;
    
    if (!userId) {
      passwordError.textContent = "User ID not found. Please log in again.";
      passwordError.style.display = "block";
      resetSubmitButton();
      return;
    }
    
    // Update the password
    const response = await fetch(`${API_USER_URL}/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password: newPassword
      })
    });
    
    if (response.ok) {
      // Update user data in local storage
      user.password = newPassword;
      localStorage.setItem("currentUser", JSON.stringify(user));
      
      // Show success
      passwordError.textContent = "Password changed successfully!";
      passwordError.style.display = "block";
      passwordError.style.color = "#4CAF50";
      
      // Close modal after 2 seconds
      setTimeout(() => {
        closePasswordChange();
        // Reset color for future errors
        passwordError.style.color = "#ff4d4d";
      }, 2000);
    } else {
      throw new Error("Failed to update password");
    }
  } catch (error) {
    console.error("Password change error:", error);
    passwordError.textContent = "Error changing password. Please try again.";
    passwordError.style.display = "block";
  } finally {
    resetSubmitButton();
  }
}

// Reset submit button state
function resetSubmitButton() {
  submitPasswordChange.disabled = false;
  const btnText = submitPasswordChange.querySelector('.btn-text');
  if (btnText) {
    btnText.textContent = "Change password";
  }
  
  const loadingSpinner = submitPasswordChange.querySelector('.loading');
  if (loadingSpinner) {
    submitPasswordChange.removeChild(loadingSpinner);
  }
}

// Modify the createNewChat function to always name chats "Chat với Khôi Bot"
async function createNewChat() {
  try {
    updateStatus("Đang tạo cuộc trò chuyện mới...");
    
    // First message is a welcome message
    const initialHistory = [{
      role: 'bot',
      content: `Xin chào ${currentUser.name || 'bạn'}! Tôi là Khôi Bot. Tôi có thể giúp gì cho bạn?`
    }];
    
    const newChat = {
      Created_Date: new Date().toISOString(),
      Name: `Chat với Khôi Bot`,  // Always use this name
      Chat_history: JSON.stringify(initialHistory),
      id_Users: currentUser.id
    };
    
    const response = await fetch(API_HISTORY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newChat)
    });
    
    const createdChat = await response.json();
    
    // Add to local chats list
    userChats.unshift(createdChat);
    
    // Refresh chat list
    displayChatList(userChats);
    
    // Load the new chat
    loadChat(createdChat.id);
    
    updateStatus("Đã tạo cuộc trò chuyện mới");
  } catch (error) {
    console.error("Error creating new chat:", error);
    updateStatus("Lỗi khi tạo cuộc trò chuyện mới");
  }
}

// Override the promptChatRename function to prevent renaming
function promptChatRename() {
  // Simply do nothing - disable the renaming feature
  // Or show a message that renaming is disabled
  alert("Tên chat được đặt mặc định là 'Chat với Khôi Bot'");
}

// Modify loadChat function to always set title to "Chat với Khôi Bot"
async function loadChat(chatId) {
  try {
    updateStatus("Đang tải cuộc trò chuyện...");
    
    // Close sidebar on mobile after selecting a chat
    if (window.innerWidth <= 768) {
      sidebar.classList.remove("open");
    }
    
    // Highlight the selected chat in the sidebar
    document.querySelectorAll(".chat-item").forEach(item => {
      item.classList.remove("active");
      if (item.dataset.id === chatId) {
        item.classList.add("active");
      }
    });
    
    // Find the chat in our local list
    const chat = userChats.find(c => c.id === chatId);
    
    if (!chat) {
      // If not found, try to fetch it
      const response = await fetch(`${API_HISTORY_ENDPOINT}/${chatId}`);
      const fetchedChat = await response.json();
      
      if (!fetchedChat || !fetchedChat.id) {
        updateStatus("Cuộc trò chuyện không tồn tại");
        return;
      }
      
      currentChatId = chatId;
      // Always set title to "Chat với Khôi Bot"
      currentChatTitle.textContent = "Chat với Khôi Bot";
      
      // Parse chat history
      if (typeof fetchedChat.Chat_history === 'string') {
        try {
          chatHistory = JSON.parse(fetchedChat.Chat_history) || [];
        } catch (e) {
          chatHistory = [];
        }
      } else {
        chatHistory = fetchedChat.Chat_history || [];
      }
    } else {
      // Use the chat from our local list
      currentChatId = chatId;
      // Always set title to "Chat với Khôi Bot"
      currentChatTitle.textContent = "Chat với Khôi Bot";
      
      // Parse chat history
      if (typeof chat.Chat_history === 'string') {
        try {
          chatHistory = JSON.parse(chat.Chat_history) || [];
        } catch (e) {
          chatHistory = [];
        }
      } else {
        chatHistory = chat.Chat_history || [];
      }
    }
    
    // Display the chat history
    displayChatHistory();
    
    // Hide empty state and show chat
    hideEmptyChatState();
    
    // Focus on input
    messageInput.focus();
    
    updateStatus("Đã tải cuộc trò chuyện");
  } catch (error) {
    console.error("Error loading chat:", error);
    updateStatus("Lỗi khi tải cuộc trò chuyện");
  }
}
// Theme toggle functionality
document.addEventListener('DOMContentLoaded', function() {
  // Check for saved theme preference or use default
  let currentTheme = localStorage.getItem('theme') ;
  // If no saved preference, use browser preference
  if (!currentTheme) {
    currentTheme = detectBrowserThemePreference();
    // Save the detected preference
    localStorage.setItem('theme', currentTheme);
  }
  // Apply the theme
  document.documentElement.setAttribute('data-theme', currentTheme);
  
  // Update button icon based on current theme
  updateThemeToggleIcon(currentTheme);
  
  // Add event listener to theme toggle button
  const themeToggle = document.getElementById('theme-toggle-btn');
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      // Get current theme
      const currentTheme = document.documentElement.getAttribute('data-theme');
      
      // Toggle theme
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      // Save preference
      localStorage.setItem('theme', newTheme);
      
      // Apply new theme
      document.documentElement.setAttribute('data-theme', newTheme);
      
      // Update button icon
      updateThemeToggleIcon(newTheme);
    });
  }
});

// Update the toggle button icon based on theme
function updateThemeToggleIcon(theme) {
  const themeToggle = document.getElementById('theme-toggle-btn');
  if (themeToggle) {
    if (theme === 'dark') {
      themeToggle.innerHTML = '<i class="ri-sun-line"></i>'; // Show sun in dark mode
    } else {
      themeToggle.innerHTML = '<i class="ri-moon-line"></i>'; // Show moon in light mode
    }
  }
}

function detectBrowserThemePreference() {
  if (window.matchMedia) {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    } 
    else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
  }
  return 'dark';
}

// Silent DevTools prevention - no alerts
document.addEventListener('keydown', function(e) {
  // Prevent F12
  if (e.key === 'F12') {
    e.preventDefault();
    return false;
  }
  
  // Prevent Ctrl+Shift+I
  if (e.ctrlKey && e.shiftKey && e.key === 'I') {
    e.preventDefault();
    return false;
  }
  
  // Prevent Ctrl+Shift+J
  if (e.ctrlKey && e.shiftKey && e.key === 'J') {
    e.preventDefault();
    return false;
  }
  
  // Prevent Ctrl+Shift+C
  if (e.ctrlKey && e.shiftKey && e.key === 'C') {
    e.preventDefault();
    return false;
  }
  
  // Prevent Ctrl+U (view source)
  if (e.ctrlKey && e.key === 'u') {
    e.preventDefault();
    return false;
  }
});

// Silent context menu prevention
document.addEventListener('contextmenu', function(e) {
  e.preventDefault();
  return false;
});

// More sophisticated DevTools detection
(function() {
  const devtools = {
    isOpen: false,
    orientation: undefined
  };
  
  // Define different checks for DevTools
  const threshold = 160;
  const emitEvent = function(isOpen, orientation) {
    window.dispatchEvent(new CustomEvent('devtoolschange', {
      detail: {
        isOpen,
        orientation
      }
    }));
  };
  
  // Check window size differences
  const checkDevTools = function() {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    const orientation = widthThreshold ? 'vertical' : 'horizontal';
    
    if (widthThreshold || heightThreshold) {
      if (!devtools.isOpen || devtools.orientation !== orientation) {
        devtools.isOpen = true;
        devtools.orientation = orientation;
        emitEvent(true, orientation);
      }
    } else {
      if (devtools.isOpen) {
        devtools.isOpen = false;
        devtools.orientation = undefined;
        emitEvent(false, undefined);
      }
    }
  };
  
  window.addEventListener('resize', checkDevTools);
  setInterval(checkDevTools, 1000);
  
  // Optional: You can add additional actions when DevTools is detected
  window.addEventListener('devtoolschange', function(e) {
    if (e.detail.isOpen) {
      // DevTools is open, you could do something here
      // For example, clear sensitive data, redirect, etc.
      // But we're keeping it silent per user request
    }
  });
})();

