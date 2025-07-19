// 🎯 Alpha Assistant v7.0 - Cyberpunk Interface with Auto-Continue
// Created by Subinay Nath - Enhanced with Groq AI

const display = document.getElementById("display")
const speakButton = document.getElementById("speakButton")
const stopButton = document.getElementById("stopButton")
const buttonText = document.getElementById("buttonText")
const autoContinueIndicator = document.getElementById("autoContinueIndicator")

// 🔐 Groq API Configuration
const GROQ_API_KEY = "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"
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

// 💭 Conversation Memory
let conversationHistory = []
const MAX_HISTORY = 10 // Keep last 10 exchanges

// 🎛️ Auto-continue settings
const autoContinueEnabled = true
let autoContinueTimeout = null
const AUTO_CONTINUE_DELAY = 2000 // 2 seconds after speech ends

// Function to add to conversation history
function addToHistory(userMessage, aiResponse) {
  conversationHistory.push({
    user: userMessage,
    assistant: aiResponse,
    timestamp: new Date().toISOString(),
  })

  // Keep only the last MAX_HISTORY exchanges
  if (conversationHistory.length > MAX_HISTORY) {
    conversationHistory = conversationHistory.slice(-MAX_HISTORY)
  }

  console.log("💭 Conversation history updated:", conversationHistory.length, "exchanges")
}

// Function to get conversation context
function getConversationContext() {
  if (conversationHistory.length === 0) return ""

  let context = "\n\nPREVIOUS CONVERSATION:\n"
  conversationHistory.forEach((exchange, index) => {
    context += `${index + 1}. User: ${exchange.user}\n`
    context += `   Alpha: ${exchange.assistant}\n`
  })
  context += "\nPlease consider this conversation history when responding to the current question.\n"

  return context
}

// Function to clear conversation history
function clearHistory() {
  conversationHistory = []
  console.log("💭 Conversation history cleared")
}

// Function to show auto-continue indicator
function showAutoContinueIndicator() {
  autoContinueIndicator.classList.add("show")
  setTimeout(() => {
    autoContinueIndicator.classList.remove("show")
  }, 3000)
}

// Function to stop all activities
function stopAllActivities() {
  // Stop speech recognition
  if (recognition && isListening) {
    recognition.stop()
  }

  // Stop speech synthesis
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel()
  }

  // Clear auto-continue timeout
  if (autoContinueTimeout) {
    clearTimeout(autoContinueTimeout)
    autoContinueTimeout = null
  }

  // Reset states
  isListening = false
  isSpeaking = false
  isProcessing = false

  // Update UI
  updateUI()
  display.textContent = "All activities stopped. Ready for new command."

  console.log("🛑 All activities stopped")
}

// 🎙️ Speech Recognition Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
let recognition = null

if (SpeechRecognition) {
  recognition = new SpeechRecognition()
  recognition.continuous = false
  recognition.interimResults = false
  recognition.lang = "en-US"
}

let isListening = false
let isSpeaking = false
let isProcessing = false

// 🎯 Speech Recognition Events
if (recognition) {
  recognition.onstart = () => {
    console.log("🎤 Voice recognition activated")
    isListening = true
    updateUI()
    display.textContent = "Listening... Speak your command now!"
  }

  recognition.onresult = (event) => {
    const resultReceived = event.results[0][0].transcript
    console.log("📝 Voice command:", resultReceived)

    isListening = false
    updateUI()

    display.textContent = `You said: "${resultReceived}"`

    // Process the command with AI
    processCommand(resultReceived)
  }

  recognition.onerror = (event) => {
    console.error("❌ Speech recognition error:", event.error)
    isListening = false
    updateUI()
    display.textContent = "Speech recognition error. Please try again."

    // Auto-continue after error if enabled
    if (autoContinueEnabled && !isProcessing) {
      scheduleAutoContinue()
    }
  }

  recognition.onend = () => {
    isListening = false
    updateUI()
  }
}

// 🎯 Button Event Listeners
speakButton.addEventListener("click", () => {
  if (!recognition) {
    display.textContent = "Speech recognition not supported in this browser."
    return
  }

  if (isListening) {
    recognition.stop()
  } else if (!isProcessing) {
    // Clear any pending auto-continue
    if (autoContinueTimeout) {
      clearTimeout(autoContinueTimeout)
      autoContinueTimeout = null
    }
    recognition.start()
  }
})

// Stop button event listener
stopButton.addEventListener("click", () => {
  stopAllActivities()
})

// 🎯 Command Execution Function
function executeCommand(command) {
  if (isProcessing) return

  // Clear any pending auto-continue
  if (autoContinueTimeout) {
    clearTimeout(autoContinueTimeout)
    autoContinueTimeout = null
  }

  display.textContent = `Executing: "${command}"`
  processCommand(command)
}

// Function to schedule auto-continue
function scheduleAutoContinue() {
  if (!autoContinueEnabled || isListening || isProcessing || isSpeaking) return

  console.log("⏰ Scheduling auto-continue in", AUTO_CONTINUE_DELAY, "ms")

  autoContinueTimeout = setTimeout(() => {
    if (!isListening && !isProcessing && !isSpeaking && recognition) {
      console.log("🔄 Auto-continuing conversation...")
      showAutoContinueIndicator()
      recognition.start()
    }
  }, AUTO_CONTINUE_DELAY)
}

// 🤖 Main Command Processing Function
async function processCommand(userInput) {
  if (isProcessing) return

  isProcessing = true
  updateUI()

  display.textContent = "Alpha is processing your request..."

  try {
    // Get AI response from Groq with conversation context
    const aiResponse = await getGroqAIResponse(userInput)

    // Add to conversation history
    addToHistory(userInput, aiResponse)

    // Check if AI wants to open a website
    const urlMatch = aiResponse.match(/OPEN_URL:\s*(https?:\/\/[^\s]+)/i)

    if (urlMatch) {
      const url = urlMatch[1]
      const cleanResponse = aiResponse.replace(/OPEN_URL:\s*https?:\/\/[^\s]+/i, "").trim()

      display.textContent = `Alpha says: ${cleanResponse}`
      speak(cleanResponse)

      // Open URL after a short delay
      setTimeout(() => {
        window.open(url, "_blank")
      }, 1000)
    } else {
      display.textContent = `Alpha says: ${aiResponse}`
      speak(aiResponse)
    }
  } catch (error) {
    console.error("🚨 AI Processing Error:", error)
    const errorMessage = "I'm experiencing technical difficulties. Please try again."
    display.textContent = `Error: ${errorMessage}`
    speak(errorMessage)
  }

  isProcessing = false
  updateUI()
}

// 🧠 Groq AI Integration with Conversation Memory
async function getGroqAIResponse(prompt) {
  const conversationContext = getConversationContext()

  const systemPrompt = `You are Alpha, an intelligent digital assistant created by Subinay Nath. You are helpful, knowledgeable, and friendly.

IMPORTANT INSTRUCTIONS:
- If the user asks you to open a website (like "open YouTube", "open Google", etc.), respond with your message followed by "OPEN_URL: [website_url]" on a new line
- For common websites, use these URLs:
  * YouTube: https://youtube.com
  * Google: https://google.com
  * Gmail: https://gmail.com
  * Facebook: https://facebook.com
  * Twitter/X: https://twitter.com
  * Instagram: https://instagram.com
  * LinkedIn: https://linkedin.com
  * GitHub: https://github.com
  * Netflix: https://netflix.com
  * Amazon: https://amazon.com
- Keep responses conversational and under 150 words
- You can answer any question, solve problems, tell jokes, provide explanations, and help with various tasks
- Be creative and engaging in your responses
- IMPORTANT: Consider the previous conversation history when responding. If the user refers to "that", "it", "the previous answer", or asks follow-up questions, use the context from previous exchanges
- If the user asks follow-up questions, build upon your previous responses naturally${conversationContext}`

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 250,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  } catch (error) {
    console.error("🚨 Primary Groq model failed:", error)

    // Fallback to smaller model with same conversation context
    try {
      const fallbackResponse = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 250,
          temperature: 0.7,
        }),
      })

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json()
        return fallbackData.choices[0].message.content
      }
    } catch (fallbackError) {
      console.error("🚨 Fallback model also failed:", fallbackError)
    }

    throw new Error("AI service temporarily unavailable")
  }
}

// 🔊 Text-to-Speech Function with Auto-Continue
function speak(text) {
  if (isSpeaking) {
    window.speechSynthesis.cancel()
  }

  isSpeaking = true
  updateUI()

  const speakIt = new SpeechSynthesisUtterance(`Alpha says: ${text}`)
  speakIt.volume = 1
  speakIt.rate = 0.9
  speakIt.pitch = 1

  speakIt.onstart = () => {
    isSpeaking = true
    updateUI()
    console.log("🔊 Speech started")
  }

  speakIt.onend = () => {
    isSpeaking = false
    updateUI()
    console.log("🔊 Speech ended")

    // Schedule auto-continue after speech ends
    if (autoContinueEnabled) {
      scheduleAutoContinue()
    }
  }

  speakIt.onerror = () => {
    isSpeaking = false
    updateUI()
    console.log("🔊 Speech error")

    // Schedule auto-continue after speech error
    if (autoContinueEnabled) {
      scheduleAutoContinue()
    }
  }

  window.speechSynthesis.speak(speakIt)
}

// 🎨 UI Update Function
function updateUI() {
  if (isListening) {
    buttonText.textContent = "Listening..."
    speakButton.classList.add("listening")
    speakButton.classList.remove("processing")
  } else if (isProcessing) {
    buttonText.textContent = "Processing..."
    speakButton.classList.remove("listening")
    speakButton.classList.add("processing")
  } else {
    buttonText.textContent = "Speak"
    speakButton.classList.remove("listening")
    speakButton.classList.remove("processing")
  }
}

// 🚀 Initialize the application
console.log("🤖 Alpha Assistant v7.0 - Cyberpunk Interface with Auto-Continue")
console.log("🧠 Powered by Groq AI with Conversation Memory")
console.log("💭 Can remember last", MAX_HISTORY, "conversation exchanges")
console.log("🔄 Auto-continue enabled after speech ends")
console.log("🛑 Stop button available to halt all activities")
console.log("👨‍💻 Created by Subinay Nath")

// Check if speech recognition is supported
if (!recognition) {
  display.textContent = "Speech recognition not supported. Please use Chrome, Edge, or Safari."
  speakButton.style.opacity = "0.5"
  speakButton.style.cursor = "not-allowed"
}

// Add keyboard shortcuts
document.addEventListener("keydown", (event) => {
  // Ctrl+Shift+C to clear conversation history
  if (event.ctrlKey && event.shiftKey && event.key === "C") {
    clearHistory()
    display.textContent = "Conversation history cleared. Starting fresh!"
    console.log("🗑️ History cleared via keyboard shortcut")
  }

  // Escape key to stop all activities
  if (event.key === "Escape") {
    stopAllActivities()
  }

  // Spacebar to start/stop listening (when not typing in input fields)
  if (event.code === "Space" && !event.target.matches("input, textarea")) {
    event.preventDefault()
    if (isListening) {
      recognition.stop()
    } else if (!isProcessing && recognition) {
      recognition.start()
    }
  }
})

// Add visibility change handler to pause auto-continue when tab is not visible
document.addEventListener("visibilitychange", () => {
  if (document.hidden && autoContinueTimeout) {
    clearTimeout(autoContinueTimeout)
    autoContinueTimeout = null
    console.log("⏸️ Auto-continue paused - tab not visible")
  }
})
