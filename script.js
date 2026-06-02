let isDatabaseConnected = false
const submittedWishStorageKey = "rashiWishSubmitted"

function showConnectionError(message) {
  const container = document.querySelector(".container")
  if (container) {
    container.innerHTML = `
      <div class="connection-error">
        <div class="error-icon">!</div>
        <h2>Database Connection Required</h2>
        <p>${message}</p>
        <div class="error-details">
          <h3>Setup Instructions:</h3>
          <ol>
            <li>Create a MongoDB database locally or with MongoDB Atlas</li>
            <li>Copy .env.example to .env</li>
            <li>Add your MongoDB URI and cookie secret to .env</li>
            <li>Start the app with pnpm start</li>
          </ol>
        </div>
        <button onclick="location.reload()" class="retry-btn">
          Retry Connection
        </button>
      </div>
    `
  }
}

async function requestJSON(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || "Request failed")
  }

  return data
}

async function initializeApp() {
  console.log("Initializing Birthday Messages for Rashi...")

  try {
    const health = await requestJSON("/api/health")

    if (!health.databaseConnected) {
      throw new Error(health.error || "Database is not configured")
    }

    isDatabaseConnected = true
    updateStatus("online")
    if (health.hasSubmittedWish || localStorage.getItem(submittedWishStorageKey) === "true") {
      markWishSubmitted()
    } else {
      enableForm()
    }
    console.log("Database API is ready")
  } catch (error) {
    console.error("Database API connection failed:", error)
    showConnectionError(`Database connection failed: ${error.message}. Please check your server environment.`)
  }
}

function enableForm() {
  const form = document.getElementById("wishForm")
  const submitBtn = document.getElementById("submitBtn")

  if (form && submitBtn) {
    form.style.opacity = "1"
    form.style.pointerEvents = "auto"
    submitBtn.disabled = false
  }
}

function markWishSubmitted(options = {}) {
  const form = document.getElementById("wishForm")
  const submitBtn = document.getElementById("submitBtn")
  const nameInput = document.getElementById("name")
  const messageInput = document.getElementById("message")

  localStorage.setItem(submittedWishStorageKey, "true")

  if (form && submitBtn) {
    form.style.opacity = "0.75"
    form.style.pointerEvents = "none"
    submitBtn.disabled = true
    const buttonText = submitBtn.querySelector(".btn-text")
    if (buttonText) buttonText.textContent = "Wish Sent"
  }

  if (nameInput) nameInput.disabled = true
  if (messageInput) messageInput.disabled = true

  if (options.hideMessages !== false) {
    hideAllMessages()
  }

  showElement("alreadySubmittedMessage")
}

function disableForm() {
  const form = document.getElementById("wishForm")
  const submitBtn = document.getElementById("submitBtn")

  if (form && submitBtn) {
    form.style.opacity = "0.5"
    form.style.pointerEvents = "none"
    submitBtn.disabled = true
  }
}

function updateStatus(status) {
  const indicator = document.getElementById("statusIndicator")
  const text = indicator.querySelector(".status-text")

  if (status === "online") {
    text.textContent = "Connected"
    indicator.className = "status-indicator status-online"
  } else {
    text.textContent = "Connecting..."
    indicator.className = "status-indicator status-connecting"
  }
}

function validateForm(formData) {
  const name = formData.get("name").trim()
  const message = formData.get("message").trim()

  if (!name || name.length < 2) {
    throw new Error("Please enter a valid name (at least 2 characters)")
  }

  if (!message || message.length < 5) {
    throw new Error("Please write a meaningful message (at least 5 characters)")
  }

  return { name, message }
}

function showElement(elementId) {
  const element = document.getElementById(elementId)
  if (element) element.style.display = "block"
}

function hideElement(elementId) {
  const element = document.getElementById(elementId)
  if (element) element.style.display = "none"
}

function hideAllMessages() {
  hideElement("successMessage")
  hideElement("errorMessage")
  hideElement("alreadySubmittedMessage")
  hideElement("loading")
}

async function handleFormSubmission(e) {
  e.preventDefault()

  if (!isDatabaseConnected) {
    alert("Database connection required. Please refresh the page and ensure your server is configured.")
    return
  }

  const form = e.target
  const submitBtn = document.getElementById("submitBtn")

  hideAllMessages()
  showElement("loading")
  submitBtn.disabled = true

  try {
    if (localStorage.getItem(submittedWishStorageKey) === "true") {
      markWishSubmitted()
      return
    }

    const payload = validateForm(new FormData(form))

    await requestJSON("/api/wishes", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    hideElement("loading")
    showElement("successMessage")
    form.reset()
    markWishSubmitted({ hideMessages: false })

    setTimeout(() => hideElement("successMessage"), 5000)
  } catch (error) {
    console.error("Failed to save wish:", error)
    hideElement("loading")

    const errorDiv = document.getElementById("errorMessage")
    const errorText = errorDiv.querySelector(".error-text")
    if (error.message.includes("already sent")) {
      markWishSubmitted()
      return
    }

    errorText.textContent = `Failed to save wish: ${error.message}`
    showElement("errorMessage")

    setTimeout(() => hideElement("errorMessage"), 7000)
  } finally {
    if (localStorage.getItem(submittedWishStorageKey) !== "true") {
      submitBtn.disabled = false
    }
  }
}

function logAppReady() {
  console.log("%cBirthday Messages for Rashi", "color: #ff6b9d; font-size: 24px; font-weight: bold;")
  console.log("%cDatabase access is handled by the server API.", "color: #c44569; font-size: 14px;")
}

function setupEventListeners() {
  const wishForm = document.getElementById("wishForm")
  if (wishForm) {
    wishForm.addEventListener("submit", handleFormSubmission)
  }
}

document.addEventListener("DOMContentLoaded", () => {
  disableForm()
  updateStatus("connecting")
  setupEventListeners()
  initializeApp()
  logAppReady()
})
