document.addEventListener("DOMContentLoaded", async () => {
  const allBookmarksElement = document.getElementById("all-bookmarks");
  const deleteAllButton = document.getElementById("delete-all");
  const storageText = document.getElementById("storage-text");
  const storageProgress = document.getElementById("storage-progress");
  const exportButton = document.getElementById("export-button");
  const importButton = document.getElementById("import-button");
  const importFileInput = document.getElementById("import-file");
  const searchInput = document.getElementById("search-input");
  const sortSelect = document.getElementById("sort-options");

  const formatTimestamp = (timestamp) => new Date(timestamp).toLocaleString();

  const updateTotalStorageUsage = () => {
    chrome.storage.sync.getBytesInUse(null, (bytesInUse) => {
      const maxStorage = 102400;
      const percentageUsed = ((bytesInUse / maxStorage) * 100).toFixed(2);
      storageText.textContent = `Total Storage Used: ${percentageUsed}% (${bytesInUse} bytes)`;
      storageProgress.style.width = `${percentageUsed}%`;
      storageProgress.style.backgroundColor =
        percentageUsed > 80 ? "#ff5733" : "#007bff";
    });
  };

  const renderBookmarks = () => {
    chrome.storage.sync.get(null, (data) => {
      allBookmarksElement.innerHTML = "";
      const searchQuery = searchInput?.value.toLowerCase() || "";
      const sortBy = sortSelect?.value || "date";

      let videoIds = Object.keys(data).filter((id) => !id.endsWith("_title"));

      if (sortBy === "title") {
        videoIds.sort((a, b) => {
          const titleA = (data[`${a}_title`] || "").toLowerCase();
          const titleB = (data[`${b}_title`] || "").toLowerCase();
          return titleA.localeCompare(titleB);
        });
      }

      const pinnedVideos = JSON.parse(
        localStorage.getItem("pinnedVideos") || "{}"
      );

      videoIds = videoIds.filter((id) => data[id]); // ensure valid keys

      // Sort based on pinning first, then title/date
      videoIds.sort((a, b) => {
        const aPinned = pinnedVideos[a] ? 1 : 0;
        const bPinned = pinnedVideos[b] ? 1 : 0;

        if (aPinned !== bPinned) return bPinned - aPinned; // Pinned first

        if (sortBy === "title") {
          const titleA = (data[`${a}_title`] || "").toLowerCase();
          const titleB = (data[`${b}_title`] || "").toLowerCase();
          return titleA.localeCompare(titleB);
        }

        // Default fallback sort by latest bookmark timestamp (desc)
        const lastA = Math.max(
          ...(JSON.parse(data[a] || "[]").map((b) => b.timestamp) || [0])
        );
        const lastB = Math.max(
          ...(JSON.parse(data[b] || "[]").map((b) => b.timestamp) || [0])
        );
        return lastB - lastA;
      });

      if (videoIds.length === 0) {
        allBookmarksElement.innerHTML = "<i>No bookmarks saved yet.</i>";
        deleteAllButton.style.display = "none";
        return;
      }

      deleteAllButton.style.display = "block";

      videoIds.forEach((videoId) => {
        let videoBookmarks = JSON.parse(data[videoId] || "[]");
        if (!videoBookmarks.length) return;

        // Sorting: pinned on top
        videoBookmarks.sort((a, b) => {
          const aPinned = pinnedVideos[a.videoId];
          const bPinned = pinnedVideos[b.videoId];
          if (aPinned && !bPinned) return -1;
          if (!aPinned && bPinned) return 1;
          return b.timestamp - a.timestamp;
        });

        // Filtering
        const filteredBookmarks = videoBookmarks.filter((b) =>
          b.shortDesc.toLowerCase().includes(searchQuery)
        );
        if (filteredBookmarks.length === 0) return;

        const videoTitle = data[`${videoId}_title`] || "Unknown Video";
        const videoSection = document.createElement("div");
        videoSection.className = "video-bookmark-section";

        const videoHeader = document.createElement("div");
        videoHeader.className = "video-header";

        const videoTitleElement = document.createElement("h3");
        videoTitleElement.innerHTML = `🎥 <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank">${videoTitle}</a>`;

        const pinBtn = document.createElement("button");
        pinBtn.className = "video-pin-btn";
        pinBtn.textContent = pinnedVideos[videoId] ? "🚩" : "📌";
        pinBtn.addEventListener("click", () => {
          pinnedVideos[videoId] = !pinnedVideos[videoId];
          localStorage.setItem("pinnedVideos", JSON.stringify(pinnedVideos));
          renderBookmarks();
        });

        const shareButton = document.createElement("button");
        shareButton.textContent = "➥";
        shareButton.className = "share-button";
        shareButton.addEventListener("click", () => {
          let shareText = `📌 *Bookmarks for ${videoTitle}:*\n\n`;
          videoBookmarks.forEach((b, i) => {
            const url = `https://www.youtube.com/watch?v=${videoId}&t=${b.time}s`;
            shareText += `${i + 1}. *${b.shortDesc}*\n🔗 ${url}\n\n`;
          });
          const whatsappUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(
            shareText
          )}`;
          window.open(whatsappUrl, "_blank");
        });

        const copyButton = document.createElement("button");
        copyButton.textContent = "🗐";
        copyButton.className = "copy-button";
        copyButton.addEventListener("click", () => {
          let copyText = `📌 *Bookmarks for ${videoTitle}:*\n\n`;
          videoBookmarks.forEach((b, i) => {
            const url = `https://www.youtube.com/watch?v=${videoId}&t=${b.time}s`;
            copyText += `${i + 1}. *${b.shortDesc}*\n🔗 ${url}\n\n`;
          });
          navigator.clipboard.writeText(copyText).then(() => {
            copyButton.textContent = "✔";
            setTimeout(() => (copyButton.textContent = "🗐"), 1500);
          });
        });

        videoHeader.append(videoTitleElement, pinBtn, shareButton, copyButton);
        videoSection.appendChild(videoHeader);

        const bookmarkList = document.createElement("ul");

        filteredBookmarks.forEach((bookmark, i) => {
          const bookmarkItem = document.createElement("li");
          bookmarkItem.className = "bookmark-item";
          bookmarkItem.setAttribute("draggable", true);
          bookmarkItem.dataset.time = bookmark.time;

          const bookmarkText = document.createElement("span");
          bookmarkText.innerHTML = `<strong>${i + 1}. ${
            bookmark.desc
          }</strong> - ${bookmark.shortDesc}<br><small>🕒 ${
            bookmark.addedAt
          }</small>`;

          const buttonContainer = document.createElement("div");
          buttonContainer.className = "button-container";

          const playButton = document.createElement("a");
          playButton.href = `https://www.youtube.com/watch?v=${videoId}&t=${bookmark.time}s`;
          playButton.target = "_blank";
          playButton.textContent = "▶";
          playButton.className = "play-button";

          const editButton = document.createElement("button");
          editButton.textContent = "✎";
          editButton.className = "edit-button";
          editButton.addEventListener("click", () => {
            const newDesc = prompt(
              "Edit short description:",
              bookmark.shortDesc
            );
            if (newDesc !== null) {
              bookmark.shortDesc = newDesc;
              chrome.storage.sync.get([videoId], (data) => {
                const bookmarks = JSON.parse(data[videoId]);
                const idx = bookmarks.findIndex(
                  (b) => b.time === bookmark.time
                );
                if (idx !== -1) {
                  bookmarks[idx] = bookmark;
                  chrome.storage.sync.set(
                    { [videoId]: JSON.stringify(bookmarks) },
                    renderBookmarks
                  );
                }
              });
            }
          });

          const deleteButton = document.createElement("button");
          deleteButton.textContent = "✖";
          deleteButton.className = "delete-button";
          deleteButton.addEventListener("click", () =>
            deleteBookmark(videoId, bookmark.time, bookmarkItem, videoSection)
          );

          buttonContainer.append(playButton, editButton, deleteButton);
          bookmarkItem.append(bookmarkText, buttonContainer);
          bookmarkList.appendChild(bookmarkItem);

          bookmarkItem.addEventListener("mouseenter", () => {
            const startTime =
              typeof bookmark.time === "number" && bookmark.time >= 0
                ? Math.floor(bookmark.time)
                : 0;

            const videoPreview = document.createElement("iframe");
            videoPreview.src = `https://www.youtube.com/embed/${videoId}?start=${startTime}&autoplay=1&mute=1`;
            videoPreview.width = "320";
            videoPreview.height = "180";
            videoPreview.style.position = "absolute";
            videoPreview.style.top = "0";
            videoPreview.style.left = "100%";
            videoPreview.style.zIndex = "1000";
            videoPreview.style.border = "none";
            videoPreview.style.borderRadius = "8px";

            bookmarkItem.appendChild(videoPreview);
            bookmarkItem.addEventListener("mouseleave", () => {
              videoPreview.remove();
            });
          });

          bookmarkItem.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            bookmarkItem.style.borderTop = "2px dashed #007bff";
          });

          bookmarkItem.addEventListener("dragleave", () => {
            bookmarkItem.style.borderTop = "";
          });

          bookmarkItem.addEventListener("drop", (e) => {
            e.preventDefault();
            bookmarkItem.style.borderTop = "";
            const draggedTime = parseFloat(
              e.dataTransfer.getData("text/plain")
            );
            if (draggedTime === bookmark.time) return;

            chrome.storage.sync.get([videoId], (data) => {
              const bookmarks = JSON.parse(data[videoId]);
              const fromIndex = bookmarks.findIndex(
                (b) => b.time === draggedTime
              );
              const toIndex = bookmarks.findIndex(
                (b) => b.time === bookmark.time
              );
              if (fromIndex !== -1 && toIndex !== -1) {
                const [moved] = bookmarks.splice(fromIndex, 1);
                bookmarks.splice(toIndex, 0, moved);
                chrome.storage.sync.set(
                  { [videoId]: JSON.stringify(bookmarks) },
                  renderBookmarks
                );
              }
            });
          });

          // Video preview
          bookmarkItem.addEventListener("mouseenter", () => {
            const startTime = Math.floor(bookmark.time || 0);
            const preview = document.createElement("iframe");
            preview.src = `https://www.youtube.com/embed/${videoId}?start=${startTime}&autoplay=1&mute=1`;
            preview.width = "320";
            preview.height = "180";
            preview.style.position = "absolute";
            preview.style.top = "0";
            preview.style.left = "100%";
            preview.style.zIndex = "1000";
            preview.style.border = "none";
            preview.style.borderRadius = "8px";
            bookmarkItem.appendChild(preview);

            bookmarkItem.addEventListener(
              "mouseleave",
              () => preview.remove(),
              { once: true }
            );
          });
        });

        videoSection.appendChild(bookmarkList);
        allBookmarksElement.appendChild(videoSection);
      });

      updateTotalStorageUsage();
    });
  };

  const deleteBookmark = (videoId, time, bookmarkElement, videoSection) => {
    chrome.storage.sync.get([videoId], (data) => {
      let bookmarks = data[videoId] ? JSON.parse(data[videoId]) : [];
      bookmarks = bookmarks.filter((b) => b.time !== time);
      if (bookmarks.length > 0) {
        chrome.storage.sync.set(
          { [videoId]: JSON.stringify(bookmarks) },
          () => {
            bookmarkElement.remove();
            updateTotalStorageUsage();
          }
        );
      } else {
        chrome.storage.sync.remove(videoId, () => {
          videoSection.remove();
          updateTotalStorageUsage();
        });
      }
    });
  };

  function exportBookmarks() {
    chrome.storage.sync.get(null, (data) => {
      if (!Object.keys(data).length) {
        alert("No bookmarks to export!");
        return;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bookmarks_export.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  async function importBookmarks(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        chrome.storage.sync.get(null, async (existingData) => {
          const mergedData = { ...existingData, ...importedData };
          for (const [key, value] of Object.entries(mergedData)) {
            await new Promise((resolve) =>
              chrome.storage.sync.set({ [key]: value }, resolve)
            );
          }
          alert("Bookmarks imported successfully!");
          setTimeout(() => location.reload(), 500);
        });
      } catch {
        alert("Invalid file format.");
      }
    };
    reader.readAsText(file);
  }

  exportButton.addEventListener("click", exportBookmarks);
  importButton.addEventListener("click", () => importFileInput.click());
  importFileInput.addEventListener("change", importBookmarks);
  searchInput.addEventListener("input", renderBookmarks);
  sortSelect.addEventListener("change", renderBookmarks);

  renderBookmarks();
});
