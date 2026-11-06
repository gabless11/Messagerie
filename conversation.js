import { escapePostgrestLikePattern, supabase, TABLES } from "./supabase.js";

const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message");
const conversationTitle = document.getElementById("conversation-title");
const messageList = document.getElementById("conversation-messages");
const conversationStatus = document.getElementById("conversation-status");

if (messageForm && messageInput && conversationTitle && messageList && conversationStatus) {
    let currentUser;
    let conversationId;
    let contactUsername;
    let realtimeMessagesChannel;

    function showConversationError(message, error) {
        console.error(message, error);
        conversationStatus.textContent = message;
    }

    function findMessageEntry(messageId) {
        return [...messageList.querySelectorAll(".message-entry")]
            .find((messageEntry) => messageEntry.dataset.messageId === String(messageId));
    }

    function renderMessage(messageData) {
        if (typeof messageData.content !== "string" || !messageData.id) return;
        // Met à jour l'entrée existante si le même message arrive aussi par Realtime.
        const existingEntry = findMessageEntry(messageData.id);
        if (existingEntry) {
            const existingMessageBubble = existingEntry.querySelector(".message-bubble");
            if (existingMessageBubble) existingMessageBubble.textContent = messageData.content;
            return;
        }

        const messageSide = messageData.created_by === currentUser.id ? "you" : "contact";
        const messageEntry = document.createElement("div");
        messageEntry.className = `message-entry message-entry--${messageSide}`;
        messageEntry.dataset.messageId = String(messageData.id);
        messageEntry.dataset.createdAt = typeof messageData.created_at === "string" ? messageData.created_at : "";

        const messageBubble = document.createElement("p");
        messageBubble.className = `message-bubble message-bubble--${messageSide}`;
        messageBubble.textContent = messageData.content;
        messageEntry.append(messageBubble);

        if (messageSide === "you") {
            const messageActions = document.createElement("div");
            messageActions.className = "message-actions";

            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "message-action";
            editButton.textContent = "Modifier";
            editButton.setAttribute("aria-label", "Modifier ce message");

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "message-action";
            deleteButton.textContent = "Supprimer";
            deleteButton.setAttribute("aria-label", "Supprimer ce message");

            editButton.addEventListener("click", () => {
                // Remplace les boutons d'action par le formulaire de modification.
                editButton.hidden = true;
                deleteButton.hidden = true;

                const editForm = document.createElement("form");
                editForm.className = "message-edit-form";

                const editInput = document.createElement("textarea");
                editInput.className = "message-edit-input";
                editInput.setAttribute("aria-label", "Modifier le contenu du message");
                editInput.required = true;
                editInput.value = messageBubble.textContent;

                const saveButton = document.createElement("button");
                saveButton.type = "submit";
                saveButton.className = "message-action";
                saveButton.textContent = "Enregistrer";

                const cancelButton = document.createElement("button");
                cancelButton.type = "button";
                cancelButton.className = "message-action";
                cancelButton.textContent = "Annuler";
                cancelButton.addEventListener("click", () => {
                    editForm.remove();
                    editButton.hidden = false;
                    deleteButton.hidden = false;
                    editButton.focus();
                });

                editForm.append(editInput, saveButton, cancelButton);
                messageEntry.insertBefore(editForm, messageActions);
                editInput.focus();

                editForm.addEventListener("submit", async (event) => {
                    event.preventDefault();
                    const updatedContent = editInput.value.trim();
                    if (!updatedContent) {
                        editInput.focus();
                        return;
                    }

                    saveButton.disabled = true;
                    cancelButton.disabled = true;
                    conversationStatus.textContent = "";
                    try {
                        // Met à jour le contenu uniquement pour le message de son auteur.
                        const { data: updatedMessage, error } = await supabase
                            .from(TABLES.messages)
                            .update({ content: updatedContent })
                            .eq("id", messageData.id)
                            .eq("created_by", currentUser.id)
                            .select("content")
                            .maybeSingle();

                        if (error || !updatedMessage) {
                            showConversationError(
                                "Impossible de modifier ce message. Vérifiez les règles d’accès Supabase.",
                                error ?? new Error("Le message n’a pas été modifié.")
                            );
                            saveButton.disabled = false;
                            cancelButton.disabled = false;
                            return;
                        }

                        messageBubble.textContent = updatedMessage.content;
                        messageData.content = updatedMessage.content;
                        editForm.remove();
                        editButton.hidden = false;
                        deleteButton.hidden = false;
                        editButton.focus();
                    } catch (error) {
                        showConversationError("Une erreur est survenue pendant la modification du message.", error);
                        saveButton.disabled = false;
                        cancelButton.disabled = false;
                    }
                });
            });

            deleteButton.addEventListener("click", async () => {
                // Demande confirmation avant d'envoyer la requête de suppression.
                if (!window.confirm("Supprimer ce message ? Cette action est définitive.")) return;

                editButton.disabled = true;
                deleteButton.disabled = true;
                conversationStatus.textContent = "";
                try {
                    const { data: deletedMessage, error } = await supabase
                        .from(TABLES.messages)
                        .delete()
                        .eq("id", messageData.id)
                        .eq("created_by", currentUser.id)
                        .select("id")
                        .maybeSingle();

                    if (error || !deletedMessage) {
                        showConversationError(
                            "Impossible de supprimer ce message. Vérifiez les règles d’accès Supabase.",
                            error ?? new Error("Le message n’a pas été supprimé.")
                        );
                        editButton.disabled = false;
                        deleteButton.disabled = false;
                        return;
                    }

                    messageEntry.remove();
                } catch (error) {
                    showConversationError("Une erreur est survenue pendant la suppression du message.", error);
                    editButton.disabled = false;
                    deleteButton.disabled = false;
                }
            });

            messageActions.append(editButton, deleteButton);
            messageEntry.append(messageActions);
        }

        const messageDate = new Date(messageData.created_at);
        if (!Number.isNaN(messageDate.getTime())) {
            const timestampElement = document.createElement("time");
            timestampElement.className = "message-timestamp";
            timestampElement.dateTime = messageDate.toISOString();
            timestampElement.textContent = new Intl.DateTimeFormat("fr-FR", {
                dateStyle: "short",
                timeStyle: "short"
            }).format(messageDate);
            messageEntry.append(timestampElement);
        }

        // Insère le message avant la première entrée dont la date est plus récente.
        const messageTime = Date.parse(messageEntry.dataset.createdAt);
        const nextEntry = Number.isNaN(messageTime)
            ? null
            : [...messageList.querySelectorAll(".message-entry")]
                .find((existingEntry) => Date.parse(existingEntry.dataset.createdAt) > messageTime);
        messageList.insertBefore(messageEntry, nextEntry ?? null);
        messageList.scrollTop = messageList.scrollHeight;
    }

    function subscribeToRealtimeMessages() {
        realtimeMessagesChannel = supabase
            .channel(`conversation-${conversationId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: TABLES.messages,
                    // Filtre les événements sur l'identifiant de cette conversation.
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload) => {
                    if (payload.eventType === "INSERT") {
                        renderMessage(payload.new);
                    } else if (payload.eventType === "UPDATE") {
                        const messageEntry = findMessageEntry(payload.new.id);
                        const messageBubble = messageEntry?.querySelector(".message-bubble");
                        if (messageBubble && typeof payload.new.content === "string") {
                            messageBubble.textContent = payload.new.content;
                        }
                    } else if (payload.eventType === "DELETE") {
                        const messageEntry = findMessageEntry(payload.old.id);
                        messageEntry?.remove();
                    }
                }
            )
            .subscribe((subscriptionStatus, error) => {
                if (subscriptionStatus === "CHANNEL_ERROR" || subscriptionStatus === "TIMED_OUT") {
                    showConversationError(
                        "Les messages ne se mettent pas à jour en direct. Vérifiez que Realtime est activé pour la table Messages dans Supabase.",
                        error ?? new Error(subscriptionStatus)
                    );
                }
            });
    }

    async function initializeConversation() {
        messageInput.disabled = true;
        const requestedContactUsername = new URLSearchParams(window.location.search).get("contact");
        if (!requestedContactUsername) {
            conversationStatus.textContent = "Sélectionnez un contact pour ouvrir une conversation.";
            return;
        }

        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) {
            showConversationError("Impossible de vérifier la session. Reconnectez-vous.", authError);
            return;
        }
        if (!authData.user) {
            conversationStatus.textContent = "Connectez-vous pour accéder à vos conversations.";
            return;
        }
        currentUser = authData.user;

        const { data: contactProfile, error: contactError } = await supabase
            .from(TABLES.profiles)
            .select("id, username")
            .ilike("username", escapePostgrestLikePattern(requestedContactUsername))
            .maybeSingle();

        if (contactError) {
            showConversationError("Impossible de rechercher ce contact. Vérifiez les règles d’accès Supabase.", contactError);
            return;
        }
        if (!contactProfile) {
            conversationStatus.textContent = "Ce compte n’existe plus.";
            return;
        }
        if (contactProfile.id === currentUser.id) {
            conversationStatus.textContent = "Vous ne pouvez pas ouvrir une conversation avec vous-même.";
            return;
        }

        const { data: savedContact, error: savedContactError } = await supabase
            .from(TABLES.contacts)
            .select("id")
            .eq("created_by", currentUser.id)
            .eq("contact_user_id", contactProfile.id)
            .maybeSingle();

        if (savedContactError) {
            showConversationError("Impossible de vérifier ce contact. Vérifiez les règles d’accès Supabase.", savedContactError);
            return;
        }
        if (!savedContact) {
            conversationStatus.textContent = "Ajoutez d’abord cette personne à vos contacts.";
            return;
        }

        contactUsername = contactProfile.username;
        conversationTitle.textContent = `Conversation avec ${contactUsername}`;
        // Trie les identifiants pour interroger la conversation dans un ordre constant.
        const [firstParticipantId, secondParticipantId] = [currentUser.id, contactProfile.id].sort();
        const { data: existingConversation, error: conversationError } = await supabase
            .from(TABLES.conversations)
            .select("id")
            .eq("participant_1", firstParticipantId)
            .eq("participant_2", secondParticipantId)
            .maybeSingle();

        if (conversationError) {
            showConversationError("Impossible de charger la conversation. Vérifiez les règles d’accès Supabase.", conversationError);
            return;
        }

        if (existingConversation) {
            conversationId = existingConversation.id;
        } else {
            const { data: newConversation, error: insertError } = await supabase
                .from(TABLES.conversations)
                .insert({
                    participant_1: firstParticipantId,
                    participant_2: secondParticipantId
                })
                .select("id")
                .single();

            if (insertError?.code === "23505") {
                const { data: concurrentConversation, error: retryError } = await supabase
                    .from(TABLES.conversations)
                    .select("id")
                    .eq("participant_1", firstParticipantId)
                    .eq("participant_2", secondParticipantId)
                    .maybeSingle();

                if (retryError || !concurrentConversation) {
                    showConversationError("Impossible de récupérer la conversation créée.", retryError ?? insertError);
                    return;
                }
                conversationId = concurrentConversation.id;
            } else if (insertError) {
                showConversationError("Impossible de créer la conversation. Vérifiez les règles d’accès Supabase.", insertError);
                return;
            } else {
                conversationId = newConversation.id;
            }
        }

        conversationStatus.textContent = "";
        subscribeToRealtimeMessages();

        // Charge les messages existants dans l'ordre chronologique.
        const { data: conversationMessages, error: messagesError } = await supabase
            .from(TABLES.messages)
            .select("id, content, created_by, created_at")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true });

        if (messagesError) {
            showConversationError("Impossible de charger les messages. Vérifiez les règles d’accès Supabase.", messagesError);
            return;
        }

        (conversationMessages ?? []).forEach(renderMessage);
        messageInput.disabled = false;
        messageInput.focus();
    }

    messageInput.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        messageForm.requestSubmit();
    });

    messageForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const messageContent = messageInput.value.trim();
        if (!messageContent || !currentUser || !conversationId) return;

        // Empêche les envois répétés jusqu'au retour de Supabase.
        messageInput.disabled = true;
        conversationStatus.textContent = "";
        try {
            const { data: newMessage, error } = await supabase
                .from(TABLES.messages)
                .insert({
                    content: messageContent,
                    created_by: currentUser.id,
                    conversation_id: conversationId
                })
                .select("id, content, created_by, created_at")
                .single();

            if (error) {
                showConversationError("Impossible d’envoyer le message. Vérifiez les règles d’accès Supabase.", error);
                return;
            }

            renderMessage(newMessage);
            messageInput.value = "";
            messageInput.focus();

            try {
                // Place le contact en tête de la liste des conversations récentes.
                const recentContacts = JSON.parse(localStorage.getItem("lastMessagedPeople") ?? "[]");
                const validRecentContacts = Array.isArray(recentContacts)
                    ? recentContacts.filter((name) => typeof name === "string")
                    : [];
                localStorage.setItem(
                    "lastMessagedPeople",
                    JSON.stringify([
                        contactUsername,
                        ...validRecentContacts.filter((name) => name !== contactUsername)
                    ])
                );
            } catch (error) {
                console.error("Impossible de mettre à jour l’ordre des conversations:", error);
            }
        } catch (error) {
            showConversationError("Une erreur est survenue pendant l’envoi du message.", error);
        } finally {
            messageInput.disabled = false;
        }
    });

    initializeConversation().catch((error) => {
        showConversationError("Une erreur est survenue pendant le chargement de la conversation.", error);
    });

    window.addEventListener("pagehide", () => {
        if (realtimeMessagesChannel) {
            supabase.removeChannel(realtimeMessagesChannel);
        }
    }, { once: true });
}
