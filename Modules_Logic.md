# SVKM Unity – Modules & Logic Explanation

This document explains the underlying logic, data flow, and architecture of the three primary modules implemented in the SVKM Unity Event Management System.

---

## Module 1: Smart Venue Booking & Digital Approval Workflow

### Objective
To provide a centralized calendar for venue booking that programmatically prevents double-bookings and enforces a strict, paperless hierarchical approval chain.

### How it Works (Logic & Data Flow)
1. **Venue Selection (Soft-Lock):**
   - When a Committee Admin requests a venue, the system checks the `Booking` collection to ensure no existing booking overlaps with the requested `startTime` and `endTime`.
   - If the slot is free, the system creates a new `Booking` document with `status = 'provisional'` and `approvalState = 'pending_faculty'`.
   - This creates a **"Soft-Lock"**. Other committees checking the calendar will see this slot as blocked, preventing race conditions.

2. **The State Machine (Hierarchical Approval):**
   - The booking enters a state machine managed via API endpoints (`/approve` and `/reject`).
   - The system checks the `role` and `college` of the user calling the endpoint against the `adminId` (the requester) and the `venueId` (the resource).
   - **Step A (Faculty):** The Faculty Mentor of the requesting committee reviews the request. If approved, the state shifts to `pending_home_principal`.
   - **Step B (Principal):** The Principal of the college reviews it. If approved, the state shifts to `approved` (and the status becomes officially locked).
   - *Cross-College Logic:* If the requested venue belongs to a *different* college (e.g., MPSTME requesting an NMIMS venue), the state machine expands to require the Host College's Admin and Principal to approve it as well.

3. **Rejection:**
   - If any approver rejects the booking, the state immediately shifts to `rejected`, and the Soft-Lock is released, making the venue available for others again.

---

## Module 2: Devfolio-Style Team Registration & Shortlisting

### Objective
To handle complex, multi-member registrations where individuals must provide custom data, and to ensure admins only review complete, valid teams.

### How it Works (Logic & Data Flow)
1. **Event Configuration:**
   - When creating an event, the Admin defines `isGroupEvent`, `minTeamSize`, `maxTeamSize`, and a `customFormSchema` (e.g., ["GitHub Link", "Resume Link"]).

2. **Team Creation & Invite Codes:**
   - A student clicks "Create Team". The backend generates a unique 6-character alphanumeric `inviteCode` and creates a `Registration` document.
   - The student must fill out the custom form questions. This data is pushed into the `formData` array inside the Registration document, linked explicitly to their `userId`.

3. **Joining Teams:**
   - Other students click "Join Team" and input the invite code.
   - The backend verifies the code, ensures the team hasn't exceeded `maxTeamSize`, and pushes the new student into the `members` array. The new student *also* submits their custom form answers, which are appended to the `formData` array.

4. **Submission Gatekeeping:**
   - Teams start with `isSubmitted = false`.
   - The frontend continuously checks if `members.length >= minTeamSize`.
   - Only when the minimum size is met, the "Submit Application" button unlocks. Clicking it sets `isSubmitted = true`, locking the team from further changes.

5. **Admin Shortlisting:**
   - The Admin Dashboard queries the database for registrations where `eventId` matches and `isSubmitted == true`.
   - The UI loops through the `members` array and the `formData` array to render each specific student's answers side-by-side in a table, allowing the admin to easily review and check the "Shortlist" box.

---

## Module 3: Attendance Request & Concession Export System

### Objective
To verify physical presence at an event securely and generate an official Attendance Concession (On-Duty / OD Leave) list for college HODs.

### How it Works (Logic & Data Flow)
1. **Session Generation:**
   - The Admin generates an `AttendanceSession` for a specific event. The backend creates a secure, random 6-character code and stores it alongside the event's valid time window.

2. **Secure Punch-In:**
   - During the event, the Admin verbally announces the code.
   - A student punches the code into their dashboard.
   - **Security Checks:**
     - The backend verifies the code is correct and the current time is within the session window.
     - **Eligibility:** It checks the `Registration` collection to ensure this specific student was actually `shortlisted` or `approved` for the event. (Random students cannot get attendance).
     - **Spam/Proxy Prevention:** It checks the `AttendanceRequest` collection against the student's `req.ip`. If a request was made from the same IP within the last 1 minute, it blocks it, preventing a student from proxy-punching for their friends.
   - If all checks pass, an `AttendanceRequest` is created with `status = 'pending'`.

3. **Bulk Approval & Export:**
   - The Admin navigates to the Attendance Review tab, which fetches all `AttendanceRequest` documents for the event.
   - The Admin can select all valid punches and click "Bulk Approve", shifting their status to `approved`.
   - Finally, clicking "Download CSV" triggers a backend parser (`json2csv`) that compiles the final list of verified students, their departments, and the exact event timestamps, returning it as a downloadable file to be sent to the HODs.
