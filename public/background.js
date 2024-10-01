// // public/background.js

// // Listen for extension icon click
// chrome.action.onClicked.addListener((tab) => {
//     // Check if the active tab is WhatsApp Web
//     if (tab.url.includes("web.whatsapp.com")) {
//       // Send a message to the content script to extract WhatsApp messages
//       chrome.tabs.sendMessage(tab.id, { action: "extractMessages" }, (response) => {
//         const messages = response ? response.messages : [];
  
//         // Store messages in local storage (or pass via message to the new tab)
//         chrome.storage.local.set({ whatsappMessages: messages }, () => {
//           // Open the extension's new tab
//           chrome.tabs.create({
//             url: chrome.runtime.getURL("index.html")
//           });
//         });
//       });
//     }
//   });
  