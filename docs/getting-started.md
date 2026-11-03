# Getting started (For Group Members)

This guide takes you from a clean Windows computer to the app running in your browser. Follow the steps in
order. Every command goes into **PowerShell** (press the Windows key, type `PowerShell`, press Enter).
Mac and Linux users: the "Setup" section of the main `README.md` has the same steps with `python3` and `export`.

You do **not** need MySQL, a `.env` file or any database knowledge. The app runs on a small local file with
fictional demo data.

---

## Part 1: Install the tools (once)

### 1. Git

Git tracks changes to the code and talks to GitHub.

1. Download **Git for Windows** from https://git-scm.com/download/win and run the installer.
2. Click **Next** through every screen. The defaults are fine.
3. Close PowerShell and open a new one, then check it worked:
   ```powershell
   git --version
   ```
   It should print a version number.

### 2. Python

1. Download **Python 3.11 or newer** from https://www.python.org/downloads/ and run the installer.
2. **On the first screen, tick "Add python.exe to PATH"** before you click Install. This is the step people miss.
3. Close PowerShell, open a new one, and check:
   ```powershell
   python --version
   ```
   If Windows opens the Microsoft Store instead, Python is not installed or PATH was not ticked. Run the installer
   again and choose **Modify** or **Repair**, and make sure PATH is ticked.

### 3. A code editor (optional but useful)

Install **Visual Studio Code** from https://code.visualstudio.com/. You can open the project folder in it to read and
edit files.

### 4. A GitHub account

1. Create a free account at https://github.com/signup if you do not have one.
2. Send your **GitHub username** to the team leader. They will add you to the repository.
3. Check your email (or https://github.com/notifications) and **accept the invitation**. Until you accept, you can
   read the code but cannot push changes.

### 5. Tell Git who you are (once)

Use your own name and the email you used for GitHub:

```powershell
git config --global user.name "Your Name"
git config --global user.email "your-github-email@example.com"
```

---

## Part 2: Get the code (clone)

"Cloning" downloads a copy of the project, with its full history, to your computer.

1. Choose where the project will live, for example your Desktop, and open PowerShell there:
   ```powershell
   cd $HOME\Desktop
   ```
2. Clone it:
   ```powershell
   git clone https://github.com/lance-molina/visual-schedule-management.git
   ```
   If a browser window opens asking you to sign in to GitHub, sign in and authorize. This only happens the first time.
3. Go into the new folder:
   ```powershell
   cd visual-schedule-management
   ```
   You should now see `backend`, `frontend`, `docs` and `README.md` when you run `dir`.

---

## Part 3: Run the app

### 1. Install the Python packages (once)

```powershell
python -m pip install -r backend\requirements.txt
```
This downloads Flask and the other libraries. It takes a minute or two. Red text that is only a warning about
`pip` being out of date is fine.

### 2. Start everything

Double-click **`run-local.bat`** in the project folder (or run `.\run-local.bat` in PowerShell).

Two black windows open, one for the API and one for the website, and then your browser opens
http://127.0.0.1:5500. Leave the two black windows open while you use the app.

### 3. Log in

Use a demo account (fictional data, safe to experiment with):

| Email | Password |
|-------|----------|
| `caregiver.demo@example.com` | `DemoPass123` |
| `therapist.demo@example.com` | `DemoPass123` |
| `teacher.demo@example.com` | `DemoPass123` |

You can also register your own fictional account on the login page.

### 4. Stop the app

Close the two black windows. Run `run-local.bat` again whenever you want to restart.

### If you prefer to start it by hand

Open two PowerShell windows in the project folder.

Window 1 (API):
```powershell
cd backend
$env:SECRET_KEY="dev-secret"
$env:JWT_SECRET_KEY="dev-jwt-secret-that-is-at-least-32-chars"
$env:DATABASE_URL="sqlite:///local.db"
$env:CORS_ORIGINS="http://127.0.0.1:5500,http://localhost:5500"
python database/seed.py --create-tables
python -m flask --app app run
```

Window 2 (website):
```powershell
cd frontend
python -m http.server 5500
```
Then open http://127.0.0.1:5500.

---

## Part 4: Working with Git every day

The golden rule: **never work directly on `main`**. Work on a branch, then ask for it to be merged. That way one
person's mistake cannot break everyone's copy.

### Start of every work session: get the latest code

```powershell
git checkout main
git pull
```

### Make your own branch for each task

Pick a short name that says what you are doing:

```powershell
git checkout -b fix-login-message
```

### Save your work (commit)

After you change files:

```powershell
git status                 # shows what changed (red = not saved yet)
git add .                  # stages all changes
git commit -m "Fix login error message wording"
```
Write the message as a short sentence about what changed. Commit small and often.

### Send it to GitHub (push)

The first push of a new branch:
```powershell
git push -u origin fix-login-message
```
Later pushes on the same branch are just `git push`.

### Ask for it to be merged (pull request)

1. Open the repository on GitHub. A yellow banner says your branch was recently pushed. Click
   **Compare & pull request**.
2. Write one or two lines about what you changed and click **Create pull request**.
3. Ask a teammate to look at it. When it is approved, click **Merge pull request**.
4. Back in PowerShell: `git checkout main` then `git pull`, so your copy has the merged work.

### Rules for this project

- **Never commit** passwords, tokens, a `.env` file, or the `local.db` database. The `.gitignore` file already blocks
  the usual ones, but check `git status` before you commit.
- **Fictional data only.** No real children's names, photos or diagnoses anywhere in the code, screenshots or documents.
- Do not edit the same file as someone else at the same time if you can avoid it. Ask in the group chat first.
- If you are unsure, do not guess. Ask before running `git push --force` or `git reset --hard`; those can delete
  other people's work.

---

## Troubleshooting

| What you see | What to do |
|--------------|-----------|
| `'git' is not recognized` or `'python' is not recognized` | Close PowerShell and open a new window. If it still fails, the tool is not installed or (for Python) PATH was not ticked. Reinstall. |
| Windows Store opens when you type `python` | Python is not installed. Install it from python.org with PATH ticked. |
| `run-local.bat` flashes and closes | Open PowerShell in the project folder and run `.\run-local.bat` to read the error. Most often the packages are not installed yet (Part 3, step 1). |
| `Address already in use` / port 5000 or 5500 is busy | The app is already running in another window. Close the old black windows, or restart your computer. |
| Login page loads but login says it cannot reach the server | Open the site at exactly `http://127.0.0.1:5500` or `http://localhost:5500`, and check the API window is still open and shows no red errors. |
| `Missing configuration: SECRET_KEY...` | You started Flask without the four settings. Use `run-local.bat` or the "by hand" commands, which set them. |
| `Authentication failed` when pushing | Sign in again: run `git push` and complete the browser sign-in. Make sure you accepted the repository invitation. If it keeps failing, open Control Panel, then Credential Manager, then Windows Credentials, delete entries starting with `git:https://github.com`, and push again. |
| `Updates were rejected` / `fetch first` | Someone pushed before you. Run `git pull`, then `git push` again. |
| `CONFLICT (content): Merge conflict in ...` | Two people changed the same lines. Open the file, find the `<<<<<<<` and `>>>>>>>` markers, keep the correct text, delete the markers, then `git add .` and `git commit`. Ask the team leader if unsure. |
| Pages look old after pulling new code | Hard refresh the browser: Ctrl+F5. |
| You want a clean database | Close the app, delete `backend\instance\local.db`, and start again. |
