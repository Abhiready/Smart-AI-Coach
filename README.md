# 🧠 Smart AI Coach for Real-Time Stock Analysis

An AI-powered stock analysis platform that leverages **real-time market data** and **behavioral intelligence** to help users make informed trading decisions while avoiding emotional biases like FOMO and panic selling.

🔗 **Live App:** [smart-ai-coach.vercel.app](https://smart-ai-coach.vercel.app)
*(Backend is on Render's free tier — first load after inactivity may take 30-50 seconds to wake up.)*

---

## 📌 Overview

Smart AI Coach is a SaaS-style web application that combines **live stock market data from Yahoo Finance** with an AI-powered financial assistant to deliver a personalized trading experience.

The platform enables users to:

- 📈 Track live stock prices and market trends
- 💼 Create and manage investment portfolios
- 💰 Execute simulated buy/sell transactions
- 🤖 Ask an AI assistant questions about stocks and investing
- 🧠 Receive behavioral coaching based on trading decisions
- 📚 Improve financial literacy through interactive learning modules

---

## ✨ Key Features

### 🌐 Real-Time Stock Data
- Fetches live stock prices using Yahoo Finance
- Displays current market trends and stock information

### 📊 Market Dashboard
- Clean and intuitive dashboard for browsing stocks
- Search and analyze companies in real time

### 💼 Portfolio Management
- Create multiple portfolios
- Track holdings and portfolio performance
- Monitor gains and losses dynamically

### 💰 Trading System
- Buy and sell stocks
- Balance validation before transactions
- Automatic portfolio updates after every trade

### 🤖 AI Financial Assistant
- Ask natural language questions about stocks
- Receive AI-generated financial insights
- Get contextual responses based on your queries

### 🧠 Behavioral AI Coach
Analyzes trading behavior and classifies users into:
- Fear of Missing Out (FOMO)
- Panic Selling
- Normal Trading

Provides personalized feedback to encourage better investment decisions.

### 📚 Learning Module
- Interactive quizzes
- Educational content on investing
- Improve financial knowledge while using the platform

### 📈 Analytics & Insights
- Monitor trading activity
- Track portfolio performance
- Visualize investment progress

---

## 🧩 Product Thinking

### 🔄 Buy Stock Workflow

```
User selects a stock
        ↓
Clicks "Buy"
        ↓
Chooses Portfolio
        ↓
Enters Quantity
        ↓
System validates balance
        ↓
Trade Executed
        ↓
Portfolio Updated
        ↓
Transaction Logged
```

### 🤖 AI Coach Decision Flow

```
Trade Executed
        ↓
Compare Current Price vs Average Price
        ↓
Behavior Analysis
        ↓
FOMO / Panic / Normal
        ↓
Generate Personalized Feedback
```

---

## 🛠️ Tech Stack

### Frontend
- React (Vite)
- TypeScript
- Material UI

### Backend
- Flask (Python)
- Gunicorn (production WSGI server)

### Libraries
- Pandas
- yfinance

### APIs
- Yahoo Finance API (Real-Time Market Data)

### AI
- Groq API — Llama 3 (openai/gpt-oss-120b), with local Ollama fallback for development

### Database
- MySQL (hosted on Aiven, SSL-secured connection)

### Deployment
- Frontend: Vercel
- Backend: Render
- Database: Aiven

---

## 📸 Screenshots

### 🔐 Login Page

![Login](./Screenshots/login.png)

*Secure login interface for accessing Smart AI Coach.*

---

### 🏠 Dashboard

![Dashboard](./Screenshots/dashboard.png)

*Real-time dashboard displaying live stock prices and market trends.*

---

### 💼 Portfolio Management

![Portfolio](./Screenshots/portfolio.png)

*Manage multiple portfolios and monitor investment performance.*

---

### 💰 Trading Interface

![Trading](./Screenshots/trade.png)

*Execute buy and sell transactions with validation.*

---

### 🤖 AI Assistant

![AI Assistant](./Screenshots/ai-chat.png)

*Ask questions about stocks and receive AI-powered financial insights.*

---

### 🧠 AI Coach

![AI Coach](./Screenshots/ai-coach.png)

*Behavioral analysis identifying FOMO, Panic Selling, or Normal trading patterns.*

---

### 📚 Learning Module

![Learning](./Screenshots/learning.png)

*Interactive quizzes and educational content for investors.*

---

## ⚙️ Installation

### Clone the Repository

```bash
git clone https://github.com/Abhiready/Smart-AI-Coach.git
cd Smart-AI-Coach
```

### Backend Setup

```bash
cd Backend-1

.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt

python app.py
```

Requires a `.env` file with `GROQ_API_KEY`, `FLASK_SECRET_KEY`, and `MYSQL_*` credentials.

### Frontend Setup

```bash
cd Frontend-1

cd my-stock-app

npm install

npm run dev
```

---

## 🚀 Future Improvements

- 📱 Mobile responsive interface
- 📊 Advanced portfolio analytics
- 📈 Risk assessment dashboard
- 🔔 Smart price alerts
- 🤖 Personalized AI investment recommendations
- ☁️ Cloud deployment

---

## 👨‍💻 Author

**Abhishek Reddy**

📧 Email: 2005.abhishekreddy@gmail.com

🔗 LinkedIn: https://linkedin.com/in/abhishek-reddy-pm

💻 GitHub: https://github.com/Abhiready

---

⭐ If you found this project interesting, consider giving it a **Star** on GitHub!
