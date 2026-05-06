import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { AuthContext } from '../App';
import Navbar from '../components/Navbar';
import { Calendar, MapPin, Clock, CheckCircle, Users } from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [attendanceCode, setAttendanceCode] = useState('');
  const [message, setMessage] = useState('');
  
  // Modal states
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registrationMode, setRegistrationMode] = useState('create');
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [formData, setFormData] = useState({});
  
  // Dashboard Modal state
  const [dashboardReg, setDashboardReg] = useState(null);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [eventsRes, regsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/events', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:5000/api/registrations/me', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setEvents(eventsRes.data);
      setMyRegistrations(regsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openRegistrationModal = (event) => {
    setSelectedEvent(event);
    setRegistrationMode('create');
    setTeamName('');
    setInviteCode('');
    
    const initialForm = {};
    if (event.customFormSchema) {
      event.customFormSchema.forEach(q => initialForm[q] = '');
    }
    setFormData(initialForm);
  };

  const closeRegistrationModal = () => setSelectedEvent(null);
  const closeDashboardModal = () => setDashboardReg(null);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      if (selectedEvent.isGroupEvent && registrationMode === 'join') {
        await axios.post('http://localhost:5000/api/registrations/join', {
          inviteCode, formData
        }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post('http://localhost:5000/api/registrations', {
          eventId: selectedEvent._id,
          isTeam: selectedEvent.isGroupEvent,
          teamName: selectedEvent.isGroupEvent ? teamName : null,
          formData
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      
      setMessage('Successfully registered! View your Team Dashboard.');
      closeRegistrationModal();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Registration failed');
    }
  };

  const handleSubmitTeam = async (regId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/registrations/submit/${regId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Team Application officially submitted!');
      closeDashboardModal();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit team');
    }
  };

  const handleLeaveTeam = async (regId) => {
    if(!window.confirm("Are you sure you want to leave this team? If you are the leader, the team will be deleted.")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/registrations/leave/${regId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('You have left the team.');
      closeDashboardModal();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to leave team');
    }
  };

  const handleAttendance = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/attendance/mark', { code: attendanceCode }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Attendance marked successfully!');
      setAttendanceCode('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark attendance');
    }
  };

  const getRegistrationForEvent = (eventId) => {
    return myRegistrations.find(r => (r.eventId?._id || r.eventId) === eventId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {message && (
          <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{message}</span>
            <button className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setMessage('')}>&times;</button>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Upcoming Events</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {events.map(event => {
                const reg = getRegistrationForEvent(event._id);
                return (
                  <div key={event._id} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 flex flex-col justify-between">
                    <div className="p-5">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-medium text-gray-900 truncate">{event.title}</h3>
                        {event.isGroupEvent && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Team ({event.minTeamSize}-{event.maxTeamSize})
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">{event.description}</p>
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          {format(new Date(event.startTime), 'PPP')}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          {format(new Date(event.startTime), 'p')} - {format(new Date(event.endTime), 'p')}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          {event.venueId?.name || 'TBA'}
                        </div>
                      </div>
                    </div>
                    <div className="p-5 bg-gray-50 border-t border-gray-100">
                      {reg ? (
                        <div className="flex justify-between items-center mb-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${reg.status === 'shortlisted' || reg.status === 'approved' ? 'bg-green-100 text-green-800' : reg.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                            {reg.status === 'shortlisted' || reg.status === 'approved' ? <CheckCircle className="mr-1.5 h-4 w-4" /> : null}
                            Status: {reg.status ? reg.status.charAt(0).toUpperCase() + reg.status.slice(1) : 'Registered'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          {event.isGroupEvent && (
                            <button onClick={() => setDashboardReg(reg)} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                              View Team Dashboard
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => openRegistrationModal(event)}
                          className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Register Now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div>
            <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Mark Attendance</h3>
              <form onSubmit={handleAttendance} className="space-y-4">
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700">Secret Code</label>
                  <input
                    type="text"
                    id="code"
                    value={attendanceCode}
                    onChange={(e) => setAttendanceCode(e.target.value.toUpperCase())}
                    placeholder="Enter 6-digit code"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Submit Attendance
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Registration Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeRegistrationModal}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Register for {selectedEvent.title}</h3>
                <form onSubmit={handleRegisterSubmit} className="mt-4 space-y-4">
                  {selectedEvent.isGroupEvent && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center space-x-4 bg-gray-100 p-2 rounded">
                        <button type="button" onClick={() => setRegistrationMode('create')} className={`px-4 py-2 rounded ${registrationMode === 'create' ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-600'}`}>Create Team</button>
                        <button type="button" onClick={() => setRegistrationMode('join')} className={`px-4 py-2 rounded ${registrationMode === 'join' ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-600'}`}>Join Team</button>
                      </div>

                      {registrationMode === 'create' ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Team Name</label>
                          <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Team Invite Code</label>
                          <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} placeholder="e.g. A1B2C3" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Custom Form Schema - EVERY MEMBER FILLS THIS OUT */}
                  {(selectedEvent.customFormSchema && selectedEvent.customFormSchema.length > 0) && (
                    <div className="border-t border-gray-200 pt-4 mt-4 space-y-4">
                      <h4 className="text-sm font-medium text-gray-900">Your Individual Information</h4>
                      {selectedEvent.customFormSchema.map((question, idx) => (
                        <div key={idx}>
                          <label className="block text-sm font-medium text-gray-700">{question}</label>
                          <input 
                            type="text" 
                            required 
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" 
                            value={formData[question] || ''} 
                            onChange={(e) => setFormData({...formData, [question]: e.target.value})} 
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                    <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm">
                      {selectedEvent.isGroupEvent && registrationMode === 'join' ? 'Join Team' : 'Complete Step'}
                    </button>
                    <button type="button" onClick={closeRegistrationModal} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Devfolio Style Team Dashboard Modal */}
      {dashboardReg && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeDashboardModal}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{dashboardReg.teamName}</h3>
                  <p className="text-sm text-gray-500">{dashboardReg.eventId?.title}</p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${dashboardReg.isSubmitted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {dashboardReg.isSubmitted ? 'Submitted' : 'Incomplete'}
                  </span>
                  {!dashboardReg.isSubmitted && (
                    <div className="mt-2 bg-gray-100 px-3 py-1 rounded font-mono text-gray-800 font-bold border border-gray-300">
                      Code: {dashboardReg.inviteCode}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 py-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900 flex items-center"><Users className="w-5 h-5 mr-2"/> Members ({dashboardReg.members.length} / {dashboardReg.eventId?.maxTeamSize})</h4>
                  {!dashboardReg.isSubmitted && dashboardReg.members.length < dashboardReg.eventId?.minTeamSize && (
                    <span className="text-xs text-red-600 font-medium">Needs {dashboardReg.eventId.minTeamSize - dashboardReg.members.length} more to submit</span>
                  )}
                </div>
                
                <ul className="divide-y divide-gray-200 border rounded-md">
                  {dashboardReg.members.map(m => {
                    const isLeader = m._id === dashboardReg.userId?._id;
                    return (
                      <li key={m._id} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{m.name} {isLeader && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded ml-2">Leader</span>}</p>
                          <p className="text-sm text-gray-500">{m.email}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="mt-5 sm:mt-6 flex justify-between">
                <button onClick={() => handleLeaveTeam(dashboardReg._id)} className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-red-600 hover:bg-gray-50 sm:text-sm">
                  Leave Team
                </button>
                
                <div className="flex space-x-3">
                  <button onClick={closeDashboardModal} className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:text-sm">
                    Close
                  </button>
                  
                  {dashboardReg.userId?._id === user.id && !dashboardReg.isSubmitted && (
                    <button 
                      onClick={() => handleSubmitTeam(dashboardReg._id)}
                      disabled={dashboardReg.members.length < dashboardReg.eventId?.minTeamSize}
                      className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none disabled:bg-blue-300 sm:text-sm"
                    >
                      Submit Application
                    </button>
                  )}
                </div>
              </div>
              
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
