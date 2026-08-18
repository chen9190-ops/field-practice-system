import Icon from './Icon.jsx'

export default function StatCard({ icon, title, value, change, tone }) {
  return (
    <article className={`stat-card stat-${tone}`}>
      <span className="stat-icon"><Icon name={icon} size={26} /></span>
      <div><p>{title}</p><strong>{value}</strong><small>{change}</small></div>
    </article>
  )
}
