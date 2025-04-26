// Initialize on page load

// Function to add a new bookmark
const addNewBookmark = (bookmarks, bookmark, currentVideo) => {
  const newBookmarkElement = document.createElement("div");
  newBookmarkElement.className = "bookmark";
  newBookmarkElement.id = "bookmark-" + bookmark.time;
  newBookmarkElement.setAttribute("timestamp", bookmark.time);

  // Create title element
  const bookmarkTitleElement = document.createElement("div");
  bookmarkTitleElement.textContent = bookmark.desc;
  bookmarkTitleElement.className = "bookmark-title";

  // Create short description
  const shortDescElement = document.createElement("div");
  shortDescElement.textContent =
    bookmark.shortDesc || "No short description available.";
  shortDescElement.className = "bookmark-short-desc";

  // Create "Added at" element
  const addedAtElement = document.createElement("div");
  addedAtElement.textContent = `Added at: ${bookmark.addedAt}`;
  addedAtElement.className = "bookmark-added-at";

  // Create controls container
  const controlsElement = document.createElement("div");
  controlsElement.className = "bookmark-controls";

  // Add play, delete, and edit buttons
  setBookmarkAttributes("play", () => onPlay(bookmark.time), controlsElement);
  setBookmarkAttributes(
    "delete",
    () => onDelete(bookmark.time, currentVideo),
    controlsElement
  );

  // Create Edit button
  const editButton = document.createElement("img");
  editButton.src = "assets/edit.png";
  editButton.className = "edit-button";
  editButton.title = "Edit Bookmark";
  editButton.addEventListener("click", () =>
    editBookmark(bookmark, newBookmarkElement, editButton, currentVideo)
  );

  controlsElement.appendChild(editButton);

  // Append elements to bookmark container
  newBookmarkElement.appendChild(bookmarkTitleElement);
  newBookmarkElement.appendChild(shortDescElement);
  newBookmarkElement.appendChild(addedAtElement);
  newBookmarkElement.appendChild(controlsElement);

  // Add the new bookmark to the list
  bookmarks.appendChild(newBookmarkElement);
};

// Function to handle editing the bookmark description
const editBookmark = (bookmark, bookmarkElement, editButton, currentVideo) => {
  const bookmarkDescElement = bookmarkElement.querySelector(
    ".bookmark-short-desc"
  );
  const currentDesc = bookmarkDescElement.textContent;

  editButton.style.display = "none";

  const editInput = document.createElement("textarea");
  editInput.value = currentDesc;
  editInput.className = "edit-input";
  editInput.rows = 2;
  editInput.style.width = "100%";
  editInput.style.resize = "none";

  bookmarkDescElement.textContent = "";
  bookmarkDescElement.appendChild(editInput);

  const saveButton = document.createElement("img");
  saveButton.src = "assets/save.png";
  saveButton.className = "save-button";
  saveButton.title = "Save Bookmark";
  saveButton.addEventListener("click", () =>
    saveBookmark(bookmark, editInput, bookmarkElement, editButton, currentVideo)
  );

  const cancelButton = document.createElement("img");
  cancelButton.src = "assets/cancel.png";
  cancelButton.className = "cancel-button";
  cancelButton.title = "Cancel Edit";
  cancelButton.addEventListener("click", () =>
    cancelEdit(bookmarkDescElement, currentDesc, editButton)
  );

  const controls = bookmarkElement.querySelector(".bookmark-controls");
  controls.appendChild(saveButton);
  controls.appendChild(cancelButton);
};

// Save edited bookmark to Chrome storage
const saveBookmark = (
  bookmark,
  editInput,
  bookmarkElement,
  editButton,
  currentVideo
) => {
  const newDesc = editInput.value.trim();

  if (!newDesc) return;

  bookmark.shortDesc = newDesc;

  const bookmarkDescElement = bookmarkElement.querySelector(
    ".bookmark-short-desc"
  );
  bookmarkDescElement.textContent = newDesc;

  const controls = bookmarkElement.querySelector(".bookmark-controls");
  controls.querySelector(".save-button")?.remove();
  controls.querySelector(".cancel-button")?.remove();

  editButton.style.display = "inline-block";

  chrome.storage.sync.get([currentVideo], (data) => {
    let bookmarks = data[currentVideo] ? JSON.parse(data[currentVideo]) : [];
    bookmarks = bookmarks.map((b) =>
      b.time === bookmark.time ? { ...b, shortDesc: newDesc } : b
    );

    chrome.storage.sync.set(
      { [currentVideo]: JSON.stringify(bookmarks) },
      () => {
        console.log("Bookmark updated in storage:", bookmarks);
      }
    );
  });
};

// Cancel editing
const cancelEdit = (bookmarkDescElement, currentDesc, editButton) => {
  bookmarkDescElement.textContent = currentDesc;
  const controls =
    bookmarkDescElement.parentNode.querySelector(".bookmark-controls");
  controls.querySelector(".save-button")?.remove();
  controls.querySelector(".cancel-button")?.remove();
  editButton.style.display = "inline-block";
};

document.addEventListener("DOMContentLoaded", async () => {
  const activeTab = await getActiveTabURL();
  const urlParams = new URLSearchParams(activeTab.url.split("?")[1]);
  const currentVideo = urlParams.get("v");

  const container = document.querySelector(".container");

  if (activeTab.url.includes("youtube.com/watch") && currentVideo) {
    chrome.storage.sync.get([currentVideo], (data) => {
      const bookmarks = data[currentVideo]
        ? JSON.parse(data[currentVideo])
        : [];
      viewBookmarks(bookmarks, currentVideo);
    });

    const viewAllButton = document.createElement("button");
    viewAllButton.textContent = "📖 View All Bookmarks";
    viewAllButton.className = "view-all-button";
    viewAllButton.addEventListener("click", () => {
      window.open("all_bookmarks.html", "_blank");
    });

    // Append the button to the popup
    container.appendChild(viewAllButton);
  } else {
    container.innerHTML =
      '<div class="title">This is not a YouTube video pages.</div>';

    const viewAllButton = document.createElement("button");
    viewAllButton.textContent = "📖 View All Bookmarks";
    viewAllButton.className = "view-all-button";
    viewAllButton.addEventListener("click", () => {
      window.open("all_bookmarks.html", "_blank");
    });

    container.appendChild(viewAllButton);
  }
});
