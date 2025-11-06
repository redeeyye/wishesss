const SUPABASE_CONFIG = {
  url: "https://klxihhmbptpdzbpuyhyw.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtseGloaG1icHRwZHpicHV5aHl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwOTI2NTcsImV4cCI6MjA2NDY2ODY1N30.9XY4gXAA0I8I6z7AM6NdxSvC1E3oSDc4MAoJfuOjUtM", // REQUIRED: Replace with your actual anon public key
}

let supabase = null
let isSupabaseConnected = false
const connectionAttempts = 0
const MAX_CONNECTION_ATTEMPTS = 3

async function testSupabaseConnection() {
  if (!supabase) {
    console.error("❌ Supabase client not initialized")
    return false
  }

  try {
    console.log("🔄 Testing Supabase connection...")
    const { data, error } = await supabase.from("birthday_wishes").select("count").limit(1)

    if (error) {
      console.error("❌ Database connection failed:", error.message)
      console.error("Full error details:", error)
      return false
    }

    console.log("✅ Database connection successful!")
    return true
  } catch (err) {
    console.error("❌ Connection test failed:", err)
    return false
  }
}

function showConnectionError(message) {
  const container = document.querySelector(".container")
  if (container) {
    container.innerHTML = `
      <div class="connection-error">
        <div class="error-icon">⚠️</div>
        <h2>Database Connection Required</h2>
        <p>${message}</p>
        <div class="error-details">
          <h3>Setup Instructions:</h3>
          <ol>
            <li>Create a Supabase project at <a href="https://supabase.com" target="_blank">supabase.com</a></li>
            <li>Run the SQL script to create the birthday_wishes table</li>
            <li>Get your Project URL and anon key from Settings → API</li>
            <li>Update SUPABASE_CONFIG in script.js with your credentials</li>
          </ol>
        </div>
        <button onclick="location.reload()" class="retry-btn">
          🔄 Retry Connection
        </button>
      </div>
    `
  }
}

async function initializeApp() {
  console.log("🚀 Initializing Birthday Messages for Vaishnavi...")

  if (typeof window.supabase === "undefined") {
    console.error("❌ Supabase library failed to load")
    showConnectionError("Supabase library could not be loaded. Please check your internet connection.")
    return
  }

  if (
    SUPABASE_CONFIG.url === "https://your-project-ref.supabase.co" ||
    SUPABASE_CONFIG.key === "your-anon-public-key-here" ||
    !SUPABASE_CONFIG.url ||
    !SUPABASE_CONFIG.key
  ) {
    console.error("❌ Supabase credentials not configured")
    showConnectionError(
      "Database credentials are not configured. Please update SUPABASE_CONFIG in script.js with your Supabase URL and anon key.",
    )
    return
  }

  if (!SUPABASE_CONFIG.url.includes(".supabase.co")) {
    console.error("❌ Invalid Supabase URL format")
    showConnectionError("Invalid Supabase URL format. URL should end with '.supabase.co'")
    return
  }

  try {
    console.log("🔧 Creating Supabase client...")
    supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key)

    let connectionSuccess = false

    for (let attempt = 1; attempt <= MAX_CONNECTION_ATTEMPTS; attempt++) {
      console.log(`🔄 Connection attempt ${attempt}/${MAX_CONNECTION_ATTEMPTS}`)
      connectionSuccess = await testSupabaseConnection()

      if (connectionSuccess) {
        break
      }

      if (attempt < MAX_CONNECTION_ATTEMPTS) {
        console.log("⏳ Retrying in 2 seconds...")
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }

    if (connectionSuccess) {
      isSupabaseConnected = true
      updateStatus("online")
      console.log("✅ Successfully connected to Supabase database!")

      enableForm()
    } else {
      throw new Error(`Failed to connect after ${MAX_CONNECTION_ATTEMPTS} attempts`)
    }
  } catch (error) {
    console.error("❌ Database connection failed:", error)
    showConnectionError(
      `Database connection failed: ${error.message}. Please check your Supabase configuration and try again.`,
    )
  }
}

function enableForm() {
  const form = document.getElementById("wishForm")
  const submitBtn = document.getElementById("submitBtn")

  if (form && submitBtn) {
    form.style.opacity = "1"
    form.style.pointerEvents = "auto"
    submitBtn.disabled = false
    console.log("✅ Form enabled - ready to collect wishes!")
  }
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

  return true
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
  hideElement("loading")
}

async function handleFormSubmission(e) {
  e.preventDefault()

  if (!isSupabaseConnected || !supabase) {
    alert("❌ Database connection required! Please refresh the page and ensure your database is configured.")
    return
  }

  const form = e.target
  const submitBtn = document.getElementById("submitBtn")

  hideAllMessages()
  showElement("loading")
  submitBtn.disabled = true

  try {
    const formData = new FormData(form)
    validateForm(formData)

    const wishData = {
      id: String(Date.now()),
      name: formData.get("name").trim(),
      message: formData.get("message").trim(),
      timestamp: new Date().toISOString(),
    }

    console.log("📤 Saving wish to database...")

    const { data, error } = await supabase.from("birthday_wishes").insert([wishData])

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    console.log("✅ Wish saved successfully to database!")
    hideElement("loading")
    showElement("successMessage")
    form.reset()
    submitBtn.disabled = false

    setTimeout(() => hideElement("successMessage"), 5000)
  } catch (error) {
    console.error("❌ Failed to save wish:", error)
    hideElement("loading")

    const errorDiv = document.getElementById("errorMessage")
    const errorText = errorDiv.querySelector(".error-text")
    errorText.textContent = `Failed to save wish: ${error.message}`
    showElement("errorMessage")

    setTimeout(() => hideElement("errorMessage"), 7000)
    submitBtn.disabled = false
  }
}


const keysPressed = {}

function handleKeyDown(e) {
  keysPressed[e.key] = true

  if (keysPressed["Control"] && keysPressed["Shift"] && keysPressed["A"]) {
    e.preventDefault()
    openAdminPanel()
  }
}

function handleKeyUp(e) {
  delete keysPressed[e.key]
}

function openAdminPanel() {
  if (!isSupabaseConnected) {
    alert("❌ Database connection required for admin access!")
    return
  }

  document.getElementById("adminPanel").style.display = "flex"
  document.getElementById("adminPassword").focus()
  console.log("🔐 Admin panel opened")
}

function closeAdmin() {
  document.getElementById("adminPanel").style.display = "none"
  document.getElementById("adminPassword").value = ""
  document.getElementById("adminMessage").textContent = ""
  console.log("🔐 Admin panel closed")
}

async function downloadJSON() {
  const password = document.getElementById("adminPassword").value
  const messageDiv = document.getElementById("adminMessage")
// not safe but who cares
  if (password !== "Vaishnavi12") {
    messageDiv.textContent = "❌ Incorrect password!"
    messageDiv.style.color = "#ff6b6b"
    messageDiv.style.background = "rgba(255, 107, 107, 0.2)"
    messageDiv.style.border = "1px solid rgba(255, 107, 107, 0.3)"
    messageDiv.style.padding = "12px"
    messageDiv.style.borderRadius = "8px"
    console.log("🔐 Invalid password attempt")
    return
  }

  if (!isSupabaseConnected || !supabase) {
    messageDiv.textContent = "❌ Database connection required!"
    messageDiv.style.color = "#ff6b6b"
    messageDiv.style.background = "rgba(255, 107, 107, 0.2)"
    messageDiv.style.border = "1px solid rgba(255, 107, 107, 0.3)"
    messageDiv.style.padding = "12px"
    messageDiv.style.borderRadius = "8px"
    return
  }

  try {
    messageDiv.textContent = "⏳ Downloading wishes from database..."
    messageDiv.style.color = "#4299e1"
    messageDiv.style.background = "rgba(66, 153, 225, 0.2)"
    messageDiv.style.border = "1px solid rgba(66, 153, 225, 0.3)"
    messageDiv.style.padding = "12px"
    messageDiv.style.borderRadius = "8px"

 
    const { data, error } = await supabase.from("birthday_wishes").select("*").order("timestamp", { ascending: false })

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    if (!data || data.length === 0) {
      messageDiv.textContent = "📭 No wishes found in database"
      messageDiv.style.color = "#ffa500"
      return
    }

 
    const wishes = data.map((wish) => ({
      id: String(wish.id),
      name: wish.name,
      message: wish.message,
      timestamp: wish.timestamp,
    }))

 
    const jsonData = JSON.stringify(wishes, null, 4)
    const blob = new Blob([jsonData], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = `Vaishnavi_birthday_wishes_${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    messageDiv.textContent = `✅ Downloaded ${wishes.length} wishes successfully!`
    messageDiv.style.color = "#51cf66"
    messageDiv.style.background = "rgba(81, 207, 102, 0.2)"
    messageDiv.style.border = "1px solid rgba(81, 207, 102, 0.3)"
    console.log(`📥 JSON file downloaded with ${wishes.length} wishes`)

    setTimeout(closeAdmin, 2000)
  } catch (error) {
    console.error("❌ Error downloading JSON:", error)
    messageDiv.textContent = `❌ Download failed: ${error.message}`
    messageDiv.style.color = "#ff6b6b"
    messageDiv.style.background = "rgba(255, 107, 107, 0.2)"
    messageDiv.style.border = "1px solid rgba(255, 107, 107, 0.3)"
    messageDiv.style.padding = "12px"
    messageDiv.style.borderRadius = "8px"
  }
}

function loadSupabase() {
  console.log("📦 Loading Supabase library...")
  const script = document.createElement("script")
  script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
  script.onload = () => {
    console.log("✅ Supabase library loaded successfully")
    initializeApp()
  }
  script.onerror = () => {
    console.error("❌ Failed to load Supabase library")
    showConnectionError("Failed to load Supabase library. Please check your internet connection and try again.")
  }
  document.head.appendChild(script)
}

function preventDevTools() {
  document.addEventListener("contextmenu", (e) => e.preventDefault())

  document.addEventListener("keydown", (e) => {
    if (
      e.key === "F12" ||
      (e.ctrlKey && e.shiftKey && e.key === "I") ||
      (e.ctrlKey && e.shiftKey && e.key === "C") ||
      (e.ctrlKey && e.key === "U")
    ) {
      if (!(e.ctrlKey && e.shiftKey && e.key === "A")) {
        e.preventDefault()
      }
    }
  })

  console.log("%c🎂 Birthday Messages for Vaishnavi", "color: #ff6b9d; font-size: 24px; font-weight: bold;")
  console.log("%c✨ Database-only mode - Crafted by redeye", "color: #c44569; font-size: 14px;")
}

function setupEventListeners() {
  const wishForm = document.getElementById("wishForm")
  if (wishForm) {
    wishForm.addEventListener("submit", handleFormSubmission)
  }

  document.addEventListener("keydown", handleKeyDown)
  document.addEventListener("keyup", handleKeyUp)

  const adminPassword = document.getElementById("adminPassword")
  if (adminPassword) {
    adminPassword.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        downloadJSON()
      }
    })
  }

  const adminPanel = document.getElementById("adminPanel")
  if (adminPanel) {
    adminPanel.addEventListener("click", (e) => {
      if (e.target === adminPanel) {
        closeAdmin()
      }
    })
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("🎉 Birthday Messages for Vaishnavi - Database-only mode")

  disableForm()

  updateStatus("connecting")

  setupEventListeners()

  loadSupabase()

  preventDevTools()

  console.log("🔄 Attempting database connection...")
})

window.closeAdmin = closeAdmin
window.downloadJSON = downloadJSON
