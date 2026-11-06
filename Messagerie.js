const welcomeMessage = document.getElementById("welcome-message");
if (welcomeMessage) {
    const formattedDate = new Intl.DateTimeFormat("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long"
    }).format(new Date());
    welcomeMessage.textContent = `Bienvenue en ce ${formattedDate}`;
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById("password");
    passwordInput.type = passwordInput.type === "password" ? "text" : "password";
}

const settingsToggle = document.getElementById("settings-toggle");
const settingsSidebar = document.getElementById("settings-sidebar");
const settingsClose = document.getElementById("settings-close");
const settingsOpenStorageKey = "settingsSidebarOpen";

if (settingsToggle && settingsSidebar && settingsClose) {
    function setSettingsOpen(isOpen) {
        // Synchronise l'affichage du panneau, son état accessible et la préférence enregistrée.
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
    let recentContacts = [];
    try {
        const storedContacts = JSON.parse(localStorage.getItem(contactsStorageKey) ?? "[]");
        if (Array.isArray(storedContacts)) {
            recentContacts = storedContacts.filter((name) => typeof name === "string");
        }
    } catch (error) {
        // Si le JSON est invalide, conserve la liste des conversations récentes vide.
        console.error("Impossible de lire l’ordre des conversations:", error);
    }

    function setupContactLinks() {
        const contactsList = document.getElementById("contacts-list");
        if (!contactsList) return;

        const activeContactUsername = new URLSearchParams(
            window.parent.location.search
        ).get("contact");
        const contactLinks = [...contactsList.querySelectorAll("a")].map((contactLink) => {
            const contactUsername = contactLink.textContent.trim();
            const conversationUrl = new URL("conversation.html", window.parent.location.href);
            conversationUrl.searchParams.set("contact", contactUsername);
            contactLink.href = conversationUrl.href;
            contactLink.target = "_top";

            if (contactUsername === activeContactUsername) {
                contactLink.setAttribute("aria-current", "page");
            }

            return { contactLink, contactUsername };
        });

        contactLinks.sort(({ contactUsername: first }, { contactUsername: second }) => {
                // Trie d'abord les contacts récents selon leur dernière position enregistrée.
                const firstRecentIndex = recentContacts.indexOf(first);
            const secondRecentIndex = recentContacts.indexOf(second);
            return firstRecentIndex < 0 && secondRecentIndex < 0
                ? first.localeCompare(second)
                : firstRecentIndex < 0 ? 1
                : secondRecentIndex < 0 ? -1
                : firstRecentIndex - secondRecentIndex;
        }).forEach(({ contactLink }) => contactsList.append(contactLink.parentElement));
    }

    function setupContactsSidebarResize() {
        const sidebar = document.querySelector(".contacts-sidebar");
        const handle = sidebar?.querySelector(".contacts-resize-handle");
        if (!sidebar || !handle) return;
        const contactsSidebarWidthStorageKey = "contactsSidebarWidth";

        function setContactsSidebarWidth(requestedWidth) {
            const isMobile = window.matchMedia("(max-width: 600px)").matches;
            const maxWidth = window.innerWidth * (isMobile ? 1 : 0.7);
            const minWidth = Math.min(180, maxWidth);
            // Limite la largeur selon la fenêtre et le format mobile ou bureau.
            const roundedWidth = Math.round(Math.min(maxWidth, Math.max(minWidth, requestedWidth)));
            sidebar.style.width = `${roundedWidth}px`;
            localStorage.setItem(contactsSidebarWidthStorageKey, String(roundedWidth));
        }

        const storedSidebarWidth = Number(localStorage.getItem(contactsSidebarWidthStorageKey));
        if (Number.isFinite(storedSidebarWidth) && storedSidebarWidth > 0) {
            setContactsSidebarWidth(storedSidebarWidth);
        }

        handle.addEventListener("pointerdown", (event) => {
            event.preventDefault();
            // Garde le pointeur capturé pendant le glissement de la poignée.
            handle.setPointerCapture(event.pointerId);
            setContactsSidebarWidth(event.clientX);
        });

        handle.addEventListener("pointermove", (event) => {
            if (handle.hasPointerCapture(event.pointerId)) {
                setContactsSidebarWidth(event.clientX);
            }
        });

        handle.addEventListener("keydown", (event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            // Modifie la largeur par incréments de 16 pixels au clavier.
            setContactsSidebarWidth(
                sidebar.getBoundingClientRect().width
                    + (event.key === "ArrowRight" ? 16 : -16)
            );
        });

        new ResizeObserver(([sidebarResizeEntry]) => {
            const { width, height } = sidebarResizeEntry.contentRect;
            // Met à jour les dimensions CSS utilisées par la mise en page de la conversation.
            document.body.style.setProperty("--contacts-sidebar-width", `${Math.round(width)}px`);
            document.body.style.setProperty("--contacts-sidebar-half-width", `${Math.round(width / 2)}px`);
            document.body.style.setProperty("--contacts-sidebar-height", `${Math.round(height)}px`);
            localStorage.setItem(contactsSidebarWidthStorageKey, String(Math.round(width)));
        }).observe(sidebar);
    }

    setupContactLinks();
    setupContactsSidebarResize();
})();