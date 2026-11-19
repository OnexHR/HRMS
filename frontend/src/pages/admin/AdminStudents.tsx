import React, { useEffect, useState } from "react"
import axios from "axios"


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

type AnyObj = Record<string, any>

const AdminStudents: React.FC = () => {
    const [trainers, setTrainers] = useState<AnyObj[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchTrainers()
    }, [])

    const fetchTrainers = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await axios.get(`${API_BASE_URL}/api/admin/students`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setTrainers(Array.isArray(res.data) ? res.data : [])
        } catch (err) {
            console.error('Failed to fetch trainers:', err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>

    return (
        <div className="space-y-6 max-w-[1200px] mx-auto w-full">
            <div className="glass-effect rounded-2xl p-4 sm:p-6 shadow-xl">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">All Students Overview</h2>

                {trainers.length === 0 ? (
                    <div className="text-center text-gray-600 py-10 text-lg">
                        No Students found.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white/60 backdrop-blur">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-[#0ea5a3] text-white">
                                <tr>
                                    <th className="py-3 px-4 text-left font-semibold">Name</th>
                                    <th className="py-3 px-4 text-left font-semibold">Email</th>
                                    <th className="py-3 px-4 text-left font-semibold">Mobile No.</th>
                                    <th className="py-3 px-4 text-center font-semibold">Sessions</th>
                                    <th className="py-3 px-4 text-center font-semibold">Completed</th>
                                    {/* <th className="py-3 px-4 text-center font-semibold">Students</th> */}
                                    <th className="py-3 px-4 text-center font-semibold">Total Spend</th>
                                    <th className="py-3 px-4 text-center font-semibold">Monthly Spend</th>
                                    {/* <th className="py-3 px-4 text-center font-semibold">Rating</th> */}
                                    {/* <th className="py-3 px-4 text-center font-semibold">Verification</th> */}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {trainers.map((t, i) => (
                                    <tr
                                        key={t._id || i}
                                        className="hover:bg-gray-50 transition-all duration-200"
                                    >
                                        <td className="py-3 px-4 font-medium text-gray-900 whitespace-nowrap">{t.name}</td>
                                        <td className="py-3 px-4 text-gray-700 whitespace-nowrap">{t.email}</td>
                                        <td className="py-3 px-4 text-gray-700 whitespace-nowrap">{t?.profile?.phone}</td>
                                        <td className="py-3 px-4 text-center text-gray-700 whitespace-nowrap">
                                            {t.dashboardStats?.totalSessions || 0}
                                        </td>
                                        <td className="py-3 px-4 text-center text-gray-700 whitespace-nowrap">
                                            {t.dashboardStats?.completedSessions || 0}
                                        </td>
                                        {/* <td className="py-3 px-4 text-center text-gray-700 whitespace-nowrap">
                                            {t.dashboardStats?.totalStudents || 0}
                                        </td> */}
                                        <td className="py-3 px-4 text-center text-gray-700 font-semibold whitespace-nowrap">
                                            ${t.dashboardStats?.totalEarnings?.toFixed(2) || '0.00'}
                                        </td>
                                        <td className="py-3 px-4 text-center text-gray-700 font-semibold whitespace-nowrap">
                    ${t.dashboardStats?.monthlyEarnings?.toFixed(2) || '0.00'}
                </td>
                                        {/* <td className="py-3 px-4 text-center whitespace-nowrap">
                                            <span
                                                className={`px-2 py-1 rounded-md text-sm font-medium ${t.dashboardStats?.averageRating >= 4
                                                    ? 'bg-green-100 text-green-700'
                                                    : t.dashboardStats?.averageRating >= 3
                                                        ? 'bg-yellow-100 text-yellow-700'
                                                        : 'bg-red-100 text-red-700'
                                                    }`}
                                            >
                                                {t.dashboardStats?.averageRating
                                                    ? t.dashboardStats?.averageRating.toFixed(1)
                                                    : 'N/A'}
                                            </span>
                                        </td> */}
                                        {/* <td className="py-3 px-4 text-center whitespace-nowrap">
                                            <span
                                                className={`px-2 py-1 rounded-md text-sm capitalize ${t.profile?.verificationStatus === 'verified'
                                                    ? 'bg-green-100 text-green-700'
                                                    : t.profile?.verificationStatus === 'rejected'
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-yellow-100 text-yellow-700'
                                                    }`}
                                            >
                                                {t.profile?.verificationStatus || 'pending'}
                                            </span>
                                        </td> */}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export default AdminStudents