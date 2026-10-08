console.log("Bonjour")

const courriel =
    document.querySelector("#courriel");

const courrielMessage =
    document.querySelector("#courriel-message");

courriel.addEventListener("input", function(event) {
    const valeur = courriel.value;
    const aUnArobase = valeur.includes("@");
    console.log("Courriel :", valeur);

    if (valeur === "") {
        courrielMessage.textContent =
            "Le courriel est obligatoire";
    } else if (!aUnArobase) {
        courrielMessage.textContent =
            "Le courriel n'est pas valide";
    }
});