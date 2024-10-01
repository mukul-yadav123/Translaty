import React, { useState, useEffect } from 'react';
import axios from 'axios';

const WhatsAppMessageReader = () => {
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [translatedMessages, setTranslatedMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableLanguages] = useState([
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
  ]);


  const extractMessages = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'extractMessages' }, (response) => {
        if (response && response.messages) {
          localStorage.setItem('messages', JSON.stringify(response.messages));
          console.log('Messages extracted and stored in localStorage');
        } else {
          console.log('No message extracted');
        }
      });
    });
  };

  const handleLanguageChange = (event) => {
    const selectedLang = event.target.value;
    setSelectedLanguage(selectedLang);
  
    const storedMessages = JSON.parse(localStorage.getItem('messages'));
    
    if (!storedMessages || storedMessages.length === 0) {
      console.error('No messages found in localStorage for translation.');
      return;
    }
  
    translateMessages(storedMessages, selectedLang);
    
    // Start monitoring new messages in the selected language
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'startMonitoring', language: selectedLang }, (response) => {
        console.log(response.status);
      });
    });
  };
  

  const translateMessages = async (messages, targetLanguage) => {
    const translatedMessages = [];
    const sourceLanguage = 'en'; 
    setLoading(true);
    setError('');

    try {
      for (const msg of messages) {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(msg)}&langpair=${sourceLanguage}|${targetLanguage}`;
        const response = await axios.get(url);
        translatedMessages.push(response.data.responseData.translatedText);
      }
      console.log('Translated Messages:', translatedMessages);
      setTranslatedMessages(translatedMessages);
    } catch (error) {
      console.error('Error translating messages:', error);
      setError('Failed to translate messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const translateMessage = async (message, targetLanguage) => {
    const sourceLanguage = 'en'; 
    setLoading(true);
    setError('');

    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(message)}&langpair=${sourceLanguage}|${targetLanguage}`;
      const response = await axios.get(url);
      const translatedText = response.data.responseData.translatedText;
      console.log('Translated New Message:', translatedText);
      sendMessageToWhatsApp(translatedText); // Send translated message to WhatsApp
    } catch (error) {
      console.error('Error translating new message:', error);
      setError('Failed to translate new message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendMessageToWhatsApp = (message) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'sendMessage', message }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error sending message:', chrome.runtime.lastError.message);
        } else if (response && response.status === 'success') {
          console.log('Message sent to WhatsApp successfully');
        } else {
          console.error('Failed to send message to WhatsApp, status:', response.status);
        }
      });
    });
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">WhatsApp Message Reader</h2>
      <button onClick={extractMessages} className="bg-blue-500 text-white p-2 rounded mb-4">
        Extract WhatsApp Messages
      </button>
      <div className="mb-4">
        <label htmlFor="language-select" className="mr-2">Select Language:</label>
        <select
          id="language-select"
          value={selectedLanguage}
          onChange={handleLanguageChange}
          className="p-2 border rounded"
        >
          <option value="">--Select--</option>
          {availableLanguages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Translating messages, please wait...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {translatedMessages.length > 0 && (
        <div>
          <h3 className="mt-4 text-lg font-semibold">Translated Messages:</h3>
          <ul>
            {translatedMessages.map((msg, index) => (
              <li key={index} className="border-b py-2">{msg}</li>
            ))}
          </ul>
          <button 
            onClick={() => translatedMessages.forEach(sendMessageToWhatsApp)}
            className="bg-green-500 text-white p-2 rounded mt-4"
          >
            Send Translated Messages to WhatsApp
          </button>
        </div>
      )}
    </div>
  );
};

export default WhatsAppMessageReader;
