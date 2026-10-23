console.log("Bonjour")

const welcomeMessage = document.getElementById("welcome-message");
if (welcomeMessage) {
    const today = new Intl.DateTimeFormat("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long"
    }).format(new Date());
    welcomeMessage.textContent = `Bienvenue en ce ${today}`;
}

const courriel =
    document.querySelector("#courriel");

const courrielMessage =
    document.querySelector("#courriel-message");

if (courriel && courrielMessage) {
    courriel.addEventListener("input", function() {
        const valeur = courriel.value;
        const aUnArobase = valeur.includes("@");

        if (valeur === "") {
            courrielMessage.textContent =
                "Le courriel est obligatoire";
        } else if (!aUnArobase) {
            courrielMessage.textContent =
                "Le courriel n'est pas valide";
        } else {
            courrielMessage.textContent = "";
        }
    });
}
function showpassword() {
    var x = document.getElementById("password");
    if (x.type === "password") {
        x.type = "text";
    } else {
        x.type = "password";
    } console.log(x.type)
}

const settingsToggle = document.getElementById("settings-toggle");
const settingsSidebar = document.getElementById("settings-sidebar");
const settingsClose = document.getElementById("settings-close");

if (settingsToggle && settingsSidebar && settingsClose) {
    function closeSettings() {
        settingsSidebar.classList.remove("is-open");
        settingsSidebar.setAttribute("aria-hidden", "true");
        settingsSidebar.inert = true;
        settingsToggle.setAttribute("aria-expanded", "false");
        settingsToggle.focus();
    }

    settingsToggle.addEventListener("click", () => {
        const isOpen = settingsToggle.getAttribute("aria-expanded") === "true";
        if (isOpen) {
            closeSettings();
            return;
        }

        settingsSidebar.classList.add("is-open");
        settingsSidebar.setAttribute("aria-hidden", "false");
        settingsSidebar.inert = false;
        settingsToggle.setAttribute("aria-expanded", "true");
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
    const storedContacts = JSON.parse(
        localStorage.getItem(contactsStorageKey) ?? "[]"
    );
    let recentContacts = Array.isArray(storedContacts)
        ? storedContacts.filter((contact) => typeof contact === "string")
        : [];

    function setupContactList() {
        const contactList = document.getElementById("contacts-list");
        if (!contactList) return;

        const activeContact = new URLSearchParams(
            window.parent.location.search
        ).get("contact");
        const links = Array.from(contactList.querySelectorAll("a")).map((link) => {
            const name = link.textContent.trim();
            link.href = `conversation.html?contact=${encodeURIComponent(name)}`;

            if (name === activeContact) {
                link.setAttribute("aria-current", "page");
            }

            return { link, name };
        });

        links.sort((first, second) => {
            const firstIndex = recentContacts.indexOf(first.name);
            const secondIndex = recentContacts.indexOf(second.name);

            if (firstIndex === -1 && secondIndex === -1) {
                return first.name.localeCompare(second.name);
            }
            if (firstIndex === -1) return 1;
            if (secondIndex === -1) return -1;
            return firstIndex - secondIndex;
        });

        links.forEach(({ link }) => contactList.append(link.parentElement));
    }

    function setupContactsResize() {
        const sidebar = document.querySelector(".contacts-sidebar");
        const handle = sidebar?.querySelector(".contacts-resize-handle");
        if (!sidebar || !handle) return;

        function setWidth(width) {
            const isMobile = window.matchMedia("(max-width: 600px)").matches;
            const maxWidth = window.innerWidth * (isMobile ? 1 : 0.7);
            const minWidth = Math.min(180, maxWidth);
            sidebar.style.width = `${Math.round(
                Math.min(maxWidth, Math.max(minWidth, width))
            )}px`;
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
            document.body.style.setProperty(
                "--contacts-sidebar-width",
                `${Math.round(width)}px`
            );
            document.body.style.setProperty(
                "--contacts-sidebar-half-width",
                `${Math.round(width / 2)}px`
            );
            document.body.style.setProperty(
                "--contacts-sidebar-height",
                `${Math.round(height)}px`
            );
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
            title.textContent = `Fil de discussion avec ${contact}`;
        }

        function displayMessage(message) {
            if (
                typeof message.text !== "string"
                || !["you", "contact"].includes(message.sender)
            ) {
                return;
            }

            const entry = document.createElement("div");
            entry.className = `message-entry message-entry--${message.sender}`;

            const bubble = document.createElement("p");
            bubble.className = `message-bubble message-bubble--${message.sender}`;
            bubble.textContent = message.text;
            entry.append(bubble);

            const sentAt = new Date(message.timestamp);
            if (
                typeof message.timestamp === "string"
                && !Number.isNaN(sentAt.getTime())
            ) {
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
                localStorage.setItem(
                    contactsStorageKey,
                    JSON.stringify(recentContacts)
                );
            }
        });
    }

    setupContactList();
    setupContactsResize();
    setupConversation();
})();