import glob, re

button_html = '<a href="#" id="lang-toggle" style="font-weight:700; margin-right: 15px; color: var(--accent-primary); text-decoration: none;">ES</a>\n        <span class="navbar-phone">'

script_html = '<script src="js/lang.js"></script>\n</body>'

for f in glob.glob("*.html") + glob.glob("admin/*.html"):
    with open(f, "r") as file:
        content = file.read()
    
    # Add toggle button
    if 'id="lang-toggle"' not in content:
        content = content.replace('<span class="navbar-phone">', button_html)
        
    # Add script tag
    if 'js/lang.js' not in content:
        content = content.replace('</body>', script_html)
        
    with open(f, "w") as file:
        file.write(content)
    print("Updated", f)
