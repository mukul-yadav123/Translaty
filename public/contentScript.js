chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractMessages') {
    // Select all message elements containing the message text
    const messageElements = document.querySelectorAll('span._ao3e.selectable-text.copyable-text');
    // Debugging: log how many elements were selected
    console.log('Message elements found:', messageElements.length);

    let messages = [];

    messageElements.forEach((element) => {
      const messageText = element.innerText.trim(); // Get the inner text and trim whitespace
      if (messageText) {
        messages.push(messageText); // Push non-empty messages to the array
      }
    });

    // Send the extracted messages back to the React component
    sendResponse({ messages: messages });

    // Debugging: Log extracted messages to ensure they were captured
    console.log('Extracted messages:', messages);
  }
});

// Content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'sendMessage') {
    const message = request.message;
    sendWhatsAppMessage(message); // Call existing function for original message sending
    sendResponse({ status: 'success' });
  } else {
    sendResponse({ status: 'unknown_action' });
  }
});

let currentTextField = 0;

// Existing function for sending messages (unchanged)
function sendWhatsAppMessage(message) {
  const inputs = document.querySelectorAll('span._ao3e.selectable-text.copyable-text');
  
  if (inputs.length > 0) {
    const input = inputs[currentTextField];
    console.log('input', input);
    currentTextField++;
    if (currentTextField === inputs.length) {
      currentTextField = 0; 
    }

    // Set the new message
    input.innerText = message;

    // Create and dispatch the keydown event for 'Enter'
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
      keyCode: 13,
      code: 'Enter',
    });
    input.dispatchEvent(event); // Dispatch the event to send the message

  } else {
    console.error('Input field not found');
  }
}

// New function for sending translated messages
function sendTranslatedWhatsAppMessage(message) {
  // Select the input field for typing messages
  console.log('translated message',message)
  const allMessages = document.querySelectorAll('span._ao3e.selectable-text.copyable-text');
  const latestMessage = allMessages[allMessages.length-1];
  console.log(latestMessage)

  if (latestMessage) {
    // Clear any existing content in the input
    latestMessage.innerText = message;

    // Create and dispatch the keydown event for 'Enter'
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
      keyCode: 13,
      code: 'Enter',
    });
    latestMessage.dispatchEvent(event);
  } else {
    console.error('Input field not found');
  }
}

const availableLanguages = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  'zh-CN': 'Chinese (Simplified)',
};

// Function to translate messages
const translateMessage = async (message, targetLanguage) => {
  const sourceLanguage = 'en'; // Set your source language
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(message)}&langpair=${sourceLanguage}|${targetLanguage}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.responseData.translatedText;
  } catch (error) {
    console.error('Error translating message:', error);
    return null;
  }
};

// Function to monitor new messages
const monitorMessages = (targetLanguage) => {
  const chatContainerSelector = 'div.x3psx0u.xwib8y2.xkhd6sd.xrmvbpv'; // Update with the correct selector
  const chatContainer = document.querySelector(chatContainerSelector);

  if (!chatContainer) {
    console.error('Chat container not found');
    return;
  }

  const observer = new MutationObserver((mutationsList) => {
    for (let mutation of mutationsList) {
      if (mutation.type === 'childList') {
        const newMessages = Array.from(mutation.addedNodes);
        console.log('newmessages', newMessages);

        newMessages.forEach(async (messageNode) => {
          console.log('messageNode', messageNode);
          const messageTextElement = messageNode.querySelector('span._ao3e.selectable-text.copyable-text');
          console.log(messageTextElement);

          if (messageNode.nodeType === Node.ELEMENT_NODE) {
            // Check if this is a sent message
            if (messageTextElement) {
              // Delay to allow for message processing
              setTimeout(async () => {
                const messageText = messageTextElement.innerText; // Finalized sent message text

                if (messageText) {
                  const translatedText = await translateMessage(messageText, targetLanguage);
                  if (translatedText) {
                    // Send translated message to WhatsApp
                    sendTranslatedWhatsAppMessage(translatedText); // Use the new function
                  }
                }
              }, 100); // Adjust this delay as necessary (100ms is a starting point)
            } else {
              // Handle the case for typing (not necessary for translation)
              const inputTextElement = messageNode.querySelector('.selectable-text.copyable-text');
              if (inputTextElement) {
                console.log('User is typing, current input:', inputTextElement.innerText);
              }
            }
          }
        });
      }
    }
  });

  observer.observe(chatContainer, { childList: true, subtree: true });
};

// Listen for messages from the React app to start monitoring
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startMonitoring') {
    const targetLanguage = request.language;
    monitorMessages(targetLanguage);
    sendResponse({ status: 'Monitoring started for new messages.' });
  }
});
