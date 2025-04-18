const vscode = acquireVsCodeApi(); // GET THE VSCODE API TO COMMUNICATE

// <--------- TOP LEVEL CODES :START --------->

// GLOBAL FLAG
let isButtonAtached = false;
let preDefinedKeywords = [];

// SAVE LATEST BACKEDN DATA EVERYTIME
let latestBackendData = null;
let latestKeywordData = null;

// AUTOMATICALLY ASSIGN BASED ON ACTIVE TAB
let Tab = "Task"; // Default

// CURRENT ITEMS
const currentItems = new Map();

// KEYWORD MANAGEMENT ELEMENTS & TAB HOLDER(CONTAINER)
const inputKeyword = document.getElementById("keyword-input");
const inputColor = document.getElementById("color-input");
const newKeywordForm = document.getElementById("newKeywordForm");
const mainFeaturesWrapper = document.getElementById("main-features-wrapper");
const keywordList = document.getElementById("keyword-list");
const keywordManagementView = document.getElementById(
  "keyword-management-view"
);
const addKeyword = document.getElementById("add-keyword");
const backToMain = document.getElementById("back-to-main");

// TAB ELEMENTS
const taskContainer = document.getElementById("Task-content");
const collectionContainer = document.getElementById("Collection-content");
const doneContainer = document.getElementById("Done-content");
const tabElements = document.querySelectorAll(".tabs-header li");
const tabContents = document.querySelectorAll(".whole-tab-content");

// TASK SEARCH INPUT
taskSearchInput = document.getElementById("input-filter-task");

// DONE SEARCH INPUT
doneSearchInput = document.getElementById("input-filter-done");

// COLLECTION SEARCH INPUT
collectionSearchInput = document.getElementById("input-filter-collection");

// FILTER BUTTON
const filter_button = document.getElementById("filter-button");
const option_parent = document.querySelector(".filter-button");

// FILTER OPTION BUTTONS
const filter_option_buttons = document.querySelectorAll(".option-li");

// FILTER BUTTON OPTIONS CONTAINER
const filter_option_container = document.querySelector(
  ".filter-option-container"
);

// CUSTOM ERROR MESSAGE (FRONTEND)
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3000);
}

// <--------- TOP LEVEL CODES :END --------->
//
//
//
//
//
// <--------- BACKEND DATA LISTENING & SENDING :START --------->

// FETCH ALL KEYWORDS WHEN THE SIDEBAR LOAD..
window.onload = () => {
  fetchAllKeywords();
};

// ON PAGE LOAD ACTIVATE THE CURRENT TAB
document.addEventListener("DOMContentLoaded", () => {
  setActiveTab(Tab);
});

// ACTIVELY LISTEN FOR DATA SENT FROM BACKEND
window.addEventListener("message", (event) => {
  if (event.data.command === "updateData") {
    const data = event.data.data || [];
    const keyword = event.data.keyword || [];

    // Prevent updating with empty data
    if (data.length === 0) {
      console.warn("⚠️ Skipped updateSidebarUI: Empty data received.");
      return;
    }

    // STORE LATEST DATA
    latestBackendData = data;
    latestKeywordData = keyword;

    // RENDER UI WITH NEW DATA
    updateSidebarUI(data);
    updatepreDefinedKeywords(latestKeywordData);
    renderKeywordList();
  }
});

// FUNCTION TO SEND MESSAGE TO BACKEND
function sendMessageToBackend(command, payload = {}) {
  vscode.postMessage({ command, ...payload });
}

// <--------- BACKEND DATA LISTENING & SENDING :END --------->
//
//
//
//
//
// <--------- MARK-DONE-FEATURES :START --------->

// FUNCTION TO MARK DONE
function markDone(keyword, comment, fileName, fullPath, line) {
  const message = {
    action: "done",
    keyword,
    comment,
    fileName,
    fullPath,
    line,
  };

  // SEND MESSAGE TO BACKEND
  sendMessageToBackend("toggleMark", message);
}

// FUNCTION TO MARK UNDO
function markUndo(keyword, comment, fileName, fullPath, line) {
  const message = {
    action: "undo",
    keyword,
    comment,
    fileName,
    fullPath,
    line,
  };

  // SEND MESSAGE TO BACKEND
  sendMessageToBackend("toggleMark", message);
}

// <--------- MARK-DONE-FEATURES :END --------->
//
//
//
//
//
// <--------- KEYWORD MANAGEMENT UI :START --------->

// BUTTON TO ADD KEYWORD(FRONTEND)
newKeywordForm.addEventListener("click", () => {
  let keyword = inputKeyword.value.trim();
  const color = inputColor.value;

  if (!keyword) {
    showToast("Please enter a keyword.");
    inputKeyword.focus();
    return;
  }

  if (!/^#[0-9A-F]{6}$/i.test(color)) {
    showToast("Please select a valid color.");
    inputColor.focus();
    return;
  }

  // ADD KEYWORD IF INPUT IS VALID!
  // Convert normal -> NORMAL:
  keyword = keyword.toUpperCase() + ":";
  addAKeyword(keyword, color);

  // RESET FORM
  inputKeyword.value = "";
  inputColor.value = "#ffffff";
});

// OPEN THE KEYWORD MANGEMENT UI(FRONTEND)
addKeyword.addEventListener("click", () => {
  keywordManagementView.style.display = "block"; // display it
  mainFeaturesWrapper.style.display = "none"; // hide it
});

// BACK TO MAIN UI(FRONTEND)
backToMain.addEventListener("click", () => {
  keywordManagementView.style.display = "none"; // HIDE IT
  mainFeaturesWrapper.style.display = "block"; // DISPLAY IT
});

// RENDER PREDEFINED KEYWORDS(FRONTEND)
function renderKeywordList() {
  const keywordList = document.getElementById("keyword-list");
  keywordList.innerHTML = ""; // CLEAR EXISTING KEYWORD

  preDefinedKeywords.forEach(({ keyword, color }) => {
    const keywordItem = document.createElement("div");
    keywordItem.className = "keyword-item";
    keywordItem.style.backgroundColor = color;

    // KEYWORD TEXT
    const keywordText = document.createElement("span");
    keywordText.textContent = keyword;

    // DELETE BUTTON
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "X";
    deleteButton.className = "delete-button";
    deleteButton.onclick = () => removeExistingKeyword(keyword);

    keywordItem.appendChild(keywordText);
    keywordItem.appendChild(deleteButton);
    keywordList.appendChild(keywordItem);
  });
}

// BACKEND CALL FOR MANAGING KEYWORDS -> CREATE, UPDATE, DELETE
// FETCH ALL KEYWORDS
function fetchAllKeywords() {
  sendMessageToBackend("loadKeywords");
}

// ADD A KEYWORD(CREATE)
function addAKeyword(keyword, color) {
  sendMessageToBackend("addKeyword", { keyword, color });
  preDefinedKeywords.push({ keyword, color }); // OPTIMISTIC UPDATE
  renderKeywordList();
}

// REMOVE A EXITING KEYWORD
function removeExistingKeyword(keywordToDelete) {
  // UPDATE THE ARRAY
  preDefinedKeywords = preDefinedKeywords.filter(
    (item) => item.keyword.toLowerCase() !== keywordToDelete.toLowerCase()
  );

  // SEND MESSAGE TO BACKEND
  sendMessageToBackend("removeKeyword", { keyword: keywordToDelete });

  // RENDER THE LIST
  renderKeywordList();
}

// <--------- KEYWORD MANAGEMENT UI :END --------->
//
//
//
//
//
// <--------- BASIC UI SUUPPORTS & COMPONENTS :START --------->

// UPDATE PREDEFINED KEYWORDS
function updatepreDefinedKeywords(newKeywords) {
  if (!Array.isArray(newKeywords)) {
    return;
  }
  newKeywords.forEach((newKeyword) => {
    if (!preDefinedKeywords.some((pre) => pre.keyword === newKeyword.keyword)) {
      preDefinedKeywords.push(newKeyword);
    }
  });
}

// CHECK KEYWORD
function checkKeyword(keyword) {
  const foundKeyword = preDefinedKeywords.find(
    (pre) => pre.keyword === keyword + ":"
  );

  let bgColor = foundKeyword?.color || generateColor(keyword + ":");
  return bgColor;
}

// CONVERT THE TIMESTAMP INTO READBLE FORMAT
function timeAgo(timeStamp) {
  if (!timeStamp || isNaN(timeStamp)) return "Invalid timestamp";

  const now = Date.now();
  if (timeStamp > now) return "In the future";

  const diff = Math.floor((now - timeStamp) / 1000); // DIFFERENCE IN SECONDS

  const units = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "week", seconds: 604800 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
  ];

  for (const unit of units) {
    const count = Math.floor(diff / unit.seconds);
    if (count >= 1) return `${count} ${unit.label}${count > 1 ? "s" : ""} ago`;
  }

  return `${diff} second${diff !== 1 ? "s" : ""} ago`;
}

// <--------- BASIC UI SUUPPORTS & COMPONENTS :END --------->
//
//
//
//
//
// <--------- ACTIVE TAB FEATURES :START --------->

function setActiveTab(tabId) {
  // // Remove active class and hide all contents
  tabElements.forEach((tab) => tab.classList.remove("active"));
  tabContents.forEach((content) => (content.style.display = "none"));

  // Add active class to current tab and show its content
  const activeTab = document.getElementById(tabId);
  const activeContent = document.getElementById(`${tabId}-tab-content`);

  if (activeTab && activeContent) {
    activeTab.classList.add("active"); // add "active" class to current active tab
    activeContent.style.display = "Block"; // and set diplay "block" to the current actie tab-content
    Tab = activeTab.id; // set the tab here

    // Clear search input for InActive Tab
    clearSearchInputForTab(Tab);

    // ✅ Use the previously stored backend data
    if (latestBackendData && latestKeywordData !== null) {
      updateSidebarUI(latestBackendData);
      updatepreDefinedKeywords(latestKeywordData);
      renderKeywordList();
    }
  }
}

function getActiveTab() {
  const active = document.querySelectorAll("tabs-header .active");
  return active?.id || Tab; // return -> "Task" // "Collection" // "Done"
}

// setup tab click event listener
tabElements.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveTab(tab.id);

    if (latestBackendData.length > 0) {
      updateSidebarUI(latestBackendData);
      updatepreDefinedKeywords(latestKeywordData);
      renderKeywordList();
    } else {
      console.warn("⚠️ No cached data available yet.");
    }
  });
});

// helper function to clear the search input for InActive tab
function clearSearchInputForTab(Tab) {
  // clear by deafult
  [taskSearchInput, doneSearchInput, collectionSearchInput].forEach(
    (item) => (item.value = "")
  );

  // Case to clear input
  switch (Tab) {
    case "Task":
      doneSearchInput.value = "";
      collectionSearchInput.value = "";
      break;

    case "Done":
      taskSearchInput.value = "";
      collectionSearchInput.value = "";
      break;

    case "Collection":
      taskSearchInput.value = "";
      doneSearchInput.value = "";
      break;
  }
}

// <--------- ACTIVE TAB FEATURES :END --------->
//
//
//
//
//
// <--------- TASK SEARCH FILTER :START --------->

function setupSearchListener(searchInputElement) {
  searchInputElement.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredSerachData = filterTasksBySearch(
      latestBackendData,
      searchTerm
    );

    // PASS THIS FILTERTED DATA INTO UPDATESIDEBAR UI FUNCTION()
    updateSidebarUI(filteredSerachData);
  });
}

function filterTasksBySearch(data, searchTerm) {
  return data.filter((item) => {
    return (
      item.description?.toLowerCase().includes(searchTerm) ||
      item.keyword?.toLowerCase().includes(searchTerm) ||
      item.file?.toLowerCase().includes(searchTerm)
    );
  });
}

setupSearchListener(taskSearchInput); // TASK SEARCH
setupSearchListener(doneSearchInput); // DONE SEARCH

// <--------- TASK SEARCH FILTER :END --------->
//
//
//
//
//
// <--------- TASK FILTER (TESTING! AND ON THE WAY) :START --------->

// FILTER BUTTON

filter_button.addEventListener("click", (e) => {
  e.stopPropagation; // Prevent click from bubbling to document

  // toggle
  filter_option_container.classList.toggle("show-options");
});

// HIDE OPTIONS WHEN CLICKING OUTSIDE DOCUMENT
document.addEventListener("click", (e) => {
  // check if click is outside the event
  if (!option_parent.contains(e.target)) {
    // remove the show-options classes
    filter_option_container.classList.remove("show-options");
  }
});

// Detect when the webview loses focus
// window.addEventListener("blur", () => {
//   setTimeout(() => {
//     if (document.activeElement.tagName === "IFRAME") {
//       optionContainer.classList.remove("show-options");
//     }
//   }, 50);
// });

// filter_button.addEventListener("click", () => {
//   // FILTER DATA BASED ON CONDITIONS
//   const filterData = sortDataByAlphabetically(latestBackendData);

//   // PASS THE FILTERED DATA
//   updateSidebarUI(filterData);
// });

// ALL SORTING FUNCTION
const dataSortFunctions = {
  alphabetical: sortDataByAlphabetically,
  aesthetic: sortDataByKeywordLength,
  time: sortDataByTime,
};

// FILTER BUTTON
filter_option_buttons.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const type = btn.dataset.sort;
    const filteredData = dataSortFunctions[type](latestBackendData);

    // PASS UPDATED DATA INTO SIDEBAR UI FUNCTIONS
    updateSidebarUI(filteredData);
  });
});

// FILTER DATA BY TIME
function sortDataByTime(data) {
  return data.sort((a, b) => {
    return b.timeStamp - a.timeStamp;
  });
}

// FILTER DATA BY KEYWORD LENGTH (FOR GOOD ASESTHETIC UI)
function sortDataByKeywordLength(data) {
  return data.sort((a, b) => {
    const lenA = (a.keyword || "").length;
    const lenB = (b.keyword || "").length;
    return lenA - lenB;
  });
}

function sortDataByAlphabetically(data) {
  return data.slice().sort((a, b) => {
    const keyword_A = a.keyword?.toLowerCase() || "";
    const keyword_B = b.keyword?.toLowerCase() || "";

    return keyword_A.localeCompare(keyword_B);
  });
}

// <--------- TASK FILTER :END --------->
//
//
//
//
//
// <--------- SIDEBAR UI RENDER :START --------->

// GROUP DATA BY FILES & KEYWORDS "COLLECTION DATA"
function groupData(data) {
  const groupByFileAndKeyword = {};
  const groupByKeyword = {};

  data.forEach((item) => {
    const file = item.file;
    const keyword = item.keyword;

    // Group by File and Keyword
    if (!groupByFileAndKeyword[file]) {
      groupByFileAndKeyword[file] = {};
    }
    if (!groupByFileAndKeyword[file][keyword]) {
      groupByFileAndKeyword[file][keyword] = [];
    }
    groupByFileAndKeyword[file][keyword].push(item);

    // Group by Keyword only
    if (!groupByKeyword[keyword]) {
      groupByKeyword[keyword] = [];
    }
    groupByKeyword[keyword].push(item);
  });

  return [groupByKeyword, groupByFileAndKeyword];
}

// FINAL RENDER->>>
// UPDATESIDEBARUI() FUNCTION UPDATES AUTOMATICALLY WHEN NEW DATA ARRIVES
async function updateSidebarUI(newData) {
  const fragment = document.createDocumentFragment();

  // UNIQUE KEYS FOR EACH SIDEBAR-ITEM
  const newKeys = new Set(newData.map((item) => `${item.file}:${item.line}`));

  // DETERMINE WHICH CONTAINER TO USE BASED ON ACTIVE TAB
  const targetTabContainer = {
    Task: taskContainer,
    Done: doneContainer,
    Collection: collectionContainer,
  }[Tab];

  // CLEAR THE PREVIOUS CONTENT ACCODING TO TAB
  targetTabContainer.innerHTML = ""; //-- IMP! -- issue can be here
  currentItems.clear();

  // FILTER THE DATA ACCORDINT TO ACTIVE TAB
  const filteredData =
    {
      Task: newData.filter((item) => item.keyword !== "DONE"),
      Done: newData.filter((item) => item.keyword === "DONE"),
      Collection: groupData(newData.filter((item) => item.keyword !== "DONE")), // !for testing purpose
    }[Tab] || [];

  // CHECK IF THE TAB HAVE DATA!
  if (!filteredData || filteredData.length === 0) {
    console.log("NO-DATA-AVIALBLE");
    return;
  }

  // RENDER THE ITEM BASED ON TAB
  filteredData.forEach((item) =>
    renderItems(fragment, item, targetTabContainer)
  );

  // REMOVE DELTED ITEMS
  currentItems.forEach((el, key) => {
    if (!newKeys.has(key)) {
      el.classList.add("deleted");
      setTimeout(() => {
        targetTabContainer.remove(el); // Update Tab-Content
        currentItems.delete(key); // update currentItems
      }, 1000);
    }
  });

  // APPEND ONLY NEW ITEMS
  targetTabContainer.appendChild(fragment);
}

// FUNCTION TO (RENDER-ITEMS)
function renderItems(fragment, item, targetTabContainer) {
  // EXTRACT THE DATA FROM ITEM
  const {
    keyword,
    fullPath,
    description,
    file,
    line,
    timeStamp,
    preDefinedKeywords,
  } = item;

  // LOAD "updatepreDefinedKeywords"
  updatepreDefinedKeywords(preDefinedKeywords);

  // CHECK FOR FRESHKEYWORD
  const freshKeyword = typeof keyword === "string" ? keyword : null;
  if (!freshKeyword) return;

  // RETURN BACKGROUND COLOR
  const bgColor = checkKeyword(freshKeyword);

  // KEY
  const key = `${file}:${line}`;

  // BASIC UI HTML STRUCTURE
  const el = document.createElement("div");
  el.className = "sidebar-item";
  el.dataset.file = file;
  el.dataset.line = line;

  // HOLD ACTIVE TAB DATA
  let dataToRender = null;

  // PASS DATA ACCORING TO ACTIVE TAB
  switch (Tab) {
    // PASS TASK DATA
    case "Task":
      dataToRender = {
        keyword,
        description,
        bgColor,
        file,
        fullPath,
        line,
        timeStamp,
        Tab,
      };
      break;

    // PASS DONE DATA
    case "Done":
      // EXTRACTING DATA FROM "parseDescription" FUNCTION
      const { taskKeyword, createdTimeStamp, detailDescription } =
        parseDescription(item);
      dataToRender = {
        bgColor,
        file,
        fullPath,
        line,
        createdTimeStamp,
        taskKeyword,
        detailDescription,
        Tab,
      };
      break;

    // PASS COLLECTION DATA
    case "Collection":
      dataToRender = {
        keyword,
        description,
        bgColor,
        file,
        fullPath,
        line,
        timeStamp,
        Tab,
        item,
      };

      break;

    // PASS DEFAULT DATA
    default:
      console.log("NO TAB IS OPEN!");
      return; // Exit early
  }

  if (!currentItems.has(key)) {
    try {
      el.innerHTML = getItemHtml(dataToRender);
    } catch (error) {
      console.error("Error in getItemHtml:", error);
    }

    el.addEventListener("click", (e) => {
      if (
        e.target.closest(".mark-done-btn") ||
        e.target.closest(".mark-undo-btn")
      ) {
        return; // Ignore click one done btn
      }
      // if the click doesnt from done btn then proceed to JumpToFileAndLine
      jumpToFileAndLine(fullPath, line);
    });
    currentItems.set(key, el);
    fragment.appendChild(el);
  } else {
    const existingEl = currentItems.get(key);
    const descriptionEl = existingEl.querySelector(".keyword-description");

    if (descriptionEl && descriptionEl.textContent !== description) {
      descriptionEl.textContent = description;
      existingEl.classList.add("updated");
      setTimeout(() => existingEl.classList.remove("updated"), 1000);
    }
  }
}

// FUNCTION TO HANDLE ONLY HTML PART
function getItemHtml({
  item = {},
  keyword,
  description,
  bgColor,
  file,
  fullPath,
  line,
  timeStamp,
  createdTimeStamp,
  taskKeyword,
  detailDescription,
  Tab,
}) {
  switch (Tab) {
    // TASK UI -> HTML
    case "Task":
      return `<div class="sidebar-content-wrapper">
      <div class="first-line">
        <div class="keyword-n-description">
          <div class="keyword" style=${
            "background-color:" + bgColor + ";"
          }>${keyword}:</div>
          <div class="keyword-description">${description}</div>
        </div>
        <div
        class="done mark-done-btn"
        data-keyword="${keyword}"
        data-comment="${description}"
        data-filename="${file}"
        data-fullpath="${fullPath}"
        data-line="${line}"
        >
        DONE
        </div>
      </div>
      <div class="second-line">
        <div class="file-name-wrapper second-line-item">
          <span class="icon-container fileName-icon--container" data-icon="fileName-icon"></span>
          <span class="fileName"> ${file} </span>
        </div>
        <div class="devider-line"></div>
        <div class="code-line-number-wrapper second-line-item">
          <span class="icon-container codeLineNumber-icon--container" data-icon="codeLineNumber-icon"></span>
          <span class="codeLineNumber"> Line: ${line} </span>
        </div>
        <div class="devider-line"></div>
        <div class="edited-time-wrapper second-line-item">
          <span class="icon-container time-icon--container" data-icon="time-icon"></span>
          <span class="timeStamp"> ${timeAgo(timeStamp)} </span>
        </div>
      </div>
    </div>`;

    // DONE UI -> HTML
    case "Done":
      return `
          <div class="sidebar-content-wrapper">
            <div class="first-line">
              <div class="keyword-n-description">
                <div class="keyword" style=${
                  "background-color:" + bgColor + ";"
                }>${taskKeyword}:</div>
                <div class="keyword-description">${detailDescription} - (FIXED!)</div>
              </div>
              <div class="undo mark-undo-btn"
              data-keyword="${taskKeyword}"
              data-comment="${detailDescription}"
              data-filename="${file}"
              data-fullpath="${fullPath}"
              data-line="${line}"
              >
              UNDO
              </div>
            </div>
            <div class="second-line">
              <div class="file-name-wrapper second-line-item">
                <span class="icon-container fileName-icon--container" data-icon="fileName-icon"></span>
                <span class="fileName"> ${file} </span>
              </div>
              <div class="devider-line"></div>
              <div class="code-line-number-wrapper second-line-item">
                <span class="icon-container codeLineNumber-icon--container" data-icon="codeLineNumber-icon"></span>
                <span class="codeLineNumber"> Line: ${line} </span>
              </div>
              <div class="devider-line"></div>
              <div class="edited-time-wrapper second-line-item">
                <span class="icon-container time-icon--container" data-icon="time-icon"></span>
                <span class="timeStamp"> ${timeAgo(createdTimeStamp)} </span>
              </div>
            </div>
          </div>`;

    // COLLECTION UI -> HTML
    case "Collection":
      return `<div class="sidebar-content-wrapper">
      Hey
    </div>`;

    // DEFAULT UI -> HTML
    default:
      return "DEFAULT-DATA";
  }
}

// PARSE INFORMATION FOR DONE
function parseDescription(item) {
  const {
    keyword,
    fullPath,
    description,
    file,
    line,
    timeStamp,
    preDefinedKeywords,
  } = item;

  // Extract task name (inside the first quotes)
  const taskMatch = description.match(/^"([^"]+)"/);
  const taskKeyword = taskMatch ? taskMatch[1] : "Unknown Task";

  // Extract timestamp (inside the last quotes)
  const timestampMatch = description.match(/"([^"]+\d{1,2}[:.]\d{2}[APM]*)"/);
  const createdTimeStamp = timestampMatch ? timestampMatch[1] : "Unknown Time";

  // Extract pure description (middle part between keyword and timestamp)
  const descMatch = description.match(/^"[^"]+"\s*-\s*([^"]+)\s*"[^"]+"$/);
  const detailDescription = descMatch
    ? descMatch[1].trim()
    : "No description available";

  return {
    taskKeyword,
    createdTimeStamp,
    detailDescription,
  };
}

// FUNCTION TO JUMPING FILE AND LINE...
function jumpToFileAndLine(fullPath, line) {
  // Send message to the Backend
  sendMessageToBackend("vscode.open", {
    fullPath,
    line,
  });
}

// MARK DONE and UNDO BUTTON ELEMENTS
document.addEventListener("click", (e) => {
  // TARGET BUTTONS
  const markDoneBtn = e.target.closest(".mark-done-btn");
  const markUndoBtn = e.target.closest(".mark-undo-btn");

  // MARK DONE BUTTON
  if (markDoneBtn) {
    e.stopPropagation();
    e.preventDefault();

    // EXTRACT DATA
    const {
      keyword,
      comment,
      filename,
      fullpath,
      line: rawLine,
    } = markDoneBtn.dataset;
    const line = parseInt(rawLine, 10);

    // MARK DONE FUNCTION
    markDone(keyword, comment, filename, fullpath, line);

    // MARK UNDO BUTTON
  } else if (markUndoBtn) {
    e.stopPropagation();
    e.preventDefault();

    // EXTRACT DATA
    const {
      keyword,
      comment,
      filename,
      fullpath,
      line: rawLine,
    } = markUndoBtn.dataset;
    const line = parseInt(rawLine, 10);

    // MARK UNDO FUNCTION
    markUndo(keyword, comment, filename, fullpath, line);
  }
});

// FRONTEND ONLY CODE --->
// STATIC UI PART --->

const loadIcons = () => {
  document.querySelectorAll(".icon-container").forEach((iconElement) => {
    const iconName = iconElement.getAttribute("data-icon");
    const iconPath = `${iconsBaseUri}/${iconName}.svg`;

    fetch(iconPath)
      .then((response) => response.text())
      .then((svg) => {
        iconElement.innerHTML = svg;
      })
      .catch((error) =>
        console.error(`Error loading icon: ${iconName}`, error)
      );
  });
};

// LOAD...
loadIcons();
