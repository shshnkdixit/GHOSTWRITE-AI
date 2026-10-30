/* =========================================
   GHOSTWRITE AI — MAIN APPLICATION
   ========================================= */

"use strict";

// ==========================================
// CONFIGURATION
// ==========================================

// Change this if you want to use another
// compatible model installed in Ollama.
const CONFIG = {
    ollamaUrl: "http://localhost:11434/api/generate",
    model: "llama3.2",
    maxTokens: 650,
    requestTimeout: 120000,
    memoryKey: "ghostwrite_memories_v1"
};

// ==========================================
// DOM ELEMENTS
// ==========================================

const $ = (selector) => document.querySelector(selector);

const storyForm = $("#storyForm");
const storyPrompt = $("#storyPrompt");
const storyGenre = $("#storyGenre");
const storyResult = $("#storyResult");
const generateButton = $("#generateButton");
const storyMode = $("#storyMode");
const transmissionId = $("#transmissionId");
const wordCount = $("#wordCount");
const promptCount = $("#promptCount");

const terminalForm = $("#terminalForm");
const terminalInput = $("#terminalInput");
const terminalOutput = $("#terminalOutput");

const memoryForm = $("#memoryForm");
const memoryList = $("#memoryList");
const memoryCount = $("#memoryCount");

const toastElement = $("#toast");

// ==========================================
// APPLICATION STATE
// ==========================================

let intensity = 2;
let transmissionNumber = 1;
let currentStory = "";
let currentStoryTitle = "";
let toastTimer;

const sleep = (ms) =>
    new Promise(resolve => setTimeout(resolve, ms));

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================

function showToast(message) {
    toastElement.textContent = message;
    toastElement.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toastElement.classList.remove("show");
    }, 2800);
}

// ==========================================
// PROMPT COUNTER
// ==========================================

storyPrompt.addEventListener("input", () => {
    promptCount.textContent =
        `${storyPrompt.value.length} / 500`;
});

// ==========================================
// STORY INTENSITY
// ==========================================

document.querySelectorAll(".intensity-option")
    .forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".intensity-option")
                .forEach(item => {
                    item.classList.remove("active");
                });

            button.classList.add("active");

            intensity = Number(button.dataset.intensity);
        });
    });

// ==========================================
// SAMPLE PROMPT
// ==========================================

document.querySelector(".sample-prompt")
    .addEventListener("click", () => {
        storyPrompt.value =
            "An abandoned observatory receives a signal " +
            "from a star that disappeared a thousand years ago.";

        promptCount.textContent =
            `${storyPrompt.value.length} / 500`;

        storyPrompt.focus();
    });

// ==========================================
// LOCAL AI STORY GENERATION
// ==========================================

function buildAIPrompt(prompt, genre, level) {
    const intensityInstructions = {
        1: "Use subtle suspense, strange clues, and an eerie atmosphere.",
        2: "Use unsettling discoveries, escalating suspense, and a memorable twist.",
        3: "Use intense psychological tension, disturbing mysteries, and a powerful twist."
    };

    return `
You are Ghostwrite, a creative horror and supernatural fiction writer.

Write an original, atmospheric short story based on the following input.

STORY IDEA:
${prompt}

GENRE:
${genre}

INTENSITY:
${intensityInstructions[level]}

REQUIREMENTS:
- Give the story an original title.
- Aim for approximately 350 to 500 words.
- Start with an intriguing opening.
- Build atmosphere through sensory details.
- Develop a coherent plot with a meaningful ending.
- Make the story original rather than copying existing fiction.
- Do not claim the fictional events are real.
- Avoid graphic violence.
- Output the title on the first line.
- Write the story in plain text.
- Do not include markdown headings or commentary outside the story.

Write the story now.
`.trim();
}

function setStoryLoading() {
    storyResult.replaceChildren();

    const container = document.createElement("div");
    container.className = "story-loading";

    const symbol = document.createElement("div");
    symbol.className = "loading-symbol";
    symbol.textContent = "✳";

    const message = document.createElement("p");
    message.textContent = "Listening to the other side...";

    const detail = document.createElement("small");
    detail.className = "mono muted";
    detail.textContent = "THE MACHINE IS THINKING";

    container.append(symbol, message, detail);
    storyResult.appendChild(container);
}

async function generateWithOllama(prompt, genre, level) {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, CONFIG.requestTimeout);

    try {
        const response = await fetch(CONFIG.ollamaUrl, {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                model: CONFIG.model,

                prompt: buildAIPrompt(prompt, genre, level),

                stream: false,

                options: {
                    temperature: 0.9,
                    num_predict: CONFIG.maxTokens
                }
            }),

            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(
                `Ollama returned HTTP ${response.status}`
            );
        }

        const data = await response.json();

        if (!data.response || !data.response.trim()) {
            throw new Error("The model returned an empty story.");
        }

        return data.response.trim();

    } finally {
        clearTimeout(timeout);
    }
}

// ==========================================
// OFFLINE DEMO STORY GENERATOR
// ==========================================

// This is a template-based fallback, NOT an AI model.
// It lets you test the frontend before setting up Ollama.

const demoOpenings = [
    "The first warning arrived at exactly 3:17 AM.",
    "Nobody in the village remembered building the house.",
    "The rain had been falling for forty-seven days.",
    "At midnight, every clock in the city stopped.",
    "The old machine woke up after thirty years of silence."
];

const demoDiscoveries = [
    "Inside, a dusty monitor displayed a message addressed to someone who had not been born yet.",
    "Beneath the floorboards, a collection of handwritten letters described events that had not happened.",
    "Every photograph showed the same unfamiliar figure standing a little closer to the camera.",
    "A disconnected telephone rang from somewhere behind the wall.",
    "The machine began printing pages filled with memories that belonged to strangers."
];

const demoTwists = [
    "Then the final page appeared. It described the room exactly as it looked now, including the person reading it.",
    "At the bottom of the screen, a single sentence appeared: 'Thank you for finally remembering me.'",
    "The last photograph was different. This time, the figure was standing behind the viewer.",
    "The clock started again. Its hands moved backward, and the room began to look twenty years younger.",
    "The machine printed one final line: 'I have been waiting for you to turn me back on.'"
];

function pickRandom(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function createDemoStory(prompt, genre, level) {
    const opening = pickRandom(demoOpenings);
    const discovery = pickRandom(demoDiscoveries);
    const twist = pickRandom(demoTwists);

    const intensityText = {
        1: "A faint, inexplicable unease settled over everything.",
        2: "The silence became heavy, as if the darkness itself were listening.",
        3: "Every instinct screamed that something impossible had noticed their presence."
    };

    const title = prompt.length > 45
        ? "The Unanswered Signal"
        : "The Thing That Remembered";

    const story = `
${title}

${opening}

It began with a simple question: ${prompt}

The mystery belonged to the world of ${genre}. What seemed ordinary at first gradually became impossible to explain.

${discovery}

${intensityText[level]}

Hours passed. The evidence grew stranger. Each attempt to understand the phenomenon only revealed another layer of the mystery. Whatever was hiding behind the silence seemed to know more about the past than anyone alive.

${twist}

By morning, everything appeared normal again.

Almost everything.

One small detail remained, waiting to be noticed by the next person who dared to look.
`.trim();

    return story;
}

// ==========================================
// DISPLAY STORY SAFELY
// ==========================================

function renderStory(rawStory) {
    currentStory = rawStory.trim();

    const lines = currentStory
        .split("\n")
        .map(line => line.trim());

    currentStoryTitle =
        lines.find(line => line.length > 0) || "Untitled Transmission";

    storyResult.replaceChildren();

    const container = document.createElement("article");
    container.className = "story-content";

    const title = document.createElement("h3");
    title.textContent = currentStoryTitle;

    container.appendChild(title);

    const paragraphs = currentStory
        .split(/\n\s*\n/)
        .map(part => part.trim())
        .filter(Boolean);

    // Skip the title if it is repeated as the first paragraph.
    const storyParagraphs =
        paragraphs[0] === currentStoryTitle
            ? paragraphs.slice(1)
            : paragraphs;

    storyParagraphs.forEach((paragraph, index) => {
        const p = document.createElement("p");
        p.textContent = paragraph;

        if (index === storyParagraphs.length - 1) {
            p.classList.add("story-ending");
        }

        container.appendChild(p);
    });

    storyResult.appendChild(container);

    const words = currentStory
        .split(/\s+/)
        .filter(Boolean).length;

    wordCount.textContent = `${words} WORDS`;
    transmissionId.textContent =
        String(transmissionNumber).padStart(3, "0");
}

// ==========================================
// GENERATE STORY
// ==========================================

storyForm.addEventListener("submit", async event => {
    event.preventDefault();

    const prompt = storyPrompt.value.trim();
    const genre = storyGenre.value;

    if (!prompt) {
        showToast("Enter a story idea first.");
        storyPrompt.focus();
        return;
    }

    if (prompt.length < 8) {
        showToast("Give the darkness a little more detail.");
        return;
    }

    generateButton.disabled = true;

    const buttonLabel = generateButton.querySelector(".button-label");
    const originalLabel = buttonLabel.textContent;

    buttonLabel.textContent = "Summoning the unknown...";

    storyMode.textContent = "TRANSMISSION IN PROGRESS";
    setStoryLoading();

    try {
        let generatedStory;
        let usedLocalAI = false;

        try {
            generatedStory = await generateWithOllama(
                prompt,
                genre,
                intensity
            );

            usedLocalAI = true;

        } catch (error) {
            console.warn("Local AI unavailable:", error);

            // If Ollama is unavailable, allow the user to
            // test the interface using a deterministic template.
            generatedStory = createDemoStory(
                prompt,
                genre,
                intensity
            );
        }

        transmissionNumber++;

        renderStory(generatedStory);

        if (usedLocalAI) {
            storyMode.textContent =
                `LOCAL AI · ${CONFIG.model.toUpperCase()}`;

            $("#connectionStatus").textContent = "LOCAL AI";

            showToast("Story generated by your local AI model.");

        } else {
            storyMode.textContent = "DEMO MODE · TEMPLATE STORY";

            $("#connectionStatus").textContent = "DEMO MODE";

            showToast(
                "Demo story created. Connect Ollama for real AI."
            );
        }

    } catch (error) {
        console.error(error);

        storyResult.replaceChildren();

        const message = document.createElement("p");
        message.className = "terminal-red";
        message.textContent = "Something interrupted the transmission.";

        storyResult.appendChild(message);

        storyMode.textContent = "TRANSMISSION FAILED";

        showToast("Unable to generate the story.");

    } finally {
        generateButton.disabled = false;
        buttonLabel.textContent = originalLabel;
    }
});

// ==========================================
// CLEAR STORY
// ==========================================

$("#clearStory").addEventListener("click", () => {
    currentStory = "";
    currentStoryTitle = "";

    storyResult.replaceChildren();

    const empty = document.createElement("div");
    empty.className = "empty-story";

    const symbol = document.createElement("div");
    symbol.className = "empty-symbol";
    symbol.textContent = "☽";

    const heading = document.createElement("h3");
    heading.textContent = "The page is listening.";

    const description = document.createElement("p");
    description.textContent =
        "Enter a prompt and let the unknown speak.";

    empty.append(symbol, heading, description);
    storyResult.appendChild(empty);

    wordCount.textContent = "0 WORDS";
    storyMode.textContent = "STANDBY — AWAITING INPUT";

    showToast("Transmission cleared.");
});

// ==========================================
// COPY STORY
// ==========================================

$("#copyStory").addEventListener("click", async () => {
    if (!currentStory) {
        showToast("Generate a story first.");
        return;
    }

    try {
        await navigator.clipboard.writeText(currentStory);
        showToast("Story copied to clipboard.");

    } catch {
        // Fallback for browsers where Clipboard API
        // is unavailable or permission is denied.
        const temporary = document.createElement("textarea");

        temporary.value = currentStory;
        temporary.style.position = "fixed";
        temporary.style.opacity = "0";

        document.body.appendChild(temporary);
        temporary.select();

        const copied = document.execCommand("copy");

        temporary.remove();

        showToast(
            copied
                ? "Story copied to clipboard."
                : "Copy failed. Select the story text manually."
        );
    }
});

// ==========================================
// DOWNLOAD STORY
// ==========================================

$("#downloadStory").addEventListener("click", () => {
    if (!currentStory) {
        showToast("Generate a story before exporting.");
        return;
    }

    const blob = new Blob(
        [currentStory],
        { type: "text/plain;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "ghostwrite-story.txt";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    showToast("Your story has been exported.");
});

// ==========================================
// HAUNTED TERMINAL
// ==========================================

const terminalCommands = {
    help: {
        color: "terminal-green",
        lines: [
            "AVAILABLE COMMANDS",
            "help     - List available commands",
            "scan     - Scan for unexplained activity",
            "whisper  - Receive a mysterious message",
            "status   - Display system status",
            "time     - Display local system time",
            "history  - Display this session's recent commands",
            "clear    - Clear the terminal",
            "whoami   - Identify the current visitor"
        ]
    },

    scan: {
        color: "terminal-purple",
        lines: [
            "Initiating spectral scan...",
            "Checking the spaces between processes...",
            "Signal detected: UNKNOWN",
            "Source: UNRESOLVED",
            "Conclusion: The mystery remains."
        ]
    },

    whisper: {
        color: "terminal-green",
        lines: [
            "Establishing a listening channel...",
            "A voice emerges from the static:",
            pickRandom([
                '"Some doors remember being opened."',
                '"The last page has not been written yet."',
                '"Do not trust a clock that never loses time."',
                '"You were expected. Nobody knows by whom."',
                '"Every forgotten thing leaves an echo."'
            ])
        ]
    },

    status: {
        color: "terminal-green",
        lines: [
            "SYSTEM STATUS",
            "Frontend: ONLINE",
            "Memory archive: BROWSER STORAGE",
            "AI engine: CHECKING ON GENERATION",
            "Ghost activity: UNCONFIRMED",
            "Security: NO SHELL ACCESS ENABLED"
        ]
    },

    whoami: {
        color: "terminal-purple",
        lines: [
            "Visitor identity: ANONYMOUS",
            "Classification: CURIOUS",
            "Access level: STORYTELLER",
            "Welcome to the other side."
        ]
    },

    history: {
        color: "terminal-green",
        lines: []
    }
};

let commandHistory = [];

function appendTerminalLine(text, className = "") {
    const line = document.createElement("p");

    line.className = `terminal-line ${className}`.trim();

    // Never interpret terminal output as HTML.
    line.textContent = text;

    terminalOutput.appendChild(line);

    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

async function executeTerminalCommand(rawCommand) {
    const command = rawCommand.trim().toLowerCase();

    if (!command) return;

    appendTerminalLine(
        `guest@ghost:~$ ${rawCommand}`,
        "terminal-green"
    );

    commandHistory.push(rawCommand);

    if (command === "clear") {
        terminalOutput.replaceChildren();
        return;
    }

    if (command === "time") {
        appendTerminalLine(
            `Local time: ${new Date().toLocaleString()}`,
            "terminal-purple"
        );
        return;
    }

    if (command === "history") {
        if (commandHistory.length <= 1) {
            appendTerminalLine(
                "No previous commands in this session.",
                "muted"
            );
        } else {
            commandHistory.slice(0, -1).forEach((item, index) => {
                appendTerminalLine(
                    `${index + 1}. ${item}`,
                    "terminal-purple"
                );
            });
        }

        return;
    }

    const result = terminalCommands[command];

    if (result) {
        for (const line of result.lines) {
            await sleep(160);

            appendTerminalLine(line, result.color);
        }

        return;
    }

    if (command.startsWith("echo ")) {
        appendTerminalLine(rawCommand.slice(5), "terminal-green");
        return;
    }

    appendTerminalLine(
        `Unknown command: "${command}". Type help to see available commands.`,
        "terminal-red"
    );
}

terminalForm.addEventListener("submit", async event => {
    event.preventDefault();

    const command = terminalInput.value;

    terminalInput.value = "";
    terminalInput.disabled = true;

    try {
        await executeTerminalCommand(command);

    } finally {
        terminalInput.disabled = false;
        terminalInput.focus();
    }
});

// Quick command buttons
document.querySelectorAll("[data-command]")
    .forEach(button => {
        button.addEventListener("click", async () => {
            const command = button.dataset.command;

            terminalInput.value = command;

            terminalInput.focus();

            await executeTerminalCommand(command);
        });
    });

// ==========================================
// MEMORY GARDEN — LOCAL STORAGE
// ==========================================

function readMemories() {
    try {
        const raw = localStorage.getItem(CONFIG.memoryKey);

        if (!raw) return [];

        const parsed = JSON.parse(raw);

        if (!Array.isArray(parsed)) return [];

        return parsed.filter(item =>
            item &&
            typeof item.id === "string" &&
            typeof item.title === "string" &&
            typeof item.content === "string" &&
            typeof item.category === "string"
        );

    } catch (error) {
        console.error("Could not read memories:", error);
        return [];
    }
}

function saveMemories(memories) {
    try {
        localStorage.setItem(
            CONFIG.memoryKey,
            JSON.stringify(memories)
        );

        return true;

    } catch (error) {
        console.error("Could not save memories:", error);
        return false;
    }
}

function formatMemoryDate(dateString) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "DATE UNKNOWN";
    }

    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
    }).toUpperCase();
}

function createMemoryCard(memory) {
    const card = document.createElement("article");
    card.className = "memory-card";

    const top = document.createElement("div");
    top.className = "memory-card-top";

    const details = document.createElement("div");

    const category = document.createElement("span");
    category.className = "memory-category";
    category.textContent = memory.category.toUpperCase();

    const title = document.createElement("h4");
    title.textContent = memory.title;

    const date = document.createElement("p");
    date.className = "memory-date";
    date.textContent = formatMemoryDate(memory.createdAt);

    details.append(category, title, date);
    top.appendChild(details);

    const content = document.createElement("p");
    content.className = "memory-content";
    content.textContent = memory.content;

    const actions = document.createElement("div");
    actions.className = "memory-card-actions";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-memory";
    deleteButton.textContent = "Delete memory";

    deleteButton.addEventListener("click", () => {
        deleteMemory(memory.id);
    });

    actions.appendChild(deleteButton);

    card.append(top, content, actions);

    return card;
}

function renderMemories() {
    const memories = readMemories();

    memoryList.replaceChildren();

    memoryCount.textContent =
        `${String(memories.length).padStart(2, "0")} ENTRIES`;

    if (memories.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-memories";

        const symbol = document.createElement("span");
        symbol.textContent = "☽";

        const text = document.createElement("p");
        text.textContent = "Your garden is waiting.";

        const detail = document.createElement("small");
        detail.textContent = "Your first memory will bloom here.";

        empty.append(symbol, text, detail);
        memoryList.appendChild(empty);

        return;
    }

    memories.forEach(memory => {
        memoryList.appendChild(createMemoryCard(memory));
    });
}

memoryForm.addEventListener("submit", event => {
    event.preventDefault();

    const title = $("#memoryTitle").value.trim();
    const category = $("#memoryCategory").value;
    const content = $("#memoryContent").value.trim();

    if (!title || !content) {
        showToast("Give your memory a title and a story.");
        return;
    }

    const memory = {
        id: (
            globalThis.crypto &&
            typeof globalThis.crypto.randomUUID === "function"
        )
            ? globalThis.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`,

        title,
        category,
        content,
        createdAt: new Date().toISOString()
    };

    const memories = readMemories();

    // New memories appear first.
    memories.unshift(memory);

    if (!saveMemories(memories)) {
        showToast(
            "Could not save. Browser storage may be full or disabled."
        );
        return;
    }

    memoryForm.reset();

    renderMemories();

    showToast("Memory preserved in this browser.");
});

function deleteMemory(id) {
    const memories = readMemories();

    const updated = memories.filter(memory => memory.id !== id);

    if (!saveMemories(updated)) {
        showToast("Unable to update the archive.");
        return;
    }

    renderMemories();

    showToast("Memory removed from this browser.");
}

// Update if another tab changes local storage.
window.addEventListener("storage", event => {
    if (event.key === CONFIG.memoryKey) {
        renderMemories();
    }
});

// ==========================================
// MOBILE NAVIGATION
// ==========================================

const mobileMenu = $("#mobileMenu");
const navLinks = $(".nav-links");

mobileMenu.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");

    mobileMenu.setAttribute("aria-expanded", String(isOpen));
    mobileMenu.textContent = isOpen ? "✕" : "☰";
});

navLinks.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
        navLinks.classList.remove("open");

        mobileMenu.setAttribute("aria-expanded", "false");
        mobileMenu.textContent = "☰";
    });
});

// ==========================================
// INITIALIZE APPLICATION
// ==========================================

function initializeApplication() {
    renderMemories();

    transmissionId.textContent =
        String(transmissionNumber).padStart(3, "0");

    $("#connectionStatus").textContent = "LOCAL MODE";

    console.log(
        "%c GHOSTWRITE AI ",
        "background:#c4ff70;color:#09090f;font-size:16px;font-weight:bold;padding:8px;"
    );

    console.log(
        "The interface is ready. Connect Ollama for actual local AI generation."
    );
}

initializeApplication();