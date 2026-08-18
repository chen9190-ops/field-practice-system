import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'

export default function QuickActionCard({ title, description, icon, to, compact = false }) {
  return (
    <Link className={`quick-action ${compact ? 'compact' : ''}`} to={to}>
      <span className="quick-icon"><Icon name={icon} size={compact ? 23 : 28} /></span>
      <span><strong>{title}</strong><small>{description}</small></span>
      <Icon className="action-arrow" name="chevron" size={17} />
    </Link>
  )
}
