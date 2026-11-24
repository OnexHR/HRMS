import React, { useState, useEffect } from 'react'
import { Clock, Video, PhoneOff, Users, Activity } from 'lucide-react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

interface Trainer {
  _id: string
  name: string
  email: string
  profile?: string
}

interface Student {
  _id: string
  name: string
  email: string
}

interface Booking {
  _id: string
  student: Student
  paymentStatus: string
  bookingType?: string
}

interface Session {
  _id: string
  title: string
  description?: string
  scheduledDate: string
  duration: number
  language?: string
  level?: string
  trainer?: Trainer
  students?: Student[]
  bookings?: Booking[]
  roomId?: string
  status?: string
  maxStudents?: number
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const AdminSessions: React.FC = () => {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSessions()
  }, [])

  const token = localStorage.getItem('token')
  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } }

  // Sirf sessions fetch karenge
  const fetchSessions = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/sessions`, axiosConfig)
      setSessions(Array.isArray(res.data) ? res.data : [])
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch sessions.')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinLiveSession = (session: Session) => {
    if (!session.roomId) {
      return alert("Room ID is missing for this active session.");
    }
    navigate(`/session/${session._id}?roomId=${session.roomId}`);
  }

  const handleEndLiveSession = async (sessionId: string) => {
    const confirmEnd = window.confirm("Are you sure you want to end this LIVE session for everyone?");
    if (!confirmEnd) return;

    try {
      await axios.post(
        `${API_BASE_URL}/api/sessions/end-room/${sessionId}`,
        {},
        axiosConfig
      );
      alert("Session officially ended.");
      fetchSessions();
    } catch (err: any) {
      console.error("Failed to end session:", err);
      alert(err?.response?.data?.message || "Failed to end the session.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-dots"><div></div><div></div><div></div><div></div></div>
      </div>
    )
  }

  if (error) {
    return <div className="text-center text-red-600 mt-10">{error}</div>
  }

  // Sirf Active sessions ko filter karenge
  const activeSessions = sessions.filter(s => s.status === 'active');

  return (
    <div className="space-y-6 sm:space-y-10 max-w-[1200px] mx-auto w-full">
      <div className="glass-effect rounded-2xl p-4 sm:p-8 shadow-xl border-2 border-red-100 bg-red-50/20">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
           <span className="w-4 h-4 rounded-full bg-red-600 animate-pulse border-2 border-white shadow-sm"></span>
           Live Active Sessions
        </h2>
        
        {activeSessions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-red-100">
            <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Active Sessions</h3>
            <p className="text-gray-500">There are currently no live classes running right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeSessions.map((session) => {
              // Calculate Time Data
              const startObj = new Date(session.scheduledDate);
              const endObj = new Date(startObj.getTime() + (session.duration * 60000));
              const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              // Calculate Class Type
              const isGroup = session.students && session.students.length > 1;
              const classType = isGroup ? "Group Class" : "Private Class";
              const classTagColor = isGroup ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700";

              return (
                <div key={session._id} className="bg-white rounded-xl shadow-md border-l-4 border-red-500 p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                       <h3 className="text-xl font-bold text-gray-900">{session.title}</h3>
                       <span className={`text-xs font-bold px-3 py-1 rounded-full ${classTagColor}`}>
                         {classType}
                       </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-700 mb-6">
                      <p className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold">{formatTime(startObj)} - {formatTime(endObj)}</span> 
                        <span className="text-gray-500">({session.duration} mins)</span>
                      </p>
                      
                      <p className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold">Trainer:</span> {session.trainer?.name || 'Unknown'}
                      </p>

                      <p className="flex items-start gap-2">
                        <Users className="w-4 h-4 text-gray-400 mt-1" />
                        <span>
                          <span className="font-semibold">Students:</span>{' '} 
                          {session.students?.map(s => s.name).join(', ') || 'None'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-auto">
                     <button 
                       onClick={() => handleJoinLiveSession(session)}
                       className="flex-1 bg-[#0ea5a3] hover:bg-[#0c8a88] text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition"
                     >
                       <Video size={18} /> Join as Admin
                     </button>
                     <button 
                       onClick={() => handleEndLiveSession(session._id)}
                       className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition"
                     >
                       <PhoneOff size={18} /> End Meeting
                     </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminSessions