const SUPABASE_URL = "https://eshvsvyyrdmlgwtfiglz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Hb5v4x8v8iZZJVXWufp23A_fzheBExR";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
)

function inscription(){
    document.getElementById("signup-button").addEventListener(
    "click"
    async () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        const { error } = await supabaseClient.auth.signUp(
            { email, password }
        );
        if (error) {
            loginStatus.textContent = error.message;
        } else {
            loginstatus.textContent = "Veuillez confirmer ...";
        }
    })
}

function connexion() {
    document.getElementById("connexion-button").addEventListener(
    "click"
    async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    const { data, error } = await supabase.auth.signInWithPassword({
  email: 'example@email.com',
  password: 'example-password',
})
}