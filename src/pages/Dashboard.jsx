import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import Navbar from '../components/Navbar'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import { getSessions } from '../utils/sessionStorage'

export default function Dashboard() {
  const navigate = useNavigate()
  const sessions = getSessions()

  const totalSessions = sessions.length
  const avgScore = totalSessions
    ? Math.round(sessions.reduce((sum, s) => sum + s.overallScore, 0) / totalSessions)
    : 0
  const bestScore = totalSessions ? Math.max(...sessions.map((s) => s.overallScore)) : 0

  const chartData = [...sessions]
    .reverse()
    .map((s, i) => ({ name: `#${i + 1}`, score: s.overallScore }))

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6">
        <Card className="flex justify-between items-center mb-6">
          <div>
            <h2 className="font-semibold text-gray-800">Ready to practice?</h2>
            <p className="text-sm text-gray-500">Start a new mock interview session</p>
          </div>
          <Button onClick={() => navigate('/interview/setup')}>New Interview</Button>
        </Card>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="text-center">
            <p className="text-2xl font-bold text-gray-800">{totalSessions}</p>
            <p className="text-sm text-gray-500">Sessions</p>
          </Card>
          <Card className="text-center">
            <p className="text-2xl font-bold text-gray-800">{avgScore}%</p>
            <p className="text-sm text-gray-500">Avg Score</p>
          </Card>
          <Card className="text-center">
            <p className="text-2xl font-bold text-gray-800">{bestScore}%</p>
            <p className="text-sm text-gray-500">Best Score</p>
          </Card>
        </div>

        {totalSessions > 0 && (
          <Card className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">Progress Over Time</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-800">Recent Sessions</h3>
          <Button variant="outline" onClick={() => navigate('/interview/history')}>
            View All
          </Button>
        </div>

        {sessions.slice(0, 3).map((s) => (
          <Card key={s.id} className="flex justify-between items-center mb-3">
            <div className="flex gap-2">
              <Badge>{s.mode}</Badge>
              <Badge variant="secondary">{s.domain}</Badge>
            </div>
            <Badge variant={s.overallScore >= 80 ? 'success' : s.overallScore >= 50 ? 'warning' : 'danger'}>
              {s.overallScore}%
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  )
}