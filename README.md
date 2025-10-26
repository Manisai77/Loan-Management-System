# 🏦 Loan Management System (Frontend Phase)

## 📘 Project Overview
The **Loan Management System** is a responsive and interactive frontend application designed to simulate a banking environment where both clients and administrators can manage loan applications, approvals, and repayments.  
This version focuses purely on the **frontend implementation** using **HTML, CSS, and JavaScript**, demonstrating structured layouts, dynamic interactivity, and responsive design.

---

## ✨ Features Implemented

### 1. Multi-Role Login System
- Separate login forms for **Client Users** and **Admin Staff**.  
- Validations and simulated credentials for testing:
  - **Admin:** `admin@gmail.com / secureadmin`
  - **User:** `user@gmail.com / password123`
### 2. User Registration
- New users can register with email and password.  
- Registered accounts remain in a **“Pending Approval”** state until verified by an admin.
### 3. User Interface Modules
- **Dashboard:** Displays key statistics such as total loans, pending applications, and EMI dues.  
- **Loan Application Form:** Allows users to calculate EMI dynamically based on loan details and credit score.  
- **Loan Tracker:** Displays user’s loan history and repayment progress.
### 4. Admin Interface
- **User Management:** Approve or reject pending user accounts.  
- **Loan Register:** Review all user loans, approve/reject applications, apply penalties or refunds, and generate reports.  
- **System Dashboard:** View metrics such as total users, loans, and approved loan value.
### 5. Interactive Loan Calculator
- Calculates:
  - Monthly EMI  
  - Total Repayment  
  - Total Interest  
- Auto-adjusts interest rate based on **credit score** and **income** for realism.
### 6. Responsive Design
- Built with **Tailwind CSS** for modern, adaptive layout across devices.  
- Interactive modals, message popups, and real-time updates enhance user experience.
### 7. Report Generation
- On-demand detailed loan reports with repayment schedule and transaction ledger.

---

## 🧱 Technologies Used
- **HTML5** — Page structure and semantic layout  
- **Tailwind CSS** & **Custom CSS** — Styling and responsive design  
- **JavaScript (ES6)** — Dynamic interactivity and state management  
- **DOM Manipulation** — For runtime content updates and form handling  

---

## 🔮 Future Enhancements (Backend Integration Phase)
-  Connect with a backend API using **Spring Boot / Node.js**  
-  Store user and loan data in a **MySQL database**  
-  Implement authentication using **JWT**  
-  Enable **real transaction history** and **EMI reminders**  
-  Integrate secure payment gateway for EMI payments  

---

