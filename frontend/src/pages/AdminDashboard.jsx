import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import Navbar from '../components/Navbar';
import { AuthContext } from '../App';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('bookings');
  const [venues, setVenues] = useState([]);
  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  
  const [venueForm, setVenueForm] = useState({ name: '', capacity: 0, college: '' });
  const [bookingForm, setBookingForm] = useState({ venueId: '', startTime: '', endTime: '' });
  const [eventForm, setEventForm] = useState({ title: '', description: '', department: '', startTime: '', endTime: '', venueId: '', isGroupEvent: false, minTeamSize: 1, maxTeamSize: 1, requiresShortlisting: false, customFormSchema: '' });
  const [attendanceForm, setAttendanceForm] = useState({ eventId: '', startTime: '', endTime: '' });
  
  const [eventRegistrations, setEventRegistrations] = useState([]);
  const [selectedEventForShortlist, setSelectedEventForShortlist] = useState('');
  const [selectedRegistrationIds, setSelectedRegistrationIds] = useState([]);

  const [attendanceRequests, setAttendanceRequests] = useState([]);
  const [selectedEventForAttendance, setSelectedEventForAttendance] = useState('');
  const [selectedAttendanceIds, setSelectedAttendanceIds] = useState([]);
  
  const [message, setMessage] = useState('');

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const fetchData = async () => {
    try {
      const [venuesRes, eventsRes, bookingsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/venues', config),
        axios.get('http://localhost:5000/api/events', config),
        axios.get('http://localhost:5000/api/bookings', config)
      ]);
      setVenues(venuesRes.data);
      setEvents(eventsRes.data);
      setBookings(bookingsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateVenue = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/venues', venueForm, config);
      setMessage('Venue created!');
      setVenueForm({ name: '', capacity: 0, college: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating venue');
    }
  };

  const handleBookVenue = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/bookings', bookingForm, config);
      setMessage('Venue booked successfully (soft lock)!');
      setBookingForm({ venueId: '', startTime: '', endTime: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Conflict or Error booking venue');
    }
  };

  const handleApprovalAction = async (bookingId, action, reason = '') => {
    try {
      if (action === 'approve') {
        await axios.post(`http://localhost:5000/api/bookings/${bookingId}/approve`, {}, config);
        setMessage('Booking approved successfully');
      } else {
        await axios.post(`http://localhost:5000/api/bookings/${bookingId}/reject`, { reason }, config);
        setMessage('Booking rejected successfully');
      }
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error processing approval');
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...eventForm,
        customFormSchema: eventForm.customFormSchema.split(',').map(s => s.trim()).filter(s => s)
      };
      await axios.post('http://localhost:5000/api/events', payload, config);
      setMessage('Event created successfully!');
      setEventForm({ title: '', description: '', department: '', startTime: '', endTime: '', venueId: '', isGroupEvent: false, minTeamSize: 1, maxTeamSize: 1, requiresShortlisting: false, customFormSchema: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating event');
    }
  };

  const fetchRegistrationsForEvent = async (eventId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/registrations/event/${eventId}`, config);
      setEventRegistrations(res.data);
      setSelectedEventForShortlist(eventId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleShortlist = async () => {
    try {
      await axios.put(`http://localhost:5000/api/registrations/event/${selectedEventForShortlist}/shortlist`, { registrationIds: selectedRegistrationIds }, config);
      setMessage('Shortlisting updated successfully!');
      fetchRegistrationsForEvent(selectedEventForShortlist);
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating shortlist');
    }
  };

  const handleCreateAttendanceSession = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/attendance/session', attendanceForm, config);
      setMessage(`Attendance Session created! SECRET CODE: ${res.data.code}`);
      setAttendanceForm({ eventId: '', startTime: '', endTime: '' });
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating session');
    }
  };

  const fetchAttendanceRequests = async (eventId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/attendance/event/${eventId}/requests`, config);
      setAttendanceRequests(res.data);
      setSelectedEventForAttendance(eventId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkApproveAttendance = async () => {
    try {
      await axios.put(`http://localhost:5000/api/attendance/request/bulk-approve`, { requestIds: selectedAttendanceIds }, config);
      setMessage('Attendance records bulk approved!');
      fetchAttendanceRequests(selectedEventForAttendance);
    } catch (err) {
      alert(err.response?.data?.message || 'Error bulk approving');
    }
  };

  const handleExportAttendance = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/attendance/export/${selectedEventForAttendance}`, {
        ...config,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_concession_${selectedEventForAttendance}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Error exporting attendance. Ensure there are approved records.');
    }
  };

  const isApproverRole = ['faculty_mentor', 'college_admin', 'principal'].includes(user?.role);
  const pendingApprovals = bookings.filter(b => {
    if (b.status !== 'provisional') return false;
    if (b.approvalState === 'pending_faculty' && user?.role === 'faculty_mentor' && user?.college === b.adminId?.college) return true;
    if (b.approvalState === 'pending_home_admin' && user?.role === 'college_admin' && user?.college === b.adminId?.college) return true;
    if (b.approvalState === 'pending_home_principal' && user?.role === 'principal' && user?.college === b.adminId?.college) return true;
    if (b.approvalState === 'pending_host_admin' && user?.role === 'college_admin' && user?.college === b.venueId?.college) return true;
    if (b.approvalState === 'pending_host_principal' && user?.role === 'principal' && user?.college === b.venueId?.college) return true;
    return false;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {message && (
          <div className="mb-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{message}</span>
            <button className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setMessage('')}>&times;</button>
          </div>
        )}

        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {['bookings', 'venues', 'events', 'attendance', 'shortlisting'].map((tab) => (
              user?.role === 'committee_admin' && 
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`${activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
              >
                {tab}
              </button>
            ))}
            {isApproverRole && (
              <button
                onClick={() => setActiveTab('approvals')}
                className={`${activeTab === 'approvals' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize flex items-center`}
              >
                Pending Approvals
                {pendingApprovals.length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingApprovals.length}</span>
                )}
              </button>
            )}
          </nav>
        </div>

        {activeTab === 'approvals' && isApproverRole && (
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Bookings Requiring Your Approval</h3>
            {pendingApprovals.length === 0 ? <p className="text-gray-500">No pending approvals.</p> : (
              <ul className="divide-y divide-gray-200">
                {pendingApprovals.map(b => (
                  <li key={b._id} className="py-4 flex flex-col md:flex-row md:justify-between md:items-center">
                    <div>
                      <p className="font-bold text-gray-900">{b.venueId?.name} ({b.venueId?.college})</p>
                      <p className="text-sm text-gray-600">Requested by: {b.adminId?.name} ({b.adminId?.committeeName})</p>
                      <p className="text-sm text-gray-500">Time: {format(new Date(b.startTime), 'Pp')} to {format(new Date(b.endTime), 'Pp')}</p>
                      <p className="text-sm font-medium text-yellow-600 mt-1">Status: {b.approvalState}</p>
                    </div>
                    <div className="mt-4 md:mt-0 flex space-x-3">
                      <button onClick={() => handleApprovalAction(b._id, 'approve')} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Approve</button>
                      <button onClick={() => {
                        const reason = prompt("Enter rejection reason:");
                        if (reason) handleApprovalAction(b._id, 'reject', reason);
                      }} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Reject</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'venues' && user?.role === 'committee_admin' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Venue</h3>
              <form onSubmit={handleCreateVenue} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Venue Name</label>
                  <input type="text" value={venueForm.name} onChange={e => setVenueForm({...venueForm, name: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">College</label>
                  <input type="text" value={venueForm.college} onChange={e => setVenueForm({...venueForm, college: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" placeholder="e.g. SVKM_NMIMS" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Capacity</label>
                  <input type="number" value={venueForm.capacity} onChange={e => setVenueForm({...venueForm, capacity: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" required />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Create Venue</button>
              </form>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200 max-h-96 overflow-y-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Existing Venues</h3>
              <ul className="divide-y divide-gray-200">
                {venues.map(v => (
                  <li key={v._id} className="py-3">
                    <div className="font-medium text-gray-900">{v.name}</div>
                    <div className="text-sm text-gray-500">College: {v.college} | Cap: {v.capacity}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'bookings' && user?.role === 'committee_admin' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Book Venue</h3>
              <form onSubmit={handleBookVenue} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Select Venue</label>
                  <select value={bookingForm.venueId} onChange={e => setBookingForm({...bookingForm, venueId: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" required>
                    <option value="">--Select Venue--</option>
                    {venues.map(v => <option key={v._id} value={v._id}>{v.name} ({v.college})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Time</label>
                  <input type="datetime-local" value={bookingForm.startTime} onChange={e => setBookingForm({...bookingForm, startTime: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Time</label>
                  <input type="datetime-local" value={bookingForm.endTime} onChange={e => setBookingForm({...bookingForm, endTime: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" required />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Request Booking</button>
              </form>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200 overflow-y-auto max-h-[600px]">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Calendar & Conflicts</h3>
              <p className="text-sm text-gray-500 mb-4">If a venue is booked, you can contact the committee admin below.</p>
              <ul className="divide-y divide-gray-200">
                {bookings.map(b => (
                  <li key={b._id} className="py-4">
                    <div className="font-bold text-gray-900">{b.venueId?.name} - <span className={`text-sm ${b.status === 'approved' ? 'text-green-600' : b.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`}>{b.status}</span></div>
                    <div className="text-sm text-gray-500">{format(new Date(b.startTime), 'Pp')} to {format(new Date(b.endTime), 'Pp')}</div>
                    
                    {b.adminId && b.adminId._id !== user.id && (
                      <div className="mt-2 bg-gray-50 p-3 rounded-md text-sm border border-gray-200">
                        <p className="font-medium text-gray-700">Booked By: {b.adminId.committeeName || 'Committee'}</p>
                        <p className="text-gray-600">Admin: {b.adminId.name}</p>
                        <p className="text-blue-600"><a href={`mailto:${b.adminId.email}`}>Contact: {b.adminId.email}</a></p>
                      </div>
                    )}
                    {b.adminId && b.adminId._id === user.id && (
                       <div className="mt-2 text-sm text-gray-500">Approval State: {b.approvalState}</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'events' && user?.role === 'committee_admin' && (
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200 max-w-2xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create Event</h3>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input type="text" value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea value={eventForm.description} onChange={e => setEventForm({...eventForm, description: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" rows="3"></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <input type="text" value={eventForm.department} onChange={e => setEventForm({...eventForm, department: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Venue</label>
                <select value={eventForm.venueId} onChange={e => setEventForm({...eventForm, venueId: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" required>
                  <option value="">--Select Venue--</option>
                  {venues.map(v => <option key={v._id} value={v._id}>{v.name} ({v.college})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Time</label>
                  <input type="datetime-local" value={eventForm.startTime} onChange={e => setEventForm({...eventForm, startTime: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Time</label>
                  <input type="datetime-local" value={eventForm.endTime} onChange={e => setEventForm({...eventForm, endTime: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" required />
                </div>
              </div>
              <div className="border-t pt-4 mt-4">
                <h4 className="text-md font-medium text-gray-900 mb-2">Team & Registration Settings</h4>
                <div className="flex items-center mb-4">
                  <input type="checkbox" checked={eventForm.isGroupEvent} onChange={e => setEventForm({...eventForm, isGroupEvent: e.target.checked})} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                  <label className="ml-2 block text-sm text-gray-900">Is this a Group/Team Event?</label>
                </div>
                {eventForm.isGroupEvent && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Min Team Size</label>
                      <input type="number" min="1" value={eventForm.minTeamSize} onChange={e => setEventForm({...eventForm, minTeamSize: parseInt(e.target.value)})} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Max Team Size</label>
                      <input type="number" min="1" value={eventForm.maxTeamSize} onChange={e => setEventForm({...eventForm, maxTeamSize: parseInt(e.target.value)})} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" required />
                    </div>
                  </div>
                )}
                <div className="flex items-center mb-4">
                  <input type="checkbox" checked={eventForm.requiresShortlisting} onChange={e => setEventForm({...eventForm, requiresShortlisting: e.target.checked})} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                  <label className="ml-2 block text-sm text-gray-900">Requires Shortlisting?</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Custom Form Questions (comma separated)</label>
                  <input type="text" placeholder="e.g. GitHub Link, Why do you want to join?" value={eventForm.customFormSchema} onChange={e => setEventForm({...eventForm, customFormSchema: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" />
                  <p className="text-xs text-gray-500 mt-1">Leave blank if no custom questions needed.</p>
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Create Event</button>
            </form>
          </div>
        )}

        {activeTab === 'shortlisting' && user?.role === 'committee_admin' && (
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Event Shortlisting Sheet</h3>
            <div className="mb-4 flex space-x-4">
              <select onChange={e => fetchRegistrationsForEvent(e.target.value)} value={selectedEventForShortlist} className="border border-gray-300 rounded-md py-2 px-3">
                <option value="">--Select Event to View Registrations--</option>
                {events.map(e => <option key={e._id} value={e._id}>{e.title}</option>)}
              </select>
              {selectedEventForShortlist && (
                <button onClick={handleShortlist} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Save Shortlist</button>
              )}
            </div>

            {selectedEventForShortlist && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shortlist</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team / Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Members / Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Form Answers</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {eventRegistrations.map(reg => (
                      <tr key={reg._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input 
                            type="checkbox" 
                            checked={selectedRegistrationIds.includes(reg._id) || reg.status === 'shortlisted' || reg.status === 'approved'}
                            onChange={e => {
                              if (e.target.checked) setSelectedRegistrationIds([...selectedRegistrationIds, reg._id]);
                              else setSelectedRegistrationIds(selectedRegistrationIds.filter(id => id !== reg._id));
                            }}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {reg.isTeam ? `Team: ${reg.teamName}` : reg.userId?.name}
                          {reg.isTeam && <div className="text-xs text-gray-500">Code: {reg.inviteCode}</div>}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {reg.members.map(m => <div key={m._id}>{m.name} ({m.email})</div>)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {reg.formData && reg.formData.map((f, i) => {
                            const member = reg.members.find(m => m._id === f.userId) || reg.userId;
                            return (
                              <div key={i} className="mb-2">
                                <span className="font-semibold text-gray-700">{member?.name}'s Form:</span>
                                {f.answers && Object.entries(f.answers).map(([k, v]) => (
                                  <div key={k} className="ml-2 text-xs"><span className="font-medium">{k}:</span> {v}</div>
                                ))}
                              </div>
                            );
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${reg.status === 'shortlisted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {reg.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'attendance' && user?.role === 'committee_admin' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Generate Attendance Session</h3>
              <form onSubmit={handleCreateAttendanceSession} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Select Event</label>
                  <select value={attendanceForm.eventId} onChange={e => setAttendanceForm({...attendanceForm, eventId: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" required>
                    <option value="">--Select Event--</option>
                    {events.map(e => <option key={e._id} value={e._id}>{e.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Session Start</label>
                  <input type="datetime-local" value={attendanceForm.startTime} onChange={e => setAttendanceForm({...attendanceForm, startTime: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Session End</label>
                  <input type="datetime-local" value={attendanceForm.endTime} onChange={e => setAttendanceForm({...attendanceForm, endTime: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3" required />
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700">Generate Secret Code</button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Review & Export Concession</h3>
                {selectedEventForAttendance && (
                  <button onClick={handleExportAttendance} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm">Download Concession CSV</button>
                )}
              </div>
              <div className="mb-4 flex space-x-4">
                <select onChange={e => fetchAttendanceRequests(e.target.value)} value={selectedEventForAttendance} className="border border-gray-300 rounded-md py-2 px-3 w-full max-w-xs">
                  <option value="">--Select Event to Review--</option>
                  {events.map(e => <option key={e._id} value={e._id}>{e.title}</option>)}
                </select>
                {selectedEventForAttendance && (
                  <button onClick={handleBulkApproveAttendance} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Bulk Approve</button>
                )}
              </div>

              {selectedEventForAttendance && (
                <div className="overflow-y-auto max-h-96">
                  <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approve</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceRequests.map(req => (
                        <tr key={req._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input 
                              type="checkbox" 
                              checked={selectedAttendanceIds.includes(req._id) || req.status === 'approved'}
                              onChange={e => {
                                if (e.target.checked) setSelectedAttendanceIds([...selectedAttendanceIds, req._id]);
                                else setSelectedAttendanceIds(selectedAttendanceIds.filter(id => id !== req._id));
                              }}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{req.userId?.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{req.userId?.department}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${req.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {req.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default AdminDashboard;
