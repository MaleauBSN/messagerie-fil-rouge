document.addEventListener("DOMContentLoaded", () => {
    console.log("Page chargée");

    const emailInput = document.getElementById("email");
    if (emailInput) {
        emailInput.addEventListener("input", verify_mail);
    }

    const passwordInput = document.getElementById("password")
    if (passwordInput) {
        passwordInput.addEventListener("input", verify_password);
    }

});

function verify_mail(){
    const emailInput = document.getElementById("email");
    const emailRegex = /@.+\..+/;
    if (!emailRegex.test(emailInput.value)) {
        emailInput.style.color = "red";
    } else {
        emailInput.style.color = "black";
    }
}

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

