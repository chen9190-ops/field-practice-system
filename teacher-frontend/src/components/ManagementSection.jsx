import Icon from './Icon.jsx'

export default function ManagementSection({ title, icon, tone, children, className = '' }) {
  return (
    <section className={`management-section section-${tone} ${className}`}>
      <header><Icon name={icon} size={25} /><h2>{title}</h2></header>
      <div className="management-body">{children}</div>
    </section>
  )
}
