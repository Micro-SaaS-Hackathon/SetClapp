    let mainTextGlobal = '';
    let currentConversation = [];
                    const apiKey = 'AIzaSyC28kX8U3valZj3TvB_RLz_er4B3hLDGHE';
        
        document.addEventListener('DOMContentLoaded', () => {
            const readBtn = document.getElementById('readText');
            const aiBtn = document.getElementById('sendAI');
            const responseDiv = document.getElementById('aiResponse');
            const navTabs = document.querySelectorAll('.nav-tab');
            const menuSections = document.querySelectorAll('.menu-section');
            const clearArchiveBtn = document.getElementById('clearArchive');
            const archiveList = document.getElementById('archiveList');
            clearMessagesBtn = document.getElementById('clearMessages');

            // Tab navigation
            navTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    debugger;

                    const targetTab = tab.dataset.tab;
                    
                    // Update active tab
                    navTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    
                    // Update active section
                    menuSections.forEach(section => {
                        section.classList.remove('active');
                        if (section.id === `${targetTab}-menu`) {
                            section.classList.add('active');
                        }
                    });
                    
                    // Load archive when switching to archive tab
                    if (targetTab === 'archive') {
                        loadArchive();
                    }
                });
            });
            
            clearMessagesBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all messages from the current conversation?')) {
                    clearAllMessages();
                }
            });

            function clearAllMessages() {
                const responseDiv = document.getElementById('aiResponse');
                
                // Clear the response area
                responseDiv.innerHTML = '<div class="status">Messages cleared. Ready to start fresh!</div>';
                
                // Reset current conversation
                currentConversation = [];
                
                // Clear global text
                mainTextGlobal = '';
                
                // Clear storage if available
                if (typeof chrome !== 'undefined' && chrome.storage) {
                    chrome.storage.local.set({ currentConversation: [] });
                }
            }
            
            
            // Extract main text
            readBtn.addEventListener('click', async () => {
                // Clear the currently viewed conversation ID when starting fresh
                if (typeof chrome !== 'undefined' && chrome.storage) {
                    chrome.storage.local.set({ currentViewedConversationId: null });
                }
                
                let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                            let mainEl = '';
                            if (document.querySelector('main') != undefined) {
                                mainEl = document.querySelector('main');
                            } else if (document.querySelector('article') != undefined) {
                                mainEl = document.querySelector('article');
                            } else {
                                mainEl = document.body;
                            }
                            let mainText = mainEl.innerText;
                            return mainText;
                        }
                    }).then(injectionResults => {
                        mainTextGlobal = injectionResults[0].result;
                        appendMessage('System', 'Main text captured. Ready to send to AI!');
                    });
                } catch (err) {
                    console.error("Script execution failed:", err);
                    appendMessage('System', 'Error extracting main text.');
                }
            });
            
            aiBtn.addEventListener('click', async () => {
                var userPromptInput = document.getElementById('userPrompt');
                var userInputText = userPromptInput.value.trim();
                
                // If there's no user input and no extracted text, show error
                if (!userInputText && !mainTextGlobal) {
                    appendMessage('System', "Please extract the main text first or enter a message.");
                    return;
                }
                
                // Determine what to send as user message
                var currentUserMessage = userInputText || mainTextGlobal.trim();
                
                // Add user message to conversation
                if (userInputText) {
                    appendMessage('User', userInputText);
                    userPromptInput.value = ''; // Clear the input
                }
                
                appendMessage('System', "Sending to AI...");
                
                try {
                    const systemPrompt = document.getElementById('systemPrompt').value;

                    console.log('---------------------')
                    console.log(systemPrompt);
                    console.log('---------------------')
                    
                    if (!apiKey || !currentUserMessage) {
                        appendMessage('System', 'API key and message cannot be empty.');
                        return;
                    }
                    
                    const model = 'gemini-1.5-flash-latest';
                    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                    
                    // Build conversation history for context
                    const contents = [];
                    
                    // Add conversation history (excluding system messages)
                    currentConversation.forEach(msg => {
                        if (msg.sender === 'User') {
                            contents.push({
                                role: 'user',
                                parts: [{ text: msg.text }]
                            });
                        } else if (msg.sender === 'AI') {
                            contents.push({
                                role: 'model',
                                parts: [{ text: msg.text }]
                            });
                        }
                    });
                    
                    // Add current message if it's not already in conversation history
                    if (!userInputText) {
                        contents.push({
                            role: 'user',
                            parts: [{ text: currentUserMessage }]
                        });
                    }
                    
                    const payload = {
                        contents: contents
                    };
                    
                    if (systemPrompt.trim()) {
                        payload.systemInstruction = { parts: [{ text: systemPrompt }] };
                    }
                    
                    const apiResponse = await fetch(API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    });
                    
                    const responseData = await apiResponse.json();
                    
                    if (responseData.error) {
                        throw new Error(responseData.error.message);
                    }
                    
                    const text = responseData.candidates[0].content.parts[0].text;
                    appendMessage('AI', text);
                    
                } catch (err) {
                    console.error('API Error:', err.message);
                    appendMessage('System', `Error: ${err.message}`);
                }
            });
            
            // Clear archive
            clearArchiveBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all archived conversations?')) {
                    if (typeof chrome !== 'undefined' && chrome.storage) {
                        chrome.storage.local.set({ archivedConversations: [] }, () => {
                            loadArchive();
                        });
                    } 
                    else {
                        loadArchive();
                    }
                }
            });
            
            // Load existing messages
            loadCurrentConversation();
        });
        
        function appendMessage(sender, text) {
            const responseDiv = document.getElementById('aiResponse');

            const statusDiv = responseDiv.querySelector('.status');
            if (statusDiv) {
                statusDiv.remove();
            }

            const div = document.createElement('div');
            const timestamp = new Date().toLocaleTimeString();
            
            if (sender === 'System') {
                div.className = 'message system';
                div.textContent = text;
            } else {
                div.className = `message ${sender.toLowerCase()}`;
                div.innerHTML = `
                    <div class="message-header">
                        <span class="sender">${sender}</span>
                        <span class="timestamp">${timestamp}</span>
                    </div>
                    <div>${text}</div>
                `;
            }
            
            responseDiv.appendChild(div);
            responseDiv.scrollTop = responseDiv.scrollHeight;
            
            // Add to current conversation
            if (sender !== 'System') {
                currentConversation.push({ sender, text, timestamp });
                
                debugger;
                
                if (sender === 'AI') {
                    saveToArchive();
                }
            }
        }
        
        function loadCurrentConversation() {
             if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.get(['currentConversation'], (result) => {
                                if (result.currentConversation && result.currentConversation.length > 0) {
                                    currentConversation = result.currentConversation;
                                    const responseDiv = document.getElementById('aiResponse');
                                    responseDiv.innerHTML = '<div class="status">Current conversation loaded</div>';
                                    
                                    currentConversation.forEach(msg => {
                                        appendMessage(msg.sender, msg.text);
                                    });
                                }
                            });
             }
        }
        
        function saveToArchive() {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.get(['archivedConversations'], (result) => {
                    const archived = result.archivedConversations || [];
                    const conversationCopy = [...currentConversation];
                    
                    archived.unshift({
                        id: Date.now(),
                        date: new Date().toLocaleString(),
                        messages: conversationCopy,
                        preview: conversationCopy[conversationCopy.length - 1]?.text.substring(0, 100) + '...'
                    });
                    
                    // Keep only last 50 conversations
                    if (archived.length > 50) {
                        archived.splice(50);
                    }
                    
                    chrome.storage.local.set({ 
                        archivedConversations: archived,
                        currentConversation: currentConversation
                    });
                });
            }
        }
        
       function loadArchive() {
            const archiveList = document.getElementById('archiveList');
            
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.get(['archivedConversations'], (result) => {
                    const archived = result.archivedConversations || [];
                    
                    if (archived.length === 0) {
                        archiveList.innerHTML = '<div class="status">No archived conversations yet</div>';
                        return;
                    }
                    
                    archiveList.innerHTML = '';
                    
                    archived.forEach(conversation => {
                        const div = document.createElement('div');
                        div.className = 'archive-item';
                        div.innerHTML = `
                            <div class="archive-header">
                                <span class="archive-date">${conversation.date}</span>
                                <button class="btn btn-danger" onclick="deleteConversation(${conversation.id})">Delete</button>
                            </div>
                            <div class="archive-content">${conversation.preview}</div>
                        `;
                        
                        div.addEventListener('click', (e) => {
                            if (e.target.tagName !== 'BUTTON') {
                                viewConversation(conversation);
                            }
                        });
                        
                        archiveList.appendChild(div);
                    });
                });
            } else {
                archiveList.innerHTML = '<div class="status">No archived conversations yet</div>';
            }
        }

         function deleteConversation(id) {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.get(['archivedConversations'], (result) => {
                    const archived = result.archivedConversations || [];
                    const filtered = archived.filter(conv => conv.id !== id);
                    
                    chrome.storage.local.set({ archivedConversations: filtered }, () => {
                        loadArchive();
                    });
                });
            }
        }
        
        function viewConversation(conversation) {
            // Switch to request tab and load conversation

            document.querySelector('[data-tab="request"]').click();
            
            const responseDiv = document.getElementById('aiResponse');
            // responseDiv.innerHTML = null;
            responseDiv.innerHTML = '<div class="status">Loading archived conversation...</div>';
            
            setTimeout(() => {
                responseDiv.innerHTML = '';
                conversation.messages.forEach(msg => {
                    const div = document.createElement('div');
                    div.className = `message ${msg.sender.toLowerCase()}`;
                    div.innerHTML = `
                        <div class="message-header">
                            <span class="sender">${msg.sender}</span>
                            <span class="timestamp">${msg.timestamp}</span>
                        </div>
                        <div>${msg.text}</div>
                    `;
                    responseDiv.appendChild(div);
                });
                responseDiv.scrollTop = responseDiv.scrollHeight;
            }, 100);
        }
        
        // Make delete function globally accessible
        window.deleteConversation = deleteConversation;



//         document.getElementById('saveKey').addEventListener('click', () => {
//   const apiKey = document.getElementById('apiKey').value;
//   chrome.storage.local.set({ apiKey }, () => {
//     alert('API açarı saxlandı!');
//   });
// });

let isRecording = false;
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDiv = document.getElementById('status');

startBtn.addEventListener('click', () => {
    debugger;
  if (!isRecording) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'start' }, (response) => {
        if (response && response.status === 'started') {
          isRecording = true;
          startBtn.disabled = true;
          stopBtn.disabled = false;
          statusDiv.innerText = 'Status: Record olunur...';
        }
      });
    });
  }
});

stopBtn.addEventListener('click', () => {
  if (isRecording) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'stop' }, (response) => {
        if (response && response.status === 'stopped') {
          isRecording = false;
          startBtn.disabled = false;
          stopBtn.disabled = true;
          statusDiv.innerText = 'Status: Dayandırıldı. Fayl saxlanıldı və xülasə hazırlanır...';
        }
      });
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'summary') {
    document.getElementById('summary').innerText = 'Xülasə: ' + message.text;
  }
});