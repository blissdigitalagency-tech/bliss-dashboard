import StatCard from '../components/StatCard.jsx'

function Overview() {
  return (
    <div className="page">
      <p className="page-intro">
        Welcome back. This is your starting point &mdash; edit
        <code> src/pages/Overview.jsx</code> to change what shows up here.
      </p>

      <div className="stat-row">
        <StatCard label="Active Clients" value="0" hint="Sample data" />
        <StatCard label="Open Tasks" value="0" hint="Sample data" />
        <StatCard label="This Month's Revenue" value="$0" hint="Sample data" />
      </div>
    </div>
  )
}

export default Overview
