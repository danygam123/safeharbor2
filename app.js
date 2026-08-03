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
  
  const menuBtn = document.getElementById("menu-btn");
  const menuDrawerClose = document.getElementById("menu-drawer-close");
  const emergencyActionBtnMain = document.getElementById("emergency-action-btn-main");
  const emergencyInfoBtn = document.getElementById("emergency-info-btn");
  const emergencyDrawerClose = document.getElementById("emergency-drawer-close");
  
  const menuViewSavedBtn = document.getElementById("menu-view-saved-btn");
  const menuResetExplBtn = document.getElementById("menu-reset-expl-btn");
  
  // Filter rows
  const topicFilterRow = document.getElementById("topic-filter-row");
  const audienceFilterRow = document.getElementById("audience-filter-row");
  
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
    expandedFacts: new Set()
  };

  // Initialize State from LocalStorage
  function initLocalStorage() {
    try {
      const saved = localStorage.getItem("safeharbor_bookmarks");
      if (saved) {
        state.savedResources = new Set(JSON.parse(saved));
      }
      
      const explored = localStorage.getItem("safeharbor_explored");
      if (explored) {
        state.exploredResources = new Set(JSON.parse(explored));
      }
      
      const checklist = localStorage.getItem("safeharbor_checklist");
      if (checklist) {
        state.checklistProgress = new Set(JSON.parse(checklist));
      }
      
      const activeStep = localStorage.getItem("safeharbor_checklist_step");
      if (activeStep) {
        state.activeChecklistStep = parseInt(activeStep, 10) || 1;
      }
    } catch (e) {
      console.error("Failed to load local storage state", e);
    }
    updateProgressUI();
  }

  function saveState() {
    try {
      localStorage.setItem("safeharbor_bookmarks", JSON.stringify(Array.from(state.savedResources)));
      localStorage.setItem("safeharbor_explored", JSON.stringify(Array.from(state.exploredResources)));
      localStorage.setItem("safeharbor_checklist", JSON.stringify(Array.from(state.checklistProgress)));
      localStorage.setItem("safeharbor_checklist_step", state.activeChecklistStep.toString());
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
    
    // Auto remove
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
    
    // Highlight if they explored something new
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
    
    drawer.style.display = "flex";
  }

  function closeAllDrawers() {
    drawerBackdrop.classList.remove("active");
    setTimeout(() => {
      menuDrawer.style.display = "none";
      emergencyDrawer.style.display = "none";
    }, 400);
  }

  // Event Listeners for Drawers
  menuBtn.addEventListener("click", () => openDrawer(menuDrawer));
  menuDrawerClose.addEventListener("click", closeAllDrawers);
  
  emergencyActionBtnMain.addEventListener("click", () => openDrawer(emergencyDrawer));
  emergencyInfoBtn.addEventListener("click", () => openDrawer(emergencyDrawer));
  emergencyDrawerClose.addEventListener("click", closeAllDrawers);
  
  drawerBackdrop.addEventListener("click", (e) => {
    if (e.target === drawerBackdrop) {
      closeAllDrawers();
    }
  });

  // Saved resources menu options
  menuViewSavedBtn.addEventListener("click", () => {
    state.viewMode = "bookmarks";
    closeAllDrawers();
    
    // Reset filters visual state
    document.querySelectorAll("#topic-filter-row .filter-chip").forEach(c => c.classList.remove("active"));
    document.querySelectorAll("#audience-filter-row .filter-chip").forEach(c => c.classList.remove("active"));
    
    // Set 'all' chips visually inactive, let's render a "Bookmarks active" banner
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

  // Filter Chips Interactions
  topicFilterRow.addEventListener("click", (e) => {
    const chip = e.target.closest(".filter-chip");
    if (!chip) return;
    
    document.querySelectorAll("#topic-filter-row .filter-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    
    state.activeTopic = chip.dataset.topic;
    state.viewMode = "feed"; // Reset to standard feed when filter clicked
    renderFeed();
  });

  audienceFilterRow.addEventListener("click", (e) => {
    const chip = e.target.closest(".filter-chip");
    if (!chip) return;
    
    document.querySelectorAll("#audience-filter-row .filter-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    
    state.activeAudience = chip.dataset.audience;
    state.viewMode = "feed"; // Reset to standard feed when filter clicked
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
    state.viewMode = "feed"; // Reset to feed when searching
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
      
      // Re-render to update the indicator/badge on the specific card
      renderFeed();
    }
    
    // Open in new tab safely
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
    event.stopPropagation(); // Avoid triggering selectChecklistStep
    
    if (state.checklistProgress.has(stepNum)) {
      state.checklistProgress.delete(stepNum);
    } else {
      state.checklistProgress.add(stepNum);
      
      // Automatically focus next step if checking off the current active step
      if (stepNum === state.activeChecklistStep && stepNum < window.CHECKLIST_STEPS.length) {
        state.activeChecklistStep = stepNum + 1;
      }
    }
    saveState();
    renderChecklistUI();
    
    // Check if fully completed
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

  // Helper to render the interactive checklist inside a card
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
      // Re-replace the parent element of the card
      const parent = checklistContainer.parentElement;
      const dummy = document.createElement("div");
      dummy.innerHTML = renderChecklistCardHTML();
      parent.replaceChild(dummy.firstElementChild, checklistContainer);
    }
  }

  // Main Render Engine
  function renderFeed() {
    feedContainer.innerHTML = "";
    
    // Filter Content Cards
    let filteredResources = window.RESOURCES_DATA.filter((item) => {
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
        
        // Reset topic & audience chips to 'all'
        document.querySelectorAll("#topic-filter-row .filter-chip").forEach((c, idx) => {
          if (idx === 0) c.classList.add("active");
          else c.classList.remove("active");
        });
        document.querySelectorAll("#audience-filter-row .filter-chip").forEach((c, idx) => {
          if (idx === 0) c.classList.add("active");
          else c.classList.remove("active");
        });
        state.activeTopic = "all";
        state.activeAudience = "all";
        
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
        
        document.querySelectorAll("#topic-filter-row .filter-chip").forEach((c, idx) => {
          if (idx === 0) c.classList.add("active");
          else c.classList.remove("active");
        });
        document.querySelectorAll("#audience-filter-row .filter-chip").forEach((c, idx) => {
          if (idx === 0) c.classList.add("active");
          else c.classList.remove("active");
        });
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
        <p>Try resetting filters or search criteria. Remember, all resources are sourced from credentialed clinical portals.</p>
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
        
        // Reset Visual Chips
        document.querySelectorAll("#topic-filter-row .filter-chip").forEach((c, idx) => {
          if (idx === 0) c.classList.add("active");
          else c.classList.remove("active");
        });
        document.querySelectorAll("#audience-filter-row .filter-chip").forEach((c, idx) => {
          if (idx === 0) c.classList.add("active");
          else c.classList.remove("active");
        });
        
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
        // default article
        typeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
      }

      // Generate HTML list tags
      const topicTags = resource.topics.map(t => `<span class="card-tag topic">${t.replace("-", " ")}</span>`).join("");
      const audienceTags = resource.audiences.map(a => `<span class="card-tag audience">${a}</span>`).join("");
      
      card.innerHTML = `
        <div class="card-thumbnail card-thumbnail-${resource.type}">
          <span class="card-org-tag">${resource.org}</span>
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
