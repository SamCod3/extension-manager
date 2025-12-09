// Background script to open the main page
chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: "index.html" });
});
