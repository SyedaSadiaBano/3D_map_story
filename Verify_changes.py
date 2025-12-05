from playwright.sync_api import sync_playwright

def verify_changes(page):
    # Navigate to the local HTML file
    page.goto("file:///app/index.html")

    # Wait for the scene to render (adjust as needed)
    page.wait_for_timeout(5000)

    # Take a screenshot
    page.screenshot(path="/app/verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_changes(page)
        browser.close()
