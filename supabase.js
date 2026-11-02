import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://xxobbbnvflcmgmakqkyp.supabase.co";
const SUPABASE_KEY = "sb_publishable_Osk_F91GiWQRSS1XkGlfVg_CUvoTx3N";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const loginForm = document.getElementById("login-form");
const status = document.getElementById("login-status");

if (loginForm) {
    const emailInput = document.getElementById("courriel");
    const passwordInput = document.getElementById("password");
    const loginButton = document.getElementById("login-submit");
    const signupButton = document.getElementById("signup-submit");
    const modeToggle = document.getElementById("auth-mode-toggle");
    let isSignUp = false;

    modeToggle.addEventListener("click", () => {
        isSignUp = !isSignUp;
        loginButton.hidden = isSignUp;
        signupButton.hidden = !isSignUp;
        modeToggle.textContent = isSignUp ? "Se connecter" : "Créer un compte";
        passwordInput.autocomplete = isSignUp ? "new-password" : "current-password";
        status.textContent = "";
    });

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        status.textContent = "";
        status.classList.remove("is-success");
        const submitButton = isSignUp ? signupButton : loginButton;
        submitButton.disabled = true;

        try {
            const credentials = {
                email: emailInput.value.trim(),
                password: passwordInput.value
            };
            const { data, error } = isSignUp
                ? await supabase.auth.signUp(credentials)
                : await supabase.auth.signInWithPassword(credentials);

            if (error) {
                status.textContent = isSignUp
                    ? "Impossible de créer le compte. Vérifiez les informations saisies et réessayez."
                    : "Connexion refusée. Vérifiez votre adresse e-mail et votre mot de passe.";
                return;
            }

            if (data.session) {
                window.location.assign("conversation.html");
                return;
            }

            if (isSignUp) {
                status.classList.add("is-success");
                status.textContent = "Compte créé. Consultez votre courriel pour confirmer l’adresse avant de vous connecter.";
            } else {
                status.textContent = "Supabase n’a pas ouvert de session. Vérifiez votre adresse e-mail et votre mot de passe.";
            }
        } catch (error) {
            console.error("Erreur lors de l’authentification Supabase:", error);
            status.textContent = isSignUp
                ? "Impossible de joindre le service de création de compte. Réessayez."
                : "Impossible de joindre le service de connexion. Réessayez.";
        } finally {
            submitButton.disabled = false;
        }
    });
}