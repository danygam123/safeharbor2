// auth.js — SafeHarbor Authentication Module
// Requires: supabase.js (window.supabaseClient)
// Exposes: window.SH_Auth.getUser(), window.SH_Auth.requireAuth()

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const db = window.supabaseClient;

  // ── DOM refs ────────────────────────────────────────────────────
  const authBtn          = document.getElementById("auth-btn");
  const authDrawer       = document.getElementById("auth-drawer");
  const authTabSignIn    = document.getElementById("auth-tab-signin");
  const authTabSignUp    = document.getElementById("auth-tab-signup");
  const signInForm       = document.getElementById("signin-form");
  const signUpForm       = document.getElementById("signup-form");
  const signInPanel      = document.getElementById("auth-signin-panel");
  const signUpPanel      = document.getElementById("auth-signup-panel");
  const profilePanel     = document.getElementById("auth-profile-panel");
  const authErrorEl      = document.getElementById("auth-error");
  const authSuccessEl    = document.getElementById("auth-success");
  const authDrawerClose  = document.getElementById("auth-drawer-close");
  const signOutBtn       = document.getElementById("auth-signout-btn");
  const deleteAccBtn     = document.getElementById("auth-delete-account-btn");
  const profileName      = document.getElementById("auth-profile-name");
  const profileEmail     = document.getElementById("auth-profile-email");
  const forgotPassLink   = document.getElementById("auth-forgot-pass");
  const forgotPassPanel  = document.getElementById("auth-forgot-panel");
  const forgotPassForm   = document.getElementById("auth-forgot-form");
  const forgotBackBtn    = document.getElementById("auth-forgot-back");

  // ── State ───────────────────────────────────────────────────────
  let currentUser  = null;
  let currentProfile = null;

  // ── Public API ──────────────────────────────────────────────────
  window.SH_Auth = {
    getUser:    () => currentUser,
    getProfile: () => currentProfile,
    requireAuth: (callback, msg) => {
      if (currentUser) {
        callback();
      } else {
        window.openDrawerById("auth-drawer");
        showMessage("error", msg || "Please sign in to access this feature.");
      }
    },
  };

  // ── No Supabase configured ──────────────────────────────────────
  if (!db) {
    if (authBtn) {
      authBtn.title = "Add Supabase credentials to config.js to enable accounts";
    }
    updateAuthBtnUI(null);
    return;
  }

  // ── Session listener ────────────────────────────────────────────
  db.auth.onAuthStateChange(async (event, session) => {
    currentUser = session?.user || null;

    if (currentUser) {
      await loadProfile();
    } else {
      currentProfile = null;
    }

    updateAuthBtnUI(currentUser);
    updateAuthDrawerUI();

    // Notify feature modules
    window.dispatchEvent(
      new CustomEvent("safeharbor:authchange", { detail: { user: currentUser, profile: currentProfile } })
    );

    if (event === "SIGNED_IN") {
      // Close auth drawer after sign-in
      if (authDrawer && authDrawer.style.display !== "none") {
        setTimeout(() => window.closeAllDrawers(), 600);
      }
    }
  });

  // ── Load profile ────────────────────────────────────────────────
  async function loadProfile() {
    if (!currentUser) return;
    const { data, error } = await db
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single();

    if (error && error.code === "PGRST116") {
      // Profile doesn't exist yet — create it
      await createProfile();
    } else if (data) {
      currentProfile = data;
    }
  }

  async function createProfile() {
    if (!currentUser) return;
    const displayName =
      currentUser.user_metadata?.display_name ||
      currentUser.email?.split("@")[0] ||
      "Friend";

    const { data, error } = await db.from("profiles").insert({
      id: currentUser.id,
      display_name: displayName,
      role_preference: "teen",
      avatar_color: "#6366f1",
    }).select().single();

    if (!error) currentProfile = data;
  }

  // ── UI helpers ──────────────────────────────────────────────────
  function updateAuthBtnUI(user) {
    if (!authBtn) return;
    if (user) {
      const initials = getInitials(
        currentProfile?.display_name || user.email || "U"
      );
      const color = currentProfile?.avatar_color || "#6366f1";
      authBtn.innerHTML = `
        <span class="auth-avatar" style="background:${color};" aria-label="My Account">${initials}</span>
      `;
      authBtn.title = "My Account";
      authBtn.classList.add("signed-in");
    } else {
      authBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        Sign In
      `;
      authBtn.title = "Sign In or Create Account";
      authBtn.classList.remove("signed-in");
    }
  }

  function updateAuthDrawerUI() {
    if (!authDrawer) return;
    if (currentUser) {
      // Show profile panel
      if (signInPanel) signInPanel.style.display = "none";
      if (signUpPanel) signUpPanel.style.display = "none";
      if (forgotPassPanel) forgotPassPanel.style.display = "none";
      if (authTabSignIn) authTabSignIn.parentElement.style.display = "none";
      if (profilePanel) profilePanel.style.display = "flex";

      if (profileName)
        profileName.textContent = currentProfile?.display_name || currentUser.email?.split("@")[0] || "Welcome";
      if (profileEmail)
        profileEmail.textContent = currentUser.email || "";

      // Update avatar in profile panel
      const profileAvatar = document.getElementById("auth-profile-avatar");
      if (profileAvatar) {
        const initials = getInitials(currentProfile?.display_name || currentUser.email || "U");
        const color = currentProfile?.avatar_color || "#6366f1";
        profileAvatar.textContent = initials;
        profileAvatar.style.background = color;
      }
    } else {
      // Show sign in/up
      if (profilePanel) profilePanel.style.display = "none";
      const tabsRow = document.getElementById("auth-tabs-row");
      if (tabsRow) tabsRow.style.display = "flex";
      showSignInPanel();
    }
  }

  function showSignInPanel() {
    if (signInPanel) signInPanel.style.display = "flex";
    if (signUpPanel) signUpPanel.style.display = "none";
    if (forgotPassPanel) forgotPassPanel.style.display = "none";
    if (authTabSignIn) authTabSignIn.classList.add("active");
    if (authTabSignUp) authTabSignUp.classList.remove("active");
    clearMessages();
  }

  function showSignUpPanel() {
    if (signInPanel) signInPanel.style.display = "none";
    if (signUpPanel) signUpPanel.style.display = "flex";
    if (forgotPassPanel) forgotPassPanel.style.display = "none";
    if (authTabSignUp) authTabSignUp.classList.add("active");
    if (authTabSignIn) authTabSignIn.classList.remove("active");
    clearMessages();
  }

  function showForgotPanel() {
    if (signInPanel) signInPanel.style.display = "none";
    if (signUpPanel) signUpPanel.style.display = "none";
    if (forgotPassPanel) forgotPassPanel.style.display = "flex";
    clearMessages();
  }

  function showMessage(type, text) {
    clearMessages();
    const el = type === "error" ? authErrorEl : authSuccessEl;
    if (el) {
      el.textContent = text;
      el.style.display = "block";
    }
  }

  function clearMessages() {
    if (authErrorEl) { authErrorEl.textContent = ""; authErrorEl.style.display = "none"; }
    if (authSuccessEl) { authSuccessEl.textContent = ""; authSuccessEl.style.display = "none"; }
  }

  function getInitials(name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  function setLoading(form, loading) {
    const btn = form?.querySelector("button[type=submit]");
    if (btn) {
      btn.disabled = loading;
      btn.textContent = loading ? "Please wait…" : btn.dataset.label || btn.textContent;
    }
  }

  // ── Event Listeners ─────────────────────────────────────────────

  // Header auth button — open auth drawer
  if (authBtn) {
    authBtn.addEventListener("click", () => {
      window.openDrawerById("auth-drawer");
      updateAuthDrawerUI();
    });
  }

  if (authDrawerClose) {
    authDrawerClose.addEventListener("click", () => window.closeAllDrawers());
  }

  // Tab switching
  if (authTabSignIn) authTabSignIn.addEventListener("click", showSignInPanel);
  if (authTabSignUp) authTabSignUp.addEventListener("click", showSignUpPanel);

  // Forgot password link
  if (forgotPassLink) forgotPassLink.addEventListener("click", (e) => { e.preventDefault(); showForgotPanel(); });
  if (forgotBackBtn) forgotBackBtn.addEventListener("click", showSignInPanel);

  // ── Sign In ──────────────────────────────────────────────────────
  if (signInForm) {
    signInForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email    = document.getElementById("signin-email").value.trim();
      const password = document.getElementById("signin-password").value;

      if (!email || !password) {
        showMessage("error", "Please enter your email and password.");
        return;
      }

      setLoading(signInForm, true);
      clearMessages();

      const { error } = await db.auth.signInWithPassword({ email, password });

      setLoading(signInForm, false);

      if (error) {
        let msg = "Sign in failed. Please check your credentials.";
        if (error.message?.includes("Invalid login")) msg = "Incorrect email or password.";
        if (error.message?.includes("Email not confirmed")) msg = "Please confirm your email first. Check your inbox.";
        showMessage("error", msg);
      } else {
        signInForm.reset();
        showMessage("success", "Signed in! Welcome back.");
      }
    });
  }

  // ── Sign Up ──────────────────────────────────────────────────────
  if (signUpForm) {
    signUpForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const displayName = document.getElementById("signup-name").value.trim();
      const email       = document.getElementById("signup-email").value.trim();
      const password    = document.getElementById("signup-password").value;
      const confirm     = document.getElementById("signup-confirm").value;

      if (!email || !password || !confirm) {
        showMessage("error", "Please fill in all required fields.");
        return;
      }
      if (password !== confirm) {
        showMessage("error", "Passwords do not match.");
        return;
      }
      if (password.length < 8) {
        showMessage("error", "Password must be at least 8 characters.");
        return;
      }

      setLoading(signUpForm, true);
      clearMessages();

      const { error } = await db.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName || email.split("@")[0] },
        },
      });

      setLoading(signUpForm, false);

      if (error) {
        let msg = "Sign up failed. Please try again.";
        if (error.message?.includes("already registered")) msg = "An account with this email already exists.";
        if (error.message?.includes("Password")) msg = "Password is too weak. Use at least 8 characters.";
        showMessage("error", msg);
      } else {
        signUpForm.reset();
        showMessage(
          "success",
          "Account created! Check your email to confirm, then sign in."
        );
      }
    });
  }

  // ── Forgot Password ──────────────────────────────────────────────
  if (forgotPassForm) {
    forgotPassForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("forgot-email").value.trim();
      if (!email) { showMessage("error", "Please enter your email address."); return; }

      setLoading(forgotPassForm, true);
      clearMessages();

      const { error } = await db.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname,
      });

      setLoading(forgotPassForm, false);

      if (error) {
        showMessage("error", "Could not send reset email. Please try again.");
      } else {
        showMessage("success", "Password reset email sent. Check your inbox.");
        forgotPassForm.reset();
      }
    });
  }

  // ── Sign Out ─────────────────────────────────────────────────────
  if (signOutBtn) {
    signOutBtn.addEventListener("click", async () => {
      await db.auth.signOut();
      window.closeAllDrawers();
      // Toast via global function
      if (window.showToast) window.showToast("You've been signed out.", "info");
    });
  }

  // ── Delete Account ───────────────────────────────────────────────
  if (deleteAccBtn) {
    deleteAccBtn.addEventListener("click", async () => {
      const confirmed = confirm(
        "Are you sure you want to permanently delete your account?\n\n" +
        "This will erase all your check-ins, journal entries, goals, and personal data. " +
        "This action cannot be undone."
      );
      if (!confirmed) return;

      if (!currentUser) return;

      deleteAccBtn.disabled = true;
      deleteAccBtn.textContent = "Deleting…";

      // Real deletion: the delete_my_account() SQL function (see migrations/001) removes the
      // auth user, and ON DELETE CASCADE removes all of their check-ins, journal entries and goals.
      const { error: delErr } = await db.rpc("delete_my_account");
      if (delErr) {
        console.error("Account deletion failed:", delErr);
        deleteAccBtn.disabled = false;
        deleteAccBtn.textContent = "Delete My Account & Data";
        if (window.showToast) window.showToast("Couldn't delete your account. Please try again.", "error");
        return;
      }

      await db.auth.signOut();
      localStorage.clear();
      window.closeAllDrawers();
      if (window.showToast) window.showToast("Your account and data have been deleted.", "success");
      deleteAccBtn.disabled = false;
      deleteAccBtn.textContent = "Delete My Account & Data";
    });
  }

  // Initialize
  updateAuthBtnUI(null);
});
