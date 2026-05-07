# SVKM Unity – Event Management System

SVKM Unity is a centralized event, resource, and institutional governance platform designed for the SVKM ecosystem.

## Features Implemented
1. Smart Venue Booking & Conflict Resolution
2. Multi-Level Approval Workflow (Faculty Mentor -> Home Admin -> Principal)
3. Event Discovery & Registration Portal
4. Devfolio-Style Team Registration & Shortlisting
5. Attendance Request & OD Concession System

## How to Run Locally

### Prerequisites
- Node.js (v14+)
- MongoDB Atlas (or local MongoDB)

### Environment Variables
Create a `.env` file in the `backend` directory with the following:
```
PORT=5000
MONGO_URI=mongodb+srv://admin:miniproj123@cluster0.tye7va6.mongodb.net/?appName=Cluster0
JWT_SECRET=supersecret123
```

### Start the Backend
```bash
cd backend
npm install
node seed.js # (Optional) To populate dummy data
npm run dev
```

### Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend will usually run on `http://localhost:5173`.

## Dummy Credentials
The database has been seeded with dummy accounts so you can test all the role-based workflows easily. All accounts share the same password:

**Password for all accounts:** `password123`

### 1. Student
* **Email:** `student1@svkm.com`
* **Role:** Student
* **Use Case:** Can view events, register for teams, and view registration statuses.

### 2. Committee Admin
* **Email:** `admin@svkm.com`
* **Role:** Committee Admin
* **Use Case:** Can book venues, create events, generate attendance sessions, export attendance, and shortlist registrations.

### 3. Faculty Mentor
* **Email:** `faculty@svkm.com`
* **Role:** Faculty Mentor
* **Use Case:** Can approve/reject provisional venue bookings initiated by their committee admins.

### 4. Principal
* **Email:** `principal@svkm.com`
* **Role:** Principal
* **Use Case:** Can approve/reject venue bookings after the Faculty Mentor has approved them.

## Registration & Attendance Flow Guide

1. Log in as **Committee Admin**.
2. Go to the "Venues" tab to see existing venues, or add a new one.
3. Go to the "Bookings" tab to book a venue.
4. Log in as **Faculty Mentor** and go to "Pending Approvals" to approve the booking.
5. Log in as **Committee Admin** again. Go to the "Events" tab and create a Group Event. Ensure you specify custom questions like "GitHub Link".
6. Log in as **Student**. Go to "Upcoming Events" and click "Register Now". 
7. Create a Team, copy your Invite Code, and click "Submit". Note that the team is still in an *Incomplete* state until the minimum size is met.
8. Once the team is submitted, the **Committee Admin** can go to the "Shortlisting" tab, select the event, view the team members and their individual form answers, and save the shortlist.
9. For Attendance, the **Committee Admin** creates an attendance session under the "Attendance" tab. They verbally announce the generated code.
10. The **Student** punches the code in.
11. Finally, the **Committee Admin** goes back to the "Attendance" tab, bulk approves the records, and clicks "Download Concession CSV" to generate the final list.
