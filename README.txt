RUPEE EXPENSE TRACKER - MONGODB SETUP

IMPORTANT: The .env file is intentionally not prefilled with your database password.
1. Extract this ZIP. Open the "Expense Tracker" folder in VS Code.
2. Rename .env.example to .env (or copy it and name the copy .env).
3. In .env, replace REPLACE_WITH_YOUR_PASSWORD with your MongoDB Atlas database-user password. Do not include angle brackets. Keep the URI on one line.
   Database: expense_tracker; Cluster host: cluster0.j21fxyc.mongodb.net; Username: expenseuser.
   If the password contains characters such as @, #, /, ?, or :, URL-encode them or reset it to a strong letters-and-numbers-only password.
4. In MongoDB Atlas, ensure Network Access allows your current IP address and the expenseuser database user has read/write access.
5. Open Terminal in the folder containing package.json and run: npm install
6. Run: npm start
7. Open: http://localhost:5000

Do not share .env or upload it to GitHub. If your database password was visible in a screenshot, rotate it in Atlas.

FEATURES
- Login and signup with password hashing and signed session tokens.
- MongoDB persistence for expenses.
- Year-wise, month-wise and category filters.
- Backdated expense entries, edit/delete, responsive dashboard and analytics.
