const welcomeMessage = document.getElementById("welcome-message");
if (welcomeMessage) {
    const today = new Intl.DateTimeFormat("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long"
    }).format(new Date());
    welcomeMessage.textContent = `Bienvenue en ce ${today}`;
}

function showpassword() {
    const password = document.getElementById("password");
    password.type = password.type === "password" ? "text" : "password";
}

const settingsToggle = document.getElementById("settings-toggle");
const settingsSidebar = document.getElementById("settings-sidebar");
const settingsClose = document.getElementById("settings-close");
const settingsOpenStorageKey = "settingsSidebarOpen";

if (settingsToggle && settingsSidebar && settingsClose) {
    function setSettingsOpen(isOpen) {
        settingsSidebar.classList.toggle("is-open", isOpen);
        settingsSidebar.setAttribute("aria-hidden", String(!isOpen));
        settingsSidebar.inert = !isOpen;
        settingsToggle.setAttribute("aria-expanded", String(isOpen));
        localStorage.setItem(settingsOpenStorageKey, String(isOpen));
    }

    function closeSettings() {
        setSettingsOpen(false);
        settingsToggle.focus();
    }

    if (localStorage.getItem(settingsOpenStorageKey) === "true") {
        setSettingsOpen(true);
    }

    settingsToggle.addEventListener("click", () => {
        const isOpen = settingsToggle.getAttribute("aria-expanded") === "true";
        if (isOpen) {
            closeSettings();
            return;
        }

        setSettingsOpen(true);
        settingsClose.focus();
    });

    settingsClose.addEventListener("click", closeSettings);
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && settingsToggle.getAttribute("aria-expanded") === "true") {
            closeSettings();
        }
    });
}

(() => {
    const contactsStorageKey = "lastMessagedPeople";
    const storedContacts = JSON.parse(localStorage.getItem(contactsStorageKey) ?? "[]");
    let recentContacts = Array.isArray(storedContacts)
        ? storedContacts.filter((name) => typeof name === "string")
        : [];

    function setupContactList() {
        const contactList = document.getElementById("contacts-list");
        if (!contactList) return;

        const activeContact = new URLSearchParams(
            window.parent.location.search
        ).get("contact");
        const links = [...contactList.querySelectorAll("a")].map((link) => {
            const name = link.textContent.trim();
            const conversationUrl = new URL("conversation.html", window.parent.location.href);
            conversationUrl.searchParams.set("contact", name);
            link.href = conversationUrl.href;
            link.target = "_top";

            if (name === activeContact) {
                link.setAttribute("aria-current", "page");
            }

            return { link, name };
        });

        links.sort(({ name: first }, { name: second }) => {
            const firstIndex = recentContacts.indexOf(first);
            const secondIndex = recentContacts.indexOf(second);
            return firstIndex < 0 && secondIndex < 0
                ? first.localeCompare(second)
                : firstIndex < 0 ? 1
                : secondIndex < 0 ? -1
                : firstIndex - secondIndex;
        }).forEach(({ link }) => contactList.append(link.parentElement));
    }

    function setupContactsResize() {
        const sidebar = document.querySelector(".contacts-sidebar");
        const handle = sidebar?.querySelector(".contacts-resize-handle");
        if (!sidebar || !handle) return;
        const widthStorageKey = "contactsSidebarWidth";

        function setWidth(width) {
            const isMobile = window.matchMedia("(max-width: 600px)").matches;
            const maxWidth = window.innerWidth * (isMobile ? 1 : 0.7);
            const minWidth = Math.min(180, maxWidth);
            const roundedWidth = Math.round(Math.min(maxWidth, Math.max(minWidth, width)));
            sidebar.style.width = `${roundedWidth}px`;
            localStorage.setItem(widthStorageKey, String(roundedWidth));
        }

        const savedWidth = Number(localStorage.getItem(widthStorageKey));
        if (Number.isFinite(savedWidth) && savedWidth > 0) {
            setWidth(savedWidth);
        }

        handle.addEventListener("pointerdown", (event) => {
            event.preventDefault();
            handle.setPointerCapture(event.pointerId);
            setWidth(event.clientX);
        });

        handle.addEventListener("pointermove", (event) => {
            if (handle.hasPointerCapture(event.pointerId)) {
                setWidth(event.clientX);
            }
        });

        handle.addEventListener("keydown", (event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            setWidth(
                sidebar.getBoundingClientRect().width
                    + (event.key === "ArrowRight" ? 16 : -16)
            );
        });

        new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            document.body.style.setProperty("--contacts-sidebar-width", `${Math.round(width)}px`);
            document.body.style.setProperty("--contacts-sidebar-half-width", `${Math.round(width / 2)}px`);
            document.body.style.setProperty("--contacts-sidebar-height", `${Math.round(height)}px`);
            localStorage.setItem(widthStorageKey, String(Math.round(width)));
        }).observe(sidebar);
    }

    function setupConversation() {
        const form = document.querySelector(".conversation-main form");
        if (!form) return;

        const contact = new URLSearchParams(window.location.search).get("contact");
        const input = form.querySelector("#message");
        const title = document.getElementById("conversation-title");
        const messageList = document.getElementById("conversation-messages");
        const storageKey = `conversationMessages:${contact ?? "general"}`;
        const storedMessages = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
        const messages = Array.isArray(storedMessages) ? storedMessages : [];

        if (contact && title) {
            title.textContent = `Conversation avec ${contact}`;
        }

        function displayMessage(message) {
            if (typeof message.text !== "string" || !["you", "contact"].includes(message.sender)) return;

            const entry = document.createElement("div");
            entry.className = `message-entry message-entry--${message.sender}`;

            const bubble = document.createElement("p");
            bubble.className = `message-bubble message-bubble--${message.sender}`;
            bubble.textContent = message.text;
            entry.append(bubble);

            const sentAt = new Date(message.timestamp);
            if (typeof message.timestamp === "string" && !Number.isNaN(sentAt.getTime())) {
                const time = document.createElement("time");
                time.className = "message-timestamp";
                time.dateTime = sentAt.toISOString();
                time.textContent = new Intl.DateTimeFormat("fr-FR", {
                    dateStyle: "short",
                    timeStyle: "short"
                }).format(sentAt);
                entry.append(time);
            }

            messageList.append(entry);
            messageList.scrollTop = messageList.scrollHeight;
        }

        messages.forEach(displayMessage);

        input.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            form.requestSubmit();
        });

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            const text = input.value.trim();
            if (!text) return;

            const message = {
                text,
                sender: "you",
                timestamp: new Date().toISOString()
            };
            messages.push(message);
            displayMessage(message);
            localStorage.setItem(storageKey, JSON.stringify(messages));
            input.value = "";
            input.focus();

            if (contact) {
                recentContacts = [
                    contact,
                    ...recentContacts.filter((name) => name !== contact)
                ];
                localStorage.setItem(contactsStorageKey, JSON.stringify(recentContacts));
            }
        });
    }

    setupContactList();
    setupContactsResize();
    setupConversation();
})();