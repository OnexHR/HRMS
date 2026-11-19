import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Trash2, Star } from 'lucide-react'

interface Review {
  _id: string
  student?: { name: string; email: string }
  trainer?: { name: string; email: string }
  session?: { title: string }
  rating: number
  comment: string
  createdAt: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; 


const AdminReviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReviews = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${API_BASE_URL}/api/admin/reviews`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setReviews(res.data)
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${API_BASE_URL}/api/admin/reviews/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setReviews(reviews.filter(r => r._id !== id))
    } catch (error) {
      console.error('Error deleting review:', error)
      alert('Failed to delete review.')
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [])

  if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <div className="glass-effect rounded-2xl p-6 shadow-xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">All Trainer Reviews</h2>
        <p className="text-gray-600 mb-4">View and manage all reviews posted by students.</p>

        {reviews.length === 0 ? (
          <div className="text-center text-gray-500 py-10">No reviews available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-xl overflow-hidden">
              <thead className="bg-[#0ea5a3] text-white">
                <tr>
                  <th className="px-4 py-3 text-left">Student</th>
                  <th className="px-4 py-3 text-left">Trainer</th>
                  <th className="px-4 py-3 text-left">Session</th>
                  <th className="px-4 py-3 text-center">Rating</th>
                  <th className="px-4 py-3 text-left">Comment</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r._id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{r.student?.name || 'N/A'}</td>
                    <td className="px-4 py-3">{r.trainer?.name || 'N/A'}</td>
                    <td className="px-4 py-3">{r.session?.title || 'N/A'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center items-center gap-1 text-yellow-500">
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <Star key={i} size={16} fill="#facc15" />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{r.comment || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDelete(r._id)}
                        className="text-red-600 hover:text-red-800 transition"
                        title="Delete Review"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
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

export default AdminReviews
