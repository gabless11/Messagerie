import { escapePostgrestLikePattern, supabase, TABLES } from "./supabase.js";

const addContactForm = document.getElementById("add-contact-form");
const contactsList = document.getElementById("contacts-list");
const contactsStatus = document.getElementById("contacts-status");

if (addContactForm && contactsList && contactsStatus) {
    const contactUsernameInput = document.getElementById("contact-username");
    const addContactButton = addContactForm.querySelector('button[type="submit"]');
    let currentUser;
    let savedContacts = [];
    addContactButton.disabled = true;

    function renderContactLink(contact) {
        // Ignore le contact s'il figure déjà dans la liste affichée.
        const alreadyDisplayed = [...contactsList.querySelectorAll("a")]
            .some((contactLink) => contactLink.dataset.userId === contact.contact_user_id);
        if (alreadyDisplayed) return;

        const contactLink = document.createElement("a");
        const conversationUrl = new URL("conversation.html", window.location.href);
        // Ajoute le nom du contact à l'adresse de sa conversation.
        conversationUrl.searchParams.set("contact", contact.username);
        contactLink.href = conversationUrl.href;
        contactLink.target = "_top";
        contactLink.textContent = contact.username;
        contactLink.dataset.userId = contact.contact_user_id ?? "";

        const activeContact = new URLSearchParams(window.parent.location.search).get("contact");
        if (contact.username === activeContact) {
            contactLink.setAttribute("aria-current", "page");
        }

        const contactListItem = document.createElement("li");
        contactListItem.append(contactLink);
        contactsList.append(contactListItem);
    }

    async function loadCurrentUserContacts() {
        // Charge d'abord le compte connecté pour filtrer ensuite ses contacts.
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) {
            console.error("Erreur lors de la vérification de la session:", authError);
            contactsStatus.textContent = "Impossible de vérifier la session. Reconnectez-vous.";
            return;
        }
        if (!authData.user) {
            contactsStatus.textContent = "Connectez-vous pour afficher vos contacts.";
            return;
        }
        currentUser = authData.user;

        // Récupère les contacts créés par l'utilisateur connecté.
        const { data, error } = await supabase
            .from(TABLES.contacts)
            .select("username, contact_user_id")
            .eq("created_by", currentUser.id);

        if (error) {
            console.error("Erreur lors du chargement des contacts:", error);
            contactsStatus.textContent = "Impossible de charger vos contacts. Vérifiez les règles d’accès Supabase.";
            return;
        }

        savedContacts = data ?? [];
        savedContacts.forEach(renderContactLink);
        addContactButton.disabled = false;
    }

    addContactForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        contactsStatus.textContent = "";
        contactsStatus.classList.remove("is-success");

        const requestedUsername = contactUsernameInput.value.trim();
        if (!requestedUsername || !currentUser) return;

        addContactButton.disabled = true;
        try {
            // Recherche le profil correspondant au nom saisi.
            const { data: profile, error: profileError } = await supabase
                .from(TABLES.profiles)
                .select("id, username")
                .ilike("username", escapePostgrestLikePattern(requestedUsername))
                .maybeSingle();

            if (profileError) {
                console.error("Erreur lors de la recherche d’un utilisateur:", profileError);
                contactsStatus.textContent = "Impossible de rechercher cet utilisateur. Vérifiez les règles d’accès Supabase.";
                return;
            }

            if (!profile) {
                contactsStatus.textContent = `Aucun utilisateur trouvé pour « ${requestedUsername} ».`;
                return;
            }
            if (profile.id === currentUser.id) {
                contactsStatus.textContent = "Vous ne pouvez pas vous ajouter vous-même.";
                return;
            }

            // Compare l'identifiant du profil aux contacts déjà chargés.
            const existingContact = savedContacts.find(
                (contact) => contact.contact_user_id === profile.id
            );
            if (existingContact) {
                contactsStatus.classList.add("is-success");
                contactsStatus.textContent = `${profile.username} est déjà dans vos contacts.`;
                return;
            }

            // Enregistre le contact puis récupère les valeurs à afficher dans la liste.
            const { data: contact, error: insertError } = await supabase
                .from(TABLES.contacts)
                .insert({
                    created_by: currentUser.id,
                    username: profile.username,
                    contact_user_id: profile.id
                })
                .select("username, contact_user_id")
                .single();

            if (insertError) {
                console.error("Erreur lors de l’ajout du contact:", insertError);
                contactsStatus.textContent = "Impossible d’ajouter ce contact. Vérifiez les règles d’accès Supabase.";
                return;
            }

            savedContacts.push(contact);
            renderContactLink(contact);
            contactUsernameInput.value = "";
            contactsStatus.classList.add("is-success");
            contactsStatus.textContent = `${contact.username} a été ajouté à vos contacts.`;
        } catch (error) {
            console.error("Erreur lors de l’ajout du contact:", error);
            contactsStatus.textContent = "Une erreur est survenue pendant l’ajout du contact.";
        } finally {
            addContactButton.disabled = false;
        }
    });

    loadCurrentUserContacts().catch((error) => {
        console.error("Erreur lors du chargement des contacts:", error);
        contactsStatus.textContent = "Une erreur est survenue pendant le chargement des contacts.";
    });
}
