// Vérifications des formulaires en temps réel (email et mot de passe)
document.addEventListener("DOMContentLoaded", () => {
    console.log("Page chargée");

    // Les vérifications ne s'attachent que sur les pages qui ont ces champs
    const emailInput = document.getElementById("email");
    if (emailInput) {
        emailInput.addEventListener("input", verify_mail);
    }

    const passwordInput = document.getElementById("password")
    if (passwordInput && document.getElementById("password-requirements")) {
        passwordInput.addEventListener("input", verify_password);
    }

});

// Met le champ email en rouge tant qu'il n'a pas la forme x@y.z
function verify_mail(){
    const emailInput = document.getElementById("email");
    const emailRegex = /@.+\..+/;
    if (!emailRegex.test(emailInput.value)) {
        emailInput.style.color = "red";
    } else {
        emailInput.style.color = "black";
    }
}

// Colore chaque critère du mot de passe : vert s'il est respecté, rouge sinon
function verify_password(){
    const passwordInput = document.getElementById("password");
    const reqUppercase = document.getElementById("req-uppercase");
    const reqNombre = document.getElementById("req-number");
    const reqLongueurMin = document.getElementById("req-length");

    const passwordRegexNombre = /[0-9]/;
    const passwordRegexMaj = /[A-Z]/;
    const passwordRegexLenght = /.{8}/;

    if (passwordRegexMaj.test(passwordInput.value)) {
        reqUppercase.style.color = "rgb(106, 255, 106)";
    } else {
        reqUppercase.style.color = "rgb(246, 125, 125)";
    }

    if (passwordRegexNombre.test(passwordInput.value)) {
        reqNombre.style.color = "rgb(106, 255, 106)";
    } else {
        reqNombre.style.color = "rgb(246, 125, 125)";
    }

    if (passwordRegexLenght.test(passwordInput.value)) {
        reqLongueurMin.style.color = "rgb(106, 255, 106)";
    } else {
        reqLongueurMin.style.color = "rgb(246, 125, 125)";
    }
}

