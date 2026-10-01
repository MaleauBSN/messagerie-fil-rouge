document.addEventListener("DOMContentLoaded", () => {
    console.log("Page chargée");

    const emailInput = document.getElementById("email");
    if (emailInput) {
        emailInput.addEventListener("input", verify_mail);
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