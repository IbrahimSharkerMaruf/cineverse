# CineVerse — Movie Review Platform

A full-stack movie review app built with **Flask** (backend) and **Angular** (frontend).

---

## Requirements

- Python 3.x
- Node.js + Angular CLI
- MongoDB running on `localhost:27017`

---

## Running the Project

**1. Start the backend**
```bash
cd movieBE
pip install -r requirements.txt
python app.py
```
Runs on `http://localhost:5001`

**2. Start the frontend**
```bash
cd movieFE
npm install
ng serve
```
Open `http://localhost:4200`

---

## Test Accounts

| Role      | Username          | Password |
|-----------|-------------------------------|---------------|
| Admin     |  collectionofmeme@gmail.com   |   meme@12345  |
| Moderator |  farhan@gmail.com             |   meme@12345  |
| Regular   |   azmain@gmail.com            |   meme@12345  |

---

## What to Test

**As a regular user:**
- Register a new account and log in
- Browse and search movies
- Leave a review and star rating
- Add movies to your watchlist
- Edit your username/password from your profile
- Delete your account

**As a moderator:**
- Everything above
- Delete any user's review

**As an admin:**
- Everything above
- View all registered users
- Promote/demote users to moderator
- Delete user accounts
