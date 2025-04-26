// Initialize on page load
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
