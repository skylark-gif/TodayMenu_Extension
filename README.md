Chrome Extension Installation Manual: Gachon Cafeteria Menu
This manual guides you through installing and running the "Gachon Cafeteria Menu" extension using Chrome's Developer Mode.

1. Prepare the Source Code Files
Ensure all provided source files are placed inside a single folder. You can name the folder anything you like (e.g., gachon-menu-extension).

content.js

styles.css

background.js

manifest.json

2. Access Chrome Extensions Management
Open your Chrome browser.

Navigate to the Chrome Extensions Management page by typing the following address into the omnibox (address bar) and pressing Enter: chrome://extensions/

3. Enable Developer Mode
On the Extensions Management page, locate the "Developer mode" toggle switch in the top right corner.

Click the toggle switch to turn it ON (enable Developer Mode).

4. Load the Extension
When Developer Mode is enabled, a button named "Load unpacked" (or similar, like "압축해제된 확장 프로그램을 로드합니다.") will appear near the top left.

Click the "Load unpacked" button.

A file browser window will open. Navigate to the location where you saved the source code folder (from Step 1) and select the entire folder (do not select individual files).

5. Verification and Usage
The extension should now be successfully loaded and listed as "가천대 오늘 학식" on the Extensions Management page.

This extension is configured to run on the Gachon Cyber Campus website.

To verify functionality:

Open a new Chrome tab and navigate to the Gachon Cyber Campus website (e.g., https://cyber.gachon.ac.kr/*).

A blue button labeled "오늘 학식 보기" ("View Today's Cafeteria Menu") should appear and be fixed to the bottom left corner of the page.

Click the button to open the menu pop-up.
