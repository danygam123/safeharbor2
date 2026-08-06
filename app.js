document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const feedContainer = document.getElementById("feed-container");
  const searchBar = document.getElementById("search-bar");
  const clearSearchBtn = document.getElementById("clear-search-btn");
  const progressCount = document.getElementById("progress-count");
  const progressBadge = document.getElementById("progress-badge");
  
  // Drawer Elements
  const drawerBackdrop = document.getElementById("drawer-backdrop");
  const menuDrawer = document.getElementById("menu-drawer");
  const emergencyDrawer = document.getElementById("emergency-drawer");
  const goalsDrawer = document.getElementById("goals-drawer");
  const volunteerAdminDrawer = document.getElementById("volunteer-admin-drawer");
  
  const menuBtn = document.getElementById("menu-btn");
  const menuDrawerClose = document.getElementById("menu-drawer-close");
  const emergencyActionBtnMain = document.getElementById("emergency-action-btn-main");
  const emergencyInfoBtn = document.getElementById("emergency-info-btn");
  const emergencyDrawerClose = document.getElementById("emergency-drawer-close");
  const goalsDrawerClose = document.getElementById("goals-drawer-close");
  const volunteerAdminDrawerClose = document.getElementById("volunteer-admin-drawer-close");
  
  const menuViewSavedBtn = document.getElementById("menu-view-saved-btn");
  const menuResetExplBtn = document.getElementById("menu-reset-expl-btn");
  const menuOpenGoalsBtn = document.getElementById("menu-open-goals-btn");
  const menuOpenPortalBtn = document.getElementById("menu-open-portal-btn");
  const menuChangeRoleBtn = document.getElementById("menu-change-role-btn");
  
  // Overlays / Modals
  const onboardingOverlay = document.getElementById("onboarding-overlay");
  const checkinModalOverlay = document.getElementById("checkin-modal-overlay");
  const checkinGoalText = document.getElementById("checkin-goal-text");
  const checkinGoalTime = document.getElementById("checkin-goal-time");
  const checkinYesBtn = document.getElementById("checkin-yes-btn");
  const checkinNoBtn = document.getElementById("checkin-no-btn");
  
  // Filter rows
  const topicFilterRow = document.getElementById("topic-filter-row");
  const audienceFilterRow = document.getElementById("audience-filter-row");
  
  // Goals Section Elements
  const goalInput = document.getElementById("goal-input");
  const addGoalBtn = document.getElementById("add-goal-btn");
  const activeGoalContainer = document.getElementById("active-goal-container");
  const activeGoalText = document.getElementById("active-goal-text");
  const activeGoalTime = document.getElementById("active-goal-time");
  const totalGoalsCount = document.getElementById("total-goals-count");
  const metGoalsCount = document.getElementById("met-goals-count");
  const unmetGoalsCount = document.getElementById("unmet-goals-count");
  const goalsHistoryList = document.getElementById("goals-history-list");
  
  // Volunteer & Admin Elements
  const portalTabVolunteer = document.getElementById("portal-tab-volunteer");
  const portalTabAdmin = document.getElementById("portal-tab-admin");
  const volunteerSectionWrapper = document.getElementById("volunteer-section-wrapper");
  const adminSectionWrapper = document.getElementById("admin-section-wrapper");
  
  const volunteerSignupBox = document.getElementById("volunteer-signup-box");
  const volunteerPostBox = document.getElementById("volunteer-post-box");
  const volunteerSignupForm = document.getElementById("volunteer-signup-form");
  const volunteerPostForm = document.getElementById("volunteer-post-form");
  const volWelcomeMsg = document.getElementById("vol-welcome-msg");
  const volLogoutBtn = document.getElementById("vol-logout-btn");
  
  const adminLoginBox = document.getElementById("admin-login-box");
  const adminDashboardBox = document.getElementById("admin-dashboard-box");
  const adminLoginForm = document.getElementById("admin-login-form");
  const adminQueueContainer = document.getElementById("admin-queue-container");
  const adminLogoutBtn = document.getElementById("admin-logout-btn");

  // App State
  let state = {
    searchQuery: "",
    activeTopic: "all",
    activeAudience: "all",
    viewMode: "feed", // 'feed' or 'bookmarks'
    savedResources: new Set(),
    exploredResources: new Set(),
    checklistProgress: new Set(),
    activeChecklistStep: 1, // 1-indexed
    expandedFacts: new Set(),
    
    // New Feature States
    selectedRole: null,
    goals: [], // Array of { id, text, timestamp, status: 'active' | 'met' | 'unmet' }
    volunteerInfo: null, // { name, email, affiliation }
    pendingVideos: [], // Submitted by volunteers, pending admin review
    approvedVideos: [], // Approved volunteer submissions, merged into feed
    isAdmin: false,
    portalTab: "volunteer" // 'volunteer' or 'admin'
  };

  // Initialize State from LocalStorage
  function initLocalStorage() {
    try {
      const saved = localStorage.getItem("safeharbor_bookmarks");
      if (saved) state.savedResources = new Set(JSON.parse(saved));
      
      const explored = localStorage.getItem("safeharbor_explored");
      if (explored) state.exploredResources = new Set(JSON.parse(explored));
      
      const checklist = localStorage.getItem("safeharbor_checklist");
      if (checklist) state.checklistProgress = new Set(JSON.parse(checklist));
      
      const activeStep = localStorage.getItem("safeharbor_checklist_step");
      if (activeStep) state.activeChecklistStep = parseInt(activeStep, 10) || 1;
      
      // Onboarding & Role State
      const role = localStorage.getItem("safeharbor_selected_role");
      if (role) {
        state.selectedRole = role;
        state.activeAudience = role;
        // Visual Chip Sync
        syncAudienceChips(role);
      } else {
        // Show onboarding overlay on first load
        onboardingOverlay.style.display = "flex";
      }

      // Goals State
      const goalsData = localStorage.getItem("safeharbor_goals");
      if (goalsData) state.goals = JSON.parse(goalsData);

      // Volunteer State
      const volData = localStorage.getItem("safeharbor_volunteer_info");
      if (volData) state.volunteerInfo = JSON.parse(volData);

      // Submissions State
      const pendingData = localStorage.getItem("safeharbor_pending_videos");
      if (pendingData) state.pendingVideos = JSON.parse(pendingData);

      const approvedData = localStorage.getItem("safeharbor_approved_videos");
      if (approvedData) state.approvedVideos = JSON.parse(approvedData);
      
      // Active Goal Check-in Check
      const activeGoal = state.goals.find(g => g.status === 'active');
      if (activeGoal) {
        checkinGoalText.textContent = `"${activeGoal.text}"`;
        const dateStr = new Date(activeGoal.timestamp).toLocaleDateString(undefined, { 
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
        checkinGoalTime.textContent = `Set on ${dateStr}`;
        checkinModalOverlay.style.display = "flex";
      }

    } catch (e) {
      console.error("Failed to load local storage state", e);
    }
    updateProgressUI();
    syncVolunteerPortalUI();
    renderGoalsUI();
    renderAdminQueue();
  }

  function saveState() {
    try {
      localStorage.setItem("safeharbor_bookmarks", JSON.stringify(Array.from(state.savedResources)));
      localStorage.setItem("safeharbor_explored", JSON.stringify(Array.from(state.exploredResources)));
      localStorage.setItem("safeharbor_checklist", JSON.stringify(Array.from(state.checklistProgress)));
      localStorage.setItem("safeharbor_checklist_step", state.activeChecklistStep.toString());
      
      localStorage.setItem("safeharbor_selected_role", state.selectedRole || "");
      localStorage.setItem("safeharbor_goals", JSON.stringify(state.goals));
      localStorage.setItem("safeharbor_volunteer_info", state.volunteerInfo ? JSON.stringify(state.volunteerInfo) : "");
      localStorage.setItem("safeharbor_pending_videos", JSON.stringify(state.pendingVideos));
      localStorage.setItem("safeharbor_approved_videos", JSON.stringify(state.approvedVideos));
    } catch (e) {
      console.error("Failed to save state to local storage", e);
    }
  }

  // Toast Notification System
  function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    let icon = "";
    if (type === "success") {
      icon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === "info") {
      icon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }
    
    toast.innerHTML = `${icon}<span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add("fade-out");
      toast.addEventListener("animationend", () => {
        toast.remove();
      });
    }, 2800);
  }

  // Update Cosmetic Progress UI
  function updateProgressUI() {
    progressCount.textContent = state.exploredResources.size;
    progressBadge.classList.add("pulse-badge");
    setTimeout(() => {
      progressBadge.classList.remove("pulse-badge");
    }, 1000);
  }

  // Drawer Controllers
  function openDrawer(drawer) {
    drawerBackdrop.classList.add("active");
    menuDrawer.style.display = "none";
    emergencyDrawer.style.display = "none";
    goalsDrawer.style.display = "none";
    volunteerAdminDrawer.style.display = "none";
    
    drawer.style.display = "flex";
  }

  function closeAllDrawers() {
    drawerBackdrop.classList.remove("active");
    setTimeout(() => {
      menuDrawer.style.display = "none";
      emergencyDrawer.style.display = "none";
      goalsDrawer.style.display = "none";
      volunteerAdminDrawer.style.display = "none";
    }, 400);
  }

  // Event Listeners for Drawers
  menuBtn.addEventListener("click", () => openDrawer(menuDrawer));
  menuDrawerClose.addEventListener("click", closeAllDrawers);
  
  emergencyActionBtnMain.addEventListener("click", () => openDrawer(emergencyDrawer));
  emergencyInfoBtn.addEventListener("click", () => openDrawer(emergencyDrawer));
  emergencyDrawerClose.addEventListener("click", closeAllDrawers);
  
  goalsDrawerClose.addEventListener("click", closeAllDrawers);
  volunteerAdminDrawerClose.addEventListener("click", closeAllDrawers);
  
  drawerBackdrop.addEventListener("click", (e) => {
    if (e.target === drawerBackdrop) {
      closeAllDrawers();
    }
  });

  // Saved resources menu options
  menuViewSavedBtn.addEventListener("click", () => {
    state.viewMode = "bookmarks";
    closeAllDrawers();
    syncTopicChips("all");
    syncAudienceChips("all");
    renderFeed();
    showToast("Viewing bookmarked resources", "info");
  });

  menuResetExplBtn.addEventListener("click", () => {
    if (confirm("Reset your explored resources counter?")) {
      state.exploredResources.clear();
      saveState();
      updateProgressUI();
      renderFeed();
      closeAllDrawers();
      showToast("Counter reset", "info");
    }
  });

  // Open New Drawers from Menu
  menuOpenGoalsBtn.addEventListener("click", () => {
    openDrawer(goalsDrawer);
    renderGoalsUI();
  });

  menuOpenPortalBtn.addEventListener("click", () => {
    openDrawer(volunteerAdminDrawer);
  });

  menuChangeRoleBtn.addEventListener("click", () => {
    closeAllDrawers();
    onboardingOverlay.style.display = "flex";
  });

  // Onboarding Role Card Click Handler
  document.querySelectorAll(".role-select-card").forEach(card => {
    card.addEventListener("click", () => {
      const selectedRole = card.getAttribute("data-role");
      state.selectedRole = selectedRole;
      state.activeAudience = selectedRole;
      state.viewMode = "feed";
      
      saveState();
      syncAudienceChips(selectedRole);
      onboardingOverlay.style.display = "none";
      renderFeed();
      showToast(`Welcome! Feed filtered to ${card.querySelector("h3").textContent}`, "success");
    });
  });

  // Welcome Back Goal Check-In Actions
  checkinYesBtn.addEventListener("click", () => {
    completeActiveGoal('met');
  });

  checkinNoBtn.addEventListener("click", () => {
    completeActiveGoal('unmet');
  });

  function completeActiveGoal(status) {
    const activeGoal = state.goals.find(g => g.status === 'active');
    if (activeGoal) {
      activeGoal.status = status;
      saveState();
      renderGoalsUI();
      checkinModalOverlay.style.display = "none";
      if (status === 'met') {
        showToast("Awesome job accomplishing your goal!", "success");
      } else {
        showToast("No problem! Keep taking steps forward.", "info");
      }
    }
  }

  // Set Visual Chips Helpers
  function syncAudienceChips(role) {
    document.querySelectorAll("#audience-filter-row .filter-chip").forEach(c => {
      if (c.getAttribute("data-audience") === role) c.classList.add("active");
      else c.classList.remove("active");
    });
  }

  function syncTopicChips(topic) {
    document.querySelectorAll("#topic-filter-row .filter-chip").forEach(c => {
      if (c.getAttribute("data-topic") === topic) c.classList.add("active");
      else c.classList.remove("active");
    });
  }

  // Filter Chips Interactions
  topicFilterRow.addEventListener("click", (e) => {
    const chip = e.target.closest(".filter-chip");
    if (!chip) return;
    
    document.querySelectorAll("#topic-filter-row .filter-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    
    state.activeTopic = chip.dataset.topic;
    state.viewMode = "feed"; 
    renderFeed();
  });

  audienceFilterRow.addEventListener("click", (e) => {
    const chip = e.target.closest(".filter-chip");
    if (!chip) return;
    
    document.querySelectorAll("#audience-filter-row .filter-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    
    state.activeAudience = chip.dataset.audience;
    state.viewMode = "feed"; 
    renderFeed();
  });

  // Search Logic
  searchBar.addEventListener("input", (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    if (state.searchQuery.length > 0) {
      clearSearchBtn.style.display = "flex";
    } else {
      clearSearchBtn.style.display = "none";
    }
    state.viewMode = "feed"; 
    renderFeed();
  });

  clearSearchBtn.addEventListener("click", () => {
    searchBar.value = "";
    state.searchQuery = "";
    clearSearchBtn.style.display = "none";
    renderFeed();
  });

  // Track Resource Click (Cosmetic Progress)
  window.exploreResource = function(id, url) {
    if (!state.exploredResources.has(id)) {
      state.exploredResources.add(id);
      saveState();
      updateProgressUI();
      showToast("+1 Resource Explored", "success");
      renderFeed();
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Bookmark Toggle Action
  window.toggleBookmark = function(id, event) {
    event.stopPropagation();
    if (state.savedResources.has(id)) {
      state.savedResources.delete(id);
      showToast("Resource removed from saved list", "info");
    } else {
      state.savedResources.add(id);
      showToast("Resource saved locally", "success");
    }
    saveState();
    renderFeed();
  };

  // Toggle Quick Facts Expanding
  window.toggleFact = function(factId) {
    const card = document.getElementById(factId);
    if (!card) return;
    
    if (state.expandedFacts.has(factId)) {
      state.expandedFacts.delete(factId);
      card.classList.remove("expanded");
    } else {
      state.expandedFacts.add(factId);
      card.classList.add("expanded");
    }
  };

  // Interactive Checklist Step Handlers
  window.selectChecklistStep = function(stepNum) {
    state.activeChecklistStep = stepNum;
    saveState();
    renderChecklistUI();
  };

  window.toggleChecklistStepProgress = function(stepNum, event) {
    event.stopPropagation(); 
    
    if (state.checklistProgress.has(stepNum)) {
      state.checklistProgress.delete(stepNum);
    } else {
      state.checklistProgress.add(stepNum);
      if (stepNum === state.activeChecklistStep && stepNum < window.CHECKLIST_STEPS.length) {
        state.activeChecklistStep = stepNum + 1;
      }
    }
    saveState();
    renderChecklistUI();
    
    if (state.checklistProgress.size === window.CHECKLIST_STEPS.length) {
      showToast("Overdose Checklist Completed! You are prepared.", "success");
    }
  };

  window.resetChecklist = function(event) {
    event.stopPropagation();
    if (confirm("Reset checklist progress?")) {
      state.checklistProgress.clear();
      state.activeChecklistStep = 1;
      saveState();
      renderChecklistUI();
      showToast("Checklist reset", "info");
    }
  };

  // Checklist renderers
  function renderChecklistCardHTML() {
    const totalSteps = window.CHECKLIST_STEPS.length;
    const completedCount = state.checklistProgress.size;
    const progressPercent = Math.round((completedCount / totalSteps) * 100);
    
    let stepsHTML = "";
    
    window.CHECKLIST_STEPS.forEach((stepItem) => {
      const isCompleted = state.checklistProgress.has(stepItem.step);
      const isActive = state.activeChecklistStep === stepItem.step;
      
      let itemClass = "checklist-step-item";
      if (isCompleted) itemClass += " completed";
      if (isActive) itemClass += " active";
      
      let circleIcon = stepItem.step;
      if (isCompleted) {
        circleIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      }
      
      stepsHTML += `
        <div class="${itemClass}" onclick="selectChecklistStep(${stepItem.step})">
          <div class="checklist-circle" onclick="toggleChecklistStepProgress(${stepItem.step}, event)">
            ${circleIcon}
          </div>
          <div class="checklist-step-info">
            <div class="checklist-step-header">${stepItem.step}. ${stepItem.title}</div>
            <div class="checklist-step-short">${stepItem.short}</div>
            <div class="checklist-step-detail">
              <p>${stepItem.detail}</p>
            </div>
          </div>
        </div>
      `;
    });
    
    return `
      <div class="checklist-card">
        <div class="checklist-title-area">
          <h3>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            Overdose Response Tool
          </h3>
          ${completedCount > 0 ? `<button class="checklist-reset-btn" onclick="resetChecklist(event)">Reset</button>` : ""}
        </div>
        
        <div class="checklist-progress-bar-wrapper">
          <div class="checklist-progress-bar" style="width: ${progressPercent}%;"></div>
        </div>
        
        <div class="checklist-steps">
          ${stepsHTML}
        </div>
      </div>
    `;
  }

  function renderChecklistUI() {
    const checklistContainer = document.querySelector(".checklist-card");
    if (checklistContainer) {
      const parent = checklistContainer.parentElement;
      const dummy = document.createElement("div");
      dummy.innerHTML = renderChecklistCardHTML();
      parent.replaceChild(dummy.firstElementChild, checklistContainer);
    }
  }

  // ==========================================
  // GOALS LOGIC & RENDERERS
  // ==========================================
  addGoalBtn.addEventListener("click", () => {
    const text = goalInput.value.trim();
    if (!text) {
      alert("Please enter a goal.");
      return;
    }

    // Check if there is already an active goal
    const activeIndex = state.goals.findIndex(g => g.status === 'active');
    if (activeIndex !== -1) {
      if (!confirm("You already have an active goal. Setting a new one will archive the current goal as 'not met'. Proceed?")) {
        return;
      }
      state.goals[activeIndex].status = 'unmet';
    }

    const newGoal = {
      id: "goal-" + Date.now(),
      text: text,
      timestamp: Date.now(),
      status: "active"
    };

    state.goals.unshift(newGoal); // Add to beginning of history
    saveState();
    renderGoalsUI();
    goalInput.value = "";
    showToast("Learning goal set!", "success");
  });

  function renderGoalsUI() {
    // Analytics calculations
    const totalCount = state.goals.length;
    const metCount = state.goals.filter(g => g.status === 'met').length;
    const unmetCount = state.goals.filter(g => g.status === 'unmet').length;

    totalGoalsCount.textContent = totalCount;
    metGoalsCount.textContent = metCount;
    unmetGoalsCount.textContent = unmetCount;

    // Render active goal block in drawer
    const activeGoal = state.goals.find(g => g.status === 'active');
    if (activeGoal) {
      activeGoalText.textContent = `"${activeGoal.text}"`;
      const dateStr = new Date(activeGoal.timestamp).toLocaleDateString(undefined, { 
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
      });
      activeGoalTime.textContent = `Started on ${dateStr}`;
      activeGoalContainer.style.display = "block";
    } else {
      activeGoalContainer.style.display = "none";
    }

    // Render history log list
    goalsHistoryList.innerHTML = "";
    if (state.goals.length === 0) {
      goalsHistoryList.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 20px 0;">
          No goal history recorded yet.
        </div>
      `;
    } else {
      state.goals.forEach(g => {
        const item = document.createElement("div");
        item.className = "goal-history-item";
        
        const dateStr = new Date(g.timestamp).toLocaleDateString(undefined, { 
          month: 'short', day: 'numeric', year: '2-digit' 
        });

        let statusText = g.status;
        let badgeClass = "goal-status-badge active";
        if (g.status === 'met') {
          statusText = "Met";
          badgeClass = "goal-status-badge met";
        } else if (g.status === 'unmet') {
          statusText = "Not Met";
          badgeClass = "goal-status-badge unmet";
        } else {
          statusText = "Active";
        }

        item.innerHTML = `
          <div style="flex: 1;">
            <div class="goal-history-text">${g.text}</div>
            <div class="goal-history-date">${dateStr}</div>
          </div>
          <span class="${badgeClass}">${statusText}</span>
        `;
        goalsHistoryList.appendChild(item);
      });
    }
  }

  // ==========================================
  // VOLUNTEER & ADMIN LOGIC
  // ==========================================
  
  // Tab switching inside Volunteer/Admin drawer
  portalTabVolunteer.addEventListener("click", () => {
    portalTabVolunteer.classList.add("active");
    portalTabAdmin.classList.remove("active");
    volunteerSectionWrapper.style.display = "flex";
    adminSectionWrapper.style.display = "none";
    state.portalTab = "volunteer";
  });

  portalTabAdmin.addEventListener("click", () => {
    portalTabAdmin.classList.add("active");
    portalTabVolunteer.classList.remove("active");
    adminSectionWrapper.style.display = "flex";
    volunteerSectionWrapper.style.display = "none";
    state.portalTab = "admin";
    syncAdminDashboardUI();
  });

  // Volunteer form sync
  function syncVolunteerPortalUI() {
    if (state.volunteerInfo) {
      volunteerSignupBox.style.display = "none";
      volunteerPostBox.style.display = "block";
      volWelcomeMsg.innerHTML = `Welcome, <strong>${state.volunteerInfo.name}</strong> (${state.volunteerInfo.affiliation})`;
    } else {
      volunteerSignupBox.style.display = "block";
      volunteerPostBox.style.display = "none";
    }
  }

  // Volunteer registration submit
  volunteerSignupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("vol-name").value.trim();
    const email = document.getElementById("vol-email").value.trim();
    const affiliation = document.getElementById("vol-affiliation").value.trim();

    if (!name || !email || !affiliation) return;

    state.volunteerInfo = { name, email, affiliation };
    saveState();
    syncVolunteerPortalUI();
    showToast("Volunteer account active!", "success");
    volunteerSignupForm.reset();
  });

  // Volunteer Post Video submit
  volunteerPostForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("post-title").value.trim();
    const url = document.getElementById("post-url").value.trim();
    const audience = document.getElementById("post-audience").value;
    const desc = document.getElementById("post-desc").value.trim();

    if (!title || !url || !desc) return;

    // Create custom pending submission object
    const newSubmission = {
      id: "vol-sub-" + Date.now(),
      title: title,
      org: state.volunteerInfo.affiliation,
      type: "video", // Only videos allowed per guidelines
      audiences: [audience],
      topics: ["overdose-response"], // Default fallback tag
      url: url,
      description: desc,
      volunteerSubmitted: true,
      authorName: state.volunteerInfo.name,
      authorEmail: state.volunteerInfo.email,
      timestamp: Date.now()
    };

    state.pendingVideos.push(newSubmission);
    saveState();
    renderAdminQueue();
    volunteerPostForm.reset();
    showToast("Submitted! Pending Admin Review.", "success");
  });

  // Volunteer Logout
  volLogoutBtn.addEventListener("click", () => {
    if (confirm("Logout of volunteer profile?")) {
      state.volunteerInfo = null;
      saveState();
      syncVolunteerPortalUI();
      showToast("Logged out", "info");
    }
  });

  // Admin Section Login logic
  function syncAdminDashboardUI() {
    if (state.isAdmin) {
      adminLoginBox.style.display = "none";
      adminDashboardBox.style.display = "block";
      renderAdminQueue();
    } else {
      adminLoginBox.style.display = "block";
      adminDashboardBox.style.display = "none";
    }
  }

  adminLoginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const pass = document.getElementById("admin-pass").value;
    if (pass === "admin123") {
      state.isAdmin = true;
      syncAdminDashboardUI();
      showToast("Authorized as Admin", "success");
    } else {
      alert("Incorrect password. Use: admin123");
    }
    adminLoginForm.reset();
  });

  adminLogoutBtn.addEventListener("click", () => {
    state.isAdmin = false;
    syncAdminDashboardUI();
    showToast("Logged out of Admin Portal", "info");
  });

  // Approve & Reject Functions
  window.approveSubmission = function(id) {
    const itemIndex = state.pendingVideos.findIndex(v => v.id === id);
    if (itemIndex === -1) return;

    const approvedItem = state.pendingVideos.splice(itemIndex, 1)[0];
    state.approvedVideos.push(approvedItem);
    
    saveState();
    renderAdminQueue();
    renderFeed();
    showToast("Video approved and posted to feed!", "success");
  };

  window.rejectSubmission = function(id) {
    if (confirm("Are you sure you want to reject this volunteer submission?")) {
      const itemIndex = state.pendingVideos.findIndex(v => v.id === id);
      if (itemIndex === -1) return;

      state.pendingVideos.splice(itemIndex, 1);
      saveState();
      renderAdminQueue();
      showToast("Submission rejected", "info");
    }
  };

  // Delete an already-approved volunteer video from the live feed
  window.deleteApprovedVideo = function(id) {
    if (confirm("Remove this volunteer-submitted video from the live feed?")) {
      const idx = state.approvedVideos.findIndex(v => v.id === id);
      if (idx === -1) return;
      state.approvedVideos.splice(idx, 1);
      saveState();
      renderAdminQueue();
      renderFeed();
      showToast("Video removed from feed", "info");
    }
  };

  // Render Admin Pending Queue + Approved Videos section
  function renderAdminQueue() {
    adminQueueContainer.innerHTML = "";

    // ---- PENDING submissions ----
    const pendingHeader = document.createElement("div");
    pendingHeader.style.cssText = "font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:8px;";
    pendingHeader.textContent = "Pending Review";
    adminQueueContainer.appendChild(pendingHeader);

    if (state.pendingVideos.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "text-align:center;color:var(--text-muted);font-size:0.8rem;padding:20px 10px;border:1px dashed var(--panel-border);border-radius:12px;";
      empty.textContent = "No pending submissions.";
      adminQueueContainer.appendChild(empty);
    } else {
      state.pendingVideos.forEach(v => {
        const item = document.createElement("div");
        item.className = "admin-submission-item";
        item.innerHTML = `
          <div class="admin-submission-item-meta">
            <span class="card-tag audience" style="text-transform:capitalize;">Audience: ${v.audiences[0]}</span>
            <span class="admin-submission-item-author">By: ${v.authorName} (${v.org})</span>
          </div>
          <div class="admin-submission-item-title">${v.title}</div>
          <div class="admin-submission-item-desc">${v.description}</div>
          <a href="${v.url}" target="_blank" style="font-size:0.72rem;color:var(--accent-color);word-break:break-all;margin-top:2px;text-decoration:underline;">Open Link: ${v.url}</a>
          <div class="admin-action-btn-row">
            <button class="admin-action-btn approve" onclick="approveSubmission('${v.id}')">Approve</button>
            <button class="admin-action-btn reject" onclick="rejectSubmission('${v.id}')">Reject</button>
          </div>
        `;
        adminQueueContainer.appendChild(item);
      });
    }

    // ---- APPROVED (live) volunteer videos ----
    const divider = document.createElement("div");
    divider.style.cssText = "border-top:1px solid var(--panel-border);margin:16px 0 12px;";
    adminQueueContainer.appendChild(divider);

    const approvedHeader = document.createElement("div");
    approvedHeader.style.cssText = "font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:8px;";
    approvedHeader.textContent = `Live Volunteer Videos (${state.approvedVideos.length})`;
    adminQueueContainer.appendChild(approvedHeader);

    if (state.approvedVideos.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "text-align:center;color:var(--text-muted);font-size:0.8rem;padding:20px 10px;border:1px dashed var(--panel-border);border-radius:12px;";
      empty.textContent = "No approved volunteer videos in the feed yet.";
      adminQueueContainer.appendChild(empty);
    } else {
      state.approvedVideos.forEach(v => {
        const item = document.createElement("div");
        item.className = "admin-submission-item";
        item.style.borderColor = "rgba(245,158,11,0.25)";
        item.innerHTML = `
          <div class="admin-submission-item-meta">
            <span class="card-tag audience" style="text-transform:capitalize;">Audience: ${v.audiences[0]}</span>
            <span class="admin-submission-item-author">By: ${v.authorName} (${v.org})</span>
          </div>
          <div class="admin-submission-item-title">${v.title}</div>
          <div class="admin-submission-item-desc">${v.description}</div>
          <a href="${v.url}" target="_blank" style="font-size:0.72rem;color:var(--accent-color);word-break:break-all;margin-top:2px;text-decoration:underline;">Open Link: ${v.url}</a>
          <div class="admin-action-btn-row">
            <button class="admin-action-btn reject" onclick="deleteApprovedVideo('${v.id}')" style="background:#7c3aed;">Remove from Feed</button>
          </div>
        `;
        adminQueueContainer.appendChild(item);
      });
    }
  }

  // ==========================================
  // MAIN FEED RENDER ENGINE
  // ==========================================
  function renderFeed() {
    feedContainer.innerHTML = "";
    
    // Merge standard clinical library with approved volunteer videos
    const allResources = [...window.RESOURCES_DATA, ...state.approvedVideos];
    
    // Filter Content Cards
    let filteredResources = allResources.filter((item) => {
      // Search query filter
      const matchesSearch = !state.searchQuery || 
        item.title.toLowerCase().includes(state.searchQuery) ||
        item.description.toLowerCase().includes(state.searchQuery) ||
        item.org.toLowerCase().includes(state.searchQuery) ||
        item.topics.some(t => t.toLowerCase().includes(state.searchQuery)) ||
        item.audiences.some(a => a.toLowerCase().includes(state.searchQuery));
        
      // Topic filter
      const matchesTopic = state.activeTopic === "all" || item.topics.includes(state.activeTopic);
      
      // Audience filter
      const matchesAudience = state.activeAudience === "all" || item.audiences.includes(state.activeAudience);
      
      // Bookmarks filter
      const matchesBookmarks = state.viewMode !== "bookmarks" || state.savedResources.has(item.id);
      
      return matchesSearch && matchesTopic && matchesAudience && matchesBookmarks;
    });

    // Header label indicating filters if active
    if (state.viewMode === "bookmarks") {
      const banner = document.createElement("div");
      banner.style.padding = "10px 14px";
      banner.style.background = "var(--secondary-glow)";
      banner.style.border = "1px solid rgba(99, 102, 241, 0.3)";
      banner.style.borderRadius = "12px";
      banner.style.display = "flex";
      banner.style.justifyContent = "space-between";
      banner.style.alignItems = "center";
      banner.style.marginBottom = "8px";
      banner.innerHTML = `
        <span style="font-size: 0.85rem; font-weight: 600; color: #a5b4fc;">Viewing Saved Resources (${filteredResources.length})</span>
        <button style="background: transparent; border: none; color: var(--text-primary); cursor: pointer; font-size: 0.78rem; font-weight: 600; text-decoration: underline;" id="clear-bookmarks-view">Back to Feed</button>
      `;
      feedContainer.appendChild(banner);
      
      document.getElementById("clear-bookmarks-view").addEventListener("click", () => {
        state.viewMode = "feed";
        
        // Reset topic & audience chips to 'all' or activeRole if stored
        if (state.selectedRole) {
          syncTopicChips("all");
          syncAudienceChips(state.selectedRole);
          state.activeTopic = "all";
          state.activeAudience = state.selectedRole;
        } else {
          syncTopicChips("all");
          syncAudienceChips("all");
          state.activeTopic = "all";
          state.activeAudience = "all";
        }
        
        renderFeed();
      });
    } else if (state.activeTopic !== "all" || state.activeAudience !== "all" || state.searchQuery) {
      const banner = document.createElement("div");
      banner.style.padding = "8px 12px";
      banner.style.background = "rgba(255, 255, 255, 0.03)";
      banner.style.border = "1px solid var(--panel-border)";
      banner.style.borderRadius = "10px";
      banner.style.display = "flex";
      banner.style.justifyContent = "space-between";
      banner.style.alignItems = "center";
      banner.style.marginBottom = "8px";
      banner.innerHTML = `
        <span style="font-size: 0.78rem; color: var(--text-secondary);">Filtered Feed: ${filteredResources.length} matches</span>
        <button style="background: transparent; border: none; color: var(--accent-color); cursor: pointer; font-size: 0.78rem; font-weight: 600;" id="reset-filters-btn">Reset Filters</button>
      `;
      feedContainer.appendChild(banner);
      
      document.getElementById("reset-filters-btn").addEventListener("click", () => {
        searchBar.value = "";
        state.searchQuery = "";
        clearSearchBtn.style.display = "none";
        
        syncTopicChips("all");
        syncAudienceChips("all");
        state.activeTopic = "all";
        state.activeAudience = "all";
        state.viewMode = "feed";
        
        renderFeed();
      });
    }

    // Render Empty State if no resources found
    if (filteredResources.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "empty-state";
      emptyDiv.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        <h3>No Resources Found</h3>
        <p>Try resetting filters or search criteria. Remember, all official resources are sourced from credentialed clinical portals.</p>
        <button class="empty-state-btn" id="empty-reset-btn">Reset Filters</button>
      `;
      feedContainer.appendChild(emptyDiv);
      
      document.getElementById("empty-reset-btn").addEventListener("click", () => {
        searchBar.value = "";
        state.searchQuery = "";
        clearSearchBtn.style.display = "none";
        state.activeTopic = "all";
        state.activeAudience = "all";
        state.viewMode = "feed";
        
        syncTopicChips("all");
        syncAudienceChips("all");
        
        renderFeed();
      });
      return;
    }

    // Prepare content queue, interspersing interactive tools and facts
    let feedIndex = 0;
    
    filteredResources.forEach((resource, index) => {
      // Intersperse Checklist Card: Let's place it at position 1 (second card) of the default global feed
      if (state.viewMode === "feed" && !state.searchQuery && state.activeTopic === "all" && state.activeAudience === "all" && feedIndex === 1) {
        const checklistCardWrapper = document.createElement("div");
        checklistCardWrapper.innerHTML = renderChecklistCardHTML();
        feedContainer.appendChild(checklistCardWrapper.firstElementChild);
        feedIndex++;
      }
      
      // Intersperse Quick Fact Card: e.g. after every 3 resource cards, mix in a quick fact if in feed mode
      if (state.viewMode === "feed" && !state.searchQuery && feedIndex > 0 && feedIndex % 3 === 0) {
        const factIndex = Math.floor(feedIndex / 3) - 1;
        const fact = window.QUICK_FACTS[factIndex % window.QUICK_FACTS.length];
        if (fact) {
          const isExpanded = state.expandedFacts.has(fact.id);
          const factCard = document.createElement("div");
          factCard.className = `fact-card ${isExpanded ? 'expanded' : ''}`;
          factCard.id = fact.id;
          factCard.setAttribute("onclick", `toggleFact('${fact.id}')`);
          factCard.innerHTML = `
            <div class="fact-header">
              <div class="fact-bulb-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path>
                  <line x1="9" y1="18" x2="15" y2="18"></line>
                  <line x1="10" y1="22" x2="14" y2="22"></line>
                </svg>
              </div>
              <div class="fact-title-text">${fact.fact}</div>
              <div class="fact-chevron">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </div>
            <div class="fact-detail">
              ${fact.detail}
            </div>
          `;
          feedContainer.appendChild(factCard);
          feedIndex++;
        }
      }

      // Render standard Resource Card
      const isSaved = state.savedResources.has(resource.id);
      const isExplored = state.exploredResources.has(resource.id);
      
      const card = document.createElement("div");
      card.className = "feed-card";
      
      // Determine Type Icon
      let typeIcon = "";
      if (resource.type === "video") {
        typeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
      } else if (resource.type === "infographic") {
        typeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>`;
      } else if (resource.type === "pdf") {
        typeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
      } else {
        typeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
      }

      // Generate HTML list tags
      const topicTags = resource.topics.map(t => `<span class="card-tag topic">${t.replace("-", " ")}</span>`).join("");
      const audienceTags = resource.audiences.map(a => `<span class="card-tag audience">${a}</span>`).join("");
      
      // Check if volunteer submitted to toggle badge style
      let badgeHTML = "";
      if (resource.volunteerSubmitted) {
        badgeHTML = `<span class="card-org-tag volunteer">Volunteer-Submitted</span>`;
      } else {
        badgeHTML = `<span class="card-org-tag">${resource.org}</span>`;
      }

      card.innerHTML = `
        <div class="card-thumbnail card-thumbnail-${resource.type}">
          ${badgeHTML}
          <div class="card-type-icon-wrapper" title="${resource.type.toUpperCase()} content">
            ${typeIcon}
          </div>
          ${isExplored ? `
            <div style="position: absolute; top: 12px; right: 12px; background: rgba(16, 185, 129, 0.9); padding: 4px 10px; border-radius: 20px; font-size: 0.65rem; font-weight: 700; border: 1px solid rgba(255,255,255,0.1); color: white; display: flex; align-items: center; gap: 4px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Explored
            </div>
          ` : ""}
        </div>
        <div class="card-content">
          <div class="card-tags">
            ${topicTags}
            ${audienceTags}
          </div>
          <h3 class="card-title">${resource.title}</h3>
          <p class="card-description">${resource.description}</p>
        </div>
        <div class="card-footer">
          <button class="card-action-btn bookmark-btn ${isSaved ? 'saved' : ''}" onclick="toggleBookmark('${resource.id}', event)" aria-label="Bookmark resource">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>
          <button class="card-action-btn visit-btn" onclick="exploreResource('${resource.id}', '${resource.url}')">
            View Resource
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      `;
      feedContainer.appendChild(card);
      feedIndex++;
    });
  }

  // App Kickoff
  initLocalStorage();
  renderFeed();
});
