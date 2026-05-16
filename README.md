# LostLink DBU — University Lost & Found Management System

LostLink DBU is a modern, high-performance web platform designed to streamline the recovery of lost items within the Debre Berhan University campus. It leverages smart matching logic, real-time communication, and secure verification to reunite students and staff with their belongings.

## 🚀 Key Functionality

### 1. Advanced Authentication & Security
- **Multi-Method Login**: Secure login via email/password or Google OAuth.
- **OTP Verification**: Automated 6-digit OTP delivery for email verification and password resets.
- **Role-Based Access**: Specialized dashboards for regular **Users** and **Administrators**.

### 2. Item Reporting & Management
- **Lost & Found Reports**: Detailed reporting with multi-image support (powered by Cloudinary).
- **Smart Categorization**: Tagging and category-based filtering for efficient searching.
- **Searchable Map**: Interactive listing of items with location metadata.

### 3. Smart Matching Engine
- **Automated Comparison**: Compares lost and found items across 6 parameters: Title, Description, Category, Location, Tags, and Time.
- **Confidence Scoring**: Generates a percentage-based match score to prioritize potential recoveries.
- **High-Confidence Alerts**: Automated email notifications are sent immediately to owners when a match score exceeds **75%**.

### 4. Communication & Recovery
- **Real-Time Chat**: Anonymous and secure direct messaging between the finder and the owner.
- **Status Tracking**: Monitor item status from "Reported" to "Matched" and finally "Resolved".
- **Secure Verification**: Guided steps for verifying ownership before the final handover.

### 5. Administrator Suite
- **User Management**: Full control over user accounts, including banning and role updates.
- **System Statistics**: Real-time charts showing platform growth, recovery rates, and data distribution.
- **Reports Overview**: Holistic view of all items currently in the system.

---

## 🎨 Branding & UX
- **Institutional Colors**: Custom-tailored DBU palette (Sky Blue, Navy Blue, Gold, and Beige).
- **Glassmorphism Design**: Modern, premium UI with blur effects and soft gradients.
- **Fully Responsive**: Optimized for desktop, tablets, and smartphones.
- **Dark Mode**: Native support for dark/light theme switching.

---

## ⚠️ Limitations & Constraints

### 1. Technology Scope
- **Rule-Based Matching**: The system uses a precise rule-based algorithm for matching. It **does not** use generative AI assistants or LLM chat widgets (features removed as per requirements).
- **No SMS Gateway**: Notifications are delivered via Email only. SMS integration is currently not supported.

### 2. File & Data Handling
- **Image Limits**: Maximum upload size is capped at **5MB per image**.
- **Supported Formats**: Only JPG, PNG, and WebP image formats are supported.

### 3. Real-Time Features
- **Socket Connectivity**: Real-time chat requires an active WebSocket connection. In environments with strict firewalls, the system may fall back to standard polling.

### 4. Admin Management
- **Static Content**: The landing page content is managed via database seeds; there is no live CMS editor for changing UI text on the fly.

---

## 🛠 Tech Stack

- **Frontend**: React.js, Vite, Vanilla CSS, GSAP (Animations), Lucide Icons.
- **Backend**: Node.js, Express.
- **Database**: MongoDB (Mongoose ODM).
- **Storage**: Cloudinary (Image Hosting).
- **Communication**: Socket.io (Real-time Chat), Nodemailer (SMTP Email).

---

## 📄 License
This project is developed for the exclusive use of Debre Berhan University. All rights reserved.
