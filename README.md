# GitHub Pages + Supabase Stock Inventory

This app contains only:

- Product
- Color
- Quantity
- Stock IN
- Stock OUT
- History

It uses:
- GitHub Pages for hosting
- Supabase for the shared online database

## Files

- index.html
- style.css
- app.js
- config.js
- schema.sql

## STEP 1 — Create a Supabase project

1. Go to https://supabase.com
2. Sign in.
3. Click New Project.
4. Choose your organization.
5. Enter a project name, database password, and region.
6. Wait until the project is ready.

## STEP 2 — Create the database

1. Open your Supabase project.
2. Open SQL Editor.
3. Open the included `schema.sql`.
4. Copy all SQL from that file.
5. Paste it into the Supabase SQL Editor.
6. Click Run.

This creates:
- products table
- stock_history table
- stock IN/OUT database function
- Row Level Security policies

## STEP 3 — Get your Supabase URL and key

In Supabase:

1. Open Project Settings.
2. Open API / API Keys.
3. Copy:
   - Project URL
   - Publishable key or legacy anon key

Do NOT use the service_role/secret key in the website.

## STEP 4 — Edit config.js

Open `config.js`.

Replace:

SUPABASE_URL: "YOUR_SUPABASE_URL"

with your Project URL.

Replace:

SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY"

with your Supabase publishable/anon key.

Save the file.

## STEP 5 — Test locally

You can test with a local web server.

If Python is installed:

1. Open Command Prompt inside this folder.
2. Run:

python -m http.server 8000

3. Open:

http://localhost:8000

Add a product and test Stock IN / Stock OUT.

## STEP 6 — Create a GitHub repository

1. Go to GitHub.
2. Click New repository.
3. Give it a name, for example:

stock-inventory

4. Create the repository.
5. Upload these files to the root of the repository:

index.html
style.css
app.js
config.js

You do NOT need to upload schema.sql to make the website run, but keeping it in the repository is useful as a backup.

## STEP 7 — Turn on GitHub Pages

1. Open the repository.
2. Click Settings.
3. Click Pages.
4. Under Build and deployment:
   - Source: Deploy from a branch
   - Branch: main
   - Folder: / (root)
5. Click Save.

GitHub will generate a public website address similar to:

https://YOUR-USERNAME.github.io/stock-inventory/

## IMPORTANT SECURITY NOTE

This starter version is intentionally very simple and does NOT use login.

Anyone who gets the public website URL can edit stock.

The Supabase publishable/anon key is intended to be visible in browser apps, but access is controlled by Row Level Security.

For a private business inventory, the recommended next upgrade is Supabase Login so only your staff can edit stock.

## Duplicate Product + Color behavior

If you enter a Product and Color that already exists, the app will NOT create another row.

Example:

Existing:
T-Shirt | Black | 10

New input:
T-Shirt | Black | 5

Result:
T-Shirt | Black | 15

The added 5 is also recorded automatically in History as Stock IN.


## Reset All Data button

This version includes a Reset All Data button.

Unlock code:

0012

When used, it permanently deletes:
- all products
- all quantities
- all stock history

Important: if upgrading from v2, run the NEW `schema.sql` in Supabase SQL Editor again so the delete policies are added.


## v3.1 Reset fix

This version fixes the Reset All Data button.

Changes:
- Browser cache-busting was added to `app.js` and `style.css`.
- Reset now calls the Supabase `reset_inventory()` function.
- Unlock code remains `0012`.

### IMPORTANT when upgrading from v3

Run the NEW `schema.sql` in Supabase SQL Editor again.

Then upload/replace these files on GitHub:
- index.html
- app.js
- style.css

Keep your existing `config.js` if it already contains your real Supabase URL and key.

After GitHub Pages republishes, refresh the site with Ctrl+F5.


## v3.2 Inline Product / Color editing

You can now edit Product or Color directly in the stock table:

1. Click the Product name or Color name.
2. Type the new value.
3. Press Save or press Enter.
4. Press Escape or Cancel to discard.

Quantity is still changed only through Stock IN / Stock OUT so stock history stays accurate.

### Upgrading from v3.1

Replace only:
- index.html
- style.css
- app.js

Do NOT replace your existing `config.js`.

No Supabase SQL/database change is required for v3.2.
