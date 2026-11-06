import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://xxobbbnvflcmgmakqkyp.supabase.co";
const SUPABASE_KEY = "sb_publishable_Osk_F91GiWQRSS1XkGlfVg_CUvoTx3N";
// Crée le client partagé par les scripts du site.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
// Associe chaque nom logique au nom exact de sa table Supabase.
export const TABLES = {
    profiles: "profiles",
    contacts: "Contacts",
    conversations: "conversations",
    messages: "Messages"
};

export function escapePostgrestLikePattern(value) {
    // Échappe les caractères spéciaux du filtre ilike.
    return value.replace(/[\\%_]/g, "\\$&");
}

async function ensureProfileExists(authUser, username) {
    // Insère le profil avec l'identifiant du compte Auth.
    const { error } = await supabase
        .from(TABLES.profiles)
        .insert({ id: authUser.id, username });

    if (!error) return true;

    if (error.code === "23505") {
        // Recherche le profil par identifiant après un conflit de clé unique.
        const { data: existingProfile, error: lookupError } = await supabase
            .from(TABLES.profiles)
            .select("id")
            .eq("id", authUser.id)
            .maybeSingle();

        if (lookupError) {
            console.error("Erreur lors de la vérification du profil existant:", lookupError);
        } else if (existingProfile) {
            return true;
        }
    }

    console.error("Erreur lors de l’enregistrement du profil:", error);
    return false;
}

const loginForm = document.getElementById("login-form");
const loginStatus = document.getElementById("login-status");

if (loginForm) {
    const emailInput = document.getElementById("courriel");
    const passwordInput = document.getElementById("password");
    const signupUsernameField = document.getElementById("signup-username-field");
    const signupUsernameInput = document.getElementById("signup-username");
    const loginButton = document.getElementById("login-submit");
    const signupButton = document.getElementById("signup-submit");
    const authModeToggle = document.getElementById("auth-mode-toggle");
    let isSignupMode = false;

    authModeToggle.addEventListener("click", () => {
        // Bascule les champs requis et les boutons selon le mode choisi.
        isSignupMode = !isSignupMode;
        loginButton.hidden = isSignupMode;
        signupButton.hidden = !isSignupMode;
        signupUsernameField.hidden = !isSignupMode;
        signupUsernameInput.required = isSignupMode;
        authModeToggle.textContent = isSignupMode ? "Se connecter" : "Créer un compte";
        passwordInput.autocomplete = isSignupMode ? "new-password" : "current-password";
        loginStatus.textContent = "";
    });

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        // Réinitialise l'état du formulaire et désactive le bouton actif pendant la requête.
        loginStatus.textContent = "";
        loginStatus.classList.remove("is-success");
        const activeSubmitButton = isSignupMode ? signupButton : loginButton;
        activeSubmitButton.disabled = true;

        try {
            const signupUsername = signupUsernameInput.value.trim();
            if (isSignupMode) {
                // Vérifie que le nom d'utilisateur n'est pas déjà enregistré.
                const { data: existingProfile, error: usernameError } = await supabase
                    .from(TABLES.profiles)
                    .select("username")
                    .ilike("username", escapePostgrestLikePattern(signupUsername))
                    .maybeSingle();

                if (usernameError) {
                    console.error("Erreur lors de la vérification du nom d’utilisateur:", usernameError);
                    loginStatus.textContent = "Impossible de vérifier ce nom d’utilisateur. Réessayez.";
                    return;
                }

                if (existingProfile) {
                    loginStatus.textContent = "Ce nom d’utilisateur est déjà utilisé. Choisissez-en un autre.";
                    return;
                }
            }

            const authCredentials = {
                email: emailInput.value.trim(),
                password: passwordInput.value
            };
            // Appelle l'inscription ou la connexion avec les champs du formulaire.
            const { data: authResult, error } = isSignupMode
                ? await supabase.auth.signUp({
                    ...authCredentials,
                    // Envoie le nom choisi dans les métadonnées de l'inscription.
                    options: { data: { username: signupUsername } }
                })
                : await supabase.auth.signInWithPassword(authCredentials);

            if (error) {
                console.error("Erreur lors de l’authentification Supabase:", error);
                if (!isSignupMode) {
                    loginStatus.textContent = "Connexion refusée. Vérifiez votre adresse e-mail et votre mot de passe.";
                    return;
                }

                const errorMessage = typeof error.message === "string" ? error.message : "";
                const normalizedError = errorMessage.toLowerCase();
                if (normalizedError.includes("password")) {
                    loginStatus.textContent = "Le mot de passe ne respecte pas les exigences de Supabase. Choisissez un mot de passe plus long et réessayez.";
                } else if (normalizedError.includes("email") && normalizedError.includes("rate limit")) {
                    loginStatus.textContent = "Trop de tentatives d’inscription. Attendez quelques minutes avant de réessayer.";
                } else if (
                    normalizedError.includes("signup")
                    && (normalizedError.includes("disabled") || normalizedError.includes("not allowed"))
                ) {
                    loginStatus.textContent = "La création de comptes par courriel est désactivée dans les paramètres d’authentification Supabase.";
                } else if (errorMessage) {
                    loginStatus.textContent = `Supabase n’a pas pu créer le compte : ${errorMessage}`;
                } else {
                    loginStatus.textContent = "Supabase n’a pas pu créer le compte. Consultez la console du navigateur pour connaître l’erreur.";
                }
                return;
            }

            if (isSignupMode && authResult.user?.identities?.length === 0) {
                loginStatus.textContent = "Cette adresse courriel est déjà associée à un compte. Connectez-vous ou utilisez une autre adresse.";
                return;
            }

            if (authResult.session) {
                if (isSignupMode) {
                    if (!authResult.user || !(await ensureProfileExists(authResult.user, signupUsername))) {
                        loginStatus.textContent = "Le compte est créé, mais le profil n’a pas pu être enregistré. Connectez-vous de nouveau pour réessayer.";
                        return;
                    }
                } else {
                    const profileUsername = authResult.user?.user_metadata?.username;
                    if (
                        typeof profileUsername === "string"
                        && !(await ensureProfileExists(authResult.user, profileUsername))
                    ) {
                        loginStatus.textContent = "Connexion réussie, mais le profil n’a pas pu être enregistré. Réessayez.";
                        return;
                    }
                }

                // Ouvre la messagerie après l'authentification et l'enregistrement du profil.
                window.location.assign("conversation.html");
                return;
            }

            if (isSignupMode) {
                loginStatus.classList.add("is-success");
                loginStatus.textContent = "Compte créé. Consultez votre courriel pour confirmer l’adresse. Le nom d’utilisateur choisi a été transmis à Supabase.";
            } else {
                loginStatus.textContent = "Supabase n’a pas ouvert de session. Vérifiez votre adresse e-mail et votre mot de passe.";
            }
        } catch (error) {
            console.error("Erreur lors de l’authentification Supabase:", error);
            loginStatus.textContent = isSignupMode
                ? "Impossible de joindre le service de création de compte. Réessayez."
                : "Impossible de joindre le service de connexion. Réessayez.";
        } finally {
            activeSubmitButton.disabled = false;
        }
    });
}